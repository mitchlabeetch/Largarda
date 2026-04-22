/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAuditLog, IAuditLogQuery, IAuditLogPaginatedResult, IAuditLogStats } from '@/common/types/rbacTypes';

/**
 * Repository interface for audit log operations
 * Provides CRUD and query operations for compliance tracking
 */
export interface IAuditLogRepository {
  /**
   * Create a new audit log entry
   * @param log The audit log entry to create
   * @returns Promise<void>
   */
  create(log: IAuditLog): Promise<void>;

  /**
   * Get an audit log by ID
   * @param id The audit log ID
   * @returns Promise<IAuditLog | undefined>
   */
  getById(id: string): Promise<IAuditLog | undefined>;

  /**
   * Query audit logs with filters and pagination
   * @param query Query filters and pagination options
   * @returns Promise<IAuditLogPaginatedResult>
   */
  query(query: IAuditLogQuery): Promise<IAuditLogPaginatedResult>;

  /**
   * Get audit log statistics
   * @param startTime Start of time range
   * @param endTime End of time range
   * @returns Promise<IAuditLogStats>
   */
  getStats(startTime: number, endTime: number): Promise<IAuditLogStats>;

  /**
   * Get recent audit logs for a user
   * @param userId The user ID
   * @param limit Maximum number of logs to return
   * @returns Promise<IAuditLog[]>
   */
  getRecentByUser(userId: string, limit: number): Promise<IAuditLog[]>;

  /**
   * Get audit logs for a specific resource
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param limit Maximum number of logs to return
   * @returns Promise<IAuditLog[]>
   */
  getByResource(resourceType: string, resourceId: string, limit: number): Promise<IAuditLog[]>;

  /**
   * Get audit logs by action type
   * @param action The action name
   * @param limit Maximum number of logs to return
   * @returns Promise<IAuditLog[]>
   */
  getByAction(action: string, limit: number): Promise<IAuditLog[]>;

  /**
   * Delete audit logs older than a specified timestamp
   * @param beforeTimestamp Delete logs before this timestamp
   * @returns Promise<number> Number of logs deleted
   */
  deleteOlderThan(beforeTimestamp: number): Promise<number>;

  /**
   * Delete all audit logs
   * @returns Promise<void>
   */
  deleteAll(): Promise<void>;

  /**
   * Count total audit logs matching query
   * @param query Query filters (excluding pagination)
   * @returns Promise<number>
   */
  count(query: Omit<IAuditLogQuery, 'page' | 'pageSize'>): Promise<number>;

  /**
   * Get unique actions from audit logs
   * @returns Promise<string[]>
   */
  getUniqueActions(): Promise<string[]>;

  /**
   * Get unique users who have audit log entries
   * @returns Promise<Array<{ userId: string; username: string }>>
   */
  getUniqueUsers(): Promise<Array<{ userId: string; username: string }>>;
}
