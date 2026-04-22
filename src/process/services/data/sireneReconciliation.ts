/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cache reconciliation service for SIRENE data
 * Handles merging stale cached data with fresh API responses
 */

import { getSireneCacheRepository } from '@process/services/database/repositories/ma/SireneCacheRepository';
import { getSireneClient } from './sireneClient';
import type { SireneCompany } from './sireneClient';

export interface ReconciliationResult {
  success: boolean;
  staleCount: number;
  refreshedCount: number;
  failedCount: number;
  errors: Array<{ key: string; error: string }>;
}

export interface ReconciliationConfig {
  maxConcurrent?: number;
  batchSize?: number;
  staleThreshold?: number; // milliseconds
}

/**
 * Reconciliation service for SIRENE cache
 */
export class SireneReconciliationService {
  private cacheRepo: ReturnType<typeof getSireneCacheRepository>;
  private sireneClient: ReturnType<typeof getSireneClient>;

  constructor() {
    this.cacheRepo = getSireneCacheRepository();
    this.sireneClient = getSireneClient();
  }

  /**
   * Reconcile all stale cache entries
   */
  async reconcile(config: ReconciliationConfig = {}): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      success: true,
      staleCount: 0,
      refreshedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Get all stale entries
      const staleResult = await this.cacheRepo.getStaleEntries();
      if (!staleResult.success) {
        return {
          ...result,
          success: false,
          errors: [{ key: 'all', error: staleResult.error ?? 'Failed to get stale entries' }],
        };
      }

      const staleEntries = staleResult.data;
      result.staleCount = staleEntries.length;

      if (staleEntries.length === 0) {
        return result;
      }

      // Process in batches
      const batchSize = config.batchSize ?? 10;
      for (let i = 0; i < staleEntries.length; i += batchSize) {
        const batch = staleEntries.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map((entry) => this.reconcileEntry(entry)));

        for (const batchResult of batchResults) {
          if (batchResult.status === 'fulfilled') {
            if (batchResult.value.success) {
              result.refreshedCount++;
            } else {
              result.failedCount++;
              result.errors.push(batchResult.value.error);
            }
          } else {
            result.failedCount++;
            result.errors.push({ key: 'unknown', error: batchResult.reason?.message ?? 'Unknown error' });
          }
        }
      }
    } catch (error) {
      return {
        ...result,
        success: false,
        errors: [{ key: 'all', error: error instanceof Error ? error.message : String(error) }],
      };
    }

    return result;
  }

  /**
   * Reconcile a single cache entry
   */
  private async reconcileEntry(entry: {
    id: string;
    apiSurface: string;
    keyJson: string;
    payloadJson: string;
  }): Promise<{ success: boolean; error?: { key: string; error: string } }> {
    try {
      // Parse the key to extract parameters
      const key = JSON.parse(entry.keyJson);
      const apiSurface = entry.apiSurface;

      // Determine the appropriate refresh strategy based on API surface
      if (apiSurface === 'search') {
        return await this.reconcileSearchEntry(entry, key);
      } else if (apiSurface === 'getBySiren') {
        return await this.reconcileSirenEntry(entry, key);
      } else if (apiSurface === 'getBySiret') {
        return await this.reconcileSiretEntry(entry, key);
      } else {
        // Unknown API surface - skip
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: { key: entry.keyJson, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Reconcile a search entry
   */
  private async reconcileSearchEntry(
    entry: { id: string; keyJson: string },
    key: Record<string, unknown>
  ): Promise<{ success: boolean; error?: { key: string; error: string } }> {
    try {
      const params = key.params as Record<string, unknown>;
      const freshData = await this.sireneClient.search(params);

      // Update cache with fresh data
      await this.cacheRepo.update(
        entry.id,
        JSON.stringify(freshData),
        24 * 60 * 60 * 1000, // 24 hours TTL
        `https://recherche-entreprises.api.gouv.fr/search`
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { key: entry.keyJson, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Reconcile a SIREN lookup entry
   */
  private async reconcileSirenEntry(
    entry: { id: string; keyJson: string },
    key: Record<string, unknown>
  ): Promise<{ success: boolean; error?: { key: string; error: string } }> {
    try {
      const params = key.params as { siren?: string } | undefined;
      const siren = params?.siren;
      if (!siren) {
        return { success: false, error: { key: entry.keyJson, error: 'Missing SIREN in cache key' } };
      }

      const freshData = await this.sireneClient.getBySiren(siren);

      if (!freshData) {
        // Company not found - delete cache entry
        await this.cacheRepo.delete(entry.id);
        return { success: true };
      }

      // Update cache with fresh data
      await this.cacheRepo.update(
        entry.id,
        JSON.stringify(freshData),
        24 * 60 * 60 * 1000, // 24 hours TTL
        `https://recherche-entreprises.api.gouv.fr/search?siren=${siren}`
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { key: entry.keyJson, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Reconcile a SIRET lookup entry
   */
  private async reconcileSiretEntry(
    entry: { id: string; keyJson: string },
    key: Record<string, unknown>
  ): Promise<{ success: boolean; error?: { key: string; error: string } }> {
    try {
      const params = key.params as { siret?: string } | undefined;
      const siret = params?.siret;
      if (!siret) {
        return { success: false, error: { key: entry.keyJson, error: 'Missing SIRET in cache key' } };
      }

      const freshData = await this.sireneClient.getBySiret(siret);

      if (!freshData) {
        // Company not found - delete cache entry
        await this.cacheRepo.delete(entry.id);
        return { success: true };
      }

      // Update cache with fresh data
      await this.cacheRepo.update(
        entry.id,
        JSON.stringify(freshData),
        24 * 60 * 60 * 1000, // 24 hours TTL
        `https://recherche-entreprises.api.gouv.fr/search?siret=${siret}`
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { key: entry.keyJson, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Merge cached data with fresh API response
   * Preserves source evidence from both sources
   */
  mergeWithCache<T extends Record<string, unknown>>(
    freshData: T,
    cachedData: T | null
  ): { data: T; sources: string[] } {
    if (!cachedData) {
      return { data: freshData, sources: ['api'] };
    }

    // Merge strategy: fresh data takes precedence, but track both sources
    const merged = { ...freshData };
    const sources = ['api', 'cache'];

    // Add metadata about merge
    (merged as Record<string, unknown>)['_mergeInfo'] = {
      mergedAt: new Date().toISOString(),
      freshDataFetchedAt: (freshData as Record<string, unknown>)['fetchedAt'],
      cachedDataFetchedAt: (cachedData as Record<string, unknown>)['fetchedAt'],
    };

    return { data: merged, sources };
  }

  /**
   * Check if cached data is stale based on threshold
   */
  isStale(fetchedAt: number, thresholdMs: number = 24 * 60 * 60 * 1000): boolean {
    return Date.now() - fetchedAt > thresholdMs;
  }

  /**
   * Get reconciliation statistics
   */
  async getStats(): Promise<{ total: number; expired: number; stale: number }> {
    const stats = await this.cacheRepo.getStats();
    return stats.success ? stats.data : { total: 0, expired: 0, stale: 0 };
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpired(): Promise<number> {
    const result = await this.cacheRepo.deleteExpired();
    return result.success ? result.data : 0;
  }
}

// Singleton instance
let sireneReconciliationServiceInstance: SireneReconciliationService | null = null;

export function getSireneReconciliationService(): SireneReconciliationService {
  if (!sireneReconciliationServiceInstance) {
    sireneReconciliationServiceInstance = new SireneReconciliationService();
  }
  return sireneReconciliationServiceInstance;
}
