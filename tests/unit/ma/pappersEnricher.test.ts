/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PappersEnricher,
  getPappersEnricher,
  SOURCE_PRECEDENCE,
  MergeStrategy,
  FIELD_MERGE_CONFIG,
  type SourcePrecedenceKey,
  type Disagreement,
  type FieldProvenance,
  type ProvenanceJson,
} from '../../../src/process/services/ma/PappersEnricher';
import type { UpdateCompanyInput } from '../../../src/common/ma/company/schema';

describe('PappersEnricher', () => {
  let enricher: PappersEnricher;

  beforeEach(() => {
    enricher = new PappersEnricher('test-api-key');
  });

  describe('constructor', () => {
    it('should create enricher with provided API key', () => {
      const customEnricher = new PappersEnricher('custom-key');
      expect(customEnricher).toBeInstanceOf(PappersEnricher);
    });

    it('should use environment variable when no API key provided', () => {
      const envEnricher = new PappersEnricher();
      expect(envEnricher).toBeInstanceOf(PappersEnricher);
    });
  });

  describe('getSourcePrecedence', () => {
    it('should return correct precedence values', () => {
      expect(SOURCE_PRECEDENCE.pappers).toBe(10);
      expect(SOURCE_PRECEDENCE.rechercheEntreprises).toBe(5);
      expect(SOURCE_PRECEDENCE.manual).toBe(20);
    });
  });

  describe('FIELD_MERGE_CONFIG', () => {
    it('should have merge strategies for all fields', () => {
      expect(FIELD_MERGE_CONFIG.name).toBe(MergeStrategy.PRECEDENCE);
      expect(FIELD_MERGE_CONFIG.legalForm).toBe(MergeStrategy.PRECEDENCE);
      expect(FIELD_MERGE_CONFIG.nafCode).toBe(MergeStrategy.PRECEDENCE);
      expect(FIELD_MERGE_CONFIG.revenue).toBe(MergeStrategy.OVERRIDE);
      expect(FIELD_MERGE_CONFIG.registeredAt).toBe(MergeStrategy.KEEP_EXISTING);
    });
  });

  describe('buildProvenance', () => {
    it('should build provenance for enriched fields', () => {
      const update: Partial<UpdateCompanyInput> = {
        name: 'Test Company',
        employeeCount: 100,
      };

      const provenance = enricher.buildProvenance(update, 'pappers');

      expect(provenance.name).toBeDefined();
      expect(provenance.name.field).toBe('name');
      expect(provenance.name.value).toBe('Test Company');
      expect(provenance.name.source).toBe('pappers');
      expect(provenance.name.sourcePrecedence).toBe(SOURCE_PRECEDENCE.pappers);

      expect(provenance.employeeCount).toBeDefined();
      expect(provenance.employeeCount.value).toBe(100);
    });

    it('should use default source if not provided', () => {
      const update: Partial<UpdateCompanyInput> = {
        name: 'Test',
      };

      const provenance = enricher.buildProvenance(update);

      expect(provenance.name.source).toBe('pappers');
    });

    it('should not include undefined values in provenance', () => {
      const update: Partial<UpdateCompanyInput> = {
        name: 'Test',
        legalForm: undefined,
      };

      const provenance = enricher.buildProvenance(update);

      expect(provenance.name).toBeDefined();
      expect(provenance.legalForm).toBeUndefined();
    });
  });

  describe('mapToCompanyUpdate', () => {
    it('should map Pappers response to company update', () => {
      const apiData = {
        siren: '123456789',
        nom_entreprise: 'Test Company',
        formes_juridiques: ['SARL'],
        naf: '6201Z',
        siege: {
          adresse: '123 Main St',
          code_postal: '75001',
          ville: 'Paris',
          pays: 'France',
        },
        date_creation: '2020-01-01',
        effectif: 100,
        bilan: {
          chiffre_affaires: 1000000,
        },
      };

      const update = enricher.mapToCompanyUpdate(apiData);

      expect(update.name).toBe('Test Company');
      expect(update.legalForm).toBe('SARL');
      expect(update.nafCode).toBe('6201Z');
      expect(update.headquartersAddress).toContain('123 Main St');
      expect(update.jurisdiction).toBe('France');
      expect(update.registeredAt).toBeGreaterThan(0);
      expect(update.employeeCount).toBe(100);
      expect(update.revenue).toBe(1000000);
    });

    it('should handle missing optional fields', () => {
      const apiData = {
        siren: '123456789',
        nom_entreprise: 'Minimal Company',
      };

      const update = enricher.mapToCompanyUpdate(apiData);

      expect(update.name).toBe('Minimal Company');
      expect(update.legalForm).toBeUndefined();
      expect(update.nafCode).toBeUndefined();
      expect(update.headquartersAddress).toBeUndefined();
    });

    it('should build address from components', () => {
      const apiData = {
        siren: '123456789',
        siege: {
          adresse: '1 Rue de la Paix',
          code_postal: '75002',
          ville: 'Paris',
          pays: 'France',
        },
      };

      const update = enricher.mapToCompanyUpdate(apiData);

      expect(update.headquartersAddress).toBe('1 Rue de la Paix, 75002, Paris, France');
    });

    it('should prefer bilan chiffre_affaires over top-level', () => {
      const apiData = {
        siren: '123456789',
        chiffre_affaires: 500000,
        bilan: {
          chiffre_affaires: 1000000,
        },
      };

      const update = enricher.mapToCompanyUpdate(apiData);

      expect(update.revenue).toBe(1000000);
    });

    it('should use top-level chiffre_affaires if bilan missing', () => {
      const apiData = {
        siren: '123456789',
        chiffre_affaires: 500000,
      };

      const update = enricher.mapToCompanyUpdate(apiData);

      expect(update.revenue).toBe(500000);
    });
  });

  describe('getPappersEnricher singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = getPappersEnricher();
      const instance2 = getPappersEnricher();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance with different API key on first call', () => {
      const instance = getPappersEnricher('new-key');
      expect(instance).toBeInstanceOf(PappersEnricher);
    });
  });
});
