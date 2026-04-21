/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Watchlist Service
 * Manages watchlists for M&A data spine (CRUD over ma_watchlists table)
 * Handles criteria_json for watchlist matching rules
 */

import type {
  Watchlist,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistHit,
  CreateWatchlistHitInput,
  UpdateWatchlistHitInput,
} from '../../../common/ma/watchlist/schema';

/**
 * Watchlist Service Interface
 */
export interface IWatchlistService {
  // Watchlist CRUD
  create(input: CreateWatchlistInput): Promise<Watchlist>;
  getById(id: string): Promise<Watchlist | null>;
  list(filters?: { ownerUserId?: string; enabled?: boolean }): Promise<Watchlist[]>;
  update(id: string, input: UpdateWatchlistInput): Promise<Watchlist>;
  delete(id: string): Promise<void>;

  // Watchlist Hit CRUD
  createHit(input: CreateWatchlistHitInput): Promise<WatchlistHit>;
  getHitsByWatchlistId(watchlistId: string): Promise<WatchlistHit[]>;
  markHitAsSeen(hitId: string): Promise<void>;
}

/**
 * Watchlist Service Implementation
 */
export class WatchlistService implements IWatchlistService {
  constructor(private db: any) {}

  /**
   * Create a new watchlist
   */
  async create(input: CreateWatchlistInput): Promise<Watchlist> {
    const now = Date.now();
    const id = crypto.randomUUID();

    const row = {
      id,
      owner_user_id: input.ownerUserId,
      name: input.name,
      criteria_json: input.criteriaJson,
      cadence: input.cadence ?? null,
      enabled: (input.enabled ?? true) ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('ma_watchlists', row);

    return {
      id,
      ownerUserId: input.ownerUserId,
      name: input.name,
      criteriaJson: input.criteriaJson,
      cadence: input.cadence,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get watchlist by ID
   */
  async getById(id: string): Promise<Watchlist | null> {
    const row = await this.db.select('ma_watchlists', { id });
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      criteriaJson: row.criteria_json,
      cadence: row.cadence ?? undefined,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * List watchlists with optional filters
   */
  async list(filters?: { ownerUserId?: string; enabled?: boolean }): Promise<Watchlist[]> {
    const where: Record<string, unknown> = {};
    if (filters?.ownerUserId) {
      where.owner_user_id = filters.ownerUserId;
    }
    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled ? 1 : 0;
    }

    const rows = await this.db.select('ma_watchlists', where);

    return rows.map((row: any) => ({
      id: row.id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      criteriaJson: row.criteria_json,
      cadence: row.cadence ?? undefined,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Update a watchlist
   */
  async update(id: string, input: UpdateWatchlistInput): Promise<Watchlist> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Watchlist not found: ${id}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      updated_at: now,
    };

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.criteriaJson !== undefined) {
      updates.criteria_json = input.criteriaJson;
    }
    if (input.cadence !== undefined) {
      updates.cadence = input.cadence;
    }
    if (input.enabled !== undefined) {
      updates.enabled = input.enabled ? 1 : 0;
    }

    await this.db.update('ma_watchlists', { id }, updates);

    return {
      id,
      ownerUserId: existing.ownerUserId,
      name: input.name ?? existing.name,
      criteriaJson: input.criteriaJson ?? existing.criteriaJson,
      cadence: input.cadence ?? existing.cadence,
      enabled: input.enabled ?? existing.enabled,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  /**
   * Delete a watchlist
   */
  async delete(id: string): Promise<void> {
    await this.db.delete('ma_watchlists', { id });
  }

  /**
   * Create a watchlist hit
   */
  async createHit(input: CreateWatchlistHitInput): Promise<WatchlistHit> {
    const now = Date.now();
    const id = crypto.randomUUID();

    const row = {
      id,
      watchlist_id: input.watchlistId,
      payload_json: input.payloadJson,
      matched_at: input.matchedAt ?? now,
      seen_at: input.seenAt ?? null,
    };

    await this.db.insert('ma_watchlist_hits', row);

    return {
      id,
      watchlistId: input.watchlistId,
      payloadJson: input.payloadJson,
      matchedAt: input.matchedAt ?? now,
      seenAt: input.seenAt,
    };
  }

  /**
   * Get hits for a watchlist
   */
  async getHitsByWatchlistId(watchlistId: string): Promise<WatchlistHit[]> {
    const rows = await this.db.select('ma_watchlist_hits', { watchlist_id: watchlistId });

    return rows.map((row: any) => ({
      id: row.id,
      watchlistId: row.watchlist_id,
      payloadJson: row.payload_json,
      matchedAt: row.matched_at,
      seenAt: row.seen_at ?? undefined,
    }));
  }

  /**
   * Mark a hit as seen
   */
  async markHitAsSeen(hitId: string): Promise<void> {
    await this.db.update('ma_watchlist_hits', { id: hitId }, { seen_at: Date.now() });
  }
}

// Singleton instance
let watchlistService: WatchlistService | null = null;

export function getWatchlistService(db: any): WatchlistService {
  if (!watchlistService) {
    watchlistService = new WatchlistService(db);
  }
  return watchlistService;
}
