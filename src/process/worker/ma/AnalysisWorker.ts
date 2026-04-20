/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Analysis Processing Worker
 * Handles long-running due diligence analysis tasks in the background.
 * Reports progress via IPC, supports cancellation, and stores results in database.
 *
 * Uses fork protocol for isolated processing.
 */

import { parentPort } from 'worker_threads';
import type {
  RiskCategory,
  RiskSeverity,
  RiskFinding,
  CreateRiskFindingInput,
  MaDocument,
  DealContext,
  FlowInput,
  FlowResult,
  FlowEvent,
} from '@/common/ma/types';
import {
  type AnalysisProgress,
  type DueDiligenceRequest,
  calculateCategoryScores,
  calculateOverallScore,
} from '@process/services/ma/DueDiligenceService';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { createFloWiseConnection, FloWiseError } from '@process/agent/flowise/FloWiseConnection';

// ============================================================================
// Types
// ============================================================================

export interface AnalysisWorkerInput {
  analysisId: string;
  dealId: string;
  documentIds: string[];
  analysisTypes: DueDiligenceRequest['analysisTypes'];
  options?: {
    flowId?: string;
    useFlowise?: boolean;
    flowiseBaseUrl?: string;
    flowiseApiKey?: string;
    timeout?: number;
  };
}

export interface WorkerMessage {
  type: 'start' | 'stop' | 'pause' | 'resume';
  data: AnalysisWorkerInput;
}

export interface WorkerEvent {
  type: 'progress' | 'complete' | 'error' | 'cancelled';
  data: unknown;
}

export interface AnalysisWorkerProgress {
  analysisId: string;
  stage: AnalysisProgress['stage'];
  progress: number;
  message?: string;
  currentDocument?: string;
  risksFound?: number;
  timestamp: number;
}

export interface AnalysisWorkerResult {
  analysisId: string;
  dealId: string;
  risks: RiskFinding[];
  riskScores: Record<RiskCategory, number>;
  overallRiskScore: number;
  summary: string;
  recommendations: string[];
  generatedAt: number;
  duration: number;
}

export interface AnalysisWorkerError {
  analysisId: string;
  message: string;
  stage: AnalysisProgress['stage'];
  timestamp: number;
}

// ============================================================================
// Worker State
// ============================================================================

let isProcessing = false;
let shouldStop = false;
let isPaused = false;
let currentAnalysisId: string | null = null;
let processingStartTime = 0;

// ============================================================================
// Worker Implementation
// ============================================================================

/**
 * Handle messages from parent process
 */
function handleMessage(message: WorkerMessage): void {
  if (message.type === 'start') {
    if (isProcessing) {
      sendError(currentAnalysisId ?? 'unknown', 'Worker is already processing an analysis', 'initializing');
      return;
    }
    processAnalysis(message.data);
  } else if (message.type === 'stop') {
    shouldStop = true;
    isPaused = false;
  } else if (message.type === 'pause') {
    isPaused = true;
  } else if (message.type === 'resume') {
    isPaused = false;
  }
}

/**
 * Process a due diligence analysis and report progress
 */
async function processAnalysis(input: AnalysisWorkerInput): Promise<void> {
  isProcessing = true;
  shouldStop = false;
  isPaused = false;
  currentAnalysisId = input.analysisId;
  processingStartTime = Date.now();

  const analysisRepo = new AnalysisRepository();
  const documentRepo = new DocumentRepository();
  const dealRepo = new DealRepository();

  try {
    // Mark analysis as running
    await analysisRepo.markRunning(input.analysisId);
    sendProgress(input.analysisId, 'initializing', 5, 'Starting analysis');

    // Check for cancellation
    if (shouldStop) {
      await handleCancellation(input.analysisId, analysisRepo);
      return;
    }

    // Fetch documents
    sendProgress(input.analysisId, 'extracting', 10, 'Fetching documents');
    const documents = await fetchDocuments(input.documentIds, documentRepo);

    if (documents.length === 0) {
      await analysisRepo.markError(input.analysisId, 'No documents found for analysis');
      sendError(input.analysisId, 'No documents found for analysis', 'extracting');
      return;
    }

    // Check for cancellation
    if (shouldStop) {
      await handleCancellation(input.analysisId, analysisRepo);
      return;
    }

    // Fetch deal context
    const dealResult = await dealRepo.get(input.dealId);
    const dealContext = dealResult.success ? dealResult.data : null;

    // Analyze documents
    let risks: RiskFinding[];

    if (input.options?.useFlowise && input.options?.flowId) {
      sendProgress(input.analysisId, 'analyzing', 30, 'Running Flowise analysis');
      risks = await analyzeWithFlowise(
        input.analysisId,
        documents,
        dealContext,
        input.options.flowId,
        input.options.flowiseBaseUrl,
        input.options.flowiseApiKey,
        analysisRepo
      );
    } else {
      // Local pattern-based analysis
      risks = await analyzeLocally(input.analysisId, documents, analysisRepo);
    }

    // Check for cancellation
    if (shouldStop) {
      await handleCancellation(input.analysisId, analysisRepo);
      return;
    }

    // Store risk findings
    sendProgress(input.analysisId, 'scoring', 75, 'Storing risk findings', undefined, risks.length);

    if (risks.length > 0) {
      const riskInputs: CreateRiskFindingInput[] = risks.map((r) => ({
        analysisId: r.analysisId,
        category: r.category,
        severity: r.severity,
        score: r.score,
        title: r.title,
        description: r.description,
        evidence: r.evidence,
        recommendation: r.recommendation,
        sourceDocumentId: r.sourceDocumentId,
      }));
      await analysisRepo.createRiskFindings(riskInputs);
    }

    // Fetch stored risk findings
    const risksResult = await analysisRepo.getRiskFindings(input.analysisId);
    const storedRisks = risksResult.success ? risksResult.data : [];

    // Calculate scores
    sendProgress(input.analysisId, 'scoring', 85, 'Calculating risk scores', undefined, storedRisks.length);

    const categoryScores = calculateCategoryScores(storedRisks);
    const overallScore = calculateOverallScore(categoryScores);

    // Generate summary and recommendations
    const summary = generateSummary(storedRisks, categoryScores);
    const recommendations = generateRecommendations(storedRisks);

    // Update analysis with results
    await analysisRepo.markCompleted(input.analysisId, {
      risks: storedRisks.map((r) => r.id),
      riskScores: categoryScores,
      overallRiskScore: overallScore,
      summary,
      recommendations,
    });

    // Send completion
    const duration = Date.now() - processingStartTime;
    const result: AnalysisWorkerResult = {
      analysisId: input.analysisId,
      dealId: input.dealId,
      risks: storedRisks,
      riskScores: categoryScores,
      overallRiskScore: overallScore,
      summary,
      recommendations,
      generatedAt: Date.now(),
      duration,
    };

    sendProgress(input.analysisId, 'complete', 100, 'Analysis complete', undefined, storedRisks.length);
    sendComplete(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await analysisRepo.markError(input.analysisId, message);
    sendError(input.analysisId, message, 'error');
  } finally {
    isProcessing = false;
    currentAnalysisId = null;
  }
}

/**
 * Handle cancellation request
 */
async function handleCancellation(analysisId: string, analysisRepo: AnalysisRepository): Promise<void> {
  await analysisRepo.markError(analysisId, 'Analysis cancelled by user');
  sendCancelled(analysisId);
  isProcessing = false;
  currentAnalysisId = null;
}

/**
 * Fetch documents by IDs
 */
async function fetchDocuments(documentIds: string[], documentRepo: DocumentRepository): Promise<MaDocument[]> {
  const documents: MaDocument[] = [];

  for (const id of documentIds) {
    // Wait if paused - check periodically
    // eslint-disable-next-line no-unmodified-loop-condition
    while (isPaused && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(100);
    }

    if (shouldStop) break;

    // eslint-disable-next-line no-await-in-loop
    const result = await documentRepo.get(id);
    if (result.success && result.data) {
      documents.push(result.data);
    }
  }

  return documents;
}

/**
 * Analyze documents using Flowise AI flows
 */
async function analyzeWithFlowise(
  analysisId: string,
  documents: MaDocument[],
  dealContext: DealContext | null,
  flowId: string,
  flowiseBaseUrl?: string,
  flowiseApiKey?: string,
  analysisRepo?: AnalysisRepository
): Promise<RiskFinding[]> {
  const connection = createFloWiseConnection({
    baseUrl: flowiseBaseUrl ?? 'http://localhost:3000',
    apiKey: flowiseApiKey,
  });

  const risks: RiskFinding[] = [];

  // Build context from documents
  const documentContext = documents
    .map((doc) => `Document: ${doc.filename}\n${doc.textContent ?? ''}`)
    .join('\n\n---\n\n');

  // Build Flowise input
  const flowInput: FlowInput = {
    question: `Analyze the following M&A documents for risks. Identify and categorize risks as: financial, legal, operational, regulatory, or reputational. For each risk, provide a title, description, severity (low/medium/high/critical), and score (1-100). Format the response as JSON with a "risks" array.\n\n${documentContext}`,
    context: dealContext ?? undefined,
    documents: documents.map((d) => d.id),
  };

  try {
    // Stream Flowise response with progress updates
    let progress = 30;
    const progressIncrement = 40 / documents.length;

    await connection.streamFlow(flowId, flowInput, (_event: FlowEvent) => {
      // Check for cancellation during streaming
      if (shouldStop) {
        throw new Error('Analysis cancelled');
      }

      // Wait if paused
      if (isPaused) {
        // Don't process events while paused
        return;
      }

      // Update progress periodically
      progress = Math.min(progress + progressIncrement * 0.1, 70);
      sendProgress(analysisId, 'analyzing', Math.round(progress), 'Processing Flowise response');
    });

    // Execute flow to get final result
    const result = await connection.executeFlow(flowId, flowInput);

    // Parse Flowise response
    const parsedRisks = parseFlowiseRiskResponse(result, analysisId, documents);
    risks.push(...parsedRisks);
  } catch (error) {
    if (error instanceof Error && error.message === 'Analysis cancelled') {
      throw error;
    }

    // If Flowise fails, fall back to local analysis
    if (error instanceof FloWiseError && error.recoverable) {
      sendProgress(analysisId, 'analyzing', 50, 'Flowise unavailable, using local analysis');
      return analyzeLocally(analysisId, documents, analysisRepo);
    }
    throw error;
  }

  return risks;
}

/**
 * Parse Flowise response into risk findings
 */
function parseFlowiseRiskResponse(result: FlowResult, analysisId: string, documents: MaDocument[]): RiskFinding[] {
  const risks: RiskFinding[] = [];

  try {
    const text = result.text;
    const jsonMatch = text.match(/\{[\s\S]*"risks"[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const riskArray = parsed.risks ?? [];

      for (const risk of riskArray) {
        const category = validateRiskCategory(risk.category);
        const severity = validateRiskSeverity(risk.severity);
        const score = Math.min(100, Math.max(1, Math.round(risk.score ?? 50)));

        risks.push({
          id: `risk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          analysisId,
          category,
          severity,
          score,
          title: risk.title ?? 'Unnamed Risk',
          description: risk.description ?? '',
          evidence: risk.evidence,
          recommendation: risk.recommendation,
          sourceDocumentId: findSourceDocument(risk.sourceDocument, documents),
          createdAt: Date.now(),
        });
      }
    }
  } catch {
    // If parsing fails, return empty array
  }

  return risks;
}

/**
 * Analyze documents using local pattern matching
 */
async function analyzeLocally(
  analysisId: string,
  documents: MaDocument[],
  _analysisRepo?: AnalysisRepository
): Promise<RiskFinding[]> {
  const allRiskInputs: CreateRiskFindingInput[] = [];

  for (let i = 0; i < documents.length; i++) {
    // Check for cancellation
    if (shouldStop) {
      throw new Error('Analysis cancelled');
    }

    // Wait if paused - check periodically
    // eslint-disable-next-line no-unmodified-loop-condition
    while (isPaused && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(100);
    }

    if (shouldStop) {
      throw new Error('Analysis cancelled');
    }

    const doc = documents[i];
    const progress = 30 + Math.round((i / documents.length) * 40);

    sendProgress(analysisId, 'analyzing', progress, `Analyzing ${doc.filename}`, doc.filename);

    const docRisks = analyzeDocumentForRisks(doc, analysisId);
    allRiskInputs.push(...docRisks);

    sendProgress(
      analysisId,
      'analyzing',
      progress,
      `Found ${docRisks.length} risks in ${doc.filename}`,
      doc.filename,
      allRiskInputs.length
    );
  }

  // Convert to RiskFinding format
  return allRiskInputs.map((input, index) => ({
    id: `risk_${Date.now()}_${index}`,
    analysisId: input.analysisId,
    category: input.category,
    severity: input.severity,
    score: input.score,
    title: input.title,
    description: input.description,
    evidence: input.evidence,
    recommendation: input.recommendation,
    sourceDocumentId: input.sourceDocumentId,
    createdAt: Date.now(),
  }));
}

/**
 * Analyze document content for risks using pattern matching
 */
function analyzeDocumentForRisks(document: MaDocument, analysisId: string): CreateRiskFindingInput[] {
  const risks: CreateRiskFindingInput[] = [];
  const text = document.textContent?.toLowerCase() ?? '';

  // Financial risk patterns
  const financialPatterns = [
    {
      pattern: /declining revenue|revenue decline|decreasing sales/i,
      title: 'Declining Revenue',
      severity: 'high' as const,
    },
    { pattern: /negative ebitda|ebitda loss|operating loss/i, title: 'Negative EBITDA', severity: 'high' as const },
    { pattern: /cash flow (problem|issue|negative)/i, title: 'Cash Flow Issues', severity: 'medium' as const },
    { pattern: /debt (increase|rising|high)/i, title: 'Increasing Debt', severity: 'medium' as const },
    { pattern: /working capital (deficit|shortage)/i, title: 'Working Capital Deficit', severity: 'medium' as const },
    { pattern: /audit (qualification|issue|concern)/i, title: 'Audit Qualification', severity: 'high' as const },
  ];

  // Legal risk patterns
  const legalPatterns = [
    { pattern: /pending litigation|lawsuit|legal action/i, title: 'Pending Litigation', severity: 'high' as const },
    {
      pattern: /intellectual property dispute|ip (infringement|dispute)/i,
      title: 'IP Dispute',
      severity: 'high' as const,
    },
    { pattern: /contract (breach|dispute|termination)/i, title: 'Contract Dispute', severity: 'medium' as const },
    { pattern: /regulatory (violation|fine|penalty)/i, title: 'Regulatory Violation', severity: 'high' as const },
    { pattern: /employment (claim|dispute|lawsuit)/i, title: 'Employment Claim', severity: 'medium' as const },
  ];

  // Operational risk patterns
  const operationalPatterns = [
    {
      pattern: /key (person|employee|manager) (departure|left|resignation)/i,
      title: 'Key Person Departure',
      severity: 'high' as const,
    },
    {
      pattern: /customer concentration|single customer/i,
      title: 'Customer Concentration',
      severity: 'medium' as const,
    },
    { pattern: /supplier (concentration|dependency|risk)/i, title: 'Supplier Dependency', severity: 'medium' as const },
    {
      pattern: /operational (disruption|issue|challenge)/i,
      title: 'Operational Disruption',
      severity: 'medium' as const,
    },
    { pattern: /it (system|security) (breach|failure|issue)/i, title: 'IT System Risk', severity: 'high' as const },
  ];

  // Regulatory risk patterns
  const regulatoryPatterns = [
    { pattern: /compliance (failure|issue|violation)/i, title: 'Compliance Failure', severity: 'high' as const },
    {
      pattern: /environmental (violation|liability|concern)/i,
      title: 'Environmental Liability',
      severity: 'high' as const,
    },
    { pattern: /permit (revocation|expiry|issue)/i, title: 'Permit Issue', severity: 'medium' as const },
    {
      pattern: /data protection|gdpr|privacy (violation|breach)/i,
      title: 'Data Protection Issue',
      severity: 'high' as const,
    },
    { pattern: /antitrust|competition (law|investigation)/i, title: 'Antitrust Concern', severity: 'high' as const },
  ];

  // Reputational risk patterns
  const reputationalPatterns = [
    { pattern: /negative (press|publicity|media)/i, title: 'Negative Publicity', severity: 'medium' as const },
    { pattern: /brand (damage|risk|issue)/i, title: 'Brand Risk', severity: 'medium' as const },
    { pattern: /customer (complaint|dissatisfaction)/i, title: 'Customer Dissatisfaction', severity: 'low' as const },
    { pattern: /social media (backlash|criticism)/i, title: 'Social Media Backlash', severity: 'medium' as const },
  ];

  // Process all patterns
  for (const { pattern, title, severity } of financialPatterns) {
    if (pattern.test(text)) {
      risks.push(createRiskInput(analysisId, 'financial', severity, title, document.id, document.filename));
    }
  }

  for (const { pattern, title, severity } of legalPatterns) {
    if (pattern.test(text)) {
      risks.push(createRiskInput(analysisId, 'legal', severity, title, document.id, document.filename));
    }
  }

  for (const { pattern, title, severity } of operationalPatterns) {
    if (pattern.test(text)) {
      risks.push(createRiskInput(analysisId, 'operational', severity, title, document.id, document.filename));
    }
  }

  for (const { pattern, title, severity } of regulatoryPatterns) {
    if (pattern.test(text)) {
      risks.push(createRiskInput(analysisId, 'regulatory', severity, title, document.id, document.filename));
    }
  }

  for (const { pattern, title, severity } of reputationalPatterns) {
    if (pattern.test(text)) {
      risks.push(createRiskInput(analysisId, 'reputational', severity, title, document.id, document.filename));
    }
  }

  return risks;
}

/**
 * Create a risk finding input
 */
function createRiskInput(
  analysisId: string,
  category: RiskCategory,
  severity: RiskSeverity,
  title: string,
  documentId: string,
  filename: string
): CreateRiskFindingInput {
  const score = calculateRiskScore(severity, category);
  return {
    analysisId,
    category,
    severity,
    score,
    title,
    description: `${category.charAt(0).toUpperCase() + category.slice(1)} risk identified: ${title} detected in document ${filename}`,
    sourceDocumentId: documentId,
  };
}

/**
 * Calculate risk score based on severity and category
 */
function calculateRiskScore(severity: RiskSeverity, category: RiskCategory): number {
  const RISK_CATEGORY_WEIGHTS: Record<RiskCategory, number> = {
    financial: 0.3,
    legal: 0.25,
    operational: 0.2,
    regulatory: 0.15,
    reputational: 0.1,
  };

  const SEVERITY_SCORE_RANGES: Record<RiskSeverity, { min: number; max: number }> = {
    low: { min: 1, max: 25 },
    medium: { min: 26, max: 50 },
    high: { min: 51, max: 75 },
    critical: { min: 76, max: 100 },
  };

  const range = SEVERITY_SCORE_RANGES[severity];
  const baseScore = (range.min + range.max) / 2;
  const weight = RISK_CATEGORY_WEIGHTS[category];
  return Math.round(baseScore * weight);
}

/**
 * Validate and normalize risk category
 */
function validateRiskCategory(category: string): RiskCategory {
  const validCategories: RiskCategory[] = ['financial', 'legal', 'operational', 'regulatory', 'reputational'];
  const normalized = category?.toLowerCase() as RiskCategory;
  return validCategories.includes(normalized) ? normalized : 'operational';
}

/**
 * Validate and normalize risk severity
 */
function validateRiskSeverity(severity: string): RiskSeverity {
  const validSeverities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];
  const normalized = severity?.toLowerCase() as RiskSeverity;
  return validSeverities.includes(normalized) ? normalized : 'medium';
}

/**
 * Find source document ID from document name
 */
function findSourceDocument(sourceName: string | undefined, documents: MaDocument[]): string | undefined {
  if (!sourceName) return undefined;
  const doc = documents.find((d) => d.filename.includes(sourceName));
  return doc?.id;
}

/**
 * Generate summary from risk findings
 */
function generateSummary(risks: RiskFinding[], categoryScores: Record<RiskCategory, number>): string {
  const criticalCount = risks.filter((r) => r.severity === 'critical').length;
  const highCount = risks.filter((r) => r.severity === 'high').length;
  const mediumCount = risks.filter((r) => r.severity === 'medium').length;
  const lowCount = risks.filter((r) => r.severity === 'low').length;

  const highestCategory = Object.entries(categoryScores)
    .filter(([, score]) => score > 0)
    .toSorted(([, a], [, b]) => b - a)[0];

  let summary = `Due diligence analysis identified ${risks.length} risk findings: `;
  summary += `${criticalCount} critical, ${highCount} high, ${mediumCount} medium, and ${lowCount} low severity. `;

  if (highestCategory) {
    summary += `The highest risk category is ${highestCategory[0]} with a score of ${highestCategory[1]}. `;
  }

  if (criticalCount > 0) {
    summary += 'Critical risks require immediate attention before proceeding.';
  } else if (highCount > 0) {
    summary += 'High-severity risks should be addressed in the transaction structure.';
  } else if (risks.length > 0) {
    summary += 'Overall risk profile is manageable with appropriate mitigations.';
  } else {
    summary += 'No significant risks identified in the analyzed documents.';
  }

  return summary;
}

/**
 * Generate recommendations based on risk findings
 */
function generateRecommendations(risks: RiskFinding[]): string[] {
  const recommendations: string[] = [];

  const financialRisks = risks.filter((r) => r.category === 'financial');
  const legalRisks = risks.filter((r) => r.category === 'legal');
  const operationalRisks = risks.filter((r) => r.category === 'operational');
  const regulatoryRisks = risks.filter((r) => r.category === 'regulatory');

  if (financialRisks.some((r) => r.title.includes('Declining Revenue'))) {
    recommendations.push('Conduct detailed revenue analysis and identify root causes of decline');
  }
  if (financialRisks.some((r) => r.title.includes('Negative EBITDA'))) {
    recommendations.push('Review cost structure and identify opportunities for margin improvement');
  }
  if (financialRisks.some((r) => r.title.includes('Cash Flow'))) {
    recommendations.push('Implement cash flow monitoring and working capital optimization');
  }

  if (legalRisks.some((r) => r.title.includes('Litigation'))) {
    recommendations.push('Obtain detailed legal assessment of pending litigation and potential exposure');
  }
  if (legalRisks.some((r) => r.title.includes('IP'))) {
    recommendations.push('Conduct IP due diligence and verify ownership of key assets');
  }

  if (operationalRisks.some((r) => r.title.includes('Key Person'))) {
    recommendations.push('Assess key person dependency and develop retention/transition plans');
  }
  if (operationalRisks.some((r) => r.title.includes('Customer Concentration'))) {
    recommendations.push('Analyze customer concentration risk and diversification strategy');
  }

  if (regulatoryRisks.length > 0) {
    recommendations.push('Conduct comprehensive regulatory compliance review');
  }

  if (risks.filter((r) => r.severity === 'critical').length > 0) {
    recommendations.push('Address critical risks before proceeding with transaction');
  }

  return recommendations;
}

/**
 * Sleep utility for pause handling
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Communication Helpers
// ============================================================================

/**
 * Send progress update to parent
 */
function sendProgress(
  analysisId: string,
  stage: AnalysisProgress['stage'],
  progress: number,
  message?: string,
  currentDocument?: string,
  risksFound?: number
): void {
  const event: WorkerEvent = {
    type: 'progress',
    data: {
      analysisId,
      stage,
      progress,
      message,
      currentDocument,
      risksFound,
      timestamp: Date.now(),
    } as AnalysisWorkerProgress,
  };
  parentPort?.postMessage(event);
}

/**
 * Send completion result to parent
 */
function sendComplete(result: AnalysisWorkerResult): void {
  const event: WorkerEvent = {
    type: 'complete',
    data: result,
  };
  parentPort?.postMessage(event);
}

/**
 * Send error to parent
 */
function sendError(analysisId: string, message: string, stage: AnalysisProgress['stage']): void {
  const event: WorkerEvent = {
    type: 'error',
    data: {
      analysisId,
      message,
      stage,
      timestamp: Date.now(),
    } as AnalysisWorkerError,
  };
  parentPort?.postMessage(event);
}

/**
 * Send cancellation notice to parent
 */
function sendCancelled(analysisId: string): void {
  const event: WorkerEvent = {
    type: 'cancelled',
    data: { analysisId, timestamp: Date.now() },
  };
  parentPort?.postMessage(event);
}

// ============================================================================
// Worker Entry Point
// ============================================================================

// Listen for messages from parent process
parentPort?.on('message', handleMessage);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  shouldStop = true;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGINT', () => {
  shouldStop = true;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
