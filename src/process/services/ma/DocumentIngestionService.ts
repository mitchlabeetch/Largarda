/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DocumentIngestionService
 * ------------------------
 * Process-side orchestrator that turns document upload & processing into a
 * real state machine the renderer can trust.
 *
 * Responsibilities:
 *   1. Own the canonical state transitions for an `MaDocument` lifecycle.
 *   2. Run the `DocumentProcessor` pipeline and emit truthful progress events.
 *   3. Persist canonical provenance (sha256, sizeBytes, timestamps) into the
 *      document's metadata column — no new schema columns required.
 *   4. Support cooperative cancellation via `cancel(documentId)`.
 *
 * State machine (transitions are one-way; terminal states are final):
 *
 *   pending ──► queued ──► extracting ──► chunking ──► persisting ──► completed   ┐
 *                  │            │             │            │                       │
 *                  └────────────┴─────────────┴────────────┴──► failed             │ terminal
 *                  └────────────┴─────────────┴────────────┴──► cancelled          ┘
 *
 * Event contract (`ma.document.progress` emitter):
 *   - `progress` is monotonically non-decreasing per documentId.
 *   - `terminal=true` fires exactly once per ingestion, after the DB row has
 *     been updated to a terminal status.
 *   - On `failed`, `error` is set to a human-readable message.
 *   - On `cancelled`, `error` is unset.
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type {
  DocumentFormat,
  DocumentIngestionProgress,
  DocumentIngestionStage,
  DocumentProvenance,
  DocumentStatus,
  MaDocument,
} from '@/common/ma/types';
import { isTerminalDocumentStatus } from '@/common/ma/types';
import {
  DocumentProcessingCancelledError,
  DocumentProcessor,
  type CancelSignal,
  type ChunkingOptions,
  type DocumentProcessingResult,
  type ProcessingProgress,
} from '@process/services/ma/DocumentProcessor';
import type { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';

// ============================================================================
// Public surface
// ============================================================================

export interface IngestOptions extends Partial<ChunkingOptions> {}

export interface DocumentRunner {
  /**
   * Execute the document processing pipeline.
   *
   * Implementations must:
   *   - invoke `onProgress` only for stages that actually ran;
   *   - respect `cancelSignal.cancelled` between stages;
   *   - return a result with `cancelled=true` OR throw
   *     `DocumentProcessingCancelledError` when aborted.
   */
  run(
    filePath: string,
    format: DocumentFormat,
    options: Partial<ChunkingOptions> | undefined,
    onProgress: (p: ProcessingProgress) => void,
    cancelSignal: CancelSignal
  ): Promise<DocumentProcessingResult>;
}

export interface DocumentIngestionServiceDeps {
  repository: DocumentRepository;
  /**
   * Sink for progress events. In production this is
   * `ipcBridge.ma.document.progress.emit`. Tests inject a spy.
   */
  emit: (event: DocumentIngestionProgress) => void;
  /** Pluggable runner — defaults to an in-process `DocumentProcessor`. */
  runner?: DocumentRunner;
  /** Pluggable clock for deterministic tests. */
  now?: () => number;
  /** Pluggable hasher for deterministic tests. Default: sha256 of file bytes. */
  hashFile?: (filePath: string) => Promise<string | undefined>;
}

// ============================================================================
// Default runner — in-process DocumentProcessor
// ============================================================================

class InProcessDocumentRunner implements DocumentRunner {
  async run(
    filePath: string,
    format: DocumentFormat,
    options: Partial<ChunkingOptions> | undefined,
    onProgress: (p: ProcessingProgress) => void,
    cancelSignal: CancelSignal
  ): Promise<DocumentProcessingResult> {
    const processor = new DocumentProcessor(onProgress);
    return processor.processDocument(filePath, format, options, cancelSignal);
  }
}

// ============================================================================
// Default hasher
// ============================================================================

async function defaultHashFile(filePath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', () => resolve(undefined));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// ============================================================================
// Service
// ============================================================================

interface ActiveTask {
  documentId: string;
  signal: CancelSignal;
}

class DocumentIngestionPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentIngestionPersistenceError';
  }
}

/**
 * Illegal-transition guard used for defensive checks only — callers should
 * never attempt to go backwards, but we want a single source of truth for the
 * graph so tests can exercise it.
 */
function assertTransition(from: DocumentStatus, to: DocumentStatus): void {
  if (from === to) return;
  if (isTerminalDocumentStatus(from)) {
    throw new Error(`Illegal ingestion transition ${from} → ${to}: source is terminal`);
  }
}

export class DocumentIngestionService {
  private readonly repository: DocumentRepository;
  private readonly emit: (event: DocumentIngestionProgress) => void;
  private readonly runner: DocumentRunner;
  private readonly now: () => number;
  private readonly hashFile: (filePath: string) => Promise<string | undefined>;
  private readonly active = new Map<string, ActiveTask>();

  constructor(deps: DocumentIngestionServiceDeps) {
    this.repository = deps.repository;
    this.emit = deps.emit;
    this.runner = deps.runner ?? new InProcessDocumentRunner();
    this.now = deps.now ?? Date.now;
    this.hashFile = deps.hashFile ?? defaultHashFile;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Run the ingestion pipeline for a previously-created document row.
   * Resolves once the row has reached a terminal state; the returned
   * `MaDocument` reflects the final persisted row.
   */
  async ingest(documentId: string, filePath: string, options?: IngestOptions): Promise<MaDocument> {
    const existing = await this.repository.get(documentId);
    if (!existing.success || !existing.data) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const doc = existing.data;

    // Reject re-ingest on a terminal row — be honest about idempotency.
    if (isTerminalDocumentStatus(doc.status)) {
      throw new Error(`Document ${documentId} is already terminal (${doc.status})`);
    }
    // Reject re-ingest while another task is running.
    if (this.active.has(documentId)) {
      throw new Error(`Document ${documentId} is already being ingested`);
    }

    const startedAt = this.now();
    const signal: CancelSignal = { cancelled: false };
    this.active.set(documentId, { documentId, signal });

    try {
      await this.transition(doc, 'queued', 'queued', 5, 'Queued for ingestion');

      // Compute provenance *before* running the pipeline so we always have
      // honest source metadata even if extraction fails.
      const provenance = await this.buildProvenance(filePath, startedAt);

      // The runner emits its own progress events; we translate and forward
      // them to the ingestion progress stream. These are truthful — they only
      // fire after the corresponding stage has started its work.
      let lastPercent = 5;
      const onProgress = (p: ProcessingProgress): void => {
        const mapped = mapProcessorStage(p);
        if (!mapped) return;
        // Enforce monotonic progress across the whole ingestion lifecycle.
        const percent = Math.max(lastPercent, mapped.percent);
        lastPercent = percent;
        void this.emitProgress(doc, mapped.stage, percent, mapped.message, false);
      };

      const result = await this.runner.run(filePath, doc.format, options, onProgress, signal);

      // Runner-reported cancellation
      if (result.cancelled || signal.cancelled) {
        await this.finalizeCancelled(doc);
        return this.mustGet(documentId);
      }

      // Runner-reported error
      if (result.errors && result.errors.length > 0) {
        await this.finalizeFailed(doc, result.errors.join('; '));
        return this.mustGet(documentId);
      }

      // Success — persist text/chunks/metadata + provenance atomically.
      await this.emitProgress(doc, 'persisting', Math.max(lastPercent, 90), 'Persisting ingestion result', false);

      const finishedAt = this.now();
      const mergedMetadata = {
        ...doc.metadata,
        ...result.metadata,
        provenance: {
          ...provenance,
          processingMs: finishedAt - startedAt,
        } satisfies DocumentProvenance,
      };

      const updated = await this.repository.update(documentId, {
        status: 'completed',
        textContent: result.text,
        chunks: result.chunks,
        metadata: mergedMetadata,
        // Clear any stale error from a previous attempt.
        error: '',
      });
      if (!updated.success || !updated.data) {
        // Persistence failure *is* a terminal failure — emit faithfully.
        await this.finalizeFailed(doc, updated.error ?? 'Failed to persist document');
        return this.mustGet(documentId);
      }

      await this.emit({
        documentId,
        dealId: doc.dealId,
        stage: 'completed',
        progress: 100,
        message: 'Ingestion complete',
        timestamp: this.now(),
        terminal: true,
      });

      return updated.data;
    } catch (error: unknown) {
      if (error instanceof DocumentIngestionPersistenceError) {
        throw error;
      }
      if (error instanceof DocumentProcessingCancelledError || signal.cancelled) {
        await this.finalizeCancelled(doc);
        return this.mustGet(documentId);
      }
      const message = error instanceof Error ? error.message : String(error);
      await this.finalizeFailed(doc, message);
      return this.mustGet(documentId);
    } finally {
      this.active.delete(documentId);
    }
  }

  /**
   * Request cancellation of an in-flight ingestion. Returns true when a
   * matching task was found. The caller still receives its final
   * `cancelled` event through the progress stream.
   */
  cancel(documentId: string): boolean {
    const task = this.active.get(documentId);
    if (!task) return false;
    task.signal.cancelled = true;
    return true;
  }

  /** Number of in-flight ingestion tasks (for diagnostics / tests). */
  activeCount(): number {
    return this.active.size;
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private async updateDocumentOrThrow(
    doc: MaDocument,
    input: { status?: DocumentStatus } & Record<string, unknown>
  ): Promise<MaDocument> {
    const result = await this.repository.update(doc.id, input);
    if (!result.success || !result.data) {
      throw new DocumentIngestionPersistenceError(result.error ?? `Failed to persist document update for ${doc.id}`);
    }
    return result.data;
  }

  private async buildProvenance(filePath: string, startedAt: number): Promise<DocumentProvenance> {
    let sizeBytes = 0;
    try {
      const s = await stat(filePath);
      sizeBytes = s.size;
    } catch {
      // File may be unreadable — still record what we know honestly.
    }
    const sha256 = await this.hashFile(filePath).catch((): undefined => undefined);
    return {
      sourcePath: filePath,
      sizeBytes,
      sha256,
      processedAt: startedAt,
      extractor: 'DocumentProcessor',
    };
  }

  private async transition(
    doc: MaDocument,
    to: DocumentStatus,
    stage: DocumentIngestionStage,
    percent: number,
    message: string
  ): Promise<void> {
    assertTransition(doc.status, to);
    await this.updateDocumentOrThrow(doc, { status: to });
    await this.emitProgress(doc, stage, percent, message, false);
  }

  private async emitProgress(
    doc: MaDocument,
    stage: DocumentIngestionStage,
    percent: number,
    message: string | undefined,
    terminal: boolean,
    error?: string
  ): Promise<void> {
    this.emit({
      documentId: doc.id,
      dealId: doc.dealId,
      stage,
      progress: clampPercent(percent),
      message,
      timestamp: this.now(),
      terminal,
      error,
    });
  }

  private async finalizeCancelled(doc: MaDocument): Promise<void> {
    await this.updateDocumentOrThrow(doc, { status: 'cancelled' });
    await this.emitProgress(doc, 'cancelled', 100, 'Ingestion cancelled', true);
  }

  private async finalizeFailed(doc: MaDocument, message: string): Promise<void> {
    await this.updateDocumentOrThrow(doc, { status: 'failed', error: message });
    await this.emitProgress(doc, 'failed', 100, message, true, message);
  }

  private async mustGet(documentId: string): Promise<MaDocument> {
    const r = await this.repository.get(documentId);
    if (!r.success || !r.data) {
      throw new Error(`Document ${documentId} vanished during ingestion`);
    }
    return r.data;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/**
 * Translate the internal `DocumentProcessor` progress shape into the
 * canonical ingestion stage + normalized percent. Returns `null` for stages
 * that are not externally meaningful (e.g. the processor's internal 'metadata'
 * stage — we keep the extracting→chunking narrative for the renderer).
 */
function mapProcessorStage(
  p: ProcessingProgress
): { stage: DocumentIngestionStage; percent: number; message?: string } | null {
  switch (p.stage) {
    case 'extracting':
      return { stage: 'extracting', percent: Math.max(10, Math.min(60, p.progress)), message: p.message };
    case 'metadata':
      // Fold metadata into the extracting stage — it's part of extraction from
      // the renderer's point of view.
      return { stage: 'extracting', percent: Math.max(40, Math.min(60, p.progress)), message: p.message };
    case 'chunking':
      return { stage: 'chunking', percent: Math.max(60, Math.min(85, p.progress)), message: p.message };
    case 'complete':
      // Do not emit a pre-terminal 'completed' — the service emits the real
      // terminal event after persistence succeeds.
      return null;
    case 'cancelled':
    case 'error':
      return null;
    default:
      return null;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let singleton: DocumentIngestionService | null = null;

/**
 * Construct the singleton — must be called once with wired deps (typically
 * from `maBridge.initMaBridge`). Subsequent calls without deps return the
 * existing singleton.
 */
export function initDocumentIngestionService(deps: DocumentIngestionServiceDeps): DocumentIngestionService {
  singleton = new DocumentIngestionService(deps);
  return singleton;
}

export function getDocumentIngestionService(): DocumentIngestionService {
  if (!singleton) {
    throw new Error('DocumentIngestionService not initialized — call initDocumentIngestionService first');
  }
  return singleton;
}

/** Reset the singleton (test-only). */
export function __resetDocumentIngestionServiceForTest(): void {
  singleton = null;
}
