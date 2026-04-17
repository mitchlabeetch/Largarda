/**
 * Public surface for the M&A terminology glossary.
 *
 * See ADR 0004 / ROADMAP § 1.4.
 */

export * from './types';
export { GLOSSARY_ENTRIES } from './entries';
export { getGlossaryEntry, listGlossaryEntries, searchGlossary, GlossaryError } from './lookup';
export type { GlossaryLanguage, GlossarySearchOptions } from './lookup';
