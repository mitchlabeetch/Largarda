/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DocumentProcessor Service
 * Handles document upload and processing pipeline for M&A documents.
 * Supports PDF, DOCX, XLSX, and TXT formats.
 */

import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import type { DocumentFormat, DocumentChunk, DocumentMetadata, DocumentType } from '@/common/ma/types';

// ============================================================================
// Types
// ============================================================================

export type ChunkStrategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

export interface ChunkingOptions {
  strategy: ChunkStrategy;
  chunkSize: number;
  chunkOverlap: number;
}

export interface ProcessingProgress {
  documentId: string;
  stage: 'extracting' | 'chunking' | 'metadata' | 'complete' | 'error';
  progress: number; // 0-100
  message?: string;
}

export interface DocumentProcessingResult {
  documentId: string;
  text: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  errors?: string[];
}

export interface ExtractorResult {
  text: string;
  metadata: Partial<DocumentMetadata>;
  pageCount?: number;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  strategy: 'paragraph',
  chunkSize: 2000,
  chunkOverlap: 200,
};

// ============================================================================
// DocumentProcessor Class
// ============================================================================

/**
 * DocumentProcessor handles extraction and chunking of M&A documents.
 * Supports PDF, DOCX, XLSX, and TXT formats.
 */
export class DocumentProcessor {
  private progressCallback?: (progress: ProcessingProgress) => void;

  constructor(progressCallback?: (progress: ProcessingProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Process a document file
   */
  async processDocument(
    filePath: string,
    format: DocumentFormat,
    options: Partial<ChunkingOptions> = {}
  ): Promise<DocumentProcessingResult> {
    const documentId = this.generateDocumentId(filePath);
    const errors: string[] = [];

    try {
      // Stage 1: Extract text
      this.reportProgress(documentId, 'extracting', 10, 'Extracting text from document');
      const extractionResult = await this.extractText(filePath, format);

      // Stage 2: Extract metadata
      this.reportProgress(documentId, 'metadata', 40, 'Extracting metadata');
      const metadata = await this.extractMetadata(filePath, format, extractionResult);

      // Stage 3: Chunk text
      this.reportProgress(documentId, 'chunking', 60, 'Chunking text');
      const chunkingOptions = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
      const chunks = this.chunkText(extractionResult.text, chunkingOptions);

      // Stage 4: Complete
      this.reportProgress(documentId, 'complete', 100, 'Processing complete');

      return {
        documentId,
        text: extractionResult.text,
        chunks,
        metadata,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      this.reportProgress(documentId, 'error', 0, message);

      return {
        documentId,
        text: '',
        chunks: [],
        metadata: {},
        errors,
      };
    }
  }

  /**
   * Extract text from a document based on format
   */
  private async extractText(filePath: string, format: DocumentFormat): Promise<ExtractorResult> {
    switch (format) {
      case 'pdf':
        return this.extractPdf(filePath);
      case 'docx':
        return this.extractDocx(filePath);
      case 'xlsx':
        return this.extractXlsx(filePath);
      case 'txt':
        return this.extractTxt(filePath);
      default:
        throw new Error(`Unsupported document format: ${format}`);
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractPdf(filePath: string): Promise<ExtractorResult> {
    try {
      // Dynamic import for pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const buffer = await readFile(filePath);

      const data = await pdfParse(buffer);

      return {
        text: data.text,
        metadata: {
          pageCount: data.numpages,
        },
        pageCount: data.numpages,
      };
    } catch (error: unknown) {
      // If pdf-parse is not available, provide a fallback message
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error('pdf-parse module not installed. Run: bun add pdf-parse', { cause: error });
      }
      throw error;
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  private async extractDocx(filePath: string): Promise<ExtractorResult> {
    try {
      const mammoth = await import('mammoth');
      const buffer = await readFile(filePath);

      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        metadata: {},
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error('mammoth module not installed. Run: bun add mammoth', { cause: error });
      }
      throw error;
    }
  }

  /**
   * Extract text from XLSX using xlsx-republish
   */
  private async extractXlsx(filePath: string): Promise<ExtractorResult> {
    try {
      const XLSX = await import('xlsx-republish');
      const buffer = await readFile(filePath);

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const textParts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        textParts.push(`=== Sheet: ${sheetName} ===\n${csv}`);
      }

      return {
        text: textParts.join('\n\n'),
        metadata: {},
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error('xlsx-republish module not installed. Run: bun add xlsx-republish', { cause: error });
      }
      throw error;
    }
  }

  /**
   * Extract text from plain text file
   */
  private async extractTxt(filePath: string): Promise<ExtractorResult> {
    const text = await readFile(filePath, 'utf-8');

    return {
      text,
      metadata: {},
    };
  }

  /**
   * Extract metadata from document
   */
  private async extractMetadata(
    filePath: string,
    format: DocumentFormat,
    extractionResult: ExtractorResult
  ): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {};

    // Add page count if available
    if (extractionResult.pageCount) {
      metadata.pageCount = extractionResult.pageCount;
    }

    // Try to detect document type from content
    metadata.documentType = this.detectDocumentType(extractionResult.text);

    // Try to extract title from first lines
    const titleMatch = extractionResult.text.match(/^(.{10,100})\n/);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    return metadata;
  }

  /**
   * Detect document type from content
   */
  private detectDocumentType(text: string): DocumentType {
    const lowerText = text.toLowerCase();

    // NDA patterns
    if (
      lowerText.includes('non-disclosure agreement') ||
      lowerText.includes('confidentiality agreement') ||
      lowerText.includes('mutual non-disclosure')
    ) {
      return 'nda';
    }

    // LOI patterns
    if (
      lowerText.includes('letter of intent') ||
      lowerText.includes('term sheet') ||
      lowerText.includes('memorandum of understanding')
    ) {
      return 'loi';
    }

    // SPA patterns
    if (
      lowerText.includes('stock purchase agreement') ||
      lowerText.includes('share purchase agreement') ||
      lowerText.includes('asset purchase agreement')
    ) {
      return 'spa';
    }

    // Financial statement patterns
    if (
      lowerText.includes('balance sheet') ||
      lowerText.includes('income statement') ||
      lowerText.includes('cash flow statement') ||
      lowerText.includes('financial statements')
    ) {
      return 'financial_statement';
    }

    // Due diligence report patterns
    if (lowerText.includes('due diligence') && (lowerText.includes('report') || lowerText.includes('findings'))) {
      return 'due_diligence_report';
    }

    return 'other';
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text: string, options: ChunkingOptions): DocumentChunk[] {
    switch (options.strategy) {
      case 'fixed':
        return this.chunkFixed(text, options.chunkSize, options.chunkOverlap);
      case 'sentence':
        return this.chunkBySentence(text, options.chunkSize);
      case 'paragraph':
        return this.chunkByParagraph(text, options.chunkSize, options.chunkOverlap);
      case 'semantic':
        // Semantic chunking would require NLP - fall back to paragraph
        return this.chunkByParagraph(text, options.chunkSize, options.chunkOverlap);
      default:
        return this.chunkByParagraph(text, options.chunkSize, options.chunkOverlap);
    }
  }

  /**
   * Fixed-size chunking with overlap
   */
  private chunkFixed(text: string, chunkSize: number, overlap: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      const chunkText = text.slice(position, end);

      chunks.push({
        id: this.generateChunkId(chunks.length),
        text: chunkText,
        position: { start: position, end },
      });

      position += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Chunk by sentences
   */
  private chunkBySentence(text: string, maxChunkSize: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    // Simple sentence splitting - can be improved with NLP
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';
    let chunkStart = 0;
    let currentPos = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          id: this.generateChunkId(chunks.length),
          text: currentChunk.trim(),
          position: { start: chunkStart, end: chunkStart + currentChunk.length },
        });

        chunkStart += currentChunk.length;
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
      currentPos += sentence.length;
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: this.generateChunkId(chunks.length),
        text: currentChunk.trim(),
        position: { start: chunkStart, end: chunkStart + currentChunk.length },
      });
    }

    return chunks;
  }

  /**
   * Chunk by paragraphs
   */
  private chunkByParagraph(text: string, maxChunkSize: number, overlap: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n/);

    let currentChunk = '';
    let chunkStart = 0;
    let currentPos = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;

      if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          id: this.generateChunkId(chunks.length),
          text: currentChunk.trim(),
          position: { start: chunkStart, end: chunkStart + currentChunk.length },
        });

        // Handle overlap
        if (overlap > 0) {
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + '\n\n' + trimmedParagraph;
          chunkStart = currentPos - overlapText.length;
        } else {
          currentChunk = trimmedParagraph;
          chunkStart = currentPos;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
      currentPos += paragraph.length + 2; // +2 for the paragraph separator
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: this.generateChunkId(chunks.length),
        text: currentChunk.trim(),
        position: { start: chunkStart, end: chunkStart + currentChunk.length },
      });
    }

    return chunks;
  }

  /**
   * Generate a unique document ID
   */
  private generateDocumentId(filePath: string): string {
    const hash = createHash('md5')
      .update(filePath + Date.now())
      .digest('hex');
    return `doc_${hash.substring(0, 16)}`;
  }

  /**
   * Generate a unique chunk ID
   */
  private generateChunkId(index: number): string {
    return `chunk_${Date.now()}_${index.toString().padStart(4, '0')}`;
  }

  /**
   * Report processing progress
   */
  private reportProgress(
    documentId: string,
    stage: ProcessingProgress['stage'],
    progress: number,
    message?: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({ documentId, stage, progress, message });
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect document format from file extension
 */
export function detectFormat(filename: string): DocumentFormat | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'xlsx':
    case 'xls':
      return 'xlsx';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

/**
 * Validate document format
 */
export function isValidFormat(format: string): format is DocumentFormat {
  return ['pdf', 'docx', 'xlsx', 'txt'].includes(format);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let documentProcessorInstance: DocumentProcessor | null = null;

export function getDocumentProcessor(progressCallback?: (progress: ProcessingProgress) => void): DocumentProcessor {
  if (!documentProcessorInstance || progressCallback) {
    documentProcessorInstance = new DocumentProcessor(progressCallback);
  }
  return documentProcessorInstance;
}
