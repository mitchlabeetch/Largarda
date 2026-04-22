/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WatchlistService
 * Manages watchlist operations with business logic including refresh/schedule.
 * Provides CRUD operations for watchlists and their hits.
 */

import type {
  Watchlist,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistHit,
  CreateWatchlistHitInput,
  UpdateWatchlistHitInput,
} from '@/common/ma/watchlist/schema';
import { getWatchlistRepository } from '@process/services/database/repositories/ma/WatchlistRepository';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Service for managing watchlist operations.
 * Handles CRUD operations, hit management, and refresh scheduling.
 */
export class WatchlistService {
  private repository = getWatchlistRepository();
  private refreshIntervals = new Map<string, NodeJS.Timeout>();

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new watchlist
   */
  async createWatchlist(input: CreateWatchlistInput): Promise<IQueryResult<Watchlist>> {
    const validation = this.validateWatchlistInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const result = await this.repository.create(input);
    if (result.success && result.data && result.data.enabled && result.data.cadence) {
      this.scheduleRefresh(result.data.id, result.data.cadence);
    }
    return result;
  }

  /**
   * Get a watchlist by ID
   */
  async getWatchlist(id: string): Promise<IQueryResult<Watchlist | null>> {
    return this.repository.get(id);
  }

  /**
   * Update a watchlist
   */
  async updateWatchlist(id: string, updates: UpdateWatchlistInput): Promise<IQueryResult<Watchlist>> {
    const validation = this.validateWatchlistInput(updates, true);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const result = await this.repository.update(id, updates);
    if (result.success && result.data) {
      // Update refresh schedule if cadence or enabled status changed
      if (updates.cadence !== undefined || updates.enabled !== undefined) {
        this.stopRefresh(id);
        if (result.data.enabled && result.data.cadence) {
          this.scheduleRefresh(id, result.data.cadence);
        }
      }
    }
    return result;
  }

  /**
   * Delete a watchlist
   */
  async deleteWatchlist(id: string): Promise<IQueryResult<boolean>> {
    this.stopRefresh(id);
    return this.repository.delete(id);
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * List watchlists for a user
   */
  async listWatchlistsByUser(ownerUserId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Watchlist>> {
    return this.repository.listByUser(ownerUserId, page, pageSize);
  }

  /**
   * List enabled watchlists
   */
  async listEnabledWatchlists(page = 0, pageSize = 50): Promise<IPaginatedResult<Watchlist>> {
    return this.repository.listEnabled(page, pageSize);
  }

  // ============================================================================
  // Watchlist Hit Operations
  // ============================================================================

  /**
   * Create a watchlist hit
   */
  async createWatchlistHit(input: CreateWatchlistHitInput): Promise<IQueryResult<WatchlistHit>> {
    return this.repository.createHit(input);
  }

  /**
   * Get a watchlist hit by ID
   */
  async getWatchlistHit(id: string): Promise<IQueryResult<WatchlistHit | null>> {
    return this.repository.getHit(id);
  }

  /**
   * Update a watchlist hit
   */
  async updateWatchlistHit(id: string, updates: UpdateWatchlistHitInput): Promise<IQueryResult<WatchlistHit>> {
    return this.repository.updateHit(id, updates);
  }

  /**
   * List hits for a watchlist
   */
  async listWatchlistHits(watchlistId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<WatchlistHit>> {
    return this.repository.listHits(watchlistId, page, pageSize);
  }

  /**
   * List unseen hits for a watchlist
   */
  async listUnseenWatchlistHits(watchlistId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<WatchlistHit>> {
    return this.repository.listUnseenHits(watchlistId, page, pageSize);
  }

  /**
   * Mark all hits for a watchlist as seen
   */
  async markAllHitsSeen(watchlistId: string): Promise<IQueryResult<number>> {
    return this.repository.markAllHitsSeen(watchlistId);
  }

  /**
   * Delete all hits for a watchlist
   */
  async deleteWatchlistHits(watchlistId: string): Promise<IQueryResult<number>> {
    return this.repository.deleteHits(watchlistId);
  }

  // ============================================================================
  // Refresh/Schedule Operations
  // ============================================================================

  /**
   * Schedule automatic refresh for a watchlist
   */
  scheduleRefresh(watchlistId: string, cadence: string): void {
    this.stopRefresh(watchlistId);

    const intervalMs = this.parseCadenceToMs(cadence);
    if (intervalMs === null) {
      console.warn(`[WatchlistService] Invalid cadence: ${cadence}`);
      return;
    }

    const interval = setInterval(async () => {
      await this.refreshWatchlist(watchlistId);
    }, intervalMs);

    this.refreshIntervals.set(watchlistId, interval);
    console.log(`[WatchlistService] Scheduled refresh for ${watchlistId} with cadence ${cadence}`);
  }

  /**
   * Stop automatic refresh for a watchlist
   */
  stopRefresh(watchlistId: string): void {
    const interval = this.refreshIntervals.get(watchlistId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(watchlistId);
      console.log(`[WatchlistService] Stopped refresh for ${watchlistId}`);
    }
  }

  /**
   * Refresh a watchlist (check for new matches)
   */
  async refreshWatchlist(watchlistId: string): Promise<IQueryResult<WatchlistHit[]>> {
    try {
      const watchlistResult = await this.repository.get(watchlistId);
      if (!watchlistResult.success || !watchlistResult.data) {
        return { success: false, error: 'Watchlist not found', data: [] };
      }

      const watchlist = watchlistResult.data;
      if (!watchlist.enabled) {
        return { success: true, data: [] };
      }

      // Parse criteria and check for matches
      const criteria = JSON.parse(watchlist.criteriaJson);
      const matches = await this.checkCriteria(criteria);

      // Create hits for new matches
      const hits: WatchlistHit[] = [];
      for (const match of matches) {
        const hitResult = await this.repository.createHit({
          watchlistId,
          payloadJson: JSON.stringify(match),
          matchedAt: Date.now(),
        });
        if (hitResult.success && hitResult.data) {
          hits.push(hitResult.data);
        }
      }

      return { success: true, data: hits };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[WatchlistService] Refresh error for ${watchlistId}:`, error);
      return { success: false, error: message, data: [] };
    }
  }

  /**
   * Stop all refresh intervals
   */
  stopAllRefreshes(): void {
    for (const [watchlistId, interval] of this.refreshIntervals) {
      clearInterval(interval);
      console.log(`[WatchlistService] Stopped refresh for ${watchlistId}`);
    }
    this.refreshIntervals.clear();
  }

  /**
   * Start refresh for all enabled watchlists
   */
  async startAllEnabledRefreshes(): Promise<void> {
    const result = await this.repository.listEnabled(0, 100);
    for (const watchlist of result.data) {
      if (watchlist.enabled && watchlist.cadence) {
        this.scheduleRefresh(watchlist.id, watchlist.cadence);
      }
    }
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate watchlist input
   */
  validateWatchlistInput(
    input: CreateWatchlistInput | UpdateWatchlistInput,
    isUpdate = false
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!isUpdate && (input as CreateWatchlistInput).name) {
      const name = (input as CreateWatchlistInput).name;
      if (name.trim().length === 0) {
        errors.push('Name is required');
      }
    }

    if (!isUpdate && (input as CreateWatchlistInput).criteriaJson) {
      const criteriaJson = (input as CreateWatchlistInput).criteriaJson;
      try {
        JSON.parse(criteriaJson);
      } catch {
        errors.push('Invalid criteria JSON');
      }
    }

    if (input.criteriaJson !== undefined) {
      try {
        JSON.parse(input.criteriaJson);
      } catch {
        errors.push('Invalid criteria JSON');
      }
    }

    if (input.cadence !== undefined && !this.isValidCadence(input.cadence)) {
      errors.push('Invalid cadence (use: hourly, daily, weekly, monthly)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidCadence(cadence: string): boolean {
    const validCadences = ['hourly', 'daily', 'weekly', 'monthly'];
    return validCadences.includes(cadence);
  }

  private parseCadenceToMs(cadence: string): number | null {
    const cadenceMap: Record<string, number> = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };
    return cadenceMap[cadence] ?? null;
  }

  /**
   * Check criteria against data sources (placeholder for actual implementation)
   */
  private async checkCriteria(criteria: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    // This is a placeholder for the actual criteria checking logic
    // In a real implementation, this would query company data, deal data, etc.
    // and return matches based on the criteria
    console.log('[WatchlistService] Checking criteria:', criteria);
    return [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let watchlistServiceInstance: WatchlistService | null = null;

export function getWatchlistService(): WatchlistService {
  if (!watchlistServiceInstance) {
    watchlistServiceInstance = new WatchlistService();
  }
  return watchlistServiceInstance;
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  Watchlist,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistHit,
  CreateWatchlistHitInput,
  UpdateWatchlistHitInput,
};
