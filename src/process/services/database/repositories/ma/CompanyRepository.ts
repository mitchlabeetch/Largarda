/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { Company, CreateCompanyInput, UpdateCompanyInput, IMaCompanyRow } from '@/common/ma/company/schema';
import { companyToRow, rowToCompany } from '@/common/ma/company/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for company operations.
 * Provides CRUD operations for company profiles with enrichment data.
 */
export class CompanyRepository {
  /**
   * Create a new company
   */
  async create(input: CreateCompanyInput): Promise<IQueryResult<Company>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `company_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const company: Company = {
        id,
        siren: input.siren,
        siret: input.siret,
        name: input.name,
        legalForm: input.legalForm,
        nafCode: input.nafCode,
        sectorId: input.sectorId,
        jurisdiction: input.jurisdiction,
        headquartersAddress: input.headquartersAddress,
        registeredAt: input.registeredAt,
        employeeCount: input.employeeCount,
        revenue: input.revenue,
        sourcesJson: input.sourcesJson,
        provenanceJson: input.provenanceJson,
        freshness: input.freshness,
        createdAt: now,
        updatedAt: now,
      };

      const row = companyToRow(company);
      const stmt = driver.prepare(`
        INSERT INTO ma_companies (id, siren, siret, name, legal_form, naf_code, sector_id, jurisdiction, headquarters_address, registered_at, employee_count, revenue, sources_json, provenance_json, freshness, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.siren,
        row.siret,
        row.name,
        row.legal_form,
        row.naf_code,
        row.sector_id,
        row.jurisdiction,
        row.headquarters_address,
        row.registered_at,
        row.employee_count,
        row.revenue,
        row.sources_json,
        row.provenance_json,
        row.freshness,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: company };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a company by ID
   */
  async get(id: string): Promise<IQueryResult<Company | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_companies WHERE id = ?').get(id) as IMaCompanyRow | undefined;

      return {
        success: true,
        data: row ? rowToCompany(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Get a company by SIREN
   */
  async getBySiren(siren: string): Promise<IQueryResult<Company | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_companies WHERE siren = ?').get(siren) as IMaCompanyRow | undefined;

      return {
        success: true,
        data: row ? rowToCompany(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a company
   */
  async update(id: string, input: UpdateCompanyInput): Promise<IQueryResult<Company>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Company not found' };
      }

      const updated: Company = {
        ...existing.data,
        siret: input.siret ?? existing.data.siret,
        name: input.name ?? existing.data.name,
        legalForm: input.legalForm ?? existing.data.legalForm,
        nafCode: input.nafCode ?? existing.data.nafCode,
        sectorId: input.sectorId ?? existing.data.sectorId,
        jurisdiction: input.jurisdiction ?? existing.data.jurisdiction,
        headquartersAddress: input.headquartersAddress ?? existing.data.headquartersAddress,
        registeredAt: input.registeredAt ?? existing.data.registeredAt,
        employeeCount: input.employeeCount ?? existing.data.employeeCount,
        revenue: input.revenue ?? existing.data.revenue,
        sourcesJson: input.sourcesJson ?? existing.data.sourcesJson,
        lastEnrichedAt: input.lastEnrichedAt ?? existing.data.lastEnrichedAt,
        provenanceJson: input.provenanceJson ?? existing.data.provenanceJson,
        freshness: input.freshness ?? existing.data.freshness,
        updatedAt: Date.now(),
      };

      const row = companyToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_companies
        SET siret = ?, name = ?, legal_form = ?, naf_code = ?, sector_id = ?, jurisdiction = ?, headquarters_address = ?, registered_at = ?, employee_count = ?, revenue = ?, sources_json = ?, last_enriched_at = ?, provenance_json = ?, freshness = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        row.siret,
        row.name,
        row.legal_form,
        row.naf_code,
        row.sector_id,
        row.jurisdiction,
        row.headquarters_address,
        row.registered_at,
        row.employee_count,
        row.revenue,
        row.sources_json,
        row.last_enriched_at,
        row.provenance_json,
        row.freshness,
        row.updated_at,
        id
      );

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a company
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_companies WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List companies with optional filtering
   */
  async list(filter?: { sectorId?: string }, page = 0, pageSize = 50): Promise<IPaginatedResult<Company>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      let countQuery = 'SELECT COUNT(*) as count FROM ma_companies';
      let dataQuery = 'SELECT * FROM ma_companies';
      const params: (string | number)[] = [];

      if (filter?.sectorId) {
        countQuery += ' WHERE sector_id = ?';
        dataQuery += ' WHERE sector_id = ?';
        params.push(filter.sectorId);
      }

      const countResult = driver.prepare(countQuery).get(...params) as { count: number };
      const total = countResult.count;

      dataQuery += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
      const rows = driver.prepare(dataQuery).all(...params, pageSize, page * pageSize) as IMaCompanyRow[];

      return {
        data: rows.map(rowToCompany),
        total,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < total,
      };
    } catch (error: unknown) {
      console.error('[CompanyRepository] List error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  /**
   * Search companies by name
   */
  async searchByName(query: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Company>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const searchPattern = `%${query}%`;
      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_companies WHERE name LIKE ?')
        .get(searchPattern) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_companies WHERE name LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(searchPattern, pageSize, page * pageSize) as IMaCompanyRow[];

      return {
        data: rows.map(rowToCompany),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[CompanyRepository] Search error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  /**
   * Upsert a company by SIREN
   */
  async upsertBySiren(input: CreateCompanyInput): Promise<IQueryResult<Company>> {
    const existing = await this.getBySiren(input.siren);
    if (existing.success && existing.data) {
      return this.update(existing.data.id, input);
    }
    return this.create(input);
  }
}

// Singleton instance
let companyRepositoryInstance: CompanyRepository | null = null;

export function getCompanyRepository(): CompanyRepository {
  if (!companyRepositoryInstance) {
    companyRepositoryInstance = new CompanyRepository();
  }
  return companyRepositoryInstance;
}
