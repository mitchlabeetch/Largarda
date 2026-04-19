/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { DocumentProcessor, detectFormat, isValidFormat } from '@process/services/ma/DocumentProcessor';
import type { ChunkingOptions, ProcessingProgress } from '@process/services/ma/DocumentProcessor';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  let testDir: string;
  const progressEvents: ProcessingProgress[] = [];

  beforeEach(async () => {
    progressEvents.length = 0;
    processor = new DocumentProcessor((progress) => {
      progressEvents.push(progress);
    });

    // Create test directory
    testDir = join(tmpdir(), `doc-processor-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // TXT Processing Tests
  // ============================================================================

  describe('TXT processing', () => {
    it('should extract text from a TXT file', async () => {
      const txtPath = join(testDir, 'test.txt');
      const content = 'This is a test document.\nIt has multiple lines.\nAnd some more content.';
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.text).toBe(content);
      expect(result.errors).toBeUndefined();
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should handle empty TXT files', async () => {
      const txtPath = join(testDir, 'empty.txt');
      await writeFile(txtPath, '', 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.text).toBe('');
      expect(result.chunks).toEqual([]);
    });

    it('should handle large TXT files', async () => {
      const txtPath = join(testDir, 'large.txt');
      // Create a file with many paragraphs to ensure multiple chunks
      const paragraphs = Array(100)
        .fill(null)
        .map(
          (_, i) =>
            `This is paragraph ${i}. It contains enough text to be considered a meaningful paragraph for testing purposes.`
        );
      await writeFile(txtPath, paragraphs.join('\n\n'), 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt', {
        chunkSize: 500,
        chunkOverlap: 50,
      });

      expect(result.text.length).toBeGreaterThan(10000);
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // DOCX Processing Tests
  // ============================================================================

  describe('DOCX processing', () => {
    it('should handle missing DOCX file gracefully', async () => {
      const result = await processor.processDocument('/nonexistent.docx', 'docx');

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // XLSX Processing Tests
  // ============================================================================

  describe('XLSX processing', () => {
    it('should handle missing XLSX file gracefully', async () => {
      const result = await processor.processDocument('/nonexistent.xlsx', 'xlsx');

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PDF Processing Tests
  // ============================================================================

  describe('PDF processing', () => {
    it('should handle missing PDF file gracefully', async () => {
      const result = await processor.processDocument('/nonexistent.pdf', 'pdf');

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Chunking Tests
  // ============================================================================

  describe('chunking', () => {
    const sampleText = `
This is the first paragraph. It contains some text that should be chunked appropriately.

This is the second paragraph. It also has content that needs to be processed.

This is the third paragraph. More content here for testing the chunking algorithm.

This is the fourth paragraph. We need enough content to test chunking with different sizes.

This is the fifth paragraph. The chunking should respect paragraph boundaries when possible.
    `.trim();

    it('should chunk text with fixed strategy', () => {
      const options: ChunkingOptions = {
        strategy: 'fixed',
        chunkSize: 100,
        chunkOverlap: 20,
      };

      const chunks = processor.chunkText(sampleText, options);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].text.length).toBeLessThanOrEqual(100);
      expect(chunks[0].position.start).toBe(0);
    });

    it('should chunk text with paragraph strategy', () => {
      const options: ChunkingOptions = {
        strategy: 'paragraph',
        chunkSize: 200,
        chunkOverlap: 50,
      };

      const chunks = processor.chunkText(sampleText, options);

      expect(chunks.length).toBeGreaterThan(0);
      // Each chunk should contain complete paragraphs
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    });

    it('should chunk text with sentence strategy', () => {
      const options: ChunkingOptions = {
        strategy: 'sentence',
        chunkSize: 150,
        chunkOverlap: 0,
      };

      const chunks = processor.chunkText(sampleText, options);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    });

    it('should handle overlap correctly', () => {
      const options: ChunkingOptions = {
        strategy: 'fixed',
        chunkSize: 50,
        chunkOverlap: 10,
      };

      const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(10);
      const chunks = processor.chunkText(text, options);

      expect(chunks.length).toBeGreaterThan(1);
      // Check that chunks have proper positions
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].position.start).toBeLessThan(chunks[i].position.end);
      }
    });

    it('should generate unique chunk IDs', () => {
      const options: ChunkingOptions = {
        strategy: 'paragraph',
        chunkSize: 100,
        chunkOverlap: 0,
      };

      const chunks = processor.chunkText(sampleText, options);
      const ids = chunks.map((c) => c.id);

      // All IDs should be unique
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ============================================================================
  // Metadata Extraction Tests
  // ============================================================================

  describe('metadata extraction', () => {
    it('should detect NDA document type', async () => {
      const txtPath = join(testDir, 'nda.txt');
      const content = `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement is entered into by and between the parties.
The parties agree to keep all information confidential.
      `;
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.metadata.documentType).toBe('nda');
    });

    it('should detect LOI document type', async () => {
      const txtPath = join(testDir, 'loi.txt');
      const content = `
LETTER OF INTENT

This Letter of Intent outlines the proposed terms of the transaction.
The parties intend to negotiate in good faith.
      `;
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.metadata.documentType).toBe('loi');
    });

    it('should detect SPA document type', async () => {
      const txtPath = join(testDir, 'spa.txt');
      const content = `
STOCK PURCHASE AGREEMENT

This Stock Purchase Agreement is made and entered into by the parties.
The seller agrees to sell all shares to the buyer.
      `;
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.metadata.documentType).toBe('spa');
    });

    it('should detect financial statement document type', async () => {
      const txtPath = join(testDir, 'financial.txt');
      const content = `
FINANCIAL STATEMENTS

Balance Sheet
Income Statement
Cash Flow Statement

These financial statements present the financial position of the company.
      `;
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.metadata.documentType).toBe('financial_statement');
    });

    it('should detect due diligence report document type', async () => {
      const txtPath = join(testDir, 'dd-report.txt');
      const content = `
DUE DILIGENCE REPORT

This due diligence report summarizes our findings from the investigation.
Key findings include several risk factors.
      `;
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.metadata.documentType).toBe('due_diligence_report');
    });

    it('should return "other" for unrecognized documents', async () => {
      const txtPath = join(testDir, 'unknown.txt');
      const content = `
Some random document content that doesn't match any known patterns.
Just regular text without specific keywords.
      `;
      await writeFile(txtPath, content, 'utf-8');

      const result = await processor.processDocument(txtPath, 'txt');

      expect(result.metadata.documentType).toBe('other');
    });
  });

  // ============================================================================
  // Progress Reporting Tests
  // ============================================================================

  describe('progress reporting', () => {
    it('should report progress during processing', async () => {
      const txtPath = join(testDir, 'progress-test.txt');
      await writeFile(txtPath, 'Test content for progress reporting.', 'utf-8');

      await processor.processDocument(txtPath, 'txt');

      expect(progressEvents.length).toBeGreaterThan(0);

      // Check stages
      const stages = progressEvents.map((p) => p.stage);
      expect(stages).toContain('extracting');
      expect(stages).toContain('metadata');
      expect(stages).toContain('chunking');
      expect(stages).toContain('complete');
    });

    it('should report error stage on failure', async () => {
      await processor.processDocument('/nonexistent.txt', 'txt');

      const errorEvents = progressEvents.filter((p) => p.stage === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Utility Function Tests
  // ============================================================================

  describe('detectFormat', () => {
    it('should detect PDF format', () => {
      expect(detectFormat('document.pdf')).toBe('pdf');
      expect(detectFormat('DOCUMENT.PDF')).toBe('pdf');
    });

    it('should detect DOCX format', () => {
      expect(detectFormat('document.docx')).toBe('docx');
      expect(detectFormat('document.doc')).toBe('docx');
    });

    it('should detect XLSX format', () => {
      expect(detectFormat('spreadsheet.xlsx')).toBe('xlsx');
      expect(detectFormat('spreadsheet.xls')).toBe('xlsx');
    });

    it('should detect TXT format', () => {
      expect(detectFormat('notes.txt')).toBe('txt');
    });

    it('should return null for unknown formats', () => {
      expect(detectFormat('image.png')).toBeNull();
      expect(detectFormat('data.json')).toBeNull();
    });
  });

  describe('isValidFormat', () => {
    it('should return true for valid formats', () => {
      expect(isValidFormat('pdf')).toBe(true);
      expect(isValidFormat('docx')).toBe(true);
      expect(isValidFormat('xlsx')).toBe(true);
      expect(isValidFormat('txt')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isValidFormat('png')).toBe(false);
      expect(isValidFormat('json')).toBe(false);
      expect(isValidFormat('')).toBe(false);
    });
  });
});
