/**
 * Sector taxonomy types (ROADMAP § 1.6).
 *
 * Each {@link MaSector} is a curated bucket that maps one or more NAF rev. 2
 * code ranges to an M&A-friendly label and an optional default rule-of-thumb
 * sector from the valuation engine.
 */

import type { RuleOfThumbSector } from '../valuation/types';

export type MaSectorId =
  | 'agriculture'
  | 'industrial_manufacturing'
  | 'food_production'
  | 'construction'
  | 'automotive'
  | 'chemicals_pharma'
  | 'pharmacie'
  | 'energy_utilities'
  | 'wholesale_retail'
  | 'ecommerce'
  | 'hospitality'
  | 'restaurant'
  | 'boulangerie'
  | 'transport_logistics'
  | 'media_publishing'
  | 'telecom'
  | 'software_saas'
  | 'it_services'
  | 'financial_services'
  | 'insurance'
  | 'real_estate'
  | 'agence_immobiliere'
  | 'professional_services'
  | 'cabinet_expertise_comptable'
  | 'consulting'
  | 'legal_services'
  | 'healthcare'
  | 'education'
  | 'beauty_wellness'
  | 'salon_coiffure'
  | 'other';

export type MaSector = {
  readonly id: MaSectorId;
  readonly labelFr: string;
  readonly labelEn: string;
  /** NAF rev.2 division or class prefixes (strings, matched left-anchored). */
  readonly nafPrefixes: readonly string[];
  /**
   * Optional linkage to the valuation engine's rule-of-thumb sectors.
   * When set, {@link resolveRuleOfThumbSector} can produce a default.
   */
  readonly ruleOfThumb?: RuleOfThumbSector;
};

export type SectorResolution = {
  readonly sector: MaSector;
  /** The prefix that matched, or `null` when we fell back to `'other'`. */
  readonly matchedPrefix: string | null;
};
