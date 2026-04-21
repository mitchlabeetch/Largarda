/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { KbSource, CreateKbSourceInput, UpdateKbSourceInput, IMaKbSourceRow } from '@/common/ma/kb/schema';
import { kbSourceToRow, rowToKbSource } from '@/common/ma/kb/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for knowledge base source operations.
 * Provides CRUD operations for KB sources tracking.
 */
export class KbSourceRepository {
  /**
   * Create a new KB source
   */
  async create(input: CreateKbSourceInput): Promise<IQueryResult<KbSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `kbsource_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const source: KbSource = {
        id,
        scope: input.scope,
        scopeId: input.scopeId,
        flowiseDocumentStoreId: input.flowiseDocumentStoreId,
        embeddingModel: input.embeddingModel,
        chunkCount: 0,
        lastIngestedAt: undefined,
        status: input.status ?? 'pending',
        errorText: undefined,
        createdAt: now,
        updatedAt: now,
      };

      const row = kbSourceToRow(source);
      const stmt = driver.prepare(`
        INSERT INTO ma_kb_sources (id, scope, scope_id, flowise_document_store_id, embedding_model, chunk_count, last_ingested_at, status, error_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.scope,
        row.scope_id,
        row.flowise_document_store_id,
        row.embedding_model,
        row.chunk_count,
        row.last_ingested_at,
        row.status,
        row.error_text,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: source };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a KB source by ID
   */
  async get(id: string): Promise<IQueryResult<KbSource | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_kb_sources WHERE id = ?').get(id) as IMaKbSourceRow | undefined;

      return {
        success: true,
        data: row ? rowToKbSource(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Get a KB source by scope and scope ID
   */
  async getByScope(scope: string, scopeId: string): Promise<IQueryResult<KbSource | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_kb_sources WHERE scope = ? AND scope_id = ?').get(scope, scopeId) as
        | IMaKbSourceRow
        | undefined;

      return {
        success: true,
        data: row ? rowToKbSource(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a KB source
   */
  async update(id: string, input: UpdateKbSourceInput): Promise<IQueryResult<KbSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'KB source not found' };
      }

      const updated: KbSource = {
        ...existing.data,
        flowiseDocumentStoreId: input.flowiseDocumentStoreId ?? existing.data.flowiseDocumentStoreId,
        embeddingModel: input.embeddingModel ?? existing.data.embeddingModel,
        chunkCount: input.chunkCount ?? existing.data.chunkCount,
        lastIngestedAt: input.lastIngestedAt ?? existing.data.lastIngestedAt,
        status: input.status ?? existing.data.status,
        errorText: input.errorText ?? existing.data.errorText,
        updatedAt: Date.now(),
      };

      const row = kbSourceToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_kb_sources
        SET flowise_document_store_id = ?, embedding_model = ?, chunk_count = ?, last_ingested_at = ?, status = ?, error_text = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        row.flowise_document_store_id,
        row.embedding_model,
        row.chunk_count,
        row.last_ingested_at,
        row.status,
        row.error_text,
        row.updated_at,
        id
      );

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a KB source
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_kb_sources WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List KB sources by scope
   */
  async listByScope(scope: string, page = 0, pageSize = 50): Promise<IPaginatedResult<KbSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_kb_sources WHERE scope = ?').get(scope) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_kb_sources WHERE scope = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(scope, pageSize, page * pageSize) as IMaKbSourceRow[];

      return {
        data: rows.map(rowToKbSource),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[KbSourceRepository] List by scope error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  /**
   * List KB sources by status
   */
  async listByStatus(status: string, page = 0, pageSize = 50): Promise<IPaginatedResult<KbSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_kb_sources WHERE status = ?')
        .get(status) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_kb_sources WHERE status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(status, pageSize, page * pageSize) as IMaKbSourceRow[];

      return {
        data: rows.map(rowToKbSource),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[KbSourceRepository] List by status error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  /**
   * Upsert a KB source by scope and scope ID
   */
  async upsertByScope(input: CreateKbSourceInput): Promise<IQueryResult<KbSource>> {
    const existing = await this.getByScope(input.scope, input.scopeId);
    if (existing.success && existing.data) {
      return this.update(existing.data.id, input);
    }
    return this.create(input);
  }

  /**
   * Update chunk count for a KB source
   */
  async updateChunkCount(id: string, chunkCount: number): Promise<IQueryResult<KbSource>> {
    return this.update(id, { chunkCount });
  }

  /**
   * Mark a KB source as ingesting
   */
  async markIngesting(id: string): Promise<IQueryResult<KbSource>> {
    return this.update(id, { status: 'ingesting' });
  }

  /**
   * Mark a KB source as completed
   */
  async markCompleted(id: string, chunkCount: number): Promise<IQueryResult<KbSource>> {
    return this.update(id, { status: 'completed', chunkCount, lastIngestedAt: Date.now() });
  }

  /**
   * Mark a KB source as error
   */
  async markError(id: string, errorText: string): Promise<IQueryResult<KbSource>> {
    return this.update(id, { status: 'error', errorText });
  }
}

// Singleton instance
let kbSourceRepositoryInstance: KbSourceRepository | null = null;

export function getKbSourceRepository(): KbSourceRepository {
  if (!kbSourceRepositoryInstance) {
    kbSourceRepositoryInstance = new KbSourceRepository();
  }
  return kbSourceRepositoryInstance;
}
