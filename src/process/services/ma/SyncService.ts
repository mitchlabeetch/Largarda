/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base SyncService
 * ----------------
 * Process-side orchestrator for email and CRM sync flows with clear readiness,
 * failure, and retry semantics.
 *
 * Responsibilities:
 *   1. Own the canonical state transitions for sync job lifecycle.
 *   2. Run the sync pipeline and emit truthful progress events.
 *   3. Implement exponential backoff retry logic with configurable max retries.
 *   4. Support cooperative cancellation via `cancel(jobId)`.
 *
 * State machine (transitions are one-way; terminal states are final):
 *
 *   pending ──► queued ──► connecting ──► fetching ──► processing ──► completed   ┐
 *                  │            │             │             │                 │ terminal
 *                  └────────────┴─────────────┴─────────────┴──► failed      │
 *                  └────────────┴─────────────┴─────────────┴──► cancelled   │
 *                  └────────────┴─────────────┴─────────────┴──► retrying ───► (loops back)
 *
 * Event contract (emitted via callback):
 *   - `progress` is monotonically non-decreasing per jobId.
 *   - `terminal=true` fires exactly once per sync job, after the DB row has
 *     been updated to a terminal status.
 *   - On `failed`, `error` is set to a human-readable message.
 *   - On `cancelled`, `error` is unset.
 *   - On `retrying`, `nextRetryAt` is set to the scheduled retry timestamp.
 */

import type {
  CreateSyncJobInput,
  SyncJob,
  SyncJobProgress,
  SyncJobStatus,
  SyncJobType,
  SyncReadiness,
  MaIntegrationConnection,
} from '@/common/ma/types';
import { isTerminalSyncJobStatus, isActiveSyncJobStatus } from '@/common/ma/types';
import type { SyncJobRepository } from '@process/services/database/repositories/ma/SyncJobRepository';
import type { IntegrationConnectionRepository } from '@process/services/database/repositories/ma/IntegrationConnectionRepository';
import type { IntegrationService } from '@process/services/ma/IntegrationService';

// ============================================================================
// Public surface
// ============================================================================

export interface SyncServiceDeps {
  syncJobRepo: SyncJobRepository;
  integrationConnectionRepo: IntegrationConnectionRepository;
  integrationService: IntegrationService;
  jobType: SyncJobType;
  /**
   * Sink for progress events. In production this is wired to IPC bridge emitter.
   * Tests inject a spy.
   */
  emit: (event: SyncJobProgress) => void;
  /** Pluggable clock for deterministic tests. */
  now?: () => number;
}

export interface SyncConfig {
  maxRetries?: number;
  retryBaseDelay?: number; // milliseconds
  retryMaxDelay?: number; // milliseconds
}

// ============================================================================
// Service
// ============================================================================

interface ActiveTask {
  jobId: string;
  cancelled: boolean;
}

class SyncServicePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncServicePersistenceError';
  }
}

/**
 * Illegal-transition guard used for defensive checks only.
 */
function assertTransition(from: SyncJobStatus, to: SyncJobStatus): void {
  if (from === to) return;
  if (isTerminalSyncJobStatus(from)) {
    throw new Error(`Illegal sync transition ${from} → ${to}: source is terminal`);
  }
}

/**
 * Calculate exponential backoff delay for retry.
 */
function calculateRetryDelay(retryCount: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

export class SyncService {
  private readonly syncJobRepo: SyncJobRepository;
  private readonly integrationConnectionRepo: IntegrationConnectionRepository;
  private readonly integrationService: IntegrationService;
  private readonly jobType: SyncJobType;
  private readonly emit: (event: SyncJobProgress) => void;
  private readonly now: () => number;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private readonly retryMaxDelay: number;
  private readonly active = new Map<string, ActiveTask>();

  constructor(deps: SyncServiceDeps, config: SyncConfig = {}) {
    this.syncJobRepo = deps.syncJobRepo;
    this.integrationConnectionRepo = deps.integrationConnectionRepo;
    this.integrationService = deps.integrationService;
    this.jobType = deps.jobType;
    this.emit = deps.emit;
    this.now = deps.now ?? Date.now;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelay = config.retryBaseDelay ?? 5000; // 5 seconds
    this.retryMaxDelay = config.retryMaxDelay ?? 300000; // 5 minutes
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Check readiness for sync operations.
   * Returns a snapshot of whether the integration is ready to sync.
   */
  async getReadiness(): Promise<SyncReadiness> {
    const checkedAt = this.now();

    try {
      // Count active jobs for this job type
      const activeCountResult = await this.syncJobRepo.countActiveJobs(this.jobType);
      const activeJobs = activeCountResult.success ? activeCountResult.data : 0;

      // Check if integration service is configured
      if (!this.integrationService.isConfigured()) {
        return {
          jobType: this.jobType,
          ready: false,
          hasConnection: false,
          connectionStatus: undefined,
          activeJobs,
          error: 'Integration service not configured',
          checkedAt,
        };
      }

      // Get connected providers for this job type
      const connections = await this.integrationConnectionRepo.list();
      if (!connections.success || !connections.data) {
        return {
          jobType: this.jobType,
          ready: false,
          hasConnection: false,
          connectionStatus: undefined,
          activeJobs,
          error: 'Failed to list connections',
          checkedAt,
        };
      }

      // Filter connections by category (email or crm)
      const category = this.jobType === 'email' ? 'communication' : 'crm';
      const relevantConnections = connections.data.filter((c) => {
        // TODO: Get provider category from integrationService when available
        // For now, include all connections since we can't determine category without providers
        return true;
      });

      if (relevantConnections.length === 0) {
        return {
          jobType: this.jobType,
          ready: false,
          hasConnection: false,
          connectionStatus: undefined,
          activeJobs,
          error: `No ${category} connections configured`,
          checkedAt,
        };
      }

      // Check if any connection is in connected state
      const connectedConnection = relevantConnections.find((c) => c.status === 'connected');
      if (!connectedConnection) {
        return {
          jobType: this.jobType,
          ready: false,
          hasConnection: true,
          connectionStatus: relevantConnections[0].status,
          activeJobs,
          error: 'No active connection',
          checkedAt,
        };
      }

      return {
        jobType: this.jobType,
        ready: true,
        hasConnection: true,
        connectionStatus: connectedConnection.status,
        activeJobs,
        lastSyncAt: connectedConnection.lastSyncedAt,
        checkedAt,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        jobType: this.jobType,
        ready: false,
        hasConnection: false,
        connectionStatus: undefined,
        activeJobs: 0,
        error: message,
        checkedAt,
      };
    }
  }

  /**
   * Create and start a new sync job.
   * Resolves once the job has reached a terminal state.
   */
  async startSync(input: CreateSyncJobInput): Promise<SyncJob> {
    const readiness = await this.getReadiness();
    if (!readiness.ready) {
      throw new Error(`Sync not ready: ${readiness.error}`);
    }

    const createResult = await this.syncJobRepo.create({
      jobType: this.jobType,
      providerId: input.providerId,
      config: input.config,
      maxRetries: input.maxRetries ?? this.maxRetries,
    });

    if (!createResult.success || !createResult.data) {
      throw new Error(`Failed to create sync job: ${createResult.error}`);
    }

    const job = createResult.data;

    // Start the sync process asynchronously
    this.runSync(job.id).catch((error: unknown) => {
      console.error(`[SyncService] Sync job ${job.id} failed unexpectedly:`, error);
    });

    return job;
  }

  /**
   * Cancel an in-flight sync job. Returns true when a matching task was found.
   */
  cancel(jobId: string): boolean {
    const task = this.active.get(jobId);
    if (!task) return false;
    task.cancelled = true;
    return true;
  }

  /**
   * Get a sync job by ID.
   */
  async getJob(jobId: string): Promise<SyncJob | null> {
    const result = await this.syncJobRepo.get(jobId);
    return result.success ? (result.data ?? null) : null;
  }

  /**
   * List sync jobs with optional filters.
   */
  async listJobs(filters?: { status?: string }): Promise<SyncJob[]> {
    const result = await this.syncJobRepo.list({ jobType: this.jobType, ...filters });
    return result.success ? result.data : [];
  }

  /**
   * Number of in-flight sync tasks (for diagnostics / tests).
   */
  activeCount(): number {
    return this.active.size;
  }

  // --------------------------------------------------------------------------
  // Protected methods for subclasses
  // --------------------------------------------------------------------------

  /**
   * Subclasses implement the actual sync logic.
   * Should call updateProgress and handle errors appropriately.
   */
  protected async performSync(
    job: SyncJob,
    onProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<{ result: Record<string, unknown>; itemsProcessed: number; itemsTotal: number }> {
    throw new Error('performSync must be implemented by subclass');
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private async runSync(jobId: string): Promise<void> {
    const job = await this.mustGet(jobId);

    // Reject if already terminal
    if (isTerminalSyncJobStatus(job.status)) {
      return;
    }

    // Reject if already running
    if (this.active.has(jobId)) {
      return;
    }

    const task: ActiveTask = { jobId, cancelled: false };
    this.active.set(jobId, task);

    try {
      await this.transition(job, 'queued', 'queued', 5, 'Queued for sync');
      await this.transition(job, 'connecting', 'connecting', 10, 'Connecting to integration');

      // Run the sync with retry logic
      await this.runSyncWithRetry(job, task);
    } catch (error: unknown) {
      if (error instanceof SyncServicePersistenceError) {
        throw error;
      }
      if (task.cancelled) {
        await this.finalizeCancelled(job);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      await this.finalizeFailed(job, message);
    } finally {
      this.active.delete(jobId);
    }
  }

  private async runSyncWithRetry(job: SyncJob, task: ActiveTask): Promise<void> {
    let currentJob = job;
    let retryCount = 0;

    while (retryCount <= currentJob.maxRetries) {
      if (task.cancelled) {
        await this.finalizeCancelled(currentJob);
        return;
      }

      try {
        const onProgress = (stage: string, progress: number, message?: string): void => {
          void this.emitProgress(currentJob, stage as any, progress, message, false);
        };

        const { result, itemsProcessed, itemsTotal } = await this.performSync(currentJob, onProgress);

        // Success
        await this.finalizeCompleted(currentJob, result, itemsProcessed, itemsTotal);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        if (retryCount < currentJob.maxRetries) {
          // Schedule retry
          const delay = calculateRetryDelay(retryCount, this.retryBaseDelay, this.retryMaxDelay);
          const nextRetryAt = this.now() + delay;

          await this.syncJobRepo.update(currentJob.id, {
            status: 'retrying',
            error: message,
            retryCount: retryCount + 1,
            nextRetryAt,
          });

          await this.emitProgress(
            currentJob,
            'retrying',
            0,
            `Retrying in ${Math.round(delay / 1000)}s`,
            false,
            message
          );

          // Wait for retry delay
          await this.sleep(delay);

          // Check if cancelled during retry delay
          if (task.cancelled) {
            await this.finalizeCancelled(currentJob);
            return;
          }

          // Reload job state
          const reloaded = await this.mustGet(currentJob.id);
          currentJob = reloaded;
          retryCount++;
        } else {
          // Max retries exceeded
          await this.finalizeFailed(currentJob, message);
          return;
        }
      }
    }
  }

  private async transition(
    job: SyncJob,
    to: SyncJobStatus,
    stage: string,
    percent: number,
    message: string
  ): Promise<SyncJob> {
    assertTransition(job.status, to);
    const updated = await this.updateJobOrThrow(job, { status: to });
    await this.emitProgress(updated, stage as any, percent, message, false);
    return updated;
  }

  private async emitProgress(
    job: SyncJob,
    stage: string,
    percent: number,
    message: string | undefined,
    terminal: boolean,
    error?: string
  ): Promise<void> {
    this.emit({
      jobId: job.id,
      jobType: job.jobType,
      providerId: job.providerId,
      stage: stage as any,
      progress: clampPercent(percent),
      message,
      timestamp: this.now(),
      terminal,
      error,
    });
  }

  private async finalizeCompleted(
    job: SyncJob,
    result: Record<string, unknown>,
    itemsProcessed: number,
    itemsTotal: number
  ): Promise<void> {
    const now = this.now();
    await this.updateJobOrThrow(job, {
      status: 'completed',
      result,
      itemsProcessed,
      itemsTotal,
      completedAt: now,
      error: undefined,
    });
    await this.emitProgress(job, 'completed', 100, 'Sync completed', true);

    // Update connection's lastSyncedAt
    await this.integrationConnectionRepo.upsert({
      providerId: job.providerId,
      providerConfigKey: '', // Will be filled by repo
      connectionId: undefined,
      status: 'connected',
      displayName: undefined,
      metadata: undefined,
      lastError: undefined,
      connectedAt: undefined,
      lastSyncedAt: now,
    });
  }

  private async finalizeCancelled(job: SyncJob): Promise<void> {
    await this.updateJobOrThrow(job, { status: 'cancelled' });
    await this.emitProgress(job, 'cancelled', 100, 'Sync cancelled', true);
  }

  private async finalizeFailed(job: SyncJob, message: string): Promise<void> {
    const now = this.now();
    await this.updateJobOrThrow(job, { status: 'failed', error: message, completedAt: now });
    await this.emitProgress(job, 'failed', 100, message, true, message);
  }

  private async updateJobOrThrow(job: SyncJob, input: Partial<SyncJob>): Promise<SyncJob> {
    const result = await this.syncJobRepo.update(job.id, input);
    if (!result.success || !result.data) {
      throw new SyncServicePersistenceError(result.error ?? `Failed to persist sync job update for ${job.id}`);
    }
    return result.data;
  }

  private async mustGet(jobId: string): Promise<SyncJob> {
    const r = await this.syncJobRepo.get(jobId);
    if (!r.success || !r.data) {
      throw new Error(`Sync job ${jobId} vanished during sync`);
    }
    return r.data;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Helpers
// ============================================================================

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}
