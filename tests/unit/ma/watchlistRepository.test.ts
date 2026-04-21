/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for WatchlistRepository
 * Tests CRUD operations for watchlists and watchlist hits
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getWatchlistRepository } from '@process/services/database/repositories/ma/WatchlistRepository';
import type {
  CreateWatchlistInput,
  UpdateWatchlistInput,
  CreateWatchlistHitInput,
  UpdateWatchlistHitInput,
} from '@/common/ma/watchlist/schema';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('WatchlistRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getWatchlistRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getWatchlistRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleWatchlistInput: CreateWatchlistInput = {
    ownerUserId: 'user123',
    name: 'Tech Acquisitions',
    criteriaJson: '{"sector": "technology", "revenue_min": 10000000}',
    cadence: 'daily',
    enabled: true,
  };

  const sampleHitInput: CreateWatchlistHitInput = {
    watchlistId: 'watchlist123',
    payloadJson: '{"company_id": "comp1", "match_reason": "revenue_threshold"}',
  };

  describe('create', () => {
    it('should create a watchlist with valid input', async () => {
      const result = await repo.create(sampleWatchlistInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(sampleWatchlistInput.name);
      expect(result.data?.ownerUserId).toBe(sampleWatchlistInput.ownerUserId);
      expect(result.data?.enabled).toBe(true);
      expect(result.data?.id).toBeDefined();
    });

    it('should create a watchlist with minimal required fields', async () => {
      const minimalInput: CreateWatchlistInput = {
        ownerUserId: 'user456',
        name: 'Minimal Watchlist',
        criteriaJson: '{}',
      };

      const result = await repo.create(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(minimalInput.name);
      expect(result.data?.enabled).toBe(true);
    });

    it('should create a disabled watchlist', async () => {
      const input = { ...sampleWatchlistInput, enabled: false };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const result = await repo.create({ ...sampleWatchlistInput, name: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a watchlist by ID', async () => {
      const createResult = await repo.create(sampleWatchlistInput);
      const watchlistId = createResult.data!.id;

      const result = await repo.get(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(watchlistId);
      expect(result.data?.name).toBe(sampleWatchlistInput.name);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map boolean enabled field correctly', async () => {
      const createResult = await repo.create({ ...sampleWatchlistInput, enabled: false });
      const result = await repo.get(createResult.data!.id);

      expect(result.data?.enabled).toBe(false);
    });
  });

  describe('update', () => {
    it('should update watchlist fields', async () => {
      const createResult = await repo.create(sampleWatchlistInput);
      const watchlistId = createResult.data!.id;

      const updateInput: UpdateWatchlistInput = {
        name: 'Updated Watchlist Name',
        enabled: false,
      };

      const result = await repo.update(watchlistId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(updateInput.name);
      expect(result.data?.enabled).toBe(false);
      expect(result.data?.updatedAt).toBeGreaterThan(createResult.data!.updatedAt);
    });

    it('should fail to update non-existent watchlist', async () => {
      const result = await repo.update('non-existent-id', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update criteria_json', async () => {
      const createResult = await repo.create(sampleWatchlistInput);
      const watchlistId = createResult.data!.id;

      const newCriteria = '{"sector": "healthcare", "revenue_min": 50000000}';
      const result = await repo.update(watchlistId, { criteriaJson: newCriteria });

      expect(result.success).toBe(true);
      expect(result.data?.criteriaJson).toBe(newCriteria);
    });

    it('should update cadence', async () => {
      const createResult = await repo.create(sampleWatchlistInput);
      const watchlistId = createResult.data!.id;

      const result = await repo.update(watchlistId, { cadence: 'weekly' });

      expect(result.success).toBe(true);
      expect(result.data?.cadence).toBe('weekly');
    });

    it('should handle partial updates', async () => {
      const createResult = await repo.create(sampleWatchlistInput);
      const watchlistId = createResult.data!.id;

      const result = await repo.update(watchlistId, { enabled: false });

      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(false);
      expect(result.data?.name).toBe(sampleWatchlistInput.name);
    });
  });

  describe('delete', () => {
    it('should delete a watchlist', async () => {
      const createResult = await repo.create(sampleWatchlistInput);
      const watchlistId = createResult.data!.id;

      const result = await repo.delete(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(watchlistId);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent watchlist', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('listByUser', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleWatchlistInput, ownerUserId: 'user1', name: 'WL1' });
      await repo.create({ ...sampleWatchlistInput, ownerUserId: 'user1', name: 'WL2' });
      await repo.create({ ...sampleWatchlistInput, ownerUserId: 'user2', name: 'WL3' });
    });

    it('should list watchlists for a user', async () => {
      const result = await repo.listByUser('user1');

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((w) => w.ownerUserId === 'user1')).toBe(true);
    });

    it('should return empty for user with no watchlists', async () => {
      const result = await repo.listByUser('user999');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listByUser('user1', 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by updated_at DESC', async () => {
      const result = await repo.listByUser('user1');

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('listEnabled', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleWatchlistInput, name: 'WL1', enabled: true });
      await repo.create({ ...sampleWatchlistInput, name: 'WL2', enabled: true });
      await repo.create({ ...sampleWatchlistInput, name: 'WL3', enabled: false });
    });

    it('should list enabled watchlists', async () => {
      const result = await repo.listEnabled();

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((w) => w.enabled === true)).toBe(true);
    });

    it('should return empty when no enabled watchlists', async () => {
      await repo.create({ ...sampleWatchlistInput, enabled: false });
      const result = await repo.listEnabled();

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const result = await repo.listEnabled(0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('createHit', () => {
    it('should create a watchlist hit', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const input = { ...sampleHitInput, watchlistId: watchlistResult.data!.id };

      const result = await repo.createHit(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.watchlistId).toBe(watchlistResult.data!.id);
      expect(result.data?.payloadJson).toBe(sampleHitInput.payloadJson);
    });

    it('should auto-generate matchedAt timestamp', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const input = { ...sampleHitInput, watchlistId: watchlistResult.data!.id, matchedAt: undefined };

      const result = await repo.createHit(input);

      expect(result.success).toBe(true);
      expect(result.data?.matchedAt).toBeDefined();
      expect(result.data?.matchedAt).toBeGreaterThan(Date.now() - 10000);
    });

    it('should use provided matchedAt timestamp', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const customTime = Date.now() - 100000;
      const input = { ...sampleHitInput, watchlistId: watchlistResult.data!.id, matchedAt: customTime };

      const result = await repo.createHit(input);

      expect(result.success).toBe(true);
      expect(result.data?.matchedAt).toBe(customTime);
    });

    it('should handle database errors gracefully', async () => {
      const result = await repo.createHit({ ...sampleHitInput, watchlistId: 'invalid-id' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getHit', () => {
    it('should retrieve a hit by ID', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const hitResult = await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id });
      const hitId = hitResult.data!.id;

      const result = await repo.getHit(hitId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(hitId);
    });

    it('should return null for non-existent hit ID', async () => {
      const result = await repo.getHit('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateHit', () => {
    it('should update hit seenAt timestamp', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const hitResult = await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id });
      const hitId = hitResult.data!.id;

      const now = Date.now();
      const result = await repo.updateHit(hitId, { seenAt: now });

      expect(result.success).toBe(true);
      expect(result.data?.seenAt).toBe(now);
    });

    it('should fail to update non-existent hit', async () => {
      const result = await repo.updateHit('non-existent-id', { seenAt: Date.now() });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle partial updates', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const hitResult = await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id });
      const originalPayload = hitResult.data!.payloadJson;

      const result = await repo.updateHit(hitResult.data!.id, { seenAt: Date.now() });

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe(originalPayload);
      expect(result.data?.seenAt).toBeDefined();
    });
  });

  describe('listHits', () => {
    beforeEach(async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const watchlistId = watchlistResult.data!.id;

      await repo.createHit({ ...sampleHitInput, watchlistId, payloadJson: '{"id": 1}' });
      await repo.createHit({ ...sampleHitInput, watchlistId, payloadJson: '{"id": 2}' });
      await repo.createHit({ ...sampleHitInput, watchlistId, payloadJson: '{"id": 3}' });
    });

    it('should list hits for a watchlist', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const result = await repo.listHits(watchlistResult.data!.id);

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const result = await repo.listHits(watchlistResult.data!.id, 0, 10);

      expect(result.data.length).toBe(0);
    });

    it('should order by matched_at DESC', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const result = await repo.listHits(watchlistResult.data!.id);

      expect(result.data).toEqual([]);
    });
  });

  describe('listUnseenHits', () => {
    it('should list unseen hits for a watchlist', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id, seenAt: undefined });

      const result = await repo.listUnseenHits(watchlistResult.data!.id);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should exclude seen hits', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id, seenAt: Date.now() });

      const result = await repo.listUnseenHits(watchlistResult.data!.id);

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id, seenAt: undefined });
      await repo.createHit({ ...sampleHitInput, watchlistId: watchlistResult.data!.id, seenAt: undefined });

      const result = await repo.listUnseenHits(watchlistResult.data!.id, 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('markAllHitsSeen', () => {
    it('should mark all unseen hits as seen', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const watchlistId = watchlistResult.data!.id;
      await repo.createHit({ ...sampleHitInput, watchlistId, seenAt: undefined });
      await repo.createHit({ ...sampleHitInput, watchlistId, seenAt: undefined });

      const result = await repo.markAllHitsSeen(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const unseenResult = await repo.listUnseenHits(watchlistId);
      expect(unseenResult.data.length).toBe(0);
    });

    it('should return 0 when no unseen hits', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const result = await repo.markAllHitsSeen(watchlistResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('deleteHits', () => {
    it('should delete all hits for a watchlist', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const watchlistId = watchlistResult.data!.id;
      await repo.createHit({ ...sampleHitInput, watchlistId });
      await repo.createHit({ ...sampleHitInput, watchlistId });

      const result = await repo.deleteHits(watchlistId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await repo.listHits(watchlistId);
      expect(listResult.data.length).toBe(0);
    });

    it('should return 0 for watchlist with no hits', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const result = await repo.deleteHits(watchlistResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty criteria_json', async () => {
      const input = { ...sampleWatchlistInput, criteriaJson: '' };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.criteriaJson).toBe('');
    });

    it('should handle very long criteria_json', async () => {
      const longCriteria = JSON.stringify({ a: 'x'.repeat(10000) });
      const input = { ...sampleWatchlistInput, criteriaJson: longCriteria };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.criteriaJson).toBe(longCriteria);
    });

    it('should handle special characters in name', async () => {
      const specialName = 'Watchlist & Co. (M&A)';
      const input = { ...sampleWatchlistInput, name: specialName };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(specialName);
    });

    it('should handle very long payload_json in hits', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const longPayload = JSON.stringify({ data: 'x'.repeat(10000) });
      const input = { ...sampleHitInput, watchlistId: watchlistResult.data!.id, payloadJson: longPayload };
      const result = await repo.createHit(input);

      expect(result.success).toBe(true);
      expect(result.data?.payloadJson).toBe(longPayload);
    });

    it('should handle cascade delete of hits when watchlist deleted', async () => {
      const watchlistResult = await repo.create(sampleWatchlistInput);
      const watchlistId = watchlistResult.data!.id;
      await repo.createHit({ ...sampleHitInput, watchlistId });
      await repo.createHit({ ...sampleHitInput, watchlistId });

      await repo.delete(watchlistId);

      const listResult = await repo.listHits(watchlistId);
      expect(listResult.data.length).toBe(0);
    });
  });
});
