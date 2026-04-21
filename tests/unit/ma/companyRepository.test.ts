/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for CompanyRepository
 * Tests CRUD operations, SIREN lookups, search, and upsert
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getCompanyRepository } from '@process/services/database/repositories/ma/CompanyRepository';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/common/ma/company/schema';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('CompanyRepository', () => {
  let driver: ISqliteDriver;
  let repo: ReturnType<typeof getCompanyRepository>;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
    repo = getCompanyRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  const sampleCompanyInput: CreateCompanyInput = {
    siren: '123456789',
    siret: '12345678900012',
    name: 'Test Company SAS',
    legalForm: 'SAS',
    nafCode: '62.01Z',
    sectorId: 'tech',
    jurisdiction: 'France',
    headquartersAddress: '123 Rue de Paris, 75001 Paris',
    registeredAt: 1609459200000,
    employeeCount: 150,
    revenue: 50000000,
    sourcesJson: '{"source": "sirene"}',
  };

  describe('create', () => {
    it('should create a company with valid input', async () => {
      const result = await repo.create(sampleCompanyInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.siren).toBe(sampleCompanyInput.siren);
      expect(result.data?.name).toBe(sampleCompanyInput.name);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.updatedAt).toBeDefined();
    });

    it('should create a company with minimal required fields', async () => {
      const minimalInput: CreateCompanyInput = {
        siren: '987654321',
        name: 'Minimal Company',
      };

      const result = await repo.create(minimalInput);

      expect(result.success).toBe(true);
      expect(result.data?.siren).toBe(minimalInput.siren);
      expect(result.data?.name).toBe(minimalInput.name);
    });

    it('should fail on database error', async () => {
      await repo.create(sampleCompanyInput);
      const duplicateInput = { ...sampleCompanyInput, siren: sampleCompanyInput.siren };

      const result = await repo.create(duplicateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve a company by ID', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const companyId = createResult.data!.id;

      const result = await repo.get(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(companyId);
      expect(result.data?.siren).toBe(sampleCompanyInput.siren);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should map database row to company correctly', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const result = await repo.get(createResult.data!.id);

      expect(result.data?.legalForm).toBe(sampleCompanyInput.legalForm);
      expect(result.data?.nafCode).toBe(sampleCompanyInput.nafCode);
      expect(result.data?.sectorId).toBe(sampleCompanyInput.sectorId);
      expect(result.data?.employeeCount).toBe(sampleCompanyInput.employeeCount);
      expect(result.data?.revenue).toBe(sampleCompanyInput.revenue);
    });
  });

  describe('getBySiren', () => {
    it('should retrieve a company by SIREN', async () => {
      await repo.create(sampleCompanyInput);

      const result = await repo.getBySiren(sampleCompanyInput.siren);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.siren).toBe(sampleCompanyInput.siren);
    });

    it('should return null for non-existent SIREN', async () => {
      const result = await repo.getBySiren('000000000');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle unique SIREN constraint', async () => {
      await repo.create(sampleCompanyInput);
      const result = await repo.getBySiren(sampleCompanyInput.siren);

      expect(result.data).toBeDefined();
      expect(result.data?.siren).toBe(sampleCompanyInput.siren);
    });
  });

  describe('update', () => {
    it('should update company fields', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const companyId = createResult.data!.id;

      const updateInput: UpdateCompanyInput = {
        name: 'Updated Company Name',
        employeeCount: 200,
        revenue: 75000000,
      };

      const result = await repo.update(companyId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(updateInput.name);
      expect(result.data?.employeeCount).toBe(updateInput.employeeCount);
      expect(result.data?.revenue).toBe(updateInput.revenue);
      expect(result.data?.updatedAt).toBeGreaterThan(createResult.data!.updatedAt);
    });

    it('should fail to update non-existent company', async () => {
      const result = await repo.update('non-existent-id', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update lastEnrichedAt timestamp', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const companyId = createResult.data!.id;

      const now = Date.now();
      const result = await repo.update(companyId, { lastEnrichedAt: now });

      expect(result.success).toBe(true);
      expect(result.data?.lastEnrichedAt).toBe(now);
    });

    it('should partial update with undefined values', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const companyId = createResult.data!.id;

      const result = await repo.update(companyId, { name: 'Partial Update' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Partial Update');
      expect(result.data?.legalForm).toBe(sampleCompanyInput.legalForm);
    });
  });

  describe('delete', () => {
    it('should delete a company', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const companyId = createResult.data!.id;

      const result = await repo.delete(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const getAfter = await repo.get(companyId);
      expect(getAfter.data).toBeNull();
    });

    it('should return false when deleting non-existent company', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleCompanyInput, siren: '111111111', sectorId: 'tech' });
      await repo.create({ ...sampleCompanyInput, siren: '222222222', sectorId: 'finance' });
      await repo.create({ ...sampleCompanyInput, siren: '333333333', sectorId: 'tech' });
    });

    it('should list all companies', async () => {
      const result = await repo.list();

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should filter by sector ID', async () => {
      const result = await repo.list({ sectorId: 'tech' });

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data.every((c) => c.sectorId === 'tech')).toBe(true);
    });

    it('should handle pagination', async () => {
      const result = await repo.list(undefined, 0, 2);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should return empty list for non-matching filter', async () => {
      const result = await repo.list({ sectorId: 'healthcare' });

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should order by updated_at DESC', async () => {
      const result = await repo.list();

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('searchByName', () => {
    beforeEach(async () => {
      await repo.create({ ...sampleCompanyInput, siren: '111111111', name: 'Acme Corporation' });
      await repo.create({ ...sampleCompanyInput, siren: '222222222', name: 'Beta Industries' });
      await repo.create({ ...sampleCompanyInput, siren: '333333333', name: 'Gamma Solutions' });
    });

    it('should search companies by name pattern', async () => {
      const result = await repo.searchByName('Corp');

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toContain('Corp');
    });

    it('should return case-insensitive matches', async () => {
      const result = await repo.searchByName('acme');

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toContain('Acme');
    });

    it('should handle pagination in search', async () => {
      const result = await repo.searchByName('', 0, 2);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3);
    });

    it('should return empty for no matches', async () => {
      const result = await repo.searchByName('NonExistent');

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should order by updated_at DESC in search', async () => {
      const result = await repo.searchByName('');

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].updatedAt).toBeGreaterThanOrEqual(result.data[i].updatedAt);
      }
    });
  });

  describe('upsertBySiren', () => {
    it('should create new company if SIREN does not exist', async () => {
      const result = await repo.upsertBySiren(sampleCompanyInput);

      expect(result.success).toBe(true);
      expect(result.data?.siren).toBe(sampleCompanyInput.siren);
    });

    it('should update existing company if SIREN exists', async () => {
      await repo.create(sampleCompanyInput);

      const updateInput: CreateCompanyInput = {
        ...sampleCompanyInput,
        name: 'Updated Name',
        employeeCount: 999,
      };

      const result = await repo.upsertBySiren(updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
      expect(result.data?.employeeCount).toBe(999);
    });

    it('should preserve ID on upsert update', async () => {
      const createResult = await repo.create(sampleCompanyInput);
      const originalId = createResult.data!.id;

      const result = await repo.upsertBySiren({ ...sampleCompanyInput, name: 'Updated' });

      expect(result.data?.id).toBe(originalId);
    });
  });

  describe('edge cases', () => {
    it('should handle empty sources_json', async () => {
      const input = { ...sampleCompanyInput, sourcesJson: undefined };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.sourcesJson).toBeUndefined();
    });

    it('should handle zero revenue', async () => {
      const input = { ...sampleCompanyInput, revenue: 0 };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.revenue).toBe(0);
    });

    it('should handle zero employee count', async () => {
      const input = { ...sampleCompanyInput, employeeCount: 0 };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.employeeCount).toBe(0);
    });

    it('should handle very long company name', async () => {
      const longName = 'A'.repeat(500);
      const input = { ...sampleCompanyInput, name: longName };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(longName);
    });

    it('should handle special characters in name', async () => {
      const specialName = "L'Entreprise & Cie (SARL)";
      const input = { ...sampleCompanyInput, name: specialName };
      const result = await repo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(specialName);
    });
  });
});
