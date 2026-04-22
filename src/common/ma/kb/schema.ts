/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Knowledge base schema for M&A data spine
 * Defines knowledge base sources and document chunks for RAG
 */

import { z } from 'zod';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

// ============================================================================
// KB Source Types
// ============================================================================

export type KbScope = 'deal' | 'company' | 'global';
export type KbStatus = 'pending' | 'ingesting' | 'completed' | 'error';

// Zod Schemas
export const KbScopeSchema = z.enum(['deal', 'company', 'global']);
export const KbStatusSchema = z.enum(['pending', 'ingesting', 'completed', 'error']);

export const KbSourceSchema = z.object({
  id: z.string(),
  scope: KbScopeSchema,
  scopeId: z.string(),
  flowiseDocumentStoreId: z.string().optional(),
  embeddingModel: z.string().optional(),
  chunkCount: z.number().int().nonnegative(),
  lastIngestedAt: z.number().int().positive().optional(),
  status: KbStatusSchema,
  errorText: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateKbSourceInputSchema = z.object({
  scope: KbScopeSchema,
  scopeId: z.string(),
  flowiseDocumentStoreId: z.string().optional(),
  embeddingModel: z.string().optional(),
  status: KbStatusSchema.optional(),
  provenanceJson: z.string().optional(),
  freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
});

export const UpdateKbSourceInputSchema = z.object({
  flowiseDocumentStoreId: z.string().optional(),
  embeddingModel: z.string().optional(),
  chunkCount: z.number().int().nonnegative().optional(),
  lastIngestedAt: z.number().int().positive().optional(),
  status: KbStatusSchema.optional(),
  errorText: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
});

// ============================================================================
// Document Chunk Types
// ============================================================================

export const DocumentChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  dealId: z.string().optional(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string().min(1),
  tokenCount: z.number().int().nonnegative().optional(),
  flowiseChunkId: z.string().optional(),
  metadataJson: z.string().optional(),
  createdAt: z.number().int().positive(),
});

export const CreateDocumentChunkInputSchema = z.object({
  documentId: z.string(),
  dealId: z.string().optional(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string().min(1),
  tokenCount: z.number().int().nonnegative().optional(),
  flowiseChunkId: z.string().optional(),
  metadataJson: z.string().optional(),
});

export const UpdateDocumentChunkInputSchema = z.object({
  text: z.string().min(1).optional(),
  tokenCount: z.number().int().nonnegative().optional(),
  flowiseChunkId: z.string().optional(),
  metadataJson: z.string().optional(),
});

// ============================================================================
// KB Source Interfaces
// ============================================================================

export interface KbSource {
  id: string;
  scope: KbScope;
  scopeId: string;
  flowiseDocumentStoreId?: string;
  embeddingModel?: string;
  chunkCount: number;
  lastIngestedAt?: number;
  status: KbStatus;
  errorText?: string;
  provenanceJson?: string;
  freshness?: FreshnessStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CreateKbSourceInput {
  scope: KbScope;
  scopeId: string;
  flowiseDocumentStoreId?: string;
  embeddingModel?: string;
  status?: KbStatus;
  provenanceJson?: string;
  freshness?: FreshnessStatus;
}

export interface UpdateKbSourceInput {
  flowiseDocumentStoreId?: string;
  embeddingModel?: string;
  chunkCount?: number;
  lastIngestedAt?: number;
  status?: KbStatus;
  errorText?: string;
  provenanceJson?: string;
  freshness?: FreshnessStatus;
}

// ============================================================================
// Document Chunk Interfaces
// ============================================================================

export interface DocumentChunk {
  id: string;
  documentId: string;
  dealId?: string;
  chunkIndex: number;
  text: string;
  tokenCount?: number;
  flowiseChunkId?: string;
  metadataJson?: string;
  createdAt: number;
}

export interface CreateDocumentChunkInput {
  documentId: string;
  dealId?: string;
  chunkIndex: number;
  text: string;
  tokenCount?: number;
  flowiseChunkId?: string;
  metadataJson?: string;
}

export interface UpdateDocumentChunkInput {
  text?: string;
  tokenCount?: number;
  flowiseChunkId?: string;
  metadataJson?: string;
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaKbSourceRow {
  id: string;
  scope: string;
  scope_id: string;
  flowise_document_store_id: string | null;
  embedding_model: string | null;
  chunk_count: number;
  last_ingested_at: number | null;
  status: string;
  error_text: string | null;
  provenance_json: string | null;
  freshness: string | null;
  created_at: number;
  updated_at: number;
}

export interface IMaDocumentChunkRow {
  id: string;
  document_id: string;
  deal_id: string | null;
  chunk_index: number;
  text: string;
  token_count: number | null;
  flowise_chunk_id: string | null;
  metadata_json: string | null;
  created_at: number;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function kbSourceToRow(source: KbSource): IMaKbSourceRow {
  return {
    id: source.id,
    scope: source.scope,
    scope_id: source.scopeId,
    flowise_document_store_id: source.flowiseDocumentStoreId ?? null,
    embedding_model: source.embeddingModel ?? null,
    chunk_count: source.chunkCount,
    last_ingested_at: source.lastIngestedAt ?? null,
    status: source.status,
    error_text: source.errorText ?? null,
    provenance_json: source.provenanceJson ?? null,
    freshness: source.freshness ?? null,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
  };
}

export function rowToKbSource(row: IMaKbSourceRow): KbSource {
  return {
    id: row.id,
    scope: row.scope as KbScope,
    scopeId: row.scope_id,
    flowiseDocumentStoreId: row.flowise_document_store_id ?? undefined,
    embeddingModel: row.embedding_model ?? undefined,
    chunkCount: row.chunk_count,
    lastIngestedAt: row.last_ingested_at ?? undefined,
    status: row.status as KbStatus,
    errorText: row.error_text ?? undefined,
    provenanceJson: row.provenance_json ?? undefined,
    freshness: (row.freshness as FreshnessStatus) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function documentChunkToRow(chunk: DocumentChunk): IMaDocumentChunkRow {
  return {
    id: chunk.id,
    document_id: chunk.documentId,
    deal_id: chunk.dealId ?? null,
    chunk_index: chunk.chunkIndex,
    text: chunk.text,
    token_count: chunk.tokenCount ?? null,
    flowise_chunk_id: chunk.flowiseChunkId ?? null,
    metadata_json: chunk.metadataJson ?? null,
    created_at: chunk.createdAt,
  };
}

export function rowToDocumentChunk(row: IMaDocumentChunkRow): DocumentChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    dealId: row.deal_id ?? undefined,
    chunkIndex: row.chunk_index,
    text: row.text,
    tokenCount: row.token_count ?? undefined,
    flowiseChunkId: row.flowise_chunk_id ?? undefined,
    metadataJson: row.metadata_json ?? undefined,
    createdAt: row.created_at,
  };
}
