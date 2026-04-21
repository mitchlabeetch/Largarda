/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for KbSourceRepository
 * Tests CRUD operations, scope-based queries, and status tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getKbSourceRepository } from '@process/services/database/repositories/ma/KbSourceRepository';
import type { CreateKbSourceInput, UpdateKbSourceInput } from '@/common/ma/kb/schema';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('KbSourceRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getKbSourceRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getKbSourceRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleKbSourceInput: CreateKbSourceInput = {
    scope: 'deal',
    scopeId: 'deal123',
    flowiseDocumentStoreId: 'store456',
    embeddingModel: 'text-embedding-ada-002',
    status: 'pending',
  };

  describe('create', () => {
    it('should create a KB source with valid input', async () => {
      const result = await repo.create(sampleKbSourceInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.scope).toBe(sampleKbSourceInput.scope);
      expect(result.data?.scopeId).toBe(sampleKbSourceInput.scopeId);
      expect(result.data?.status).toBe('pending');
      expect(result.data?.chunkCount).toBe(0);
      expect(result.data?.id).toBeDefined();
    });

    it('should create a KB source with minimal required fields', async () => {
      const minimalInput: CreateKbSourceInput = {
        scope: 'company',
        scopeId: 'comp456',
      };

      const result = await repo.create(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.scope).toBe(minimalInput.scope);
      expect(result.data?.scopeId).toBe(minimalInput.scopeId);
      expect(result.data?.status).toBe('pending');
    });

    it('should create a KB source with completed status', async () => {
      const input = { ...sampleKbSourceInput, status: 'completed' as const };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
    });

    it('should handle database errors gracefully', async () => {
      // Try to create duplicate (scope, scopeId)
      await repo.create(sampleKbSourceInput);
      const result = await repo.create(sampleKbSourceInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a KB source by ID', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.get(sourceId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(sourceId);
      expect(result.data?.scope).toBe(sampleKbSourceInput.scope);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map all fields correctly', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const result = await repo.get(createResult.data!.id);

      expect(result.data?.flowiseDocumentStoreId).toBe(sampleKbSourceInput.flowiseDocumentStoreId);
      expect(result.data?.embeddingModel).toBe(sampleKbSourceInput.embeddingModel);
    });
  });

  describe('getByScope', () => {
    it('should retrieve a KB source by scope and scope ID', async () => {
      await repo.create(sampleKbSourceInput);

      const result = await repo.getByScope('deal', 'deal123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.scope).toBe('deal');
      expect(result.data?.scopeId).toBe('deal123');
    });

    it('should return null for non-existent scope/scopeId', async () => {
      const result = await repo.getByScope('deal', 'nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should enforce unique constraint on (scope, scopeId)', async () => {
      await repo.create(sampleKbSourceInput);
      const result = await repo.getByScope('deal', 'deal123');

      expect(result.data).toBeDefined();
      expect(result.data?.scopeId).toBe('deal123');
    });
  });

  describe('update', () => {
    it('should update KB source fields', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const updateInput: UpdateKbSourceInput = {
        embeddingModel: 'text-embedding-3-small',
        chunkCount: 100,
      };

      const result = await repo.update(sourceId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.embeddingModel).toBe(updateInput.embeddingModel);
      expect(result.data?.chunkCount).toBe(updateInput.chunkCount);
      expect(result.data?.updatedAt).toBeGreaterThan(createResult.data!.updatedAt);
    });

    it('should fail to update non-existent source', async () => {
      const result = await repo.update('non-existent-id', { status: 'completed' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update status to completed', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.update(sourceId, { status: 'completed' });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
    });

    it('should update error text', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.update(sourceId, { errorText: 'Processing failed' });

      expect(result.success).toBe(true);
      expect(result.data?.errorText).toBe('Processing failed');
    });

    it('should update lastIngestedAt timestamp', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const now = Date.now();
      const result = await repo.update(sourceId, { lastIngestedAt: now });

      expect(result.success).toBe(true);
      expect(result.data?.lastIngestedAt).toBe(now);
    });

    it('should handle partial updates', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.update(sourceId, { chunkCount: 50 });

      expect(result.success).toBe(true);
      expect(result.data?.chunkCount).toBe(50);
      expect(result.data?.status).toBe(sampleKbSourceInput.status);
    });
  });

  describe('delete', () => {
    it('should delete a KB source', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.delete(sourceId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(sourceId);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent source', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('listByScope', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleKbSourceInput, scope: 'deal', scopeId: 'deal1' });
      await repo.create({ ...sampleKbSourceInput, scope: 'deal', scopeId: 'deal2' });
      await repo.create({ ...sampleKbSourceInput, scope: 'company', scopeId: 'comp1' });
    });

    it('should list KB sources by scope', async () => {
      const result = await repo.listByScope('deal');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((s) => s.scope === 'deal')).toBe(true);
    });

    it('should return empty for scope with no sources', async () => {
      const result = await repo.listByScope('global');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listByScope('deal', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by updated_at DESC', async () => {
      const result = await repo.listByScope('deal');

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('listByStatus', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleKbSourceInput, scopeId: 'src1', status: 'pending' });
      await repo.create({ ...sampleKbSourceInput, scopeId: 'src2', status: 'pending' });
      await repo.create({ ...sampleKbSourceInput, scopeId: 'src3', status: 'completed' });
    });

    it('should list KB sources by status', async () => {
      const result = await repo.listByStatus('pending');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((s) => s.status === 'pending')).toBe(true);
    });

    it('should return empty for status with no sources', async () => {
      const result = await repo.listByStatus('error');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listByStatus('pending', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by updated_at DESC', async () => {
      const result = await repo.listByStatus('pending');

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('upsertByScope', () => {
    it('should create new source if (scope, scopeId) does not exist', async () => {
      const result = await repo.upsertByScope(sampleKbSourceInput);

      expect(result.success).toBe(true);
      expect(result.data?.scope).toBe(sampleKbSourceInput.scope);
      expect(result.data?.scopeId).toBe(sampleKbSourceInput.scopeId);
    });

    it('should update existing source if (scope, scopeId) exists', async () => {
      await repo.create(sampleKbSourceInput);

      const updateInput: CreateKbSourceInput = {
        ...sampleKbSourceInput,
        embeddingModel: 'new-model',
        status: 'completed',
      };

      const result = await repo.upsertByScope(updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.embeddingModel).toBe('new-model');
      expect(result.data?.status).toBe('completed');
    });

    it('should preserve ID on upsert update', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const originalId = createResult.data!.id;

      const result = await repo.upsertByScope({ ...sampleKbSourceInput, status: 'completed' });

      expect(result.data?.id).toBe(originalId);
    });
  });

  describe('updateChunkCount', () => {
    it('should update chunk count', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.updateChunkCount(sourceId, 150);

      expect(result.success).toBe(true);
      expect(result.data?.chunkCount).toBe(150);
    });

    it('should fail for non-existent source', async () => {
      const result = await repo.updateChunkCount('non-existent-id', 100);

      expect(result.success).toBe(false);
    });
  });

  describe('markIngesting', () => {
    it('should mark source as ingesting', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.markIngesting(sourceId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('ingesting');
    });

    it('should fail for non-existent source', async () => {
      const result = await repo.markIngesting('non-existent-id');

      expect(result.success).toBe(false);
    });
  });

  describe('markCompleted', () => {
    it('should mark source as completed with chunk count', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.markCompleted(sourceId, 200);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.chunkCount).toBe(200);
      expect(result.data?.lastIngestedAt).toBeDefined();
    });

    it('should fail for non-existent source', async () => {
      const result = await repo.markCompleted('non-existent-id', 100);

      expect(result.success).toBe(false);
    });
  });

  describe('markError', () => {
    it('should mark source as error with message', async () => {
      const createResult = await repo.create(sampleKbSourceInput);
      const sourceId = createResult.data!.id;

      const result = await repo.markError(sourceId, 'API rate limit exceeded');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('error');
      expect(result.data?.errorText).toBe('API rate limit exceeded');
    });

    it('should fail for non-existent source', async () => {
      const result = await repo.markError('non-existent-id', 'Error');

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty flowiseDocumentStoreId', async () => {
      const input = { ...sampleKbSourceInput, flowiseDocumentStoreId: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.flowiseDocumentStoreId).toBeUndefined();
    });

    it('should handle empty embeddingModel', async () => {
      const input = { ...sampleKbSourceInput, embeddingModel: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.embeddingModel).toBeUndefined();
    });

    it('should handle zero chunk count', async () => {
      const input = { ...sampleKbSourceInput };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.chunkCount).toBe(0);
    });

    it('should handle very long error text', async () => {
      const longError = 'E'.repeat(10000);
      const createResult = await repo.create(sampleKbSourceInput);
      const result = await repo.markError(createResult.data!.id, longError);

      expect(result.success).toBe(true);
      expect(result.data?.errorText).toBe(longError);
    });

    it('should handle all scope types', async () => {
      const dealResult = await repo.create({ ...sampleKbSourceInput, scope: 'deal', scopeId: 'd1' });
      const companyResult = await repo.create({ ...sampleKbSourceInput, scope: 'company', scopeId: 'c1' });
      const globalResult = await repo.create({ ...sampleKbSourceInput, scope: 'global', scopeId: 'g1' });

      expect(dealResult.success).toBe(true);
      expect(companyResult.success).toBe(true);
      expect(globalResult.success).toBe(true);
    });

    it('should handle all status types', async () => {
      const pendingResult = await repo.create({ ...sampleKbSourceInput, scopeId: 'p1', status: 'pending' });
      const ingestingResult = await repo.create({ ...sampleKbSourceInput, scopeId: 'i1', status: 'ingesting' });
      const completedResult = await repo.create({ ...sampleKbSourceInput, scopeId: 'c1', status: 'completed' });
      const errorResult = await repo.create({ ...sampleKbSourceInput, scopeId: 'e1', status: 'error' });

      expect(pendingResult.success).toBe(true);
      expect(ingestingResult.success).toBe(true);
      expect(completedResult.success).toBe(true);
      expect(errorResult.success).toBe(true);
    });
  });
});
