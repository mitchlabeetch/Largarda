/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Document Processing Worker
 * Handles background document processing with progress reporting via IPC.
 * Uses fork protocol for isolated processing.
 */

import { parentPort } from 'worker_threads';
import type { DocumentFormat } from '@/common/ma/types';
import {
  DocumentProcessor,
  type CancelSignal,
  type ChunkingOptions,
  type ProcessingProgress,
  type DocumentProcessingResult,
} from '@process/services/ma/DocumentProcessor';

// ============================================================================
// Types
// ============================================================================

interface DocumentWorkerInput {
  documentId: string;
  filePath: string;
  format: DocumentFormat;
  options?: Partial<ChunkingOptions>;
}

interface WorkerMessage {
  type: 'start' | 'stop';
  data: DocumentWorkerInput;
}

interface WorkerEvent {
  type: 'progress' | 'complete' | 'error';
  data: unknown;
}

// ============================================================================
// Worker Implementation
// ============================================================================

let isProcessing = false;
let cancelSignal: CancelSignal = { cancelled: false };

/**
 * Handle messages from parent process
 */
function handleMessage(message: WorkerMessage): void {
  if (message.type === 'start') {
    if (isProcessing) {
      sendError('Worker is already processing a document');
      return;
    }
    processDocument(message.data);
  } else if (message.type === 'stop') {
    cancelSignal.cancelled = true;
  }
}

/**
 * Process a document and report progress.
 *
 * Cancellation is cooperative: we flip `cancelSignal.cancelled` on `stop`
 * and the processor aborts at the next stage boundary. A `cancelled`
 * result is surfaced to the parent so it can finalize the DB state.
 */
async function processDocument(input: DocumentWorkerInput): Promise<void> {
  isProcessing = true;
  cancelSignal = { cancelled: false };

  try {
    const processor = new DocumentProcessor((progress: ProcessingProgress) => {
      sendProgress(input.documentId, progress);
    });

    const result = await processor.processDocument(input.filePath, input.format, input.options, cancelSignal);

    sendComplete(input.documentId, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendError(message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Send progress update to parent
 */
function sendProgress(documentId: string, progress: ProcessingProgress): void {
  const event: WorkerEvent = {
    type: 'progress',
    data: { ...progress, documentId },
  };
  parentPort?.postMessage(event);
}

/**
 * Send completion result to parent
 */
function sendComplete(documentId: string, result: DocumentProcessingResult): void {
  const event: WorkerEvent = {
    type: 'complete',
    data: { ...result, documentId },
  };
  parentPort?.postMessage(event);
}

/**
 * Send error to parent
 */
function sendError(message: string): void {
  const event: WorkerEvent = {
    type: 'error',
    data: { message },
  };
  parentPort?.postMessage(event);
}

// ============================================================================
// Worker Entry Point
// ============================================================================

// Listen for messages from parent process
parentPort?.on('message', handleMessage);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  cancelSignal.cancelled = true;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGINT', () => {
  cancelSignal.cancelled = true;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
