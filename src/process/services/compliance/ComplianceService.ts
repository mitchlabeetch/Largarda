/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IGdprExportRequest,
  IGdprErasureRequest,
  IRetentionPolicy,
  IVdrAccessGrant,
  IVdrAccessRequest,
  IComplianceWorkflow,
  IComplianceWorkflowQuery,
  IComplianceWorkflowPaginatedResult,
  IDestructiveActionReview,
  ComplianceWorkflowType,
  ComplianceActionType,
} from '@/common/types/complianceTypes';
import type { AuditLogService } from '@process/services/database/auditLogService';
import { AuditActionCategory } from '@/common/types/rbacTypes';
import type {
  IGdprExportRepository,
  IGdprErasureRepository,
  IRetentionPolicyRepository,
  IVdrAccessRepository,
  IComplianceWorkflowRepository,
  IDestructiveActionReviewRepository,
} from '@process/services/database/IComplianceRepository';
import type { IQueryResult } from '@process/services/database/types';
import type { IConversationRepository } from '@process/services/database/IConversationRepository';
import type { TChatConversation } from '@/common/config/storage';

export interface ComplianceServiceConfig {
  requireReview: boolean;
  dualApprovalThreshold: 'never' | 'high_impact' | 'always';
  exportExpirationHours: number;
  dryRunBeforeErasure: boolean;
  retentionCheckIntervalHours: number;
}

const DEFAULT_CONFIG: ComplianceServiceConfig = {
  requireReview: true,
  dualApprovalThreshold: 'high_impact',
  exportExpirationHours: 168,
  dryRunBeforeErasure: true,
  retentionCheckIntervalHours: 24,
};

export interface ExportRequestInput {
  userId: string;
  requestType: IGdprExportRequest['requestType'];
  scope: IGdprExportRequest['scope'];
  initiatedBy: string;
  metadata?: IGdprExportRequest['metadata'];
}

export interface ErasureRequestInput {
  userId: string;
  requestType: IGdprErasureRequest['requestType'];
  scope: IGdprErasureRequest['scope'];
  initiatedBy: string;
  metadata?: IGdprErasureRequest['metadata'];
}

export interface VdrAccessInput {
  userId: string;
  dealId?: string;
  documentIds: string[];
  accessLevel: IVdrAccessGrant['accessLevel'];
  grantedBy: string;
  expiresAt?: number;
  metadata?: IVdrAccessGrant['metadata'];
}

export interface VdrRequestInput {
  userId: string;
  requestedDocuments: string[];
  requestedAccessLevel: IVdrAccessGrant['accessLevel'];
  purpose?: string;
}

export class ComplianceService {
  private config: ComplianceServiceConfig;

  constructor(
    private exportRepo: IGdprExportRepository,
    private erasureRepo: IGdprErasureRepository,
    private retentionRepo: IRetentionPolicyRepository,
    private vdrRepo: IVdrAccessRepository,
    private workflowRepo: IComplianceWorkflowRepository,
    private reviewRepo: IDestructiveActionReviewRepository,
    private auditLog: AuditLogService,
    private conversationRepo: IConversationRepository,
    config?: Partial<ComplianceServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===== GDPR Export Workflow =====
  async initiateExport(input: ExportRequestInput): Promise<IQueryResult<IGdprExportRequest>> {
    const workflow = await this.createWorkflow('data_export', 'export_user_data', input.initiatedBy, input.userId);
    if (!workflow.success || !workflow.data) return { success: false, error: 'Failed to create workflow' };

    const request = await this.exportRepo.create({
      userId: input.userId,
      requestType: input.requestType,
      status: this.config.requireReview ? 'pending_review' : 'in_progress',
      scope: input.scope,
      metadata: input.metadata,
    });
    if (!request.success) return request;

    await this.auditLog.logSuccess({
      action: 'gdpr_export_initiated',
      category: AuditActionCategory.DATA,
      userId: input.initiatedBy,
      description: `GDPR export initiated for user ${input.userId}`,
      metadata: { requestId: request.data?.id, workflowId: workflow.data.id, requestType: input.requestType },
    });

    if (this.config.requireReview) {
      await this.workflowRepo.updateStatus(workflow.data.id, 'pending_review');
    } else {
      await this.executeExport(request.data!.id, workflow.data.id);
    }
    return request;
  }

  async reviewExport(
    requestId: string,
    reviewerId: string,
    approved: boolean,
    notes?: string
  ): Promise<IQueryResult<void>> {
    const request = await this.exportRepo.getById(requestId);
    if (!request.success || !request.data) return { success: false, error: 'Export request not found' };
    if (request.data.status !== 'pending_review') return { success: false, error: 'Request not pending review' };

    await this.exportRepo.markReviewed(requestId, reviewerId);
    await this.auditLog.logSuccess({
      action: 'gdpr_export_reviewed',
      category: AuditActionCategory.DATA,
      userId: reviewerId,
      description: `GDPR export ${approved ? 'approved' : 'rejected'} for user ${request.data.userId}`,
      metadata: { requestId, approved, notes },
    });

    const workflowRes = await this.workflowRepo.query({ targetUserId: request.data.userId, page: 1, pageSize: 1 });
    const workflow = workflowRes.success && workflowRes.data?.workflows[0];

    if (approved) {
      await this.workflowRepo.markReviewed(workflow!.id, reviewerId, true, notes);
      await this.executeExport(requestId, workflow!.id);
    } else {
      await this.exportRepo.cancel(requestId, notes ?? 'Rejected by reviewer');
      if (workflow) await this.workflowRepo.updateStatus(workflow.id, 'cancelled', notes);
    }
    return { success: true, data: undefined };
  }

  private async executeExport(requestId: string, workflowId: string): Promise<IQueryResult<void>> {
    try {
      const request = await this.exportRepo.getById(requestId);
      if (!request.success || !request.data) return { success: false, error: 'Request not found' };

      // Discover user data
      const userData = await this.discoverUserData(request.data.userId);

      // Create export file
      const exportPath = `/tmp/gdpr-export-${requestId}.json.gz`;
      await this.createExportFile(exportPath, userData);

      // Mark as completed
      const expiresAt = Date.now() + (this.config.exportExpirationHours * 60 * 60 * 1000);
      await this.exportRepo.markCompleted(requestId, exportPath, expiresAt);
      await this.workflowRepo.markCompleted(workflowId);

      await this.auditLog.logSuccess({
        action: 'gdpr_export_completed',
        category: AuditActionCategory.DATA,
        userId: request.data.userId,
        description: `GDPR export completed for user ${request.data.userId}`,
        metadata: { requestId, workflowId, exportPath, expiresAt },
      });

      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute export';
      await this.workflowRepo.updateStatus(workflowId, 'failed', message);
      await this.auditLog.logSecurity({
        action: 'gdpr_export_failed',
        description: `GDPR export failed`,
        userId: '',
        success: false,
        metadata: { requestId, workflowId, error: message },
      });
      return { success: false, error: message };
    }
  }

  // ===== GDPR Erasure Workflow =====
  async initiateErasure(input: ErasureRequestInput): Promise<IQueryResult<IGdprErasureRequest>> {
    const workflow = await this.createWorkflow('data_erasure', 'erase_user_data', input.initiatedBy, input.userId);
    if (!workflow.success || !workflow.data) return { success: false, error: 'Failed to create workflow' };

    const request = await this.erasureRepo.create({
      userId: input.userId,
      requestType: input.requestType,
      status: this.config.requireReview ? 'pending_review' : 'in_progress',
      scope: input.scope,
      metadata: input.metadata,
      dryRunPerformed: false,
    });
    if (!request.success) return request;

    await this.auditLog.logSecurity({
      action: 'gdpr_erasure_initiated',
      description: `GDPR erasure initiated for user ${input.userId}`,
      userId: input.initiatedBy,
      success: true,
      metadata: { requestId: request.data?.id, workflowId: workflow.data.id, requestType: input.requestType },
    });

    if (this.config.requireReview) {
      await this.workflowRepo.updateStatus(workflow.data.id, 'pending_review');
    } else {
      await this.performDryRun(request.data!.id);
    }
    return request;
  }

  async reviewErasure(
    requestId: string,
    reviewerId: string,
    approved: boolean,
    notes?: string
  ): Promise<IQueryResult<void>> {
    const request = await this.erasureRepo.getById(requestId);
    if (!request.success || !request.data) return { success: false, error: 'Erasure request not found' };
    if (request.data.status !== 'pending_review') return { success: false, error: 'Request not pending review' };

    await this.erasureRepo.markReviewed(requestId, reviewerId);
    await this.auditLog.logSecurity({
      action: 'gdpr_erasure_reviewed',
      description: `GDPR erasure ${approved ? 'approved' : 'rejected'}`,
      userId: reviewerId,
      success: true,
      metadata: { requestId, approved, notes },
    });

    const workflowRes = await this.workflowRepo.query({ targetUserId: request.data.userId, page: 1, pageSize: 1 });
    const workflow = workflowRes.success && workflowRes.data?.workflows[0];

    if (approved) {
      await this.workflowRepo.markReviewed(workflow!.id, reviewerId, true, notes);
      if (this.requiresDualApproval('erase_user_data')) {
        await this.createDestructiveReview(workflow!.id, 'erase_user_data', reviewerId, request.data);
        await this.workflowRepo.updateStatus(workflow!.id, 'awaiting_confirmation');
      } else {
        await this.executeErasure(requestId, workflow!.id);
      }
    } else {
      await this.erasureRepo.cancel(requestId, notes ?? 'Rejected by reviewer');
      if (workflow) await this.workflowRepo.updateStatus(workflow.id, 'cancelled', notes);
    }
    return { success: true, data: undefined };
  }

  private async performDryRun(requestId: string): Promise<IQueryResult<void>> {
    const request = await this.erasureRepo.getById(requestId);
    if (!request.success || !request.data) return { success: false, error: 'Request not found' };

    try {
      // Discover user data without deleting
      const userData = await this.discoverUserData(request.data.userId);

      const dryRunResults = {
        conversationsToDelete: userData.conversations.length,
        messagesToDelete: userData.totalMessages,
        estimatedSize: userData.estimatedSize,
      };

      await this.erasureRepo.storeDryRunResults(requestId, dryRunResults);
      await this.erasureRepo.markExecuted(requestId);

      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to perform dry run';
      return { success: false, error: message };
    }
  }

  private async executeErasure(requestId: string, workflowId: string): Promise<IQueryResult<void>> {
    try {
      const request = await this.erasureRepo.getById(requestId);
      if (!request.success || !request.data) return { success: false, error: 'Request not found' };

      // Discover and delete user data
      const userData = await this.discoverUserData(request.data.userId);
      
      let conversationsDeleted = 0;
      let messagesDeleted = 0;

      for (const conversation of userData.conversations) {
        await this.conversationRepo.deleteConversation(conversation.id);
        conversationsDeleted++;
        messagesDeleted += userData.totalMessages;
      }

      const bytesFreed = userData.estimatedSize;
      const actualResults = { conversationsDeleted, messagesDeleted, bytesFreed };
      
      await this.erasureRepo.markCompleted(requestId, actualResults);
      await this.workflowRepo.markCompleted(workflowId);
      
      await this.auditLog.logSecurity({
        action: 'gdpr_erasure_executed',
        description: `GDPR erasure executed for user ${request.data.userId}`,
        userId: request.data.userId,
        success: true,
        metadata: { requestId, workflowId, actualResults },
      });
      
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute erasure';
      await this.workflowRepo.updateStatus(workflowId, 'failed', message);
      await this.auditLog.logSecurity({
        action: 'gdpr_erasure_failed',
        description: `GDPR erasure failed for user`,
        userId: '',
        success: false,
        metadata: { requestId, workflowId, error: message },
      });
      return { success: false, error: message };
    }
  }

  // ===== VDR Access Workflow =====
  async provisionVdrAccess(input: VdrAccessInput): Promise<IQueryResult<IVdrAccessGrant>> {
    const workflow = await this.createWorkflow('vdr_provision', 'create_vdr_access', input.grantedBy, input.userId);
    if (!workflow.success || !workflow.data) return { success: false, error: 'Failed to create workflow' };

    const grant = await this.vdrRepo.create({
      userId: input.userId,
      dealId: input.dealId,
      documentIds: input.documentIds,
      accessLevel: input.accessLevel,
      grantedBy: input.grantedBy,
      expiresAt: input.expiresAt,
      status: 'active',
      metadata: input.metadata,
    });

    await this.auditLog.logSuccess({
      action: 'vdr_access_granted',
      category: AuditActionCategory.SECURITY,
      userId: input.grantedBy,
      description: `VDR access granted to user ${input.userId}`,
      metadata: { grantId: grant.data?.id, workflowId: workflow.data.id, dealId: input.dealId },
    });

    await this.workflowRepo.markExecuted(workflow.data.id);
    await this.workflowRepo.markCompleted(workflow.data.id);
    return grant;
  }

  async revokeVdrAccess(grantId: string, revokedBy: string): Promise<IQueryResult<void>> {
    const result = await this.vdrRepo.revoke(grantId, revokedBy);
    if (result.success) {
      await this.auditLog.logSuccess({
        action: 'vdr_access_revoked',
        category: AuditActionCategory.SECURITY,
        userId: revokedBy,
        description: `VDR access ${grantId} revoked`,
        metadata: { grantId, revokedBy },
      });
    }
    return result;
  }

  async requestVdrAccess(input: VdrRequestInput): Promise<IQueryResult<IVdrAccessRequest>> {
    const request = await this.vdrRepo.createAccessRequest({
      userId: input.userId,
      requestedDocuments: input.requestedDocuments,
      requestedAccessLevel: input.requestedAccessLevel,
      purpose: input.purpose,
      status: 'pending_review',
    });

    await this.auditLog.logSuccess({
      action: 'vdr_access_requested',
      category: AuditActionCategory.SECURITY,
      userId: input.userId,
      description: 'VDR access requested',
      metadata: { requestId: request.data?.id },
    });
    return request;
  }

  // ===== Destructive Action Safety =====
  private requiresDualApproval(action: ComplianceActionType): boolean {
    if (this.config.dualApprovalThreshold === 'always') return true;
    if (this.config.dualApprovalThreshold === 'never') return false;
    return ['erase_user_data', 'enforce_retention_policy', 'archive_expired_data'].includes(action);
  }

  private async createDestructiveReview(
    workflowId: string,
    actionType: ComplianceActionType,
    requestedBy: string,
    dryRunResults?: unknown
  ): Promise<IQueryResult<IDestructiveActionReview>> {
    return this.reviewRepo.create({
      workflowId,
      actionType,
      requestedBy,
      requestedAt: Date.now(),
      requiresDualApproval: this.requiresDualApproval(actionType),
      approved: false,
      executed: false,
      dryRunResults: dryRunResults as Record<string, unknown>,
    });
  }

  async provideSecondaryApproval(reviewId: string, reviewerId: string): Promise<IQueryResult<void>> {
    const review = await this.reviewRepo.getById(reviewId);
    if (!review.success || !review.data) return { success: false, error: 'Review not found' };

    await this.reviewRepo.provideSecondaryApproval(reviewId, reviewerId);
    await this.auditLog.logSecurity({
      action: 'destructive_action_approved',
      description: 'Secondary approval granted for destructive action',
      userId: reviewerId,
      success: true,
      metadata: { reviewId, workflowId: review.data.workflowId },
    });

    const workflow = await this.workflowRepo.getById(review.data.workflowId);
    if (workflow.success && workflow.data?.actionType === 'erase_user_data') {
      const request = await this.erasureRepo.getByUser(workflow.data.targetUserId ?? '', 1);
      if (request.success && request.data?.[0]) {
        await this.executeErasure(request.data[0].id, workflow.data.id);
      }
    }
    await this.reviewRepo.markExecuted(reviewId);
    return { success: true, data: undefined };
  }

  // ===== Helper Methods =====
  private async createWorkflow(
    workflowType: ComplianceWorkflowType,
    actionType: ComplianceActionType,
    initiatedBy: string,
    targetUserId?: string
  ): Promise<IQueryResult<IComplianceWorkflow>> {
    return this.workflowRepo.create({
      workflowType,
      actionType,
      status: 'pending_review',
      initiatedBy,
      reviewRequired: this.config.requireReview,
      targetUserId,
    });
  }

  async getWorkflows(query: IComplianceWorkflowQuery): Promise<IQueryResult<IComplianceWorkflowPaginatedResult>> {
    return this.workflowRepo.query(query);
  }

  async getPendingReviews(): Promise<IQueryResult<IDestructiveActionReview[]>> {
    return this.reviewRepo.getPending();
  }

  // ===== Data Discovery Helper =====
  private async discoverUserData(userId: string): Promise<{
    conversations: TChatConversation[];
    totalMessages: number;
    estimatedSize: number;
  }> {
    // Note: TChatConversation doesn't have a userId field.
    // For now, we'll return all conversations as a placeholder.
    // This needs to be updated once user-conversation mapping is implemented.
    const conversations = await this.conversationRepo.listAllConversations();
    const userConversations = conversations; // TODO: Filter by userId once mapping is available
    
    let totalMessages = 0;
    let estimatedSize = 0;
    
    for (const conversation of userConversations) {
      const messagesResult = await this.conversationRepo.getMessages(conversation.id, 0, 10000);
      totalMessages += messagesResult.data.length;
      
      // Estimate size: conversation JSON + messages JSON
      estimatedSize += JSON.stringify(conversation).length;
      for (const message of messagesResult.data) {
        estimatedSize += JSON.stringify(message).length;
      }
    }
    
    return {
      conversations: userConversations,
      totalMessages,
      estimatedSize,
    };
  }

  // ===== Export File Generation Helper =====
  private async createExportFile(filePath: string, userData: {
    conversations: TChatConversation[];
    totalMessages: number;
    estimatedSize: number;
  }): Promise<void> {
    const exportData = {
      exportedAt: new Date().toISOString(),
      conversations: [] as Array<TChatConversation & { messages: unknown[] }>,
      summary: {
        totalConversations: userData.conversations.length,
        totalMessages: userData.totalMessages,
        estimatedSizeBytes: userData.estimatedSize,
      },
    };
    
    // Fetch all messages for each conversation
    for (const conversation of userData.conversations) {
      const messagesResult = await this.conversationRepo.getMessages(conversation.id, 0, 10000);
      exportData.conversations.push({
        ...conversation,
        messages: messagesResult.data,
      });
    }
    
    // Write the data directly
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, JSON.stringify(exportData, null, 2));
  }
}
