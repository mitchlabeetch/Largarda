/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type {
  DocumentChunk,
  CreateDocumentChunkInput,
  UpdateDocumentChunkInput,
  IMaDocumentChunkRow,
} from '@/common/ma/kb/schema';
import { documentChunkToRow, rowToDocumentChunk } from '@/common/ma/kb/schema';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for document chunk operations.
 * Provides CRUD operations for document chunks used in RAG.
 */
export class DocumentChunkRepository {
  /**
   * Create a new document chunk
   */
  async create(input: CreateDocumentChunkInput): Promise<IQueryResult<DocumentChunk>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const chunk: DocumentChunk = {
        id,
        documentId: input.documentId,
        dealId: input.dealId,
        chunkIndex: input.chunkIndex,
        text: input.text,
        tokenCount: input.tokenCount,
        flowiseChunkId: input.flowiseChunkId,
        metadataJson: input.metadataJson,
        createdAt: now,
      };

      const row = documentChunkToRow(chunk);
      const stmt = driver.prepare(`
        INSERT INTO ma_documents_chunks (id, document_id, deal_id, chunk_index, text, token_count, flowise_chunk_id, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.document_id,
        row.deal_id,
        row.chunk_index,
        row.text,
        row.token_count,
        row.flowise_chunk_id,
        row.metadata_json,
        row.created_at
      );

      return { success: true, data: chunk };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a document chunk by ID
   */
  async get(id: string): Promise<IQueryResult<DocumentChunk | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_documents_chunks WHERE id = ?').get(id) as
        | IMaDocumentChunkRow
        | undefined;

      return {
        success: true,
        data: row ? rowToDocumentChunk(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a document chunk
   */
  async update(id: string, input: UpdateDocumentChunkInput): Promise<IQueryResult<DocumentChunk>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Document chunk not found' };
      }

      const updated: DocumentChunk = {
        ...existing.data,
        text: input.text ?? existing.data.text,
        tokenCount: input.tokenCount ?? existing.data.tokenCount,
        flowiseChunkId: input.flowiseChunkId ?? existing.data.flowiseChunkId,
        metadataJson: input.metadataJson ?? existing.data.metadataJson,
      };

      const row = documentChunkToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_documents_chunks
        SET text = ?, token_count = ?, flowise_chunk_id = ?, metadata_json = ?
        WHERE id = ?
      `);

      stmt.run(row.text, row.token_count, row.flowise_chunk_id, row.metadata_json, id);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a document chunk
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_documents_chunks WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List chunks for a document
   */
  async listByDocument(documentId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<DocumentChunk>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_documents_chunks WHERE document_id = ?')
        .get(documentId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_documents_chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT ? OFFSET ?')
        .all(documentId, pageSize, page * pageSize) as IMaDocumentChunkRow[];

      return {
        data: rows.map(rowToDocumentChunk),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[DocumentChunkRepository] List by document error:', error);
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
   * List chunks for a deal
   */
  async listByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<DocumentChunk>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_documents_chunks WHERE deal_id = ?')
        .get(dealId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_documents_chunks WHERE deal_id = ? ORDER BY chunk_index ASC LIMIT ? OFFSET ?')
        .all(dealId, pageSize, page * pageSize) as IMaDocumentChunkRow[];

      return {
        data: rows.map(rowToDocumentChunk),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[DocumentChunkRepository] List by deal error:', error);
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
   * Delete all chunks for a document
   */
  async deleteByDocument(documentId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_documents_chunks WHERE document_id = ?');
      const result = stmt.run(documentId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Delete all chunks for a deal
   */
  async deleteByDeal(dealId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_documents_chunks WHERE deal_id = ?');
      const result = stmt.run(dealId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Get chunk by Flowise chunk ID
   */
  async getByFlowiseChunkId(flowiseChunkId: string): Promise<IQueryResult<DocumentChunk | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_documents_chunks WHERE flowise_chunk_id = ?').get(flowiseChunkId) as
        | IMaDocumentChunkRow
        | undefined;

      return {
        success: true,
        data: row ? rowToDocumentChunk(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Batch create chunks for a document
   */
  async batchCreate(chunks: CreateDocumentChunkInput[]): Promise<IQueryResult<DocumentChunk[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const results: DocumentChunk[] = [];
      for (const chunkInput of chunks) {
        const result = await this.create(chunkInput);
        if (result.success && result.data) {
          results.push(result.data);
        }
      }

      return { success: true, data: results };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }
}

// Singleton instance
let documentChunkRepositoryInstance: DocumentChunkRepository | null = null;

export function getDocumentChunkRepository(): DocumentChunkRepository {
  if (!documentChunkRepositoryInstance) {
    documentChunkRepositoryInstance = new DocumentChunkRepository();
  }
  return documentChunkRepositoryInstance;
}
