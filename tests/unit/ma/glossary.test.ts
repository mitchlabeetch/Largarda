import { describe, expect, it } from 'vitest';

import {
  getGlossaryEntry,
  GLOSSARY_ENTRIES,
  listGlossaryEntries,
  searchGlossary,
} from '@/common/ma/glossary';

describe('GLOSSARY_ENTRIES', () => {
  it('ships at least 50 curated entries', () => {
    expect(GLOSSARY_ENTRIES.length).toBeGreaterThanOrEqual(50);
  });

  it('has unique ids', () => {
    const ids = GLOSSARY_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry provides both FR and EN term + definition', () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.termFr.length).toBeGreaterThan(0);
      expect(entry.termEn.length).toBeGreaterThan(0);
      expect(entry.definitionFr.length).toBeGreaterThan(0);
      expect(entry.definitionEn.length).toBeGreaterThan(0);
    }
  });

  it('relatedIds always point at known entries', () => {
    const idSet = new Set(GLOSSARY_ENTRIES.map((e) => e.id));
    for (const entry of GLOSSARY_ENTRIES) {
      if (!entry.relatedIds) continue;
      for (const related of entry.relatedIds) {
        expect(idSet.has(related)).toBe(true);
      }
    }
  });
});

describe('getGlossaryEntry', () => {
  it('returns a known entry by id', () => {
    const entry = getGlossaryEntry('nda');
    expect(entry?.termFr).toContain('NDA');
  });

  it('returns undefined for an unknown id', () => {
    expect(getGlossaryEntry('does-not-exist')).toBeUndefined();
  });
});

describe('listGlossaryEntries', () => {
  it('returns every entry when no filter is passed', () => {
    expect(listGlossaryEntries().length).toBe(GLOSSARY_ENTRIES.length);
  });

  it('filters by category', () => {
    const valuation = listGlossaryEntries('valuation');
    expect(valuation.length).toBeGreaterThanOrEqual(4);
    expect(valuation.every((e) => e.category === 'valuation')).toBe(true);
  });
});

describe('searchGlossary', () => {
  it('ignores diacritics when matching', () => {
    const results = searchGlossary('garantie d actif');
    expect(results[0]?.id).toBe('garantie_passif');
  });

  it('ranks term-start matches above term-contains matches', () => {
    const results = searchGlossary('earn');
    expect(results[0]?.id).toBe('earn_out');
  });

  it('matches English equivalents', () => {
    const results = searchGlossary('leveraged');
    expect(results.map((r) => r.id)).toContain('lbo');
  });

  it('respects the category filter', () => {
    const results = searchGlossary('clause', { category: 'legal' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.category === 'legal')).toBe(true);
  });

  it('respects the result limit', () => {
    const results = searchGlossary('de', { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns an empty array for an empty query', () => {
    expect(searchGlossary('')).toEqual([]);
    expect(searchGlossary('   ')).toEqual([]);
  });

  it('falls back to definition matches with lower score', () => {
    const results = searchGlossary('trésorerie');
    expect(results.some((r) => r.id === 'dcf')).toBe(true);
  });
});
