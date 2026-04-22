/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CrmSyncService
 * --------------
 * CRM-specific sync implementation extending the base SyncService.
 *
 * Handles CRM synchronization from external providers (HubSpot, Salesforce, Pipedrive, etc.)
 * via Nango integration proxy.
 */

import type { SyncJob, SyncJobProgress } from '@/common/ma/types';
import type { SyncServiceDeps } from '@process/services/ma/SyncService';
import { SyncService } from '@process/services/ma/SyncService';

export interface CrmSyncConfig {
  objectTypes?: string[]; // e.g., ['contacts', 'deals', 'companies']
  since?: string; // ISO date string
  limit?: number; // Max records to fetch per object type
}

export interface CrmSyncResult extends Record<string, unknown> {
  contactsFetched: number;
  dealsFetched: number;
  companiesFetched: number;
  objectTypes: string[];
  dateRange?: { from: string; to: string };
}

export class CrmSyncService extends SyncService {
  constructor(deps: SyncServiceDeps) {
    super({ ...deps, jobType: 'crm' });
  }

  /**
   * Perform CRM sync via Nango proxy.
   * Implements the abstract performSync method from base class.
   */
  protected async performSync(
    job: SyncJob,
    onProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<{ result: Record<string, unknown>; itemsProcessed: number; itemsTotal: number }> {
    const config = job.config as CrmSyncConfig | undefined;
    const objectTypes = config?.objectTypes ?? ['contacts', 'deals', 'companies'];
    const limit = config?.limit ?? 100;

    let totalFetched = 0;
    let totalProcessed = 0;

    for (let i = 0; i < objectTypes.length; i++) {
      const objectType = objectTypes[i];
      const progressBase = 20 + (i / objectTypes.length) * 60;

      onProgress('fetching', progressBase, `Fetching ${objectType} from CRM`);

      // Fetch records for this object type
      const fetched = await this.fetchCrmRecords(job.providerId, objectType, limit);
      totalFetched += fetched;

      const processingProgress = progressBase + 10;
      onProgress('processing', processingProgress, `Processing ${fetched} ${objectType}`);

      // Process records
      const processed = await this.processCrmRecords(objectType, fetched);
      totalProcessed += processed;
    }

    onProgress('processing', 90, 'Storing CRM data');

    const result: CrmSyncResult = {
      contactsFetched: objectTypes.includes('contacts') ? Math.floor(totalFetched / 3) : 0,
      dealsFetched: objectTypes.includes('deals') ? Math.floor(totalFetched / 3) : 0,
      companiesFetched: objectTypes.includes('companies') ? Math.floor(totalFetched / 3) : 0,
      objectTypes,
      dateRange: config?.since ? { from: config.since, to: new Date().toISOString() } : undefined,
    };

    return {
      result,
      itemsProcessed: totalProcessed,
      itemsTotal: totalFetched,
    };
  }

  /**
   * Fetch CRM records from the provider via Nango proxy.
   * This is a mock implementation - production would use actual API calls.
   */
  private async fetchCrmRecords(providerId: string, objectType: string, limit: number): Promise<number> {
    // In production, this would call:
    // await this.integrationService.proxyRequest({
    //   providerId,
    //   endpoint: `/crm/${objectType}`,
    //   params: { limit },
    // });

    // Mock implementation for demonstration
    await this.sleep(400); // Simulate network delay
    return Math.floor(Math.random() * limit) + 5; // Random number between 5 and limit+5
  }

  /**
   * Process fetched CRM records.
   * This is a mock implementation - production would parse and store records.
   */
  private async processCrmRecords(objectType: string, count: number): Promise<number> {
    // In production, this would:
    // 1. Parse record data
    // 2. Extract metadata
    // 3. Store in database
    // 4. Index for search

    // Mock implementation for demonstration
    await this.sleep(200); // Simulate processing delay
    return count; // Assume all records are successfully processed
  }

}

let crmSyncService: CrmSyncService | null = null;

export function initCrmSyncService(deps: SyncServiceDeps): CrmSyncService {
  crmSyncService = new CrmSyncService(deps);
  return crmSyncService;
}

export function getCrmSyncService(): CrmSyncService {
  if (!crmSyncService) {
    throw new Error('CrmSyncService not initialized — call initCrmSyncService first');
  }
  return crmSyncService;
}

export function __resetCrmSyncServiceForTest(): void {
  crmSyncService = null;
}
