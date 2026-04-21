/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type {
  Watchlist,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistHit,
  CreateWatchlistHitInput,
  UpdateWatchlistHitInput,
  IMaWatchlistRow,
  IMaWatchlistHitRow,
} from '@/common/ma/watchlist/schema';
import { watchlistToRow, rowToWatchlist, watchlistHitToRow, rowToWatchlistHit } from '@/common/ma/watchlist/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for watchlist operations.
 * Provides CRUD operations for watchlists and their hits.
 */
export class WatchlistRepository {
  /**
   * Create a new watchlist
   */
  async create(input: CreateWatchlistInput): Promise<IQueryResult<Watchlist>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `watchlist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const watchlist: Watchlist = {
        id,
        ownerUserId: input.ownerUserId,
        name: input.name,
        criteriaJson: input.criteriaJson,
        cadence: input.cadence,
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      };

      const row = watchlistToRow(watchlist);
      const stmt = driver.prepare(`
        INSERT INTO ma_watchlists (id, owner_user_id, name, criteria_json, cadence, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.owner_user_id,
        row.name,
        row.criteria_json,
        row.cadence,
        row.enabled,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: watchlist };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a watchlist by ID
   */
  async get(id: string): Promise<IQueryResult<Watchlist | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_watchlists WHERE id = ?').get(id) as IMaWatchlistRow | undefined;

      return {
        success: true,
        data: row ? rowToWatchlist(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a watchlist
   */
  async update(id: string, input: UpdateWatchlistInput): Promise<IQueryResult<Watchlist>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Watchlist not found' };
      }

      const updated: Watchlist = {
        ...existing.data,
        name: input.name ?? existing.data.name,
        criteriaJson: input.criteriaJson ?? existing.data.criteriaJson,
        cadence: input.cadence ?? existing.data.cadence,
        enabled: input.enabled ?? existing.data.enabled,
        updatedAt: Date.now(),
      };

      const row = watchlistToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_watchlists
        SET name = ?, criteria_json = ?, cadence = ?, enabled = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(row.name, row.criteria_json, row.cadence, row.enabled, row.updated_at, id);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a watchlist
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_watchlists WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List watchlists for a user
   */
  async listByUser(ownerUserId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Watchlist>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_watchlists WHERE owner_user_id = ?')
        .get(ownerUserId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_watchlists WHERE owner_user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(ownerUserId, pageSize, page * pageSize) as IMaWatchlistRow[];

      return {
        data: rows.map(rowToWatchlist),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[WatchlistRepository] List by user error:', error);
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
   * List enabled watchlists
   */
  async listEnabled(page = 0, pageSize = 50): Promise<IPaginatedResult<Watchlist>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_watchlists WHERE enabled = 1').get() as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_watchlists WHERE enabled = 1 ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(pageSize, page * pageSize) as IMaWatchlistRow[];

      return {
        data: rows.map(rowToWatchlist),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[WatchlistRepository] List enabled error:', error);
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
   * Create a watchlist hit
   */
  async createHit(input: CreateWatchlistHitInput): Promise<IQueryResult<WatchlistHit>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `hit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = input.matchedAt ?? Date.now();

      const hit: WatchlistHit = {
        id,
        watchlistId: input.watchlistId,
        payloadJson: input.payloadJson,
        matchedAt: now,
        seenAt: input.seenAt,
      };

      const row = watchlistHitToRow(hit);
      const stmt = driver.prepare(`
        INSERT INTO ma_watchlist_hits (id, watchlist_id, payload_json, matched_at, seen_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(row.id, row.watchlist_id, row.payload_json, row.matched_at, row.seen_at);

      return { success: true, data: hit };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a watchlist hit by ID
   */
  async getHit(id: string): Promise<IQueryResult<WatchlistHit | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_watchlist_hits WHERE id = ?').get(id) as
        | IMaWatchlistHitRow
        | undefined;

      return {
        success: true,
        data: row ? rowToWatchlistHit(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a watchlist hit
   */
  async updateHit(id: string, input: UpdateWatchlistHitInput): Promise<IQueryResult<WatchlistHit>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.getHit(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Watchlist hit not found' };
      }

      const updated: WatchlistHit = {
        ...existing.data,
        seenAt: input.seenAt ?? existing.data.seenAt,
      };

      const row = watchlistHitToRow(updated);
      const stmt = driver.prepare('UPDATE ma_watchlist_hits SET seen_at = ? WHERE id = ?');

      stmt.run(row.seen_at, id);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * List hits for a watchlist
   */
  async listHits(watchlistId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<WatchlistHit>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_watchlist_hits WHERE watchlist_id = ?')
        .get(watchlistId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_watchlist_hits WHERE watchlist_id = ? ORDER BY matched_at DESC LIMIT ? OFFSET ?')
        .all(watchlistId, pageSize, page * pageSize) as IMaWatchlistHitRow[];

      return {
        data: rows.map(rowToWatchlistHit),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[WatchlistRepository] List hits error:', error);
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
   * List unseen hits for a watchlist
   */
  async listUnseenHits(watchlistId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<WatchlistHit>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_watchlist_hits WHERE watchlist_id = ? AND seen_at IS NULL')
        .get(watchlistId) as { count: number };

      const rows = driver
        .prepare(
          'SELECT * FROM ma_watchlist_hits WHERE watchlist_id = ? AND seen_at IS NULL ORDER BY matched_at DESC LIMIT ? OFFSET ?'
        )
        .all(watchlistId, pageSize, page * pageSize) as IMaWatchlistHitRow[];

      return {
        data: rows.map(rowToWatchlistHit),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[WatchlistRepository] List unseen hits error:', error);
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
   * Mark all hits for a watchlist as seen
   */
  async markAllHitsSeen(watchlistId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare(
        'UPDATE ma_watchlist_hits SET seen_at = ? WHERE watchlist_id = ? AND seen_at IS NULL'
      );
      const result = stmt.run(Date.now(), watchlistId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Delete all hits for a watchlist
   */
  async deleteHits(watchlistId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_watchlist_hits WHERE watchlist_id = ?');
      const result = stmt.run(watchlistId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }
}

// Singleton instance
let watchlistRepositoryInstance: WatchlistRepository | null = null;

export function getWatchlistRepository(): WatchlistRepository {
  if (!watchlistRepositoryInstance) {
    watchlistRepositoryInstance = new WatchlistRepository();
  }
  return watchlistRepositoryInstance;
}
