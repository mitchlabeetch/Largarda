/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Repository for ma_comparable_companies and ma_comparable_sets operations.
 * Provides CRUD, search by sector, and freshness-based queries.
 */

import { getDatabase } from '@process/services/database';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';
import type {
  ComparableCompany,
  CreateComparableInput,
  UpdateComparableInput,
  IMaComparableCompanyRow,
  ComparableSet,
  CreateComparableSetInput,
  UpdateComparableSetInput,
  IMaComparableSetRow,
} from '@/common/ma/comparable/schema';
import {
  comparableCompanyToRow,
  rowToComparableCompany,
  comparableSetToRow,
  rowToComparableSet,
} from '@/common/ma/comparable/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

export class ComparableRepository {
  // ==========================================================================
  // Comparable Company Operations
  // ==========================================================================

  /**
   * Create a new comparable company
   */
  async createCompany(input: CreateComparableInput): Promise<IQueryResult<ComparableCompany>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const company: ComparableCompany = {
        id,
        name: input.name,
        ticker: input.ticker,
        exchange: input.exchange,
        sector: input.sector,
        industry: input.industry,
        country: input.country,
        marketCap: input.marketCap,
        enterpriseValue: input.enterpriseValue,
        revenue: input.revenue,
        ebitda: input.ebitda,
        ebit: input.ebit,
        netIncome: input.netIncome,
        totalDebt: input.totalDebt,
        cash: input.cash,
        multiples: input.multiples,
        source: input.source,
        currency: input.currency ?? 'EUR',
        provenanceJson: input.provenanceJson,
        freshness: input.freshness,
        fetchedAt: input.fetchedAt,
        createdAt: now,
        updatedAt: now,
      };

      const row = comparableCompanyToRow(company);
      const stmt = driver.prepare(`
        INSERT INTO ma_comparable_companies (id, name, ticker, exchange, sector, industry, country,
          market_cap, enterprise_value, revenue, ebitda, ebit, net_income, total_debt, cash,
          multiples_json, source, currency, provenance_json, freshness, fetched_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.name,
        row.ticker,
        row.exchange,
        row.sector,
        row.industry,
        row.country,
        row.market_cap,
        row.enterprise_value,
        row.revenue,
        row.ebitda,
        row.ebit,
        row.net_income,
        row.total_debt,
        row.cash,
        row.multiples_json,
        row.source,
        row.currency,
        row.provenance_json,
        row.freshness,
        row.fetched_at,
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
   * Get a comparable company by ID
   */
  async getCompany(id: string): Promise<IQueryResult<ComparableCompany | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_comparable_companies WHERE id = ?').get(id) as
        | IMaComparableCompanyRow
        | undefined;

      return {
        success: true,
        data: row ? rowToComparableCompany(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a comparable company
   */
  async updateCompany(id: string, input: UpdateComparableInput): Promise<IQueryResult<ComparableCompany>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver.prepare('SELECT * FROM ma_comparable_companies WHERE id = ?').get(id) as
        | IMaComparableCompanyRow
        | undefined;

      if (!existing) {
        return { success: false, error: `Comparable company ${id} not found` };
      }

      const now = Date.now();
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (input.name !== undefined) {
        setClauses.push('name = ?');
        values.push(input.name);
      }
      if (input.ticker !== undefined) {
        setClauses.push('ticker = ?');
        values.push(input.ticker);
      }
      if (input.exchange !== undefined) {
        setClauses.push('exchange = ?');
        values.push(input.exchange);
      }
      if (input.sector !== undefined) {
        setClauses.push('sector = ?');
        values.push(input.sector);
      }
      if (input.industry !== undefined) {
        setClauses.push('industry = ?');
        values.push(input.industry);
      }
      if (input.country !== undefined) {
        setClauses.push('country = ?');
        values.push(input.country);
      }
      if (input.marketCap !== undefined) {
        setClauses.push('market_cap = ?');
        values.push(input.marketCap);
      }
      if (input.enterpriseValue !== undefined) {
        setClauses.push('enterprise_value = ?');
        values.push(input.enterpriseValue);
      }
      if (input.revenue !== undefined) {
        setClauses.push('revenue = ?');
        values.push(input.revenue);
      }
      if (input.ebitda !== undefined) {
        setClauses.push('ebitda = ?');
        values.push(input.ebitda);
      }
      if (input.ebit !== undefined) {
        setClauses.push('ebit = ?');
        values.push(input.ebit);
      }
      if (input.netIncome !== undefined) {
        setClauses.push('net_income = ?');
        values.push(input.netIncome);
      }
      if (input.totalDebt !== undefined) {
        setClauses.push('total_debt = ?');
        values.push(input.totalDebt);
      }
      if (input.cash !== undefined) {
        setClauses.push('cash = ?');
        values.push(input.cash);
      }
      if (input.multiples !== undefined) {
        setClauses.push('multiples_json = ?');
        values.push(JSON.stringify(input.multiples));
      }
      if (input.source !== undefined) {
        setClauses.push('source = ?');
        values.push(input.source);
      }
      if (input.currency !== undefined) {
        setClauses.push('currency = ?');
        values.push(input.currency);
      }
      if (input.provenanceJson !== undefined) {
        setClauses.push('provenance_json = ?');
        values.push(input.provenanceJson);
      }
      if (input.freshness !== undefined) {
        setClauses.push('freshness = ?');
        values.push(input.freshness);
      }
      if (input.fetchedAt !== undefined) {
        setClauses.push('fetched_at = ?');
        values.push(input.fetchedAt);
      }

      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);

      driver.prepare(`UPDATE ma_comparable_companies SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

      const updated = driver
        .prepare('SELECT * FROM ma_comparable_companies WHERE id = ?')
        .get(id) as IMaComparableCompanyRow;

      return { success: true, data: rowToComparableCompany(updated) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a comparable company
   */
  async deleteCompany(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_comparable_companies WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List comparable companies by sector
   */
  async listBySector(sector: string, page = 0, pageSize = 50): Promise<IPaginatedResult<ComparableCompany>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_comparable_companies WHERE sector = ?')
        .get(sector) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_comparable_companies WHERE sector = ? ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(sector, pageSize, page * pageSize) as IMaComparableCompanyRow[];

      return {
        data: rows.map(rowToComparableCompany),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[ComparableRepository] List by sector error:', message);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * List comparable companies by freshness status
   */
  async listByFreshness(
    freshness: FreshnessStatus,
    page = 0,
    pageSize = 50
  ): Promise<IPaginatedResult<ComparableCompany>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_comparable_companies WHERE freshness = ?')
        .get(freshness) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_comparable_companies WHERE freshness = ? ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(freshness, pageSize, page * pageSize) as IMaComparableCompanyRow[];

      return {
        data: rows.map(rowToComparableCompany),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ComparableRepository] List by freshness error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * Search comparable companies by name
   */
  async searchByName(query: string, page = 0, pageSize = 50): Promise<IPaginatedResult<ComparableCompany>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const searchPattern = `%${query}%`;
      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_comparable_companies WHERE name LIKE ?')
        .get(searchPattern) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_comparable_companies WHERE name LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(searchPattern, pageSize, page * pageSize) as IMaComparableCompanyRow[];

      return {
        data: rows.map(rowToComparableCompany),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ComparableRepository] Search by name error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  // ==========================================================================
  // Comparable Set Operations
  // ==========================================================================

  /**
   * Create a new comparable set
   */
  async createSet(input: CreateComparableSetInput): Promise<IQueryResult<ComparableSet>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `compset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const set: ComparableSet = {
        id,
        name: input.name,
        description: input.description,
        sector: input.sector,
        dealId: input.dealId,
        companyId: input.companyId,
        comparableIds: input.comparableIds,
        selectedMetrics: input.selectedMetrics ?? ['ev_ebitda', 'ev_revenue'],
        provenanceJson: input.provenanceJson,
        freshness: input.freshness,
        createdAt: now,
        updatedAt: now,
      };

      const row = comparableSetToRow(set);
      const stmt = driver.prepare(`
        INSERT INTO ma_comparable_sets (id, name, description, sector, deal_id, company_id,
          comparable_ids_json, selected_metrics_json, aggregate_stats_json, provenance_json, freshness, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.name,
        row.description,
        row.sector,
        row.deal_id,
        row.company_id,
        row.comparable_ids_json,
        row.selected_metrics_json,
        row.aggregate_stats_json,
        row.provenance_json,
        row.freshness,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: set };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a comparable set by ID
   */
  async getSet(id: string): Promise<IQueryResult<ComparableSet | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_comparable_sets WHERE id = ?').get(id) as
        | IMaComparableSetRow
        | undefined;

      return {
        success: true,
        data: row ? rowToComparableSet(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a comparable set
   */
  async updateSet(id: string, input: UpdateComparableSetInput): Promise<IQueryResult<ComparableSet>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver.prepare('SELECT * FROM ma_comparable_sets WHERE id = ?').get(id) as
        | IMaComparableSetRow
        | undefined;

      if (!existing) {
        return { success: false, error: `Comparable set ${id} not found` };
      }

      const now = Date.now();
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (input.name !== undefined) {
        setClauses.push('name = ?');
        values.push(input.name);
      }
      if (input.description !== undefined) {
        setClauses.push('description = ?');
        values.push(input.description);
      }
      if (input.sector !== undefined) {
        setClauses.push('sector = ?');
        values.push(input.sector);
      }
      if (input.dealId !== undefined) {
        setClauses.push('deal_id = ?');
        values.push(input.dealId);
      }
      if (input.companyId !== undefined) {
        setClauses.push('company_id = ?');
        values.push(input.companyId);
      }
      if (input.comparableIds !== undefined) {
        setClauses.push('comparable_ids_json = ?');
        values.push(JSON.stringify(input.comparableIds));
      }
      if (input.selectedMetrics !== undefined) {
        setClauses.push('selected_metrics_json = ?');
        values.push(JSON.stringify(input.selectedMetrics));
      }
      if (input.aggregateStats !== undefined) {
        setClauses.push('aggregate_stats_json = ?');
        values.push(JSON.stringify(input.aggregateStats));
      }
      if (input.provenanceJson !== undefined) {
        setClauses.push('provenance_json = ?');
        values.push(input.provenanceJson);
      }
      if (input.freshness !== undefined) {
        setClauses.push('freshness = ?');
        values.push(input.freshness);
      }

      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);

      driver.prepare(`UPDATE ma_comparable_sets SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

      const updated = driver.prepare('SELECT * FROM ma_comparable_sets WHERE id = ?').get(id) as IMaComparableSetRow;

      return { success: true, data: rowToComparableSet(updated) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a comparable set
   */
  async deleteSet(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_comparable_sets WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List comparable sets by sector
   */
  async listSetsBySector(sector: string, page = 0, pageSize = 50): Promise<IPaginatedResult<ComparableSet>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_comparable_sets WHERE sector = ?')
        .get(sector) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_comparable_sets WHERE sector = ? ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(sector, pageSize, page * pageSize) as IMaComparableSetRow[];

      return {
        data: rows.map(rowToComparableSet),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ComparableRepository] List sets by sector error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * List comparable sets by deal
   */
  async listSetsByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<ComparableSet>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_comparable_sets WHERE deal_id = ?')
        .get(dealId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_comparable_sets WHERE deal_id = ? ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(dealId, pageSize, page * pageSize) as IMaComparableSetRow[];

      return {
        data: rows.map(rowToComparableSet),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ComparableRepository] List sets by deal error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }
}

// Singleton instance
let comparableRepositoryInstance: ComparableRepository | null = null;

export function getComparableRepository(): ComparableRepository {
  if (!comparableRepositoryInstance) {
    comparableRepositoryInstance = new ComparableRepository();
  }
  return comparableRepositoryInstance;
}
