/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MaWatchlistJob', () => {
  let job: any;
  let mockDb: any;
  let mockService: any;

  beforeEach(() => {
    mockDb = {
      db: {
        prepare: vi.fn().mockReturnValue({
          all: vi.fn(),
        }),
      },
    };

    mockService = {
      list: vi.fn(),
      getHitsByWatchlistId: vi.fn(),
      createHit: vi.fn(),
    };

    vi.doMock('@process/services/ma/WatchlistService', () => ({
      getWatchlistService: vi.fn(() => mockService),
    }));

    vi.doMock('@process/services/database', () => ({
      getDatabase: vi.fn().mockResolvedValue(mockDb),
    }));

    const { MaWatchlistJob: JobClass } = require('@process/services/cron/maWatchlistJob');
    job = new JobClass();
  });

  describe('execute', () => {
    it('should evaluate watchlists and create hits', async () => {
      const watchlists = [
        {
          id: 'watchlist-1',
          criteriaJson: JSON.stringify({ siren: '123456789' }),
        },
      ];

      const companies = [{ id: 'company-1', siren: '123456789' }];

      mockService.list.mockResolvedValue(watchlists);
      mockDb.db.prepare().all.mockReturnValue(companies);
      mockService.getHitsByWatchlistId.mockResolvedValue([]);
      mockService.createHit.mockResolvedValue(undefined);

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.evaluated).toBe(1);
      expect(result.hits).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should not create duplicate hits', async () => {
      const watchlists = [
        {
          id: 'watchlist-1',
          criteriaJson: JSON.stringify({ siren: '123456789' }),
        },
      ];

      const companies = [{ id: 'company-1', siren: '123456789' }];

      const existingHit = {
        id: 'hit-1',
        payloadJson: JSON.stringify({ companyId: 'company-1' }),
      };

      mockService.list.mockResolvedValue(watchlists);
      mockDb.db.prepare().all.mockReturnValue(companies);
      mockService.getHitsByWatchlistId.mockResolvedValue([existingHit]);

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.hits).toBe(0);
      expect(mockService.createHit).not.toHaveBeenCalled();
    });

    it('should return success with zero evaluated if no watchlists', async () => {
      mockService.list.mockResolvedValue([]);

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.evaluated).toBe(0);
      expect(result.hits).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockService.list.mockImplementation(() => {
        throw new Error('Service error');
      });

      const result = await job.execute();

      expect(result.success).toBe(false);
      expect(result.evaluated).toBe(0);
    });

    it('should continue evaluating other watchlists if one fails', async () => {
      const watchlists = [
        {
          id: 'watchlist-1',
          criteriaJson: JSON.stringify({ siren: '123456789' }),
        },
        {
          id: 'watchlist-2',
          criteriaJson: 'invalid json',
        },
      ];

      const companies = [{ id: 'company-1', siren: '123456789' }];

      mockService.list.mockResolvedValue(watchlists);
      mockDb.db.prepare().all.mockReturnValue(companies);
      mockService.getHitsByWatchlistId.mockResolvedValue([]);
      mockService.createHit.mockResolvedValue(undefined);

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.evaluated).toBe(2);
      expect(result.hits).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('channel', () => {
    it('should have correct channel name', () => {
      expect(job.channel).toBe('ma.watchlists.evaluate');
    });
  });
});
