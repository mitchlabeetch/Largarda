/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DealContextService
 * Manages deal-specific context and persistence across sessions.
 * Provides CRUD operations, active deal management, and deal archiving.
 * Active deal persistence is durable via database (ma_deals.is_active column).
 */

import type { DealContext, CreateDealInput, UpdateDealInput, DealStatus } from '@/common/ma/types';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

// ============================================================================
// DealContextService Class
// ============================================================================

/**
 * Service for managing deal context across the application.
 * Handles CRUD operations, active deal management, and persistence.
 * Active deal state is stored durably in the database via DealRepository.
 */
export class DealContextService {
  private repository: DealRepository;

  constructor(repository?: DealRepository) {
    this.repository = repository ?? new DealRepository();
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new deal
   */
  async createDeal(input: CreateDealInput): Promise<IQueryResult<DealContext>> {
    const result = await this.repository.create(input);

    if (result.success && result.data) {
      // If this is the first deal, set it as active
      const listResult = await this.repository.list();
      if (listResult.total === 1) {
        await this.setActiveDeal(result.data.id);
      }
    }

    return result;
  }

  /**
   * Get a deal by ID
   */
  async getDeal(id: string): Promise<IQueryResult<DealContext | null>> {
    return this.repository.get(id);
  }

  /**
   * Update a deal
   */
  async updateDeal(id: string, updates: UpdateDealInput): Promise<IQueryResult<DealContext>> {
    return this.repository.update(id, updates);
  }

  /**
   * Delete a deal
   * If deleting the active deal, clears the active deal state durably
   */
  async deleteDeal(id: string): Promise<IQueryResult<boolean>> {
    // If deleting the active deal, clear the active deal
    const activeResult = await this.repository.getActiveDeal();
    if (activeResult.success && activeResult.data && activeResult.data.id === id) {
      await this.repository.clearActiveDeal();
    }

    return this.repository.delete(id);
  }

  /**
   * List deals with optional filtering
   */
  async listDeals(filter?: { status?: DealStatus }, page = 0, pageSize = 50): Promise<IPaginatedResult<DealContext>> {
    return this.repository.list(filter, page, pageSize);
  }

  /**
   * Get all deals (simple list)
   */
  async getAllDeals(status?: DealStatus): Promise<IQueryResult<DealContext[]>> {
    try {
      const result = await this.repository.list(status ? { status } : undefined);
      return { success: true, data: result.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  // ============================================================================
  // Active Deal Management
  // ============================================================================

  /**
   * Set a deal as the active deal
   * Uses durable storage via repository
   */
  async setActiveDeal(id: string): Promise<IQueryResult<DealContext>> {
    return this.repository.setActiveDeal(id);
  }

  /**
   * Get the active deal
   * Uses durable storage via repository
   */
  async getActiveDeal(): Promise<IQueryResult<DealContext | null>> {
    return this.repository.getActiveDeal();
  }

  /**
   * Get the active deal ID
   * Uses durable storage via repository
   */
  async getActiveDealId(): Promise<string | null> {
    const result = await this.repository.getActiveDeal();
    return result.success && result.data ? result.data.id : null;
  }

  /**
   * Clear the active deal
   * Uses durable storage via repository, idempotent
   */
  async clearActiveDeal(): Promise<void> {
    await this.repository.clearActiveDeal();
  }

  /**
   * Check if a deal is the active deal
   */
  async isActiveDeal(id: string): Promise<boolean> {
    const activeId = await this.getActiveDealId();
    return activeId === id;
  }

  // ============================================================================
  // Deal Status Management
  // ============================================================================

  /**
   * Archive a deal
   * When archiving, if it's the active deal, clears the active deal state durably
   */
  async archiveDeal(id: string): Promise<IQueryResult<DealContext>> {
    // If archiving the active deal, clear active first
    const activeResult = await this.repository.getActiveDeal();
    if (activeResult.success && activeResult.data && activeResult.data.id === id) {
      await this.repository.clearActiveDeal();
    }

    return this.repository.archive(id);
  }

  /**
   * Close a deal
   * When closing, if it's the active deal, clears the active deal state durably
   */
  async closeDeal(id: string): Promise<IQueryResult<DealContext>> {
    // If closing the active deal, clear active first
    const activeResult = await this.repository.getActiveDeal();
    if (activeResult.success && activeResult.data && activeResult.data.id === id) {
      await this.repository.clearActiveDeal();
    }

    return this.repository.close(id);
  }

  /**
   * Reactivate an archived or closed deal
   */
  async reactivateDeal(id: string): Promise<IQueryResult<DealContext>> {
    return this.repository.reactivate(id);
  }

  // ============================================================================
  // Context Persistence
  // ============================================================================

  /**
   * Get deal context for use in AI responses
   * Returns a formatted context object for Flowise or other AI services
   */
  async getDealContextForAI(): Promise<{
    hasContext: boolean;
    deal?: DealContext;
    contextString?: string;
  }> {
    const result = await this.getActiveDeal();

    if (!result.success || !result.data) {
      return { hasContext: false };
    }

    const deal = result.data;
    const partiesList = deal.parties.map((p) => `${p.name} (${p.role})`).join(', ');

    const contextString = `
Deal: ${deal.name}
Type: ${deal.transactionType}
Target Company: ${deal.targetCompany.name}
${deal.targetCompany.industry ? `Industry: ${deal.targetCompany.industry}` : ''}
${deal.targetCompany.jurisdiction ? `Jurisdiction: ${deal.targetCompany.jurisdiction}` : ''}
Parties: ${partiesList}
Status: ${deal.status}
    `.trim();

    return {
      hasContext: true,
      deal,
      contextString,
    };
  }

  /**
   * Validate deal data before creation or update
   */
  validateDealInput(input: CreateDealInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Deal name is required');
    }

    if (!input.parties || input.parties.length === 0) {
      errors.push('At least one party is required');
    }

    if (input.parties) {
      input.parties.forEach((party, index) => {
        if (!party.name || party.name.trim().length === 0) {
          errors.push(`Party ${index + 1}: name is required`);
        }
        if (!party.role) {
          errors.push(`Party ${index + 1}: role is required`);
        }
      });
    }

    if (!input.transactionType) {
      errors.push('Transaction type is required');
    }

    if (!input.targetCompany || !input.targetCompany.name || input.targetCompany.name.trim().length === 0) {
      errors.push('Target company name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dealContextServiceInstance: DealContextService | null = null;

export function getDealContextService(): DealContextService {
  if (!dealContextServiceInstance) {
    dealContextServiceInstance = new DealContextService();
  }
  return dealContextServiceInstance;
}

// ============================================================================
// Export all types
// ============================================================================

export type { DealContext, CreateDealInput, UpdateDealInput, DealStatus };
