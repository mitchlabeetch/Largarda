/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for SIRENE data normalization helpers
 */

import { describe, it, expect } from 'vitest';
import { normalizeSireneCompany, validateSiren, validateSiret } from '@/common/ma/company/normalize';
import type { SireneCompany } from '@process/services/data/sireneClient';

describe('normalizeSireneCompany', () => {
  it('should normalize a complete SIRENE company record', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company SAS',
      nom_raison_sociale: 'Test Company',
      sigle: 'TEST',
      siege: {
        siret: '12345678900012',
        adresse: {
          numero_voie: '10',
          type_voie: 'Rue',
          libelle_voie: 'de la Paix',
          code_postal: '75001',
          code_commune: '75101',
          libelle_commune: 'Paris',
          pays: 'France',
        },
      },
      categorie_juridique: '2205',
      forme_juridique: 'Société par actions simplifiée',
      activite_principale: '62.01Z',
      tranche_effectif: '21',
      effectif: 75,
      annee_creation: 2020,
      date_creation: '2020-01-15',
    };

    const result = normalizeSireneCompany(company);

    expect(result.identifiers.siren).toBe('123456789');
    expect(result.identifiers.siret).toBe('12345678900012');
    expect(result.legalName).toBe('Test Company SAS');
    expect(result.tradeName).toBe('Test Company');
    expect(result.legalForm).toBe('Société par actions simplifiée');
    expect(result.nafCode).toBe('62.01Z');
    expect(result.headOfficeAddress).toEqual({
      street: '10 Rue de la Paix',
      postalCode: '75001',
      city: 'Paris',
      country: 'France',
    });
    expect(result.workforce).toBe(75);
    expect(result.incorporationYear).toBe(2020);
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should normalize a minimal SIRENE company record', () => {
    const company: SireneCompany = {
      siren: '987654321',
      nom_complet: 'Minimal Company',
    };

    const result = normalizeSireneCompany(company);

    expect(result.identifiers.siren).toBe('987654321');
    expect(result.identifiers.siret).toBeUndefined();
    expect(result.legalName).toBe('Minimal Company');
    expect(result.tradeName).toBeUndefined();
    expect(result.legalForm).toBeUndefined();
    expect(result.nafCode).toBeUndefined();
    expect(result.headOfficeAddress).toBeUndefined();
    expect(result.workforce).toBeUndefined();
    expect(result.incorporationYear).toBeUndefined();
  });

  it('should normalize address with partial data', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      siege: {
        adresse: {
          code_postal: '69001',
          libelle_commune: 'Lyon',
        },
      },
    };

    const result = normalizeSireneCompany(company);

    expect(result.headOfficeAddress).toEqual({
      street: '',
      postalCode: '69001',
      city: 'Lyon',
      country: 'France',
    });
  });

  it('should normalize workforce from categorical tranche_effectif', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      tranche_effectif: '21',
    };

    const result = normalizeSireneCompany(company);

    expect(result.workforce).toBe(75); // Midpoint of 50-99 range
  });

  it('should prefer numeric effectif over tranche_effectif', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      tranche_effectif: '21',
      effectif: 80,
    };

    const result = normalizeSireneCompany(company);

    expect(result.workforce).toBe(80); // Numeric value takes precedence
  });

  it('should normalize workforce for non-employer', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      tranche_effectif: '00',
    };

    const result = normalizeSireneCompany(company);

    expect(result.workforce).toBe(0);
  });

  it('should normalize workforce for large companies', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      tranche_effectif: '53',
    };

    const result = normalizeSireneCompany(company);

    expect(result.workforce).toBe(15000); // Midpoint of 10000+ range
  });

  it('should normalize incorporation year from annee_creation', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      annee_creation: 2015,
    };

    const result = normalizeSireneCompany(company);

    expect(result.incorporationYear).toBe(2015);
  });

  it('should normalize incorporation year from ISO date', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      date_creation: '2018-06-20',
    };

    const result = normalizeSireneCompany(company);

    expect(result.incorporationYear).toBe(2018);
  });

  it('should normalize incorporation year from French date format', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      date_creation: '20/06/2018',
    };

    const result = normalizeSireneCompany(company);

    expect(result.incorporationYear).toBe(2018);
  });

  it('should prefer annee_creation over date strings', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      annee_creation: 2015,
      date_creation: '2018-06-20',
    };

    const result = normalizeSireneCompany(company);

    expect(result.incorporationYear).toBe(2015);
  });

  it('should map legal form code to description', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      categorie_juridique: '2203',
    };

    const result = normalizeSireneCompany(company);

    expect(result.legalForm).toBe('Société à responsabilité limitée');
  });

  it('should prefer forme_juridique over categorie_juridique', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      categorie_juridique: '2203',
      forme_juridique: 'SARL au capital de 10000 euros',
    };

    const result = normalizeSireneCompany(company);

    expect(result.legalForm).toBe('SARL au capital de 10000 euros');
  });

  it('should use sigle as trade name when nom_raison_sociale is missing', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company SAS',
      sigle: 'TEST',
    };

    const result = normalizeSireneCompany(company);

    expect(result.tradeName).toBe('TEST');
  });

  it('should handle missing siege object', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
    };

    const result = normalizeSireneCompany(company);

    expect(result.identifiers.siret).toBeUndefined();
    expect(result.headOfficeAddress).toBeUndefined();
  });

  it('should handle missing adresse in siege', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      siege: {
        siret: '12345678900012',
      },
    };

    const result = normalizeSireneCompany(company);

    expect(result.identifiers.siret).toBe('12345678900012');
    expect(result.headOfficeAddress).toBeUndefined();
  });

  it('should default country to France when not specified', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      siege: {
        adresse: {
          code_postal: '75001',
          libelle_commune: 'Paris',
        },
      },
    };

    const result = normalizeSireneCompany(company);

    expect(result.headOfficeAddress?.country).toBe('France');
  });

  it('should use specified country when provided', () => {
    const company: SireneCompany = {
      siren: '123456789',
      nom_complet: 'Test Company',
      siege: {
        adresse: {
          code_postal: '75001',
          libelle_commune: 'Paris',
          pays: 'Belgique',
        },
      },
    };

    const result = normalizeSireneCompany(company);

    expect(result.headOfficeAddress?.country).toBe('Belgique');
  });
});

describe('validateSiren', () => {
  it('should validate correct SIREN format', () => {
    expect(validateSiren('123456789')).toBe(true);
    expect(validateSiren('000000000')).toBe(true);
    expect(validateSiren('999999999')).toBe(true);
  });

  it('should reject incorrect SIREN format', () => {
    expect(validateSiren('12345678')).toBe(false); // 8 digits
    expect(validateSiren('1234567890')).toBe(false); // 10 digits
    expect(validateSiren('12345678A')).toBe(false); // Contains letter
    expect(validateSiren('123-456-789')).toBe(false); // Contains hyphens
    expect(validateSiren('')).toBe(false); // Empty
    expect(validateSiren('abcdefghi')).toBe(false); // Letters only
  });
});

describe('validateSiret', () => {
  it('should validate correct SIRET format', () => {
    expect(validateSiret('12345678900012')).toBe(true);
    expect(validateSiret('00000000000000')).toBe(true);
    expect(validateSiret('99999999999999')).toBe(true);
  });

  it('should reject incorrect SIRET format', () => {
    expect(validateSiret('1234567890001')).toBe(false); // 13 digits
    expect(validateSiret('123456789000123')).toBe(false); // 15 digits
    expect(validateSiret('1234567890001A')).toBe(false); // Contains letter
    expect(validateSiret('123-456-789-00012')).toBe(false); // Contains hyphens
    expect(validateSiret('')).toBe(false); // Empty
    expect(validateSiret('abcdefghijklmno')).toBe(false); // Letters only
  });
});
