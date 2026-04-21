/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getDatabase } from '@process/services/database';
import { DealContextService } from '@process/services/ma/DealContextService';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import type { CreateDealInput } from '@/common/ma/types';

// Mock getDatabase
vi.mock('@process/services/database');

describe('DealContextService - Durable Active Deal Persistence', () => {
  let service: DealContextService;
  let repository: DealRepository;
  let mockDriver: any;
  let testDbPath: string;
  const deals: Map<string, any> = new Map();

  beforeEach(async () => {
    deals.clear();

    // Create mock driver that simulates database behavior
    mockDriver = {
      prepare: vi.fn((query: string) => {
        if (query.includes('SELECT') && query.includes('is_active = 1')) {
          return {
            get: vi.fn(() => {
              for (const [id, deal] of deals) {
                if (deal.is_active === 1) {
                  return { ...deal, id };
                }
              }
              return undefined;
            }),
            all: vi.fn(() => {
              const active = [];
              for (const [id, deal] of deals) {
                if (deal.is_active === 1) {
                  active.push({ ...deal, id });
                }
              }
              return active;
            }),
            run: vi.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
          };
        }

        if (query.includes('SELECT') && query.includes('WHERE id = ?')) {
          return {
            get: vi.fn((id: string) => {
              const deal = deals.get(id);
              return deal ? { ...deal, id } : undefined;
            }),
            all: vi.fn(() => []),
            run: vi.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
          };
        }

        if (query.includes('UPDATE ma_deals SET is_active = 0')) {
          return {
            get: vi.fn(() => undefined),
            all: vi.fn(() => []),
            run: vi.fn(() => {
              for (const deal of deals.values()) {
                deal.is_active = 0;
              }
              return { changes: deals.size, lastInsertRowid: 0 };
            }),
          };
        }

        if (query.includes('UPDATE ma_deals SET is_active = 1')) {
          return {
            get: vi.fn(() => undefined),
            all: vi.fn(() => []),
            run: vi.fn((...args: any[]) => {
              const id = args[args.length - 1];
              const deal = deals.get(id);
              if (deal) {
                deal.is_active = 1;
                deal.updated_at = Date.now();
              }
              return { changes: 1, lastInsertRowid: 0 };
            }),
          };
        }

        if (query.includes('INSERT INTO ma_deals')) {
          return {
            get: vi.fn(() => undefined),
            all: vi.fn(() => []),
            run: vi.fn((...args: any[]) => {
              const id = args[0];
              deals.set(id, {
                id,
                name: args[1],
                parties: args[2],
                transaction_type: args[3],
                target_company: args[4],
                status: args[5],
                extra: args[6],
                is_active: 0,
                created_at: args[7],
                updated_at: args[8],
              });
              return { changes: 1, lastInsertRowid: 0 };
            }),
          };
        }

        if (query.includes('DELETE FROM ma_deals')) {
          return {
            get: vi.fn(() => undefined),
            all: vi.fn(() => []),
            run: vi.fn((id: string) => {
              const deleted = deals.delete(id);
              return { changes: deleted ? 1 : 0, lastInsertRowid: 0 };
            }),
          };
        }

        // Default mock
        return {
          get: vi.fn(() => undefined),
          all: vi.fn(() => []),
          run: vi.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
        };
      }),
      exec: vi.fn(),
      pragma: vi.fn(() => 0),
      transaction: vi.fn((fn) => fn),
      close: vi.fn(),
    };

    testDbPath = join(tmpdir(), `deal-context-test-${Date.now()}.db`);

    vi.mocked(getDatabase).mockResolvedValue({
      getDriver: () => mockDriver,
      close: async () => {},
    } as any);

    repository = new DealRepository();
    service = new DealContextService(repository);
  });

  afterEach(async () => {
    try {
      await rm(testDbPath, { force: true });
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  const createTestDeal = async (name: string): Promise<string> => {
    const input: CreateDealInput = {
      name,
      parties: [{ name: 'Test Party', role: 'buyer' }],
      transactionType: 'acquisition',
      targetCompany: { name: 'Target Corp' },
    };
    const result = await service.createDeal(input);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    return result.data!.id;
  };

  describe('restore-active happy path', () => {
    it('should restore active deal from durable storage after service restart', async () => {
      // Create a deal and set it as active
      const dealId = await createTestDeal('Deal 1');
      const setActiveResult = await service.setActiveDeal(dealId);
      expect(setActiveResult.success).toBe(true);

      // Simulate service restart by creating a new service instance
      const newService = new DealContextService(repository);

      // Active deal should be restored from database
      const activeResult = await newService.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data).toBeDefined();
      expect(activeResult.data!.id).toBe(dealId);
    });

    it('should return null when no active deal is set', async () => {
      const result = await service.getActiveDeal();
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should restore active deal ID correctly', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      const activeId = await service.getActiveDealId();
      expect(activeId).toBe(dealId);
    });
  });

  describe('clear-active happy path', () => {
    it('should clear active deal idempotently', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      // First clear
      await service.clearActiveDeal();
      let result = await service.getActiveDeal();
      expect(result.data).toBeNull();

      // Second clear (idempotent - should not error)
      await service.clearActiveDeal();
      result = await service.getActiveDeal();
      expect(result.data).toBeNull();
    });

    it('should clear active deal when clearing with no active deal', async () => {
      // No active deal set
      await service.clearActiveDeal();
      const result = await service.getActiveDeal();
      expect(result.data).toBeNull();
    });
  });

  describe('stale-pointer recovery path', () => {
    it('should clear active deal when the active deal is deleted', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      // Delete the active deal
      const deleteResult = await service.deleteDeal(dealId);
      expect(deleteResult.success).toBe(true);

      // Active deal should be cleared
      const activeResult = await service.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data).toBeNull();
    });

    it('should clear active deal when the active deal is archived', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      // Archive the active deal
      const archiveResult = await service.archiveDeal(dealId);
      expect(archiveResult.success).toBe(true);

      // Active deal should be cleared
      const activeResult = await service.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data).toBeNull();
    });

    it('should clear active deal when the active deal is closed', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      // Close the active deal
      const closeResult = await service.closeDeal(dealId);
      expect(closeResult.success).toBe(true);

      // Active deal should be cleared
      const activeResult = await service.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data).toBeNull();
    });

    it('should not clear active deal when a non-active deal is deleted', async () => {
      const dealId1 = await createTestDeal('Deal 1');
      const dealId2 = await createTestDeal('Deal 2');

      await service.setActiveDeal(dealId1);

      // Delete non-active deal
      await service.deleteDeal(dealId2);

      // Active deal should still be dealId1
      const activeResult = await service.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data!.id).toBe(dealId1);
    });
  });

  describe('persistence proof', () => {
    it('should persist active deal across database queries (proof global state is not used)', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      // Verify global object does not contain active deal ID
      expect((global as any).__maActiveDealId).toBeUndefined();

      // Verify active deal is persisted in mock storage
      const activeResult = await service.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data!.id).toBe(dealId);

      // Verify the deal in storage has is_active = 1
      const storedDeal = deals.get(dealId);
      expect(storedDeal).toBeDefined();
      expect(storedDeal.is_active).toBe(1);

      // Verify other deals are not active
      const dealId2 = await createTestDeal('Deal 2');
      const storedDeal2 = deals.get(dealId2);
      expect(storedDeal2.is_active).toBe(0);
    });

    it('should switch active deal correctly in database', async () => {
      const dealId1 = await createTestDeal('Deal 1');
      const dealId2 = await createTestDeal('Deal 2');

      await service.setActiveDeal(dealId1);

      // Verify dealId1 is active in storage
      let storedDeal = deals.get(dealId1);
      expect(storedDeal.is_active).toBe(1);

      // Switch to dealId2
      await service.setActiveDeal(dealId2);

      // Verify dealId1 is no longer active
      storedDeal = deals.get(dealId1);
      expect(storedDeal.is_active).toBe(0);

      // Verify dealId2 is now active
      storedDeal = deals.get(dealId2);
      expect(storedDeal.is_active).toBe(1);
    });

    it('should fail if global state were used (process isolation test)', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      // Verify global object does not contain active deal ID
      // This would fail if the old global state implementation was still in use
      expect((global as any).__maActiveDealId).toBeUndefined();

      // Verify persistence works without global state
      const activeResult = await service.getActiveDeal();
      expect(activeResult.success).toBe(true);
      expect(activeResult.data!.id).toBe(dealId);
    });
  });

  describe('setActiveDeal behavior', () => {
    it('should fail when setting non-existent deal as active', async () => {
      const result = await service.setActiveDeal('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Deal not found');
    });

    it('should clear previous active deal when setting new active deal', async () => {
      const dealId1 = await createTestDeal('Deal 1');
      const dealId2 = await createTestDeal('Deal 2');

      await service.setActiveDeal(dealId1);
      await service.setActiveDeal(dealId2);

      const activeResult = await service.getActiveDeal();
      expect(activeResult.data!.id).toBe(dealId2);
    });
  });

  describe('isActiveDeal', () => {
    it('should return true for active deal', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      const isActive = await service.isActiveDeal(dealId);
      expect(isActive).toBe(true);
    });

    it('should return false for non-active deal', async () => {
      const dealId = await createTestDeal('Deal 1');
      await service.setActiveDeal(dealId);

      const dealId2 = await createTestDeal('Deal 2');
      const isActive = await service.isActiveDeal(dealId2);
      expect(isActive).toBe(false);
    });

    it('should return false when no active deal', async () => {
      const dealId = await createTestDeal('Deal 1');
      const isActive = await service.isActiveDeal(dealId);
      expect(isActive).toBe(false);
    });
  });
});
