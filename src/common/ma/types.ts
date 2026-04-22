/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * M&A Assistant Type Definitions
 * Core types for deal management, document processing, and due diligence analysis.
 */

import { z } from 'zod';

// ============================================================================
// Deal Types
// ============================================================================

export type TransactionType = 'acquisition' | 'merger' | 'divestiture' | 'joint_venture';
export type DealStatus = 'active' | 'archived' | 'closed';

// Zod Schemas
export const TransactionTypeSchema = z.enum(['acquisition', 'merger', 'divestiture', 'joint_venture']);
export const DealStatusSchema = z.enum(['active', 'archived', 'closed']);

export const DealPartySchema = z.object({
  name: z.string().min(1),
  role: z.enum(['buyer', 'seller', 'target', 'advisor']),
});

export const CompanyInfoSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  jurisdiction: z.string().optional(),
  employees: z.number().int().positive().optional(),
  revenue: z.number().positive().optional(),
  siren: z
    .string()
    .regex(/^\d{9}$/)
    .optional(),
  siret: z
    .string()
    .regex(/^\d{14}$/)
    .optional(),
});

export const DealContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parties: z.array(DealPartySchema).min(1),
  transactionType: TransactionTypeSchema,
  targetCompany: CompanyInfoSchema,
  status: DealStatusSchema,
  extra: z.record(z.unknown()).optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateDealInputSchema = z.object({
  name: z.string().min(1),
  parties: z.array(DealPartySchema).min(1),
  transactionType: TransactionTypeSchema,
  targetCompany: CompanyInfoSchema,
  status: DealStatusSchema.optional(),
  extra: z.record(z.unknown()).optional(),
});

export const UpdateDealInputSchema = z.object({
  name: z.string().min(1).optional(),
  parties: z.array(DealPartySchema).min(1).optional(),
  transactionType: TransactionTypeSchema.optional(),
  targetCompany: CompanyInfoSchema.partial().optional(),
  status: DealStatusSchema.optional(),
  extra: z.record(z.unknown()).optional(),
});

export interface DealParty {
  name: string;
  role: 'buyer' | 'seller' | 'target' | 'advisor';
}

export interface CompanyInfo {
  name: string;
  industry?: string;
  jurisdiction?: string;
  employees?: number;
  revenue?: number;
  siren?: string;
  siret?: string;
}

export interface DealContext {
  id: string;
  name: string;
  parties: DealParty[];
  transactionType: TransactionType;
  targetCompany: CompanyInfo;
  status: DealStatus;
  extra?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateDealInput {
  name: string;
  parties: DealParty[];
  transactionType: TransactionType;
  targetCompany: CompanyInfo;
  status?: DealStatus;
  extra?: Record<string, unknown>;
}

export interface UpdateDealInput {
  name?: string;
  parties?: DealParty[];
  transactionType?: TransactionType;
  targetCompany?: Partial<CompanyInfo>;
  status?: DealStatus;
  extra?: Record<string, unknown>;
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'txt';

/**
 * Canonical document lifecycle status.
 *
 * State machine (enforced by DocumentIngestionService):
 *   pending ──► queued ──► extracting ──► chunking ──► completed   (terminal, success)
 *                   │            │             │
 *                   └────────────┴─────────────┴──► failed         (terminal, error)
 *                   └────────────┴─────────────┴──► cancelled      (terminal, cancel)
 *
 * Legacy aliases retained for backward compatibility with existing callers:
 *   - `processing` — umbrella for any active sub-stage (extracting/chunking).
 *   - `error`      — alias for `failed`.
 */
export type DocumentStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'extracting'
  | 'chunking'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'error';

/** Terminal statuses — once set, ingestion is finished and will not transition. */
export const DOCUMENT_TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'error'] as const;
export type DocumentTerminalStatus = (typeof DOCUMENT_TERMINAL_STATUSES)[number];

/** Statuses that indicate active ingestion work is in-flight. */
export const DOCUMENT_ACTIVE_STATUSES = ['queued', 'processing', 'extracting', 'chunking'] as const;
export type DocumentActiveStatus = (typeof DOCUMENT_ACTIVE_STATUSES)[number];

/** True when the document has reached a terminal state. */
export function isTerminalDocumentStatus(s: DocumentStatus): boolean {
  return (DOCUMENT_TERMINAL_STATUSES as readonly string[]).includes(s);
}

/** True when ingestion is actively in-flight (not pending, not terminal). */
export function isActiveDocumentStatus(s: DocumentStatus): boolean {
  return (DOCUMENT_ACTIVE_STATUSES as readonly string[]).includes(s);
}

/** Canonical stage emitted by the ingestion progress stream. */
export type DocumentIngestionStage =
  | 'queued'
  | 'extracting'
  | 'chunking'
  | 'persisting'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Truthful progress event emitted from the process while ingestion runs.
 * `terminal=true` indicates this is the final event for a given documentId.
 */
export interface DocumentIngestionProgress {
  documentId: string;
  dealId: string;
  stage: DocumentIngestionStage;
  progress: number; // 0-100, monotonically non-decreasing for a given documentId
  message?: string;
  timestamp: number;
  terminal: boolean;
  error?: string;
}

/**
 * Honest source metadata captured at ingestion time.
 * Persisted inside DocumentMetadata.provenance — no schema migration needed.
 */
export interface DocumentProvenance {
  sourcePath: string;
  sizeBytes: number;
  sha256?: string;
  processedAt: number;
  processingMs?: number;
  extractor?: string;
}

export type DocumentType = 'nda' | 'loi' | 'spa' | 'financial_statement' | 'due_diligence_report' | 'other';

// Zod Schemas
export const DocumentFormatSchema = z.enum(['pdf', 'docx', 'xlsx', 'txt']);
export const DocumentStatusSchema = z.enum([
  'pending',
  'queued',
  'processing',
  'extracting',
  'chunking',
  'completed',
  'failed',
  'cancelled',
  'error',
]);
export const DocumentTypeSchema = z.enum(['nda', 'loi', 'spa', 'financial_statement', 'due_diligence_report', 'other']);

export const DocumentProvenanceSchema = z.object({
  sourcePath: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().optional(),
  processedAt: z.number().int().positive(),
  processingMs: z.number().int().nonnegative().optional(),
  extractor: z.string().optional(),
});

export const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  createdAt: z.number().int().positive().optional(),
  pageCount: z.number().int().positive().optional(),
  documentType: DocumentTypeSchema.optional(),
  provenance: DocumentProvenanceSchema.optional(),
});

export const DocumentChunkSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  pageNumber: z.number().int().positive().optional(),
  position: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }),
});

export const MaDocumentSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  filename: z.string().min(1),
  originalPath: z.string().min(1),
  format: DocumentFormatSchema,
  size: z.number().int().nonnegative(),
  textContent: z.string().optional(),
  chunks: z.array(DocumentChunkSchema).optional(),
  metadata: DocumentMetadataSchema.optional(),
  status: DocumentStatusSchema,
  error: z.string().optional(),
  createdAt: z.number().int().positive(),
});

export const CreateDocumentInputSchema = z.object({
  dealId: z.string().uuid(),
  filename: z.string().min(1),
  originalPath: z.string().min(1),
  format: DocumentFormatSchema,
  size: z.number().int().nonnegative(),
  metadata: DocumentMetadataSchema.optional(),
});

export const UpdateDocumentInputSchema = z.object({
  textContent: z.string().optional(),
  chunks: z.array(DocumentChunkSchema).optional(),
  metadata: DocumentMetadataSchema.optional(),
  status: DocumentStatusSchema.optional(),
  error: z.string().optional(),
});

// ============================================================================
// Document Types (Interfaces)
// ============================================================================

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: number;
  pageCount?: number;
  documentType?: DocumentType;
  /** Honest source metadata captured by DocumentIngestionService. */
  provenance?: DocumentProvenance;
}

export interface DocumentChunk {
  id: string;
  text: string;
  pageNumber?: number;
  position: { start: number; end: number };
}

export interface MaDocument {
  id: string;
  dealId: string;
  filename: string;
  originalPath: string;
  format: DocumentFormat;
  size: number;
  textContent?: string;
  chunks?: DocumentChunk[];
  metadata?: DocumentMetadata;
  status: DocumentStatus;
  error?: string;
  createdAt: number;
}

export interface CreateDocumentInput {
  dealId: string;
  filename: string;
  originalPath: string;
  format: DocumentFormat;
  size: number;
  metadata?: DocumentMetadata;
}

export interface UpdateDocumentInput {
  textContent?: string;
  chunks?: DocumentChunk[];
  metadata?: DocumentMetadata;
  status?: DocumentStatus;
  error?: string;
}

// ============================================================================
// Analysis Types
// ============================================================================

export type AnalysisType = 'due_diligence' | 'risk_assessment' | 'financial_extraction' | 'document_comparison';
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'error';

// Zod Schemas
export const AnalysisTypeSchema = z.enum([
  'due_diligence',
  'risk_assessment',
  'financial_extraction',
  'document_comparison',
]);
export const AnalysisStatusSchema = z.enum(['pending', 'running', 'completed', 'error']);

export const AnalysisInputSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
  analysisTypes: z.array(AnalysisTypeSchema).min(1),
  options: z.record(z.unknown()).optional(),
});

export const MaAnalysisSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  type: AnalysisTypeSchema,
  flowId: z.string().optional(),
  input: AnalysisInputSchema,
  result: z.record(z.unknown()).optional(),
  status: AnalysisStatusSchema,
  error: z.string().optional(),
  createdAt: z.number().int().positive(),
  completedAt: z.number().int().positive().optional(),
});

export const CreateAnalysisInputSchema = z.object({
  dealId: z.string().uuid(),
  type: AnalysisTypeSchema,
  flowId: z.string().optional(),
  input: AnalysisInputSchema,
});

export const UpdateAnalysisInputSchema = z.object({
  result: z.record(z.unknown()).optional(),
  status: AnalysisStatusSchema.optional(),
  error: z.string().optional(),
  completedAt: z.number().int().positive().optional(),
});

// ============================================================================
// Analysis Types (Interfaces)
// ============================================================================

export interface AnalysisInput {
  documentIds: string[];
  analysisTypes: AnalysisType[];
  options?: Record<string, unknown>;
}

export interface MaAnalysis {
  id: string;
  dealId: string;
  type: AnalysisType;
  flowId?: string;
  input: AnalysisInput;
  result?: Record<string, unknown>;
  status: AnalysisStatus;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface CreateAnalysisInput {
  dealId: string;
  type: AnalysisType;
  flowId?: string;
  input: AnalysisInput;
}

export interface UpdateAnalysisInput {
  result?: Record<string, unknown>;
  status?: AnalysisStatus;
  error?: string;
  completedAt?: number;
}

// ============================================================================
// Risk Finding Types
// ============================================================================

export type RiskCategory = 'financial' | 'legal' | 'operational' | 'regulatory' | 'reputational';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

// Zod Schemas
export const RiskCategorySchema = z.enum(['financial', 'legal', 'operational', 'regulatory', 'reputational']);
export const RiskSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const RiskFindingSchema = z.object({
  id: z.string().uuid(),
  analysisId: z.string().uuid(),
  category: RiskCategorySchema,
  severity: RiskSeveritySchema,
  score: z.number().int().min(1).max(100),
  title: z.string().min(1),
  description: z.string().min(1),
  evidence: z.string().optional(),
  recommendation: z.string().optional(),
  sourceDocumentId: z.string().uuid().optional(),
  createdAt: z.number().int().positive(),
});

export const CreateRiskFindingInputSchema = z.object({
  analysisId: z.string().uuid(),
  category: RiskCategorySchema,
  severity: RiskSeveritySchema,
  score: z.number().int().min(1).max(100),
  title: z.string().min(1),
  description: z.string().min(1),
  evidence: z.string().optional(),
  recommendation: z.string().optional(),
  sourceDocumentId: z.string().uuid().optional(),
});

// ============================================================================
// Risk Finding Types (Interfaces)
// ============================================================================

export interface RiskFinding {
  id: string;
  analysisId: string;
  category: RiskCategory;
  severity: RiskSeverity;
  score: number;
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
  sourceDocumentId?: string;
  createdAt: number;
}

export interface CreateRiskFindingInput {
  analysisId: string;
  category: RiskCategory;
  severity: RiskSeverity;
  score: number;
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
  sourceDocumentId?: string;
}

// ============================================================================
// Due Diligence Types
// ============================================================================

export interface DueDiligenceRequest {
  dealId: string;
  documentIds: string[];
  analysisTypes: AnalysisType[];
  options?: {
    flowKey?: import('@/common/ma/flowise').FlowKey;
    skipCache?: boolean;
    timeout?: number;
    useFlowise?: boolean;
    flowiseBaseUrl?: string;
    flowiseApiKey?: string;
  };
}

export interface DueDiligenceResult {
  id: string;
  dealId: string;
  risks: RiskFinding[];
  riskScores: Record<RiskCategory, number>;
  overallRiskScore: number;
  summary: string;
  recommendations: string[];
  generatedAt: number;
  analysisId: string;
  flowProvenance?: import('@/common/ma/flowise').FlowProvenance;
}

export interface DealComparison {
  dealId: string;
  dealName: string;
  riskScore: number;
  categoryScores: Record<RiskCategory, number>;
  topRisks: RiskFinding[];
}

export interface ComparisonResult {
  dealIds: string[];
  deals: DealComparison[];
  comparison: {
    riskScoreComparison: Record<string, number>;
    categoryComparison: Record<RiskCategory, Record<string, number>>;
    topRisks: RiskFinding[];
    summary: string;
  };
  generatedAt: number;
}

export interface AnalysisProgress {
  analysisId: string;
  stage: 'initializing' | 'extracting' | 'analyzing' | 'scoring' | 'complete' | 'error';
  progress: number;
  message?: string;
  currentDocument?: string;
  risksFound?: number;
}

// ============================================================================
// Flowise Session Types
// ============================================================================

export interface FlowiseSession {
  id: string;
  conversationId: string;
  flowId: string;
  dealId?: string;
  sessionKey?: string;
  config?: Record<string, unknown>;
  createdAt: number;
}

export interface CreateFlowiseSessionInput {
  conversationId: string;
  flowId: string;
  dealId?: string;
  sessionKey?: string;
  config?: Record<string, unknown>;
}

// Zod Schemas
export const FlowiseSessionSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().min(1),
  flowId: z.string().min(1),
  dealId: z.string().uuid().optional(),
  sessionKey: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  createdAt: z.number().int().positive(),
});

export const CreateFlowiseSessionInputSchema = z.object({
  conversationId: z.string().min(1),
  flowId: z.string().min(1),
  dealId: z.string().uuid().optional(),
  sessionKey: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// ============================================================================
// External Integration Types
// ============================================================================

export type MaIntegrationCategory =
  | 'storage'
  | 'crm'
  | 'communication'
  | 'finance'
  | 'productivity'
  | 'research'
  | 'other';
export type MaIntegrationStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'reauth_required'
  | 'error'
  | 'disabled';

export interface MaIntegrationProvider {
  id: string;
  providerConfigKey: string;
  title: string;
  description?: string;
  category: MaIntegrationCategory;
  logoUrl?: string;
  enabled: boolean;
}

export interface MaIntegrationConnection {
  id: string;
  providerId: string;
  providerConfigKey: string;
  connectionId?: string;
  status: MaIntegrationStatus;
  displayName?: string;
  metadata?: Record<string, unknown>;
  lastError?: string;
  connectedAt?: number;
  lastSyncedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MaIntegrationDescriptor {
  provider: MaIntegrationProvider;
  connection: MaIntegrationConnection | null;
}

export interface CreateIntegrationSessionInput {
  providerId: string;
}

export interface IntegrationSessionResult {
  providerId: string;
  providerConfigKey: string;
  connectionId?: string;
  sessionToken: string;
  connectLink: string;
  expiresAt: string;
  connectBaseUrl?: string;
  apiBaseUrl?: string;
  isReconnect: boolean;
}

export interface IntegrationProxyRequest {
  providerId: string;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: string | Record<string, string | number | string[] | number[]>;
  data?: unknown;
  retries?: number;
}

export interface IntegrationProxyResponse {
  status: number;
  data: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export const MaIntegrationCategorySchema = z.enum([
  'storage',
  'crm',
  'communication',
  'finance',
  'productivity',
  'research',
  'other',
]);

export const MaIntegrationStatusSchema = z.enum([
  'not_connected',
  'connecting',
  'connected',
  'reauth_required',
  'error',
  'disabled',
]);

export const MaIntegrationProviderSchema = z.object({
  id: z.string().min(1),
  providerConfigKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: MaIntegrationCategorySchema,
  logoUrl: z.string().url().optional(),
  enabled: z.boolean(),
});

export const MaIntegrationConnectionSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  providerConfigKey: z.string().min(1),
  connectionId: z.string().optional(),
  status: MaIntegrationStatusSchema,
  displayName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  lastError: z.string().optional(),
  connectedAt: z.number().int().positive().optional(),
  lastSyncedAt: z.number().int().positive().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const MaIntegrationDescriptorSchema = z.object({
  provider: MaIntegrationProviderSchema,
  connection: MaIntegrationConnectionSchema.nullable(),
});

export const CreateIntegrationSessionInputSchema = z.object({
  providerId: z.string().min(1),
});

export const IntegrationSessionResultSchema = z.object({
  providerId: z.string().min(1),
  providerConfigKey: z.string().min(1),
  connectionId: z.string().optional(),
  sessionToken: z.string().min(1),
  connectLink: z.string().url(),
  expiresAt: z.string().min(1),
  connectBaseUrl: z.string().url().optional(),
  apiBaseUrl: z.string().url().optional(),
  isReconnect: z.boolean(),
});

export const IntegrationProxyRequestSchema = z.object({
  providerId: z.string().min(1),
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
  params: z
    .union([z.string(), z.record(z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]))])
    .optional(),
  data: z.unknown().optional(),
  retries: z.number().int().min(0).max(10).optional(),
});

export const IntegrationProxyResponseSchema = z.object({
  status: z.number().int(),
  data: z.unknown(),
  headers: z.record(z.union([z.string(), z.array(z.string())]).optional()),
});

// ============================================================================
// Financial Types
// ============================================================================

export interface FinancialMetrics {
  revenue?: number;
  ebitda?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  cashFlow?: number;
  fiscalYear: number;
  currency: string;
}

// Zod Schema
export const FinancialMetricsSchema = z.object({
  revenue: z.number().optional(),
  ebitda: z.number().optional(),
  netIncome: z.number().optional(),
  totalAssets: z.number().optional(),
  totalLiabilities: z.number().optional(),
  cashFlow: z.number().optional(),
  fiscalYear: z.number().int().positive(),
  currency: z.string().length(3),
});

// ============================================================================
// Flowise API Types
// ============================================================================

export interface FlowInput {
  question: string;
  context?: DealContext;
  documents?: string[];
  overrideConfig?: Record<string, unknown>;
}

export interface FlowResult {
  text: string;
  artifacts?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type FlowEventType = 'token' | 'node_start' | 'node_end' | 'tool_call' | 'error' | 'complete';

export interface FlowEvent {
  type: FlowEventType;
  data: unknown;
}

// Zod Schemas
export const FlowInputSchema = z.object({
  question: z.string().min(1),
  context: DealContextSchema.optional(),
  documents: z.array(z.string()).optional(),
  overrideConfig: z.record(z.unknown()).optional(),
});

export const FlowResultSchema = z.object({
  text: z.string(),
  artifacts: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const FlowEventTypeSchema = z.enum(['token', 'node_start', 'node_end', 'tool_call', 'error', 'complete']);

export const FlowEventSchema = z.object({
  type: FlowEventTypeSchema,
  data: z.unknown(),
});

// ============================================================================
// Flowise Connection Types
// ============================================================================

export interface FlowiseConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryBaseDelay?: number;
  retryMaxDelay?: number;
}

export interface FlowMeta {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface FlowDetail extends FlowMeta {
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Snapshot of whether the main process currently has enough
 * configuration to talk to Flowise, and whether the backend is
 * reachable right now. Consumed by `ma.flowise.getReadiness` IPC
 * and the `useFlowiseReadiness` renderer hook so AI surfaces can
 * disable themselves gracefully when the key is missing or the
 * service is down.
 *
 * - `hasApiKey`      true when either a caller passed `apiKey` or
 *                    `FLOWISE_API_KEY` is set in the main-process env.
 * - `apiKeySource`   indicates where the key came from (or `'none'`).
 * - `pingOk`         result of `GET /api/v1/ping` (unauthenticated).
 * - `authOk`         result of `GET /api/v1/chatflows` with bearer;
 *                    `undefined` when `hasApiKey` is false (not probed).
 * - `flowCount`      number of flows visible to the key, when authOk.
 * - `checkedAt`      epoch millis when the probe ran.
 * - `error`          short human-readable error when the probe failed.
 */
export type FlowiseReadiness = {
  baseUrl: string;
  hasApiKey: boolean;
  apiKeySource: 'arg' | 'settings' | 'env' | 'none';
  pingOk: boolean;
  authOk?: boolean;
  flowCount?: number;
  checkedAt: number;
  error?: string;
};

// Zod Schemas
export const FlowiseConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  timeout: z.number().int().positive().optional(),
  retryAttempts: z.number().int().min(0).max(10).optional(),
  retryBaseDelay: z.number().int().positive().optional(),
  retryMaxDelay: z.number().int().positive().optional(),
});

export const FlowMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const FlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const FlowDetailSchema = FlowMetaSchema.extend({
  nodes: z.array(FlowNodeSchema).optional(),
  edges: z.array(FlowEdgeSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// ============================================================================
// Error Types
// ============================================================================

export type MaErrorCode =
  | 'FLOWISE_CONNECTION_FAILED'
  | 'FLOWISE_FLOW_ERROR'
  | 'DOCUMENT_FORMAT_UNSUPPORTED'
  | 'DOCUMENT_PROCESSING_FAILED'
  | 'ANALYSIS_FAILED'
  | 'DEAL_NOT_FOUND'
  | 'DOCUMENT_NOT_FOUND'
  | 'UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_EXCEEDED';

export interface MaError {
  code: MaErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryAfter?: number;
}

// Zod Schema
export const MaErrorCodeSchema = z.enum([
  'FLOWISE_CONNECTION_FAILED',
  'FLOWISE_FLOW_ERROR',
  'DOCUMENT_FORMAT_UNSUPPORTED',
  'DOCUMENT_PROCESSING_FAILED',
  'ANALYSIS_FAILED',
  'DEAL_NOT_FOUND',
  'DOCUMENT_NOT_FOUND',
  'UNAUTHORIZED_ACCESS',
  'RATE_LIMIT_EXCEEDED',
]);

export const MaErrorSchema = z.object({
  code: MaErrorCodeSchema,
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  recoverable: z.boolean(),
  retryAfter: z.number().int().positive().optional(),
});

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaDealRow {
  id: string;
  name: string;
  parties: string;
  transaction_type: string;
  target_company: string;
  status: string;
  extra: string | null;
  created_at: number;
  updated_at: number;
}

export interface IMaDocumentRow {
  id: string;
  deal_id: string;
  filename: string;
  original_path: string;
  format: string;
  size: number;
  text_content: string | null;
  chunks: string | null;
  metadata: string | null;
  status: string;
  error: string | null;
  created_at: number;
}

export interface IMaAnalysisRow {
  id: string;
  deal_id: string;
  type: string;
  flow_id: string | null;
  input: string;
  result: string | null;
  status: string;
  error: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface IMaRiskFindingRow {
  id: string;
  analysis_id: string;
  category: string;
  severity: string;
  score: number;
  title: string;
  description: string;
  evidence: string | null;
  recommendation: string | null;
  source_document_id: string | null;
  created_at: number;
}

export interface IMaFlowiseSessionRow {
  id: string;
  conversation_id: string;
  flow_id: string;
  deal_id: string | null;
  session_key: string | null;
  config: string | null;
  created_at: number;
}

export interface IMaIntegrationConnectionRow {
  id: string;
  provider_id: string;
  provider_config_key: string;
  connection_id: string | null;
  status: string;
  display_name: string | null;
  metadata: string | null;
  last_error: string | null;
  connected_at: number | null;
  last_synced_at: number | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Type Conversion Functions
// ============================================================================

export function dealToRow(deal: DealContext): IMaDealRow {
  return {
    id: deal.id,
    name: deal.name,
    parties: JSON.stringify(deal.parties),
    transaction_type: deal.transactionType,
    target_company: JSON.stringify(deal.targetCompany),
    status: deal.status,
    extra: deal.extra ? JSON.stringify(deal.extra) : null,
    created_at: deal.createdAt,
    updated_at: deal.updatedAt,
  };
}

export function rowToDeal(row: IMaDealRow): DealContext {
  return {
    id: row.id,
    name: row.name,
    parties: JSON.parse(row.parties),
    transactionType: row.transaction_type as TransactionType,
    targetCompany: JSON.parse(row.target_company),
    status: row.status as DealStatus,
    extra: row.extra ? JSON.parse(row.extra) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function documentToRow(doc: MaDocument): IMaDocumentRow {
  return {
    id: doc.id,
    deal_id: doc.dealId,
    filename: doc.filename,
    original_path: doc.originalPath,
    format: doc.format,
    size: doc.size,
    text_content: doc.textContent ?? null,
    chunks: doc.chunks ? JSON.stringify(doc.chunks) : null,
    metadata: doc.metadata ? JSON.stringify(doc.metadata) : null,
    status: doc.status,
    error: doc.error ?? null,
    created_at: doc.createdAt,
  };
}

export function rowToDocument(row: IMaDocumentRow): MaDocument {
  return {
    id: row.id,
    dealId: row.deal_id,
    filename: row.filename,
    originalPath: row.original_path,
    format: row.format as DocumentFormat,
    size: row.size,
    textContent: row.text_content ?? undefined,
    chunks: row.chunks ? JSON.parse(row.chunks) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    status: row.status as DocumentStatus,
    error: row.error ?? undefined,
    createdAt: row.created_at,
  };
}

export function analysisToRow(analysis: MaAnalysis): IMaAnalysisRow {
  return {
    id: analysis.id,
    deal_id: analysis.dealId,
    type: analysis.type,
    flow_id: analysis.flowId ?? null,
    input: JSON.stringify(analysis.input),
    result: analysis.result ? JSON.stringify(analysis.result) : null,
    status: analysis.status,
    error: analysis.error ?? null,
    created_at: analysis.createdAt,
    completed_at: analysis.completedAt ?? null,
  };
}

export function rowToAnalysis(row: IMaAnalysisRow): MaAnalysis {
  return {
    id: row.id,
    dealId: row.deal_id,
    type: row.type as AnalysisType,
    flowId: row.flow_id ?? undefined,
    input: JSON.parse(row.input),
    result: row.result ? JSON.parse(row.result) : undefined,
    status: row.status as AnalysisStatus,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export function riskFindingToRow(finding: RiskFinding): IMaRiskFindingRow {
  return {
    id: finding.id,
    analysis_id: finding.analysisId,
    category: finding.category,
    severity: finding.severity,
    score: finding.score,
    title: finding.title,
    description: finding.description,
    evidence: finding.evidence ?? null,
    recommendation: finding.recommendation ?? null,
    source_document_id: finding.sourceDocumentId ?? null,
    created_at: finding.createdAt,
  };
}

export function rowToRiskFinding(row: IMaRiskFindingRow): RiskFinding {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    category: row.category as RiskCategory,
    severity: row.severity as RiskSeverity,
    score: row.score,
    title: row.title,
    description: row.description,
    evidence: row.evidence ?? undefined,
    recommendation: row.recommendation ?? undefined,
    sourceDocumentId: row.source_document_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function flowiseSessionToRow(session: FlowiseSession): IMaFlowiseSessionRow {
  return {
    id: session.id,
    conversation_id: session.conversationId,
    flow_id: session.flowId,
    deal_id: session.dealId ?? null,
    session_key: session.sessionKey ?? null,
    config: session.config ? JSON.stringify(session.config) : null,
    created_at: session.createdAt,
  };
}

export function rowToFlowiseSession(row: IMaFlowiseSessionRow): FlowiseSession {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    flowId: row.flow_id,
    dealId: row.deal_id ?? undefined,
    sessionKey: row.session_key ?? undefined,
    config: row.config ? JSON.parse(row.config) : undefined,
    createdAt: row.created_at,
  };
}

export function integrationConnectionToRow(connection: MaIntegrationConnection): IMaIntegrationConnectionRow {
  return {
    id: connection.id,
    provider_id: connection.providerId,
    provider_config_key: connection.providerConfigKey,
    connection_id: connection.connectionId ?? null,
    status: connection.status,
    display_name: connection.displayName ?? null,
    metadata: connection.metadata ? JSON.stringify(connection.metadata) : null,
    last_error: connection.lastError ?? null,
    connected_at: connection.connectedAt ?? null,
    last_synced_at: connection.lastSyncedAt ?? null,
    created_at: connection.createdAt,
    updated_at: connection.updatedAt,
  };
}

export function rowToIntegrationConnection(row: IMaIntegrationConnectionRow): MaIntegrationConnection {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerConfigKey: row.provider_config_key,
    connectionId: row.connection_id ?? undefined,
    status: row.status as MaIntegrationStatus,
    displayName: row.display_name ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    lastError: row.last_error ?? undefined,
    connectedAt: row.connected_at ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Sync Job Types (Email & CRM)
// ============================================================================

export type SyncJobType = 'email' | 'crm';
export type SyncJobStatus =
  | 'pending'
  | 'queued'
  | 'connecting'
  | 'fetching'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

/** Terminal statuses — once set, the sync job is finished. */
export const SYNC_JOB_TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'] as const;
export type SyncJobTerminalStatus = (typeof SYNC_JOB_TERMINAL_STATUSES)[number];

/** Active statuses — sync is in progress. */
export const SYNC_JOB_ACTIVE_STATUSES = ['queued', 'connecting', 'fetching', 'processing', 'retrying'] as const;
export type SyncJobActiveStatus = (typeof SYNC_JOB_ACTIVE_STATUSES)[number];

export function isTerminalSyncJobStatus(s: SyncJobStatus): boolean {
  return (SYNC_JOB_TERMINAL_STATUSES as readonly string[]).includes(s);
}

export function isActiveSyncJobStatus(s: SyncJobStatus): boolean {
  return (SYNC_JOB_ACTIVE_STATUSES as readonly string[]).includes(s);
}

/** Progress stage emitted during sync. */
export type SyncJobStage =
  | 'queued'
  | 'connecting'
  | 'fetching'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

/** Truthful progress event emitted while sync runs. */
export interface SyncJobProgress {
  jobId: string;
  jobType: SyncJobType;
  providerId: string;
  stage: SyncJobStage;
  progress: number; // 0-100, monotonically non-decreasing
  message?: string;
  timestamp: number;
  terminal: boolean;
  error?: string;
}

export interface SyncJob {
  id: string;
  jobType: SyncJobType;
  providerId: string;
  status: SyncJobStatus;
  config?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  itemsProcessed: number;
  itemsTotal: number;
  startedAt?: number;
  completedAt?: number;
  nextRetryAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSyncJobInput {
  jobType: SyncJobType;
  providerId: string;
  config?: Record<string, unknown>;
  maxRetries?: number;
}

export interface UpdateSyncJobInput {
  status?: SyncJobStatus;
  result?: Record<string, unknown>;
  error?: string;
  retryCount?: number;
  nextRetryAt?: number;
  itemsProcessed?: number;
  itemsTotal?: number;
  startedAt?: number;
  completedAt?: number;
}

/** Readiness snapshot for email/CRM sync. */
export interface SyncReadiness {
  jobType: SyncJobType;
  ready: boolean;
  hasConnection: boolean;
  connectionStatus?: MaIntegrationStatus;
  activeJobs: number;
  lastSyncAt?: number;
  error?: string;
  checkedAt: number;
}

// Zod Schemas
export const SyncJobTypeSchema = z.enum(['email', 'crm']);
export const SyncJobStatusSchema = z.enum([
  'pending',
  'queued',
  'connecting',
  'fetching',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'retrying',
]);
export const SyncJobStageSchema = z.enum([
  'queued',
  'connecting',
  'fetching',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'retrying',
]);

export const SyncJobProgressSchema = z.object({
  jobId: z.string().uuid(),
  jobType: SyncJobTypeSchema,
  providerId: z.string().min(1),
  stage: SyncJobStageSchema,
  progress: z.number().int().min(0).max(100),
  message: z.string().optional(),
  timestamp: z.number().int().positive(),
  terminal: z.boolean(),
  error: z.string().optional(),
});

export const SyncJobSchema = z.object({
  id: z.string().uuid(),
  jobType: SyncJobTypeSchema,
  providerId: z.string().min(1),
  status: SyncJobStatusSchema,
  config: z.record(z.unknown()).optional(),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  itemsProcessed: z.number().int().min(0),
  itemsTotal: z.number().int().min(0),
  startedAt: z.number().int().positive().optional(),
  completedAt: z.number().int().positive().optional(),
  nextRetryAt: z.number().int().positive().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateSyncJobInputSchema = z.object({
  jobType: SyncJobTypeSchema,
  providerId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
  maxRetries: z.number().int().min(0).optional(),
});

export const UpdateSyncJobInputSchema = z.object({
  status: SyncJobStatusSchema.optional(),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  retryCount: z.number().int().min(0).optional(),
  nextRetryAt: z.number().int().positive().optional(),
  itemsProcessed: z.number().int().min(0).optional(),
  itemsTotal: z.number().int().min(0).optional(),
  startedAt: z.number().int().positive().optional(),
  completedAt: z.number().int().positive().optional(),
});

export const SyncReadinessSchema = z.object({
  jobType: SyncJobTypeSchema,
  ready: z.boolean(),
  hasConnection: z.boolean(),
  connectionStatus: MaIntegrationStatusSchema.optional(),
  activeJobs: z.number().int().min(0),
  lastSyncAt: z.number().int().positive().optional(),
  error: z.string().optional(),
  checkedAt: z.number().int().positive(),
});

// ============================================================================
// Sync Job Database Row Types
// ============================================================================

export interface IMaSyncJobRow {
  id: string;
  job_type: string;
  provider_id: string;
  status: string;
  config: string | null;
  result: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  items_processed: number;
  items_total: number;
  started_at: number | null;
  completed_at: number | null;
  next_retry_at: number | null;
  created_at: number;
  updated_at: number;
}

export function syncJobToRow(job: SyncJob): IMaSyncJobRow {
  return {
    id: job.id,
    job_type: job.jobType,
    provider_id: job.providerId,
    status: job.status,
    config: job.config ? JSON.stringify(job.config) : null,
    result: job.result ? JSON.stringify(job.result) : null,
    error: job.error ?? null,
    retry_count: job.retryCount,
    max_retries: job.maxRetries,
    items_processed: job.itemsProcessed,
    items_total: job.itemsTotal,
    started_at: job.startedAt ?? null,
    completed_at: job.completedAt ?? null,
    next_retry_at: job.nextRetryAt ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

export function rowToSyncJob(row: IMaSyncJobRow): SyncJob {
  return {
    id: row.id,
    jobType: row.job_type as SyncJobType,
    providerId: row.provider_id,
    status: row.status as SyncJobStatus,
    config: row.config ? JSON.parse(row.config) : undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    error: row.error ?? undefined,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    itemsProcessed: row.items_processed,
    itemsTotal: row.items_total,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    nextRetryAt: row.next_retry_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Daily Brief and Reporting Types (Wave 10 / Batch 10C)
// ============================================================================

/** Time window for brief generation. */
export type BriefTimeWindow = '24h' | '7d' | '30d' | 'custom';

/** Provenance trail for traceability. */
export interface DataProvenance {
  /** Source entity type. */
  sourceType: 'document' | 'analysis' | 'deal' | 'integration' | 'sync';
  /** Source entity ID. */
  sourceId: string;
  /** Human-readable source name. */
  sourceName: string;
  /** Timestamp when data was generated. */
  generatedAt: number;
  /** Path to navigate to source (for drill-down). */
  drillDownPath: string;
}

/** Brief item with provenance. */
export interface BriefItem {
  /** Unique item ID. */
  id: string;
  /** Item type. */
  type:
    | 'document_uploaded'
    | 'document_processed'
    | 'analysis_completed'
    | 'risk_found'
    | 'deal_created'
    | 'sync_completed'
    | 'integration_connected';
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Timestamp. */
  timestamp: number;
  /** Associated deal ID (if applicable). */
  dealId?: string;
  /** Associated deal name (if applicable). */
  dealName?: string;
  /** Provenance information for traceability. */
  provenance: DataProvenance;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/** Daily brief summary. */
export interface DailyBrief {
  /** Brief generation timestamp. */
  generatedAt: number;
  /** Time window used. */
  timeWindow: BriefTimeWindow;
  /** Brief start timestamp. */
  windowStart: number;
  /** Brief end timestamp. */
  windowEnd: number;
  /** Summary counts. */
  summary: {
    totalDeals: number;
    activeDeals: number;
    documentsUploaded: number;
    documentsProcessed: number;
    analysesCompleted: number;
    risksIdentified: number;
    integrationsConnected: number;
  };
  /** Chronological brief items. */
  items: BriefItem[];
  /** Items grouped by deal. */
  byDeal: Record<string, BriefItem[]>;
}

/** Report section with provenance. */
export interface ReportSection {
  /** Section ID. */
  id: string;
  /** Section title. */
  title: string;
  /** Section type. */
  type: 'summary' | 'chart' | 'table' | 'list' | 'detail';
  /** Section content. */
  content: unknown;
  /** Data provenance for this section. */
  provenance: DataProvenance[];
  /** Drill-down path. */
  drillDownPath?: string;
}

/** Filter options for report generation. */
export interface ReportFilter {
  /** Deal IDs to include. */
  dealIds?: string[];
  /** Date range start. */
  startDate?: number;
  /** Date range end. */
  endDate?: number;
  /** Document types to include. */
  documentTypes?: DocumentType[];
  /** Analysis types to include. */
  analysisTypes?: AnalysisType[];
  /** Risk categories to include. */
  riskCategories?: RiskCategory[];
  /** Severity levels to include. */
  severityLevels?: RiskSeverity[];
}

/** Report type. */
export type ReportType =
  | 'executive_summary'
  | 'due_diligence'
  | 'risk_assessment'
  | 'document_status'
  | 'deal_comparison';

/** Report definition. */
export interface Report {
  /** Report ID. */
  id: string;
  /** Report type. */
  type: ReportType;
  /** Report title. */
  title: string;
  /** Generation timestamp. */
  generatedAt: number;
  /** Filter used. */
  filter: ReportFilter;
  /** Report sections. */
  sections: ReportSection[];
  /** Total item count across all sections. */
  totalItems: number;
}

/** Input for brief generation. */
export interface GenerateBriefInput {
  /** Time window. */
  timeWindow?: BriefTimeWindow;
  /** Custom start (for 'custom' window). */
  customStart?: number;
  /** Custom end (for 'custom' window). */
  customEnd?: number;
  /** Deal IDs to filter (optional). */
  dealIds?: string[];
}

/** Input for report generation. */
export interface GenerateReportInput {
  /** Report type. */
  type: ReportType;
  /** Report title. */
  title?: string;
  /** Filter options. */
  filter?: ReportFilter;
}

/** Brief generation result. */
export interface BriefGenerationResult {
  /** Success flag. */
  success: boolean;
  /** Generated brief (if success). */
  brief?: DailyBrief;
  /** Error message (if failed). */
  error?: string;
}

/** Report generation result. */
export interface ReportGenerationResult {
  /** Success flag. */
  success: boolean;
  /** Generated report (if success). */
  report?: Report;
  /** Error message (if failed). */
  error?: string;
}

// Zod Schemas for Daily Brief and Reporting

export const BriefTimeWindowSchema = z.enum(['24h', '7d', '30d', 'custom']);

export const DataProvenanceSchema = z.object({
  sourceType: z.enum(['document', 'analysis', 'deal', 'integration', 'sync']),
  sourceId: z.string().min(1),
  sourceName: z.string().min(1),
  generatedAt: z.number().int().positive(),
  drillDownPath: z.string().min(1),
});

export const BriefItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'document_uploaded',
    'document_processed',
    'analysis_completed',
    'risk_found',
    'deal_created',
    'sync_completed',
    'integration_connected',
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  timestamp: z.number().int().positive(),
  dealId: z.string().optional(),
  dealName: z.string().optional(),
  provenance: DataProvenanceSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const DailyBriefSchema = z.object({
  generatedAt: z.number().int().positive(),
  timeWindow: BriefTimeWindowSchema,
  windowStart: z.number().int().positive(),
  windowEnd: z.number().int().positive(),
  summary: z.object({
    totalDeals: z.number().int().nonnegative(),
    activeDeals: z.number().int().nonnegative(),
    documentsUploaded: z.number().int().nonnegative(),
    documentsProcessed: z.number().int().nonnegative(),
    analysesCompleted: z.number().int().nonnegative(),
    risksIdentified: z.number().int().nonnegative(),
    integrationsConnected: z.number().int().nonnegative(),
  }),
  items: z.array(BriefItemSchema),
  byDeal: z.record(z.array(BriefItemSchema)),
});

export const ReportTypeSchema = z.enum([
  'executive_summary',
  'due_diligence',
  'risk_assessment',
  'document_status',
  'deal_comparison',
]);

export const ReportFilterSchema = z.object({
  dealIds: z.array(z.string()).optional(),
  startDate: z.number().int().positive().optional(),
  endDate: z.number().int().positive().optional(),
  documentTypes: z.array(DocumentTypeSchema).optional(),
  analysisTypes: z.array(AnalysisTypeSchema).optional(),
  riskCategories: z.array(RiskCategorySchema).optional(),
  severityLevels: z.array(RiskSeveritySchema).optional(),
});

export const ReportSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['summary', 'chart', 'table', 'list', 'detail']),
  content: z.unknown(),
  provenance: z.array(DataProvenanceSchema),
  drillDownPath: z.string().optional(),
});

export const ReportSchema = z.object({
  id: z.string().min(1),
  type: ReportTypeSchema,
  title: z.string().min(1),
  generatedAt: z.number().int().positive(),
  filter: ReportFilterSchema,
  sections: z.array(ReportSectionSchema),
  totalItems: z.number().int().nonnegative(),
});

export const GenerateBriefInputSchema = z.object({
  timeWindow: BriefTimeWindowSchema.optional(),
  customStart: z.number().int().positive().optional(),
  customEnd: z.number().int().positive().optional(),
  dealIds: z.array(z.string()).optional(),
});

export const GenerateReportInputSchema = z.object({
  type: ReportTypeSchema,
  title: z.string().optional(),
  filter: ReportFilterSchema.optional(),
});
