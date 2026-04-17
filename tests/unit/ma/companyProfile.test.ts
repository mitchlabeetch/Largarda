import { describe, expect, it } from 'vitest';

import {
  CompanyProfileMergeError,
  mergeCompanyProfile,
  type PappersPayload,
  type SirenePayload,
} from '@/common/ma/company';

const baseSirene: SirenePayload = {
  identifiers: { siren: '552032534', siret: '55203253400036' },
  legalName: 'RENAULT',
  legalForm: 'SA',
  nafCode: '29.10Z',
  headOfficeAddress: {
    street: '13-15 quai Le Gallo',
    postalCode: '92100',
    city: 'Boulogne-Billancourt',
    country: 'FR',
  },
  workforce: 104500,
  incorporationYear: 1898,
  fetchedAt: '2026-04-17T00:00:00.000Z',
};

const basePappers: PappersPayload = {
  identifiers: { siren: '552032534', vatNumber: 'FR76552032534' },
  legalName: 'RENAULT SA',
  legalForm: 'Société anonyme',
  nafCode: '29.10Z',
  shareCapital: { amount: 1_127_000_000, currency: 'EUR' },
  directors: [{ fullName: 'Luca de Meo', role: 'Directeur Général' }],
  beneficialOwners: [{ fullName: 'État français', ownershipPct: 0.15 }],
  latestFinancials: {
    fiscalYear: 2024,
    revenue: 56_000_000_000,
    ebitda: 8_500_000_000,
    currency: 'EUR',
  },
  inCollectiveProceeding: false,
  fetchedAt: '2026-04-17T00:00:00.000Z',
};

describe('mergeCompanyProfile', () => {
  it('merges both payloads with SIRENE winning on registration facts', () => {
    const profile = mergeCompanyProfile({ sirene: baseSirene, pappers: basePappers });

    expect(profile.identifiers.siren).toBe('552032534');
    expect(profile.identifiers.siret).toBe('55203253400036');
    expect(profile.identifiers.vatNumber).toBe('FR76552032534');

    expect(profile.legalName.value).toBe('RENAULT');
    expect(profile.legalName.attribution.source).toBe('sirene');

    expect(profile.legalForm?.value).toBe('SA');
    expect(profile.legalForm?.attribution.source).toBe('sirene');

    expect(profile.shareCapital?.value.amount).toBe(1_127_000_000);
    expect(profile.shareCapital?.attribution.source).toBe('pappers');

    expect(profile.directors.length).toBe(1);
    expect(profile.directors[0].value.fullName).toBe('Luca de Meo');
    expect(profile.directors[0].attribution.source).toBe('pappers');

    expect(profile.sources).toHaveLength(2);
    expect(profile.sources.map((s) => s.source)).toEqual(['sirene', 'pappers']);
  });

  it('builds a profile from SIRENE alone', () => {
    const profile = mergeCompanyProfile({ sirene: baseSirene });

    expect(profile.legalName.value).toBe('RENAULT');
    expect(profile.legalName.attribution.source).toBe('sirene');
    expect(profile.directors).toEqual([]);
    expect(profile.beneficialOwners).toEqual([]);
    expect(profile.shareCapital).toBeUndefined();
    expect(profile.latestFinancials).toBeUndefined();
    expect(profile.inCollectiveProceeding).toBeUndefined();
    expect(profile.sources.map((s) => s.source)).toEqual(['sirene']);
  });

  it('builds a profile from Pappers alone when SIRENE is absent', () => {
    const profile = mergeCompanyProfile({ pappers: basePappers });

    expect(profile.legalName.value).toBe('RENAULT SA');
    expect(profile.legalName.attribution.source).toBe('pappers');
    expect(profile.legalForm?.value).toBe('Société anonyme');
    expect(profile.legalForm?.attribution.source).toBe('pappers');
  });

  it('falls back to Pappers when SIRENE lacks a specific optional field', () => {
    const profile = mergeCompanyProfile({
      sirene: { ...baseSirene, tradeName: undefined },
      pappers: { ...basePappers, tradeName: 'Groupe Renault' },
    });
    expect(profile.tradeName?.value).toBe('Groupe Renault');
    expect(profile.tradeName?.attribution.source).toBe('pappers');
  });

  it('surfaces financials and collective proceeding flag with Pappers attribution', () => {
    const profile = mergeCompanyProfile({
      sirene: baseSirene,
      pappers: { ...basePappers, inCollectiveProceeding: true },
    });
    expect(profile.latestFinancials?.value.revenue).toBe(56_000_000_000);
    expect(profile.latestFinancials?.attribution.source).toBe('pappers');
    expect(profile.inCollectiveProceeding?.value).toBe(true);
  });

  it('deduplicates identical SIRENE fetch attributions', () => {
    const profile = mergeCompanyProfile({ sirene: baseSirene });
    expect(profile.sources).toHaveLength(1);
  });

  it('rejects invalid SIREN length', () => {
    expect(() =>
      mergeCompanyProfile({
        sirene: { ...baseSirene, identifiers: { siren: '12345' } },
      })
    ).toThrow(CompanyProfileMergeError);
  });

  it('rejects invalid SIRET length when provided', () => {
    expect(() =>
      mergeCompanyProfile({
        sirene: { ...baseSirene, identifiers: { siren: '552032534', siret: '123' } },
      })
    ).toThrow(CompanyProfileMergeError);
  });

  it('throws when the two payloads target different SIREN values', () => {
    expect(() =>
      mergeCompanyProfile({
        sirene: baseSirene,
        pappers: { ...basePappers, identifiers: { siren: '999999999' } },
      })
    ).toThrow(CompanyProfileMergeError);
  });

  it('throws when called with neither payload', () => {
    expect(() => mergeCompanyProfile({})).toThrow(CompanyProfileMergeError);
  });

  it('throws when Pappers-only payload has no legal name', () => {
    expect(() =>
      mergeCompanyProfile({
        pappers: { ...basePappers, legalName: undefined },
      })
    ).toThrow(CompanyProfileMergeError);
  });

  it('maps beneficial owners with per-row attribution', () => {
    const profile = mergeCompanyProfile({ sirene: baseSirene, pappers: basePappers });
    expect(profile.beneficialOwners).toHaveLength(1);
    expect(profile.beneficialOwners[0].value.ownershipPct).toBeCloseTo(0.15, 6);
    expect(profile.beneficialOwners[0].attribution.source).toBe('pappers');
  });
});
