/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Watchlist Refresh/Schedule Integration Tests
 * Tests the end-to-end refresh and scheduling functionality for watchlists.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WatchlistService } from '@process/services/ma/WatchlistService';
import type { Watchlist, CreateWatchlistInput } from '@/common/ma/watchlist/schema';

// Mock the repository
vi.mock('@process/services/database/repositories/ma/WatchlistRepository', () => ({
  getWatchlistRepository: () => ({
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listByUser: vi.fn(),
    listEnabled: vi.fn(),
    createHit: vi.fn(),
    getHit: vi.fn(),
    updateHit: vi.fn(),
    listHits: vi.fn(),
    listUnseenHits: vi.fn(),
    markAllHitsSeen: vi.fn(),
    deleteHits: vi.fn(),
  }),
}));

describe('Watchlist Refresh/Schedule Integration', () => {
  let service: WatchlistService;
  let mockRepository: any;

  beforeEach(() => {
    const { getWatchlistRepository } = require('@process/services/database/repositories/ma/WatchlistRepository');
    mockRepository = getWatchlistRepository();
    service = new WatchlistService();
    // Replace the repository with the mock
    (service as any).repository = mockRepository;
  });

  afterEach(() => {
    // Clean up any scheduled refreshes
    (service as any).stopAllRefreshes();
  });

  describe('Refresh Scheduling Lifecycle', () => {
    it('should automatically schedule refresh when creating enabled watchlist with cadence', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'daily',
      };

      const watchlist: Watchlist = {
        id: 'watchlist_123',
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'daily',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.create.mockResolvedValue({ success: true, data: watchlist });

      await service.createWatchlist(input);

      // Verify that a refresh interval was scheduled
      expect((service as any).refreshIntervals.has('watchlist_123')).toBe(true);
    });

    it('should not schedule refresh when creating disabled watchlist', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: false,
        cadence: 'daily',
      };

      const watchlist: Watchlist = {
        id: 'watchlist_123',
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: false,
        cadence: 'daily',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.create.mockResolvedValue({ success: true, data: watchlist });

      await service.createWatchlist(input);

      // Verify that no refresh interval was scheduled
      expect((service as any).refreshIntervals.has('watchlist_123')).toBe(false);
    });

    it('should not schedule refresh when creating watchlist without cadence', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
      };

      const watchlist: Watchlist = {
        id: 'watchlist_123',
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.create.mockResolvedValue({ success: true, data: watchlist });

      await service.createWatchlist(input);

      // Verify that no refresh interval was scheduled
      expect((service as any).refreshIntervals.has('watchlist_123')).toBe(false);
    });

    it('should stop refresh when deleting watchlist', async () => {
      const watchlistId = 'watchlist_123';
      mockRepository.delete.mockResolvedValue({ success: true, data: true });

      // Manually schedule a refresh
      service.scheduleRefresh(watchlistId, 'daily');
      expect((service as any).refreshIntervals.has(watchlistId)).toBe(true);

      // Delete the watchlist
      await service.deleteWatchlist(watchlistId);

      // Verify that the refresh was stopped
      expect((service as any).refreshIntervals.has(watchlistId)).toBe(false);
    });

    it('should reschedule refresh when cadence changes', async () => {
      const watchlistId = 'watchlist_123';
      const watchlist: Watchlist = {
        id: watchlistId,
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'hourly',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.update.mockResolvedValue({ success: true, data: watchlist });

      // Manually schedule a refresh with daily cadence
      service.scheduleRefresh(watchlistId, 'daily');
      const firstInterval = (service as any).refreshIntervals.get(watchlistId);

      // Update the watchlist with hourly cadence
      await service.updateWatchlist(watchlistId, { cadence: 'hourly' });

      // Verify that the refresh was rescheduled (interval should be different)
      const secondInterval = (service as any).refreshIntervals.get(watchlistId);
      expect(secondInterval).not.toBe(firstInterval);
    });

    it('should stop refresh when watchlist is disabled', async () => {
      const watchlistId = 'watchlist_123';
      const watchlist: Watchlist = {
        id: watchlistId,
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: false,
        cadence: 'daily',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.update.mockResolvedValue({ success: true, data: watchlist });

      // Manually schedule a refresh
      service.scheduleRefresh(watchlistId, 'daily');
      expect((service as any).refreshIntervals.has(watchlistId)).toBe(true);

      // Disable the watchlist
      await service.updateWatchlist(watchlistId, { enabled: false });

      // Verify that the refresh was stopped
      expect((service as any).refreshIntervals.has(watchlistId)).toBe(false);
    });
  });

  describe('Refresh Execution', () => {
    it('should execute refresh and create hits for matches', async () => {
      const watchlistId = 'watchlist_123';
      const watchlist: Watchlist = {
        id: watchlistId,
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.get.mockResolvedValue({ success: true, data: watchlist });
      mockRepository.createHit.mockResolvedValue({
        success: true,
        data: {
          id: 'hit_1',
          watchlistId,
          payloadJson: '{"company":"TechCorp"}',
          matchedAt: Date.now(),
        },
      });

      const result = await service.refreshWatchlist(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockRepository.get).toHaveBeenCalledWith(watchlistId);
    });

    it('should skip refresh for disabled watchlists', async () => {
      const watchlistId = 'watchlist_123';
      const watchlist: Watchlist = {
        id: watchlistId,
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.get.mockResolvedValue({ success: true, data: watchlist });

      const result = await service.refreshWatchlist(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockRepository.createHit).not.toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      const watchlistId = 'watchlist_123';
      mockRepository.get.mockRejectedValue(new Error('Database error'));

      const result = await service.refreshWatchlist(watchlistId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('Bulk Refresh Operations', () => {
    it('should start refreshes for all enabled watchlists', async () => {
      const enabledWatchlists: Watchlist[] = [
        {
          id: 'watchlist_1',
          ownerUserId: 'user_123',
          name: 'Tech Companies',
          criteriaJson: '{"sector":"technology"}',
          enabled: true,
          cadence: 'daily',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'watchlist_2',
          ownerUserId: 'user_123',
          name: 'Healthcare Companies',
          criteriaJson: '{"sector":"healthcare"}',
          enabled: true,
          cadence: 'hourly',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockRepository.listEnabled.mockResolvedValue({
        success: true,
        data: enabledWatchlists,
        total: 2,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      await service.startAllEnabledRefreshes();

      expect(mockRepository.listEnabled).toHaveBeenCalledWith(0, 100);
      expect((service as any).refreshIntervals.has('watchlist_1')).toBe(true);
      expect((service as any).refreshIntervals.has('watchlist_2')).toBe(true);
    });

    it('should stop all refreshes', () => {
      // Schedule multiple refreshes
      service.scheduleRefresh('watchlist_1', 'daily');
      service.scheduleRefresh('watchlist_2', 'hourly');
      service.scheduleRefresh('watchlist_3', 'weekly');

      expect((service as any).refreshIntervals.size).toBe(3);

      // Stop all refreshes
      service.stopAllRefreshes();

      expect((service as any).refreshIntervals.size).toBe(0);
    });
  });

  describe('Cadence Parsing', () => {
    it('should parse valid cadence strings correctly', () => {
      const testCases = [
        { cadence: 'hourly', expectedMs: 60 * 60 * 1000 },
        { cadence: 'daily', expectedMs: 24 * 60 * 60 * 1000 },
        { cadence: 'weekly', expectedMs: 7 * 24 * 60 * 60 * 1000 },
        { cadence: 'monthly', expectedMs: 30 * 24 * 60 * 60 * 1000 },
      ];

      for (const testCase of testCases) {
        const result = (service as any).parseCadenceToMs(testCase.cadence);
        expect(result).toBe(testCase.expectedMs);
      }
    });

    it('should return null for invalid cadence strings', () => {
      const invalidCadences = ['invalid', 'minutely', 'yearly', ''];

      for (const cadence of invalidCadences) {
        const result = (service as any).parseCadenceToMs(cadence);
        expect(result).toBeNull();
      }
    });
  });
});
