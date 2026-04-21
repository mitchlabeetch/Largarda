/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Flowise schema for M&A data spine
 * Defines chatflow registry and prompt version tracking
 */

import { z } from 'zod';

// ============================================================================
// Chatflow Registry Types
// ============================================================================

export type ChatflowStatus = 'active' | 'deprecated' | 'archived';

// Zod Schemas
export const ChatflowStatusSchema = z.enum(['active', 'deprecated', 'archived']);

export const ChatflowRegistrySchema = z.object({
  flowKey: z.string(),
  flowId: z.string(),
  promptVersionId: z.string().optional(),
  status: ChatflowStatusSchema,
  description: z.string().optional(),
  updatedAt: z.number().int().positive(),
});

export const CreateChatflowRegistryInputSchema = z.object({
  flowKey: z.string(),
  flowId: z.string(),
  promptVersionId: z.string().optional(),
  status: ChatflowStatusSchema.optional(),
  description: z.string().optional(),
});

export const UpdateChatflowRegistryInputSchema = z.object({
  flowId: z.string().optional(),
  promptVersionId: z.string().optional(),
  status: ChatflowStatusSchema.optional(),
  description: z.string().optional(),
});

// ============================================================================
// Prompt Version Types
// ============================================================================

export const PromptVersionSchema = z.object({
  id: z.string(),
  flowKey: z.string(),
  hash: z.string(),
  payloadJson: z.string(),
  createdAt: z.number().int().positive(),
  createdBy: z.string().optional(),
});

export const CreatePromptVersionInputSchema = z.object({
  flowKey: z.string(),
  hash: z.string(),
  payloadJson: z.string(),
  createdBy: z.string().optional(),
});

// ============================================================================
// Chatflow Registry Interfaces
// ============================================================================

export interface ChatflowRegistry {
  flowKey: string;
  flowId: string;
  promptVersionId?: string;
  status: ChatflowStatus;
  description?: string;
  updatedAt: number;
}

export interface CreateChatflowRegistryInput {
  flowKey: string;
  flowId: string;
  promptVersionId?: string;
  status?: ChatflowStatus;
  description?: string;
}

export interface UpdateChatflowRegistryInput {
  flowId?: string;
  promptVersionId?: string;
  status?: ChatflowStatus;
  description?: string;
}

// ============================================================================
// Prompt Version Interfaces
// ============================================================================

export interface PromptVersion {
  id: string;
  flowKey: string;
  hash: string;
  payloadJson: string;
  createdAt: number;
  createdBy?: string;
}

export interface CreatePromptVersionInput {
  flowKey: string;
  hash: string;
  payloadJson: string;
  createdBy?: string;
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaChatflowRegistryRow {
  flow_key: string;
  flow_id: string;
  prompt_version_id: string | null;
  status: string;
  description: string | null;
  updated_at: number;
}

export interface IMaPromptVersionRow {
  id: string;
  flow_key: string;
  hash: string;
  payload_json: string;
  created_at: number;
  created_by: string | null;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function chatflowRegistryToRow(registry: ChatflowRegistry): IMaChatflowRegistryRow {
  return {
    flow_key: registry.flowKey,
    flow_id: registry.flowId,
    prompt_version_id: registry.promptVersionId ?? null,
    status: registry.status,
    description: registry.description ?? null,
    updated_at: registry.updatedAt,
  };
}

export function rowToChatflowRegistry(row: IMaChatflowRegistryRow): ChatflowRegistry {
  return {
    flowKey: row.flow_key,
    flowId: row.flow_id,
    promptVersionId: row.prompt_version_id ?? undefined,
    status: row.status as ChatflowStatus,
    description: row.description ?? undefined,
    updatedAt: row.updated_at,
  };
}

export function promptVersionToRow(version: PromptVersion): IMaPromptVersionRow {
  return {
    id: version.id,
    flow_key: version.flowKey,
    hash: version.hash,
    payload_json: version.payloadJson,
    created_at: version.createdAt,
    created_by: version.createdBy ?? null,
  };
}

export function rowToPromptVersion(row: IMaPromptVersionRow): PromptVersion {
  return {
    id: row.id,
    flowKey: row.flow_key,
    hash: row.hash,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
  };
}
