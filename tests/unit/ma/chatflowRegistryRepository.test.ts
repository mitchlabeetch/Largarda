/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ChatflowRegistryRepository
 * Tests CRUD operations for chatflow registry and prompt versions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getChatflowRegistryRepository } from '@process/services/database/repositories/ma/ChatflowRegistryRepository';
import type {
  CreateChatflowRegistryInput,
  UpdateChatflowRegistryInput,
  CreatePromptVersionInput,
} from '@/common/ma/flowise/schema';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('ChatflowRegistryRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getChatflowRegistryRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getChatflowRegistryRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleChatflowInput: CreateChatflowRegistryInput = {
    flowKey: 'due_diligence_assistant',
    flowId: 'flow123',
    promptVersionId: 'prompt456',
    status: 'active',
    description: 'AI assistant for due diligence analysis',
  };

  const samplePromptVersionInput: CreatePromptVersionInput = {
    flowKey: 'due_diligence_assistant',
    hash: 'abc123def456',
    payloadJson: '{"system_prompt": "You are a helpful assistant", "temperature": 0.7}',
    createdBy: 'user123',
  };

  describe('upsert (chatflow registry)', () => {
    it('should create a new chatflow registry entry', async () => {
      const result = await repo.upsert(sampleChatflowInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.flowKey).toBe(sampleChatflowInput.flowKey);
      expect(result.data?.flowId).toBe(sampleChatflowInput.flowId);
      expect(result.data?.status).toBe('active');
    });

    it('should update existing chatflow registry entry', async () => {
      await repo.upsert(sampleChatflowInput);

      const updateInput: CreateChatflowRegistryInput = {
        ...sampleChatflowInput,
        flowId: 'new-flow-id',
        status: 'deprecated',
      };

      const result = await repo.upsert(updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.flowId).toBe('new-flow-id');
      expect(result.data?.status).toBe('deprecated');
    });

    it('should create with minimal required fields', async () => {
      const minimalInput: CreateChatflowRegistryInput = {
        flowKey: 'minimal_flow',
        flowId: 'flow456',
      };

      const result = await repo.upsert(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('active');
    });

    it('should handle database errors gracefully', async () => {
      const result = await repo.upsert({ ...sampleChatflowInput, flowKey: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a chatflow registry entry by flow key', async () => {
      await repo.upsert(sampleChatflowInput);

      const result = await repo.get(sampleChatflowInput.flowKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.flowKey).toBe(sampleChatflowInput.flowKey);
      expect(result.data?.flowId).toBe(sampleChatflowInput.flowId);
    });

    it('should return null for non-existent flow key', async () => {
      const result = await repo.get('non-existent-flow');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map all fields correctly', async () => {
      await repo.upsert(sampleChatflowInput);
      const result = await repo.get(sampleChatflowInput.flowKey);

      expect(result.data?.promptVersionId).toBe(sampleChatflowInput.promptVersionId);
      expect(result.data?.description).toBe(sampleChatflowInput.description);
    });
  });

  describe('update', () => {
    it('should update chatflow registry fields', async () => {
      await repo.upsert(sampleChatflowInput);

      const updateInput: UpdateChatflowRegistryInput = {
        flowId: 'updated-flow-id',
        description: 'Updated description',
      };

      const result = await repo.update(sampleChatflowInput.flowKey, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.flowId).toBe(updateInput.flowId);
      expect(result.data?.description).toBe(updateInput.description);
      expect(result.data?.updatedAt).toBeGreaterThan(0);
    });

    it('should fail to update non-existent flow key', async () => {
      const result = await repo.update('non-existent-flow', { status: 'deprecated' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update status', async () => {
      await repo.upsert(sampleChatflowInput);
      const result = await repo.update(sampleChatflowInput.flowKey, { status: 'archived' });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('archived');
    });

    it('should update promptVersionId', async () => {
      await repo.upsert(sampleChatflowInput);
      const result = await repo.update(sampleChatflowInput.flowKey, { promptVersionId: 'new-prompt-id' });

      expect(result.success).toBe(true);
      expect(result.data?.promptVersionId).toBe('new-prompt-id');
    });

    it('should handle partial updates', async () => {
      await repo.upsert(sampleChatflowInput);
      const result = await repo.update(sampleChatflowInput.flowKey, { description: 'Partial update' });

      expect(result.success).toBe(true);
      expect(result.data?.description).toBe('Partial update');
      expect(result.data?.flowId).toBe(sampleChatflowInput.flowId);
    });
  });

  describe('delete', () => {
    it('should delete a chatflow registry entry', async () => {
      await repo.upsert(sampleChatflowInput);

      const result = await repo.delete(sampleChatflowInput.flowKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(sampleChatflowInput.flowKey);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent flow key', async () => {
      const result = await repo.delete('non-existent-flow');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('listByStatus', () => {
    beforeEach(async () => {
      await repo.upsert({ ...sampleChatflowInput, flowKey: 'flow1', status: 'active' });
      await repo.upsert({ ...sampleChatflowInput, flowKey: 'flow2', status: 'active' });
      await repo.upsert({ ...sampleChatflowInput, flowKey: 'flow3', status: 'deprecated' });
    });

    it('should list chatflow registry entries by status', async () => {
      const result = await repo.listByStatus('active');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((f) => f.status === 'active')).toBe(true);
    });

    it('should return empty for status with no entries', async () => {
      const result = await repo.listByStatus('archived');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listByStatus('active', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by updated_at DESC', async () => {
      const result = await repo.listByStatus('active');

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('createPromptVersion', () => {
    it('should create a prompt version', async () => {
      const result = await repo.createPromptVersion(samplePromptVersionInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.flowKey).toBe(samplePromptVersionInput.flowKey);
      expect(result.data?.hash).toBe(samplePromptVersionInput.hash);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
    });

    it('should create with minimal required fields', async () => {
      const minimalInput: CreatePromptVersionInput = {
        flowKey: 'test_flow',
        hash: 'hash123',
        payloadJson: '{}',
      };

      const result = await repo.createPromptVersion(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.createdBy).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      const result = await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPromptVersion', () => {
    it('should retrieve a prompt version by ID', async () => {
      const createResult = await repo.createPromptVersion(samplePromptVersionInput);
      const versionId = createResult.data!.id;

      const result = await repo.getPromptVersion(versionId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(versionId);
      expect(result.data?.hash).toBe(samplePromptVersionInput.hash);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.getPromptVersion('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map all fields correctly', async () => {
      const createResult = await repo.createPromptVersion(samplePromptVersionInput);
      const result = await repo.getPromptVersion(createResult.data!.id);

      expect(result.data?.flowKey).toBe(samplePromptVersionInput.flowKey);
      expect(result.data?.payloadJson).toBe(samplePromptVersionInput.payloadJson);
      expect(result.data?.createdBy).toBe(samplePromptVersionInput.createdBy);
    });
  });

  describe('listPromptVersions', () => {
    beforeEach(async () => {
      const flowKey = 'test_flow';
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey, hash: 'hash1' });
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey, hash: 'hash2' });
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey: 'other_flow', hash: 'hash3' });
    });

    it('should list prompt versions for a flow key', async () => {
      const result = await repo.listPromptVersions('test_flow');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((v) => v.flowKey === 'test_flow')).toBe(true);
    });

    it('should return empty for flow key with no versions', async () => {
      const result = await repo.listPromptVersions('nonexistent_flow');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listPromptVersions('test_flow', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by created_at DESC', async () => {
      const result = await repo.listPromptVersions('test_flow');

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].createdAt).toBeGreaterThanOrEqual(result.data[i].createdAt);
      }
    });
  });

  describe('getPromptVersionByHash', () => {
    it('should retrieve a prompt version by hash', async () => {
      await repo.createPromptVersion(samplePromptVersionInput);

      const result = await repo.getPromptVersionByHash(samplePromptVersionInput.hash);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.hash).toBe(samplePromptVersionInput.hash);
    });

    it('should return null for non-existent hash', async () => {
      const result = await repo.getPromptVersionByHash('nonexistent-hash');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle duplicate hashes', async () => {
      await repo.createPromptVersion(samplePromptVersionInput);
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey: 'other_flow' });

      const result = await repo.getPromptVersionByHash(samplePromptVersionInput.hash);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('deletePromptVersions', () => {
    it('should delete all prompt versions for a flow key', async () => {
      const flowKey = 'test_flow';
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey, hash: 'hash1' });
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey, hash: 'hash2' });
      await repo.createPromptVersion({ ...samplePromptVersionInput, flowKey: 'other_flow', hash: 'hash3' });

      const result = await repo.deletePromptVersions(flowKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await repo.listPromptVersions(flowKey);
      expect(listResult.data.length).toBe(0);
    });

    it('should return 0 for flow key with no versions', async () => {
      const result = await repo.deletePromptVersions('nonexistent_flow');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('updatePromptVersion', () => {
    it('should update prompt version ID in registry', async () => {
      await repo.upsert(sampleChatflowInput);
      const newPromptId = 'new-prompt-789';

      const result = await repo.updatePromptVersion(sampleChatflowInput.flowKey, newPromptId);

      expect(result.success).toBe(true);
      expect(result.data?.promptVersionId).toBe(newPromptId);
    });

    it('should fail for non-existent flow key', async () => {
      const result = await repo.updatePromptVersion('nonexistent_flow', 'prompt-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('edge cases', () => {
    it('should handle empty description', async () => {
      const input = { ...sampleChatflowInput, description: undefined };
      const result = await repo.upsert(input);

      expect(result.success).toBe(true);
      expect(result.data?.description).toBeUndefined();
    });

    it('should handle empty promptVersionId', async () => {
      const input = { ...sampleChatflowInput, promptVersionId: undefined };
      const result = await repo.upsert(input);

      expect(result.success).toBe(true);
      expect(result.data?.promptVersionId).toBeUndefined();
    });

    it('should handle all status types', async () => {
      const activeResult = await repo.upsert({ ...sampleChatflowInput, flowKey: 'f1', status: 'active' });
      const deprecatedResult = await repo.upsert({ ...sampleChatflowInput, flowKey: 'f2', status: 'deprecated' });
      const archivedResult = await repo.upsert({ ...sampleChatflowInput, flowKey: 'f3', status: 'archived' });

      expect(activeResult.success).toBe(true);
      expect(deprecatedResult.success).toBe(true);
      expect(archivedResult.success).toBe(true);
    });

    it('should handle very long description', async () => {
      const longDesc = 'D'.repeat(10000);
      const input = { ...sampleChatflowInput, description: longDesc };
      const result = await repo.upsert(input);

      expect(result.success).toBe(true);
      expect(result.data?.description).toBe(longDesc);
    });

    it('should handle very long payloadJson', async () => {
      const longPayload = JSON.stringify({ prompt: 'x'.repeat(10000) });
      const input = { ...samplePromptVersionInput, payloadJson: longPayload };
      const result = await repo.createPromptVersion(input);

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe(longPayload);
    });

    it('should handle special characters in flow key', async () => {
      const specialKey = 'flow-with_special.chars';
      const input = { ...sampleChatflowInput, flowKey: specialKey };
      const result = await repo.upsert(input);

      expect(result.success).toBe(true);
      expect(result.data?.flowKey).toBe(specialKey);
    });

    it('should handle cascade delete of prompt versions when registry deleted', async () => {
      await repo.upsert(sampleChatflowInput);
      await repo.createPromptVersion(samplePromptVersionInput);

      await repo.delete(sampleChatflowInput.flowKey);

      const listResult = await repo.listPromptVersions(sampleChatflowInput.flowKey);
      expect(listResult.data.length).toBe(0);
    });

    it('should handle empty createdBy', async () => {
      const input = { ...samplePromptVersionInput, createdBy: undefined };
      const result = await repo.createPromptVersion(input);

      expect(result.success).toBe(true);
      expect(result.data?.createdBy).toBeUndefined();
    });
  });
});
