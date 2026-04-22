/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for provenance/freshness persistence on enriched rows
 * Tests that CompanyRepository, ContactRepository, and KbSourceRepository
 * correctly persist and retrieve provenance_json and freshness fields
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { getCompanyRepository } from '@process/services/database/repositories/ma/CompanyRepository';
import { getContactRepository } from '@process/services/database/repositories/ma/ContactRepository';
import { getKbSourceRepository } from '@process/services/database/repositories/ma/KbSourceRepository';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/common/ma/company/schema';
import type { CreateContactInput, UpdateContactInput } from '@/common/ma/contact/schema';
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

describeOrSkip('Provenance/Freshness Persistence', () => {
  let driver: ISqliteDriver;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, CURRENT_DB_VERSION);
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  // ── CompanyRepository ──────────────────────────────────────────

  describe('CompanyRepository provenance/freshness', () => {
    let companyRepo: ReturnType<typeof getCompanyRepository>;

    beforeEach(() => {
      companyRepo = getCompanyRepository();
    });

    const sampleProvenance = '{"source":"sirene","fetchedAt":1700000000000,"policy":"canonical"}';

    it('should create a company with provenance and freshness', async () => {
      const input: CreateCompanyInput = {
        siren: '123456789',
        name: 'Provenanced Co',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };

      const result = await companyRepo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should retrieve company with provenance and freshness', async () => {
      const input: CreateCompanyInput = {
        siren: '123456789',
        name: 'Provenanced Co',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };
      const createResult = await companyRepo.create(input);

      const result = await companyRepo.get(createResult.data!.id);

      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should update provenance and freshness on a company', async () => {
      const input: CreateCompanyInput = { siren: '123456789', name: 'Co' };
      const createResult = await companyRepo.create(input);

      const updateInput: UpdateCompanyInput = {
        provenanceJson: '{"source":"pappers","fetchedAt":1700100000000,"policy":"supplementary"}',
        freshness: 'stale',
      };
      const result = await companyRepo.update(createResult.data!.id, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(
        '{"source":"pappers","fetchedAt":1700100000000,"policy":"supplementary"}'
      );
      expect(result.data?.freshness).toBe('stale');
    });

    it('should preserve provenance when updating other fields', async () => {
      const input: CreateCompanyInput = {
        siren: '123456789',
        name: 'Co',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };
      const createResult = await companyRepo.create(input);

      const result = await companyRepo.update(createResult.data!.id, { name: 'Updated Co' });

      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should handle company without provenance (defaults)', async () => {
      const input: CreateCompanyInput = { siren: '123456789', name: 'No Provenance Co' };
      const result = await companyRepo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBeUndefined();
      expect(result.data?.freshness).toBeUndefined();
    });

    it('should upsert with provenance and freshness', async () => {
      const input: CreateCompanyInput = {
        siren: '123456789',
        name: 'Upsert Co',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };
      const result = await companyRepo.upsertBySiren(input);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });
  });

  // ── ContactRepository ──────────────────────────────────────────

  describe('ContactRepository provenance/freshness', () => {
    let contactRepo: ReturnType<typeof getContactRepository>;

    beforeEach(() => {
      contactRepo = getContactRepository();
    });

    const sampleProvenance = '{"source":"pappers","fetchedAt":1700000000000,"policy":"canonical"}';

    it('should create a contact with provenance and freshness', async () => {
      const input: CreateContactInput = {
        fullName: 'Jane Doe',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };

      const result = await contactRepo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should update provenance and freshness on a contact', async () => {
      const input: CreateContactInput = { fullName: 'Jane Doe' };
      const createResult = await contactRepo.create(input);

      const updateInput: UpdateContactInput = {
        provenanceJson: sampleProvenance,
        freshness: 'expired',
      };
      const result = await contactRepo.update(createResult.data!.id, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('expired');
    });

    it('should preserve provenance when updating other fields', async () => {
      const input: CreateContactInput = {
        fullName: 'Jane Doe',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };
      const createResult = await contactRepo.create(input);

      const result = await contactRepo.update(createResult.data!.id, { role: 'CEO' });

      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });
  });

  // ── KbSourceRepository ────────────────────────────────────────

  describe('KbSourceRepository provenance/freshness', () => {
    let kbRepo: ReturnType<typeof getKbSourceRepository>;

    beforeEach(() => {
      kbRepo = getKbSourceRepository();
    });

    const sampleProvenance = '{"source":"flowise","fetchedAt":1700000000000,"policy":"canonical"}';

    it('should create a KB source with provenance and freshness', async () => {
      const input: CreateKbSourceInput = {
        scope: 'deal',
        scopeId: 'deal1',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };

      const result = await kbRepo.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should update provenance and freshness on a KB source', async () => {
      const input: CreateKbSourceInput = { scope: 'deal', scopeId: 'deal1' };
      const createResult = await kbRepo.create(input);

      const updateInput: UpdateKbSourceInput = {
        provenanceJson: sampleProvenance,
        freshness: 'stale',
      };
      const result = await kbRepo.update(createResult.data!.id, updateInput);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('stale');
    });

    it('should preserve provenance when updating other fields', async () => {
      const input: CreateKbSourceInput = {
        scope: 'deal',
        scopeId: 'deal1',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };
      const createResult = await kbRepo.create(input);

      const result = await kbRepo.update(createResult.data!.id, { chunkCount: 42 });

      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });

    it('should upsert with provenance and freshness', async () => {
      const input: CreateKbSourceInput = {
        scope: 'company',
        scopeId: 'comp1',
        provenanceJson: sampleProvenance,
        freshness: 'fresh',
      };
      const result = await kbRepo.upsertByScope(input);

      expect(result.success).toBe(true);
      expect(result.data?.provenanceJson).toBe(sampleProvenance);
      expect(result.data?.freshness).toBe('fresh');
    });
  });
});
