/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import type {
  CreateSyncJobInput,
  IMaSyncJobRow,
  SyncJob,
  UpdateSyncJobInput,
} from '@/common/ma/types';
import { syncJobToRow, rowToSyncJob } from '@/common/ma/types';
import { getDatabase } from '@process/services/database';
import type { IQueryResult } from '@process/services/database/types';

type UpsertSyncJobInput = Omit<SyncJob, 'createdAt' | 'updatedAt' | 'id'> & {
  id?: string;
  createdAt?: number;
};

/**
 * Repository for sync job state tracking (email and CRM sync operations).
 */
export class SyncJobRepository {
  async create(input: CreateSyncJobInput): Promise<IQueryResult<SyncJob>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const now = Date.now();
      const job: SyncJob = {
        id: crypto.randomUUID(),
        jobType: input.jobType,
        providerId: input.providerId,
        status: 'pending',
        config: input.config,
        result: undefined,
        error: undefined,
        retryCount: 0,
        maxRetries: input.maxRetries ?? 3,
        itemsProcessed: 0,
        itemsTotal: 0,
        startedAt: undefined,
        completedAt: undefined,
        nextRetryAt: undefined,
        createdAt: now,
        updatedAt: now,
      };

      const row = syncJobToRow(job);
      driver
        .prepare(
          `INSERT INTO ma_sync_jobs (
             id, job_type, provider_id, status, config, result, error,
             retry_count, max_retries, items_processed, items_total,
             started_at, completed_at, next_retry_at, created_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          row.id,
          row.job_type,
          row.provider_id,
          row.status,
          row.config,
          row.result,
          row.error,
          row.retry_count,
          row.max_retries,
          row.items_processed,
          row.items_total,
          row.started_at,
          row.completed_at,
          row.next_retry_at,
          row.created_at,
          row.updated_at
        );

      return { success: true, data: job };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  async get(id: string): Promise<IQueryResult<SyncJob | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const row = driver.prepare('SELECT * FROM ma_sync_jobs WHERE id = ?').get(id) as IMaSyncJobRow | undefined;

      return {
        success: true,
        data: row ? rowToSyncJob(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  async list(filters?: { jobType?: string; providerId?: string; status?: string }): Promise<IQueryResult<SyncJob[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      let query = 'SELECT * FROM ma_sync_jobs';
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters?.jobType) {
        conditions.push('job_type = ?');
        params.push(filters.jobType);
      }
      if (filters?.providerId) {
        conditions.push('provider_id = ?');
        params.push(filters.providerId);
      }
      if (filters?.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const rows = driver.prepare(query).all(...params) as IMaSyncJobRow[];

      return {
        success: true,
        data: rows.map(rowToSyncJob),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  async update(id: string, input: UpdateSyncJobInput): Promise<IQueryResult<SyncJob | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Sync job not found', data: null };
      }

      const now = Date.now();
      const updated: SyncJob = {
        ...existing.data,
        ...input,
        updatedAt: now,
      };

      const row = syncJobToRow(updated);
      const setClause = Object.entries(input)
        .map(([key]) => {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          return `${dbKey} = ?`;
        })
        .join(', ');

      driver
        .prepare(`UPDATE ma_sync_jobs SET ${setClause}, updated_at = ? WHERE id = ?`)
        .run(...Object.values(input), now, id);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const result = driver.prepare('DELETE FROM ma_sync_jobs WHERE id = ?').run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  async countActiveJobs(jobType?: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      let query = 'SELECT COUNT(*) as count FROM ma_sync_jobs WHERE status IN (?, ?, ?, ?, ?)';
      const params = ['queued', 'connecting', 'fetching', 'processing', 'retrying'];

      if (jobType) {
        query += ' AND job_type = ?';
        params.push(jobType);
      }

      const result = driver.prepare(query).get(...params) as { count: number };

      return { success: true, data: result.count };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }
}

let syncJobRepository: SyncJobRepository | null = null;

export function getSyncJobRepository(): SyncJobRepository {
  syncJobRepository ??= new SyncJobRepository();
  return syncJobRepository;
}
