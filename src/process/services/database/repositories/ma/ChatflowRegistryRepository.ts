/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type {
  ChatflowRegistry,
  CreateChatflowRegistryInput,
  UpdateChatflowRegistryInput,
  PromptVersion,
  CreatePromptVersionInput,
  IMaChatflowRegistryRow,
  IMaPromptVersionRow,
} from '@/common/ma/flowise/schema';
import {
  chatflowRegistryToRow,
  rowToChatflowRegistry,
  promptVersionToRow,
  rowToPromptVersion,
} from '@/common/ma/flowise/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for chatflow registry and prompt version operations.
 * Provides CRUD operations for chatflow tracking and prompt versioning.
 */
export class ChatflowRegistryRepository {
  /**
   * Create or update a chatflow registry entry
   */
  async upsert(input: CreateChatflowRegistryInput): Promise<IQueryResult<ChatflowRegistry>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver.prepare('SELECT * FROM ma_chatflow_registry WHERE flow_key = ?').get(input.flowKey) as
        | IMaChatflowRegistryRow
        | undefined;

      const now = Date.now();
      let registry: ChatflowRegistry;

      if (existing) {
        registry = {
          flowKey: existing.flow_key,
          flowId: input.flowId ?? existing.flow_id,
          promptVersionId: input.promptVersionId ?? existing.prompt_version_id ?? undefined,
          status: input.status ?? (existing.status as any),
          description: input.description ?? existing.description ?? undefined,
          updatedAt: now,
        };

        const row = chatflowRegistryToRow(registry);
        const stmt = driver.prepare(`
          UPDATE ma_chatflow_registry
          SET flow_id = ?, prompt_version_id = ?, status = ?, description = ?, updated_at = ?
          WHERE flow_key = ?
        `);

        stmt.run(row.flow_id, row.prompt_version_id, row.status, row.description, row.updated_at, row.flow_key);
      } else {
        registry = {
          flowKey: input.flowKey,
          flowId: input.flowId,
          promptVersionId: input.promptVersionId,
          status: input.status ?? 'active',
          description: input.description,
          updatedAt: now,
        };

        const row = chatflowRegistryToRow(registry);
        const stmt = driver.prepare(`
          INSERT INTO ma_chatflow_registry (flow_key, flow_id, prompt_version_id, status, description, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(row.flow_key, row.flow_id, row.prompt_version_id, row.status, row.description, row.updated_at);
      }

      return { success: true, data: registry };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a chatflow registry entry by flow key
   */
  async get(flowKey: string): Promise<IQueryResult<ChatflowRegistry | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_chatflow_registry WHERE flow_key = ?').get(flowKey) as
        | IMaChatflowRegistryRow
        | undefined;

      return {
        success: true,
        data: row ? rowToChatflowRegistry(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a chatflow registry entry
   */
  async update(flowKey: string, input: UpdateChatflowRegistryInput): Promise<IQueryResult<ChatflowRegistry>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(flowKey);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Chatflow registry not found' };
      }

      const updated: ChatflowRegistry = {
        ...existing.data,
        flowId: input.flowId ?? existing.data.flowId,
        promptVersionId: input.promptVersionId ?? existing.data.promptVersionId,
        status: input.status ?? existing.data.status,
        description: input.description ?? existing.data.description,
        updatedAt: Date.now(),
      };

      const row = chatflowRegistryToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_chatflow_registry
        SET flow_id = ?, prompt_version_id = ?, status = ?, description = ?, updated_at = ?
        WHERE flow_key = ?
      `);

      stmt.run(row.flow_id, row.prompt_version_id, row.status, row.description, row.updated_at, row.flow_key);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a chatflow registry entry
   */
  async delete(flowKey: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_chatflow_registry WHERE flow_key = ?');
      const result = stmt.run(flowKey);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List chatflow registry entries by status
   */
  async listByStatus(status: string, page = 0, pageSize = 50): Promise<IPaginatedResult<ChatflowRegistry>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_chatflow_registry WHERE status = ?')
        .get(status) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_chatflow_registry WHERE status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
        .all(status, pageSize, page * pageSize) as IMaChatflowRegistryRow[];

      return {
        data: rows.map(rowToChatflowRegistry),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ChatflowRegistryRepository] List by status error:', error);
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
   * Create a prompt version
   */
  async createPromptVersion(input: CreatePromptVersionInput): Promise<IQueryResult<PromptVersion>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `promptver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const version: PromptVersion = {
        id,
        flowKey: input.flowKey,
        hash: input.hash,
        payloadJson: input.payloadJson,
        createdAt: now,
        createdBy: input.createdBy,
      };

      const row = promptVersionToRow(version);
      const stmt = driver.prepare(`
        INSERT INTO ma_prompt_versions (id, flow_key, hash, payload_json, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(row.id, row.flow_key, row.hash, row.payload_json, row.created_at, row.created_by);

      return { success: true, data: version };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a prompt version by ID
   */
  async getPromptVersion(id: string): Promise<IQueryResult<PromptVersion | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_prompt_versions WHERE id = ?').get(id) as
        | IMaPromptVersionRow
        | undefined;

      return {
        success: true,
        data: row ? rowToPromptVersion(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Get prompt versions for a flow key
   */
  async listPromptVersions(flowKey: string, page = 0, pageSize = 50): Promise<IPaginatedResult<PromptVersion>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_prompt_versions WHERE flow_key = ?')
        .get(flowKey) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_prompt_versions WHERE flow_key = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(flowKey, pageSize, page * pageSize) as IMaPromptVersionRow[];

      return {
        data: rows.map(rowToPromptVersion),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[ChatflowRegistryRepository] List prompt versions error:', error);
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
   * Get prompt version by hash
   */
  async getPromptVersionByHash(hash: string): Promise<IQueryResult<PromptVersion | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_prompt_versions WHERE hash = ?').get(hash) as
        | IMaPromptVersionRow
        | undefined;

      return {
        success: true,
        data: row ? rowToPromptVersion(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Delete prompt versions for a flow key
   */
  async deletePromptVersions(flowKey: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_prompt_versions WHERE flow_key = ?');
      const result = stmt.run(flowKey);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Update chatflow registry with new prompt version
   */
  async updatePromptVersion(flowKey: string, promptVersionId: string): Promise<IQueryResult<ChatflowRegistry>> {
    return this.update(flowKey, { promptVersionId });
  }
}

// Singleton instance
let chatflowRegistryRepositoryInstance: ChatflowRegistryRepository | null = null;

export function getChatflowRegistryRepository(): ChatflowRegistryRepository {
  if (!chatflowRegistryRepositoryInstance) {
    chatflowRegistryRepositoryInstance = new ChatflowRegistryRepository();
  }
  return chatflowRegistryRepositoryInstance;
}
