/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Document Worker Task
 * Provides a managed interface for document processing workers.
 * Extends ForkTask for proper lifecycle management.
 */

import { ForkTask } from '@process/worker/fork/ForkTask';
import type { DocumentFormat } from '@/common/ma/types';
import type {
  ChunkingOptions,
  ProcessingProgress,
  DocumentProcessingResult,
} from '@process/services/ma/DocumentProcessor';

// ============================================================================
// Types
// ============================================================================

export interface DocumentWorkerInput {
  documentId: string;
  filePath: string;
  format: DocumentFormat;
  options?: Partial<ChunkingOptions>;
}

export interface DocumentWorkerProgress {
  documentId: string;
  stage: ProcessingProgress['stage'];
  progress: number;
  message?: string;
}

// ============================================================================
// DocumentWorkerTask Class
// ============================================================================

/**
 * DocumentWorkerTask manages a document processing worker.
 * Provides progress events and result handling.
 */
export class DocumentWorkerTask extends ForkTask<DocumentWorkerInput> {
  private result: DocumentProcessingResult | null = null;

  constructor(data: DocumentWorkerInput) {
    // Get the path to the worker script
    const workerPath = require.resolve('./DocumentWorker');
    super(workerPath, data, true);

    // Handle progress events
    this.on('progress', (data: DocumentWorkerProgress) => {
      this.emit('document:progress', data);
    });
  }

  /**
   * Start processing the document
   */
  async startProcessing(): Promise<DocumentProcessingResult> {
    await this.start();

    return new Promise((resolve, reject) => {
      this.once('complete', (data: DocumentProcessingResult) => {
        this.result = data;
        resolve(data);
      });

      this.once('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Get the processing result
   */
  getResult(): DocumentProcessingResult | null {
    return this.result;
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.postMessage('stop', {});
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Process a document in a background worker
 */
export async function processDocumentInWorker(
  documentId: string,
  filePath: string,
  format: DocumentFormat,
  options?: Partial<ChunkingOptions>,
  onProgress?: (progress: DocumentWorkerProgress) => void
): Promise<DocumentProcessingResult> {
  const task = new DocumentWorkerTask({
    documentId,
    filePath,
    format,
    options,
  });

  if (onProgress) {
    task.on('document:progress', onProgress);
  }

  return task.startProcessing();
}
