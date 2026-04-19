/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * M&A Assistant Constants
 * Risk categories, severities, document types, and other domain constants.
 */

// ============================================================================
// Risk Categories
// ============================================================================

export const RISK_CATEGORIES = ['financial', 'legal', 'operational', 'regulatory', 'reputational'] as const;

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  financial: 'Financial',
  legal: 'Legal',
  operational: 'Operational',
  regulatory: 'Regulatory',
  reputational: 'Reputational',
};

export const RISK_CATEGORY_DESCRIPTIONS: Record<RiskCategory, string> = {
  financial: 'Risks related to financial health, performance, and stability',
  legal: 'Risks related to legal obligations, litigation, and compliance',
  operational: 'Risks related to business operations and processes',
  regulatory: 'Risks related to regulatory requirements and government compliance',
  reputational: 'Risks related to brand reputation and public perception',
};

// ============================================================================
// Risk Severity
// ============================================================================

export const RISK_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const RISK_SEVERITY_SCORE_RANGES: Record<RiskSeverity, { min: number; max: number }> = {
  low: { min: 1, max: 25 },
  medium: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 },
};

// ============================================================================
// Document Types
// ============================================================================

export const DOCUMENT_TYPES = ['nda', 'loi', 'spa', 'financial_statement', 'due_diligence_report', 'other'] as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  nda: 'Non-Disclosure Agreement',
  loi: 'Letter of Intent',
  spa: 'Share Purchase Agreement',
  financial_statement: 'Financial Statement',
  due_diligence_report: 'Due Diligence Report',
  other: 'Other',
};

// ============================================================================
// Document Formats
// ============================================================================

export const DOCUMENT_FORMATS = ['pdf', 'docx', 'xlsx', 'txt'] as const;

export const DOCUMENT_FORMAT_MIME_TYPES: Record<DocumentFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
};

// ============================================================================
// Deal Status
// ============================================================================

export const DEAL_STATUSES = ['active', 'archived', 'closed'] as const;

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  closed: 'Closed',
};

// ============================================================================
// Transaction Types
// ============================================================================

export const TRANSACTION_TYPES = ['acquisition', 'merger', 'divestiture', 'joint_venture'] as const;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  acquisition: 'Acquisition',
  merger: 'Merger',
  divestiture: 'Divestiture',
  joint_venture: 'Joint Venture',
};

// ============================================================================
// Analysis Types
// ============================================================================

export const ANALYSIS_TYPES = [
  'due_diligence',
  'risk_assessment',
  'financial_extraction',
  'document_comparison',
] as const;

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  due_diligence: 'Due Diligence',
  risk_assessment: 'Risk Assessment',
  financial_extraction: 'Financial Extraction',
  document_comparison: 'Document Comparison',
};

// ============================================================================
// Flowise Configuration
// ============================================================================

export const FLOWISE_DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 60000,
  retryAttempts: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
} as const;

export const FLOWISE_ENDPOINTS = {
  prediction: '/api/v1/prediction',
  chatflows: '/api/v1/chatflows',
  vectorUpsert: '/api/v1/vector/upsert',
  vectorQuery: '/api/v1/vector/query',
  agentflowV2: '/api/v2/agentflows',
} as const;

export const FLOWISE_EVENT_TYPES = [
  'token',
  'metadata',
  'usedTools',
  'sourceDocuments',
  'nextAction',
  'agentReasoning',
  'error',
  'complete',
] as const;

// ============================================================================
// Error Codes
// ============================================================================

export const MA_ERROR_CODES = [
  'FLOWISE_CONNECTION_FAILED',
  'FLOWISE_FLOW_ERROR',
  'DOCUMENT_FORMAT_UNSUPPORTED',
  'DOCUMENT_PROCESSING_FAILED',
  'ANALYSIS_FAILED',
  'DEAL_NOT_FOUND',
  'DOCUMENT_NOT_FOUND',
  'UNAUTHORIZED_ACCESS',
  'RATE_LIMIT_EXCEEDED',
] as const;

export const MA_ERROR_MESSAGES: Record<MaErrorCode, string> = {
  FLOWISE_CONNECTION_FAILED: 'Failed to connect to Flowise backend',
  FLOWISE_FLOW_ERROR: 'Error executing Flowise flow',
  DOCUMENT_FORMAT_UNSUPPORTED: 'Document format is not supported',
  DOCUMENT_PROCESSING_FAILED: 'Failed to process document',
  ANALYSIS_FAILED: 'Analysis execution failed',
  DEAL_NOT_FOUND: 'Deal not found',
  DOCUMENT_NOT_FOUND: 'Document not found',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
};

// ============================================================================
// Type Imports for Constants
// ============================================================================

import type {
  RiskCategory,
  RiskSeverity,
  DocumentType,
  DocumentFormat,
  DealStatus,
  TransactionType,
  AnalysisType,
  MaErrorCode,
} from './types';
