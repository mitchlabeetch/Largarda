/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Company Enrichment Service
 * Manages company enrichment from external sources (API Recherche d'entreprises)
 * Uses free no-auth API: https://recherche-entreprises.api.gouv.fr
 * Handles sources_json attribution for data provenance
 * Rate limit: 7 requests/second per user
 */

import type { Company, UpdateCompanyInput } from '../../../common/ma/company/schema';

/**
 * Enrichment source type
 */
export interface EnrichmentSource {
  name: string;
  url?: string;
  lastFetchedAt?: number;
  data?: Record<string, unknown>;
}

/**
 * Sources JSON structure for tracking data provenance
 */
export interface SourcesJson {
  rechercheEntreprises?: EnrichmentSource;
  [key: string]: EnrichmentSource | undefined;
}

/**
 * Company Enrichment Service Interface
 */
export interface ICompanyEnrichmentService {
  /** Enrich/create company by SIREN using API Recherche d'entreprises */
  enrichBySiren(siren: string): Promise<Company | null>;
  /** Enrich existing company by ID */
  enrichCompany(companyId: string): Promise<Company | null>;
  /** Search for companies by name */
  searchByName(query: string, limit?: number): Promise<Array<Partial<Company>>>;
  /** Batch enrich multiple companies */
  batchEnrich(companyIds: string[]): Promise<Map<string, Company>>;
  /** Update sources_json for a company */
  updateSources(companyId: string, sources: SourcesJson): Promise<void>;
}

/**
 * API Recherche d'entreprises Response
 * @see https://recherche-entreprises.api.gouv.fr
 */
interface RechercheEntreprisesResponse {
  results: Array<{
    siren: string;
    nom_complet?: string;
    nom_raison_sociale?: string;
    sigle?: string;
    siret_siege?: string;
    numero_voie?: string;
    type_voie?: string;
    libelle_voie?: string;
    code_postal?: string;
    libelle_commune?: string;
    etat_administratif?: string;
    categorie_entreprise?: string;
    activite_principale?: string;
    date_creation?: string;
    tranche_effectif_salarie?: string;
    complements?: {
      est_entrepreneur_individuel?: boolean;
      est_entrepreneur_spectacle?: boolean;
    };
    matching_etablissements?: Array<{
      siret: string;
      adresse: string;
    }>;
  }>;
  total_results: number;
  page: number;
  per_page: number;
}

/**
 * API Recherche d'entreprises Enricher
 * Free no-auth API for French company data
 * @see openapi(1).json for full API spec
 */
class RechercheEntreprisesEnricher {
  private readonly baseUrl = 'https://recherche-entreprises.api.gouv.fr';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 150; // ~7 req/sec = 143ms + buffer

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /** Search by SIREN - returns first matching result */
  async fetchBySiren(siren: string): Promise<RechercheEntreprisesResponse['results'][0] | null> {
    await this.rateLimit();
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${siren}`);
      if (!response.ok) {
        if (response.status === 429) {
          console.warn("API Recherche d'entreprises rate limit exceeded");
        }
        return null;
      }
      const data: RechercheEntreprisesResponse = await response.json();
      return data.results.find((r) => r.siren === siren) ?? null;
    } catch {
      return null;
    }
  }

  /** Search by name - returns multiple results */
  async searchByName(query: string, limit = 10): Promise<RechercheEntreprisesResponse['results']> {
    await this.rateLimit();
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&per_page=${limit}`);
      if (!response.ok) {
        return [];
      }
      const data: RechercheEntreprisesResponse = await response.json();
      return data.results;
    } catch {
      return [];
    }
  }

  mapToCompanyUpdate(apiData: RechercheEntreprisesResponse['results'][0]): Partial<UpdateCompanyInput> {
    const update: Partial<UpdateCompanyInput> = {};

    // Use nom_complet (preferred) or nom_raison_sociale
    const name = apiData.nom_complet ?? apiData.nom_raison_sociale;
    if (name) {
      update.name = name;
    }

    // Build address from components
    const addressParts: string[] = [];
    if (apiData.numero_voie) addressParts.push(apiData.numero_voie);
    if (apiData.type_voie) addressParts.push(apiData.type_voie);
    if (apiData.libelle_voie) addressParts.push(apiData.libelle_voie);
    if (apiData.code_postal) addressParts.push(apiData.code_postal);
    if (apiData.libelle_commune) addressParts.push(apiData.libelle_commune);

    if (addressParts.length > 0) {
      update.headquartersAddress = addressParts.join(' ');
    }

    // NAF/NAF code (activite_principale)
    if (apiData.activite_principale) {
      update.nafCode = apiData.activite_principale;
    }

    // Legal form from categorie_entreprise
    if (apiData.categorie_entreprise) {
      update.legalForm = apiData.categorie_entreprise;
    }

    // Creation date
    if (apiData.date_creation) {
      update.registeredAt = new Date(apiData.date_creation).getTime();
    }

    // Employee count from tranche_effectif_salarie
    if (apiData.tranche_effectif_salarie) {
      // Map tranche codes to approximate numbers
      const employeeMap: Record<string, number> = {
        '00': 0,
        '01': 1,
        '02': 3,
        '03': 6,
        '11': 10,
        '12': 20,
        '21': 50,
        '22': 100,
        '31': 200,
        '32': 250,
        '41': 500,
        '42': 750,
        '51': 1000,
        '52': 1500,
        '53': 2000,
      };
      const tranche = apiData.tranche_effectif_salarie;
      if (tranche in employeeMap) {
        update.employeeCount = employeeMap[tranche];
      }
    }

    // SIRET (siege)
    if (apiData.siret_siege) {
      update.siret = apiData.siret_siege;
    }

    return update;
  }
}

/**
 * Company Enrichment Service Implementation
 */
export class CompanyEnrichmentService implements ICompanyEnrichmentService {
  private enricher = new RechercheEntreprisesEnricher();

  constructor(private db: any) {}

  /**
   * Enrich a company by SIREN number using API Recherche d'entreprises
   */
  async enrichBySiren(siren: string): Promise<Company | null> {
    const apiData = await this.enricher.fetchBySiren(siren);
    if (!apiData) {
      return null;
    }

    const update = this.enricher.mapToCompanyUpdate(apiData);
    const sources: SourcesJson = {
      rechercheEntreprises: {
        name: "API Recherche d'entreprises",
        url: `https://recherche-entreprises.api.gouv.fr/search?q=${siren}`,
        lastFetchedAt: Date.now(),
        data: apiData,
      },
    };

    // Try to find existing company by SIREN
    const existing = await this.db.select('ma_companies', { siren });
    let companyId: string;

    if (existing) {
      companyId = existing.id;
      await this.updateCompany(companyId, update, sources);
    } else {
      // Create new company if not exists
      companyId = crypto.randomUUID();
      const now = Date.now();
      const row = {
        id: companyId,
        siren,
        siret: update.siret ?? null,
        name: update.name ?? apiData.nom_complet ?? apiData.nom_raison_sociale ?? 'Unknown',
        legal_form: update.legalForm ?? null,
        naf_code: update.nafCode ?? null,
        sector_id: null as string | null,
        jurisdiction: null as string | null,
        headquarters_address: null as string | null,
        registered_at: update.registeredAt ?? null,
        employee_count: null as number | null,
        revenue: null as number | null,
        sources_json: JSON.stringify(sources),
        last_enriched_at: now,
        created_at: now,
        updated_at: now,
      };
      await this.db.insert('ma_companies', row);
    }

    return this.getById(companyId);
  }

  /**
   * Enrich an existing company by ID
   */
  async enrichCompany(companyId: string): Promise<Company | null> {
    const company = await this.getById(companyId);
    if (!company) {
      return null;
    }

    const apiData = await this.enricher.fetchBySiren(company.siren);
    if (!apiData) {
      return null;
    }

    const update = this.enricher.mapToCompanyUpdate(apiData);
    const sources: SourcesJson = {
      rechercheEntreprises: {
        name: "API Recherche d'entreprises",
        url: `https://recherche-entreprises.api.gouv.fr/search?q=${company.siren}`,
        lastFetchedAt: Date.now(),
        data: apiData,
      },
    };

    await this.updateCompany(companyId, update, sources);
    return this.getById(companyId);
  }

  /**
   * Search for companies by name
   * Returns lightweight company objects for selection
   */
  async searchByName(query: string, limit = 10): Promise<Array<Partial<Company>>> {
    const results = await this.enricher.searchByName(query, limit);
    return results.map((r) => ({
      siren: r.siren,
      siret: r.siret_siege,
      name: r.nom_complet ?? r.nom_raison_sociale ?? 'Unknown',
      legalForm: r.categorie_entreprise,
      nafCode: r.activite_principale,
      headquartersAddress: [r.numero_voie, r.type_voie, r.libelle_voie, r.code_postal, r.libelle_commune]
        .filter(Boolean)
        .join(' '),
    }));
  }

  /**
   * Batch enrich multiple companies
   */
  async batchEnrich(companyIds: string[]): Promise<Map<string, Company>> {
    const results = new Map<string, Company>();

    for (const companyId of companyIds) {
      try {
        const enriched = await this.enrichCompany(companyId);
        if (enriched) {
          results.set(companyId, enriched);
        }
      } catch {
        // Continue with next company on error
      }
    }

    return results;
  }

  /**
   * Update sources_json for a company
   */
  async updateSources(companyId: string, sources: SourcesJson): Promise<void> {
    const existing = await this.getById(companyId);
    if (!existing) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const currentSources: SourcesJson = existing.sourcesJson ? JSON.parse(existing.sourcesJson) : {};
    const mergedSources = { ...currentSources, ...sources };

    await this.db.update(
      'ma_companies',
      { id: companyId },
      {
        sources_json: JSON.stringify(mergedSources),
        updated_at: Date.now(),
      }
    );
  }

  /**
   * Get company by ID
   */
  private async getById(id: string): Promise<Company | null> {
    const row = await this.db.select('ma_companies', { id });
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      siren: row.siren,
      siret: row.siret ?? undefined,
      name: row.name,
      legalForm: row.legal_form ?? undefined,
      nafCode: row.naf_code ?? undefined,
      sectorId: row.sector_id ?? undefined,
      jurisdiction: row.jurisdiction ?? undefined,
      headquartersAddress: row.headquarters_address ?? undefined,
      registeredAt: row.registered_at ?? undefined,
      employeeCount: row.employee_count ?? undefined,
      revenue: row.revenue ?? undefined,
      sourcesJson: row.sources_json ?? undefined,
      lastEnrichedAt: row.last_enriched_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update company with enrichment data
   */
  private async updateCompany(
    companyId: string,
    update: Partial<UpdateCompanyInput>,
    sources: SourcesJson
  ): Promise<void> {
    const existing = await this.getById(companyId);
    if (!existing) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const currentSources: SourcesJson = existing.sourcesJson ? JSON.parse(existing.sourcesJson) : {};
    const mergedSources = { ...currentSources, ...sources };

    const updates: Record<string, unknown> = {
      updated_at: Date.now(),
      last_enriched_at: Date.now(),
      sources_json: JSON.stringify(mergedSources),
    };

    if (update.name !== undefined) {
      updates.name = update.name;
    }
    if (update.legalForm !== undefined) {
      updates.legal_form = update.legalForm;
    }
    if (update.nafCode !== undefined) {
      updates.naf_code = update.nafCode;
    }
    if (update.registeredAt !== undefined) {
      updates.registered_at = update.registeredAt;
    }

    await this.db.update('ma_companies', { id: companyId }, updates);
  }
}

// Singleton instance
let companyEnrichmentService: CompanyEnrichmentService | null = null;

export function getCompanyEnrichmentService(db: any): CompanyEnrichmentService {
  if (!companyEnrichmentService) {
    companyEnrichmentService = new CompanyEnrichmentService(db);
  }
  return companyEnrichmentService;
}
