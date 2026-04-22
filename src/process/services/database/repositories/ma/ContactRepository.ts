/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { Contact, CreateContactInput, UpdateContactInput, IMaContactRow } from '@/common/ma/contact/schema';
import { contactToRow, rowToContact } from '@/common/ma/contact/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for contact operations.
 * Provides CRUD operations for contacts linked to companies and deals.
 */
export class ContactRepository {
  /**
   * Create a new contact
   */
  async create(input: CreateContactInput): Promise<IQueryResult<Contact>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const contact: Contact = {
        id,
        companyId: input.companyId,
        dealId: input.dealId,
        fullName: input.fullName,
        role: input.role,
        email: input.email,
        phone: input.phone,
        linkedinUrl: input.linkedinUrl,
        notes: input.notes,
        provenanceJson: input.provenanceJson,
        freshness: input.freshness,
        createdAt: now,
        updatedAt: now,
      };

      const row = contactToRow(contact);
      const stmt = driver.prepare(`
        INSERT INTO ma_contacts (id, company_id, deal_id, full_name, role, email, phone, linkedin_url, notes, provenance_json, freshness, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.company_id,
        row.deal_id,
        row.full_name,
        row.role,
        row.email,
        row.phone,
        row.linkedin_url,
        row.notes,
        row.provenance_json,
        row.freshness,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: contact };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a contact by ID
   */
  async get(id: string): Promise<IQueryResult<Contact | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_contacts WHERE id = ?').get(id) as IMaContactRow | undefined;

      return {
        success: true,
        data: row ? rowToContact(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a contact
   */
  async update(id: string, input: UpdateContactInput): Promise<IQueryResult<Contact>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Contact not found' };
      }

      const updated: Contact = {
        ...existing.data,
        companyId: input.companyId ?? existing.data.companyId,
        dealId: input.dealId ?? existing.data.dealId,
        fullName: input.fullName ?? existing.data.fullName,
        role: input.role ?? existing.data.role,
        email: input.email ?? existing.data.email,
        phone: input.phone ?? existing.data.phone,
        linkedinUrl: input.linkedinUrl ?? existing.data.linkedinUrl,
        notes: input.notes ?? existing.data.notes,
        provenanceJson: input.provenanceJson ?? existing.data.provenanceJson,
        freshness: input.freshness ?? existing.data.freshness,
        updatedAt: Date.now(),
      };

      const row = contactToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_contacts
        SET company_id = ?, deal_id = ?, full_name = ?, role = ?, email = ?, phone = ?, linkedin_url = ?, notes = ?, provenance_json = ?, freshness = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        row.company_id,
        row.deal_id,
        row.full_name,
        row.role,
        row.email,
        row.phone,
        row.linkedin_url,
        row.notes,
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
   * Delete a contact
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_contacts WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List contacts for a company
   */
  async listByCompany(companyId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Contact>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_contacts WHERE company_id = ?')
        .get(companyId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_contacts WHERE company_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(companyId, pageSize, page * pageSize) as IMaContactRow[];

      return {
        data: rows.map(rowToContact),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ContactRepository] List by company error:', error);
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
   * List contacts for a deal
   */
  async listByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Contact>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_contacts WHERE deal_id = ?').get(dealId) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_contacts WHERE deal_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(dealId, pageSize, page * pageSize) as IMaContactRow[];

      return {
        data: rows.map(rowToContact),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ContactRepository] List by deal error:', error);
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
   * Delete all contacts for a company
   */
  async deleteByCompany(companyId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_contacts WHERE company_id = ?');
      const result = stmt.run(companyId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Delete all contacts for a deal
   */
  async deleteByDeal(dealId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_contacts WHERE deal_id = ?');
      const result = stmt.run(dealId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }
}

// Singleton instance
let contactRepositoryInstance: ContactRepository | null = null;

export function getContactRepository(): ContactRepository {
  if (!contactRepositoryInstance) {
    contactRepositoryInstance = new ContactRepository();
  }
  return contactRepositoryInstance;
}
