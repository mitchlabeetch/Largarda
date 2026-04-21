/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  db: {
    prepare: vi.fn().mockReturnValue({
      all: vi.fn(),
    }),
  },
};

const mockService = {
  batchEnrich: vi.fn(),
};

vi.mock('../../src/process/services/database', () => ({
  getDatabase: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock('../../src/process/services/ma/CompanyEnrichmentService', () => ({
  getCompanyEnrichmentService: vi.fn(() => mockService),
}));

describe('MaEnrichmentJob', () => {
  let job: any;
  let MaEnrichmentJob: any;

  beforeEach(async () => {
    const module = await import('../../src/process/services/cron/maEnrichmentJob');
    MaEnrichmentJob = module.MaEnrichmentJob;
    job = new MaEnrichmentJob();
  });

  describe('execute', () => {
    it('should enrich companies that need enrichment', async () => {
      const companies = [{ id: 'company-1' }, { id: 'company-2' }];

      mockDb.db.prepare().all.mockReturnValue(companies);
      mockService.batchEnrich.mockResolvedValue(
        new Map([
          ['company-1', {}],
          ['company-2', {}],
        ])
      );

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.enriched).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should return success with zero enriched if no companies need enrichment', async () => {
      mockDb.db.prepare().all.mockReturnValue([]);

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.enriched).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockDb.db.prepare().all.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await job.execute();

      expect(result.success).toBe(false);
      expect(result.enriched).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should process companies in batches', async () => {
      const companies = Array.from({ length: 150 }, (_, i) => ({ id: `company-${i}` }));

      mockDb.db.prepare().all.mockReturnValue(companies);
      mockService.batchEnrich.mockResolvedValue(new Map());

      const jobWithBatchSize = new MaEnrichmentJob({ batchSize: 50 });
      const result = await jobWithBatchSize.execute();

      expect(mockService.batchEnrich).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });
  });

  describe('channel', () => {
    it('should have correct channel name', () => {
      expect(job.channel).toBe('ma.enrichment.companies-daily');
    });
  });
});
