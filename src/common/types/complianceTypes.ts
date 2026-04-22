/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compliance Types - GDPR and VDR workflow definitions
 * Explicit, reviewable regulated workflows for export, erasure, retention,
 * and data-room handling
 */

// ===== Workflow Status Types =====

export type ComplianceWorkflowStatus =
  | 'pending_review'
  | 'awaiting_confirmation'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type ComplianceWorkflowType =
  | 'data_export'
  | 'data_erasure'
  | 'retention_enforcement'
  | 'vdr_provision'
  | 'vdr_revoke';

export type ComplianceActionType =
  | 'export_user_data'
  | 'export_conversation_history'
  | 'export_audit_logs'
  | 'erase_user_data'
  | 'erase_conversation'
  | 'enforce_retention_policy'
  | 'create_vdr_access'
  | 'revoke_vdr_access'
  | 'archive_expired_data';

// ===== GDPR Export Types =====

export interface IGdprExportRequest {
  id: string;
  userId: string;
  requestType: 'full_export' | 'conversation_history' | 'audit_trail';
  requestedAt: number;
  status: ComplianceWorkflowStatus;
  scope: {
    includeConversations: boolean;
    includeAuditLogs: boolean;
    includeSettings: boolean;
    includeExtensions: boolean;
    dateRange?: { start: number; end: number };
  };
  reviewedBy?: string;
  reviewedAt?: number;
  completedAt?: number;
  downloadUrl?: string;
  expiresAt?: number;
  metadata?: {
    reason?: string;
    requestSource?: 'user_portal' | 'admin' | 'legal_request';
    format?: 'json' | 'csv' | 'pdf';
  };
}

export interface IGdprExportRequestRow {
  id: string;
  user_id: string;
  request_type: string;
  requested_at: number;
  status: string;
  scope_conversations: number;
  scope_audit_logs: number;
  scope_settings: number;
  scope_extensions: number;
  date_range_start?: number;
  date_range_end?: number;
  reviewed_by?: string;
  reviewed_at?: number;
  completed_at?: number;
  download_url?: string;
  expires_at?: number;
  metadata?: string;
}

// ===== GDPR Erasure Types =====

export interface IGdprErasureRequest {
  id: string;
  userId: string;
  requestType: 'full_erasure' | 'selective_erasure';
  requestedAt: number;
  status: ComplianceWorkflowStatus;
  scope: {
    conversations: string[];
    messages: string[];
    userData: boolean;
    auditLogs: boolean;
  };
  reviewedBy?: string;
  reviewedAt?: number;
  executedAt?: number;
  completedAt?: number;
  dryRunPerformed: boolean;
  dryRunResults?: {
    conversationsToDelete: number;
    messagesToDelete: number;
    estimatedSize: number;
  };
  actualResults?: {
    conversationsDeleted: number;
    messagesDeleted: number;
    bytesFreed: number;
  };
  metadata?: {
    reason?: string;
    legalBasis?: 'gdpr_article_17' | 'user_request' | 'retention_expired';
    rightToObject?: boolean;
  };
}

export interface IGdprErasureRequestRow {
  id: string;
  user_id: string;
  request_type: string;
  requested_at: number;
  status: string;
  scope_conversations: string;
  scope_messages: string;
  scope_user_data: number;
  scope_audit_logs: number;
  reviewed_by?: string;
  reviewed_at?: number;
  executed_at?: number;
  completed_at?: number;
  dry_run_performed: number;
  dry_run_results?: string;
  actual_results?: string;
  metadata?: string;
}

// ===== Retention Policy Types =====

export interface IRetentionPolicy {
  id: string;
  name: string;
  description: string;
  appliesTo: ResourceType[];
  retentionDays: number;
  action: 'archive' | 'delete' | 'anonymize';
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface IRetentionPolicyRow {
  id: string;
  name: string;
  description: string;
  applies_to: string;
  retention_days: number;
  action: string;
  is_active: number;
  created_at: number;
  updated_at: number;
  created_by: string;
}

export interface IRetentionEnforcementJob {
  id: string;
  policyId: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed';
  stats: {
    itemsScanned: number;
    itemsProcessed: number;
    itemsSkipped: number;
    errors: string[];
  };
}

export type ResourceType = 'conversation' | 'message' | 'audit_log' | 'user_data' | 'attachment' | 'session';

// ===== VDR Types =====

export interface IVdrAccessGrant {
  id: string;
  userId: string;
  dealId?: string;
  documentIds: string[];
  grantedAt: number;
  expiresAt?: number;
  grantedBy: string;
  accessLevel: 'view' | 'download' | 'annotate' | 'admin';
  status: 'active' | 'expired' | 'revoked';
  revokedAt?: number;
  revokedBy?: string;
  metadata?: {
    ndaSigned?: boolean;
    ndaSignedAt?: number;
    purpose?: string;
    ipWhitelist?: string[];
    watermarkText?: string;
  };
}

export interface IVdrAccessGrantRow {
  id: string;
  user_id: string;
  deal_id?: string;
  document_ids: string;
  granted_at: number;
  expires_at?: number;
  granted_by: string;
  access_level: string;
  status: string;
  revoked_at?: number;
  revoked_by?: string;
  metadata?: string;
}

export interface IVdrAccessRequest {
  id: string;
  userId: string;
  requestedAt: number;
  status: ComplianceWorkflowStatus;
  purpose: string;
  requestedDocuments: string[];
  requestedAccessLevel: IVdrAccessGrant['accessLevel'];
  reviewedBy?: string;
  reviewedAt?: number;
  approved?: boolean;
  rejectionReason?: string;
  resultingGrantId?: string;
}

export interface IVdrAccessRequestRow {
  id: string;
  user_id: string;
  requested_at: number;
  status: string;
  purpose: string;
  requested_documents: string;
  requested_access_level: string;
  reviewed_by?: string;
  reviewed_at?: number;
  approved?: number;
  rejection_reason?: string;
  resulting_grant_id?: string;
}

// ===== Compliance Workflow Types =====

export interface IComplianceWorkflow {
  id: string;
  workflowType: ComplianceWorkflowType;
  actionType: ComplianceActionType;
  status: ComplianceWorkflowStatus;
  initiatedBy: string;
  initiatedAt: number;
  reviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  approved?: boolean;
  approvalNotes?: string;
  executedAt?: number;
  completedAt?: number;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export interface IComplianceWorkflowRow {
  id: string;
  workflow_type: string;
  action_type: string;
  status: string;
  initiated_by: string;
  initiated_at: number;
  review_required: number;
  reviewed_by?: string;
  reviewed_at?: number;
  approved?: number;
  approval_notes?: string;
  executed_at?: number;
  completed_at?: number;
  target_user_id?: string;
  metadata?: string;
  error_message?: string;
}

// ===== Query Types =====

export interface IComplianceWorkflowQuery {
  workflowType?: ComplianceWorkflowType;
  actionType?: ComplianceActionType;
  status?: ComplianceWorkflowStatus;
  initiatedBy?: string;
  targetUserId?: string;
  startTime?: number;
  endTime?: number;
  reviewRequired?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: 'initiatedAt' | 'status' | 'workflowType';
  orderDirection?: 'ASC' | 'DESC';
}

export interface IComplianceWorkflowPaginatedResult {
  workflows: IComplianceWorkflow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ===== Safety Review Types =====

export interface IDestructiveActionReview {
  id: string;
  workflowId: string;
  actionType: ComplianceActionType;
  requestedBy: string;
  requestedAt: number;
  requiresDualApproval: boolean;
  primaryReviewer?: string;
  primaryApprovedAt?: number;
  secondaryReviewer?: string;
  secondaryApprovedAt?: number;
  rejectionReason?: string;
  dryRunResults?: Record<string, unknown>;
  approved: boolean;
  executed: boolean;
  executedAt?: number;
}

export interface IDestructiveActionReviewRow {
  id: string;
  workflow_id: string;
  action_type: string;
  requested_by: string;
  requested_at: number;
  requires_dual_approval: number;
  primary_reviewer?: string;
  primary_approved_at?: number;
  secondary_reviewer?: string;
  secondary_approved_at?: number;
  rejection_reason?: string;
  dry_run_results?: string;
  approved: number;
  executed: number;
  executed_at?: number;
}

// ===== Compliance Report Types =====

export interface IComplianceReportRequest {
  reportType: 'gdpr_export_summary' | 'erasure_audit' | 'retention_summary' | 'vdr_access_log';
  startTime: number;
  endTime: number;
  filters?: Record<string, unknown>;
}

export interface IComplianceReport {
  id: string;
  reportType: IComplianceReportRequest['reportType'];
  generatedAt: number;
  generatedBy: string;
  parameters: IComplianceReportRequest;
  data: Record<string, unknown>;
  summary: string;
}

// ===== Re-export ResourceType for compatibility =====
export { ResourceType as ComplianceResourceType };
