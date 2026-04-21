/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * M&A Watchlist Evaluation Job
 * Cron job for evaluating watchlists against company data
 * Channel: ma.watchlists.evaluate
 */

import { getWatchlistService } from '../ma/WatchlistService';

export interface MaWatchlistJobConfig {
  batchSize?: number;
}

export class MaWatchlistJob {
  readonly channel = 'ma.watchlists.evaluate';
  private readonly defaultConfig: Required<MaWatchlistJobConfig> = {
    batchSize: 100,
  };

  constructor(private config: MaWatchlistJobConfig = {}) {}

  async execute(): Promise<{ success: boolean; evaluated: number; hits: number; errors: number }> {
    const { getDatabase } = await import('../database');
    const db = await getDatabase();
    const service = getWatchlistService(db);
    const finalConfig = { ...this.defaultConfig, ...this.config };

    try {
      const watchlists = await service.list({ enabled: true });

      if (!watchlists || watchlists.length === 0) {
        return { success: true, evaluated: 0, hits: 0, errors: 0 };
      }

      let evaluated = 0;
      let hits = 0;
      let errors = 0;

      for (const watchlist of watchlists) {
        try {
          evaluated++;

          const criteria = JSON.parse(watchlist.criteriaJson);
          const companies = await this.findMatchingCompanies(db, criteria);

          for (const company of companies) {
            const existingHits = await service.getHitsByWatchlistId(watchlist.id);
            const alreadyHit = existingHits.some((h) => h.payloadJson.includes(company.id));

            if (!alreadyHit) {
              await service.createHit({
                watchlistId: watchlist.id,
                payloadJson: JSON.stringify({ companyId: company.id, criteria }),
                matchedAt: Date.now(),
              });
              hits++;
            }
          }
        } catch (error) {
          console.error(`Failed to evaluate watchlist ${watchlist.id}:`, error);
          errors++;
        }
      }

      return { success: true, evaluated, hits, errors };
    } catch (error) {
      console.error('MaWatchlistJob failed:', error);
      return { success: false, evaluated: 0, hits: 0, errors: 1 };
    }
  }

  private async findMatchingCompanies(db: any, criteria: Record<string, unknown>): Promise<any[]> {
    let query = 'SELECT * FROM ma_companies WHERE 1=1';
    const params: unknown[] = [];

    if (criteria.siren) {
      query += ' AND siren = ?';
      params.push(criteria.siren);
    }
    if (criteria.name) {
      query += ' AND name LIKE ?';
      params.push(`%${criteria.name}%`);
    }
    if (criteria.sectorId) {
      query += ' AND sector_id = ?';
      params.push(criteria.sectorId);
    }
    if (criteria.nafCode) {
      query += ' AND naf_code = ?';
      params.push(criteria.nafCode);
    }

    const companies = (db as any).db.prepare(query).all(...params);
    return companies ?? [];
  }
}

export function createMaWatchlistJob(config?: MaWatchlistJobConfig): MaWatchlistJob {
  return new MaWatchlistJob(config);
}
