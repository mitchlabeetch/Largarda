/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { IQueryResult } from '@process/services/database/types';

/**
 * Cache entry interface for SIRENE API responses
 */
interface CacheEntry {
  id: string;
  apiSurface: string;
  keyJson: string;
  payloadJson: string;
  fetchedAt: number;
  ttlMs: number;
  sourceUrl?: string;
}

/**
 * Repository for SIRENE API cache operations.
 * Provides caching for API responses with TTL support and stale data tracking.
 */
export class SireneCacheRepository {
  /**
   * Create a cache entry
   */
  async create(
    apiSurface: string,
    keyJson: string,
    payloadJson: string,
    ttlMs: number,
    sourceUrl?: string
  ): Promise<IQueryResult<string>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `sirene_cache_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const stmt = driver.prepare(`
        INSERT INTO ma_sirene_cache (id, api_surface, key_json, payload_json, fetched_at, ttl_ms, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, apiSurface, keyJson, payloadJson, now, ttlMs, sourceUrl ?? null);

      return { success: true, data: id };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: '' };
    }
  }

  /**
   * Get a cache entry by API surface and key
   */
  async get(apiSurface: string, keyJson: string): Promise<IQueryResult<CacheEntry | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver
        .prepare('SELECT * FROM ma_sirene_cache WHERE api_surface = ? AND key_json = ?')
        .get(apiSurface, keyJson) as CacheEntry | undefined;

      if (!row) {
        return { success: true, data: null };
      }

      // Check if expired
      const isExpired = Date.now() > row.fetchedAt + row.ttlMs;
      if (isExpired) {
        // Don't delete immediately - mark as stale for reconciliation
        return { success: true, data: { ...row, isExpired: true } as CacheEntry & { isExpired: boolean } };
      }

      return { success: true, data: row };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Get a cache entry even if expired (for reconciliation)
   */
  async getIncludingStale(apiSurface: string, keyJson: string): Promise<IQueryResult<CacheEntry | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver
        .prepare('SELECT * FROM ma_sirene_cache WHERE api_surface = ? AND key_json = ?')
        .get(apiSurface, keyJson) as CacheEntry | undefined;

      if (!row) {
        return { success: true, data: null };
      }

      return { success: true, data: row };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Delete a cache entry by ID
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_sirene_cache WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * Delete all cache entries for an API surface
   */
  async deleteByApiSurface(apiSurface: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_sirene_cache WHERE api_surface = ?');
      const result = stmt.run(apiSurface);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
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
      const stmt = driver.prepare('DELETE FROM ma_sirene_cache WHERE fetched_at + ttl_ms < ?');
      const result = stmt.run(now);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Get all stale entries (for reconciliation)
   */
  async getStaleEntries(): Promise<IQueryResult<CacheEntry[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const now = Date.now();
      const rows = driver
        .prepare('SELECT * FROM ma_sirene_cache WHERE fetched_at + ttl_ms < ? ORDER BY fetched_at ASC')
        .all(now) as CacheEntry[];

      return { success: true, data: rows };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_sirene_cache');
      const result = stmt.run();

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<IQueryResult<{ total: number; expired: number; stale: number }>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const totalResult = driver.prepare('SELECT COUNT(*) as count FROM ma_sirene_cache').get() as {
        count: number;
      };

      const now = Date.now();
      const expiredResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_sirene_cache WHERE fetched_at + ttl_ms < ?')
        .get(now) as { count: number };

      // Count entries that are stale (older than 50% of TTL)
      const staleThreshold = now - 24 * 60 * 60 * 1000; // 24 hours
      const staleResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_sirene_cache WHERE fetched_at < ?')
        .get(staleThreshold) as { count: number };

      return {
        success: true,
        data: { total: totalResult.count, expired: expiredResult.count, stale: staleResult.count },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: { total: 0, expired: 0, stale: 0 } };
    }
  }

  /**
   * Update an existing cache entry (for reconciliation)
   */
  async update(id: string, payloadJson: string, ttlMs: number, sourceUrl?: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const now = Date.now();
      const stmt = driver.prepare(`
        UPDATE ma_sirene_cache
        SET payload_json = ?, fetched_at = ?, ttl_ms = ?, source_url = ?
        WHERE id = ?
      `);

      const result = stmt.run(payloadJson, now, ttlMs, sourceUrl ?? null, id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }
}

// Singleton instance
let sireneCacheRepositoryInstance: SireneCacheRepository | null = null;

export function getSireneCacheRepository(): SireneCacheRepository {
  if (!sireneCacheRepositoryInstance) {
    sireneCacheRepositoryInstance = new SireneCacheRepository();
  }
  return sireneCacheRepositoryInstance;
}
