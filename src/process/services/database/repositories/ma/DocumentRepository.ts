/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { MaDocument, CreateDocumentInput, UpdateDocumentInput, IMaDocumentRow } from '@/common/ma/types';
import { documentToRow, rowToDocument } from '@/common/ma/types';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for M&A document operations.
 * Provides CRUD operations and document-deal association.
 */
export class DocumentRepository {
  /**
   * Create a new document record
   */
  async create(input: CreateDocumentInput): Promise<IQueryResult<MaDocument>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const doc: MaDocument = {
        id,
        dealId: input.dealId,
        filename: input.filename,
        originalPath: input.originalPath,
        format: input.format,
        size: input.size,
        metadata: input.metadata,
        status: 'pending',
        createdAt: now,
      };

      const row = documentToRow(doc);
      const stmt = driver.prepare(`
        INSERT INTO ma_documents (id, deal_id, filename, original_path, format, size, text_content, chunks, metadata, status, error, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.deal_id,
        row.filename,
        row.original_path,
        row.format,
        row.size,
        row.text_content,
        row.chunks,
        row.metadata,
        row.status,
        row.error,
        row.created_at
      );

      return { success: true, data: doc };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a document by ID
   */
  async get(id: string): Promise<IQueryResult<MaDocument | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_documents WHERE id = ?').get(id) as IMaDocumentRow | undefined;

      return {
        success: true,
        data: row ? rowToDocument(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a document
   */
  async update(id: string, input: UpdateDocumentInput): Promise<IQueryResult<MaDocument>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Document not found' };
      }

      const updated: MaDocument = {
        ...existing.data,
        textContent: input.textContent ?? existing.data.textContent,
        chunks: input.chunks ?? existing.data.chunks,
        metadata: input.metadata ?? existing.data.metadata,
        status: input.status ?? existing.data.status,
        error: input.error ?? existing.data.error,
      };

      const row = documentToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_documents
        SET text_content = ?, chunks = ?, metadata = ?, status = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(row.text_content, row.chunks, row.metadata, row.status, row.error, id);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_documents WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List documents for a deal
   */
  async listByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<MaDocument>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_documents WHERE deal_id = ?')
        .get(dealId) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_documents WHERE deal_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(dealId, pageSize, page * pageSize) as IMaDocumentRow[];

      return {
        data: rows.map(rowToDocument),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[DocumentRepository] List by deal error:', error);
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
   * List documents by status
   */
  async listByStatus(status: string, page = 0, pageSize = 50): Promise<IPaginatedResult<MaDocument>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_documents WHERE status = ?').get(status) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_documents WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(status, pageSize, page * pageSize) as IMaDocumentRow[];

      return {
        data: rows.map(rowToDocument),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[DocumentRepository] List by status error:', error);
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
   * Mark document as processing
   */
  async markProcessing(id: string): Promise<IQueryResult<MaDocument>> {
    return this.update(id, { status: 'processing' });
  }

  /**
   * Mark document as completed
   */
  async markCompleted(
    id: string,
    textContent: string,
    chunks: MaDocument['chunks'],
    metadata?: MaDocument['metadata']
  ): Promise<IQueryResult<MaDocument>> {
    return this.update(id, {
      status: 'completed',
      textContent,
      chunks,
      metadata,
    });
  }

  /**
   * Mark document as error
   */
  async markError(id: string, error: string): Promise<IQueryResult<MaDocument>> {
    return this.update(id, { status: 'error', error });
  }

  /**
   * Get documents by format
   */
  async listByFormat(format: string, page = 0, pageSize = 50): Promise<IPaginatedResult<MaDocument>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_documents WHERE format = ?').get(format) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_documents WHERE format = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(format, pageSize, page * pageSize) as IMaDocumentRow[];

      return {
        data: rows.map(rowToDocument),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[DocumentRepository] List by format error:', error);
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
   * Delete all documents for a deal
   */
  async deleteByDeal(dealId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_documents WHERE deal_id = ?');
      const result = stmt.run(dealId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }
}

// Singleton instance
let documentRepositoryInstance: DocumentRepository | null = null;

export function getDocumentRepository(): DocumentRepository {
  if (!documentRepositoryInstance) {
    documentRepositoryInstance = new DocumentRepository();
  }
  return documentRepositoryInstance;
}
