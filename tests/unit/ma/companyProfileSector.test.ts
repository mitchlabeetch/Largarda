import { describe, expect, it } from 'vitest';

import {
  mergeCompanyProfile,
  resolveProfileSector,
  type PappersPayload,
  type SirenePayload,
} from '@/common/ma/company';

const baseSirene: SirenePayload = {
  identifiers: { siren: '552032534', siret: '55203253400036' },
  legalName: 'PHARMACIE DU CENTRE',
  legalForm: 'SARL',
  nafCode: '47.73Z',
  fetchedAt: '2026-04-17T00:00:00.000Z',
};

const basePappers: PappersPayload = {
  identifiers: { siren: '552032534' },
  legalName: 'Pharmacie du Centre',
  fetchedAt: '2026-04-17T00:00:00.000Z',
};

describe('resolveProfileSector', () => {
  it('returns the pharmacie sector for NAF 47.73Z', () => {
    const profile = mergeCompanyProfile({ sirene: baseSirene, pappers: basePappers });
    const resolution = resolveProfileSector(profile);
    expect(resolution?.sector.id).toBe('pharmacie');
    expect(resolution?.matchedPrefix).toBe('47.73');
  });

  it('returns the linked rule-of-thumb key for the valuation engine', () => {
    const profile = mergeCompanyProfile({ sirene: baseSirene });
    const resolution = resolveProfileSector(profile);
    expect(resolution?.sector.ruleOfThumb).toBe('pharmacie');
  });

  it('falls back to the reserved "other" sector for unknown NAF codes', () => {
    const profile = mergeCompanyProfile({
      sirene: { ...baseSirene, nafCode: '99.99Z' },
    });
    const resolution = resolveProfileSector(profile);
    expect(resolution?.sector.id).toBe('other');
    expect(resolution?.matchedPrefix).toBeNull();
  });

  it('returns undefined when the profile has no NAF code at all', () => {
    const profile = mergeCompanyProfile({
      sirene: { ...baseSirene, nafCode: undefined },
      pappers: { ...basePappers, nafCode: undefined },
    });
    expect(resolveProfileSector(profile)).toBeUndefined();
  });

  it('honours SIRENE-wins precedence when both payloads carry a NAF code', () => {
    const profile = mergeCompanyProfile({
      sirene: { ...baseSirene, nafCode: '47.73Z' },
      pappers: { ...basePappers, nafCode: '56.10A' },
    });
    expect(profile.nafCode?.attribution.source).toBe('sirene');
    expect(resolveProfileSector(profile)?.sector.id).toBe('pharmacie');
  });
});
