/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for DocumentChunkRepository
 * Tests CRUD operations, document/deal associations, and cascade deletes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getDocumentChunkRepository } from '@process/services/database/repositories/ma/DocumentChunkRepository';
import { getDocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { getDealRepository } from '@process/services/database/repositories/ma/DealRepository';
import type { CreateDocumentChunkInput, UpdateDocumentChunkInput } from '@/common/ma/kb/schema';
import type { CreateDocumentInput } from '@/common/ma/types';
import type { CreateDealInput } from '@/common/ma/types';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('DocumentChunkRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getDocumentChunkRepository>;
  let documentRepo: ReturnType<typeof getDocumentRepository>;
  let dealRepo: ReturnType<typeof getDealRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getDocumentChunkRepository();
    documentRepo = getDocumentRepository();
    dealRepo = getDealRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleChunkInput: CreateDocumentChunkInput = {
    documentId: 'doc123',
    chunkIndex: 0,
    text: 'This is a sample text chunk for testing purposes.',
    tokenCount: 15,
    flowiseChunkId: 'flowise456',
    metadataJson: '{"page": 1, "position": [0, 100]}',
  };

  const sampleDocumentInput: CreateDocumentInput = {
    dealId: 'deal123',
    filename: 'test.pdf',
    originalPath: '/path/to/test.pdf',
    format: 'pdf',
    size: 1024,
  };

  const sampleDealInput: CreateDealInput = {
    name: 'Test Deal',
    parties: [{ name: 'Acquirer', role: 'buyer' }],
    transactionType: 'acquisition',
    targetCompany: { name: 'Target' },
  };

  describe('create', () => {
    it('should create a document chunk with valid input', async () => {
      const result = await repo.create(sampleChunkInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.documentId).toBe(sampleChunkInput.documentId);
      expect(result.data?.chunkIndex).toBe(sampleChunkInput.chunkIndex);
      expect(result.data?.text).toBe(sampleChunkInput.text);
      expect(result.data?.id).toBeDefined();
    });

    it('should create a chunk with minimal required fields', async () => {
      const minimalInput: CreateDocumentChunkInput = {
        documentId: 'doc456',
        chunkIndex: 0,
        text: 'Minimal chunk',
      };

      const result = await repo.create(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe(minimalInput.text);
    });

    it('should create a chunk linked to a deal', async () => {
      const input = { ...sampleChunkInput, dealId: 'deal123' };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.dealId).toBe('deal123');
    });

    it('should handle database errors gracefully', async () => {
      const result = await repo.create({ ...sampleChunkInput, text: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a chunk by ID', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const chunkId = createResult.data!.id;

      const result = await repo.get(chunkId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(chunkId);
      expect(result.data?.text).toBe(sampleChunkInput.text);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map all fields correctly', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const result = await repo.get(createResult.data!.id);

      expect(result.data?.tokenCount).toBe(sampleChunkInput.tokenCount);
      expect(result.data?.flowiseChunkId).toBe(sampleChunkInput.flowiseChunkId);
      expect(result.data?.metadataJson).toBe(sampleChunkInput.metadataJson);
    });
  });

  describe('update', () => {
    it('should update chunk fields', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const chunkId = createResult.data!.id;

      const updateInput: UpdateDocumentChunkInput = {
        text: 'Updated chunk text',
        tokenCount: 20,
      };

      const result = await repo.update(chunkId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe(updateInput.text);
      expect(result.data?.tokenCount).toBe(updateInput.tokenCount);
    });

    it('should fail to update non-existent chunk', async () => {
      const result = await repo.update('non-existent-id', { text: 'New text' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update flowiseChunkId', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const chunkId = createResult.data!.id;

      const result = await repo.update(chunkId, { flowiseChunkId: 'new-flowise-id' });

      expect(result.success).toBe(true);
      expect(result.data?.flowiseChunkId).toBe('new-flowise-id');
    });

    it('should update metadataJson', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const chunkId = createResult.data!.id;

      const newMetadata = JSON.stringify({ page: 2, position: [100, 200] });
      const result = await repo.update(chunkId, { metadataJson: newMetadata });

      expect(result.success).toBe(true);
      expect(result.data?.metadataJson).toBe(newMetadata);
    });

    it('should handle partial updates', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const chunkId = createResult.data!.id;

      const result = await repo.update(chunkId, { tokenCount: 999 });

      expect(result.success).toBe(true);
      expect(result.data?.tokenCount).toBe(999);
      expect(result.data?.text).toBe(sampleChunkInput.text);
    });
  });

  describe('delete', () => {
    it('should delete a chunk', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const chunkId = createResult.data!.id;

      const result = await repo.delete(chunkId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(chunkId);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent chunk', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('listByDocument', () => {
    beforeEach(async () => {
      const docId = 'doc123';
      await repo.create({ ...sampleChunkInput, documentId: docId, chunkIndex: 0 });
      await repo.create({ ...sampleChunkInput, documentId: docId, chunkIndex: 1 });
      await repo.create({ ...sampleChunkInput, documentId: 'doc456', chunkIndex: 0 });
    });

    it('should list chunks for a document', async () => {
      const result = await repo.listByDocument('doc123');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((c) => c.documentId === 'doc123')).toBe(true);
    });

    it('should return empty for document with no chunks', async () => {
      const result = await repo.listByDocument('doc999');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listByDocument('doc123', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by chunk_index ASC', async () => {
      const result = await repo.listByDocument('doc123');

      expect(result.data[0].chunkIndex).toBe(0);
      expect(result.data[1].chunkIndex).toBe(1);
    });
  });

  describe('listByDeal', () => {
    beforeEach(async () => {
      const dealId = 'deal123';
      await repo.create({ ...sampleChunkInput, dealId, chunkIndex: 0 });
      await repo.create({ ...sampleChunkInput, dealId, chunkIndex: 1 });
      await repo.create({ ...sampleChunkInput, dealId: 'deal456', chunkIndex: 0 });
    });

    it('should list chunks for a deal', async () => {
      const result = await repo.listByDeal('deal123');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((c) => c.dealId === 'deal123')).toBe(true);
    });

    it('should return empty for deal with no chunks', async () => {
      const result = await repo.listByDeal('deal999');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listByDeal('deal123', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by chunk_index ASC', async () => {
      const result = await repo.listByDeal('deal123');

      expect(result.data[0].chunkIndex).toBe(0);
      expect(result.data[1].chunkIndex).toBe(1);
    });
  });

  describe('deleteByDocument', () => {
    it('should delete all chunks for a document', async () => {
      const docId = 'doc123';
      await repo.create({ ...sampleChunkInput, documentId: docId });
      await repo.create({ ...sampleChunkInput, documentId: docId });
      await repo.create({ ...sampleChunkInput, documentId: 'doc456' });

      const result = await repo.deleteByDocument(docId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await repo.listByDocument(docId);
      expect(listResult.data.length).toBe(0);
    });

    it('should return 0 for document with no chunks', async () => {
      const result = await repo.deleteByDocument('doc999');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('deleteByDeal', () => {
    it('should delete all chunks for a deal', async () => {
      const dealId = 'deal123';
      await repo.create({ ...sampleChunkInput, dealId });
      await repo.create({ ...sampleChunkInput, dealId });
      await repo.create({ ...sampleChunkInput, dealId: 'deal456' });

      const result = await repo.deleteByDeal(dealId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await repo.listByDeal(dealId);
      expect(listResult.data.length).toBe(0);
    });

    it('should return 0 for deal with no chunks', async () => {
      const result = await repo.deleteByDeal('deal999');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('getByFlowiseChunkId', () => {
    it('should retrieve a chunk by Flowise chunk ID', async () => {
      const createResult = await repo.create(sampleChunkInput);
      const flowiseId = createResult.data!.flowiseChunkId;

      const result = await repo.getByFlowiseChunkId(flowiseId!);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.flowiseChunkId).toBe(flowiseId);
    });

    it('should return null for non-existent Flowise ID', async () => {
      const result = await repo.getByFlowiseChunkId('non-existent-flowise-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle undefined flowiseChunkId', async () => {
      const input = { ...sampleChunkInput, flowiseChunkId: undefined };
      const createResult = await repo.create(input);

      const result = await repo.getByFlowiseChunkId('any-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('batchCreate', () => {
    it('should create multiple chunks in batch', async () => {
      const chunks: CreateDocumentChunkInput[] = [
        { ...sampleChunkInput, chunkIndex: 0, text: 'Chunk 1' },
        { ...sampleChunkInput, chunkIndex: 1, text: 'Chunk 2' },
        { ...sampleChunkInput, chunkIndex: 2, text: 'Chunk 3' },
      ];

      const result = await repo.batchCreate(chunks);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
      expect(result.data[0].text).toBe('Chunk 1');
      expect(result.data[1].text).toBe('Chunk 2');
      expect(result.data[2].text).toBe('Chunk 3');
    });

    it('should handle empty batch', async () => {
      const result = await repo.batchCreate([]);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it('should handle partial failures gracefully', async () => {
      const chunks: CreateDocumentChunkInput[] = [
        { ...sampleChunkInput, chunkIndex: 0, text: 'Valid chunk' },
        { ...sampleChunkInput, chunkIndex: 1, text: '' }, // Invalid
      ];

      const result = await repo.batchCreate(chunks);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].text).toBe('Valid chunk');
    });
  });

  describe('edge cases', () => {
    it('should handle empty tokenCount', async () => {
      const input = { ...sampleChunkInput, tokenCount: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.tokenCount).toBeUndefined();
    });

    it('should handle empty flowiseChunkId', async () => {
      const input = { ...sampleChunkInput, flowiseChunkId: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.flowiseChunkId).toBeUndefined();
    });

    it('should handle empty metadataJson', async () => {
      const input = { ...sampleChunkInput, metadataJson: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.metadataJson).toBeUndefined();
    });

    it('should handle very long text', async () => {
      const longText = 'A'.repeat(100000);
      const input = { ...sampleChunkInput, text: longText };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe(longText);
    });

    it('should handle special characters in text', async () => {
      const specialText = 'Text with "quotes", \'apostrophes\', and \n newlines.';
      const input = { ...sampleChunkInput, text: specialText };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe(specialText);
    });

    it('should handle large chunk index', async () => {
      const input = { ...sampleChunkInput, chunkIndex: 99999 };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.chunkIndex).toBe(99999);
    });

    it('should handle chunk with both document and deal', async () => {
      const input = { ...sampleChunkInput, documentId: 'doc123', dealId: 'deal456' };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.documentId).toBe('doc123');
      expect(result.data?.dealId).toBe('deal456');
    });
  });
});
