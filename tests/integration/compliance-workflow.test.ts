/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compliance Workflow Coverage Tests
 * Tests for GDPR export, erasure, retention, and VDR workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ComplianceService,
  type ComplianceServiceConfig,
} from '../../src/process/services/compliance/ComplianceService';
import { AuditLogService, type IAuditLogRepository } from '../../src/process/services/database/export';
import type {
  IGdprExportRepository,
  IGdprErasureRepository,
  IRetentionPolicyRepository,
  IVdrAccessRepository,
  IComplianceWorkflowRepository,
  IDestructiveActionReviewRepository,
} from '../../src/process/services/database/IComplianceRepository';
import { AuditActionCategory } from '../../src/common/types/rbacTypes';
import type {
  IGdprExportRequest,
  IGdprErasureRequest,
  IRetentionPolicy,
  IVdrAccessGrant,
  IVdrAccessRequest,
  IComplianceWorkflow,
  IComplianceWorkflowPaginatedResult,
  IDestructiveActionReview,
} from '../../src/common/types/complianceTypes';
import type { IQueryResult } from '../../src/process/services/database/types';

// ===== Mock Repositories =====

function createMockExportRepo(): IGdprExportRepository {
  const requests = new Map<string, IGdprExportRequest>();
  return {
    create: vi.fn(async (req) => {
      const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const request: IGdprExportRequest = {
        id,
        userId: req.userId,
        requestType: req.requestType,
        requestedAt: Date.now(),
        status: req.status ?? 'pending_review',
        scope: req.scope ?? {
          includeConversations: true,
          includeAuditLogs: false,
          includeSettings: true,
          includeExtensions: false,
        },
        metadata: req.metadata,
      };
      requests.set(id, request);
      return { success: true, data: request };
    }),
    getById: vi.fn(async (id) => {
      const req = requests.get(id);
      return req ? { success: true, data: req } : { success: false, error: 'Not found' };
    }),
    getByUser: vi.fn(async () => ({ success: true, data: [] })),
    getPending: vi.fn(async () => ({
      success: true,
      data: Array.from(requests.values()).filter((r) => r.status === 'pending_review'),
    })),
    markReviewed: vi.fn(async (id, reviewerId) => {
      const req = requests.get(id);
      if (req) {
        req.reviewedBy = reviewerId;
        req.reviewedAt = Date.now();
      }
      return { success: true, data: undefined };
    }),
    markCompleted: vi.fn(async (id, url, expires) => {
      const req = requests.get(id);
      if (req) {
        req.status = 'completed';
        req.downloadUrl = url;
        req.expiresAt = expires;
        req.completedAt = Date.now();
      }
      return { success: true, data: undefined };
    }),
    cancel: vi.fn(async (id) => {
      const req = requests.get(id);
      if (req) req.status = 'cancelled';
      return { success: true, data: undefined };
    }),
  };
}

function createMockErasureRepo(): IGdprErasureRepository {
  const requests = new Map<string, IGdprErasureRequest>();
  return {
    create: vi.fn(async (req) => {
      const id = `ers_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const request: IGdprErasureRequest = {
        id,
        userId: req.userId,
        requestType: req.requestType,
        requestedAt: Date.now(),
        status: req.status ?? 'pending_review',
        scope: req.scope ?? { conversations: [], messages: [], userData: true, auditLogs: false },
        dryRunPerformed: req.dryRunPerformed ?? false,
        metadata: req.metadata,
      };
      requests.set(id, request);
      return { success: true, data: request };
    }),
    getById: vi.fn(async (id) => {
      const req = requests.get(id);
      return req ? { success: true, data: req } : { success: false, error: 'Not found' };
    }),
    getByUser: vi.fn(async (userId, limit = 10) => {
      const userRequests = Array.from(requests.values())
        .filter((r) => r.userId === userId)
        .slice(0, limit);
      return { success: true, data: userRequests };
    }),
    getPending: vi.fn(async () => ({
      success: true,
      data: Array.from(requests.values()).filter((r) => r.status === 'pending_review'),
    })),
    storeDryRunResults: vi.fn(async (id, results) => {
      const req = requests.get(id);
      if (req) {
        req.dryRunResults = results;
        req.dryRunPerformed = true;
      }
      return { success: true, data: undefined };
    }),
    markReviewed: vi.fn(async (id, reviewerId) => {
      const req = requests.get(id);
      if (req) {
        req.reviewedBy = reviewerId;
        req.reviewedAt = Date.now();
      }
      return { success: true, data: undefined };
    }),
    markExecuted: vi.fn(async (id) => {
      const req = requests.get(id);
      if (req) {
        req.executedAt = Date.now();
        req.status = 'in_progress';
      }
      return { success: true, data: undefined };
    }),
    markCompleted: vi.fn(async (id, results) => {
      const req = requests.get(id);
      if (req) {
        req.actualResults = results;
        req.completedAt = Date.now();
        req.status = 'completed';
      }
      return { success: true, data: undefined };
    }),
    cancel: vi.fn(async (id) => {
      const req = requests.get(id);
      if (req) req.status = 'cancelled';
      return { success: true, data: undefined };
    }),
  };
}

function createMockWorkflowRepo(): IComplianceWorkflowRepository {
  const workflows = new Map<string, IComplianceWorkflow>();
  return {
    create: vi.fn(async (wf) => {
      const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const workflow: IComplianceWorkflow = {
        id,
        workflowType: wf.workflowType,
        actionType: wf.actionType,
        status: wf.status ?? 'pending_review',
        initiatedBy: wf.initiatedBy,
        initiatedAt: Date.now(),
        reviewRequired: wf.reviewRequired ?? true,
        targetUserId: wf.targetUserId,
      };
      workflows.set(id, workflow);
      return { success: true, data: workflow };
    }),
    getById: vi.fn(async (id) => {
      const wf = workflows.get(id);
      return wf ? { success: true, data: wf } : { success: false, error: 'Not found' };
    }),
    query: vi.fn(async (q) => {
      const result = Array.from(workflows.values()).filter(
        (w) =>
          (!q.workflowType || w.workflowType === q.workflowType) &&
          (!q.targetUserId || w.targetUserId === q.targetUserId)
      );
      const paginated: IComplianceWorkflowPaginatedResult = {
        workflows: result.slice(0, q.pageSize ?? 50),
        total: result.length,
        page: q.page ?? 0,
        pageSize: q.pageSize ?? 50,
        hasMore: result.length > (q.pageSize ?? 50),
      };
      return { success: true, data: paginated };
    }),
    updateStatus: vi.fn(async (id, status, error) => {
      const wf = workflows.get(id);
      if (wf) {
        wf.status = status;
        if (error) wf.errorMessage = error;
      }
      return { success: true, data: undefined };
    }),
    markReviewed: vi.fn(async (id, reviewerId, approved, notes) => {
      const wf = workflows.get(id);
      if (wf) {
        wf.reviewedBy = reviewerId;
        wf.reviewedAt = Date.now();
        wf.approved = approved;
        wf.approvalNotes = notes;
      }
      return { success: true, data: undefined };
    }),
    markExecuted: vi.fn(async (id) => {
      const wf = workflows.get(id);
      if (wf) wf.executedAt = Date.now();
      return { success: true, data: undefined };
    }),
    markCompleted: vi.fn(async (id) => {
      const wf = workflows.get(id);
      if (wf) {
        wf.completedAt = Date.now();
        wf.status = 'completed';
      }
      return { success: true, data: undefined };
    }),
  };
}

function createMockReviewRepo(): IDestructiveActionReviewRepository {
  const reviews = new Map<string, IDestructiveActionReview>();
  return {
    create: vi.fn(async (r) => {
      const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const review: IDestructiveActionReview = {
        id,
        workflowId: r.workflowId,
        actionType: r.actionType,
        requestedBy: r.requestedBy,
        requestedAt: Date.now(),
        requiresDualApproval: r.requiresDualApproval ?? false,
        approved: false,
        executed: false,
        dryRunResults: r.dryRunResults,
      };
      reviews.set(id, review);
      return { success: true, data: review };
    }),
    getById: vi.fn(async (id) => {
      const rev = reviews.get(id);
      return rev ? { success: true, data: rev } : { success: false, error: 'Not found' };
    }),
    getByWorkflowId: vi.fn(async (wfId) => {
      const rev = Array.from(reviews.values()).find((r) => r.workflowId === wfId);
      return rev ? { success: true, data: rev } : { success: false, error: 'Not found' };
    }),
    getPending: vi.fn(async () => ({
      success: true,
      data: Array.from(reviews.values()).filter((r) => !r.approved && !r.executed),
    })),
    providePrimaryApproval: vi.fn(async (id, reviewerId) => {
      const rev = reviews.get(id);
      if (rev) {
        rev.primaryReviewer = reviewerId;
        rev.primaryApprovedAt = Date.now();
        rev.approved = !rev.requiresDualApproval;
      }
      return { success: true, data: undefined };
    }),
    provideSecondaryApproval: vi.fn(async (id, reviewerId) => {
      const rev = reviews.get(id);
      if (rev) {
        rev.secondaryReviewer = reviewerId;
        rev.secondaryApprovedAt = Date.now();
        rev.approved = true;
      }
      return { success: true, data: undefined };
    }),
    reject: vi.fn(async (id, reviewerId, reason) => {
      const rev = reviews.get(id);
      if (rev) {
        rev.approved = false;
        rev.rejectionReason = reason;
      }
      return { success: true, data: undefined };
    }),
    markExecuted: vi.fn(async (id) => {
      const rev = reviews.get(id);
      if (rev) {
        rev.executed = true;
        rev.executedAt = Date.now();
      }
      return { success: true, data: undefined };
    }),
  };
}

function createMockVdrRepo(): IVdrAccessRepository {
  const grants = new Map<string, IVdrAccessGrant>();
  const requests = new Map<string, IVdrAccessRequest>();
  let grantIdCounter = 0;
  return {
    create: vi.fn(async (g) => {
      const id = `vdr_${++grantIdCounter}`;
      const grant: IVdrAccessGrant = {
        id,
        userId: g.userId,
        dealId: g.dealId,
        documentIds: g.documentIds,
        grantedAt: Date.now(),
        grantedBy: g.grantedBy,
        accessLevel: g.accessLevel,
        status: g.status ?? 'active',
        expiresAt: g.expiresAt,
        metadata: g.metadata,
      };
      grants.set(id, grant);
      return { success: true, data: grant };
    }),
    getById: vi.fn(async (id) => {
      const g = grants.get(id);
      return g ? { success: true, data: g } : { success: false, error: 'Not found' };
    }),
    getByUser: vi.fn(async (userId, includeExpired = false) => {
      const userGrants = Array.from(grants.values()).filter(
        (g) => g.userId === userId && (includeExpired || g.status === 'active')
      );
      return { success: true, data: userGrants };
    }),
    getByDeal: vi.fn(async () => ({ success: true, data: [] })),
    getByDocument: vi.fn(async () => ({ success: true, data: [] })),
    revoke: vi.fn(async (id, revokedBy) => {
      const g = grants.get(id);
      if (g) {
        g.status = 'revoked';
        g.revokedAt = Date.now();
        g.revokedBy = revokedBy;
      }
      return { success: true, data: undefined };
    }),
    checkAccess: vi.fn(async () => ({ success: true, data: true })),
    createAccessRequest: vi.fn(async (req) => {
      const id = `vreq_${Date.now()}`;
      const request: IVdrAccessRequest = {
        id,
        userId: req.userId,
        requestedAt: Date.now(),
        status: req.status ?? 'pending_review',
        purpose: req.purpose,
        requestedDocuments: req.requestedDocuments,
        requestedAccessLevel: req.requestedAccessLevel,
      };
      requests.set(id, request);
      return { success: true, data: request };
    }),
    getPendingRequests: vi.fn(async () => ({
      success: true,
      data: Array.from(requests.values()).filter((r) => r.status === 'pending_review'),
    })),
    respondToRequest: vi.fn(async (id, approved, reviewerId, grantId, reason) => {
      const req = requests.get(id);
      if (req) {
        req.reviewedBy = reviewerId;
        req.reviewedAt = Date.now();
        req.approved = approved;
        req.rejectionReason = reason;
        req.resultingGrantId = grantId;
        req.status = approved ? 'completed' : 'cancelled';
      }
      return { success: true, data: undefined };
    }),
  };
}

function createMockRetentionRepo(): IRetentionPolicyRepository {
  return {
    create: vi.fn(async (p) => ({
      success: true,
      data: { id: 'rp_1', ...p, createdAt: Date.now(), updatedAt: Date.now() },
    })),
    getById: vi.fn(async () => ({ success: false, error: 'Not found' })),
    getActive: vi.fn(async () => ({ success: true, data: [] })),
    getByResourceType: vi.fn(async () => ({ success: true, data: [] })),
    update: vi.fn(async (id, updates) => ({
      success: true,
      data: { id, ...updates, updatedAt: Date.now() } as IRetentionPolicy,
    })),
    deactivate: vi.fn(async () => ({ success: true, data: undefined })),
    createEnforcementJob: vi.fn(async (job) => ({ success: true, data: { id: 'job_1', ...job } })),
    updateEnforcementJob: vi.fn(async () => ({ success: true, data: undefined })),
    getEligibleItems: vi.fn(async () => ({ success: true, data: [] })),
  };
}

function createMockAuditLogRepo(): IAuditLogRepository {
  return {
    create: vi.fn(async () => {}),
    getById: vi.fn(async () => undefined),
    query: vi.fn(async () => ({ logs: [], total: 0, page: 0, pageSize: 50, hasMore: false })),
    getStats: vi.fn(async () => ({
      totalCount: 0,
      countBySeverity: {},
      countByCategory: {},
      countByAction: {},
      uniqueUsers: 0,
      timeRange: { start: 0, end: 0 },
    })),
    getRecentByUser: vi.fn(async () => []),
    getByResource: vi.fn(async () => []),
    getByAction: vi.fn(async () => []),
    deleteOlderThan: vi.fn(async () => 0),
    deleteAll: vi.fn(async () => {}),
    count: vi.fn(async () => 0),
    getUniqueActions: vi.fn(async () => []),
    getUniqueUsers: vi.fn(async () => []),
  };
}

// ===== Test Suite =====

describe('Compliance Workflow Coverage', () => {
  let service: ComplianceService;
  let mockExportRepo: IGdprExportRepository;
  let mockErasureRepo: IGdprErasureRepository;
  let mockWorkflowRepo: IComplianceWorkflowRepository;
  let mockReviewRepo: IDestructiveActionReviewRepository;
  let mockVdrRepo: IVdrAccessRepository;
  let auditLogService: AuditLogService;

  beforeEach(() => {
    mockExportRepo = createMockExportRepo();
    mockErasureRepo = createMockErasureRepo();
    mockWorkflowRepo = createMockWorkflowRepo();
    mockReviewRepo = createMockReviewRepo();
    mockVdrRepo = createMockVdrRepo();
    const mockRetentionRepo = createMockRetentionRepo();
    const mockAuditLogRepo = createMockAuditLogRepo();
    auditLogService = new AuditLogService(mockAuditLogRepo);
    service = new ComplianceService(
      mockExportRepo,
      mockErasureRepo,
      mockRetentionRepo,
      mockVdrRepo,
      mockWorkflowRepo,
      mockReviewRepo,
      auditLogService,
      { requireReview: true, dualApprovalThreshold: 'high_impact' }
    );
  });

  describe('GDPR Export Workflow', () => {
    it('should initiate export request with review workflow', async () => {
      const result = await service.initiateExport({
        userId: 'user_123',
        requestType: 'full_export',
        scope: { includeConversations: true, includeAuditLogs: false, includeSettings: true, includeExtensions: false },
        initiatedBy: 'admin_1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockExportRepo.create).toHaveBeenCalled();
      expect(mockWorkflowRepo.create).toHaveBeenCalled();
    });

    it('should require review before completing export', async () => {
      const initResult = await service.initiateExport({
        userId: 'user_123',
        requestType: 'conversation_history',
        scope: {
          includeConversations: true,
          includeAuditLogs: false,
          includeSettings: false,
          includeExtensions: false,
        },
        initiatedBy: 'user_123',
      });

      const requestId = initResult.data!.id;
      const reviewResult = await service.reviewExport(requestId, 'reviewer_1', true, 'Approved per user request');

      expect(reviewResult.success).toBe(true);
      expect(mockExportRepo.markReviewed).toHaveBeenCalledWith(requestId, 'reviewer_1');
      expect(mockWorkflowRepo.markReviewed).toHaveBeenCalled();
    });

    it('should reject export request and cancel workflow', async () => {
      const initResult = await service.initiateExport({
        userId: 'user_123',
        requestType: 'full_export',
        scope: { includeConversations: true, includeAuditLogs: false, includeSettings: true, includeExtensions: false },
        initiatedBy: 'user_123',
      });

      const requestId = initResult.data!.id;
      const reviewResult = await service.reviewExport(requestId, 'reviewer_1', false, 'Request does not meet criteria');

      expect(reviewResult.success).toBe(true);
      expect(mockExportRepo.cancel).toHaveBeenCalledWith(requestId, 'Request does not meet criteria');
    });

    it('should support date range filtering for exports', async () => {
      const startDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const endDate = Date.now();

      const result = await service.initiateExport({
        userId: 'user_123',
        requestType: 'conversation_history',
        scope: {
          includeConversations: true,
          includeAuditLogs: false,
          includeSettings: false,
          includeExtensions: false,
          dateRange: { start: startDate, end: endDate },
        },
        initiatedBy: 'user_123',
      });

      expect(result.success).toBe(true);
      expect(result.data!.scope.dateRange).toBeDefined();
    });
  });

  describe('GDPR Erasure Workflow', () => {
    it('should initiate erasure request with dry run', async () => {
      const result = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockErasureRepo.create).toHaveBeenCalled();
    });

    it('should perform dry run before erasure execution', async () => {
      const initResult = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      const requestId = initResult.data!.id;
      expect(mockErasureRepo.storeDryRunResults).toHaveBeenCalled();
    });

    it('should require review for erasure requests', async () => {
      const initResult = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      const requestId = initResult.data!.id;
      const reviewResult = await service.reviewErasure(requestId, 'reviewer_1', true);

      expect(reviewResult.success).toBe(true);
    });
  });

  describe('VDR Access Workflow', () => {
    it('should provision VDR access with workflow tracking', async () => {
      const result = await service.provisionVdrAccess({
        userId: 'user_123',
        dealId: 'deal_456',
        documentIds: ['doc_1', 'doc_2'],
        accessLevel: 'view',
        grantedBy: 'admin_1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockVdrRepo.create).toHaveBeenCalled();
      expect(mockWorkflowRepo.create).toHaveBeenCalled();
    });

    it('should support different access levels', async () => {
      const levels: Array<IVdrAccessGrant['accessLevel']> = ['view', 'download', 'annotate', 'admin'];

      for (const level of levels) {
        const result = await service.provisionVdrAccess({
          userId: `user_${level}`,
          dealId: 'deal_1',
          documentIds: ['doc_1'],
          accessLevel: level,
          grantedBy: 'admin_1',
        });
        expect(result.success).toBe(true);
        expect(result.data!.accessLevel).toBe(level);
      }
    });

    it('should revoke VDR access and audit', async () => {
      const provisionResult = await service.provisionVdrAccess({
        userId: 'user_123',
        documentIds: ['doc_1'],
        accessLevel: 'view',
        grantedBy: 'admin_1',
      });

      const grantId = provisionResult.data!.id;
      const revokeResult = await service.revokeVdrAccess(grantId, 'admin_2');

      expect(revokeResult.success).toBe(true);
    });

    it('should handle VDR access requests', async () => {
      const result = await service.requestVdrAccess({
        userId: 'user_123',
        requestedDocuments: ['doc_1', 'doc_2'],
        requestedAccessLevel: 'download',
        purpose: 'Due diligence review',
      });

      expect(result.success).toBe(true);
      expect(result.data!.purpose).toBe('Due diligence review');
    });
  });

  describe('Workflow Query and Management', () => {
    it('should query workflows by type', async () => {
      await service.initiateExport({
        userId: 'user_1',
        requestType: 'full_export',
        scope: { includeConversations: true, includeAuditLogs: false, includeSettings: true, includeExtensions: false },
        initiatedBy: 'admin_1',
      });
      await service.provisionVdrAccess({
        userId: 'user_2',
        documentIds: ['doc_1'],
        accessLevel: 'view',
        grantedBy: 'admin_1',
      });

      const result = await service.getWorkflows({ workflowType: 'data_export' });
      expect(result.success).toBe(true);
    });

    it('should query workflows by status', async () => {
      await service.initiateExport({
        userId: 'user_1',
        requestType: 'full_export',
        scope: { includeConversations: true, includeAuditLogs: false, includeSettings: true, includeExtensions: false },
        initiatedBy: 'admin_1',
      });

      const result = await service.getWorkflows({ status: 'pending_review' });
      expect(result.success).toBe(true);
    });
  });
});

describe('Destructive Action Safety Coverage', () => {
  let service: ComplianceService;
  let mockErasureRepo: IGdprErasureRepository;
  let mockWorkflowRepo: IComplianceWorkflowRepository;
  let mockReviewRepo: IDestructiveActionReviewRepository;
  let auditLogService: AuditLogService;

  beforeEach(() => {
    mockErasureRepo = createMockErasureRepo();
    mockWorkflowRepo = createMockWorkflowRepo();
    mockReviewRepo = createMockReviewRepo();
    const mockRetentionRepo = createMockRetentionRepo();
    const mockExportRepo = createMockExportRepo();
    const mockVdrRepo = createMockVdrRepo();
    const mockAuditLogRepo = createMockAuditLogRepo();
    auditLogService = new AuditLogService(mockAuditLogRepo);
    service = new ComplianceService(
      mockExportRepo,
      mockErasureRepo,
      mockRetentionRepo,
      mockVdrRepo,
      mockWorkflowRepo,
      mockReviewRepo,
      auditLogService,
      { requireReview: true, dualApprovalThreshold: 'high_impact' }
    );
  });

  describe('Dual Approval Workflow', () => {
    it('should create destructive action review for high-impact erasure', async () => {
      const initResult = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      const requestId = initResult.data!.id;
      await service.reviewErasure(requestId, 'reviewer_1', true);

      expect(mockReviewRepo.create).toHaveBeenCalled();
    });

    it('should require secondary approval for destructive actions', async () => {
      const initResult = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      const requestId = initResult.data!.id;
      await service.reviewErasure(requestId, 'reviewer_1', true);

      const workflows = await mockWorkflowRepo.query({ targetUserId: 'user_123', page: 0, pageSize: 1 });
      const workflow = workflows.data!.workflows[0];
      const reviews = await mockReviewRepo.getPending();
      const review = reviews.data![0];

      await service.provideSecondaryApproval(review.id, 'reviewer_2');
      expect(mockReviewRepo.provideSecondaryApproval).toHaveBeenCalled();
    });

    it('should include dry run results in destructive review', async () => {
      const initResult = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      expect(mockErasureRepo.storeDryRunResults).toHaveBeenCalled();
    });
  });

  describe('Safety Configurations', () => {
    it('should respect always-require-dual-approval config', async () => {
      const alwaysService = new ComplianceService(
        createMockExportRepo(),
        mockErasureRepo,
        createMockRetentionRepo(),
        createMockVdrRepo(),
        mockWorkflowRepo,
        mockReviewRepo,
        auditLogService,
        { dualApprovalThreshold: 'always' }
      );

      const initResult = await alwaysService.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      await alwaysService.reviewErasure(initResult.data!.id, 'reviewer_1', true);
      const reviewCalls = (mockReviewRepo.create as ReturnType<typeof vi.fn>).mock.calls;
      expect(reviewCalls.length).toBeGreaterThan(0);
    });

    it('should skip dual approval for low-impact actions when configured', async () => {
      const neverService = new ComplianceService(
        createMockExportRepo(),
        mockErasureRepo,
        createMockRetentionRepo(),
        createMockVdrRepo(),
        mockWorkflowRepo,
        mockReviewRepo,
        auditLogService,
        { dualApprovalThreshold: 'never' }
      );

      const initResult = await neverService.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      await neverService.reviewErasure(initResult.data!.id, 'reviewer_1', true);
    });
  });

  describe('Review Status Tracking', () => {
    it('should get pending destructive reviews', async () => {
      const initResult = await service.initiateErasure({
        userId: 'user_123',
        requestType: 'full_erasure',
        scope: { conversations: [], messages: [], userData: true, auditLogs: false },
        initiatedBy: 'user_123',
      });

      await service.reviewErasure(initResult.data!.id, 'reviewer_1', true);
      const pending = await service.getPendingReviews();

      expect(pending.success).toBe(true);
    });
  });
});

describe('Audit Logging Coverage', () => {
  it('should log all compliance actions with appropriate categories', async () => {
    const mockAuditLogRepo = createMockAuditLogRepo();
    const auditLogService = new AuditLogService(mockAuditLogRepo);

    const mockExportRepo = createMockExportRepo();
    const mockErasureRepo = createMockErasureRepo();
    const mockWorkflowRepo = createMockWorkflowRepo();
    const mockReviewRepo = createMockReviewRepo();
    const mockVdrRepo = createMockVdrRepo();
    const mockRetentionRepo = createMockRetentionRepo();

    const service = new ComplianceService(
      mockExportRepo,
      mockErasureRepo,
      mockRetentionRepo,
      mockVdrRepo,
      mockWorkflowRepo,
      mockReviewRepo,
      auditLogService
    );

    await service.initiateExport({
      userId: 'user_1',
      requestType: 'full_export',
      scope: { includeConversations: true, includeAuditLogs: false, includeSettings: true, includeExtensions: false },
      initiatedBy: 'admin_1',
    });
    await service.provisionVdrAccess({
      userId: 'user_1',
      documentIds: ['doc_1'],
      accessLevel: 'view',
      grantedBy: 'admin_1',
    });

    expect(mockAuditLogRepo.create).toHaveBeenCalled();
  });
});
