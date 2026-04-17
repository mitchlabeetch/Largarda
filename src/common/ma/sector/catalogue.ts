/**
 * Curated 31-entry M&A sector taxonomy.
 *
 * The prefixes are NAF rev. 2 divisions (two digits) or classes (4 digits
 * optionally followed by a letter) matched left-anchored. More specific
 * prefixes win over shorter ones.
 *
 * Source: INSEE NAF rev. 2 (effective 2008-01-01, updated 2020).
 */

import type { MaSector, MaSectorId, SectorResolution } from './types';

export const SECTORS: readonly MaSector[] = [
  {
    id: 'agriculture',
    labelFr: 'Agriculture & pêche',
    labelEn: 'Agriculture & fishing',
    nafPrefixes: ['01', '02', '03'],
  },
  {
    id: 'food_production',
    labelFr: 'Industrie agroalimentaire',
    labelEn: 'Food production',
    nafPrefixes: ['10', '11', '12'],
  },
  {
    id: 'boulangerie',
    labelFr: 'Boulangerie-pâtisserie',
    labelEn: 'Bakery & pastry',
    nafPrefixes: ['10.71'],
    ruleOfThumb: 'boulangerie',
  },
  { id: 'chemicals_pharma', labelFr: 'Chimie & pharmacie', labelEn: 'Chemicals & pharma', nafPrefixes: ['20', '21'] },
  {
    id: 'industrial_manufacturing',
    labelFr: 'Industrie manufacturière',
    labelEn: 'Industrial manufacturing',
    nafPrefixes: ['13', '14', '15', '16', '17', '18', '22', '23', '24', '25', '26', '27', '28', '31', '32', '33'],
  },
  { id: 'automotive', labelFr: 'Automobile', labelEn: 'Automotive', nafPrefixes: ['29', '30'] },
  {
    id: 'energy_utilities',
    labelFr: 'Énergie & utilities',
    labelEn: 'Energy & utilities',
    nafPrefixes: ['05', '06', '07', '08', '09', '19', '35', '36', '37', '38', '39'],
  },
  { id: 'construction', labelFr: 'Construction & BTP', labelEn: 'Construction', nafPrefixes: ['41', '42', '43'] },
  {
    id: 'wholesale_retail',
    labelFr: 'Commerce de gros et de détail',
    labelEn: 'Wholesale & retail',
    nafPrefixes: ['45', '46', '47'],
  },
  {
    id: 'pharmacie',
    labelFr: 'Pharmacie (officines)',
    labelEn: 'Pharmacy',
    nafPrefixes: ['47.73'],
    ruleOfThumb: 'pharmacie',
  },
  { id: 'ecommerce', labelFr: 'E-commerce', labelEn: 'E-commerce', nafPrefixes: ['47.91'], ruleOfThumb: 'ecommerce' },
  {
    id: 'transport_logistics',
    labelFr: 'Transport & logistique',
    labelEn: 'Transport & logistics',
    nafPrefixes: ['49', '50', '51', '52', '53'],
  },
  { id: 'hospitality', labelFr: 'Hôtellerie', labelEn: 'Hospitality', nafPrefixes: ['55'] },
  { id: 'restaurant', labelFr: 'Restauration', labelEn: 'Restaurant', nafPrefixes: ['56'], ruleOfThumb: 'restaurant' },
  {
    id: 'media_publishing',
    labelFr: 'Médias & édition',
    labelEn: 'Media & publishing',
    nafPrefixes: ['58', '59', '60'],
  },
  { id: 'telecom', labelFr: 'Télécommunications', labelEn: 'Telecom', nafPrefixes: ['61'] },
  {
    id: 'software_saas',
    labelFr: 'Logiciel & SaaS',
    labelEn: 'Software & SaaS',
    nafPrefixes: ['58.29', '62.01'],
    ruleOfThumb: 'saas',
  },
  { id: 'it_services', labelFr: 'Services informatiques', labelEn: 'IT services', nafPrefixes: ['62', '63'] },
  {
    id: 'financial_services',
    labelFr: 'Services financiers',
    labelEn: 'Financial services',
    nafPrefixes: ['64', '66'],
  },
  { id: 'insurance', labelFr: 'Assurance', labelEn: 'Insurance', nafPrefixes: ['65'] },
  { id: 'real_estate', labelFr: 'Immobilier', labelEn: 'Real estate', nafPrefixes: ['68'] },
  {
    id: 'agence_immobiliere',
    labelFr: 'Agence immobilière',
    labelEn: 'Real estate agency',
    nafPrefixes: ['68.31'],
    ruleOfThumb: 'agence_immobiliere',
  },
  { id: 'legal_services', labelFr: 'Services juridiques', labelEn: 'Legal services', nafPrefixes: ['69.10'] },
  {
    id: 'cabinet_expertise_comptable',
    labelFr: "Cabinet d'expertise comptable",
    labelEn: 'Accounting firm',
    nafPrefixes: ['69.20'],
    ruleOfThumb: 'cabinet_expertise_comptable',
  },
  { id: 'consulting', labelFr: 'Conseil', labelEn: 'Consulting', nafPrefixes: ['70', '74'] },
  {
    id: 'professional_services',
    labelFr: 'Services professionnels',
    labelEn: 'Professional services',
    nafPrefixes: ['71', '72', '73', '75', '77', '78', '79', '80', '81', '82'],
  },
  { id: 'education', labelFr: 'Éducation & formation', labelEn: 'Education', nafPrefixes: ['85'] },
  { id: 'healthcare', labelFr: 'Santé & action sociale', labelEn: 'Healthcare', nafPrefixes: ['86', '87', '88'] },
  { id: 'beauty_wellness', labelFr: 'Beauté & bien-être', labelEn: 'Beauty & wellness', nafPrefixes: ['96'] },
  {
    id: 'salon_coiffure',
    labelFr: 'Salon de coiffure',
    labelEn: 'Hair salon',
    nafPrefixes: ['96.02'],
    ruleOfThumb: 'salon_coiffure',
  },
  { id: 'other', labelFr: 'Autres secteurs', labelEn: 'Other sectors', nafPrefixes: [] },
];

const FALLBACK_SECTOR = SECTORS.find((s) => s.id === 'other') as MaSector;

function normalize(nafCode: string): string {
  return nafCode.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Resolve a NAF rev. 2 code to a {@link MaSector}. Always returns a value —
 * unknown codes fall back to the reserved `'other'` sector.
 */
export function resolveSectorFromNaf(nafCode: string): SectorResolution {
  const code = normalize(nafCode);

  let best: { sector: MaSector; prefix: string } | undefined;
  for (const sector of SECTORS) {
    for (const prefix of sector.nafPrefixes) {
      const normalizedPrefix = normalize(prefix);
      if (code.startsWith(normalizedPrefix)) {
        if (!best || normalizedPrefix.length > best.prefix.length) {
          best = { sector, prefix: normalizedPrefix };
        }
      }
    }
  }

  if (!best) {
    return { sector: FALLBACK_SECTOR, matchedPrefix: null };
  }
  return { sector: best.sector, matchedPrefix: best.prefix };
}

/** Look up a sector by id; throws when the id is unknown. */
export function getSectorById(id: MaSectorId): MaSector {
  const match = SECTORS.find((s) => s.id === id);
  if (!match) {
    throw new Error(`Unknown sector id: ${id}`);
  }
  return match;
}

/**
 * Return the {@link RuleOfThumbSector} associated with a NAF code when the
 * resolved M&A sector has one wired. Useful when the valuation engine needs
 * to pick a default rule.
 */
export function resolveRuleOfThumbSector(nafCode: string): MaSector['ruleOfThumb'] | undefined {
  return resolveSectorFromNaf(nafCode).sector.ruleOfThumb;
}
