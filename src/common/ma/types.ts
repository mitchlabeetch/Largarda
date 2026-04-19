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
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'error';

export type DocumentType = 'nda' | 'loi' | 'spa' | 'financial_statement' | 'due_diligence_report' | 'other';

// Zod Schemas
export const DocumentFormatSchema = z.enum(['pdf', 'docx', 'xlsx', 'txt']);
export const DocumentStatusSchema = z.enum(['pending', 'processing', 'completed', 'error']);
export const DocumentTypeSchema = z.enum(['nda', 'loi', 'spa', 'financial_statement', 'due_diligence_report', 'other']);

export const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  createdAt: z.number().int().positive().optional(),
  pageCount: z.number().int().positive().optional(),
  documentType: DocumentTypeSchema.optional(),
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
