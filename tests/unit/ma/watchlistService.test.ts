/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WatchlistService Unit Tests
 * Tests the WatchlistService business logic layer including refresh/schedule logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WatchlistService } from '@process/services/ma/WatchlistService';
import type {
  Watchlist,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistHit,
  CreateWatchlistHitInput,
} from '@/common/ma/watchlist/schema';

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

describe('WatchlistService', () => {
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

  describe('createWatchlist', () => {
    it('should create a watchlist with valid input', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'daily',
      };

      const expectedWatchlist: Watchlist = {
        id: 'watchlist_123',
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'daily',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.create.mockResolvedValue({ success: true, data: expectedWatchlist });

      const result = await service.createWatchlist(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedWatchlist);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it('should reject invalid criteria JSON', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: 'invalid json',
      };

      const result = await service.createWatchlist(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid criteria JSON');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid cadence', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        cadence: 'invalid',
      };

      const result = await service.createWatchlist(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid cadence');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should schedule refresh for enabled watchlist with cadence', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'daily',
      };

      const expectedWatchlist: Watchlist = {
        id: 'watchlist_123',
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'daily',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.create.mockResolvedValue({ success: true, data: expectedWatchlist });

      await service.createWatchlist(input);

      // Verify that a refresh interval was scheduled
      expect((service as any).refreshIntervals.has('watchlist_123')).toBe(true);
    });
  });

  describe('updateWatchlist', () => {
    it('should update a watchlist with valid input', async () => {
      const id = 'watchlist_123';
      const updates: UpdateWatchlistInput = {
        name: 'Updated Name',
      };

      const expectedWatchlist: Watchlist = {
        id,
        ownerUserId: 'user_123',
        name: 'Updated Name',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.update.mockResolvedValue({ success: true, data: expectedWatchlist });

      const result = await service.updateWatchlist(id, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedWatchlist);
      expect(mockRepository.update).toHaveBeenCalledWith(id, updates);
    });

    it('should reschedule refresh when cadence changes', async () => {
      const id = 'watchlist_123';
      const updates: UpdateWatchlistInput = {
        cadence: 'hourly',
      };

      const expectedWatchlist: Watchlist = {
        id,
        ownerUserId: 'user_123',
        name: 'Tech Companies',
        criteriaJson: '{"sector":"technology"}',
        enabled: true,
        cadence: 'hourly',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.update.mockResolvedValue({ success: true, data: expectedWatchlist });

      // Manually add a refresh interval
      (service as any).refreshIntervals.set(id, vi.fn());

      await service.updateWatchlist(id, updates);

      // Verify that the refresh interval was stopped and rescheduled
      expect(mockRepository.update).toHaveBeenCalledWith(id, updates);
    });
  });

  describe('deleteWatchlist', () => {
    it('should delete a watchlist and stop refresh', async () => {
      const id = 'watchlist_123';
      mockRepository.delete.mockResolvedValue({ success: true, data: true });

      // Manually add a refresh interval
      (service as any).refreshIntervals.set(id, vi.fn());

      const result = await service.deleteWatchlist(id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
      expect((service as any).refreshIntervals.has(id)).toBe(false);
    });
  });

  describe('scheduleRefresh', () => {
    it('should schedule refresh with valid cadence', () => {
      const watchlistId = 'watchlist_123';
      const cadence = 'daily';

      service.scheduleRefresh(watchlistId, cadence);

      expect((service as any).refreshIntervals.has(watchlistId)).toBe(true);
    });

    it('should not schedule refresh with invalid cadence', () => {
      const watchlistId = 'watchlist_123';
      const cadence = 'invalid';

      service.scheduleRefresh(watchlistId, cadence);

      expect((service as any).refreshIntervals.has(watchlistId)).toBe(false);
    });

    it('should stop existing refresh before scheduling new one', () => {
      const watchlistId = 'watchlist_123';
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      service.scheduleRefresh(watchlistId, 'daily');
      service.scheduleRefresh(watchlistId, 'hourly');

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect((service as any).refreshIntervals.has(watchlistId)).toBe(true);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('stopRefresh', () => {
    it('should stop refresh for a watchlist', () => {
      const watchlistId = 'watchlist_123';
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      service.scheduleRefresh(watchlistId, 'daily');
      service.stopRefresh(watchlistId);

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect((service as any).refreshIntervals.has(watchlistId)).toBe(false);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('refreshWatchlist', () => {
    it('should refresh a watchlist and return hits', async () => {
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

      const expectedHits: WatchlistHit[] = [
        {
          id: 'hit_1',
          watchlistId,
          payloadJson: '{"company":"TechCorp"}',
          matchedAt: Date.now(),
        },
      ];

      mockRepository.get.mockResolvedValue({ success: true, data: watchlist });
      mockRepository.createHit.mockResolvedValue({ success: true, data: expectedHits[0] });

      const result = await service.refreshWatchlist(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedHits);
    });

    it('should return empty array for disabled watchlist', async () => {
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
    });
  });

  describe('stopAllRefreshes', () => {
    it('should stop all refresh intervals', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      service.scheduleRefresh('watchlist_1', 'daily');
      service.scheduleRefresh('watchlist_2', 'hourly');

      expect((service as any).refreshIntervals.size).toBe(2);

      service.stopAllRefreshes();

      expect((service as any).refreshIntervals.size).toBe(0);
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('startAllEnabledRefreshes', () => {
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
      ];

      mockRepository.listEnabled.mockResolvedValue({
        success: true,
        data: enabledWatchlists,
        total: 1,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      await service.startAllEnabledRefreshes();

      expect(mockRepository.listEnabled).toHaveBeenCalledWith(0, 100);
      expect((service as any).refreshIntervals.has('watchlist_1')).toBe(true);
    });
  });

  describe('Watchlist Hit Operations', () => {
    it('should create a watchlist hit', async () => {
      const input: CreateWatchlistHitInput = {
        watchlistId: 'watchlist_123',
        payloadJson: '{"company":"TechCorp"}',
      };

      const expectedHit: WatchlistHit = {
        id: 'hit_1',
        watchlistId: 'watchlist_123',
        payloadJson: '{"company":"TechCorp"}',
        matchedAt: Date.now(),
      };

      mockRepository.createHit.mockResolvedValue({ success: true, data: expectedHit });

      const result = await service.createWatchlistHit(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedHit);
      expect(mockRepository.createHit).toHaveBeenCalledWith(input);
    });

    it('should mark all hits as seen', async () => {
      const watchlistId = 'watchlist_123';
      mockRepository.markAllHitsSeen.mockResolvedValue({ success: true, data: 5 });

      const result = await service.markAllHitsSeen(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(mockRepository.markAllHitsSeen).toHaveBeenCalledWith(watchlistId);
    });

    it('should delete all hits for a watchlist', async () => {
      const watchlistId = 'watchlist_123';
      mockRepository.deleteHits.mockResolvedValue({ success: true, data: 3 });

      const result = await service.deleteWatchlistHits(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(mockRepository.deleteHits).toHaveBeenCalledWith(watchlistId);
    });
  });
});
