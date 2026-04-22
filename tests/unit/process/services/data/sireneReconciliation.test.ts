/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for SIRENE cache reconciliation and stale-data handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SireneReconciliationService } from '@process/services/data/sireneReconciliation';
import { getSireneCacheRepository } from '@process/services/database/repositories/ma/SireneCacheRepository';
import { getSireneClient } from '@process/services/data/sireneClient';

// Mock dependencies
vi.mock('@process/services/database/repositories/ma/SireneCacheRepository');
vi.mock('@process/services/data/sireneClient');

describe('SireneReconciliationService', () => {
  let service: SireneReconciliationService;
  let mockCacheRepo: any;
  let mockSireneClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Get mock instances
    mockCacheRepo = {
      getStaleEntries: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getStats: vi.fn(),
      deleteExpired: vi.fn(),
      clear: vi.fn(),
    };
    mockSireneClient = {
      search: vi.fn(),
      getBySiren: vi.fn(),
      getBySiret: vi.fn(),
    };

    // Setup mock returns
    (getSireneCacheRepository as any).mockReturnValue(mockCacheRepo);
    (getSireneClient as any).mockReturnValue(mockSireneClient);

    service = new SireneReconciliationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reconcile', () => {
    it('should reconcile all stale entries successfully', async () => {
      const staleEntries = [
        {
          id: 'cache_1',
          apiSurface: 'search',
          keyJson: JSON.stringify({ params: { q: 'test' } }),
          payloadJson: '{}',
          fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
          ttlMs: 24 * 60 * 60 * 1000,
        },
        {
          id: 'cache_2',
          apiSurface: 'getBySiren',
          keyJson: JSON.stringify({ params: { siren: '123456789' } }),
          payloadJson: '{}',
          fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
          ttlMs: 24 * 60 * 60 * 1000,
        },
      ];

      mockCacheRepo.getStaleEntries.mockResolvedValue({
        success: true,
        data: staleEntries,
      });

      mockSireneClient.search.mockResolvedValue({
        results: [{ siren: '123456789', nom_complet: 'Test Company' }],
        total_results: 1,
        page: 1,
        per_page: 1,
        total_pages: 1,
      });

      mockSireneClient.getBySiren.mockResolvedValue({
        siren: '123456789',
        nom_complet: 'Test Company',
      });

      mockCacheRepo.update.mockResolvedValue({ success: true, data: true });

      const result = await service.reconcile();

      expect(result.success).toBe(true);
      expect(result.staleCount).toBe(2);
      expect(result.refreshedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle no stale entries', async () => {
      mockCacheRepo.getStaleEntries.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.reconcile();

      expect(result.success).toBe(true);
      expect(result.staleCount).toBe(0);
      expect(result.refreshedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const staleEntries = [
        {
          id: 'cache_1',
          apiSurface: 'search',
          keyJson: JSON.stringify({ params: { q: 'test' } }),
          payloadJson: '{}',
          fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
          ttlMs: 24 * 60 * 60 * 1000,
        },
      ];

      mockCacheRepo.getStaleEntries.mockResolvedValue({
        success: true,
        data: staleEntries,
      });

      mockSireneClient.search.mockRejectedValue(new Error('API error'));

      const result = await service.reconcile();

      expect(result.success).toBe(true); // Overall success even with partial failures
      expect(result.staleCount).toBe(1);
      expect(result.refreshedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('API error');
    });

    it('should process entries in batches', async () => {
      const staleEntries = Array.from({ length: 25 }, (_, i) => ({
        id: `cache_${i}`,
        apiSurface: 'search',
        keyJson: JSON.stringify({ params: { q: `test${i}` } }),
        payloadJson: '{}',
        fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
        ttlMs: 24 * 60 * 60 * 1000,
      }));

      mockCacheRepo.getStaleEntries.mockResolvedValue({
        success: true,
        data: staleEntries,
      });

      mockSireneClient.search.mockResolvedValue({
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      });

      mockCacheRepo.update.mockResolvedValue({ success: true, data: true });

      await service.reconcile({ batchSize: 10 });

      expect(mockSireneClient.search).toHaveBeenCalledTimes(25);
    });

    it('should handle getStaleEntries failure', async () => {
      mockCacheRepo.getStaleEntries.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const result = await service.reconcile();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('mergeWithCache', () => {
    it('should merge fresh data with cache', () => {
      const freshData = { siren: '123456789', nom_complet: 'Fresh Company', fetchedAt: '2025-01-20T00:00:00Z' };
      const cachedData = { siren: '123456789', nom_complet: 'Cached Company', fetchedAt: '2025-01-15T00:00:00Z' };

      const result = service.mergeWithCache(freshData, cachedData);

      expect(result.data.siren).toBe('123456789');
      expect(result.data.nom_complet).toBe('Fresh Company'); // Fresh data takes precedence
      expect(result.sources).toEqual(['api', 'cache']);
      expect(result.data._mergeInfo).toBeDefined();
      expect(result.data._mergeInfo.mergedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return fresh data when cache is null', () => {
      const freshData = { siren: '123456789', nom_complet: 'Fresh Company' };

      const result = service.mergeWithCache(freshData, null);

      expect(result.data).toEqual(freshData);
      expect(result.sources).toEqual(['api']);
    });
  });

  describe('isStale', () => {
    it('should identify stale data beyond threshold', () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const threshold = 24 * 60 * 60 * 1000; // 24 hours

      expect(service.isStale(oldTimestamp, threshold)).toBe(true);
    });

    it('should not identify fresh data as stale', () => {
      const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      const threshold = 24 * 60 * 60 * 1000; // 24 hours

      expect(service.isStale(recentTimestamp, threshold)).toBe(false);
    });

    it('should use default threshold when not provided', () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      expect(service.isStale(oldTimestamp)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockCacheRepo.getStats.mockResolvedValue({
        success: true,
        data: { total: 100, expired: 10, stale: 25 },
      });

      const stats = await service.getStats();

      expect(stats).toEqual({ total: 100, expired: 10, stale: 25 });
      expect(mockCacheRepo.getStats).toHaveBeenCalled();
    });

    it('should return default stats on failure', async () => {
      mockCacheRepo.getStats.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const stats = await service.getStats();

      expect(stats).toEqual({ total: 0, expired: 0, stale: 0 });
    });
  });

  describe('clearExpired', () => {
    it('should clear expired cache entries', async () => {
      mockCacheRepo.deleteExpired.mockResolvedValue({
        success: true,
        data: 5,
      });

      const count = await service.clearExpired();

      expect(count).toBe(5);
      expect(mockCacheRepo.deleteExpired).toHaveBeenCalled();
    });

    it('should return 0 on failure', async () => {
      mockCacheRepo.deleteExpired.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const count = await service.clearExpired();

      expect(count).toBe(0);
    });
  });

  describe('reconcileSirenEntry', () => {
    it('should reconcile SIREN lookup entry', async () => {
      const entry = {
        id: 'cache_1',
        apiSurface: 'getBySiren',
        keyJson: JSON.stringify({ params: { siren: '123456789' } }),
        payloadJson: '{}',
      };

      const key = JSON.parse(entry.keyJson);

      mockSireneClient.getBySiren.mockResolvedValue({
        siren: '123456789',
        nom_complet: 'Updated Company',
      });

      mockCacheRepo.update.mockResolvedValue({ success: true, data: true });

      // Access private method through type assertion
      const result = await (service as any).reconcileSirenEntry(entry, key);

      expect(result.success).toBe(true);
      expect(mockSireneClient.getBySiren).toHaveBeenCalledWith('123456789');
      expect(mockCacheRepo.update).toHaveBeenCalled();
    });

    it('should delete cache entry when company not found', async () => {
      const entry = {
        id: 'cache_1',
        apiSurface: 'getBySiren',
        keyJson: JSON.stringify({ params: { siren: '000000000' } }),
        payloadJson: '{}',
      };

      const key = JSON.parse(entry.keyJson);

      mockSireneClient.getBySiren.mockResolvedValue(null);
      mockCacheRepo.delete.mockResolvedValue({ success: true, data: true });

      const result = await (service as any).reconcileSirenEntry(entry, key);

      expect(result.success).toBe(true);
      expect(mockCacheRepo.delete).toHaveBeenCalledWith('cache_1');
      expect(mockCacheRepo.update).not.toHaveBeenCalled();
    });

    it('should handle missing SIREN in cache key', async () => {
      const entry = {
        id: 'cache_1',
        apiSurface: 'getBySiren',
        keyJson: JSON.stringify({ params: {} }),
        payloadJson: '{}',
      };

      const key = JSON.parse(entry.keyJson);

      const result = await (service as any).reconcileSirenEntry(entry, key);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.error).toBe('Missing SIREN in cache key');
    });
  });

  describe('reconcileSiretEntry', () => {
    it('should reconcile SIRET lookup entry', async () => {
      const entry = {
        id: 'cache_1',
        apiSurface: 'getBySiret',
        keyJson: JSON.stringify({ params: { siret: '12345678900012' } }),
        payloadJson: '{}',
      };

      const key = JSON.parse(entry.keyJson);

      mockSireneClient.getBySiret.mockResolvedValue({
        siren: '123456789',
        nom_complet: 'Updated Company',
        siege: { siret: '12345678900012' },
      });

      mockCacheRepo.update.mockResolvedValue({ success: true, data: true });

      const result = await (service as any).reconcileSiretEntry(entry, key);

      expect(result.success).toBe(true);
      expect(mockSireneClient.getBySiret).toHaveBeenCalledWith('12345678900012');
      expect(mockCacheRepo.update).toHaveBeenCalled();
    });

    it('should delete cache entry when company not found', async () => {
      const entry = {
        id: 'cache_1',
        apiSurface: 'getBySiret',
        keyJson: JSON.stringify({ params: { siret: '00000000000000' } }),
        payloadJson: '{}',
      };

      const key = JSON.parse(entry.keyJson);

      mockSireneClient.getBySiret.mockResolvedValue(null);
      mockCacheRepo.delete.mockResolvedValue({ success: true, data: true });

      const result = await (service as any).reconcileSiretEntry(entry, key);

      expect(result.success).toBe(true);
      expect(mockCacheRepo.delete).toHaveBeenCalledWith('cache_1');
      expect(mockCacheRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('reconcileSearchEntry', () => {
    it('should reconcile search entry', async () => {
      const entry = {
        id: 'cache_1',
        apiSurface: 'search',
        keyJson: JSON.stringify({ params: { q: 'test' } }),
        payloadJson: '{}',
      };

      const key = JSON.parse(entry.keyJson);

      mockSireneClient.search.mockResolvedValue({
        results: [{ siren: '123456789', nom_complet: 'Updated Company' }],
        total_results: 1,
        page: 1,
        per_page: 1,
        total_pages: 1,
      });

      mockCacheRepo.update.mockResolvedValue({ success: true, data: true });

      const result = await (service as any).reconcileSearchEntry(entry, key);

      expect(result.success).toBe(true);
      expect(mockSireneClient.search).toHaveBeenCalledWith({ q: 'test' });
      expect(mockCacheRepo.update).toHaveBeenCalled();
    });
  });
});
