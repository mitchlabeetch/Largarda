/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';
import type {
  SourceCache,
  CreateSourceCacheInput,
  UpdateSourceCacheInput,
  IMaSourceCacheRow,
  FreshnessStatus,
} from '@/common/ma/sourceCache/schema';
import { sourceCacheToRow, rowToSourceCache, computeFreshness } from '@/common/ma/sourceCache/schema';

/**
 * Repository for ma_source_cache operations.
 * Provides CRUD, upsert by surface+lookupKey, and freshness-based queries.
 */
export class SourceCacheRepository {
  /**
   * Create a new source cache entry
   */
  async create(input: CreateSourceCacheInput): Promise<IQueryResult<SourceCache>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const freshness: FreshnessStatus = input.freshness ?? computeFreshness(input.fetchedAt, input.ttlMs, now);

      const row: IMaSourceCacheRow = {
        id,
        surface: input.surface,
        lookup_key: input.lookupKey,
        payload_json: input.payloadJson,
        provenance_json: input.provenanceJson,
        fetched_at: input.fetchedAt,
        ttl_ms: input.ttlMs,
        freshness,
        source_url: input.sourceUrl ?? null,
        created_at: now,
        updated_at: now,
      };

      const stmt = driver.prepare(`
        INSERT INTO ma_source_cache (id, surface, lookup_key, payload_json, provenance_json,
          fetched_at, ttl_ms, freshness, source_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        row.id,
        row.surface,
        row.lookup_key,
        row.payload_json,
        row.provenance_json,
        row.fetched_at,
        row.ttl_ms,
        row.freshness,
        row.source_url,
        row.created_at,
        row.updated_at
      );

      const cache: SourceCache = {
        id,
        surface: input.surface,
        lookupKey: input.lookupKey,
        payloadJson: input.payloadJson,
        provenanceJson: input.provenanceJson,
        fetchedAt: input.fetchedAt,
        ttlMs: input.ttlMs,
        freshness,
        sourceUrl: input.sourceUrl,
        createdAt: now,
        updatedAt: now,
      };

      return { success: true, data: cache };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a source cache entry by ID
   */
  async get(id: string): Promise<IQueryResult<SourceCache | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_source_cache WHERE id = ?').get(id) as IMaSourceCacheRow | undefined;

      if (!row) {
        return { success: true, data: null };
      }

      return { success: true, data: rowToSourceCache(row) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Get a source cache entry by surface and lookup key
   */
  async getBySurfaceKey(surface: string, lookupKey: string): Promise<IQueryResult<SourceCache | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver
        .prepare('SELECT * FROM ma_source_cache WHERE surface = ? AND lookup_key = ?')
        .get(surface, lookupKey) as IMaSourceCacheRow | undefined;

      if (!row) {
        return { success: true, data: null };
      }

      return { success: true, data: rowToSourceCache(row) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a source cache entry
   */
  async update(id: string, input: UpdateSourceCacheInput): Promise<IQueryResult<SourceCache>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver.prepare('SELECT * FROM ma_source_cache WHERE id = ?').get(id) as
        | IMaSourceCacheRow
        | undefined;

      if (!existing) {
        return { success: false, error: `Source cache entry ${id} not found` };
      }

      const now = Date.now();
      const fetchedAt = input.fetchedAt ?? existing.fetched_at;
      const ttlMs = input.ttlMs ?? existing.ttl_ms;
      const freshness: FreshnessStatus = input.freshness ?? computeFreshness(fetchedAt, ttlMs, now);

      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (input.payloadJson !== undefined) {
        setClauses.push('payload_json = ?');
        values.push(input.payloadJson);
      }
      if (input.provenanceJson !== undefined) {
        setClauses.push('provenance_json = ?');
        values.push(input.provenanceJson);
      }
      if (input.fetchedAt !== undefined) {
        setClauses.push('fetched_at = ?');
        values.push(input.fetchedAt);
      }
      if (input.ttlMs !== undefined) {
        setClauses.push('ttl_ms = ?');
        values.push(input.ttlMs);
      }
      if (input.sourceUrl !== undefined) {
        setClauses.push('source_url = ?');
        values.push(input.sourceUrl);
      }

      setClauses.push('freshness = ?');
      values.push(freshness);
      setClauses.push('updated_at = ?');
      values.push(now);

      values.push(id);

      driver.prepare(`UPDATE ma_source_cache SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

      const updated = driver.prepare('SELECT * FROM ma_source_cache WHERE id = ?').get(id) as IMaSourceCacheRow;

      return { success: true, data: rowToSourceCache(updated) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a source cache entry by ID
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_source_cache WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * Delete all cache entries for a surface
   */
  async deleteBySurface(surface: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_source_cache WHERE surface = ?');
      const result = stmt.run(surface);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Upsert by surface + lookupKey.
   * If an entry exists for the same (surface, lookup_key), it is updated;
   * otherwise a new entry is created.
   */
  async upsert(input: CreateSourceCacheInput): Promise<IQueryResult<SourceCache>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const now = Date.now();
      const freshness: FreshnessStatus = input.freshness ?? computeFreshness(input.fetchedAt, input.ttlMs, now);

      const existing = driver
        .prepare('SELECT * FROM ma_source_cache WHERE surface = ? AND lookup_key = ?')
        .get(input.surface, input.lookupKey) as IMaSourceCacheRow | undefined;

      if (existing) {
        const setClauses = [
          'payload_json = ?',
          'provenance_json = ?',
          'fetched_at = ?',
          'ttl_ms = ?',
          'freshness = ?',
          'source_url = ?',
          'updated_at = ?',
        ];
        const values = [
          input.payloadJson,
          input.provenanceJson,
          input.fetchedAt,
          input.ttlMs,
          freshness,
          input.sourceUrl ?? null,
          now,
          existing.id,
        ];

        driver.prepare(`UPDATE ma_source_cache SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

        const updated = driver
          .prepare('SELECT * FROM ma_source_cache WHERE id = ?')
          .get(existing.id) as IMaSourceCacheRow;

        return { success: true, data: rowToSourceCache(updated) };
      }

      // Create new
      const id = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const row: IMaSourceCacheRow = {
        id,
        surface: input.surface,
        lookup_key: input.lookupKey,
        payload_json: input.payloadJson,
        provenance_json: input.provenanceJson,
        fetched_at: input.fetchedAt,
        ttl_ms: input.ttlMs,
        freshness,
        source_url: input.sourceUrl ?? null,
        created_at: now,
        updated_at: now,
      };

      const stmt = driver.prepare(`
        INSERT INTO ma_source_cache (id, surface, lookup_key, payload_json, provenance_json,
          fetched_at, ttl_ms, freshness, source_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        row.id,
        row.surface,
        row.lookup_key,
        row.payload_json,
        row.provenance_json,
        row.fetched_at,
        row.ttl_ms,
        row.freshness,
        row.source_url,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: rowToSourceCache(row) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * List cache entries by surface with pagination
   */
  async listBySurface(
    surface: string,
    page: number = 0,
    pageSize: number = 50
  ): Promise<IPaginatedResult<SourceCache>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_source_cache WHERE surface = ?')
        .get(surface) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_source_cache WHERE surface = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(surface, pageSize, page * pageSize) as IMaSourceCacheRow[];

      return {
        data: rows.map(rowToSourceCache),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * List cache entries by freshness status
   */
  async listByFreshness(
    freshness: FreshnessStatus,
    page: number = 0,
    pageSize: number = 50
  ): Promise<IPaginatedResult<SourceCache>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_source_cache WHERE freshness = ?')
        .get(freshness) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_source_cache WHERE freshness = ? ORDER BY fetched_at ASC LIMIT ? OFFSET ?')
        .all(freshness, pageSize, page * pageSize) as IMaSourceCacheRow[];

      return {
        data: rows.map(rowToSourceCache),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * Delete all expired cache entries
   */
  async deleteExpired(): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const now = Date.now();
      const stmt = driver.prepare('DELETE FROM ma_source_cache WHERE freshness = ?');
      const result = stmt.run('expired');

      // Also delete entries where fetched_at + ttl_ms < now (recalculate)
      const stmt2 = driver.prepare('DELETE FROM ma_source_cache WHERE fetched_at + ttl_ms < ? AND ttl_ms > 0');
      const result2 = stmt2.run(now);

      return { success: true, data: result.changes + result2.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Recompute freshness for all entries based on current time
   */
  async recomputeFreshness(): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const now = Date.now();
      const rows = driver.prepare('SELECT id, fetched_at, ttl_ms FROM ma_source_cache').all() as Array<{
        id: string;
        fetched_at: number;
        ttl_ms: number;
      }>;

      let updated = 0;
      const updateStmt = driver.prepare('UPDATE ma_source_cache SET freshness = ?, updated_at = ? WHERE id = ?');

      for (const row of rows) {
        const freshness = computeFreshness(row.fetched_at, row.ttl_ms, now);
        updateStmt.run(freshness, now, row.id);
        updated++;
      }

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<
    IQueryResult<{ total: number; byFreshness: Record<string, number>; bySurface: Record<string, number> }>
  > {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const totalResult = driver.prepare('SELECT COUNT(*) as count FROM ma_source_cache').get() as { count: number };

      const freshnessRows = driver
        .prepare('SELECT freshness, COUNT(*) as count FROM ma_source_cache GROUP BY freshness')
        .all() as Array<{ freshness: string; count: number }>;

      const surfaceRows = driver
        .prepare('SELECT surface, COUNT(*) as count FROM ma_source_cache GROUP BY surface')
        .all() as Array<{ surface: string; count: number }>;

      const byFreshness: Record<string, number> = {};
      for (const row of freshnessRows) {
        byFreshness[row.freshness] = row.count;
      }

      const bySurface: Record<string, number> = {};
      for (const row of surfaceRows) {
        bySurface[row.surface] = row.count;
      }

      return {
        success: true,
        data: { total: totalResult.count, byFreshness, bySurface },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: { total: 0, byFreshness: {}, bySurface: {} } };
    }
  }
}

// Singleton instance
let sourceCacheRepositoryInstance: SourceCacheRepository | null = null;

export function getSourceCacheRepository(): SourceCacheRepository {
  if (!sourceCacheRepositoryInstance) {
    sourceCacheRepositoryInstance = new SourceCacheRepository();
  }
  return sourceCacheRepositoryInstance;
}
