/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogService } from '@process/services/database/auditLogService';
import type { IAuditLogRepository } from '@process/services/database';
import { AuditSeverity, AuditActionCategory, ResourceType } from '@/common/types/rbacTypes';
import type { IAuditLog, IAuditLogPaginatedResult } from '@/common/types/rbacTypes';

// Mock repository
const createMockAuditLogRepository = (): IAuditLogRepository => ({
  create: vi.fn(),
  getById: vi.fn(),
  query: vi.fn(),
  getStats: vi.fn(),
  getRecentByUser: vi.fn(),
  getByResource: vi.fn(),
  getByAction: vi.fn(),
  deleteOlderThan: vi.fn(),
  deleteAll: vi.fn(),
  count: vi.fn(),
  getUniqueActions: vi.fn(),
  getUniqueUsers: vi.fn(),
});

describe('AuditLogService - Viewer Coverage', () => {
  let auditService: AuditLogService;
  let mockRepository: ReturnType<typeof createMockAuditLogRepository>;

  const createMockLog = (overrides: Partial<IAuditLog> = {}): IAuditLog => ({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    action: 'test.action',
    category: AuditActionCategory.DATA,
    severity: AuditSeverity.INFO,
    description: 'Test log entry',
    success: true,
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = createMockAuditLogRepository();
    auditService = new AuditLogService(mockRepository);
  });

  describe('Get by ID', () => {
    it('should retrieve log by ID', async () => {
      const mockLog = createMockLog({ id: 'audit_123', action: 'user.login' });
      mockRepository.getById.mockResolvedValue(mockLog);

      const result = await auditService.getById('audit_123');

      expect(mockRepository.getById).toHaveBeenCalledWith('audit_123');
      expect(result?.id).toBe('audit_123');
      expect(result?.action).toBe('user.login');
    });

    it('should return undefined for non-existent log', async () => {
      mockRepository.getById.mockResolvedValue(undefined);

      const result = await auditService.getById('audit_nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('Query with Filters', () => {
    it('should query with pagination defaults', async () => {
      const mockResult: IAuditLogPaginatedResult = {
        logs: [createMockLog(), createMockLog()],
        total: 100,
        page: 0,
        pageSize: 50,
        hasMore: true,
      };
      mockRepository.query.mockResolvedValue(mockResult);

      const result = await auditService.query({});

      expect(mockRepository.query).toHaveBeenCalledWith({});
      expect(result.logs).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should query with custom pagination', async () => {
      const mockResult: IAuditLogPaginatedResult = {
        logs: [createMockLog()],
        total: 25,
        page: 2,
        pageSize: 10,
        hasMore: false,
      };
      mockRepository.query.mockResolvedValue(mockResult);

      const result = await auditService.query({ page: 2, pageSize: 10 });

      expect(mockRepository.query).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
      });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should query with time range filter', async () => {
      const startTime = Date.now() - 86400000;
      const endTime = Date.now();

      await auditService.query({
        startTime,
        endTime,
      });

      expect(mockRepository.query).toHaveBeenCalledWith({
        startTime,
        endTime,
      });
    });

    it('should query with user filter', async () => {
      await auditService.query({ userId: 'user_123' });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
        })
      );
    });

    it('should query with action filter', async () => {
      await auditService.query({ action: 'auth.login' });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth.login',
        })
      );
    });

    it('should query with category filter', async () => {
      await auditService.query({ category: AuditActionCategory.SECURITY });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditActionCategory.SECURITY,
        })
      );
    });

    it('should query with severity filter', async () => {
      await auditService.query({ severity: AuditSeverity.ERROR });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: AuditSeverity.ERROR,
        })
      );
    });

    it('should query with resource filters', async () => {
      await auditService.query({
        resourceType: ResourceType.CONVERSATION,
        resourceId: 'conv_123',
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: ResourceType.CONVERSATION,
          resourceId: 'conv_123',
        })
      );
    });

    it('should query with success filter', async () => {
      await auditService.query({ success: false });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should query with ordering options', async () => {
      await auditService.query({
        orderBy: 'severity',
        orderDirection: 'ASC',
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'severity',
          orderDirection: 'ASC',
        })
      );
    });

    it('should query with combined filters', async () => {
      const queryParams = {
        userId: 'user_1',
        action: 'conversation.create',
        category: AuditActionCategory.DATA,
        severity: AuditSeverity.INFO,
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        success: true,
        page: 1,
        pageSize: 25,
      };

      await auditService.query(queryParams);

      expect(mockRepository.query).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('Get Recent by User', () => {
    it('should retrieve recent logs for user with default limit', async () => {
      const mockLogs = [createMockLog({ userId: 'user_1' }), createMockLog({ userId: 'user_1' })];
      mockRepository.getRecentByUser.mockResolvedValue(mockLogs);

      const result = await auditService.getRecentByUser('user_1');

      expect(mockRepository.getRecentByUser).toHaveBeenCalledWith('user_1', 50);
      expect(result).toHaveLength(2);
    });

    it('should retrieve recent logs with custom limit', async () => {
      const mockLogs = [createMockLog({ userId: 'user_1' })];
      mockRepository.getRecentByUser.mockResolvedValue(mockLogs);

      await auditService.getRecentByUser('user_1', 10);

      expect(mockRepository.getRecentByUser).toHaveBeenCalledWith('user_1', 10);
    });
  });

  describe('Get by Resource', () => {
    it('should retrieve logs for specific resource with default limit', async () => {
      const mockLogs = [
        createMockLog({
          resourceType: ResourceType.CONVERSATION,
          resourceId: 'conv_123',
        }),
      ];
      mockRepository.getByResource.mockResolvedValue(mockLogs);

      const result = await auditService.getByResource(ResourceType.CONVERSATION, 'conv_123');

      expect(mockRepository.getByResource).toHaveBeenCalledWith(ResourceType.CONVERSATION, 'conv_123', 50);
      expect(result[0].resourceId).toBe('conv_123');
    });

    it('should retrieve logs for resource with custom limit', async () => {
      mockRepository.getByResource.mockResolvedValue([]);

      await auditService.getByResource(ResourceType.TEAM, 'team_456', 25);

      expect(mockRepository.getByResource).toHaveBeenCalledWith(ResourceType.TEAM, 'team_456', 25);
    });
  });

  describe('Get by Action', () => {
    it('should retrieve logs for specific action with default limit', async () => {
      const mockLogs = [createMockLog({ action: 'auth.login' }), createMockLog({ action: 'auth.login' })];
      mockRepository.getByAction.mockResolvedValue(mockLogs);

      const result = await auditService.getByAction('auth.login');

      expect(mockRepository.getByAction).toHaveBeenCalledWith('auth.login', 50);
      expect(result).toHaveLength(2);
    });

    it('should retrieve logs for action with custom limit', async () => {
      mockRepository.getByAction.mockResolvedValue([]);

      await auditService.getByAction('user.update', 100);

      expect(mockRepository.getByAction).toHaveBeenCalledWith('user.update', 100);
    });
  });

  describe('Audit Log Structure', () => {
    it('should return logs with all required fields', async () => {
      const mockLog: IAuditLog = {
        id: 'audit_test',
        timestamp: Date.now(),
        userId: 'user_1',
        username: 'testuser',
        action: 'conversation.create',
        category: AuditActionCategory.DATA,
        severity: AuditSeverity.INFO,
        resourceType: ResourceType.CONVERSATION,
        resourceId: 'conv_123',
        description: 'Created conversation',
        metadata: { title: 'New Conversation' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
      };

      mockRepository.getById.mockResolvedValue(mockLog);

      const result = await auditService.getById('audit_test');

      expect(result).toBeDefined();
      expect(result?.id).toBe('audit_test');
      expect(result?.userId).toBe('user_1');
      expect(result?.username).toBe('testuser');
      expect(result?.action).toBe('conversation.create');
      expect(result?.category).toBe(AuditActionCategory.DATA);
      expect(result?.severity).toBe(AuditSeverity.INFO);
      expect(result?.resourceType).toBe(ResourceType.CONVERSATION);
      expect(result?.resourceId).toBe('conv_123');
      expect(result?.description).toBe('Created conversation');
      expect(result?.metadata).toEqual({ title: 'New Conversation' });
      expect(result?.ipAddress).toBe('192.168.1.1');
      expect(result?.userAgent).toBe('Mozilla/5.0');
      expect(result?.success).toBe(true);
    });

    it('should handle logs without optional fields', async () => {
      const mockLog: IAuditLog = {
        id: 'audit_minimal',
        timestamp: Date.now(),
        action: 'system.ping',
        category: AuditActionCategory.SYSTEM,
        severity: AuditSeverity.INFO,
        description: 'System ping',
        success: true,
      };

      mockRepository.getById.mockResolvedValue(mockLog);

      const result = await auditService.getById('audit_minimal');

      expect(result).toBeDefined();
      expect(result?.userId).toBeUndefined();
      expect(result?.resourceType).toBeUndefined();
      expect(result?.metadata).toBeUndefined();
    });
  });

  describe('Pagination', () => {
    it('should indicate hasMore when more results exist', async () => {
      const mockResult: IAuditLogPaginatedResult = {
        logs: Array.from({ length: 50 }, () => createMockLog()),
        total: 150,
        page: 0,
        pageSize: 50,
        hasMore: true,
      };
      mockRepository.query.mockResolvedValue(mockResult);

      const result = await auditService.query({ page: 0, pageSize: 50 });

      expect(result.hasMore).toBe(true);
      expect(result.logs).toHaveLength(50);
      expect(result.total).toBe(150);
    });

    it('should indicate no more results on last page', async () => {
      const mockResult: IAuditLogPaginatedResult = {
        logs: Array.from({ length: 20 }, () => createMockLog()),
        total: 120,
        page: 2,
        pageSize: 50,
        hasMore: false,
      };
      mockRepository.query.mockResolvedValue(mockResult);

      const result = await auditService.query({ page: 2, pageSize: 50 });

      expect(result.hasMore).toBe(false);
      expect(result.logs).toHaveLength(20);
    });
  });

  describe('Filter Combinations', () => {
    it('should support filtering by user and time range', async () => {
      const startTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const endTime = Date.now();

      await auditService.query({
        userId: 'user_admin',
        startTime,
        endTime,
        page: 0,
        pageSize: 100,
      });

      expect(mockRepository.query).toHaveBeenCalledWith({
        userId: 'user_admin',
        startTime,
        endTime,
        page: 0,
        pageSize: 100,
      });
    });

    it('should support filtering by resource and action', async () => {
      await auditService.query({
        resourceType: ResourceType.USER,
        resourceId: 'user_123',
        action: 'user.update',
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: ResourceType.USER,
          resourceId: 'user_123',
          action: 'user.update',
        })
      );
    });

    it('should support filtering by severity and success', async () => {
      await auditService.query({
        severity: AuditSeverity.ERROR,
        success: false,
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: AuditSeverity.ERROR,
          success: false,
        })
      );
    });
  });
});
