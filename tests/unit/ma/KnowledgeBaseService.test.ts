/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KnowledgeBaseService Tests
 * --------------------------
 * Wave 9 / Batch 9B: Knowledge-base and ingestion plane
 *
 * Coverage:
 *   - Ingestion: registerSource, beginIngestion, ingestChunks, ingestDocument
 *   - Retrieval: getChunksByDocument, getChunksByDeal, searchChunks, getChunksByFreshness
 *   - Provenance/Freshness: updateProvenance, recomputeAllFreshness, freshness computation
 *
 * These tests use real repositories with an in-memory database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { KnowledgeBaseService } from '@process/services/ma/KnowledgeBaseService';
import { getKbSourceRepository } from '@process/services/database/repositories/ma/KbSourceRepository';
import { getDocumentChunkRepository } from '@process/services/database/repositories/ma/DocumentChunkRepository';
import { getDealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { getDocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import type { Provenance } from '@/common/ma/sourceCache/schema';
import type { CreateDealInput } from '@/common/ma/types';
import type { CreateDocumentInput } from '@/common/ma/types';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('KnowledgeBaseService', () => {
  let driver: ISqliteDriver;
  let service: KnowledgeBaseService;
  let kbRepo: ReturnType<typeof getKbSourceRepository>;
  let chunkRepo: ReturnType<typeof getDocumentChunkRepository>;
  let dealRepo: ReturnType<typeof getDealRepository>;
  let documentRepo: ReturnType<typeof getDocumentRepository>;

  // Fixed clock for deterministic freshness tests
  const fixedNow = 1700000000000;
  const oneHour = 3600 * 1000;
  const oneDay = 24 * oneHour;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);

    kbRepo = getKbSourceRepository();
    chunkRepo = getDocumentChunkRepository();
    dealRepo = getDealRepository();
    documentRepo = getDocumentRepository();

    service = new KnowledgeBaseService({
      kbSourceRepository: kbRepo,
      documentChunkRepository: chunkRepo,
      now: () => fixedNow,
    });
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  // ==========================================================================
  // Ingestion Coverage
  // ==========================================================================

  describe('ingestion', () => {
    const sampleProvenance: Provenance = {
      source: 'test-processor',
      fetchedAt: fixedNow - oneHour,
      policy: 'canonical',
      freshnessTtlMs: oneDay,
    };

    const createDealInput: CreateDealInput = {
      name: 'Test Deal',
      parties: [{ name: 'Buyer', role: 'buyer' }],
      transactionType: 'acquisition',
      targetCompany: { name: 'Target Co' },
    };

    const createDocumentInput: CreateDocumentInput = {
      dealId: 'deal1',
      filename: 'contract.pdf',
      originalPath: '/tmp/contract.pdf',
      format: 'pdf',
      size: 1024,
    };

    it('should register a KB source with provenance', async () => {
      const result = await service.registerSource('deal', 'deal1', sampleProvenance, {
        embeddingModel: 'text-embedding-3-small',
      });

      expect(result.success).toBe(true);
      expect(result.data?.scope).toBe('deal');
      expect(result.data?.scopeId).toBe('deal1');
      expect(result.data?.embeddingModel).toBe('text-embedding-3-small');
      expect(result.data?.status).toBe('pending');
      expect(result.data?.provenanceJson).toBe(JSON.stringify(sampleProvenance));
    });

    it('should compute freshness on registration', async () => {
      // Provenance with TTL - should be fresh (1 hour ago, 24 hour TTL)
      const result = await service.registerSource('deal', 'deal1', sampleProvenance);

      expect(result.data?.freshness).toBe('fresh');
    });

    it('should mark source as ingesting', async () => {
      const registerResult = await service.registerSource('deal', 'deal1', sampleProvenance);
      const kbSourceId = registerResult.data!.id;

      const result = await service.beginIngestion(kbSourceId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('ingesting');
    });

    it('should ingest chunks and mark source completed', async () => {
      const registerResult = await service.registerSource('deal', 'deal1', sampleProvenance);
      const kbSourceId = registerResult.data!.id;

      const chunks = [
        { text: 'First chunk content', tokenCount: 10 },
        { text: 'Second chunk content', tokenCount: 15 },
        { text: 'Third chunk content', tokenCount: 20 },
      ];

      const result = await service.ingestChunks(kbSourceId, 'doc1', chunks, 'deal1');

      expect(result.success).toBe(true);
      expect(result.kbSourceId).toBe(kbSourceId);
      expect(result.chunkCount).toBe(3);

      // Verify source is completed
      const sourceResult = await kbRepo.get(kbSourceId);
      expect(sourceResult.data?.status).toBe('completed');
      expect(sourceResult.data?.chunkCount).toBe(3);
      expect(sourceResult.data?.lastIngestedAt).toBeGreaterThan(0);
    });

    it('should fail ingestion when KB source not found', async () => {
      const chunks = [{ text: 'Test chunk' }];
      const result = await service.ingestChunks('non-existent-id', 'doc1', chunks);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should mark ingestion as failed', async () => {
      const registerResult = await service.registerSource('deal', 'deal1', sampleProvenance);
      const kbSourceId = registerResult.data!.id;

      const result = await service.failIngestion(kbSourceId, 'Processing error occurred');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('error');
      expect(result.data?.errorText).toBe('Processing error occurred');
    });

    it('should run full ingestDocument pipeline', async () => {
      const chunks = [
        { text: 'Chunk one', tokenCount: 5 },
        { text: 'Chunk two', tokenCount: 10 },
      ];

      const result = await service.ingestDocument('deal', 'deal1', 'doc1', chunks, sampleProvenance, {
        dealId: 'deal1',
        embeddingModel: 'text-embedding-3-small',
      });

      expect(result.success).toBe(true);
      expect(result.chunkCount).toBe(2);
      expect(result.provenance).toEqual(sampleProvenance);

      // Verify source exists and is completed
      const sourceResult = await service.getSource('deal', 'deal1');
      expect(sourceResult.data?.status).toBe('completed');
      expect(sourceResult.data?.embeddingModel).toBe('text-embedding-3-small');
    });

    it('should upsert existing source on re-ingestion', async () => {
      // First ingestion
      await service.ingestDocument('deal', 'deal1', 'doc1', [{ text: 'Old chunk' }], sampleProvenance);

      // Second ingestion with updated provenance
      const newProvenance: Provenance = {
        ...sampleProvenance,
        fetchedAt: fixedNow,
      };
      const result = await service.ingestDocument(
        'deal',
        'deal1',
        'doc1',
        [{ text: 'New chunk', tokenCount: 100 }],
        newProvenance
      );

      expect(result.success).toBe(true);
      expect(result.chunkCount).toBe(1);

      // Should be same source
      const sourceResult = await service.getSource('deal', 'deal1');
      expect(sourceResult.data?.chunkCount).toBe(1); // Updated
    });
  });

  // ==========================================================================
  // Retrieval Coverage
  // ==========================================================================

  describe('retrieval', () => {
    const sampleProvenance: Provenance = {
      source: 'test-processor',
      fetchedAt: fixedNow - oneHour,
      policy: 'canonical',
      freshnessTtlMs: oneDay,
    };

    beforeEach(async () => {
      // Setup: Create deal, document, and ingest chunks
      const dealInput: CreateDealInput = {
        name: 'Retrieval Test Deal',
        parties: [{ name: 'Party A', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target' },
      };
      const dealResult = await dealRepo.create(dealInput);
      const dealId = dealResult.data!.id;

      // Ingest chunks for this deal
      await service.ingestDocument(
        'deal',
        dealId,
        'doc1',
        [
          { text: 'Financial terms are favorable', tokenCount: 5, metadata: { page: 1 } },
          { text: 'Contract includes non-compete clause', tokenCount: 6, metadata: { page: 2 } },
          { text: 'Closing date is set for next quarter', tokenCount: 7, metadata: { page: 3 } },
        ],
        sampleProvenance,
        { dealId }
      );
    });

    it('should get chunks by document', async () => {
      const result = await service.getChunksByDocument('doc1');

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.data[0].text).toContain('Financial terms');
    });

    it('should get chunks by deal', async () => {
      // Get the deal we created in beforeEach
      const deals = await dealRepo.listByStatus('active');
      const dealId = deals.data[0]?.id ?? 'unknown';

      const result = await service.getChunksByDeal(dealId);

      expect(result.data.length).toBe(3);
      expect(result.data.every((c) => c.dealId === dealId)).toBe(true);
    });

    it('should search chunks by text content', async () => {
      const result = await service.searchChunks('non-compete');

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0].text).toContain('non-compete');
    });

    it('should return empty search for non-matching query', async () => {
      const result = await service.searchChunks('xyz-not-found');

      expect(result.chunks.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should support pagination in search', async () => {
      const result = await service.searchChunks('chunk', { limit: 1, offset: 0 });

      expect(result.chunks.length).toBeLessThanOrEqual(1);
      expect(result.hasMore).toBe(true);
    });
  });

  // ==========================================================================
  // Provenance/Freshness Coverage
  // ==========================================================================

  describe('provenance and freshness', () => {
    it('should compute fresh status for recent data', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - oneHour, // 1 hour ago
        policy: 'canonical',
        freshnessTtlMs: oneDay, // 24 hour TTL
      };

      const result = await service.registerSource('deal', 'deal1', provenance);

      // 1 hour < 75% of 24 hours = 18 hours, so should be fresh
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should compute stale status for aging data', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - 20 * oneHour, // 20 hours ago
        policy: 'canonical',
        freshnessTtlMs: oneDay, // 24 hour TTL
      };

      const result = await service.registerSource('deal', 'deal1', provenance);

      // 20 hours > 75% of 24 hours = 18 hours, but < 24 hours, so stale
      expect(result.data?.freshness).toBe('stale');
    });

    it('should compute expired status for old data', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - 2 * oneDay, // 2 days ago
        policy: 'canonical',
        freshnessTtlMs: oneDay, // 24 hour TTL
      };

      const result = await service.registerSource('deal', 'deal1', provenance);

      // 48 hours > 24 hours, so expired
      expect(result.data?.freshness).toBe('expired');
    });

    it('should compute unknown status for zero TTL', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow,
        policy: 'canonical',
        freshnessTtlMs: 0, // No TTL
      };

      const result = await service.registerSource('deal', 'deal1', provenance);

      expect(result.data?.freshness).toBe('unknown');
    });

    it('should update provenance and recompute freshness', async () => {
      const initialProvenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - 2 * oneDay,
        policy: 'canonical',
        freshnessTtlMs: oneDay,
      };

      const registerResult = await service.registerSource('deal', 'deal1', initialProvenance);
      const kbSourceId = registerResult.data!.id;

      expect(registerResult.data?.freshness).toBe('expired');

      // Update with fresh provenance
      const updatedProvenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow, // Now
        policy: 'canonical',
        freshnessTtlMs: oneDay,
      };

      const updateResult = await service.updateProvenance(kbSourceId, updatedProvenance);

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.freshness).toBe('fresh');
      expect(updateResult.data?.provenanceJson).toBe(JSON.stringify(updatedProvenance));
    });

    it('should get chunks by freshness filter', async () => {
      // Create sources with different freshness
      const freshProvenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - oneHour,
        policy: 'canonical',
        freshnessTtlMs: oneDay,
      };

      const expiredProvenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - 2 * oneDay,
        policy: 'canonical',
        freshnessTtlMs: oneDay,
      };

      await service.ingestDocument('deal', 'deal-fresh', 'doc1', [{ text: 'Fresh content' }], freshProvenance);
      await service.ingestDocument('deal', 'deal-expired', 'doc2', [{ text: 'Expired content' }], expiredProvenance);

      // Get fresh chunks only
      const result = await service.getChunksByFreshness('fresh');

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.freshnessStats.fresh).toBeGreaterThan(0);
    });

    it('should recompute freshness for all sources', async () => {
      // Create a source
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - oneHour,
        policy: 'canonical',
        freshnessTtlMs: oneDay,
      };
      await service.registerSource('deal', 'deal1', provenance);

      // Recompute with same time - should not change
      const result = await service.recomputeAllFreshness();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0); // No changes needed
    });

    it('should provide statistics', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow - oneHour,
        policy: 'canonical',
        freshnessTtlMs: oneDay,
      };

      await service.ingestDocument('deal', 'deal1', 'doc1', [{ text: 'Test chunk' }], provenance);

      const result = await service.getStats();

      expect(result.success).toBe(true);
      expect(result.data.totalSources).toBeGreaterThan(0);
      expect(result.data.byStatus.completed).toBeGreaterThan(0);
      expect(result.data.byFreshness.fresh).toBeGreaterThan(0);
      expect(result.data.totalChunks).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty chunk list', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow,
        policy: 'canonical',
      };

      const registerResult = await service.registerSource('deal', 'deal1', provenance);
      const kbSourceId = registerResult.data!.id;

      const result = await service.ingestChunks(kbSourceId, 'doc1', []);

      expect(result.success).toBe(true);
      expect(result.chunkCount).toBe(0);
    });

    it('should handle large chunk text', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow,
        policy: 'canonical',
      };

      const largeText = 'A'.repeat(100000);

      const result = await service.ingestDocument('deal', 'deal1', 'doc1', [{ text: largeText }], provenance);

      expect(result.success).toBe(true);
    });

    it('should delete source and associated chunks', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow,
        policy: 'canonical',
      };

      const ingestResult = await service.ingestDocument('deal', 'deal1', 'doc1', [{ text: 'Test' }], provenance);
      const kbSourceId = ingestResult.kbSourceId!;

      // Verify chunks exist
      const chunksBefore = await service.getChunksByDeal('deal1');
      expect(chunksBefore.data.length).toBe(1);

      // Delete source
      const deleteResult = await service.deleteSource(kbSourceId);
      expect(deleteResult.success).toBe(true);

      // Verify source is gone
      const sourceAfter = await kbRepo.get(kbSourceId);
      expect(sourceAfter.data).toBeNull();
    });

    it('should handle all scope types', async () => {
      const provenance: Provenance = {
        source: 'test',
        fetchedAt: fixedNow,
        policy: 'canonical',
      };

      const dealResult = await service.registerSource('deal', 'd1', provenance);
      const companyResult = await service.registerSource('company', 'c1', provenance);
      const globalResult = await service.registerSource('global', 'g1', provenance);

      expect(dealResult.success).toBe(true);
      expect(companyResult.success).toBe(true);
      expect(globalResult.success).toBe(true);

      expect(dealResult.data?.scope).toBe('deal');
      expect(companyResult.data?.scope).toBe('company');
      expect(globalResult.data?.scope).toBe('global');
    });
  });
});
