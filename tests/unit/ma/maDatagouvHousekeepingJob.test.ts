/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MaDatagouvHousekeepingJob', () => {
  let job: any;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      deleteExpired: vi.fn(),
    };

    vi.doMock('@process/services/database/repositories/ma/DatagouvCacheRepository', () => ({
      getDatagouvCacheRepository: vi.fn(() => mockRepo),
    }));

    const { MaDatagouvHousekeepingJob: JobClass } = require('@process/services/cron/maDatagouvHousekeepingJob');
    job = new JobClass();
  });

  describe('execute', () => {
    it('should delete expired cache entries', async () => {
      mockRepo.deleteExpired.mockResolvedValue({ success: true, data: 10 });

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(10);
      expect(result.errors).toBe(0);
    });

    it('should return success with zero deleted if no expired entries', async () => {
      mockRepo.deleteExpired.mockResolvedValue({ success: true, data: 0 });

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle repository errors gracefully', async () => {
      mockRepo.deleteExpired.mockResolvedValue({ success: false, data: null });

      const result = await job.execute();

      expect(result.success).toBe(false);
      expect(result.deleted).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockRepo.deleteExpired.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await job.execute();

      expect(result.success).toBe(false);
      expect(result.deleted).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should use custom config when provided', async () => {
      mockRepo.deleteExpired.mockResolvedValue({ success: true, data: 5 });

      const jobWithConfig = new (require('@process/services/cron/maDatagouvHousekeepingJob').MaDatagouvHousekeepingJob)(
        {
          ttlMs: 12 * 60 * 60 * 1000,
          batchSize: 50,
        }
      );

      const result = await jobWithConfig.execute();

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(5);
    });
  });

  describe('channel', () => {
    it('should have correct channel name', () => {
      expect(job.channel).toBe('ma.datagouv.housekeeping');
    });
  });
});
