/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DueDiligenceService
 * Orchestrates due diligence analysis workflow for M&A transactions.
 * Provides risk categorization, scoring, deal comparison, and streaming analysis.
 * Integrates with Flowise flows for AI-powered analysis.
 */

import type {
  RiskCategory,
  RiskSeverity,
  RiskFinding,
  CreateRiskFindingInput,
  CreateAnalysisInput,
  MaDocument,
  DealContext,
  FlowInput,
  FlowResult,
  FlowEvent,
  AnalysisType,
  DueDiligenceRequest,
  DueDiligenceResult,
  ComparisonResult,
  DealComparison,
  AnalysisProgress,
} from '@/common/ma/types';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { createFloWiseConnectionSync, FloWiseError } from '@process/agent/flowise/FloWiseConnection';
import type { FloWiseConnection } from '@process/agent/flowise/FloWiseConnection';
import type { IQueryResult } from '@process/services/database/types';
import {
  isFlowKey,
  resolveFlowSpec,
  isFlowCallableInProd,
  KNOWN_FLOW_KEYS,
  FLOW_CATALOG,
  type FlowKey,
  type FlowSpec,
  type FlowProvenance,
} from '@/common/ma/flowise';

type AnalysisExecutionSource = 'flowise' | 'local' | 'local_fallback';

interface FlowiseAnalysisOutcome {
  risks: RiskFinding[];
  executionSource: Extract<AnalysisExecutionSource, 'flowise' | 'local_fallback'>;
}

interface PersistedDueDiligencePayload extends Record<string, unknown> {
  risks: string[];
  riskScores: Record<RiskCategory, number>;
  overallRiskScore: number;
  summary: string;
  recommendations: string[];
  executionSource: AnalysisExecutionSource;
  flowProvenance?: FlowProvenance;
}

export type {
  AnalysisType,
  DueDiligenceRequest,
  DueDiligenceResult,
  ComparisonResult,
  DealComparison,
  AnalysisProgress,
};

// ============================================================================
// Risk Scoring Constants
// ============================================================================

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

// ============================================================================
// Risk Scoring Engine (Exported for Testing)
// ============================================================================

/**
 * Calculate risk score based on severity and category
 */
export function calculateRiskScore(severity: RiskSeverity, category: RiskCategory): number {
  const range = SEVERITY_SCORE_RANGES[severity];
  const baseScore = (range.min + range.max) / 2;
  const weight = RISK_CATEGORY_WEIGHTS[category];
  return Math.round(baseScore * weight);
}

/**
 * Determine severity from score
 */
export function determineSeverity(score: number): RiskSeverity {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
}

/**
 * Calculate category scores from risk findings
 */
export function calculateCategoryScores(risks: RiskFinding[]): Record<RiskCategory, number> {
  const categories: RiskCategory[] = ['financial', 'legal', 'operational', 'regulatory', 'reputational'];
  const scores: Record<RiskCategory, number> = {
    financial: 0,
    legal: 0,
    operational: 0,
    regulatory: 0,
    reputational: 0,
  };

  for (const category of categories) {
    const categoryRisks = risks.filter((r) => r.category === category);
    if (categoryRisks.length === 0) {
      scores[category] = 0;
    } else {
      // Weighted average of risk scores
      const totalWeight = categoryRisks.reduce((sum, r) => sum + r.score, 0);
      scores[category] = Math.round(totalWeight / categoryRisks.length);
    }
  }

  return scores;
}

/**
 * Calculate overall risk score from category scores
 */
export function calculateOverallScore(categoryScores: Record<RiskCategory, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(RISK_CATEGORY_WEIGHTS)) {
    const score = categoryScores[category as RiskCategory];
    if (score > 0) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ============================================================================
// Risk Analysis Engine
// ============================================================================

/**
 * Analyze document content for risks
 */
function analyzeDocumentForRisks(document: MaDocument, analysisId: string): CreateRiskFindingInput[] {
  const risks: CreateRiskFindingInput[] = [];
  const text = document.textContent?.toLowerCase() ?? '';

  // Financial risk patterns
  const financialPatterns = [
    {
      pattern: /declining revenue|revenue decline|decreasing sales/i,
      title: 'Declining Revenue',
      severity: 'high' as RiskSeverity,
    },
    {
      pattern: /negative ebitda|ebitda loss|operating loss/i,
      title: 'Negative EBITDA',
      severity: 'high' as RiskSeverity,
    },
    { pattern: /cash flow (problem|issue|negative)/i, title: 'Cash Flow Issues', severity: 'medium' as RiskSeverity },
    { pattern: /debt (increase|rising|high)/i, title: 'Increasing Debt', severity: 'medium' as RiskSeverity },
    {
      pattern: /working capital (deficit|shortage)/i,
      title: 'Working Capital Deficit',
      severity: 'medium' as RiskSeverity,
    },
    { pattern: /audit (qualification|issue|concern)/i, title: 'Audit Qualification', severity: 'high' as RiskSeverity },
  ];

  // Legal risk patterns
  const legalPatterns = [
    {
      pattern: /pending litigation|lawsuit|legal action/i,
      title: 'Pending Litigation',
      severity: 'high' as RiskSeverity,
    },
    {
      pattern: /intellectual property dispute|ip (infringement|dispute)/i,
      title: 'IP Dispute',
      severity: 'high' as RiskSeverity,
    },
    {
      pattern: /contract (breach|dispute|termination)/i,
      title: 'Contract Dispute',
      severity: 'medium' as RiskSeverity,
    },
    {
      pattern: /regulatory (violation|fine|penalty)/i,
      title: 'Regulatory Violation',
      severity: 'high' as RiskSeverity,
    },
    { pattern: /employment (claim|dispute|lawsuit)/i, title: 'Employment Claim', severity: 'medium' as RiskSeverity },
  ];

  // Operational risk patterns
  const operationalPatterns = [
    {
      pattern: /key (person|employee|manager) (departure|left|resignation)/i,
      title: 'Key Person Departure',
      severity: 'high' as RiskSeverity,
    },
    {
      pattern: /customer concentration|single customer/i,
      title: 'Customer Concentration',
      severity: 'medium' as RiskSeverity,
    },
    {
      pattern: /supplier (concentration|dependency|risk)/i,
      title: 'Supplier Dependency',
      severity: 'medium' as RiskSeverity,
    },
    {
      pattern: /operational (disruption|issue|challenge)/i,
      title: 'Operational Disruption',
      severity: 'medium' as RiskSeverity,
    },
    {
      pattern: /it (system|security) (breach|failure|issue)/i,
      title: 'IT System Risk',
      severity: 'high' as RiskSeverity,
    },
  ];

  // Regulatory risk patterns
  const regulatoryPatterns = [
    { pattern: /compliance (failure|issue|violation)/i, title: 'Compliance Failure', severity: 'high' as RiskSeverity },
    {
      pattern: /environmental (violation|liability|concern)/i,
      title: 'Environmental Liability',
      severity: 'high' as RiskSeverity,
    },
    { pattern: /permit (revocation|expiry|issue)/i, title: 'Permit Issue', severity: 'medium' as RiskSeverity },
    {
      pattern: /data protection|gdpr|privacy (violation|breach)/i,
      title: 'Data Protection Issue',
      severity: 'high' as RiskSeverity,
    },
    {
      pattern: /antitrust|competition (law|investigation)/i,
      title: 'Antitrust Concern',
      severity: 'high' as RiskSeverity,
    },
  ];

  // Reputational risk patterns
  const reputationalPatterns = [
    { pattern: /negative (press|publicity|media)/i, title: 'Negative Publicity', severity: 'medium' as RiskSeverity },
    { pattern: /brand (damage|risk|issue)/i, title: 'Brand Risk', severity: 'medium' as RiskSeverity },
    {
      pattern: /customer (complaint|dissatisfaction)/i,
      title: 'Customer Dissatisfaction',
      severity: 'low' as RiskSeverity,
    },
    {
      pattern: /social media (backlash|criticism)/i,
      title: 'Social Media Backlash',
      severity: 'medium' as RiskSeverity,
    },
  ];

  // Process financial patterns
  for (const { pattern, title, severity } of financialPatterns) {
    if (pattern.test(text)) {
      risks.push({
        analysisId,
        category: 'financial',
        severity,
        score: calculateRiskScore(severity, 'financial'),
        title,
        description: `Financial risk identified: ${title} detected in document ${document.filename}`,
        sourceDocumentId: document.id,
      });
    }
  }

  // Process legal patterns
  for (const { pattern, title, severity } of legalPatterns) {
    if (pattern.test(text)) {
      risks.push({
        analysisId,
        category: 'legal',
        severity,
        score: calculateRiskScore(severity, 'legal'),
        title,
        description: `Legal risk identified: ${title} detected in document ${document.filename}`,
        sourceDocumentId: document.id,
      });
    }
  }

  // Process operational patterns
  for (const { pattern, title, severity } of operationalPatterns) {
    if (pattern.test(text)) {
      risks.push({
        analysisId,
        category: 'operational',
        severity,
        score: calculateRiskScore(severity, 'operational'),
        title,
        description: `Operational risk identified: ${title} detected in document ${document.filename}`,
        sourceDocumentId: document.id,
      });
    }
  }

  // Process regulatory patterns
  for (const { pattern, title, severity } of regulatoryPatterns) {
    if (pattern.test(text)) {
      risks.push({
        analysisId,
        category: 'regulatory',
        severity,
        score: calculateRiskScore(severity, 'regulatory'),
        title,
        description: `Regulatory risk identified: ${title} detected in document ${document.filename}`,
        sourceDocumentId: document.id,
      });
    }
  }

  // Process reputational patterns
  for (const { pattern, title, severity } of reputationalPatterns) {
    if (pattern.test(text)) {
      risks.push({
        analysisId,
        category: 'reputational',
        severity,
        score: calculateRiskScore(severity, 'reputational'),
        title,
        description: `Reputational risk identified: ${title} detected in document ${document.filename}`,
        sourceDocumentId: document.id,
      });
    }
  }

  return risks;
}

/**
 * Generate recommendations based on risk findings
 */
function generateRecommendations(risks: RiskFinding[]): string[] {
  const recommendations: string[] = [];

  // Group risks by category
  const financialRisks = risks.filter((r) => r.category === 'financial');
  const legalRisks = risks.filter((r) => r.category === 'legal');
  const operationalRisks = risks.filter((r) => r.category === 'operational');
  const regulatoryRisks = risks.filter((r) => r.category === 'regulatory');
  const reputationalRisks = risks.filter((r) => r.category === 'reputational');

  // Financial recommendations
  if (financialRisks.some((r) => r.title.includes('Declining Revenue'))) {
    recommendations.push('Conduct detailed revenue analysis and identify root causes of decline');
  }
  if (financialRisks.some((r) => r.title.includes('Negative EBITDA'))) {
    recommendations.push('Review cost structure and identify opportunities for margin improvement');
  }
  if (financialRisks.some((r) => r.title.includes('Cash Flow'))) {
    recommendations.push('Implement cash flow monitoring and working capital optimization');
  }

  // Legal recommendations
  if (legalRisks.some((r) => r.title.includes('Litigation'))) {
    recommendations.push('Obtain detailed legal assessment of pending litigation and potential exposure');
  }
  if (legalRisks.some((r) => r.title.includes('IP'))) {
    recommendations.push('Conduct IP due diligence and verify ownership of key assets');
  }

  // Operational recommendations
  if (operationalRisks.some((r) => r.title.includes('Key Person'))) {
    recommendations.push('Assess key person dependency and develop retention/transition plans');
  }
  if (operationalRisks.some((r) => r.title.includes('Customer Concentration'))) {
    recommendations.push('Analyze customer concentration risk and diversification strategy');
  }

  // Regulatory recommendations
  if (regulatoryRisks.length > 0) {
    recommendations.push('Conduct comprehensive regulatory compliance review');
  }

  // Reputational recommendations
  if (reputationalRisks.length > 0) {
    recommendations.push('Assess reputational risks and develop mitigation strategy');
  }

  // Add general recommendations
  if (risks.filter((r) => r.severity === 'critical').length > 0) {
    recommendations.push('Address critical risks before proceeding with transaction');
  }

  return recommendations;
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

// ============================================================================
// DueDiligenceService Class
// ============================================================================

/**
 * Service for orchestrating due diligence analysis workflow.
 * Handles risk categorization, scoring, deal comparison, and streaming analysis.
 * Integrates with Flowise flows for AI-powered analysis.
 */
export class DueDiligenceService {
  private analysisRepo: AnalysisRepository;
  private documentRepo: DocumentRepository;
  private dealRepo: DealRepository;
  private progressCallback?: (progress: AnalysisProgress) => void;
  private flowiseConnection: FloWiseConnection | null = null;

  constructor(
    analysisRepo?: AnalysisRepository,
    documentRepo?: DocumentRepository,
    dealRepo?: DealRepository,
    progressCallback?: (progress: AnalysisProgress) => void
  ) {
    this.analysisRepo = analysisRepo ?? new AnalysisRepository();
    this.documentRepo = documentRepo ?? new DocumentRepository();
    this.dealRepo = dealRepo ?? new DealRepository();
    this.progressCallback = progressCallback;
  }

  /**
   * Initialize Flowise connection for AI-powered analysis.
   */
  private initializeFlowiseConnection(baseUrl?: string, apiKey?: string): FloWiseConnection {
    if (!this.flowiseConnection) {
      // When baseUrl is undefined, createFloWiseConnection falls back to
      // FLOWISE_DEFAULT_CONFIG.baseUrl (FLOWISE_PRODUCTION_URL by default).
      this.flowiseConnection = createFloWiseConnectionSync({ baseUrl, apiKey });
    }
    return this.flowiseConnection;
  }

  /**
   * Validate and resolve a flow key through the catalog.
   * Returns the FlowSpec with resolved flowId and prompt version.
   * Throws if the key is invalid or the flow is not callable in production.
   */
  private validateAndResolveFlowKey(flowKey: string | undefined): FlowSpec | null {
    if (!flowKey || flowKey === '') {
      throw new Error(`Invalid flowKey "${flowKey ?? 'undefined'}". Known keys: ${KNOWN_FLOW_KEYS.join(', ')}`);
    }

    // Validate the key is a known flow key
    if (!isFlowKey(flowKey)) {
      throw new Error(`Invalid flowKey "${flowKey}". Known keys: ${KNOWN_FLOW_KEYS.join(', ')}`);
    }

    // Resolve the spec from the catalog
    const spec = resolveFlowSpec(flowKey);

    // Check if flow is callable in production
    if (!isFlowCallableInProd(spec)) {
      throw new Error(
        `Flow "${flowKey}" is not callable in production (status: ${spec.status}). Only authored and deployed flows can be used.`
      );
    }

    return spec;
  }

  /**
   * Create flow provenance record from a resolved spec.
   */
  private createFlowProvenance(spec: FlowSpec): FlowProvenance {
    return {
      flowKey: spec.key,
      flowId: spec.id,
      promptVersionId: spec.promptVersionId,
      flowDescription: spec.description,
      resolvedAt: Date.now(),
    };
  }

  /**
   * Build the persisted due diligence payload stored on the analysis record.
   */
  private buildPersistedAnalysisPayload(
    risks: RiskFinding[],
    riskScores: Record<RiskCategory, number>,
    overallRiskScore: number,
    summary: string,
    recommendations: string[],
    executionSource: AnalysisExecutionSource,
    flowProvenance?: FlowProvenance
  ): PersistedDueDiligencePayload {
    return {
      risks: risks.map((risk) => risk.id),
      riskScores,
      overallRiskScore,
      summary,
      recommendations,
      executionSource,
      ...(flowProvenance ? { flowProvenance } : {}),
    };
  }

  /**
   * Extract execution mode persisted with an analysis result.
   */
  private extractExecutionSource(result: Record<string, unknown> | undefined): AnalysisExecutionSource | undefined {
    const executionSource = result?.executionSource;
    if (executionSource === 'flowise' || executionSource === 'local' || executionSource === 'local_fallback') {
      return executionSource;
    }

    return undefined;
  }

  /**
   * Extract persisted flow provenance, keeping a best-effort catalog fallback for legacy rows.
   */
  private extractFlowProvenance(
    result: Record<string, unknown> | undefined,
    flowId: string | undefined,
    completedAt: number | undefined
  ): FlowProvenance | undefined {
    const persistedProvenance = result?.flowProvenance;
    if (this.isFlowProvenance(persistedProvenance)) {
      return persistedProvenance;
    }

    const executionSource = this.extractExecutionSource(result);
    if (executionSource === 'local' || executionSource === 'local_fallback') {
      return undefined;
    }

    if (!flowId) {
      return undefined;
    }

    const spec = (Object.values(FLOW_CATALOG) as FlowSpec[]).find((candidate) => candidate.id === flowId);
    if (!spec) {
      return undefined;
    }

    return {
      flowKey: spec.key,
      flowId: spec.id,
      promptVersionId: spec.promptVersionId,
      flowDescription: spec.description,
      resolvedAt: completedAt ?? Date.now(),
    };
  }

  /**
   * Narrow unknown persisted metadata to FlowProvenance.
   */
  private isFlowProvenance(value: unknown): value is FlowProvenance {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    return (
      typeof record.flowKey === 'string' &&
      isFlowKey(record.flowKey) &&
      typeof record.flowId === 'string' &&
      typeof record.promptVersionId === 'string' &&
      typeof record.flowDescription === 'string' &&
      typeof record.resolvedAt === 'number'
    );
  }

  // ============================================================================
  // Analysis Execution
  // ============================================================================

  /**
   * Execute due diligence analysis.
   * If useFlowise is true and flowKey is provided, validates the key through the catalog
   * and uses Flowise for AI-powered analysis. Otherwise, falls back to local pattern-based analysis.
   */
  async analyze(request: DueDiligenceRequest): Promise<IQueryResult<DueDiligenceResult>> {
    try {
      // Validate and resolve flow key if provided
      let flowSpec: FlowSpec | null = null;

      if (request.options?.useFlowise) {
        try {
          flowSpec = this.validateAndResolveFlowKey(request.options.flowKey);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { success: false, error: message };
        }
      }

      // Create analysis record with resolved flowId
      const analysisInput: CreateAnalysisInput = {
        dealId: request.dealId,
        type: 'due_diligence',
        flowId: flowSpec?.id,
        input: {
          documentIds: request.documentIds,
          analysisTypes: request.analysisTypes,
        },
      };

      const analysisResult = await this.analysisRepo.create(analysisInput);
      if (!analysisResult.success || !analysisResult.data) {
        return { success: false, error: analysisResult.error ?? 'Failed to create analysis' };
      }

      const analysis = analysisResult.data;

      // Mark as running
      await this.analysisRepo.markRunning(analysis.id);
      this.reportProgress(analysis.id, 'initializing', 5, 'Starting analysis');

      try {
        // Fetch documents
        this.reportProgress(analysis.id, 'extracting', 10, 'Fetching documents');
        const documents = await this.fetchDocuments(request.documentIds);

        if (documents.length === 0) {
          await this.analysisRepo.markError(analysis.id, 'No documents found for analysis');
          return { success: false, error: 'No documents found for analysis' };
        }

        // Fetch deal context for Flowise
        const dealResult = await this.dealRepo.get(request.dealId);
        const dealContext = dealResult.success ? dealResult.data : null;

        let risks: RiskFinding[];
        let executionSource: AnalysisExecutionSource = 'local';

        // Use Flowise if configured with a valid flow spec
        if (flowSpec) {
          this.reportProgress(analysis.id, 'analyzing', 30, 'Running Flowise analysis');
          const flowiseOutcome = await this.analyzeWithFlowise(
            analysis.id,
            documents,
            dealContext,
            flowSpec.id,
            request.options.flowiseBaseUrl,
            request.options.flowiseApiKey
          );
          risks = flowiseOutcome.risks;
          executionSource = flowiseOutcome.executionSource;
        } else {
          // Fall back to local pattern-based analysis
          risks = await this.analyzeLocally(analysis.id, documents);
        }

        // Store risk findings
        this.reportProgress(analysis.id, 'scoring', 75, 'Storing risk findings');
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
          await this.analysisRepo.createRiskFindings(riskInputs);
        }

        // Fetch stored risk findings
        const risksResult = await this.analysisRepo.getRiskFindings(analysis.id);
        const storedRisks = risksResult.success ? risksResult.data : [];

        // Calculate scores
        this.reportProgress(analysis.id, 'scoring', 85, 'Calculating risk scores');
        const categoryScores = calculateCategoryScores(storedRisks);
        const overallScore = calculateOverallScore(categoryScores);

        // Generate summary and recommendations
        const summary = generateSummary(storedRisks, categoryScores);
        const recommendations = generateRecommendations(storedRisks);
        const flowProvenance =
          flowSpec && executionSource === 'flowise' ? this.createFlowProvenance(flowSpec) : undefined;
        const persistedResult = this.buildPersistedAnalysisPayload(
          storedRisks,
          categoryScores,
          overallScore,
          summary,
          recommendations,
          executionSource,
          flowProvenance
        );

        // Update analysis with results
        const result: DueDiligenceResult = {
          id: `dd_${analysis.id}`,
          dealId: request.dealId,
          risks: storedRisks,
          riskScores: categoryScores,
          overallRiskScore: overallScore,
          summary,
          recommendations,
          generatedAt: Date.now(),
          analysisId: analysis.id,
          flowProvenance,
        };

        await this.analysisRepo.markCompleted(analysis.id, persistedResult);

        this.reportProgress(analysis.id, 'complete', 100, 'Analysis complete');

        return { success: true, data: result };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        await this.analysisRepo.markError(analysis.id, message);
        this.reportProgress(analysis.id, 'error', 0, message);
        return { success: false, error: message };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Analyze documents using Flowise AI flows.
   */
  private async analyzeWithFlowise(
    analysisId: string,
    documents: MaDocument[],
    dealContext: DealContext | null,
    flowId: string,
    flowiseBaseUrl?: string,
    flowiseApiKey?: string
  ): Promise<FlowiseAnalysisOutcome> {
    const connection = this.initializeFlowiseConnection(flowiseBaseUrl, flowiseApiKey);

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
      // Execute Flowise flow
      const result = await connection.executeFlow(flowId, flowInput);
      return {
        risks: this.parseFlowiseRiskResponse(result, analysisId, documents),
        executionSource: 'flowise',
      };
    } catch (error) {
      // If Flowise fails, fall back to local analysis
      if (error instanceof FloWiseError && error.recoverable) {
        console.warn('Flowise analysis failed, falling back to local analysis:', error.message);
        return {
          risks: await this.analyzeLocally(analysisId, documents),
          executionSource: 'local_fallback',
        };
      }
      throw error;
    }
  }

  /**
   * Parse Flowise response into risk findings.
   */
  private parseFlowiseRiskResponse(result: FlowResult, analysisId: string, documents: MaDocument[]): RiskFinding[] {
    const risks: RiskFinding[] = [];

    try {
      // Try to parse JSON from the response
      const text = result.text;
      const jsonMatch = text.match(/\{[\s\S]*"risks"[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const riskArray = parsed.risks ?? [];

        for (const risk of riskArray) {
          const category = this.validateRiskCategory(risk.category);
          const severity = this.validateRiskSeverity(risk.severity);
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
            sourceDocumentId: this.findSourceDocument(risk.sourceDocument, documents),
            createdAt: Date.now(),
          });
        }
      }
    } catch {
      // If parsing fails, return empty array
      console.warn('Failed to parse Flowise risk response');
    }

    return risks;
  }

  /**
   * Validate and normalize risk category.
   */
  private validateRiskCategory(category: string): RiskCategory {
    const validCategories: RiskCategory[] = ['financial', 'legal', 'operational', 'regulatory', 'reputational'];
    const normalized = category?.toLowerCase() as RiskCategory;
    return validCategories.includes(normalized) ? normalized : 'operational';
  }

  /**
   * Validate and normalize risk severity.
   */
  private validateRiskSeverity(severity: string): RiskSeverity {
    const validSeverities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];
    const normalized = severity?.toLowerCase() as RiskSeverity;
    return validSeverities.includes(normalized) ? normalized : 'medium';
  }

  /**
   * Find source document ID from document name.
   */
  private findSourceDocument(sourceName: string | undefined, documents: MaDocument[]): string | undefined {
    if (!sourceName) return undefined;
    const doc = documents.find((d) => d.filename.includes(sourceName));
    return doc?.id;
  }

  /**
   * Analyze documents using local pattern matching.
   */
  private async analyzeLocally(analysisId: string, documents: MaDocument[]): Promise<RiskFinding[]> {
    const allRiskInputs: CreateRiskFindingInput[] = [];

    for (const doc of documents) {
      const docRisks = analyzeDocumentForRisks(doc, analysisId);
      allRiskInputs.push(...docRisks);
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
   * Get analysis result by ID
   */
  async getAnalysis(id: string): Promise<IQueryResult<DueDiligenceResult | null>> {
    try {
      const analysisResult = await this.analysisRepo.get(id);
      if (!analysisResult.success || !analysisResult.data) {
        return { success: true, data: null };
      }

      const analysis = analysisResult.data;
      if (analysis.status !== 'completed' || !analysis.result) {
        return { success: true, data: null };
      }

      // Fetch risk findings
      const risksResult = await this.analysisRepo.getRiskFindings(id);
      const risks = risksResult.success ? risksResult.data : [];

      const flowProvenance = this.extractFlowProvenance(analysis.result, analysis.flowId, analysis.completedAt);

      const result: DueDiligenceResult = {
        id: `dd_${analysis.id}`,
        dealId: analysis.dealId,
        risks,
        riskScores: analysis.result.riskScores as Record<RiskCategory, number>,
        overallRiskScore: analysis.result.overallRiskScore as number,
        summary: analysis.result.summary as string,
        recommendations: analysis.result.recommendations as string[],
        generatedAt: analysis.completedAt ?? Date.now(),
        analysisId: analysis.id,
        flowProvenance,
      };

      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * List analyses for a deal
   */
  async listAnalyses(dealId: string): Promise<IQueryResult<DueDiligenceResult[]>> {
    try {
      const listResult = await this.analysisRepo.listByDeal(dealId);
      const analyses = listResult.data.filter((a) => a.type === 'due_diligence' && a.status === 'completed');

      const results: DueDiligenceResult[] = [];

      for (const analysis of analyses) {
        if (analysis.result) {
          const risksResult = await this.analysisRepo.getRiskFindings(analysis.id);
          const risks = risksResult.success ? risksResult.data : [];

          const flowProvenance = this.extractFlowProvenance(analysis.result, analysis.flowId, analysis.completedAt);

          results.push({
            id: `dd_${analysis.id}`,
            dealId: analysis.dealId,
            risks,
            riskScores: analysis.result.riskScores as Record<RiskCategory, number>,
            overallRiskScore: analysis.result.overallRiskScore as number,
            summary: analysis.result.summary as string,
            recommendations: analysis.result.recommendations as string[],
            generatedAt: analysis.completedAt ?? Date.now(),
            analysisId: analysis.id,
            flowProvenance,
          });
        }
      }

      return { success: true, data: results };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  // ============================================================================
  // Deal Comparison
  // ============================================================================

  /**
   * Compare multiple deals
   */
  async compareDeals(dealIds: string[]): Promise<IQueryResult<ComparisonResult>> {
    try {
      const dealComparisons: DealComparison[] = [];
      const allRisks: RiskFinding[] = [];

      for (const dealId of dealIds) {
        const analysesResult = await this.listAnalyses(dealId);
        if (analysesResult.success && analysesResult.data.length > 0) {
          // Get the most recent analysis
          const latestAnalysis = analysesResult.data[0];

          dealComparisons.push({
            dealId,
            dealName: `Deal ${dealId}`, // Would need to fetch deal name from DealRepository
            riskScore: latestAnalysis.overallRiskScore,
            categoryScores: latestAnalysis.riskScores,
            topRisks: latestAnalysis.risks.slice(0, 5),
          });

          allRisks.push(...latestAnalysis.risks);
        }
      }

      // Build comparison data
      const riskScoreComparison: Record<string, number> = {};
      const categoryComparison: Record<RiskCategory, Record<string, number>> = {
        financial: {},
        legal: {},
        operational: {},
        regulatory: {},
        reputational: {},
      };

      for (const deal of dealComparisons) {
        riskScoreComparison[deal.dealId] = deal.riskScore;
        for (const [category, score] of Object.entries(deal.categoryScores)) {
          categoryComparison[category as RiskCategory][deal.dealId] = score;
        }
      }

      // Get top risks across all deals
      const topRisks = allRisks.toSorted((a, b) => b.score - a.score).slice(0, 10);

      const result: ComparisonResult = {
        dealIds,
        deals: dealComparisons,
        comparison: {
          riskScoreComparison,
          categoryComparison,
          topRisks,
          summary: this.generateComparisonSummary(dealComparisons),
        },
        generatedAt: Date.now(),
      };

      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(deals: DealComparison[]): string {
    if (deals.length === 0) {
      return 'No deals to compare.';
    }

    const sortedDeals = [...deals].toSorted((a, b) => a.riskScore - b.riskScore);
    const lowestRisk = sortedDeals[0];
    const highestRisk = sortedDeals[sortedDeals.length - 1];

    let summary = `Compared ${deals.length} deals. `;
    summary += `Lowest risk: Deal ${lowestRisk.dealId} (score: ${lowestRisk.riskScore}). `;
    summary += `Highest risk: Deal ${highestRisk.dealId} (score: ${highestRisk.riskScore}). `;

    if (deals.length > 2) {
      const avgScore = Math.round(deals.reduce((sum, d) => sum + d.riskScore, 0) / deals.length);
      summary += `Average risk score: ${avgScore}.`;
    }

    return summary;
  }

  // ============================================================================
  // Streaming Analysis
  // ============================================================================

  /**
   * Stream analysis progress.
   * Supports both Flowise streaming and local analysis.
   */
  async *streamAnalysis(request: DueDiligenceRequest): AsyncIterable<AnalysisProgress> {
    // Validate and resolve flow key if provided
    let flowSpec: FlowSpec | null = null;

    if (request.options?.useFlowise) {
      try {
        flowSpec = this.validateAndResolveFlowKey(request.options.flowKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield {
          analysisId: 'error',
          stage: 'error',
          progress: 0,
          message,
        };
        return;
      }
    }

    // Create analysis record with resolved flowId
    const analysisInput: CreateAnalysisInput = {
      dealId: request.dealId,
      type: 'due_diligence',
      flowId: flowSpec?.id,
      input: {
        documentIds: request.documentIds,
        analysisTypes: request.analysisTypes,
      },
    };

    const analysisResult = await this.analysisRepo.create(analysisInput);
    if (!analysisResult.success || !analysisResult.data) {
      yield {
        analysisId: 'error',
        stage: 'error',
        progress: 0,
        message: analysisResult.error ?? 'Failed to create analysis',
      };
      return;
    }

    const analysis = analysisResult.data;

    // Yield initial progress
    yield {
      analysisId: analysis.id,
      stage: 'initializing',
      progress: 5,
      message: 'Starting analysis',
    };

    // Mark as running
    await this.analysisRepo.markRunning(analysis.id);

    try {
      // Fetch documents
      yield {
        analysisId: analysis.id,
        stage: 'extracting',
        progress: 10,
        message: 'Fetching documents',
      };

      const documents = await this.fetchDocuments(request.documentIds);

      if (documents.length === 0) {
        await this.analysisRepo.markError(analysis.id, 'No documents found for analysis');
        yield {
          analysisId: analysis.id,
          stage: 'error',
          progress: 0,
          message: 'No documents found for analysis',
        };
        return;
      }

      // Fetch deal context
      const dealResult = await this.dealRepo.get(request.dealId);
      const dealContext = dealResult.success ? dealResult.data : null;

      let risks: RiskFinding[];
      let executionSource: AnalysisExecutionSource = 'local';

      // Use Flowise streaming if configured with a valid flow spec
      if (flowSpec) {
        yield {
          analysisId: analysis.id,
          stage: 'analyzing',
          progress: 30,
          message: 'Running Flowise analysis',
        };

        const iterator = this.streamFlowiseAnalysis(
          analysis.id,
          documents,
          dealContext,
          flowSpec.id,
          request.options.flowiseBaseUrl,
          request.options.flowiseApiKey
        );

        while (true) {
          const next = await iterator.next();
          if (next.done) {
            risks = next.value.risks;
            executionSource = next.value.executionSource;
            break;
          }

          yield next.value as AnalysisProgress;
        }
      } else {
        // Local analysis
        const allRiskInputs: CreateRiskFindingInput[] = [];

        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          const progress = 30 + Math.round((i / documents.length) * 40);

          yield {
            analysisId: analysis.id,
            stage: 'analyzing',
            progress,
            message: `Analyzing ${doc.filename}`,
            currentDocument: doc.filename,
          };

          const docRisks = analyzeDocumentForRisks(doc, analysis.id);
          allRiskInputs.push(...docRisks);

          yield {
            analysisId: analysis.id,
            stage: 'analyzing',
            progress,
            message: `Found ${docRisks.length} risks in ${doc.filename}`,
            currentDocument: doc.filename,
            risksFound: allRiskInputs.length,
          };
        }

        // Convert to RiskFinding format
        risks = allRiskInputs.map((input, index) => ({
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

      // Store risk findings
      yield {
        analysisId: analysis.id,
        stage: 'scoring',
        progress: 75,
        message: 'Storing risk findings',
        risksFound: risks.length,
      };

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
        await this.analysisRepo.createRiskFindings(riskInputs);
      }

      // Fetch stored risk findings
      const risksResult = await this.analysisRepo.getRiskFindings(analysis.id);
      const storedRisks = risksResult.success ? risksResult.data : [];

      // Calculate scores
      yield {
        analysisId: analysis.id,
        stage: 'scoring',
        progress: 85,
        message: 'Calculating risk scores',
        risksFound: storedRisks.length,
      };

      const categoryScores = calculateCategoryScores(storedRisks);
      const overallScore = calculateOverallScore(categoryScores);

      // Generate summary and recommendations
      const summary = generateSummary(storedRisks, categoryScores);
      const recommendations = generateRecommendations(storedRisks);
      const flowProvenance =
        flowSpec && executionSource === 'flowise' ? this.createFlowProvenance(flowSpec) : undefined;
      const persistedResult = this.buildPersistedAnalysisPayload(
        storedRisks,
        categoryScores,
        overallScore,
        summary,
        recommendations,
        executionSource,
        flowProvenance
      );

      // Update analysis with results
      await this.analysisRepo.markCompleted(analysis.id, persistedResult);

      // Yield completion
      yield {
        analysisId: analysis.id,
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete',
        risksFound: storedRisks.length,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.analysisRepo.markError(analysis.id, message);
      yield {
        analysisId: analysis.id,
        stage: 'error',
        progress: 0,
        message,
      };
    }
  }

  /**
   * Stream Flowise analysis progress.
   */
  private async *streamFlowiseAnalysis(
    analysisId: string,
    documents: MaDocument[],
    dealContext: DealContext | null,
    flowId: string,
    flowiseBaseUrl?: string,
    flowiseApiKey?: string
  ): AsyncGenerator<AnalysisProgress, FlowiseAnalysisOutcome, void> {
    const connection = this.initializeFlowiseConnection(flowiseBaseUrl, flowiseApiKey);

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

    const progress = 30;

    try {
      // Stream Flowise response
      const result = await connection.streamFlow(flowId, flowInput, (_event: FlowEvent) => {
        // Progress updates are handled by the generator
      });

      yield {
        analysisId,
        stage: 'analyzing',
        progress: Math.min(progress + 30, 70),
        message: 'Processing Flowise response',
      };
      return {
        risks: this.parseFlowiseRiskResponse(result, analysisId, documents),
        executionSource: 'flowise',
      };
    } catch (error) {
      if (error instanceof FloWiseError && error.recoverable) {
        yield {
          analysisId,
          stage: 'analyzing',
          progress: 50,
          message: 'Flowise unavailable, using local analysis',
        };
        return {
          risks: await this.analyzeLocally(analysisId, documents),
          executionSource: 'local_fallback',
        };
      } else {
        throw error;
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Fetch documents by IDs
   */
  private async fetchDocuments(documentIds: string[]): Promise<MaDocument[]> {
    const documents: MaDocument[] = [];

    for (const id of documentIds) {
      const result = await this.documentRepo.get(id);
      if (result.success && result.data) {
        documents.push(result.data);
      }
    }

    return documents;
  }

  /**
   * Report analysis progress
   */
  private reportProgress(
    analysisId: string,
    stage: AnalysisProgress['stage'],
    progress: number,
    message?: string,
    currentDocument?: string,
    risksFound?: number
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        analysisId,
        stage,
        progress,
        message,
        currentDocument,
        risksFound,
      });
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dueDiligenceServiceInstance: DueDiligenceService | null = null;

export function getDueDiligenceService(progressCallback?: (progress: AnalysisProgress) => void): DueDiligenceService {
  if (!dueDiligenceServiceInstance || progressCallback) {
    dueDiligenceServiceInstance = new DueDiligenceService(undefined, undefined, undefined, progressCallback);
  }
  return dueDiligenceServiceInstance;
}
