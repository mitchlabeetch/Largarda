/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ContactRepository
 * Tests CRUD operations, company/deal associations, and cascade deletes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getContactRepository } from '@process/services/database/repositories/ma/ContactRepository';
import { getCompanyRepository } from '@process/services/database/repositories/ma/CompanyRepository';
import { getDealRepository } from '@process/services/database/repositories/ma/DealRepository';
import type { CreateContactInput, UpdateContactInput } from '@/common/ma/contact/schema';
import type { CreateCompanyInput } from '@/common/ma/company/schema';
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

describeOrSkip('ContactRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getContactRepository>;
  let companyRepo: ReturnType<typeof getCompanyRepository>;
  let dealRepo: ReturnType<typeof getDealRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getContactRepository();
    companyRepo = getCompanyRepository();
    dealRepo = getDealRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleContactInput: CreateContactInput = {
    fullName: 'John Doe',
    role: 'CEO',
    email: 'john@example.com',
    phone: '+33123456789',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    notes: 'Key decision maker',
  };

  const sampleCompanyInput: CreateCompanyInput = {
    siren: '123456789',
    name: 'Test Company',
  };

  const sampleDealInput: CreateDealInput = {
    name: 'Test Deal',
    parties: [{ name: 'Acquirer', role: 'buyer' }],
    transactionType: 'acquisition',
    targetCompany: { name: 'Target' },
  };

  describe('create', () => {
    it('should create a contact with valid input', async () => {
      const result = await repo.create(sampleContactInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.fullName).toBe(sampleContactInput.fullName);
      expect(result.data?.email).toBe(sampleContactInput.email);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
    });

    it('should create a contact with minimal required fields', async () => {
      const minimalInput: CreateContactInput = {
        fullName: 'Jane Smith',
      };

      const result = await repo.create(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe(minimalInput.fullName);
    });

    it('should create a contact linked to a company', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const input = { ...sampleContactInput, companyId: companyResult.data!.id };

      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.companyId).toBe(companyResult.data!.id);
    });

    it('should create a contact linked to a deal', async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const input = { ...sampleContactInput, dealId: dealResult.data!.id };

      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.dealId).toBe(dealResult.data!.id);
    });

    it('should handle database errors gracefully', async () => {
      // Force an error by providing invalid data
      const result = await repo.create({ fullName: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a contact by ID', async () => {
      const createResult = await repo.create(sampleContactInput);
      const contactId = createResult.data!.id;

      const result = await repo.get(contactId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(contactId);
      expect(result.data?.fullName).toBe(sampleContactInput.fullName);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map all fields correctly', async () => {
      const createResult = await repo.create(sampleContactInput);
      const result = await repo.get(createResult.data!.id);

      expect(result.data?.role).toBe(sampleContactInput.role);
      expect(result.data?.phone).toBe(sampleContactInput.phone);
      expect(result.data?.linkedinUrl).toBe(sampleContactInput.linkedinUrl);
      expect(result.data?.notes).toBe(sampleContactInput.notes);
    });
  });

  describe('update', () => {
    it('should update contact fields', async () => {
      const createResult = await repo.create(sampleContactInput);
      const contactId = createResult.data!.id;

      const updateInput: UpdateContactInput = {
        fullName: 'Updated Name',
        email: 'updated@example.com',
      };

      const result = await repo.update(contactId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe(updateInput.fullName);
      expect(result.data?.email).toBe(updateInput.email);
      expect(result.data?.updatedAt).toBeGreaterThan(createResult.data!.updatedAt);
    });

    it('should fail to update non-existent contact', async () => {
      const result = await repo.update('non-existent-id', { fullName: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update company association', async () => {
      const createResult = await repo.create(sampleContactInput);
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const contactId = createResult.data!.id;

      const result = await repo.update(contactId, { companyId: companyResult.data!.id });

      expect(result.success).toBe(true);
      expect(result.data?.companyId).toBe(companyResult.data!.id);
    });

    it('should update deal association', async () => {
      const createResult = await repo.create(sampleContactInput);
      const dealResult = await dealRepo.create(sampleDealInput);
      const contactId = createResult.data!.id;

      const result = await repo.update(contactId, { dealId: dealResult.data!.id });

      expect(result.success).toBe(true);
      expect(result.data?.dealId).toBe(dealResult.data!.id);
    });

    it('should handle partial updates', async () => {
      const createResult = await repo.create(sampleContactInput);
      const contactId = createResult.data!.id;

      const result = await repo.update(contactId, { notes: 'Updated notes' });

      expect(result.success).toBe(true);
      expect(result.data?.notes).toBe('Updated notes');
      expect(result.data?.fullName).toBe(sampleContactInput.fullName);
    });
  });

  describe('delete', () => {
    it('should delete a contact', async () => {
      const createResult = await repo.create(sampleContactInput);
      const contactId = createResult.data!.id;

      const result = await repo.delete(contactId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(contactId);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent contact', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('listByCompany', () => {
    beforeEach(async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const companyId = companyResult.data!.id;

      await repo.create({ ...sampleContactInput, fullName: 'Contact 1', companyId });
      await repo.create({ ...sampleContactInput, fullName: 'Contact 2', companyId });
      await repo.create({ ...sampleContactInput, fullName: 'Contact 3', companyId: undefined });
    });

    it('should list contacts for a company', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const result = await repo.listByCompany(companyResult.data!.id);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should return empty for company with no contacts', async () => {
      const companyResult = await companyRepo.create({ ...sampleCompanyInput, siren: '999999999' });
      const result = await repo.listByCompany(companyResult.data!.id);

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const result = await repo.listByCompany(companyResult.data!.id, 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by updated_at DESC', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const result = await repo.listByCompany(companyResult.data!.id);

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('listByDeal', () => {
    beforeEach(async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const dealId = dealResult.data!.id;

      await repo.create({ ...sampleContactInput, fullName: 'Contact 1', dealId });
      await repo.create({ ...sampleContactInput, fullName: 'Contact 2', dealId });
      await repo.create({ ...sampleContactInput, fullName: 'Contact 3', dealId: undefined });
    });

    it('should list contacts for a deal', async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const result = await repo.listByDeal(dealResult.data!.id);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should return empty for deal with no contacts', async () => {
      const dealResult = await dealRepo.create({ ...sampleDealInput, name: 'Other Deal' });
      const result = await repo.listByDeal(dealResult.data!.id);

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination', async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const result = await repo.listByDeal(dealResult.data!.id, 0, 1);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should order by updated_at DESC', async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const result = await repo.listByDeal(dealResult.data!.id);

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('deleteByCompany', () => {
    it('should delete all contacts for a company', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const companyId = companyResult.data!.id;

      await repo.create({ ...sampleContactInput, companyId });
      await repo.create({ ...sampleContactInput, companyId });
      await repo.create({ ...sampleContactInput, companyId: undefined });

      const result = await repo.deleteByCompany(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await repo.listByCompany(companyId);
      expect(listResult.data.length).toBe(0);
    });

    it('should return 0 for company with no contacts', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const result = await repo.deleteByCompany(companyResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('deleteByDeal', () => {
    it('should delete all contacts for a deal', async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const dealId = dealResult.data!.id;

      await repo.create({ ...sampleContactInput, dealId });
      await repo.create({ ...sampleContactInput, dealId });
      await repo.create({ ...sampleContactInput, dealId: undefined });

      const result = await repo.deleteByDeal(dealId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await repo.listByDeal(dealId);
      expect(listResult.data.length).toBe(0);
    });

    it('should return 0 for deal with no contacts', async () => {
      const dealResult = await dealRepo.create(sampleDealInput);
      const result = await repo.deleteByDeal(dealResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty email', async () => {
      const input = { ...sampleContactInput, email: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.email).toBeUndefined();
    });

    it('should handle empty phone', async () => {
      const input = { ...sampleContactInput, phone: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.phone).toBeUndefined();
    });

    it('should handle very long notes', async () => {
      const longNotes = 'A'.repeat(10000);
      const input = { ...sampleContactInput, notes: longNotes };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.notes).toBe(longNotes);
    });

    it('should handle special characters in name', async () => {
      const specialName = "Jean-Pierre O'Connor";
      const input = { ...sampleContactInput, fullName: specialName };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe(specialName);
    });

    it('should handle invalid email format gracefully', async () => {
      const input = { ...sampleContactInput, email: 'not-an-email' };
      const result = await repo.create(input);

      // Zod validation should catch this
      expect(result.success).toBe(false);
    });

    it('should handle contact with both company and deal', async () => {
      const companyResult = await companyRepo.create(sampleCompanyInput);
      const dealResult = await dealRepo.create(sampleDealInput);
      const input = {
        ...sampleContactInput,
        companyId: companyResult.data!.id,
        dealId: dealResult.data!.id,
      };

      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.companyId).toBe(companyResult.data!.id);
      expect(result.data?.dealId).toBe(dealResult.data!.id);
    });
  });
});
