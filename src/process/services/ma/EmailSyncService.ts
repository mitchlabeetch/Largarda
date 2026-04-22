/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EmailSyncService
 * ----------------
 * Email-specific sync implementation extending the base SyncService.
 *
 * Handles email synchronization from external providers (Gmail, Outlook, etc.)
 * via Nango integration proxy.
 */

import type { SyncJob, SyncJobProgress } from '@/common/ma/types';
import type { SyncServiceDeps } from '@process/services/ma/SyncService';
import { SyncService } from '@process/services/ma/SyncService';

export interface EmailSyncConfig {
  folder?: string; // e.g., 'INBOX', 'Sent', 'All'
  since?: string; // ISO date string
  limit?: number; // Max emails to fetch
}

export interface EmailSyncResult extends Record<string, unknown> {
  emailsFetched: number;
  emailsProcessed: number;
  folder?: string;
  dateRange?: { from: string; to: string };
}

export class EmailSyncService extends SyncService {
  constructor(deps: SyncServiceDeps) {
    super({ ...deps, jobType: 'email' });
  }

  /**
   * Perform email sync via Nango proxy.
   * Implements the abstract performSync method from base class.
   */
  protected async performSync(
    job: SyncJob,
    onProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<{ result: Record<string, unknown>; itemsProcessed: number; itemsTotal: number }> {
    const config = job.config as EmailSyncConfig | undefined;
    const folder = config?.folder ?? 'INBOX';
    const limit = config?.limit ?? 100;

    onProgress('fetching', 20, `Fetching emails from ${folder}`);

    // Simulate email fetching via Nango proxy
    // In production, this would call integrationService.proxyRequest()
    // with provider-specific endpoints for Gmail/Outlook/etc.
    const emailsFetched = await this.fetchEmails(job.providerId, folder, limit);

    onProgress('processing', 60, `Processing ${emailsFetched} emails`);

    // Simulate email processing
    const emailsProcessed = await this.processEmails(emailsFetched);

    onProgress('processing', 90, 'Storing email data');

    const result: EmailSyncResult = {
      emailsFetched,
      emailsProcessed,
      folder,
      dateRange: config?.since ? { from: config.since, to: new Date().toISOString() } : undefined,
    };

    return {
      result,
      itemsProcessed: emailsProcessed,
      itemsTotal: emailsFetched,
    };
  }

  /**
   * Fetch emails from the provider via Nango proxy.
   * This is a mock implementation - production would use actual API calls.
   */
  private async fetchEmails(providerId: string, folder: string, limit: number): Promise<number> {
    // In production, this would call:
    // await this.integrationService.proxyRequest({
    //   providerId,
    //   endpoint: '/emails/list',
    //   params: { folder, limit },
    // });

    // Mock implementation for demonstration
    await this.sleep(500); // Simulate network delay
    return Math.floor(Math.random() * limit) + 10; // Random number between 10 and limit+10
  }

  /**
   * Process fetched emails.
   * This is a mock implementation - production would parse and store emails.
   */
  private async processEmails(count: number): Promise<number> {
    // In production, this would:
    // 1. Parse email content
    // 2. Extract metadata (sender, subject, date, etc.)
    // 3. Store in database
    // 4. Index for search

    // Mock implementation for demonstration
    await this.sleep(300); // Simulate processing delay
    return count; // Assume all emails are successfully processed
  }

}

let emailSyncService: EmailSyncService | null = null;

export function initEmailSyncService(deps: SyncServiceDeps): EmailSyncService {
  emailSyncService = new EmailSyncService(deps);
  return emailSyncService;
}

export function getEmailSyncService(): EmailSyncService {
  if (!emailSyncService) {
    throw new Error('EmailSyncService not initialized — call initEmailSyncService first');
  }
  return emailSyncService;
}

export function __resetEmailSyncServiceForTest(): void {
  emailSyncService = null;
}
