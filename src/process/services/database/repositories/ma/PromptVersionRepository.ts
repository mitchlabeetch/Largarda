/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Prompt version repository (alias to ChatflowRegistryRepository)
 * This is a convenience wrapper that delegates to ChatflowRegistryRepository
 * for prompt version operations.
 */

import { getChatflowRegistryRepository } from './ChatflowRegistryRepository';
import type { PromptVersion, CreatePromptVersionInput } from '@/common/ma/flowise/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for prompt version operations.
 * Delegates to ChatflowRegistryRepository for actual operations.
 */
export class PromptVersionRepository {
  /**
   * Create a new prompt version
   */
  async create(input: CreatePromptVersionInput): Promise<IQueryResult<PromptVersion>> {
    const registryRepo = getChatflowRegistryRepository();
    return registryRepo.createPromptVersion(input);
  }

  /**
   * Get a prompt version by ID
   */
  async get(id: string): Promise<IQueryResult<PromptVersion | null>> {
    const registryRepo = getChatflowRegistryRepository();
    return registryRepo.getPromptVersion(id);
  }

  /**
   * Get prompt versions for a flow key
   */
  async listByFlowKey(flowKey: string, page = 0, pageSize = 50): Promise<IPaginatedResult<PromptVersion>> {
    const registryRepo = getChatflowRegistryRepository();
    return registryRepo.listPromptVersions(flowKey, page, pageSize);
  }

  /**
   * Get prompt version by hash
   */
  async getByHash(hash: string): Promise<IQueryResult<PromptVersion | null>> {
    const registryRepo = getChatflowRegistryRepository();
    return registryRepo.getPromptVersionByHash(hash);
  }

  /**
   * Delete prompt versions for a flow key
   */
  async deleteByFlowKey(flowKey: string): Promise<IQueryResult<number>> {
    const registryRepo = getChatflowRegistryRepository();
    return registryRepo.deletePromptVersions(flowKey);
  }
}

// Singleton instance
let promptVersionRepositoryInstance: PromptVersionRepository | null = null;

export function getPromptVersionRepository(): PromptVersionRepository {
  if (!promptVersionRepositoryInstance) {
    promptVersionRepositoryInstance = new PromptVersionRepository();
  }
  return promptVersionRepositoryInstance;
}
