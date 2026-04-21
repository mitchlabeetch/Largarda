/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * M&A Data.gouv Housekeeping Job
 * Cron job for cleaning up expired datagouv cache entries
 * Channel: ma.datagouv.housekeeping
 */

import { getDatagouvCacheRepository } from '../database/repositories/ma/DatagouvCacheRepository';

export interface MaDatagouvHousekeepingJobConfig {
  ttlMs?: number;
  batchSize?: number;
}

export class MaDatagouvHousekeepingJob {
  readonly channel = 'ma.datagouv.housekeeping';
  private readonly defaultConfig: Required<MaDatagouvHousekeepingJobConfig> = {
    ttlMs: 24 * 60 * 60 * 1000,
    batchSize: 100,
  };

  constructor(private config: MaDatagouvHousekeepingJobConfig = {}) {}

  async execute(): Promise<{ success: boolean; deleted: number; errors: number }> {
    const repo = getDatagouvCacheRepository();
    const finalConfig = { ...this.defaultConfig, ...this.config };

    try {
      const result = await repo.deleteExpired();

      if (!result.success) {
        return { success: false, deleted: 0, errors: 1 };
      }

      return { success: true, deleted: result.data ?? 0, errors: 0 };
    } catch (error) {
      console.error('MaDatagouvHousekeepingJob failed:', error);
      return { success: false, deleted: 0, errors: 1 };
    }
  }
}

export function createMaDatagouvHousekeepingJob(config?: MaDatagouvHousekeepingJobConfig): MaDatagouvHousekeepingJob {
  return new MaDatagouvHousekeepingJob(config);
}
