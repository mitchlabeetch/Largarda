/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { ISqliteDriver } from './drivers/ISqliteDriver';
import type { IAuditLogRepository } from './IAuditLogRepository';
import type {
  IAuditLog,
  IAuditLogQuery,
  IAuditLogPaginatedResult,
  IAuditLogStats,
  AuditSeverity,
  AuditActionCategory,
  IAuditLogRow,
} from '@/common/types/rbacTypes';

/**
 * SQLite-backed implementation of IAuditLogRepository
 */
export class SqliteAuditLogRepository implements IAuditLogRepository {
  private async getDriver(): Promise<ISqliteDriver> {
    const db = await getDatabase();
    return db.getDriver();
  }

  private rowToAuditLog(row: IAuditLogRow): IAuditLog {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      category: row.category as AuditActionCategory,
      severity: row.severity as AuditSeverity,
      resourceType: row.resource_type as IAuditLog['resourceType'],
      resourceId: row.resource_id,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      success: row.success === 1,
      errorMessage: row.error_message,
    };
  }

  async create(log: IAuditLog): Promise<void> {
    const db = await this.getDriver();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, user_id, username, action, category, severity,
        resource_type, resource_id, description, metadata, ip_address,
        user_agent, success, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.id,
      log.timestamp,
      log.userId ?? null,
      log.username ?? null,
      log.action,
      log.category,
      log.severity,
      log.resourceType ?? null,
      log.resourceId ?? null,
      log.description,
      log.metadata ? JSON.stringify(log.metadata) : null,
      log.ipAddress ?? null,
      log.userAgent ?? null,
      log.success ? 1 : 0,
      log.errorMessage ?? null
    );
  }

  async getById(id: string): Promise<IAuditLog | undefined> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as IAuditLogRow | undefined;
    return row ? this.rowToAuditLog(row) : undefined;
  }

  async query(query: IAuditLogQuery): Promise<IAuditLogPaginatedResult> {
    const db = await this.getDriver();
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 50;
    const offset = page * pageSize;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.startTime !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(query.startTime);
    }
    if (query.endTime !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(query.endTime);
    }
    if (query.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(query.userId);
    }
    if (query.action !== undefined) {
      conditions.push('action = ?');
      params.push(query.action);
    }
    if (query.category !== undefined) {
      conditions.push('category = ?');
      params.push(query.category);
    }
    if (query.severity !== undefined) {
      conditions.push('severity = ?');
      params.push(query.severity);
    }
    if (query.resourceType !== undefined) {
      conditions.push('resource_type = ?');
      params.push(query.resourceType);
    }
    if (query.resourceId !== undefined) {
      conditions.push('resource_id = ?');
      params.push(query.resourceId);
    }
    if (query.success !== undefined) {
      conditions.push('success = ?');
      params.push(query.success ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = query.orderBy ?? 'timestamp';
    const orderDirection = query.orderDirection ?? 'DESC';

    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };

    // Get paginated results
    const queryStmt = db.prepare(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`
    );
    const rows = queryStmt.all(...params, pageSize, offset) as IAuditLogRow[];

    return {
      logs: rows.map((row) => this.rowToAuditLog(row)),
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total,
    };
  }

  async getStats(startTime: number, endTime: number): Promise<IAuditLogStats> {
    const db = await this.getDriver();

    // Total count
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM audit_logs WHERE timestamp >= ? AND timestamp <= ?');
    const { total } = totalStmt.get(startTime, endTime) as { total: number };

    // Count by severity
    const severityStmt = db.prepare(
      `SELECT severity, COUNT(*) as count FROM audit_logs
       WHERE timestamp >= ? AND timestamp <= ? GROUP BY severity`
    );
    const severityRows = severityStmt.all(startTime, endTime) as Array<{
      severity: AuditSeverity;
      count: number;
    }>;
    const countBySeverity = {} as Record<AuditSeverity, number>;
    for (const row of severityRows) {
      countBySeverity[row.severity] = row.count;
    }

    // Count by category
    const categoryStmt = db.prepare(
      `SELECT category, COUNT(*) as count FROM audit_logs
       WHERE timestamp >= ? AND timestamp <= ? GROUP BY category`
    );
    const categoryRows = categoryStmt.all(startTime, endTime) as Array<{
      category: AuditActionCategory;
      count: number;
    }>;
    const countByCategory = {} as Record<AuditActionCategory, number>;
    for (const row of categoryRows) {
      countByCategory[row.category] = row.count;
    }

    // Count by action
    const actionStmt = db.prepare(
      `SELECT action, COUNT(*) as count FROM audit_logs
       WHERE timestamp >= ? AND timestamp <= ? GROUP BY action`
    );
    const actionRows = actionStmt.all(startTime, endTime) as Array<{ action: string; count: number }>;
    const countByAction: Record<string, number> = {};
    for (const row of actionRows) {
      countByAction[row.action] = row.count;
    }

    // Unique users
    const usersStmt = db.prepare(
      `SELECT COUNT(DISTINCT user_id) as unique_users FROM audit_logs
       WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL`
    );
    const { unique_users } = usersStmt.get(startTime, endTime) as { unique_users: number };

    return {
      totalCount: total,
      countBySeverity,
      countByCategory,
      countByAction,
      uniqueUsers: unique_users,
      timeRange: { start: startTime, end: endTime },
    };
  }

  async getRecentByUser(userId: string, limit: number): Promise<IAuditLog[]> {
    const db = await this.getDriver();
    const stmt = db.prepare('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(userId, limit) as IAuditLogRow[];
    return rows.map((row) => this.rowToAuditLog(row));
  }

  async getByResource(resourceType: string, resourceId: string, limit: number): Promise<IAuditLog[]> {
    const db = await this.getDriver();
    const stmt = db.prepare(
      `SELECT * FROM audit_logs
       WHERE resource_type = ? AND resource_id = ?
       ORDER BY timestamp DESC LIMIT ?`
    );
    const rows = stmt.all(resourceType, resourceId, limit) as IAuditLogRow[];
    return rows.map((row) => this.rowToAuditLog(row));
  }

  async getByAction(action: string, limit: number): Promise<IAuditLog[]> {
    const db = await this.getDriver();
    const stmt = db.prepare('SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(action, limit) as IAuditLogRow[];
    return rows.map((row) => this.rowToAuditLog(row));
  }

  async deleteOlderThan(beforeTimestamp: number): Promise<number> {
    const db = await this.getDriver();
    const stmt = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?');
    const result = stmt.run(beforeTimestamp);
    return result.changes;
  }

  async deleteAll(): Promise<void> {
    const db = await this.getDriver();
    db.exec('DELETE FROM audit_logs');
  }

  async count(query: Omit<IAuditLogQuery, 'page' | 'pageSize'>): Promise<number> {
    const db = await this.getDriver();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.startTime !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(query.startTime);
    }
    if (query.endTime !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(query.endTime);
    }
    if (query.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(query.userId);
    }
    if (query.action !== undefined) {
      conditions.push('action = ?');
      params.push(query.action);
    }
    if (query.category !== undefined) {
      conditions.push('category = ?');
      params.push(query.category);
    }
    if (query.severity !== undefined) {
      conditions.push('severity = ?');
      params.push(query.severity);
    }
    if (query.resourceType !== undefined) {
      conditions.push('resource_type = ?');
      params.push(query.resourceType);
    }
    if (query.resourceId !== undefined) {
      conditions.push('resource_id = ?');
      params.push(query.resourceId);
    }
    if (query.success !== undefined) {
      conditions.push('success = ?');
      params.push(query.success ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`);
    const { total } = stmt.get(...params) as { total: number };
    return total;
  }

  async getUniqueActions(): Promise<string[]> {
    const db = await this.getDriver();
    const stmt = db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    const rows = stmt.all() as Array<{ action: string }>;
    return rows.map((row) => row.action);
  }

  async getUniqueUsers(): Promise<Array<{ userId: string; username: string }>> {
    const db = await this.getDriver();
    const stmt = db.prepare(
      `SELECT DISTINCT user_id, username FROM audit_logs
       WHERE user_id IS NOT NULL ORDER BY username`
    );
    const rows = stmt.all() as Array<{ user_id: string; username: string }>;
    return rows.map((row) => ({ userId: row.user_id, username: row.username }));
  }
}
