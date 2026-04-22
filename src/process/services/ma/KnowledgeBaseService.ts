/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KnowledgeBaseService
 * ------------------
 * Provenance-aware ingestion and retrieval layer for knowledge-backed AI features.
 *
 * Responsibilities:
 *   1. Orchestrate document ingestion into the knowledge base with provenance tracking.
 *   2. Provide retrieval operations with freshness-aware filtering.
 *   3. Track ingestion status and maintain KB source metadata.
 *   4. Support semantic search preparation (chunk retrieval for embedding/vector search).
 *
 * Provenance Model:
 *   - Each KB source tracks provenance_json with source, fetchedAt, policy
 *   - Each chunk can link back to its source via flowiseChunkId
 *   - Freshness is computed and stored per KB source
 */

import type {
  KbSource,
  CreateKbSourceInput,
  UpdateKbSourceInput,
  KbScope,
  DocumentChunk,
  CreateDocumentChunkInput,
} from '@/common/ma/kb/schema';
import type { Provenance, FreshnessStatus } from '@/common/ma/sourceCache/schema';
import type { KbSourceRepository } from '@process/services/database/repositories/ma/KbSourceRepository';
import type { DocumentChunkRepository } from '@process/services/database/repositories/ma/DocumentChunkRepository';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

// ============================================================================
// Types
// ============================================================================

export interface IngestionResult {
  success: boolean;
  kbSourceId?: string;
  chunkCount?: number;
  error?: string;
  provenance?: Provenance;
}

export interface RetrievalOptions {
  /** Filter by freshness status */
  freshness?: FreshnessStatus | FreshnessStatus[];
  /** Filter by scope type */
  scope?: KbScope;
  /** Filter by scope ID (requires scope) */
  scopeId?: string;
  /** Maximum chunks to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface ChunkSearchResult {
  chunks: DocumentChunk[];
  total: number;
  hasMore: boolean;
  /** Freshness breakdown of results */
  freshnessStats: Record<FreshnessStatus, number>;
}

export interface KbStats {
  totalSources: number;
  byStatus: Record<string, number>;
  byFreshness: Record<string, number>;
  totalChunks: number;
  byScope: Record<string, number>;
}

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface KnowledgeBaseServiceDeps {
  kbSourceRepository: KbSourceRepository;
  documentChunkRepository: DocumentChunkRepository;
  /** Pluggable clock for deterministic tests */
  now?: () => number;
}

// ============================================================================
// Service
// ============================================================================

export class KnowledgeBaseService {
  private kbRepo: KbSourceRepository;
  private chunkRepo: DocumentChunkRepository;
  private now: () => number;

  constructor(deps: KnowledgeBaseServiceDeps) {
    this.kbRepo = deps.kbSourceRepository;
    this.chunkRepo = deps.documentChunkRepository;
    this.now = deps.now ?? (() => Date.now());
  }

  // ==========================================================================
  // Ingestion Operations
  // ==========================================================================

  /**
   * Create or update a KB source with provenance tracking.
   * Uses upsertByScope to maintain idempotency.
   */
  async registerSource(
    scope: KbScope,
    scopeId: string,
    provenance: Provenance,
    metadata?: {
      flowiseDocumentStoreId?: string;
      embeddingModel?: string;
    }
  ): Promise<IQueryResult<KbSource>> {
    const freshness = this.computeFreshness(provenance);

    const input: CreateKbSourceInput = {
      scope,
      scopeId,
      flowiseDocumentStoreId: metadata?.flowiseDocumentStoreId,
      embeddingModel: metadata?.embeddingModel,
      status: 'pending',
      provenanceJson: JSON.stringify(provenance),
      freshness,
    };

    return this.kbRepo.upsertByScope(input);
  }

  /**
   * Mark a KB source as beginning ingestion.
   */
  async beginIngestion(kbSourceId: string): Promise<IQueryResult<KbSource>> {
    return this.kbRepo.markIngesting(kbSourceId);
  }

  /**
   * Store chunks for a document and update KB source tracking.
   * This is the core ingestion operation that persists processed chunks.
   */
  async ingestChunks(
    kbSourceId: string,
    documentId: string,
    chunks: Array<{
      text: string;
      tokenCount?: number;
      flowiseChunkId?: string;
      metadata?: Record<string, unknown>;
    }>,
    dealId?: string
  ): Promise<IngestionResult> {
    // Verify KB source exists
    const kbResult = await this.kbRepo.get(kbSourceId);
    if (!kbResult.success || !kbResult.data) {
      return { success: false, error: `KB source ${kbSourceId} not found` };
    }

    const kbSource = kbResult.data;

    // Create chunk inputs
    const chunkInputs: CreateDocumentChunkInput[] = chunks.map((chunk, index) => ({
      documentId,
      dealId,
      chunkIndex: index,
      text: chunk.text,
      tokenCount: chunk.tokenCount,
      flowiseChunkId: chunk.flowiseChunkId,
      metadataJson: chunk.metadata ? JSON.stringify(chunk.metadata) : undefined,
    }));

    // Batch create chunks
    const batchResult = await this.chunkRepo.batchCreate(chunkInputs);
    if (!batchResult.success) {
      await this.kbRepo.markError(kbSourceId, batchResult.error ?? 'Chunk creation failed');
      return { success: false, error: batchResult.error };
    }

    // Mark KB source as completed with chunk count
    const completedResult = await this.kbRepo.markCompleted(kbSourceId, batchResult.data.length);
    if (!completedResult.success) {
      return {
        success: false,
        error: completedResult.error,
        kbSourceId,
        chunkCount: batchResult.data.length,
      };
    }

    // Parse provenance for return
    let provenance: Provenance | undefined;
    try {
      if (kbSource.provenanceJson) {
        provenance = JSON.parse(kbSource.provenanceJson) as Provenance;
      }
    } catch {
      // Ignore parse errors
    }

    return {
      success: true,
      kbSourceId,
      chunkCount: batchResult.data.length,
      provenance,
    };
  }

  /**
   * Mark ingestion as failed with error details.
   */
  async failIngestion(kbSourceId: string, error: string): Promise<IQueryResult<KbSource>> {
    return this.kbRepo.markError(kbSourceId, error);
  }

  /**
   * Full ingestion pipeline: register source, begin ingestion, store chunks, complete.
   * This is a convenience method for simple ingestion workflows.
   */
  async ingestDocument(
    scope: KbScope,
    scopeId: string,
    documentId: string,
    chunks: Array<{
      text: string;
      tokenCount?: number;
      flowiseChunkId?: string;
      metadata?: Record<string, unknown>;
    }>,
    provenance: Provenance,
    options?: {
      dealId?: string;
      flowiseDocumentStoreId?: string;
      embeddingModel?: string;
    }
  ): Promise<IngestionResult> {
    // Step 1: Register/update KB source
    const registerResult = await this.registerSource(scope, scopeId, provenance, {
      flowiseDocumentStoreId: options?.flowiseDocumentStoreId,
      embeddingModel: options?.embeddingModel,
    });

    if (!registerResult.success || !registerResult.data) {
      return {
        success: false,
        error: registerResult.error ?? 'Failed to register KB source',
      };
    }

    const kbSourceId = registerResult.data.id;

    // Step 2: Begin ingestion
    await this.beginIngestion(kbSourceId);

    // Step 3: Ingest chunks
    return this.ingestChunks(kbSourceId, documentId, chunks, options?.dealId);
  }

  // ==========================================================================
  // Retrieval Operations
  // ==========================================================================

  /**
   * Get chunks for a specific document.
   */
  async getChunksByDocument(documentId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<DocumentChunk>> {
    return this.chunkRepo.listByDocument(documentId, page, pageSize);
  }

  /**
   * Get chunks for a deal across all documents.
   */
  async getChunksByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<DocumentChunk>> {
    return this.chunkRepo.listByDeal(dealId, page, pageSize);
  }

  /**
   * Search chunks by text content (LIKE query).
   * For production semantic search, integrate with vector database.
   */
  async searchChunks(query: string, options: RetrievalOptions = {}): Promise<ChunkSearchResult> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    // Build freshness filter
    const freshnessFilter = options.freshness
      ? Array.isArray(options.freshness)
        ? options.freshness
        : [options.freshness]
      : undefined;

    // Get all chunks matching scope if specified
    let chunks: DocumentChunk[] = [];
    let total = 0;

    if (options.scope && options.scopeId) {
      // Get KB source first
      const kbResult = await this.kbRepo.getByScope(options.scope, options.scopeId);
      if (kbResult.success && kbResult.data) {
        // Get chunks by deal if this is a deal scope
        if (options.scope === 'deal') {
          const result = await this.chunkRepo.listByDeal(options.scopeId, 0, limit + offset);
          chunks = result.data;
          total = result.total;
        }
      }
    } else {
      // Get chunks across all documents (limited)
      // This is a simplified approach - in production, use vector search
      const docResult = await this.chunkRepo.listByDocument('all', 0, limit + offset);
      chunks = docResult.data;
      total = docResult.total;
    }

    // Apply text search filter
    const searchLower = query.toLowerCase();
    const filteredChunks = chunks.filter((chunk) => chunk.text.toLowerCase().includes(searchLower));

    // Apply freshness filter if specified
    let finalChunks = filteredChunks;
    if (freshnessFilter) {
      // Get KB sources for freshness check
      const kbSources = new Map<string, KbSource>();
      for (const chunk of filteredChunks) {
        const kbResult = await this.kbRepo.getByScope('deal', chunk.dealId ?? '');
        if (kbResult.success && kbResult.data) {
          kbSources.set(chunk.dealId ?? '', kbResult.data);
        }
      }

      finalChunks = filteredChunks.filter((chunk) => {
        const kbSource = kbSources.get(chunk.dealId ?? '');
        return kbSource && freshnessFilter.includes(kbSource.freshness ?? 'unknown');
      });
    }

    // Apply pagination
    const paginatedChunks = finalChunks.slice(offset, offset + limit);

    // Compute freshness stats
    const freshnessStats: Record<FreshnessStatus, number> = {
      fresh: 0,
      stale: 0,
      expired: 0,
      unknown: 0,
    };

    for (const chunk of finalChunks) {
      const kbResult = await this.kbRepo.getByScope('deal', chunk.dealId ?? '');
      const freshness = kbResult.data?.freshness ?? 'unknown';
      freshnessStats[freshness]++;
    }

    return {
      chunks: paginatedChunks,
      total: finalChunks.length,
      hasMore: offset + paginatedChunks.length < finalChunks.length,
      freshnessStats,
    };
  }

  /**
   * Get chunks filtered by freshness status.
   * This is useful for RAG systems that want to only use fresh data.
   */
  async getChunksByFreshness(
    freshness: FreshnessStatus | FreshnessStatus[],
    dealId?: string,
    limit = 50
  ): Promise<ChunkSearchResult> {
    const freshnessArray = Array.isArray(freshness) ? freshness : [freshness];

    // Get KB sources with matching freshness
    const allSourcesResult = await this.kbRepo.listByScope('deal', 0, 1000);
    const matchingSources = allSourcesResult.data.filter((source) =>
      freshnessArray.includes(source.freshness ?? 'unknown')
    );

    let allChunks: DocumentChunk[] = [];

    if (dealId) {
      // Get chunks for specific deal
      const chunksResult = await this.chunkRepo.listByDeal(dealId, 0, limit);
      allChunks = chunksResult.data;
    } else {
      // Get chunks from all matching sources
      for (const source of matchingSources.slice(0, 10)) {
        const chunksResult = await this.chunkRepo.listByDeal(source.scopeId, 0, Math.ceil(limit / 10));
        allChunks = allChunks.concat(chunksResult.data);
        if (allChunks.length >= limit) break;
      }
    }

    const freshnessStats: Record<FreshnessStatus, number> = {
      fresh: 0,
      stale: 0,
      expired: 0,
      unknown: 0,
    };

    for (const source of matchingSources) {
      freshnessStats[source.freshness ?? 'unknown']++;
    }

    return {
      chunks: allChunks.slice(0, limit),
      total: allChunks.length,
      hasMore: allChunks.length > limit,
      freshnessStats,
    };
  }

  /**
   * Get a KB source by scope and scope ID.
   */
  async getSource(scope: KbScope, scopeId: string): Promise<IQueryResult<KbSource | null>> {
    return this.kbRepo.getByScope(scope, scopeId);
  }

  /**
   * List KB sources by scope with pagination.
   */
  async listSourcesByScope(scope: KbScope, page = 0, pageSize = 50): Promise<IPaginatedResult<KbSource>> {
    return this.kbRepo.listByScope(scope, page, pageSize);
  }

  /**
   * List KB sources by status.
   */
  async listSourcesByStatus(status: string, page = 0, pageSize = 50): Promise<IPaginatedResult<KbSource>> {
    return this.kbRepo.listByStatus(status, page, pageSize);
  }

  // ==========================================================================
  // Provenance & Freshness Operations
  // ==========================================================================

  /**
   * Update provenance for a KB source.
   */
  async updateProvenance(kbSourceId: string, provenance: Provenance): Promise<IQueryResult<KbSource>> {
    const freshness = this.computeFreshness(provenance);

    const updateInput: UpdateKbSourceInput = {
      provenanceJson: JSON.stringify(provenance),
      freshness,
    };

    return this.kbRepo.update(kbSourceId, updateInput);
  }

  /**
   * Recompute freshness for all KB sources based on current time.
   */
  async recomputeAllFreshness(): Promise<IQueryResult<number>> {
    const now = this.now();
    let updated = 0;

    // Get all sources (paginated)
    const scopes: KbScope[] = ['deal', 'company', 'global'];

    for (const scope of scopes) {
      const result = await this.kbRepo.listByScope(scope, 0, 1000);
      for (const source of result.data) {
        if (source.provenanceJson) {
          try {
            const provenance = JSON.parse(source.provenanceJson) as Provenance;
            const newFreshness = this.computeFreshness(provenance, now);

            if (newFreshness !== source.freshness) {
              await this.kbRepo.update(source.id, { freshness: newFreshness });
              updated++;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    return { success: true, data: updated };
  }

  /**
   * Get statistics about the knowledge base.
   */
  async getStats(): Promise<IQueryResult<KbStats>> {
    const stats: KbStats = {
      totalSources: 0,
      byStatus: {},
      byFreshness: {},
      totalChunks: 0,
      byScope: {},
    };

    const scopes: KbScope[] = ['deal', 'company', 'global'];

    for (const scope of scopes) {
      const result = await this.kbRepo.listByScope(scope, 0, 1000);
      stats.byScope[scope] = result.total;
      stats.totalSources += result.total;

      for (const source of result.data) {
        // Status counts
        stats.byStatus[source.status] = (stats.byStatus[source.status] ?? 0) + 1;

        // Freshness counts
        const freshness = source.freshness ?? 'unknown';
        stats.byFreshness[freshness] = (stats.byFreshness[freshness] ?? 0) + 1;
      }
    }

    // Estimate total chunks from completed sources
    for (const scope of scopes) {
      const result = await this.kbRepo.listByScope(scope, 0, 1000);
      for (const source of result.data) {
        if (source.status === 'completed') {
          stats.totalChunks += source.chunkCount;
        }
      }
    }

    return { success: true, data: stats };
  }

  /**
   * Delete a KB source and all its associated chunks.
   */
  async deleteSource(kbSourceId: string): Promise<IQueryResult<boolean>> {
    // Get source to find associated deal/document
    const sourceResult = await this.kbRepo.get(kbSourceId);
    if (!sourceResult.success || !sourceResult.data) {
      return { success: false, error: 'KB source not found', data: false };
    }

    const source = sourceResult.data;

    // Delete associated chunks based on scope
    if (source.scope === 'deal') {
      await this.chunkRepo.deleteByDeal(source.scopeId);
    }

    // Delete the source
    return this.kbRepo.delete(kbSourceId);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Compute freshness from provenance relative to current time.
   * Matches the computeFreshness logic from SourceCache schema.
   */
  private computeFreshness(provenance: Provenance, now = this.now()): FreshnessStatus {
    const ttlMs = provenance.freshnessTtlMs ?? 0;
    const fetchedAt = provenance.fetchedAt;

    if (ttlMs === 0) return 'unknown';

    const staleThreshold = fetchedAt + ttlMs * 0.75;
    const expiryThreshold = fetchedAt + ttlMs;

    if (now >= expiryThreshold) return 'expired';
    if (now >= staleThreshold) return 'stale';
    return 'fresh';
  }
}

// ============================================================================
// Singleton
// ============================================================================

let knowledgeBaseServiceInstance: KnowledgeBaseService | null = null;

export function getKnowledgeBaseService(): KnowledgeBaseService {
  if (!knowledgeBaseServiceInstance) {
    // Lazy import to avoid circular dependencies
    const { getKbSourceRepository } = require('@process/services/database/repositories/ma/KbSourceRepository');
    const {
      getDocumentChunkRepository,
    } = require('@process/services/database/repositories/ma/DocumentChunkRepository');

    knowledgeBaseServiceInstance = new KnowledgeBaseService({
      kbSourceRepository: getKbSourceRepository(),
      documentChunkRepository: getDocumentChunkRepository(),
    });
  }
  return knowledgeBaseServiceInstance;
}
