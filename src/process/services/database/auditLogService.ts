/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAuditLogRepository } from './IAuditLogRepository';
import type {
  IAuditLog,
  IAuditLogQuery,
  IAuditLogPaginatedResult,
  IAuditLogStats,
  ResourceType,
} from '@/common/types/rbacTypes';
import { AuditSeverity, AuditActionCategory } from '@/common/types/rbacTypes';

/**
 * Service for audit logging operations
 * Provides a higher-level API for creating and querying audit logs
 */
export class AuditLogService {
  constructor(private readonly repository: IAuditLogRepository) {}

  /**
   * Log an audit event
   * @param log The audit log entry
   * @returns Promise<void>
   */
  async log(log: Omit<IAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const entry: IAuditLog = {
      ...log,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };
    await this.repository.create(entry);
  }

  /**
   * Log a successful action
   * @param params Log parameters
   * @returns Promise<void>
   */
  async logSuccess(params: {
    userId?: string;
    username?: string;
    action: string;
    category: AuditActionCategory;
    resourceType?: ResourceType;
    resourceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      ...params,
      severity: AuditSeverity.INFO,
      success: true,
    });
  }

  /**
   * Log a failed action
   * @param params Log parameters including error
   * @returns Promise<void>
   */
  async logFailure(params: {
    userId?: string;
    username?: string;
    action: string;
    category: AuditActionCategory;
    resourceType?: ResourceType;
    resourceId?: string;
    description: string;
    errorMessage: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditSeverity;
  }): Promise<void> {
    await this.log({
      ...params,
      severity: params.severity ?? AuditSeverity.WARNING,
      success: false,
    });
  }

  /**
   * Log a security event
   * @param params Log parameters
   * @returns Promise<void>
   */
  async logSecurity(params: {
    userId?: string;
    username?: string;
    action: string;
    description: string;
    resourceType?: ResourceType;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await this.log({
      ...params,
      category: AuditActionCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
    });
  }

  /**
   * Get audit log by ID
   * @param id The audit log ID
   * @returns Promise<IAuditLog | undefined>
   */
  async getById(id: string): Promise<IAuditLog | undefined> {
    return this.repository.getById(id);
  }

  /**
   * Query audit logs with filters
   * @param query Query parameters
   * @returns Promise<IAuditLogPaginatedResult>
   */
  async query(query: IAuditLogQuery): Promise<IAuditLogPaginatedResult> {
    return this.repository.query(query);
  }

  /**
   * Get recent audit logs for a user
   * @param userId The user ID
   * @param limit Maximum number of results
   * @returns Promise<IAuditLog[]>
   */
  async getRecentByUser(userId: string, limit = 50): Promise<IAuditLog[]> {
    return this.repository.getRecentByUser(userId, limit);
  }

  /**
   * Get audit logs for a specific resource
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param limit Maximum number of results
   * @returns Promise<IAuditLog[]>
   */
  async getByResource(resourceType: ResourceType, resourceId: string, limit = 50): Promise<IAuditLog[]> {
    return this.repository.getByResource(resourceType, resourceId, limit);
  }

  /**
   * Get audit logs by action
   * @param action The action name
   * @param limit Maximum number of results
   * @returns Promise<IAuditLog[]>
   */
  async getByAction(action: string, limit = 50): Promise<IAuditLog[]> {
    return this.repository.getByAction(action, limit);
  }

  /**
   * Get audit log statistics for a time range
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Promise<IAuditLogStats>
   */
  async getStats(startTime: number, endTime: number): Promise<IAuditLogStats> {
    return this.repository.getStats(startTime, endTime);
  }

  /**
   * Get today's statistics
   * @returns Promise<IAuditLogStats>
   */
  async getTodayStats(): Promise<IAuditLogStats> {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.repository.getStats(startOfDay.getTime(), now);
  }

  /**
   * Get unique actions from audit logs
   * @returns Promise<string[]>
   */
  async getUniqueActions(): Promise<string[]> {
    return this.repository.getUniqueActions();
  }

  /**
   * Get unique users from audit logs
   * @returns Promise<Array<{ userId: string; username: string }>>
   */
  async getUniqueUsers(): Promise<Array<{ userId: string; username: string }>> {
    return this.repository.getUniqueUsers();
  }

  /**
   * Delete audit logs older than specified days
   * @param days Number of days to keep
   * @returns Promise<number> Number of deleted logs
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.repository.deleteOlderThan(cutoff);
  }

  /**
   * Delete all audit logs (requires admin permission)
   * @returns Promise<void>
   */
  async deleteAll(): Promise<void> {
    await this.repository.deleteAll();
  }

  /**
   * Count audit logs matching criteria
   * @param query Query filters (without pagination)
   * @returns Promise<number>
   */
  async count(query: Omit<IAuditLogQuery, 'page' | 'pageSize'>): Promise<number> {
    return this.repository.count(query);
  }
}
