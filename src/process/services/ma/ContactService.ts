/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contact Service
 * Manages contacts for M&A data spine (CRUD over ma_contacts table)
 */

import type { Contact, CreateContactInput, UpdateContactInput } from '../../../common/ma/contact/schema';

/**
 * Contact Service Interface
 */
export interface IContactService {
  create(input: CreateContactInput): Promise<Contact>;
  getById(id: string): Promise<Contact | null>;
  list(filters?: { companyId?: string; dealId?: string }): Promise<Contact[]>;
  update(id: string, input: UpdateContactInput): Promise<Contact>;
  delete(id: string): Promise<void>;
}

/**
 * Contact Service Implementation
 */
export class ContactService implements IContactService {
  constructor(private db: any) {}

  /**
   * Create a new contact
   */
  async create(input: CreateContactInput): Promise<Contact> {
    const now = Date.now();
    const id = crypto.randomUUID();

    const row = {
      id,
      company_id: input.companyId ?? null,
      deal_id: input.dealId ?? null,
      full_name: input.fullName,
      role: input.role ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      linkedin_url: input.linkedinUrl ?? null,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('ma_contacts', row);

    return {
      id,
      companyId: input.companyId,
      dealId: input.dealId,
      fullName: input.fullName,
      role: input.role,
      email: input.email,
      phone: input.phone,
      linkedinUrl: input.linkedinUrl,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get contact by ID
   */
  async getById(id: string): Promise<Contact | null> {
    const row = await this.db.select('ma_contacts', { id });
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      companyId: row.company_id ?? undefined,
      dealId: row.deal_id ?? undefined,
      fullName: row.full_name,
      role: row.role ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      linkedinUrl: row.linkedin_url ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * List contacts with optional filters
   */
  async list(filters?: { companyId?: string; dealId?: string }): Promise<Contact[]> {
    const where: Record<string, unknown> = {};
    if (filters?.companyId) {
      where.company_id = filters.companyId;
    }
    if (filters?.dealId) {
      where.deal_id = filters.dealId;
    }

    const rows = await this.db.select('ma_contacts', where);

    return rows.map((row: any) => ({
      id: row.id,
      companyId: row.company_id ?? undefined,
      dealId: row.deal_id ?? undefined,
      fullName: row.full_name,
      role: row.role ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      linkedinUrl: row.linkedin_url ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Update a contact
   */
  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Contact not found: ${id}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      updated_at: now,
    };

    if (input.companyId !== undefined) {
      updates.company_id = input.companyId;
    }
    if (input.dealId !== undefined) {
      updates.deal_id = input.dealId;
    }
    if (input.fullName !== undefined) {
      updates.full_name = input.fullName;
    }
    if (input.role !== undefined) {
      updates.role = input.role;
    }
    if (input.email !== undefined) {
      updates.email = input.email;
    }
    if (input.phone !== undefined) {
      updates.phone = input.phone;
    }
    if (input.linkedinUrl !== undefined) {
      updates.linkedin_url = input.linkedinUrl;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes;
    }

    await this.db.update('ma_contacts', { id }, updates);

    return {
      id,
      companyId: input.companyId ?? existing.companyId,
      dealId: input.dealId ?? existing.dealId,
      fullName: input.fullName ?? existing.fullName,
      role: input.role ?? existing.role,
      email: input.email ?? existing.email,
      phone: input.phone ?? existing.phone,
      linkedinUrl: input.linkedinUrl ?? existing.linkedinUrl,
      notes: input.notes ?? existing.notes,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<void> {
    await this.db.delete('ma_contacts', { id });
  }
}

// Singleton instance
let contactService: ContactService | null = null;

export function getContactService(db: any): ContactService {
  if (!contactService) {
    contactService = new ContactService(db);
  }
  return contactService;
}
