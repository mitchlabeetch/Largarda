/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { IQueryResult } from '@process/services/database/types';

/**
 * Cache entry interface
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
 * Repository for data.gouv.fr cache operations.
 * Provides caching for API responses with TTL support.
 */
export class DatagouvCacheRepository {
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

      const id = `cache_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const stmt = driver.prepare(`
        INSERT INTO ma_datagouv_cache (id, api_surface, key_json, payload_json, fetched_at, ttl_ms, source_url)
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
        .prepare('SELECT * FROM ma_datagouv_cache WHERE api_surface = ? AND key_json = ?')
        .get(apiSurface, keyJson) as CacheEntry | undefined;

      if (!row) {
        return { success: true, data: null };
      }

      // Check if expired
      const isExpired = Date.now() > row.fetchedAt + row.ttlMs;
      if (isExpired) {
        // Delete expired entry
        await this.delete(row.id);
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

      const stmt = driver.prepare('DELETE FROM ma_datagouv_cache WHERE id = ?');
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

      const stmt = driver.prepare('DELETE FROM ma_datagouv_cache WHERE api_surface = ?');
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
      const stmt = driver.prepare('DELETE FROM ma_datagouv_cache WHERE fetched_at + ttl_ms < ?');
      const result = stmt.run(now);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_datagouv_cache');
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
  async getStats(): Promise<IQueryResult<{ total: number; expired: number }>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const totalResult = driver.prepare('SELECT COUNT(*) as count FROM ma_datagouv_cache').get() as {
        count: number;
      };

      const now = Date.now();
      const expiredResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_datagouv_cache WHERE fetched_at + ttl_ms < ?')
        .get(now) as { count: number };

      return {
        success: true,
        data: { total: totalResult.count, expired: expiredResult.count },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: { total: 0, expired: 0 } };
    }
  }
}

// Singleton instance
let datagouvCacheRepositoryInstance: DatagouvCacheRepository | null = null;

export function getDatagouvCacheRepository(): DatagouvCacheRepository {
  if (!datagouvCacheRepositoryInstance) {
    datagouvCacheRepositoryInstance = new DatagouvCacheRepository();
  }
  return datagouvCacheRepositoryInstance;
}
