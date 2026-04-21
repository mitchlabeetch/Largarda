/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Company Enrichment Service
 * Manages company enrichment from external sources (SIRENE, etc.)
 * Handles sources_json attribution for data provenance
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
  sirene?: EnrichmentSource;
  [key: string]: EnrichmentSource | undefined;
}

/**
 * Company Enrichment Service Interface
 */
export interface ICompanyEnrichmentService {
  enrichBySiren(siren: string): Promise<Company | null>;
  enrichCompany(companyId: string): Promise<Company | null>;
  batchEnrich(companyIds: string[]): Promise<Map<string, Company>>;
  updateSources(companyId: string, sources: SourcesJson): Promise<void>;
}

/**
 * SIRENE Enricher
 * Fetches company data from French SIRENE API
 */
class SireneEnricher {
  private readonly baseUrl = 'https://entreprise.data.gouv.fr/api/sirene/v3';

  async fetchBySiren(siren: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${this.baseUrl}/unites_legales/${siren}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.unite_legale ?? null;
    } catch {
      return null;
    }
  }

  async fetchBySiret(siret: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${this.baseUrl}/etablissements/${siret}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.etablissement ?? null;
    } catch {
      return null;
    }
  }

  mapToCompanyUpdate(sireneData: Record<string, unknown>): Partial<UpdateCompanyInput> {
    const update: Partial<UpdateCompanyInput> = {};

    if (sireneData.denomination) {
      update.name = String(sireneData.denomination);
    }
    if (sireneData.categorie_juridique) {
      update.legalForm = String(sireneData.categorie_juridique);
    }
    if (sireneData.activite_principale) {
      update.nafCode = String(sireneData.activite_principale);
    }
    if (sireneData.date_creation) {
      update.registeredAt = new Date(String(sireneData.date_creation)).getTime();
    }

    return update;
  }
}

/**
 * Company Enrichment Service Implementation
 */
export class CompanyEnrichmentService implements ICompanyEnrichmentService {
  private sireneEnricher = new SireneEnricher();

  constructor(private db: any) {}

  /**
   * Enrich a company by SIREN number
   */
  async enrichBySiren(siren: string): Promise<Company | null> {
    const sireneData = await this.sireneEnricher.fetchBySiren(siren);
    if (!sireneData) {
      return null;
    }

    const update = this.sireneEnricher.mapToCompanyUpdate(sireneData);
    const sources: SourcesJson = {
      sirene: {
        name: 'SIRENE',
        url: `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/${siren}`,
        lastFetchedAt: Date.now(),
        data: sireneData,
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
        siret: null as string | null,
        name: update.name ?? sireneData.denomination ?? 'Unknown',
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

    const sireneData = await this.sireneEnricher.fetchBySiren(company.siren);
    if (!sireneData) {
      return null;
    }

    const update = this.sireneEnricher.mapToCompanyUpdate(sireneData);
    const sources: SourcesJson = {
      sirene: {
        name: 'SIRENE',
        url: `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/${company.siren}`,
        lastFetchedAt: Date.now(),
        data: sireneData,
      },
    };

    await this.updateCompany(companyId, update, sources);
    return this.getById(companyId);
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
