/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IGdprExportRequest,
  IGdprErasureRequest,
  IRetentionPolicy,
  IRetentionEnforcementJob,
  IVdrAccessGrant,
  IVdrAccessRequest,
  IComplianceWorkflow,
  IComplianceWorkflowQuery,
  IComplianceWorkflowPaginatedResult,
  IDestructiveActionReview,
} from '@/common/types/complianceTypes';
import type { IQueryResult } from './types';

/**
 * Repository interface for GDPR export requests
 * Provides CRUD and query operations for data portability requests
 */
export interface IGdprExportRepository {
  /**
   * Create a new GDPR export request
   * @param request The export request to create
   * @returns Promise<IQueryResult<IGdprExportRequest>>
   */
  create(request: Omit<IGdprExportRequest, 'id' | 'requestedAt'>): Promise<IQueryResult<IGdprExportRequest>>;

  /**
   * Get export request by ID
   * @param id The request ID
   * @returns Promise<IQueryResult<IGdprExportRequest>>
   */
  getById(id: string): Promise<IQueryResult<IGdprExportRequest>>;

  /**
   * Get export requests for a user
   * @param userId The user ID
   * @param limit Maximum number of results
   * @returns Promise<IQueryResult<IGdprExportRequest[]>>
   */
  getByUser(userId: string, limit?: number): Promise<IQueryResult<IGdprExportRequest[]>>;

  /**
   * Get pending export requests awaiting review
   * @returns Promise<IQueryResult<IGdprExportRequest[]>>
   */
  getPending(): Promise<IQueryResult<IGdprExportRequest[]>>;

  /**
   * Mark request as reviewed
   * @param id The request ID
   * @param reviewerId The reviewer user ID
   * @returns Promise<IQueryResult<void>>
   */
  markReviewed(id: string, reviewerId: string): Promise<IQueryResult<void>>;

  /**
   * Mark request as completed with download URL
   * @param id The request ID
   * @param downloadUrl The generated download URL
   * @param expiresAt When the download link expires
   * @returns Promise<IQueryResult<void>>
   */
  markCompleted(id: string, downloadUrl: string, expiresAt: number): Promise<IQueryResult<void>>;

  /**
   * Cancel an export request
   * @param id The request ID
   * @param reason The cancellation reason
   * @returns Promise<IQueryResult<void>>
   */
  cancel(id: string, reason: string): Promise<IQueryResult<void>>;
}

/**
 * Repository interface for GDPR erasure requests
 * Provides CRUD and query operations for right to be forgotten requests
 */
export interface IGdprErasureRepository {
  /**
   * Create a new GDPR erasure request
   * @param request The erasure request to create
   * @returns Promise<IQueryResult<IGdprErasureRequest>>
   */
  create(request: Omit<IGdprErasureRequest, 'id' | 'requestedAt'>): Promise<IQueryResult<IGdprErasureRequest>>;

  /**
   * Get erasure request by ID
   * @param id The request ID
   * @returns Promise<IQueryResult<IGdprErasureRequest>>
   */
  getById(id: string): Promise<IQueryResult<IGdprErasureRequest>>;

  /**
   * Get erasure requests for a user
   * @param userId The user ID
   * @param limit Maximum number of results
   * @returns Promise<IQueryResult<IGdprErasureRequest[]>>
   */
  getByUser(userId: string, limit?: number): Promise<IQueryResult<IGdprErasureRequest[]>>;

  /**
   * Get pending erasure requests awaiting review
   * @returns Promise<IQueryResult<IGdprErasureRequest[]>>
   */
  getPending(): Promise<IQueryResult<IGdprErasureRequest[]>>;

  /**
   * Store dry run results
   * @param id The request ID
   * @param results The dry run results
   * @returns Promise<IQueryResult<void>>
   */
  storeDryRunResults(id: string, results: IGdprErasureRequest['dryRunResults']): Promise<IQueryResult<void>>;

  /**
   * Mark request as reviewed
   * @param id The request ID
   * @param reviewerId The reviewer user ID
   * @returns Promise<IQueryResult<void>>
   */
  markReviewed(id: string, reviewerId: string): Promise<IQueryResult<void>>;

  /**
   * Mark request as executed (dry run complete, actual execution started)
   * @param id The request ID
   * @returns Promise<IQueryResult<void>>
   */
  markExecuted(id: string): Promise<IQueryResult<void>>;

  /**
   * Mark request as completed with actual results
   * @param id The request ID
   * @param results The actual execution results
   * @returns Promise<IQueryResult<void>>
   */
  markCompleted(id: string, results: IGdprErasureRequest['actualResults']): Promise<IQueryResult<void>>;

  /**
   * Cancel an erasure request
   * @param id The request ID
   * @param reason The cancellation reason
   * @returns Promise<IQueryResult<void>>
   */
  cancel(id: string, reason: string): Promise<IQueryResult<void>>;
}

/**
 * Repository interface for retention policies
 * Provides CRUD and enforcement operations for data retention
 */
export interface IRetentionPolicyRepository {
  /**
   * Create a new retention policy
   * @param policy The policy to create
   * @returns Promise<IQueryResult<IRetentionPolicy>>
   */
  create(policy: Omit<IRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<IQueryResult<IRetentionPolicy>>;

  /**
   * Get policy by ID
   * @param id The policy ID
   * @returns Promise<IQueryResult<IRetentionPolicy>>
   */
  getById(id: string): Promise<IQueryResult<IRetentionPolicy>>;

  /**
   * Get all active policies
   * @returns Promise<IQueryResult<IRetentionPolicy[]>>
   */
  getActive(): Promise<IQueryResult<IRetentionPolicy[]>>;

  /**
   * Get policies by resource type
   * @param resourceType The resource type
   * @returns Promise<IQueryResult<IRetentionPolicy[]>>
   */
  getByResourceType(resourceType: string): Promise<IQueryResult<IRetentionPolicy[]>>;

  /**
   * Update a policy
   * @param id The policy ID
   * @param updates The updates to apply
   * @returns Promise<IQueryResult<IRetentionPolicy>>
   */
  update(
    id: string,
    updates: Partial<Omit<IRetentionPolicy, 'id' | 'createdAt'>>
  ): Promise<IQueryResult<IRetentionPolicy>>;

  /**
   * Delete a policy (soft delete by deactivating)
   * @param id The policy ID
   * @returns Promise<IQueryResult<void>>
   */
  deactivate(id: string): Promise<IQueryResult<void>>;

  /**
   * Create an enforcement job record
   * @param job The enforcement job
   * @returns Promise<IQueryResult<IRetentionEnforcementJob>>
   */
  createEnforcementJob(job: Omit<IRetentionEnforcementJob, 'id'>): Promise<IQueryResult<IRetentionEnforcementJob>>;

  /**
   * Update enforcement job status
   * @param id The job ID
   * @param updates The updates to apply
   * @returns Promise<IQueryResult<void>>
   */
  updateEnforcementJob(id: string, updates: Partial<IRetentionEnforcementJob>): Promise<IQueryResult<void>>;

  /**
   * Get items eligible for retention enforcement
   * @param resourceType The resource type
   * @param cutoffDate Items older than this date are eligible
   * @returns Promise<IQueryResult<Array<{ id: string; userId: string; createdAt: number }>>>
   */
  getEligibleItems(
    resourceType: string,
    cutoffDate: number
  ): Promise<IQueryResult<Array<{ id: string; userId: string; createdAt: number }>>>;
}

/**
 * Repository interface for VDR access grants
 * Provides CRUD and query operations for virtual data room access
 */
export interface IVdrAccessRepository {
  /**
   * Create a new VDR access grant
   * @param grant The access grant to create
   * @returns Promise<IQueryResult<IVdrAccessGrant>>
   */
  create(grant: Omit<IVdrAccessGrant, 'id' | 'grantedAt'>): Promise<IQueryResult<IVdrAccessGrant>>;

  /**
   * Get access grant by ID
   * @param id The grant ID
   * @returns Promise<IQueryResult<IVdrAccessGrant>>
   */
  getById(id: string): Promise<IQueryResult<IVdrAccessGrant>>;

  /**
   * Get access grants for a user
   * @param userId The user ID
   * @param includeExpired Whether to include expired/revoked grants
   * @returns Promise<IQueryResult<IVdrAccessGrant[]>>
   */
  getByUser(userId: string, includeExpired?: boolean): Promise<IQueryResult<IVdrAccessGrant[]>>;

  /**
   * Get access grants for a deal
   * @param dealId The deal ID
   * @returns Promise<IQueryResult<IVdrAccessGrant[]>>
   */
  getByDeal(dealId: string): Promise<IQueryResult<IVdrAccessGrant[]>>;

  /**
   * Get access grants for a document
   * @param documentId The document ID
   * @returns Promise<IQueryResult<IVdrAccessGrant[]>>
   */
  getByDocument(documentId: string): Promise<IQueryResult<IVdrAccessGrant[]>>;

  /**
   * Revoke an access grant
   * @param id The grant ID
   * @param revokedBy The user revoking access
   * @returns Promise<IQueryResult<void>>
   */
  revoke(id: string, revokedBy: string): Promise<IQueryResult<void>>;

  /**
   * Check if user has access to a document
   * @param userId The user ID
   * @param documentId The document ID
   * @param requiredLevel The required access level
   * @returns Promise<IQueryResult<boolean>>
   */
  checkAccess(
    userId: string,
    documentId: string,
    requiredLevel: IVdrAccessGrant['accessLevel']
  ): Promise<IQueryResult<boolean>>;

  /**
   * Create an access request
   * @param request The access request
   * @returns Promise<IQueryResult<IVdrAccessRequest>>
   */
  createAccessRequest(request: Omit<IVdrAccessRequest, 'id' | 'requestedAt'>): Promise<IQueryResult<IVdrAccessRequest>>;

  /**
   * Get pending access requests
   * @returns Promise<IQueryResult<IVdrAccessRequest[]>>
   */
  getPendingRequests(): Promise<IQueryResult<IVdrAccessRequest[]>>;

  /**
   * Approve or reject an access request
   * @param id The request ID
   * @param approved Whether to approve
   * @param reviewerId The reviewer ID
   * @param grantId The created grant ID (if approved)
   * @param reason The rejection reason (if rejected)
   * @returns Promise<IQueryResult<void>>
   */
  respondToRequest(
    id: string,
    approved: boolean,
    reviewerId: string,
    grantId?: string,
    reason?: string
  ): Promise<IQueryResult<void>>;
}

/**
 * Repository interface for general compliance workflows
 * Provides unified interface for workflow management
 */
export interface IComplianceWorkflowRepository {
  /**
   * Create a new compliance workflow
   * @param workflow The workflow to create
   * @returns Promise<IQueryResult<IComplianceWorkflow>>
   */
  create(workflow: Omit<IComplianceWorkflow, 'id' | 'initiatedAt'>): Promise<IQueryResult<IComplianceWorkflow>>;

  /**
   * Get workflow by ID
   * @param id The workflow ID
   * @returns Promise<IQueryResult<IComplianceWorkflow>>
   */
  getById(id: string): Promise<IQueryResult<IComplianceWorkflow>>;

  /**
   * Query workflows with filters and pagination
   * @param query Query parameters
   * @returns Promise<IQueryResult<IComplianceWorkflowPaginatedResult>>
   */
  query(query: IComplianceWorkflowQuery): Promise<IQueryResult<IComplianceWorkflowPaginatedResult>>;

  /**
   * Update workflow status
   * @param id The workflow ID
   * @param status The new status
   * @param errorMessage Optional error message
   * @returns Promise<IQueryResult<void>>
   */
  updateStatus(id: string, status: IComplianceWorkflow['status'], errorMessage?: string): Promise<IQueryResult<void>>;

  /**
   * Mark workflow as reviewed
   * @param id The workflow ID
   * @param reviewerId The reviewer ID
   * @param approved Whether approved
   * @param notes Review notes
   * @returns Promise<IQueryResult<void>>
   */
  markReviewed(id: string, reviewerId: string, approved: boolean, notes?: string): Promise<IQueryResult<void>>;

  /**
   * Mark workflow as executed
   * @param id The workflow ID
   * @returns Promise<IQueryResult<void>>
   */
  markExecuted(id: string): Promise<IQueryResult<void>>;

  /**
   * Mark workflow as completed
   * @param id The workflow ID
   * @returns Promise<IQueryResult<void>>
   */
  markCompleted(id: string): Promise<IQueryResult<void>>;
}

/**
 * Repository interface for destructive action reviews
 * Provides safety review workflow for destructive operations
 */
export interface IDestructiveActionReviewRepository {
  /**
   * Create a new destructive action review
   * @param review The review to create
   * @returns Promise<IQueryResult<IDestructiveActionReview>>
   */
  create(review: Omit<IDestructiveActionReview, 'id'>): Promise<IQueryResult<IDestructiveActionReview>>;

  /**
   * Get review by ID
   * @param id The review ID
   * @returns Promise<IQueryResult<IDestructiveActionReview>>
   */
  getById(id: string): Promise<IQueryResult<IDestructiveActionReview>>;

  /**
   * Get review by workflow ID
   * @param workflowId The workflow ID
   * @returns Promise<IQueryResult<IDestructiveActionReview>>
   */
  getByWorkflowId(workflowId: string): Promise<IQueryResult<IDestructiveActionReview>>;

  /**
   * Get pending reviews requiring approval
   * @returns Promise<IQueryResult<IDestructiveActionReview[]>>
   */
  getPending(): Promise<IQueryResult<IDestructiveActionReview[]>>;

  /**
   * Provide primary approval
   * @param id The review ID
   * @param reviewerId The reviewer ID
   * @returns Promise<IQueryResult<void>>
   */
  providePrimaryApproval(id: string, reviewerId: string): Promise<IQueryResult<void>>;

  /**
   * Provide secondary approval (for dual-approval workflow)
   * @param id The review ID
   * @param reviewerId The reviewer ID
   * @returns Promise<IQueryResult<void>>
   */
  provideSecondaryApproval(id: string, reviewerId: string): Promise<IQueryResult<void>>;

  /**
   * Reject a review
   * @param id The review ID
   * @param reviewerId The reviewer ID
   * @param reason The rejection reason
   * @returns Promise<IQueryResult<void>>
   */
  reject(id: string, reviewerId: string, reason: string): Promise<IQueryResult<void>>;

  /**
   * Mark review as executed
   * @param id The review ID
   * @returns Promise<IQueryResult<void>>
   */
  markExecuted(id: string): Promise<IQueryResult<void>>;
}
