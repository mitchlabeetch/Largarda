/**
 * Types for the M&A terminology glossary (ROADMAP § 1.4).
 *
 * Entries are deliberately small and self-contained so the glossary can be
 * bundled into the renderer and the assistant context without a database
 * round-trip.
 */

export type GlossaryCategory =
  | 'process'
  | 'documents'
  | 'valuation'
  | 'legal'
  | 'finance'
  | 'governance'
  | 'deal_structure'
  | 'due_diligence';

export type GlossaryEntry = {
  /** URL-safe identifier — lowercase, snake_case. */
  readonly id: string;
  /** Canonical French term (the one most M&A practitioners use). */
  readonly termFr: string;
  /** English equivalent (can be identical when the term is a loanword). */
  readonly termEn: string;
  readonly definitionFr: string;
  readonly definitionEn: string;
  readonly category: GlossaryCategory;
  /** Related entry ids (e.g. { id: 'loi' } relates to { id: 'sha' }). */
  readonly relatedIds?: readonly string[];
};
