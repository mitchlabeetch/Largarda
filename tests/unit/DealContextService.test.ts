/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for DealContextService
 * Tests CRUD operations, active deal management, and persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DealContextService } from '@/process/services/ma/DealContextService';
import type { DealContext, CreateDealInput, DealStatus } from '@/common/ma/types';

// Mock the DealRepository
vi.mock('@process/services/database/repositories/ma/DealRepository', () => {
  const mockDeals: Map<string, DealContext> = new Map();

  return {
    DealRepository: class MockDealRepository {
      async create(input: CreateDealInput) {
        const id = `deal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const now = Date.now();
        const deal: DealContext = {
          id,
          name: input.name,
          parties: input.parties,
          transactionType: input.transactionType,
          targetCompany: input.targetCompany,
          status: input.status ?? 'active',
          extra: input.extra,
          createdAt: now,
          updatedAt: now,
        };
        mockDeals.set(id, deal);
        return { success: true, data: deal };
      }

      async get(id: string) {
        const deal = mockDeals.get(id);
        return { success: true, data: deal ?? null };
      }

      async update(id: string, updates: Partial<DealContext>) {
        const existing = mockDeals.get(id);
        if (!existing) {
          return { success: false, error: 'Deal not found' };
        }
        const updated: DealContext = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        };
        mockDeals.set(id, updated);
        return { success: true, data: updated };
      }

      async delete(id: string) {
        const existed = mockDeals.has(id);
        mockDeals.delete(id);
        return { success: true, data: existed };
      }

      async list(filter?: { status?: string }) {
        let deals = Array.from(mockDeals.values());
        if (filter?.status) {
          deals = deals.filter((d) => d.status === filter.status);
        }
        return { data: deals, total: deals.length, page: 0, pageSize: 50, hasMore: false };
      }

      async getActiveDeals() {
        const deals = Array.from(mockDeals.values()).filter((d) => d.status === 'active');
        return { success: true, data: deals };
      }

      async archive(id: string) {
        return this.update(id, { status: 'archived' });
      }

      async close(id: string) {
        return this.update(id, { status: 'closed' });
      }

      async reactivate(id: string) {
        return this.update(id, { status: 'active' });
      }
    },
  };
});

// Mock global storage for active deal
let mockActiveDealId: string | null = null;
vi.stubGlobal('__maActiveDealId', mockActiveDealId, { global: true });

describe('DealContextService', () => {
  let service: DealContextService;

  const validDealInput: CreateDealInput = {
    name: 'Test Deal',
    parties: [
      { name: 'Acquirer Corp', role: 'buyer' },
      { name: 'Target Inc', role: 'seller' },
    ],
    transactionType: 'acquisition',
    targetCompany: {
      name: 'Target Inc',
      industry: 'Technology',
      jurisdiction: 'Delaware, USA',
    },
  };

  beforeEach(() => {
    service = new DealContextService();
    mockActiveDealId = null;
    (global as any).__maActiveDealId = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createDeal', () => {
    it('should create a new deal', async () => {
      const result = await service.createDeal(validDealInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Test Deal');
      expect(result.data?.transactionType).toBe('acquisition');
      expect(result.data?.status).toBe('active');
    });

    it('should return error for invalid input', async () => {
      const invalidInput: CreateDealInput = {
        name: '',
        parties: [],
        transactionType: 'acquisition',
        targetCompany: { name: '' },
      };

      const validation = service.validateDealInput(invalidInput);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDeal', () => {
    it('should retrieve a deal by ID', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      const getResult = await service.getDeal(dealId);

      expect(getResult.success).toBe(true);
      expect(getResult.data?.id).toBe(dealId);
      expect(getResult.data?.name).toBe('Test Deal');
    });

    it('should return null for non-existent deal', async () => {
      const result = await service.getDeal('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateDeal', () => {
    it('should update a deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      const updateResult = await service.updateDeal(dealId, {
        name: 'Updated Deal Name',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('Updated Deal Name');
    });
  });

  describe('deleteDeal', () => {
    it('should delete a deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      const deleteResult = await service.deleteDeal(dealId);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data).toBe(true);

      // Verify deal is deleted
      const getResult = await service.getDeal(dealId);
      expect(getResult.data).toBeNull();
    });
  });

  describe('listDeals', () => {
    it('should list all deals', async () => {
      await service.createDeal(validDealInput);
      await service.createDeal({
        ...validDealInput,
        name: 'Second Deal',
        status: 'archived',
      });

      const result = await service.listDeals();

      expect(result.data.length).toBe(2);
    });

    it('should filter deals by status', async () => {
      await service.createDeal(validDealInput);
      await service.createDeal({
        ...validDealInput,
        name: 'Archived Deal',
        status: 'archived',
      });

      const activeResult = await service.listDeals({ status: 'active' });
      expect(activeResult.data.length).toBe(1);
      expect(activeResult.data[0].name).toBe('Test Deal');

      const archivedResult = await service.listDeals({ status: 'archived' });
      expect(archivedResult.data.length).toBe(1);
      expect(archivedResult.data[0].name).toBe('Archived Deal');
    });
  });

  describe('active deal management', () => {
    it('should set active deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      const setResult = await service.setActiveDeal(dealId);

      expect(setResult.success).toBe(true);
      expect(setResult.data?.id).toBe(dealId);

      const activeId = await service.getActiveDealId();
      expect(activeId).toBe(dealId);
    });

    it('should get active deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      await service.setActiveDeal(dealId);

      const activeResult = await service.getActiveDeal();

      expect(activeResult.success).toBe(true);
      expect(activeResult.data?.id).toBe(dealId);
    });

    it('should return null when no active deal', async () => {
      const result = await service.getActiveDeal();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should clear active deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      await service.setActiveDeal(dealId);
      await service.clearActiveDeal();

      const activeId = await service.getActiveDealId();
      expect(activeId).toBeNull();
    });

    it('should check if deal is active', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      await service.setActiveDeal(dealId);

      expect(await service.isActiveDeal(dealId)).toBe(true);
      expect(await service.isActiveDeal('other-id')).toBe(false);
    });
  });

  describe('deal status management', () => {
    it('should archive a deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      const archiveResult = await service.archiveDeal(dealId);

      expect(archiveResult.success).toBe(true);
      expect(archiveResult.data?.status).toBe('archived');
    });

    it('should close a deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      const closeResult = await service.closeDeal(dealId);

      expect(closeResult.success).toBe(true);
      expect(closeResult.data?.status).toBe('closed');
    });

    it('should reactivate a deal', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      await service.archiveDeal(dealId);
      const reactivateResult = await service.reactivateDeal(dealId);

      expect(reactivateResult.success).toBe(true);
      expect(reactivateResult.data?.status).toBe('active');
    });
  });

  describe('context persistence', () => {
    it('should get deal context for AI', async () => {
      const createResult = await service.createDeal(validDealInput);
      const dealId = createResult.data!.id;

      await service.setActiveDeal(dealId);

      const context = await service.getDealContextForAI();

      expect(context.hasContext).toBe(true);
      expect(context.deal).toBeDefined();
      expect(context.contextString).toContain('Test Deal');
      expect(context.contextString).toContain('acquisition');
      expect(context.contextString).toContain('Target Inc');
    });

    it('should return no context when no active deal', async () => {
      const context = await service.getDealContextForAI();

      expect(context.hasContext).toBe(false);
      expect(context.deal).toBeUndefined();
      expect(context.contextString).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should validate valid input', () => {
      const validation = service.validateDealInput(validDealInput);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty deal name', () => {
      const input = { ...validDealInput, name: '' };
      const validation = service.validateDealInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Deal name is required');
    });

    it('should reject empty parties', () => {
      const input = { ...validDealInput, parties: [] };
      const validation = service.validateDealInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one party is required');
    });

    it('should reject party without name', () => {
      const input = { ...validDealInput, parties: [{ name: '', role: 'buyer' as const }] };
      const validation = service.validateDealInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Party 1: name is required');
    });

    it('should reject missing transaction type', () => {
      const input = { ...validDealInput, transactionType: undefined as any };
      const validation = service.validateDealInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Transaction type is required');
    });

    it('should reject missing target company name', () => {
      const input = { ...validDealInput, targetCompany: { name: '' } };
      const validation = service.validateDealInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Target company name is required');
    });
  });
});