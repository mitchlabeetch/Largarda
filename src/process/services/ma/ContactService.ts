/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContactService
 * Manages contact operations with business logic.
 * Provides CRUD operations for contacts linked to companies and deals.
 */

import type { Contact, CreateContactInput, UpdateContactInput } from '@/common/ma/contact/schema';
import { getContactRepository } from '@process/services/database/repositories/ma/ContactRepository';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Service for managing contact operations.
 * Handles CRUD operations with validation and business logic.
 */
export class ContactService {
  private repository = getContactRepository();

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new contact
   */
  async createContact(input: CreateContactInput): Promise<IQueryResult<Contact>> {
    const validation = this.validateContactInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    return this.repository.create(input);
  }

  /**
   * Get a contact by ID
   */
  async getContact(id: string): Promise<IQueryResult<Contact | null>> {
    return this.repository.get(id);
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, updates: UpdateContactInput): Promise<IQueryResult<Contact>> {
    const validation = this.validateContactInput(updates, true);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    return this.repository.update(id, updates);
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<IQueryResult<boolean>> {
    return this.repository.delete(id);
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * List contacts for a company
   */
  async listContactsByCompany(companyId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Contact>> {
    return this.repository.listByCompany(companyId, page, pageSize);
  }

  /**
   * List contacts for a deal
   */
  async listContactsByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<Contact>> {
    return this.repository.listByDeal(dealId, page, pageSize);
  }

  /**
   * Delete all contacts for a company
   */
  async deleteContactsByCompany(companyId: string): Promise<IQueryResult<number>> {
    return this.repository.deleteByCompany(companyId);
  }

  /**
   * Delete all contacts for a deal
   */
  async deleteContactsByDeal(dealId: string): Promise<IQueryResult<number>> {
    return this.repository.deleteByDeal(dealId);
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate contact input
   */
  validateContactInput(
    input: CreateContactInput | UpdateContactInput,
    isUpdate = false
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!isUpdate && (input as CreateContactInput).fullName) {
      const fullName = (input as CreateContactInput).fullName;
      if (fullName.trim().length === 0) {
        errors.push('Full name is required');
      }
    }

    if (input.email && !this.isValidEmail(input.email)) {
      errors.push('Invalid email format');
    }

    if (input.linkedinUrl && !this.isValidUrl(input.linkedinUrl)) {
      errors.push('Invalid LinkedIn URL format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let contactServiceInstance: ContactService | null = null;

export function getContactService(): ContactService {
  if (!contactServiceInstance) {
    contactServiceInstance = new ContactService();
  }
  return contactServiceInstance;
}

// ============================================================================
// Export all types
// ============================================================================

export type { Contact, CreateContactInput, UpdateContactInput };
