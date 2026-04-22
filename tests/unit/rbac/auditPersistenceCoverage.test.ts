/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogService } from '@process/services/database/auditLogService';
import type { IAuditLogRepository } from '@process/services/database';
import { AuditSeverity, AuditActionCategory, ResourceType } from '@/common/types/rbacTypes';
import type { IAuditLog } from '@/common/types/rbacTypes';

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

describe('AuditLogService - Persistence Coverage', () => {
  let auditService: AuditLogService;
  let mockRepository: ReturnType<typeof createMockAuditLogRepository>;

  beforeEach(() => {
    mockRepository = createMockAuditLogRepository();
    auditService = new AuditLogService(mockRepository);
  });

  describe('Log Creation', () => {
    it('should create audit log with auto-generated id and timestamp', async () => {
      const beforeCreate = Date.now();

      await auditService.log({
        action: 'user.login',
        category: AuditActionCategory.AUTH,
        severity: AuditSeverity.INFO,
        description: 'User logged in',
        success: true,
      });

      const afterCreate = Date.now();

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.id).toMatch(/^audit_\d+_[a-z0-9]+$/);
      expect(createdLog.timestamp).toBeGreaterThanOrEqual(beforeCreate);
      expect(createdLog.timestamp).toBeLessThanOrEqual(afterCreate);
      expect(createdLog.action).toBe('user.login');
      expect(createdLog.category).toBe(AuditActionCategory.AUTH);
      expect(createdLog.severity).toBe(AuditSeverity.INFO);
    });

    it('should create log with all fields populated', async () => {
      const metadata = { userAgent: 'test', ipAddress: '127.0.0.1' };

      await auditService.log({
        userId: 'user_1',
        username: 'testuser',
        action: 'conversation.create',
        category: AuditActionCategory.DATA,
        severity: AuditSeverity.INFO,
        resourceType: ResourceType.CONVERSATION,
        resourceId: 'conv_123',
        description: 'Created new conversation',
        metadata,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.userId).toBe('user_1');
      expect(createdLog.username).toBe('testuser');
      expect(createdLog.resourceType).toBe(ResourceType.CONVERSATION);
      expect(createdLog.resourceId).toBe('conv_123');
      expect(createdLog.ipAddress).toBe('192.168.1.1');
      expect(createdLog.userAgent).toBe('Mozilla/5.0');
      expect(createdLog.metadata).toEqual(metadata);
    });
  });

  describe('Log Success Helper', () => {
    it('should create success log with INFO severity', async () => {
      await auditService.logSuccess({
        userId: 'user_1',
        action: 'conversation.read',
        category: AuditActionCategory.DATA,
        description: 'Read conversation list',
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.success).toBe(true);
      expect(createdLog.severity).toBe(AuditSeverity.INFO);
    });

    it('should include all optional fields in success log', async () => {
      await auditService.logSuccess({
        userId: 'user_1',
        username: 'testuser',
        action: 'message.send',
        category: AuditActionCategory.DATA,
        resourceType: ResourceType.MESSAGE,
        resourceId: 'msg_123',
        description: 'Sent message',
        metadata: { channelId: 'ch_1' },
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.username).toBe('testuser');
      expect(createdLog.resourceType).toBe(ResourceType.MESSAGE);
      expect(createdLog.resourceId).toBe('msg_123');
      expect(createdLog.metadata).toEqual({ channelId: 'ch_1' });
    });
  });

  describe('Log Failure Helper', () => {
    it('should create failure log with WARNING severity by default', async () => {
      await auditService.logFailure({
        userId: 'user_1',
        action: 'auth.login',
        category: AuditActionCategory.AUTH,
        description: 'Failed login attempt',
        errorMessage: 'Invalid password',
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.success).toBe(false);
      expect(createdLog.severity).toBe(AuditSeverity.WARNING);
      expect(createdLog.errorMessage).toBe('Invalid password');
    });

    it('should allow custom severity for failures', async () => {
      await auditService.logFailure({
        userId: 'user_1',
        action: 'system.config',
        category: AuditActionCategory.CONFIG,
        description: 'Failed to update critical config',
        errorMessage: 'Permission denied',
        severity: AuditSeverity.ERROR,
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.severity).toBe(AuditSeverity.ERROR);
    });
  });

  describe('Log Security Helper', () => {
    it('should create security log with CRITICAL severity', async () => {
      await auditService.logSecurity({
        userId: 'user_1',
        username: 'attacker',
        action: 'auth.bruteforce',
        description: 'Multiple failed login attempts detected',
        success: false,
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.category).toBe(AuditActionCategory.SECURITY);
      expect(createdLog.severity).toBe(AuditSeverity.CRITICAL);
    });

    it('should include optional fields for security logs', async () => {
      await auditService.logSecurity({
        userId: 'user_1',
        action: 'auth.suspicious',
        description: 'Suspicious activity detected',
        resourceType: ResourceType.USER,
        resourceId: 'user_1',
        metadata: { attempts: 5 },
        ipAddress: '192.168.0.1',
        success: true,
      });

      const createdLog = mockRepository.create.mock.calls[0][0] as IAuditLog;

      expect(createdLog.metadata).toEqual({ attempts: 5 });
      expect(createdLog.ipAddress).toBe('192.168.0.1');
    });
  });

  describe('Data Retention', () => {
    it('should delete logs older than specified days', async () => {
      mockRepository.deleteOlderThan.mockResolvedValue(100);

      const deletedCount = await auditService.deleteOlderThan(30);

      expect(mockRepository.deleteOlderThan).toHaveBeenCalledTimes(1);
      // Verify the cutoff timestamp is approximately 30 days ago
      const cutoffArg = mockRepository.deleteOlderThan.mock.calls[0][0] as number;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(cutoffArg).toBeGreaterThan(thirtyDaysAgo - 1000); // Allow 1 second margin
      expect(cutoffArg).toBeLessThan(thirtyDaysAgo + 1000);
      expect(deletedCount).toBe(100);
    });

    it('should delete all logs when requested', async () => {
      await auditService.deleteAll();

      expect(mockRepository.deleteAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics', () => {
    it('should retrieve stats for time range', async () => {
      const startTime = Date.now() - 24 * 60 * 60 * 1000;
      const endTime = Date.now();
      const mockStats = {
        totalCount: 100,
        countBySeverity: { info: 80, warning: 15, error: 5, critical: 0 },
        countByCategory: { auth: 30, data: 50, config: 10, system: 5, security: 5, user: 0 },
        countByAction: { login: 20, logout: 10, read: 50, update: 20 },
        uniqueUsers: 5,
        timeRange: { start: startTime, end: endTime },
      };

      mockRepository.getStats.mockResolvedValue(mockStats);

      const stats = await auditService.getStats(startTime, endTime);

      expect(mockRepository.getStats).toHaveBeenCalledWith(startTime, endTime);
      expect(stats.totalCount).toBe(100);
      expect(stats.uniqueUsers).toBe(5);
    });

    it('should retrieve today stats', async () => {
      mockRepository.getStats.mockResolvedValue({
        totalCount: 10,
        countBySeverity: { info: 10, warning: 0, error: 0, critical: 0 },
        countByCategory: { auth: 10, data: 0, config: 0, system: 0, security: 0, user: 0 },
        countByAction: { login: 10 },
        uniqueUsers: 2,
        timeRange: { start: Date.now() - 3600000, end: Date.now() },
      });

      const stats = await auditService.getTodayStats();

      expect(mockRepository.getStats).toHaveBeenCalledTimes(1);
      expect(stats.totalCount).toBe(10);
    });
  });

  describe('Count Operations', () => {
    it('should count logs matching criteria', async () => {
      mockRepository.count.mockResolvedValue(42);

      const count = await auditService.count({
        userId: 'user_1',
        category: AuditActionCategory.AUTH,
        success: true,
      });

      expect(mockRepository.count).toHaveBeenCalledWith({
        userId: 'user_1',
        category: AuditActionCategory.AUTH,
        success: true,
      });
      expect(count).toBe(42);
    });
  });

  describe('Unique Value Retrieval', () => {
    it('should retrieve unique actions', async () => {
      mockRepository.getUniqueActions.mockResolvedValue(['auth.login', 'auth.logout', 'conversation.create']);

      const actions = await auditService.getUniqueActions();

      expect(mockRepository.getUniqueActions).toHaveBeenCalledTimes(1);
      expect(actions).toContain('auth.login');
      expect(actions).toContain('conversation.create');
    });

    it('should retrieve unique users', async () => {
      mockRepository.getUniqueUsers.mockResolvedValue([
        { userId: 'user_1', username: 'alice' },
        { userId: 'user_2', username: 'bob' },
      ]);

      const users = await auditService.getUniqueUsers();

      expect(mockRepository.getUniqueUsers).toHaveBeenCalledTimes(1);
      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('alice');
    });
  });
});
