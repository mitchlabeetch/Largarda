/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { DealContext, CreateDealInput, UpdateDealInput, IMaDealRow } from '@/common/ma/types';
import { dealToRow, rowToDeal } from '@/common/ma/types';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for M&A deal operations.
 * Provides CRUD operations and active deal management.
 */
export class DealRepository {
  /**
   * Create a new deal
   */
  async create(input: CreateDealInput): Promise<IQueryResult<DealContext>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `deal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const deal: DealContext = {
        id,
        name: input.name,
        parties: input.parties,
        transactionType: input.transactionType,
        targetCompany: input.targetCompany,
        status: input.status ?? 'active',
        extra: input.extra,
        createdAt: now,
        updatedAt: now,
      };

      const row = dealToRow(deal);
      const stmt = driver.prepare(`
        INSERT INTO ma_deals (id, name, parties, transaction_type, target_company, status, extra, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.name,
        row.parties,
        row.transaction_type,
        row.target_company,
        row.status,
        row.extra,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: deal };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a deal by ID
   */
  async get(id: string): Promise<IQueryResult<DealContext | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_deals WHERE id = ?').get(id) as IMaDealRow | undefined;

      return {
        success: true,
        data: row ? rowToDeal(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a deal
   */
  async update(id: string, input: UpdateDealInput): Promise<IQueryResult<DealContext>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Deal not found' };
      }

      const updated: DealContext = {
        ...existing.data,
        name: input.name ?? existing.data.name,
        parties: input.parties ?? existing.data.parties,
        transactionType: input.transactionType ?? existing.data.transactionType,
        targetCompany: input.targetCompany
          ? { ...existing.data.targetCompany, ...input.targetCompany }
          : existing.data.targetCompany,
        status: input.status ?? existing.data.status,
        extra: input.extra ?? existing.data.extra,
        updatedAt: Date.now(),
      };

      const row = dealToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_deals
        SET name = ?, parties = ?, transaction_type = ?, target_company = ?, status = ?, extra = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        row.name,
        row.parties,
        row.transaction_type,
        row.target_company,
        row.status,
        row.extra,
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
   * Delete a deal
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_deals WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List deals with optional filtering
   */
  async list(filter?: { status?: string }, page = 0, pageSize = 50): Promise<IPaginatedResult<DealContext>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      let countQuery = 'SELECT COUNT(*) as count FROM ma_deals';
      let dataQuery = 'SELECT * FROM ma_deals';
      const params: (string | number)[] = [];

      if (filter?.status) {
        countQuery += ' WHERE status = ?';
        dataQuery += ' WHERE status = ?';
        params.push(filter.status);
      }

      const countResult = driver.prepare(countQuery).get(...params) as { count: number };
      const total = countResult.count;

      dataQuery += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
      const rows = driver.prepare(dataQuery).all(...params, pageSize, page * pageSize) as IMaDealRow[];

      return {
        data: rows.map(rowToDeal),
        total,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < total,
      };
    } catch (error: unknown) {
      console.error('[DealRepository] List error:', error);
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
   * Get all active deals
   */
  async getActiveDeals(): Promise<IQueryResult<DealContext[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const rows = driver
        .prepare("SELECT * FROM ma_deals WHERE status = 'active' ORDER BY updated_at DESC")
        .all() as IMaDealRow[];

      return { success: true, data: rows.map(rowToDeal) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  /**
   * Archive a deal
   */
  async archive(id: string): Promise<IQueryResult<DealContext>> {
    return this.update(id, { status: 'archived' });
  }

  /**
   * Close a deal
   */
  async close(id: string): Promise<IQueryResult<DealContext>> {
    return this.update(id, { status: 'closed' });
  }

  /**
   * Reactivate an archived deal
   */
  async reactivate(id: string): Promise<IQueryResult<DealContext>> {
    return this.update(id, { status: 'active' });
  }

  /**
   * Get the active deal from durable storage
   * Returns the deal with is_active = 1, or null if no active deal exists
   */
  async getActiveDeal(): Promise<IQueryResult<DealContext | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_deals WHERE is_active = 1').get() as IMaDealRow | undefined;

      return {
        success: true,
        data: row ? rowToDeal(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Set a deal as the active deal (durable)
   * Clears is_active from all other deals and sets it to 1 for the specified deal
   */
  async setActiveDeal(id: string): Promise<IQueryResult<DealContext>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      // First, verify the deal exists
      const dealResult = await this.get(id);
      if (!dealResult.success || !dealResult.data) {
        return { success: false, error: dealResult.error ?? 'Deal not found' };
      }

      // Clear is_active from all deals
      driver.prepare('UPDATE ma_deals SET is_active = 0').run();

      // Set is_active to 1 for the specified deal
      driver.prepare('UPDATE ma_deals SET is_active = 1, updated_at = ? WHERE id = ?').run(Date.now(), id);

      return { success: true, data: dealResult.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Clear the active deal (durable)
   * Sets is_active = 0 for all deals
   */
  async clearActiveDeal(): Promise<IQueryResult<void>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      driver.prepare('UPDATE ma_deals SET is_active = 0').run();

      return { success: true, data: undefined };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}

// Singleton instance
let dealRepositoryInstance: DealRepository | null = null;

export function getDealRepository(): DealRepository {
  if (!dealRepositoryInstance) {
    dealRepositoryInstance = new DealRepository();
  }
  return dealRepositoryInstance;
}
