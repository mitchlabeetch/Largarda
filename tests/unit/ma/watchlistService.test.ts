/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WatchlistService } from '@process/services/ma/WatchlistService';
import type { Watchlist, WatchlistHit, CreateWatchlistInput, UpdateWatchlistInput } from '@common/ma/watchlist/schema';

describe('WatchlistService', () => {
  let mockDb: any;
  let service: WatchlistService;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new WatchlistService(mockDb);
  });

  describe('create', () => {
    it('should create a watchlist with valid input', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user-123',
        name: 'Tech Companies',
        criteriaJson: JSON.stringify({ sector: 'technology' }),
      };

      mockDb.insert.mockResolvedValue(undefined);

      const result = await service.create(input);

      expect(mockDb.insert).toHaveBeenCalledWith(
        'ma_watchlists',
        expect.objectContaining({
          owner_user_id: 'user-123',
          name: 'Tech Companies',
          criteria_json: JSON.stringify({ sector: 'technology' }),
          enabled: 1,
        })
      );
      expect(result.ownerUserId).toBe('user-123');
      expect(result.name).toBe('Tech Companies');
      expect(result.enabled).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should create watchlist with cadence', async () => {
      const input: CreateWatchlistInput = {
        ownerUserId: 'user-123',
        name: 'Daily Watchlist',
        criteriaJson: JSON.stringify({ sector: 'finance' }),
        cadence: 'daily',
      };

      mockDb.insert.mockResolvedValue(undefined);

      const result = await service.create(input);

      expect(mockDb.insert).toHaveBeenCalledWith(
        'ma_watchlists',
        expect.objectContaining({
          cadence: 'daily',
        })
      );
      expect(result.cadence).toBe('daily');
    });
  });

  describe('getById', () => {
    it('should return watchlist by id', async () => {
      const mockRow = {
        id: 'watchlist-123',
        owner_user_id: 'user-123',
        name: 'Tech Companies',
        criteria_json: JSON.stringify({ sector: 'technology' }),
        cadence: 'daily',
        enabled: 1,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      mockDb.select.mockResolvedValue(mockRow);

      const result = await service.getById('watchlist-123');

      expect(mockDb.select).toHaveBeenCalledWith('ma_watchlists', { id: 'watchlist-123' });
      expect(result).toEqual({
        id: 'watchlist-123',
        ownerUserId: 'user-123',
        name: 'Tech Companies',
        criteriaJson: JSON.stringify({ sector: 'technology' }),
        cadence: 'daily',
        enabled: true,
        createdAt: 1234567890,
        updatedAt: 1234567890,
      });
    });

    it('should return null if watchlist not found', async () => {
      mockDb.select.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all watchlists when no filters provided', async () => {
      const mockRows = [
        {
          id: 'watchlist-1',
          owner_user_id: 'user-123',
          name: 'Tech Companies',
          criteria_json: JSON.stringify({ sector: 'technology' }),
          cadence: 'daily',
          enabled: 1,
          created_at: 1234567890,
          updated_at: 1234567890,
        },
        {
          id: 'watchlist-2',
          owner_user_id: 'user-123',
          name: 'Finance Companies',
          criteria_json: JSON.stringify({ sector: 'finance' }),
          cadence: 'weekly',
          enabled: 1,
          created_at: 1234567891,
          updated_at: 1234567891,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.list({});

      expect(mockDb.select).toHaveBeenCalledWith('ma_watchlists', {});
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Tech Companies');
      expect(result[1].name).toBe('Finance Companies');
    });

    it('should filter watchlists by owner', async () => {
      const mockRows = [
        {
          id: 'watchlist-1',
          owner_user_id: 'user-123',
          name: 'Tech Companies',
          criteria_json: JSON.stringify({ sector: 'technology' }),
          cadence: 'daily',
          enabled: 1,
          created_at: 1234567890,
          updated_at: 1234567890,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.list({ ownerUserId: 'user-123' });

      expect(mockDb.select).toHaveBeenCalledWith('ma_watchlists', { owner_user_id: 'user-123' });
      expect(result).toHaveLength(1);
      expect(result[0].ownerUserId).toBe('user-123');
    });

    it('should filter watchlists by enabled status', async () => {
      const mockRows = [
        {
          id: 'watchlist-1',
          owner_user_id: 'user-123',
          name: 'Tech Companies',
          criteria_json: JSON.stringify({ sector: 'technology' }),
          cadence: 'daily',
          enabled: 1,
          created_at: 1234567890,
          updated_at: 1234567890,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.list({ enabled: true });

      expect(mockDb.select).toHaveBeenCalledWith('ma_watchlists', { enabled: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].enabled).toBe(true);
    });
  });

  describe('update', () => {
    it('should update watchlist with valid input', async () => {
      const input: UpdateWatchlistInput = {
        name: 'Updated Name',
        enabled: false,
      };

      const mockRow = {
        id: 'watchlist-123',
        owner_user_id: 'user-123',
        name: 'Updated Name',
        criteria_json: JSON.stringify({ sector: 'technology' }),
        cadence: 'daily',
        enabled: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      mockDb.update.mockResolvedValue(1);
      mockDb.select.mockResolvedValue(mockRow);

      const result = await service.update('watchlist-123', input);

      expect(mockDb.update).toHaveBeenCalledWith(
        'ma_watchlists',
        { id: 'watchlist-123' },
        expect.objectContaining({
          name: 'Updated Name',
          enabled: 0,
          updated_at: expect.any(Number),
        })
      );
      expect(result.name).toBe('Updated Name');
      expect(result.enabled).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete watchlist by id', async () => {
      mockDb.delete.mockResolvedValue(1);

      await service.delete('watchlist-123');

      expect(mockDb.delete).toHaveBeenCalledWith('ma_watchlists', { id: 'watchlist-123' });
    });
  });

  describe('createHit', () => {
    it('should create a watchlist hit', async () => {
      mockDb.insert.mockResolvedValue(undefined);

      await service.createHit({
        watchlistId: 'watchlist-123',
        payloadJson: JSON.stringify({ companyId: 'company-123' }),
        matchedAt: 1234567890,
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        'ma_watchlist_hits',
        expect.objectContaining({
          watchlist_id: 'watchlist-123',
          payload_json: JSON.stringify({ companyId: 'company-123' }),
          matched_at: 1234567890,
          seen_at: null,
        })
      );
    });
  });

  describe('getHitsByWatchlistId', () => {
    it('should return hits for a watchlist', async () => {
      const mockRows = [
        {
          id: 'hit-1',
          watchlist_id: 'watchlist-123',
          payload_json: JSON.stringify({ companyId: 'company-1' }),
          matched_at: 1234567890,
          seen_at: null,
        },
        {
          id: 'hit-2',
          watchlist_id: 'watchlist-123',
          payload_json: JSON.stringify({ companyId: 'company-2' }),
          matched_at: 1234567891,
          seen_at: 1234567900,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.getHitsByWatchlistId('watchlist-123');

      expect(mockDb.select).toHaveBeenCalledWith('ma_watchlist_hits', { watchlist_id: 'watchlist-123' });
      expect(result).toHaveLength(2);
      expect(result[0].watchlistId).toBe('watchlist-123');
    });
  });

  describe('markHitAsSeen', () => {
    it('should mark a hit as seen', async () => {
      mockDb.update.mockResolvedValue(1);

      await service.markHitAsSeen('hit-123');

      expect(mockDb.update).toHaveBeenCalledWith(
        'ma_watchlist_hits',
        { id: 'hit-123' },
        expect.objectContaining({
          seen_at: expect.any(Number),
        })
      );
    });
  });
});
