/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pappers Enricher
 * Pappers API integration for French company enrichment
 * Provides detailed financial, legal, and corporate data
 * @see https://api.pappers.fr
 */

import type { UpdateCompanyInput } from '../../../common/ma/company/schema';

/**
 * Pappers API Response structure
 */
interface PappersCompanyResponse {
  siren: string;
  nom_entreprise?: string;
  siege?: {
    adresse?: string;
    code_postal?: string;
    ville?: string;
    region?: string;
    pays?: string;
  };
  formes_juridiques?: string[];
  capital_social?: number;
  date_creation?: string;
  categorie_entreprise?: string;
  effectif?: number;
  tranche_effectif?: string;
  chiffre_affaires?: number;
  resultat_net?: number;
  dirigeants?: Array<{
    nom?: string;
    prenom?: string;
    fonction?: string;
    date_naissance?: string;
  }>;
  representations?: Array<{
    type?: string;
    nom?: string;
    prenom?: string;
  }>;
  naf?: string;
  activite_principale?: string;
  etat_administratif?: string;
  date_cloture_exercice?: string;
  bilan?: {
    annee?: string;
    chiffre_affaires?: number;
    resultat_net?: number;
    total_bilan?: number;
    capitaux_propres?: number;
  };
}

interface PappersSearchResponse {
  results: PappersCompanyResponse[];
  total_results: number;
  page: number;
  per_page: number;
}

/**
 * Merge precedence rules for enrichment sources
 * Higher number = higher precedence
 */
export const SOURCE_PRECEDENCE = {
  pappers: 10,
  rechercheEntreprises: 5,
  manual: 20,
} as const;

export type SourcePrecedenceKey = keyof typeof SOURCE_PRECEDENCE;

/**
 * Field-level merge strategy
 */
export enum MergeStrategy {
  /** Use the source with highest precedence */
  PRECEDENCE = 'precedence',
  /** Keep existing value if present */
  KEEP_EXISTING = 'keep_existing',
  /** Always use new value */
  OVERRIDE = 'override',
  /** Combine values (for arrays/objects) */
  MERGE = 'merge',
  /** Mark as disagreement when sources differ */
  DISAGREE = 'disagree',
}

/**
 * Merge configuration per field
 */
export const FIELD_MERGE_CONFIG: Record<string, MergeStrategy> = {
  // Use precedence for most fields
  name: MergeStrategy.PRECEDENCE,
  legalForm: MergeStrategy.PRECEDENCE,
  nafCode: MergeStrategy.PRECEDENCE,
  sectorId: MergeStrategy.PRECEDENCE,
  jurisdiction: MergeStrategy.PRECEDENCE,
  headquartersAddress: MergeStrategy.PRECEDENCE,

  // Financial data - prefer latest (override)
  revenue: MergeStrategy.OVERRIDE,
  employeeCount: MergeStrategy.PRECEDENCE,

  // Registration data - keep existing
  registeredAt: MergeStrategy.KEEP_EXISTING,

  // Manual edits have highest precedence
  siret: MergeStrategy.PRECEDENCE,
} as const;

/**
 * Disagreement record for tracking conflicting data
 */
export interface Disagreement {
  field: string;
  sources: Array<{
    source: string;
    value: unknown;
    precedence: number;
  }>;
  resolvedValue?: unknown;
  resolvedBy?: string;
}

/**
 * Provenance record for tracking field-level data sources
 */
export interface FieldProvenance {
  field: string;
  value: unknown;
  source: string;
  sourcePrecedence: number;
  lastUpdated: number;
}

/**
 * Provenance JSON structure
 */
export interface ProvenanceJson {
  fields: Record<string, FieldProvenance>;
  disagreements: Disagreement[];
  lastMerged: number;
}

/**
 * Pappers API Enricher
 */
export class PappersEnricher {
  private readonly baseUrl = 'https://api.pappers.fr';
  private apiKey?: string;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 100; // 10 req/sec

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PAPPERS_API_KEY;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Fetch company by SIREN from Pappers
   */
  async fetchBySiren(siren: string): Promise<PappersCompanyResponse | null> {
    await this.rateLimit();
    try {
      const response = await fetch(`${this.baseUrl}/v2/entreprise?siren=${siren}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Pappers API authentication failed');
        } else if (response.status === 429) {
          console.warn('Pappers API rate limit exceeded');
        } else if (response.status === 404) {
          return null;
        }
        return null;
      }

      const data: PappersCompanyResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Pappers API error:', error);
      return null;
    }
  }

  /**
   * Search companies by name
   */
  async searchByName(query: string, limit = 10): Promise<PappersCompanyResponse[]> {
    await this.rateLimit();
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/recherche?q=${encodeURIComponent(query)}&page=1&per_page=${limit}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return [];
      }

      const data: PappersSearchResponse = await response.json();
      return data.results;
    } catch (error) {
      console.error('Pappers search error:', error);
      return [];
    }
  }

  /**
   * Map Pappers response to company update
   */
  mapToCompanyUpdate(apiData: PappersCompanyResponse): Partial<UpdateCompanyInput> {
    const update: Partial<UpdateCompanyInput> = {};

    // Company name
    if (apiData.nom_entreprise) {
      update.name = apiData.nom_entreprise;
    }

    // Legal form
    if (apiData.formes_juridiques && apiData.formes_juridiques.length > 0) {
      update.legalForm = apiData.formes_juridiques[0];
    }

    // NAF code
    if (apiData.naf) {
      update.nafCode = apiData.naf;
    }

    // Address
    const addressParts: string[] = [];
    if (apiData.siege?.adresse) addressParts.push(apiData.siege.adresse);
    if (apiData.siege?.code_postal) addressParts.push(apiData.siege.code_postal);
    if (apiData.siege?.ville) addressParts.push(apiData.siege.ville);
    if (apiData.siege?.pays) addressParts.push(apiData.siege.pays);

    if (addressParts.length > 0) {
      update.headquartersAddress = addressParts.join(', ');
    }

    // Jurisdiction
    if (apiData.siege?.pays || apiData.siege?.region) {
      update.jurisdiction = apiData.siege.pays || apiData.siege.region;
    }

    // Creation date
    if (apiData.date_creation) {
      update.registeredAt = new Date(apiData.date_creation).getTime();
    }

    // Employee count
    if (apiData.effectif) {
      update.employeeCount = apiData.effectif;
    }

    // Revenue (from latest bilan)
    if (apiData.bilan?.chiffre_affaires) {
      update.revenue = apiData.bilan.chiffre_affaires;
    } else if (apiData.chiffre_affaires) {
      update.revenue = apiData.chiffre_affaires;
    }

    return update;
  }

  /**
   * Build provenance record for enriched fields
   */
  buildProvenance(update: Partial<UpdateCompanyInput>, source: string = 'pappers'): Record<string, FieldProvenance> {
    const provenance: Record<string, FieldProvenance> = {};
    const precedence = SOURCE_PRECEDENCE[source as SourcePrecedenceKey] || 0;
    const now = Date.now();

    for (const [field, value] of Object.entries(update)) {
      if (value !== undefined) {
        provenance[field] = {
          field,
          value,
          source,
          sourcePrecedence: precedence,
          lastUpdated: now,
        };
      }
    }

    return provenance;
  }
}

/**
 * Singleton instance
 */
let pappersEnricher: PappersEnricher | null = null;

export function getPappersEnricher(apiKey?: string): PappersEnricher {
  if (!pappersEnricher) {
    pappersEnricher = new PappersEnricher(apiKey);
  }
  return pappersEnricher;
}
