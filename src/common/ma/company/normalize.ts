/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalization helpers for French company data
 * Converts SIRENE API responses to standardized SirenePayload format
 */

import type { Address, CompanyIdentifiers, SirenePayload } from './types';
import type { SireneCompany } from '@process/services/data/sireneClient';

/**
 * Normalize SIRENE API response to SirenePayload
 */
export function normalizeSireneCompany(company: SireneCompany): SirenePayload {
  const identifiers: CompanyIdentifiers = {
    siren: company.siren,
    siret: company.siege?.siret,
  };

  const headOfficeAddress = normalizeAddress(company.siege?.adresse);

  const workforce = normalizeWorkforce(company.tranche_effectif, company.effectif);

  const incorporationYear = normalizeIncorporationYear(
    company.annee_creation,
    company.date_creation,
    company.date_creation_etablissement
  );

  return {
    identifiers,
    legalName: company.nom_complet,
    tradeName: company.nom_raison_sociale || company.sigle,
    legalForm: normalizeLegalForm(company.categorie_juridique, company.forme_juridique),
    nafCode: company.activite_principale,
    headOfficeAddress,
    workforce,
    incorporationYear,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Normalize address from SIRENE format
 */
function normalizeAddress(sireneAddress?: {
  numero_voie?: string;
  type_voie?: string;
  libelle_voie?: string;
  code_postal?: string;
  code_commune?: string;
  libelle_commune?: string;
  pays?: string;
}): Address | undefined {
  if (!sireneAddress) {
    return undefined;
  }

  const streetParts = [sireneAddress.numero_voie, sireneAddress.type_voie, sireneAddress.libelle_voie]
    .filter(Boolean)
    .join(' ');

  if (!streetParts && !sireneAddress.code_postal && !sireneAddress.libelle_commune) {
    return undefined;
  }

  return {
    street: streetParts,
    postalCode: sireneAddress.code_postal || '',
    city: sireneAddress.libelle_commune || '',
    country: sireneAddress.pays || 'France',
  };
}

/**
 * Normalize workforce from SIRENE categorical or numeric values
 */
function normalizeWorkforce(trancheEffectif?: string, effectif?: number): number | undefined {
  // If numeric effectif is provided, use it directly
  if (effectif !== undefined) {
    return effectif;
  }

  // Map categorical workforce ranges to midpoints
  const workforceMap: Record<string, number> = {
    '00': 0, // Non employeur
    '01': 2, // 1 ou 2 salariés
    '02': 6, // 3 à 5 salariés
    '03': 15, // 6 à 9 salariés
    '11': 20, // 10 à 19 salariés
    '12': 35, // 20 à 49 salariés
    '21': 75, // 50 à 99 salariés
    '22': 175, // 100 à 199 salariés
    '31': 300, // 200 à 249 salariés
    '32': 400, // 250 à 499 salariés
    '41': 750, // 500 à 999 salariés
    '42': 2000, // 1000 à 1999 salariés
    '51': 3500, // 2000 à 4999 salariés
    '52': 7500, // 5000 à 9999 salariés
    '53': 15000, // 10000 salariés et plus
  };

  if (trancheEffectif && workforceMap[trancheEffectif] !== undefined) {
    return workforceMap[trancheEffectif];
  }

  return undefined;
}

/**
 * Normalize incorporation year from various date formats
 */
function normalizeIncorporationYear(
  anneeCreation?: number,
  dateCreation?: string,
  dateCreationEtablissement?: string
): number | undefined {
  // Direct year is preferred
  if (anneeCreation !== undefined) {
    return anneeCreation;
  }

  // Parse date strings (ISO format or French format)
  const parseYear = (dateStr?: string): number | undefined => {
    if (!dateStr) return undefined;

    // Try ISO format (YYYY-MM-DD)
    const isoMatch = dateStr.match(/^(\d{4})-/);
    if (isoMatch) {
      return parseInt(isoMatch[1], 10);
    }

    // Try French format (DD/MM/YYYY)
    const frMatch = dateStr.match(/(\d{4})$/);
    if (frMatch) {
      return parseInt(frMatch[1], 10);
    }

    return undefined;
  };

  return parseYear(dateCreation) || parseYear(dateCreationEtablissement);
}

/**
 * Normalize legal form code to human-readable form
 */
function normalizeLegalForm(categorieJuridique?: string, formeJuridique?: string): string | undefined {
  // If forme juridique is provided, use it (more descriptive)
  if (formeJuridique) {
    return formeJuridique;
  }

  // Map common legal form codes to descriptions
  const legalFormMap: Record<string, string> = {
    '1000': 'Entrepreneur individuel',
    '1001': 'Entrepreneur individuel',
    '1002': 'Entrepreneur individuel (EIRL)',
    '1003': 'Entrepreneur individuel (EI)',
    '1004': 'Micro-entrepreneur',
    '1005': 'Micro-entrepreneur (EIRL)',
    '2000': 'Personne morale',
    '2100': 'Société civile',
    '2101': 'Société civile',
    '2102': 'Société civile immobilière',
    '2103': 'Société civile',
    '2104': 'Société civile',
    '2105': 'Société civile',
    '2200': 'Société commerciale',
    '2201': 'Société en nom collectif',
    '2202': 'Société en commandite simple',
    '2203': 'Société à responsabilité limitée',
    '2204': 'Société anonyme',
    '2205': 'Société par actions simplifiée',
    '2206': 'Société en commandite par actions',
    '2210': 'Société coopérative',
    '2211': 'Société coopérative agricole',
    '2212': 'Société coopérative de consommation',
    '2213': 'Société coopérative artisanale',
    '2214': 'Société coopérative de production',
    '2215': "Société coopérative d'intérêt collectif",
    '2216': 'Société coopérative européenne',
    '2217': 'Société coopérative',
    '2218': 'Société coopérative',
    '2219': 'Société coopérative',
    '2220': "Société d'économie mixte",
    '2221': "Société d'économie mixte locale",
    '2222': "Société d'économie mixte",
    '2223': "Société d'économie mixte",
    '2224': "Société d'économie mixte",
    '2225': "Société d'économie mixte",
    '2226': "Société d'économie mixte",
    '2227': "Société d'économie mixte",
    '2228': "Société d'économie mixte",
    '2229': "Société d'économie mixte",
    '3000': 'Association',
    '3001': 'Association loi 1901',
    '3002': 'Association loi 1908',
    '3003': 'Association',
    '3004': 'Association',
    '3005': 'Association',
    '3006': 'Association',
    '3007': 'Association',
    '3008': 'Association',
    '3009': 'Association',
    '3010': 'Association',
    '4000': 'Autre personne morale',
    '4001': 'Administration centrale',
    '4002': 'Service déconcentré',
    '4003': 'Collectivité territoriale',
    '4004': 'Établissement public',
    '4005': 'Établissement public à caractère administratif',
    '4006': 'Établissement public à caractère industriel et commercial',
    '4007': 'Établissement public',
    '4008': 'Établissement public',
    '4009': 'Établissement public',
    '4010': 'Établissement public',
    '4011': 'Établissement public',
    '4012': 'Établissement public',
    '4013': 'Établissement public',
    '4014': 'Établissement public',
    '4015': 'Établissement public',
    '4016': 'Établissement public',
    '4017': 'Établissement public',
    '4018': 'Établissement public',
    '4019': 'Établissement public',
    '4020': 'Établissement public',
    '4021': 'Établissement public',
    '4022': 'Établissement public',
    '4023': 'Établissement public',
    '4024': 'Établissement public',
    '4025': 'Établissement public',
    '4026': 'Établissement public',
    '4027': 'Établissement public',
    '4028': 'Établissement public',
    '4029': 'Établissement public',
    '4030': 'Établissement public',
    '4031': 'Établissement public',
    '4032': 'Établissement public',
    '4033': 'Établissement public',
    '4034': 'Établissement public',
    '4035': 'Établissement public',
    '4036': 'Établissement public',
    '4037': 'Établissement public',
    '4038': 'Établissement public',
    '4039': 'Établissement public',
    '4040': 'Établissement public',
    '4041': 'Établissement public',
    '4042': 'Établissement public',
    '4043': 'Établissement public',
    '4044': 'Établissement public',
    '4045': 'Établlement public',
    '4046': 'Établissement public',
    '4047': 'Établissement public',
    '4048': 'Établissement public',
    '4049': 'Établissement public',
    '4050': 'Établissement public',
    '4051': 'Établissement public',
    '4052': 'Établissement public',
    '4053': 'Établissement public',
    '4054': 'Établissement public',
    '4055': 'Établissement public',
    '4056': 'Établissement public',
    '4057': 'Établissement public',
    '4058': 'Établissement public',
    '4059': 'Établissement public',
    '4060': 'Établissement public',
    '4061': 'Établissement public',
    '4062': 'Établissement public',
    '4063': 'Établissement public',
    '4064': 'Établissement public',
    '4065': 'Établissement public',
    '4066': 'Établissement public',
    '4067': 'Établissement public',
    '4068': 'Établissement public',
    '4069': 'Établissement public',
    '4070': 'Établissement public',
    '4071': 'Établissement public',
    '4072': 'Établissement public',
    '4073': 'Établissement public',
    '4074': 'Établissement public',
    '4075': 'Établissement public',
    '4076': 'Établissement public',
    '4077': 'Établissement public',
    '4078': 'Établissement public',
    '4079': 'Établissement public',
    '4080': 'Établissement public',
    '4081': 'Établissement public',
    '4082': 'Établissement public',
    '4083': 'Établissement public',
    '4084': 'Établissement public',
    '4085': 'Établissement public',
    '4086': 'Établissement public',
    '4087': 'Établissement public',
    '4088': 'Établissement public',
    '4089': 'Établissement public',
    '4090': 'Établissement public',
    '4091': 'Établissement public',
    '4092': 'Établissement public',
    '4093': 'Établissement public',
    '4094': 'Établissement public',
    '4095': 'Établissement public',
    '4096': 'Établissement public',
    '4097': 'Établissement public',
    '4098': 'Établissement public',
    '4099': 'Établissement public',
    '5000': 'Personne morale de droit étranger',
    '5001': 'Personne morale de droit étranger',
    '5002': 'Personne morale de droit étranger',
    '5003': 'Personne morale de droit étranger',
    '5004': 'Personne morale de droit étranger',
    '5005': 'Personne morale de droit étranger',
    '5006': 'Personne morale de droit étranger',
    '5007': 'Personne morale de droit étranger',
    '5008': 'Personne morale de droit étranger',
    '5009': 'Personne morale de droit étranger',
    '5010': 'Personne morale de droit étranger',
    '5011': 'Personne morale de droit étranger',
    '5012': 'Personne morale de droit étranger',
    '5013': 'Personne morale de droit étranger',
    '5014': 'Personne morale de droit étranger',
    '5015': 'Personne morale de droit étranger',
    '5016': 'Personne morale de droit étranger',
    '5017': 'Personne morale de droit étranger',
    '5018': 'Personne morale de droit étranger',
    '5019': 'Personne morale de droit étranger',
    '5020': 'Personne morale de droit étranger',
    '5021': 'Personne morale de droit étranger',
    '5022': 'Personne morale de droit étranger',
    '5023': 'Personne morale de droit étranger',
    '5024': 'Personne morale de droit étranger',
    '5025': 'Personne morale de droit étranger',
    '5026': 'Personne morale de droit étranger',
    '5027': 'Personne morale de droit étranger',
    '5028': 'Personne morale de droit étranger',
    '5029': 'Personne morale de droit étranger',
    '5030': 'Personne morale de droit étranger',
    '5031': 'Personne morale de droit étranger',
    '5032': 'Personne morale de droit étranger',
    '5033': 'Personne morale de droit étranger',
    '5034': 'Personne morale de droit étranger',
    '5035': 'Personne morale de droit étranger',
    '5036': 'Personne morale de droit étranger',
    '5037': 'Personne morale de droit étranger',
    '5038': 'Personne morale de droit étranger',
    '5039': 'Personne morale de droit étranger',
    '5040': 'Personne morale de droit étranger',
    '5041': 'Personne morale de droit étranger',
    '5042': 'Personne morale de droit étranger',
    '5043': 'Personne morale de droit étranger',
    '5044': 'Personne morale de droit étranger',
    '5045': 'Personne morale de droit étranger',
    '5046': 'Personne morale de droit étranger',
    '5047': 'Personne morale de droit étranger',
    '5048': 'Personne morale de droit étranger',
    '5049': 'Personne morale de droit étranger',
    '5050': 'Personne morale de droit étranger',
    '5051': 'Personne morale de droit étranger',
    '5052': 'Personne morale de droit étranger',
    '5053': 'Personne morale de droit étranger',
    '5054': 'Personne morale de droit étranger',
    '5055': 'Personne morale de droit étranger',
    '5056': 'Personne morale de droit étranger',
    '5057': 'Personne morale de droit étranger',
    '5058': 'Personne morale de droit étranger',
    '5059': 'Personne morale de droit étranger',
    '5060': 'Personne morale de droit étranger',
    '5061': 'Personne morale de droit étranger',
    '5062': 'Personne morale de droit étranger',
    '5063': 'Personne morale de droit étranger',
    '5064': 'Personne morale de droit étranger',
    '5065': 'Personne morale de droit étranger',
    '5066': 'Personne morale de droit étranger',
    '5067': 'Personne morale de droit étranger',
    '5068': 'Personne morale de droit étranger',
    '5069': 'Personne morale de droit étranger',
    '5070': 'Personne morale de droit étranger',
    '5071': 'Personne morale de droit étranger',
    '5072': 'Personne morale de droit étranger',
    '5073': 'Personne morale de droit étranger',
    '5074': 'Personne morale de droit étranger',
    '5075': 'Personne morale de droit étranger',
    '5076': 'Personne morale de droit étranger',
    '5077': 'Personne morale de droit étranger',
    '5078': 'Personne morale de droit étranger',
    '5079': 'Personne morale de droit étranger',
    '5080': 'Personne morale de droit étranger',
    '5081': 'Personne morale de droit étranger',
    '5082': 'Personne morale de droit étranger',
    '5083': 'Personne morale de droit étranger',
    '5084': 'Personne morale de droit étranger',
    '5085': 'Personne morale de droit étranger',
    '5086': 'Personne morale de droit étranger',
    '5087': 'Personne morale de droit étranger',
    '5088': 'Personne morale de droit étranger',
    '5089': 'Personne morale de droit étranger',
    '5090': 'Personne morale de droit étranger',
    '5091': 'Personne morale de droit étranger',
    '5092': 'Personne morale de droit étranger',
    '5093': 'Personne morale de droit étranger',
    '5094': 'Personne morale de droit étranger',
    '5095': 'Personne morale de droit étranger',
    '5096': 'Personne morale de droit étranger',
    '5097': 'Personne morale de droit étranger',
    '5098': 'Personne morale de droit étranger',
    '5099': 'Personne morale de droit étranger',
    '6000': 'Autre',
    '6001': 'Autre',
    '6002': 'Autre',
    '6003': 'Autre',
    '6004': 'Autre',
    '6005': 'Autre',
    '6006': 'Autre',
    '6007': 'Autre',
    '6008': 'Autre',
    '6009': 'Autre',
    '6010': 'Autre',
    '6011': 'Autre',
    '6012': 'Autre',
    '6013': 'Autre',
    '6014': 'Autre',
    '6015': 'Autre',
    '6016': 'Autre',
    '6017': 'Autre',
    '6018': 'Autre',
    '6019': 'Autre',
    '6020': 'Autre',
    '6021': 'Autre',
    '6022': 'Autre',
    '6023': 'Autre',
    '6024': 'Autre',
    '6025': 'Autre',
    '6026': 'Autre',
    '6027': 'Autre',
    '6028': 'Autre',
    '6029': 'Autre',
    '6030': 'Autre',
    '6031': 'Autre',
    '6032': 'Autre',
    '6033': 'Autre',
    '6034': 'Autre',
    '6035': 'Autre',
    '6036': 'Autre',
    '6037': 'Autre',
    '6038': 'Autre',
    '6039': 'Autre',
    '6040': 'Autre',
    '6041': 'Autre',
    '6042': 'Autre',
    '6043': 'Autre',
    '6044': 'Autre',
    '6045': 'Autre',
    '6046': 'Autre',
    '6047': 'Autre',
    '6048': 'Autre',
    '6049': 'Autre',
    '6050': 'Autre',
    '6051': 'Autre',
    '6052': 'Autre',
    '6053': 'Autre',
    '6054': 'Autre',
    '6055': 'Autre',
    '6056': 'Autre',
    '6057': 'Autre',
    '6058': 'Autre',
    '6059': 'Autre',
    '6060': 'Autre',
    '6061': 'Autre',
    '6062': 'Autre',
    '6063': 'Autre',
    '6064': 'Autre',
    '6065': 'Autre',
    '6066': 'Autre',
    '6067': 'Autre',
    '6068': 'Autre',
    '6069': 'Autre',
    '6070': 'Autre',
    '6071': 'Autre',
    '6072': 'Autre',
    '6073': 'Autre',
    '6074': 'Autre',
    '6075': 'Autre',
    '6076': 'Autre',
    '6077': 'Autre',
    '6078': 'Autre',
    '6079': 'Autre',
    '6080': 'Autre',
    '6081': 'Autre',
    '6082': 'Autre',
    '6083': 'Autre',
    '6084': 'Autre',
    '6085': 'Autre',
    '6086': 'Autre',
    '6087': 'Autre',
    '6088': 'Autre',
    '6089': 'Autre',
    '6090': 'Autre',
    '6091': 'Autre',
    '6092': 'Autre',
    '6093': 'Autre',
    '6094': 'Autre',
    '6095': 'Autre',
    '6096': 'Autre',
    '6097': 'Autre',
    '6098': 'Autre',
    '6099': 'Autre',
  };

  if (categorieJuridique && legalFormMap[categorieJuridique]) {
    return legalFormMap[categorieJuridique];
  }

  // Return the code itself if no mapping found
  return categorieJuridique;
}

/**
 * Validate SIREN format (9 digits)
 */
export function validateSiren(siren: string): boolean {
  return /^\d{9}$/.test(siren);
}

/**
 * Validate SIRET format (14 digits)
 */
export function validateSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret);
}
