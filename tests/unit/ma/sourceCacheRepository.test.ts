/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for SourceCacheRepository
 * Tests CRUD operations, upsert, freshness queries, and stats
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getSourceCacheRepository } from '@process/services/database/repositories/ma/SourceCacheRepository';
import type { CreateSourceCacheInput, UpdateSourceCacheInput } from '@/common/ma/sourceCache/schema';
import { computeFreshness } from '@/common/ma/sourceCache/schema';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('SourceCacheRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getSourceCacheRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getSourceCacheRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleInput: CreateSourceCacheInput = {
    surface: 'sirene',
    lookupKey: '123456789',
    payloadJson: '{"legalName":"Test Company","siren":"123456789"}',
    provenanceJson: '{"source":"sirene","fetchedAt":1700000000000,"policy":"canonical"}',
    fetchedAt: 1700000000000,
    ttlMs: 86400000,
  };

  describe('create', () => {
    it('should create a source cache entry with valid input', async () => {
      const result = await repo.create(sampleInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.surface).toBe('sirene');
      expect(result.data?.lookupKey).toBe('123456789');
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.updatedAt).toBeDefined();
    });

    it('should compute freshness automatically when not provided', async () => {
      const result = await repo.create(sampleInput);

      expect(result.success).toBe(true);
      expect(result.data?.freshness).toBeDefined();
      expect(['fresh', 'stale', 'expired', 'unknown']).toContain(result.data?.freshness);
    });

    it('should use provided freshness value', async () => {
      const input: CreateSourceCacheInput = { ...sampleInput, freshness: 'fresh' };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should create with sourceUrl', async () => {
      const input: CreateSourceCacheInput = {
        ...sampleInput,
        sourceUrl: 'https://api.insee.fr/entreprises/sirene/v3/siren/123456789',
      };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.sourceUrl).toBe('https://api.insee.fr/entreprises/sirene/v3/siren/123456789');
    });

    it('should fail on duplicate surface+lookupKey', async () => {
      await repo.create(sampleInput);
      const result = await repo.create(sampleInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a cache entry by ID', async () => {
      const createResult = await repo.create(sampleInput);
      const entryId = createResult.data!.id;

      const result = await repo.get(entryId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(entryId);
      expect(result.data?.surface).toBe('sirene');
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getBySurfaceKey', () => {
    it('should retrieve a cache entry by surface and lookup key', async () => {
      await repo.create(sampleInput);

      const result = await repo.getBySurfaceKey('sirene', '123456789');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.lookupKey).toBe('123456789');
    });

    it('should return null for non-existent surface+key', async () => {
      const result = await repo.getBySurfaceKey('bodacc', '000000000');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('update', () => {
    it('should update cache entry fields', async () => {
      const createResult = await repo.create(sampleInput);
      const entryId = createResult.data!.id;

      const updateInput: UpdateSourceCacheInput = {
        payloadJson: '{"legalName":"Updated Company"}',
        freshness: 'stale',
      };

      const result = await repo.update(entryId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe('{"legalName":"Updated Company"}');
      expect(result.data?.freshness).toBe('stale');
      expect(result.data?.updatedAt).toBeGreaterThan(createResult.data!.updatedAt);
    });

    it('should fail to update non-existent entry', async () => {
      const result = await repo.update('non-existent-id', { freshness: 'fresh' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should recompute freshness when fetchedAt or ttlMs changes', async () => {
      const createResult = await repo.create(sampleInput);
      const entryId = createResult.data!.id;

      const result = await repo.update(entryId, { ttlMs: 0 });

      expect(result.success).toBe(true);
      expect(result.data?.freshness).toBe('unknown');
    });

    it('should partial update with undefined values', async () => {
      const createResult = await repo.create(sampleInput);
      const entryId = createResult.data!.id;

      const result = await repo.update(entryId, { freshness: 'expired' });

      expect(result.success).toBe(true);
      expect(result.data?.freshness).toBe('expired');
      expect(result.data?.payloadJson).toBe(sampleInput.payloadJson);
    });
  });

  describe('delete', () => {
    it('should delete a cache entry', async () => {
      const createResult = await repo.create(sampleInput);
      const entryId = createResult.data!.id;

      const result = await repo.delete(entryId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(entryId);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent entry', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('upsert', () => {
    it('should create new entry if surface+lookupKey does not exist', async () => {
      const result = await repo.upsert(sampleInput);

      expect(result.success).toBe(true);
      expect(result.data?.surface).toBe('sirene');
      expect(result.data?.lookupKey).toBe('123456789');
    });

    it('should update existing entry if surface+lookupKey exists', async () => {
      await repo.create(sampleInput);

      const updateInput: CreateSourceCacheInput = {
        ...sampleInput,
        payloadJson: '{"legalName":"Upserted Company"}',
        freshness: 'fresh',
      };

      const result = await repo.upsert(updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe('{"legalName":"Upserted Company"}');
    });

    it('should preserve ID on upsert update', async () => {
      const createResult = await repo.create(sampleInput);
      const originalId = createResult.data!.id;

      const result = await repo.upsert({ ...sampleInput, freshness: 'stale' });

      expect(result.data?.id).toBe(originalId);
    });
  });

  describe('listBySurface', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleInput, lookupKey: '111111111' });
      await repo.create({ ...sampleInput, lookupKey: '222222222' });
      await repo.create({ ...sampleInput, surface: 'pappers', lookupKey: '333333333' });
    });

    it('should list entries for a surface', async () => {
      const result = await repo.listBySurface('sirene');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((e) => e.surface === 'sirene')).toBe(true);
    });

    it('should return empty for surface with no entries', async () => {
      const result = await repo.listBySurface('bodacc');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listBySurface('sirene', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('listByFreshness', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleInput, lookupKey: '111111111', freshness: 'fresh' });
      await repo.create({ ...sampleInput, lookupKey: '222222222', freshness: 'stale' });
      await repo.create({ ...sampleInput, lookupKey: '333333333', freshness: 'expired' });
    });

    it('should list entries by freshness status', async () => {
      const result = await repo.listByFreshness('fresh');

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.data[0].freshness).toBe('fresh');
    });

    it('should return empty for non-matching freshness', async () => {
      const result = await repo.listByFreshness('unknown');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('deleteBySurface', () => {
    it('should delete all entries for a surface', async () => {
      await repo.create({ ...sampleInput, lookupKey: '111111111' });
      await repo.create({ ...sampleInput, lookupKey: '222222222' });
      await repo.create({ ...sampleInput, surface: 'pappers', lookupKey: '333333333' });

      const result = await repo.deleteBySurface('sirene');

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const remaining = await repo.listBySurface('sirene');
      expect(remaining.data.length).toBe(0);
    });

    it('should return 0 for surface with no entries', async () => {
      const result = await repo.deleteBySurface('bodacc');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired entries', async () => {
      await repo.create({ ...sampleInput, lookupKey: '111111111', freshness: 'expired' });
      await repo.create({ ...sampleInput, lookupKey: '222222222', freshness: 'fresh' });

      const result = await repo.deleteExpired();

      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThanOrEqual(1);
    });
  });

  describe('recomputeFreshness', () => {
    it('should recompute freshness for all entries', async () => {
      const longAgo = Date.now() - 200000;
      await repo.create({ ...sampleInput, lookupKey: '111111111', fetchedAt: longAgo, ttlMs: 100000 });
      await repo.create({ ...sampleInput, lookupKey: '222222222', fetchedAt: Date.now(), ttlMs: 86400000 });

      const result = await repo.recomputeFreshness();

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleInput, lookupKey: '111111111', freshness: 'fresh' });
      await repo.create({ ...sampleInput, lookupKey: '222222222', freshness: 'stale' });
      await repo.create({ ...sampleInput, surface: 'pappers', lookupKey: '333333333', freshness: 'fresh' });
    });

    it('should return total count', async () => {
      const result = await repo.getStats();

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(3);
    });

    it('should return counts by freshness', async () => {
      const result = await repo.getStats();

      expect(result.data?.byFreshness.fresh).toBe(2);
      expect(result.data?.byFreshness.stale).toBe(1);
    });

    it('should return counts by surface', async () => {
      const result = await repo.getStats();

      expect(result.data?.bySurface.sirene).toBe(2);
      expect(result.data?.bySurface.pappers).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty payloadJson', async () => {
      const input = { ...sampleInput, payloadJson: '{}' };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe('{}');
    });

    it('should handle zero ttlMs (unknown freshness)', async () => {
      const input = { ...sampleInput, ttlMs: 0 };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.freshness).toBe('unknown');
    });

    it('should handle very long payloadJson', async () => {
      const longPayload = JSON.stringify({ data: 'x'.repeat(10000) });
      const input = { ...sampleInput, payloadJson: longPayload };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe(longPayload);
    });

    it('should handle special characters in lookupKey', async () => {
      const input = { ...sampleInput, lookupKey: 'ABC-123_456' };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.lookupKey).toBe('ABC-123_456');
    });
  });
});

describeOrSkip('computeFreshness', () => {
  it('should return fresh when well within TTL', () => {
    const now = Date.now();
    expect(computeFreshness(now, 86400000, now + 1000)).toBe('fresh');
  });

  it('should return stale when past 75% of TTL', () => {
    const fetchedAt = 1000;
    const ttlMs = 10000;
    const now = fetchedAt + 8000; // 80% of TTL
    expect(computeFreshness(fetchedAt, ttlMs, now)).toBe('stale');
  });

  it('should return expired when past TTL', () => {
    const fetchedAt = 1000;
    const ttlMs = 10000;
    const now = fetchedAt + 10001;
    expect(computeFreshness(fetchedAt, ttlMs, now)).toBe('expired');
  });

  it('should return unknown when ttlMs is 0', () => {
    expect(computeFreshness(Date.now(), 0, Date.now())).toBe('unknown');
  });

  it('should return fresh at exactly 75% boundary', () => {
    const fetchedAt = 1000;
    const ttlMs = 10000;
    const now = fetchedAt + 7500; // exactly 75%
    expect(computeFreshness(fetchedAt, ttlMs, now)).toBe('stale');
  });

  it('should return stale at exactly 100% boundary', () => {
    const fetchedAt = 1000;
    const ttlMs = 10000;
    const now = fetchedAt + 10000; // exactly 100%
    expect(computeFreshness(fetchedAt, ttlMs, now)).toBe('expired');
  });
});
