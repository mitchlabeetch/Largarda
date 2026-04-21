/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompanyEnrichmentService } from '@process/services/ma/CompanyEnrichmentService';
import type { Company } from '@common/ma/company/schema';

describe('CompanyEnrichmentService', () => {
  let mockDb: any;
  let service: CompanyEnrichmentService;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
    };
    service = new CompanyEnrichmentService(mockDb);
    vi.spyOn(service as any, 'sireneEnricher', 'get').mockReturnValue({
      fetchBySiren: vi.fn(),
      mapToCompanyUpdate: vi.fn(),
    });
  });

  describe('enrichBySiren', () => {
    it('should enrich existing company by SIREN', async () => {
      const sireneData = {
        denomination: 'Test Company',
        siren: '123456789',
      };

      const updateData = {
        name: 'Test Company',
      };

      const existingCompany = {
        id: 'company-123',
        siren: '123456789',
      };

      (service as any).sireneEnricher.fetchBySiren.mockResolvedValue(sireneData);
      (service as any).sireneEnricher.mapToCompanyUpdate.mockReturnValue(updateData);
      mockDb.select.mockResolvedValueOnce(existingCompany);
      mockDb.update.mockResolvedValue(1);

      const updatedCompany = {
        ...existingCompany,
        name: 'Test Company',
      };
      mockDb.select.mockResolvedValueOnce(updatedCompany);

      const result = await service.enrichBySiren('123456789');

      expect((service as any).sireneEnricher.fetchBySiren).toHaveBeenCalledWith('123456789');
      expect(result).toBeDefined();
    });

    it('should create new company if not found', async () => {
      const sireneData = {
        denomination: 'New Company',
        siren: '987654321',
      };

      const updateData = {
        name: 'New Company',
      };

      (service as any).sireneEnricher.fetchBySiren.mockResolvedValue(sireneData);
      (service as any).sireneEnricher.mapToCompanyUpdate.mockReturnValue(updateData);
      mockDb.select.mockResolvedValue(null);

      const newCompany = {
        id: 'new-company-id',
        siren: '987654321',
        name: 'New Company',
      };
      mockDb.select.mockResolvedValue(newCompany);

      const result = await service.enrichBySiren('987654321');

      expect(result).toBeDefined();
      expect(result.siren).toBe('987654321');
    });

    it('should return null if SIRENE data not found', async () => {
      (service as any).sireneEnricher.fetchBySiren.mockResolvedValue(null);

      const result = await service.enrichBySiren('123456789');

      expect(result).toBeNull();
    });
  });

  describe('enrichCompany', () => {
    it('should enrich a company by id', async () => {
      const sireneData = {
        denomination: 'Test Company',
        siren: '123456789',
      };

      const updateData = {
        name: 'Test Company',
      };

      const existingCompany = {
        id: 'company-123',
        siren: '123456789',
        name: 'Old Name',
      };

      (service as any).sireneEnricher.fetchBySiren.mockResolvedValue(sireneData);
      (service as any).sireneEnricher.mapToCompanyUpdate.mockReturnValue(updateData);
      mockDb.select.mockResolvedValueOnce(existingCompany);
      mockDb.update.mockResolvedValue(1);

      const updatedCompany = {
        ...existingCompany,
        name: 'Test Company',
      };
      mockDb.select.mockResolvedValueOnce(updatedCompany);

      const result = await service.enrichCompany('company-123');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Company');
    });
  });

  describe('batchEnrich', () => {
    it('should enrich multiple companies', async () => {
      const companyIds = ['company-1', 'company-2'];

      const sireneData = {
        denomination: 'Test Company',
        siren: '123456789',
      };

      const updateData = {
        name: 'Test Company',
      };

      (service as any).sireneEnricher.fetchBySiren.mockResolvedValue(sireneData);
      (service as any).sireneEnricher.mapToCompanyUpdate.mockReturnValue(updateData);

      const companies = companyIds.map((id) => ({
        id,
        siren: '123456789',
      }));

      mockDb.select.mockResolvedValueOnce(companies[0]);
      mockDb.select.mockResolvedValueOnce(companies[1]);
      mockDb.update.mockResolvedValue(1);

      const enrichedCompanies = companyIds.map((id) => ({
        id,
        siren: '123456789',
        name: 'Test Company',
      }));

      mockDb.select.mockResolvedValueOnce(enrichedCompanies[0]);
      mockDb.select.mockResolvedValueOnce(enrichedCompanies[1]);

      const result = await service.batchEnrich(companyIds);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle empty company id list', async () => {
      const result = await service.batchEnrich([]);

      expect(result.size).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return company by id', async () => {
      const mockRow = {
        id: 'company-123',
        siren: '123456789',
        siret: '12345678900012',
        name: 'Test Company',
        legal_form: 'SARL',
        naf_code: '6201Z',
        sector_id: 'sector-123',
        jurisdiction: 'France',
        headquarters_address: 'Paris',
        registered_at: 1234567890,
        employee_count: 100,
        revenue: 1000000,
        sources_json: JSON.stringify({ sirene: {} }),
        last_enriched_at: 1234567890,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      mockDb.select.mockResolvedValue(mockRow);

      const result = await service.getById('company-123');

      expect(mockDb.select).toHaveBeenCalledWith('ma_companies', { id: 'company-123' });
      expect(result).toEqual({
        id: 'company-123',
        siren: '123456789',
        siret: '12345678900012',
        name: 'Test Company',
        legalForm: 'SARL',
        nafCode: '6201Z',
        sectorId: 'sector-123',
        jurisdiction: 'France',
        headquartersAddress: 'Paris',
        registeredAt: 1234567890,
        employeeCount: 100,
        revenue: 1000000,
        sourcesJson: JSON.stringify({ sirene: {} }),
        lastEnrichedAt: 1234567890,
        createdAt: 1234567890,
        updatedAt: 1234567890,
      });
    });

    it('should return null if company not found', async () => {
      mockDb.select.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
