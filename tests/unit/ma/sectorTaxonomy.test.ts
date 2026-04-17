import { describe, expect, it } from 'vitest';

import {
  getSectorById,
  resolveRuleOfThumbSector,
  resolveSectorFromNaf,
  SECTORS,
} from '@/common/ma/sector';

describe('resolveSectorFromNaf', () => {
  it('picks the most specific prefix when several match', () => {
    const result = resolveSectorFromNaf('47.73Z');
    expect(result.sector.id).toBe('pharmacie');
    expect(result.matchedPrefix).toBe('47.73');
  });

  it('falls back to a generic division when no specific class matches', () => {
    const result = resolveSectorFromNaf('47.11A');
    expect(result.sector.id).toBe('wholesale_retail');
    expect(result.matchedPrefix).toBe('47');
  });

  it('resolves boulangerie via 10.71', () => {
    expect(resolveSectorFromNaf('10.71D').sector.id).toBe('boulangerie');
  });

  it('resolves restaurant via 56', () => {
    expect(resolveSectorFromNaf('56.10A').sector.id).toBe('restaurant');
  });

  it('resolves SaaS via 62.01', () => {
    expect(resolveSectorFromNaf('62.01Z').sector.id).toBe('software_saas');
  });

  it('resolves IT services when the specific software prefix does not match', () => {
    expect(resolveSectorFromNaf('62.02A').sector.id).toBe('it_services');
  });

  it('normalizes whitespace and case', () => {
    const a = resolveSectorFromNaf('  47.73z  ');
    expect(a.sector.id).toBe('pharmacie');
  });

  it('falls back to the reserved "other" sector for unknown codes', () => {
    const result = resolveSectorFromNaf('99.99Z');
    expect(result.sector.id).toBe('other');
    expect(result.matchedPrefix).toBeNull();
  });
});

describe('getSectorById', () => {
  it('returns the sector entry', () => {
    expect(getSectorById('software_saas').id).toBe('software_saas');
    expect(getSectorById('pharmacie').labelFr).toBe('Pharmacie (officines)');
  });

  it('throws on unknown ids', () => {
    expect(() => getSectorById('unicorn' as never)).toThrow();
  });
});

describe('resolveRuleOfThumbSector', () => {
  it('returns the linked rule-of-thumb sector when applicable', () => {
    expect(resolveRuleOfThumbSector('47.73Z')).toBe('pharmacie');
    expect(resolveRuleOfThumbSector('56.10A')).toBe('restaurant');
    expect(resolveRuleOfThumbSector('62.01Z')).toBe('saas');
  });

  it('returns undefined for sectors without a rule-of-thumb link', () => {
    expect(resolveRuleOfThumbSector('68.32A')).toBeUndefined();
  });
});

describe('SECTORS catalogue', () => {
  it('has 31 unique ids', () => {
    const ids = SECTORS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SECTORS.length).toBe(31);
  });

  it('all sectors expose both FR and EN labels', () => {
    for (const sector of SECTORS) {
      expect(sector.labelFr.length).toBeGreaterThan(0);
      expect(sector.labelEn.length).toBeGreaterThan(0);
    }
  });

  it('prefixes remain non-empty except for the reserved fallback', () => {
    const sectorsWithPrefixes = SECTORS.filter((s) => s.id !== 'other');
    expect(sectorsWithPrefixes.every((s) => s.nafPrefixes.length > 0)).toBe(true);
  });
});
