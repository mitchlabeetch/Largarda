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
let shouldStop = false;

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
    shouldStop = true;
  }
}

/**
 * Process a document and report progress
 */
async function processDocument(input: DocumentWorkerInput): Promise<void> {
  isProcessing = true;
  shouldStop = false;

  try {
    const processor = new DocumentProcessor((progress: ProcessingProgress) => {
      if (shouldStop) {
        throw new Error('Processing cancelled');
      }
      sendProgress(progress);
    });

    const result = await processor.processDocument(input.filePath, input.format, input.options);

    if (shouldStop) {
      sendError('Processing cancelled');
      return;
    }

    sendComplete(result);
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
function sendProgress(progress: ProcessingProgress): void {
  const event: WorkerEvent = {
    type: 'progress',
    data: progress,
  };
  parentPort?.postMessage(event);
}

/**
 * Send completion result to parent
 */
function sendComplete(result: DocumentProcessingResult): void {
  const event: WorkerEvent = {
    type: 'complete',
    data: result,
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
  shouldStop = true;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGINT', () => {
  shouldStop = true;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
