/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for EmailSyncService
 * Tests service coverage including readiness, failure, and retry semantics.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncJob, SyncJobProgress, SyncReadiness, MaIntegrationConnection } from '@/common/ma/types';
import type { SyncServiceDeps } from '@process/services/ma/SyncService';
import { EmailSyncService } from '@process/services/ma/EmailSyncService';

// Mock dependencies
const mockSyncJobRepo = {
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
  countActiveJobs: vi.fn(),
};

const mockIntegrationConnectionRepo = {
  list: vi.fn(),
  upsert: vi.fn(),
};

const mockIntegrationService = {
  isConfigured: vi.fn(),
  providers: [
    { id: 'gmail', category: 'communication' },
    { id: 'outlook', category: 'communication' },
  ],
};

const progressEvents: SyncJobProgress[] = [];
const emitMock = (event: SyncJobProgress): void => {
  progressEvents.push(event);
};

const deps: SyncServiceDeps = {
  syncJobRepo: mockSyncJobRepo as any,
  integrationConnectionRepo: mockIntegrationConnectionRepo as any,
  integrationService: mockIntegrationService as any,
  jobType: 'email',
  emit: emitMock,
  now: () => 1000000,
};

beforeEach(() => {
  vi.clearAllMocks();
  progressEvents.length = 0;
  mockSyncJobRepo.create.mockResolvedValue({
    success: true,
    data: {
      id: 'test-job-id',
      jobType: 'email',
      providerId: 'gmail',
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      itemsProcessed: 0,
      itemsTotal: 0,
      createdAt: 1000000,
      updatedAt: 1000000,
    },
  });
  mockSyncJobRepo.update.mockResolvedValue({
    success: true,
    data: {
      id: 'test-job-id',
      jobType: 'email',
      providerId: 'gmail',
      status: 'completed',
      retryCount: 0,
      maxRetries: 3,
      itemsProcessed: 10,
      itemsTotal: 10,
      createdAt: 1000000,
      updatedAt: 1000000,
      completedAt: 1005000,
    },
  });
  mockSyncJobRepo.get.mockResolvedValue({
    success: true,
    data: {
      id: 'test-job-id',
      jobType: 'email',
      providerId: 'gmail',
      status: 'completed',
      retryCount: 0,
      maxRetries: 3,
      itemsProcessed: 10,
      itemsTotal: 10,
      createdAt: 1000000,
      updatedAt: 1000000,
      completedAt: 1005000,
    },
  });
  mockSyncJobRepo.countActiveJobs.mockResolvedValue({ success: true, data: 0 });
  mockIntegrationConnectionRepo.list.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'test-conn-id',
        providerId: 'gmail',
        providerConfigKey: 'gmail-config',
        status: 'connected',
        lastSyncedAt: 900000,
        createdAt: 800000,
        updatedAt: 900000,
      },
    ] as MaIntegrationConnection[],
  });
  mockIntegrationConnectionRepo.upsert.mockResolvedValue({ success: true, data: undefined });
  mockIntegrationService.isConfigured.mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EmailSyncService - Readiness', () => {
  it('returns ready=true when integration is configured and connection is active', async () => {
    const service = new EmailSyncService(deps);
    const readiness = await service.getReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.hasConnection).toBe(true);
    expect(readiness.connectionStatus).toBe('connected');
    expect(readiness.activeJobs).toBe(0);
    expect(readiness.error).toBeUndefined();
  });

  it('returns ready=false when integration service is not configured', async () => {
    mockIntegrationService.isConfigured.mockReturnValue(false);
    const service = new EmailSyncService(deps);
    const readiness = await service.getReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.hasConnection).toBe(false);
    expect(readiness.error).toContain('not configured');
  });

  it('returns ready=false when no connections exist', async () => {
    mockIntegrationConnectionRepo.list.mockResolvedValue({
      success: true,
      data: [],
    });
    const service = new EmailSyncService(deps);
    const readiness = await service.getReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.hasConnection).toBe(false);
    expect(readiness.error).toContain('No communication connections');
  });

  it('returns ready=false when connection is not in connected state', async () => {
    mockIntegrationConnectionRepo.list.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'test-conn-id',
          providerId: 'gmail',
          providerConfigKey: 'gmail-config',
          status: 'reauth_required',
          createdAt: 800000,
          updatedAt: 900000,
        },
      ] as MaIntegrationConnection[],
    });
    const service = new EmailSyncService(deps);
    const readiness = await service.getReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.hasConnection).toBe(true);
    expect(readiness.connectionStatus).toBe('reauth_required');
    expect(readiness.error).toContain('No active connection');
  });

  it('counts active jobs correctly', async () => {
    mockSyncJobRepo.countActiveJobs.mockResolvedValue({ success: true, data: 3 });
    const service = new EmailSyncService(deps);
    const readiness = await service.getReadiness();

    expect(readiness.activeJobs).toBe(3);
  });
});

describe('EmailSyncService - Sync Flow', () => {
  it('creates and starts a sync job successfully', async () => {
    const service = new EmailSyncService(deps);
    const job = await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
      config: { folder: 'INBOX', limit: 100 },
    });

    expect(job.id).toBe('test-job-id');
    expect(job.jobType).toBe('email');
    expect(job.providerId).toBe('gmail');
    expect(mockSyncJobRepo.create).toHaveBeenCalled();
  });

  it('emits progress events during sync', async () => {
    const service = new EmailSyncService(deps);
    await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Wait for async sync to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[0].stage).toBe('queued');
    expect(progressEvents[0].terminal).toBe(false);
  });

  it('updates job status to completed on success', async () => {
    const service = new EmailSyncService(deps);
    const job = await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Wait for async sync to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const finalJob = await service.getJob(job.id);
    expect(finalJob?.status).toBe('completed');
  });

  it('updates connection lastSyncedAt on successful sync', async () => {
    const service = new EmailSyncService(deps);
    await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Wait for async sync to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(mockIntegrationConnectionRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'gmail',
        lastSyncedAt: expect.any(Number),
      })
    );
  });
});

describe('EmailSyncService - Cancellation', () => {
  it('cancels an in-flight sync job', async () => {
    const service = new EmailSyncService(deps);
    const job = await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Cancel immediately
    const cancelled = service.cancel(job.id);
    expect(cancelled).toBe(true);

    // Wait for sync to handle cancellation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const finalJob = await service.getJob(job.id);
    expect(finalJob?.status).toBe('cancelled');
  });

  it('returns false when cancelling a non-existent job', () => {
    const service = new EmailSyncService(deps);
    const cancelled = service.cancel('non-existent-id');
    expect(cancelled).toBe(false);
  });
});

describe('EmailSyncService - Job Management', () => {
  it('gets a sync job by ID', async () => {
    const service = new EmailSyncService(deps);
    const job = await service.getJob('test-job-id');

    expect(job).not.toBeNull();
    expect(job?.id).toBe('test-job-id');
    expect(mockSyncJobRepo.get).toHaveBeenCalledWith('test-job-id');
  });

  it('returns null for non-existent job', async () => {
    mockSyncJobRepo.get.mockResolvedValue({ success: true, data: null });
    const service = new EmailSyncService(deps);
    const job = await service.getJob('non-existent-id');

    expect(job).toBeNull();
  });

  it('lists jobs with optional status filter', async () => {
    mockSyncJobRepo.list.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'job-1',
          jobType: 'email',
          providerId: 'gmail',
          status: 'completed',
          retryCount: 0,
          maxRetries: 3,
          itemsProcessed: 10,
          itemsTotal: 10,
          createdAt: 1000000,
          updatedAt: 1000000,
        },
      ],
    });
    const service = new EmailSyncService(deps);
    const jobs = await service.listJobs({ status: 'completed' });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe('completed');
    expect(mockSyncJobRepo.list).toHaveBeenCalledWith({ jobType: 'email', status: 'completed' });
  });

  it('tracks active task count', async () => {
    const service = new EmailSyncService(deps);
    expect(service.activeCount()).toBe(0);

    await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Active count should be > 0 while sync is running
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(service.activeCount()).toBeGreaterThan(0);
  });
});

describe('EmailSyncService - Failure State', () => {
  it('handles sync failure and updates job status to failed', async () => {
    mockSyncJobRepo.update.mockRejectedValue(new Error('Database error'));
    const service = new EmailSyncService(deps);

    const job = await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Wait for sync to fail
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const finalJob = await service.getJob(job.id);
    expect(finalJob?.status).toBe('failed');
    expect(finalJob?.error).toBeDefined();
  });

  it('emits terminal progress event on failure', async () => {
    mockSyncJobRepo.update.mockRejectedValue(new Error('Database error'));
    const service = new EmailSyncService(deps);

    await service.startSync({
      jobType: 'email',
      providerId: 'gmail',
    });

    // Wait for sync to fail
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const terminalEvents = progressEvents.filter((e) => e.terminal);
    expect(terminalEvents.length).toBeGreaterThan(0);
    expect(terminalEvents[0].stage).toBe('failed');
    expect(terminalEvents[0].error).toBeDefined();
  });
});
