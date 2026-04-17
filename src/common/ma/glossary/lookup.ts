/**
 * Lookup and search helpers for the M&A glossary.
 *
 * All functions are pure and synchronous — the glossary is small enough
 * (low hundreds of entries at worst) that in-memory linear scans are the
 * right choice for now.
 */

import { GLOSSARY_ENTRIES } from './entries';
import type { GlossaryCategory, GlossaryEntry } from './types';

export type GlossaryLanguage = 'fr' | 'en';

export type GlossarySearchOptions = {
  readonly language?: GlossaryLanguage;
  readonly category?: GlossaryCategory;
  /** Maximum number of hits to return. Defaults to 10. */
  readonly limit?: number;
};

export class GlossaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlossaryError';
  }
}

const BY_ID: ReadonlyMap<string, GlossaryEntry> = (() => {
  const map = new Map<string, GlossaryEntry>();
  for (const entry of GLOSSARY_ENTRIES) {
    if (map.has(entry.id)) {
      throw new GlossaryError(`Duplicate glossary entry id: ${entry.id}`);
    }
    map.set(entry.id, entry);
  }
  return map;
})();

function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Return the entry with the given id, or `undefined` if unknown. */
export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id);
}

/** Return every entry, optionally filtered by category. */
export function listGlossaryEntries(category?: GlossaryCategory): readonly GlossaryEntry[] {
  if (!category) return GLOSSARY_ENTRIES;
  return GLOSSARY_ENTRIES.filter((entry) => entry.category === category);
}

/**
 * Search the glossary by free-text query.
 *
 * Match rules:
 *   - Accent- and case-insensitive.
 *   - Matches against term (fr + en), id, and definition (language-scoped
 *     when `language` is provided; otherwise both).
 *   - Results are ranked: term start > term contains > definition contains.
 */
export function searchGlossary(query: string, options: GlossarySearchOptions = {}): readonly GlossaryEntry[] {
  const normalized = normalize(query);
  if (normalized.length === 0) return [];

  const { language, category, limit = 10 } = options;

  const corpus = category ? GLOSSARY_ENTRIES.filter((e) => e.category === category) : GLOSSARY_ENTRIES;

  type Scored = { entry: GlossaryEntry; score: number };
  const scored: Scored[] = [];

  for (const entry of corpus) {
    const terms = [normalize(entry.termFr), normalize(entry.termEn), normalize(entry.id)];
    const definitions: string[] = [];
    if (language !== 'en') definitions.push(normalize(entry.definitionFr));
    if (language !== 'fr') definitions.push(normalize(entry.definitionEn));

    let score = 0;
    if (terms.some((t) => t.startsWith(normalized))) score = 3;
    else if (terms.some((t) => t.includes(normalized))) score = 2;
    else if (definitions.some((d) => d.includes(normalized))) score = 1;

    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.entry.id.localeCompare(b.entry.id);
  });

  return scored.slice(0, limit).map((s) => s.entry);
}
