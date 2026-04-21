/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * M&A Company Enrichment Job
 * Cron job for daily company enrichment from SIRENE
 * Channel: ma.enrichment.companies-daily
 */

import { getCompanyEnrichmentService } from '../ma/CompanyEnrichmentService';

export interface MaEnrichmentJobConfig {
  batchSize?: number;
  maxAgeHours?: number;
}

export class MaEnrichmentJob {
  readonly channel = 'ma.enrichment.companies-daily';
  private readonly defaultConfig: Required<MaEnrichmentJobConfig> = {
    batchSize: 50,
    maxAgeHours: 24 * 7,
  };

  constructor(private config: MaEnrichmentJobConfig = {}) {}

  async execute(): Promise<{ success: boolean; enriched: number; errors: number }> {
    const { getDatabase } = await import('../database');
    const db = await getDatabase();
    const service = getCompanyEnrichmentService(db);
    const finalConfig = { ...this.defaultConfig, ...this.config };

    try {
      const cutoffTime = Date.now() - finalConfig.maxAgeHours * 60 * 60 * 1000;
      const companies = (db as any).db
        .prepare('SELECT * FROM ma_companies WHERE last_enriched_at IS NULL OR last_enriched_at < ?')
        .all(cutoffTime);

      if (!companies || companies.length === 0) {
        return { success: true, enriched: 0, errors: 0 };
      }

      let enriched = 0;
      let errors = 0;

      for (let i = 0; i < companies.length; i += finalConfig.batchSize) {
        const batch = companies.slice(i, i + finalConfig.batchSize);
        const companyIds = batch.map((c: any) => c.id);

        const results = await service.batchEnrich(companyIds);

        enriched += results.size;
        errors += batch.length - results.size;
      }

      return { success: true, enriched, errors };
    } catch (error) {
      console.error('MaEnrichmentJob failed:', error);
      return { success: false, enriched: 0, errors: 1 };
    }
  }
}

export function createMaEnrichmentJob(config?: MaEnrichmentJobConfig): MaEnrichmentJob {
  return new MaEnrichmentJob(config);
}
