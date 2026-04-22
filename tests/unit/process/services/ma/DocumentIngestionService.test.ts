/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DocumentIngestionService — Wave 2 / Batch 2A
 *
 * Process-side state machine for document ingestion. These tests exercise the
 * four required paths:
 *   - progress        (truthful, monotonically non-decreasing percent)
 *   - success         (persisted text/chunks/metadata + provenance, terminal=completed)
 *   - failure         (runner error → terminal=failed, error persisted)
 *   - cancellation    (cancel() → runner aborts → terminal=cancelled)
 *
 * The service is decoupled from the real SQLite repository and the real
 * forked worker via injectable deps, so tests run fully in-memory.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { DocumentIngestionProgress, MaDocument, UpdateDocumentInput } from '@/common/ma/types';
import { isTerminalDocumentStatus } from '@/common/ma/types';
import { DocumentIngestionService, type DocumentRunner } from '@process/services/ma/DocumentIngestionService';
import {
  DocumentProcessingCancelledError,
  type CancelSignal,
  type ChunkingOptions,
  type DocumentProcessingResult,
  type ProcessingProgress,
} from '@process/services/ma/DocumentProcessor';

// ============================================================================
// In-memory repository stub — matches the subset of DocumentRepository used
// by DocumentIngestionService. We deliberately mimic the real return shape
// (`IQueryResult<MaDocument>`) so we're testing the actual call sites.
// ============================================================================

type QueryResult<T> = { success: boolean; data?: T | null; error?: string };

class FakeRepository {
  private docs = new Map<string, MaDocument>();
  private readonly failuresByStatus = new Map<string, string>();

  seed(doc: MaDocument): void {
    this.docs.set(doc.id, { ...doc });
  }

  snapshot(id: string): MaDocument | undefined {
    const d = this.docs.get(id);
    return d ? { ...d } : undefined;
  }

  failUpdateForStatus(status: string, message: string): void {
    this.failuresByStatus.set(status, message);
  }

  async get(id: string): Promise<QueryResult<MaDocument | null>> {
    const d = this.docs.get(id);
    return { success: true, data: d ? { ...d } : null };
  }

  async update(id: string, input: UpdateDocumentInput): Promise<QueryResult<MaDocument>> {
    const existing = this.docs.get(id);
    if (!existing) return { success: false, error: 'Document not found' };
    if (input.status) {
      const failure = this.failuresByStatus.get(input.status);
      if (failure) {
        return { success: false, error: failure };
      }
    }
    const updated: MaDocument = {
      ...existing,
      textContent: input.textContent ?? existing.textContent,
      chunks: input.chunks ?? existing.chunks,
      metadata: input.metadata ?? existing.metadata,
      status: input.status ?? existing.status,
      error: input.error ?? existing.error,
    };
    this.docs.set(id, updated);
    return { success: true, data: { ...updated } };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function baseDoc(overrides: Partial<MaDocument> = {}): MaDocument {
  return {
    id: 'doc_1',
    dealId: 'deal_1',
    filename: 'contract.txt',
    originalPath: '/tmp/contract.txt',
    format: 'txt',
    size: 42,
    status: 'pending',
    createdAt: 1000,
    ...overrides,
  };
}

function makeService(opts: { repo?: FakeRepository; runner: DocumentRunner; hash?: string | undefined }): {
  service: DocumentIngestionService;
  repo: FakeRepository;
  events: DocumentIngestionProgress[];
} {
  const repo = opts.repo ?? new FakeRepository();
  const events: DocumentIngestionProgress[] = [];
  let clock = 2000;
  const service = new DocumentIngestionService({
    repository:
      repo as unknown as import('@process/services/database/repositories/ma/DocumentRepository').DocumentRepository,
    emit: (e: DocumentIngestionProgress) => {
      events.push(e);
    },
    runner: opts.runner,
    now: () => clock++,
    hashFile: async (): Promise<string | undefined> => opts.hash,
  });
  return { service, repo, events };
}

// ============================================================================
// Runners — deterministic fakes for each path
// ============================================================================

/** Emits extracting → chunking → complete, returns a clean result. */
class SuccessRunner implements DocumentRunner {
  async run(
    _filePath: string,
    _format: 'pdf' | 'docx' | 'xlsx' | 'txt',
    _options: Partial<ChunkingOptions> | undefined,
    onProgress: (p: ProcessingProgress) => void,
    _signal: CancelSignal
  ): Promise<DocumentProcessingResult> {
    onProgress({ documentId: 'doc_1', stage: 'extracting', progress: 10, message: 'extracting' });
    onProgress({ documentId: 'doc_1', stage: 'metadata', progress: 40, message: 'metadata' });
    onProgress({ documentId: 'doc_1', stage: 'chunking', progress: 60, message: 'chunking' });
    onProgress({ documentId: 'doc_1', stage: 'complete', progress: 100, message: 'done' });
    return {
      documentId: 'doc_1',
      text: 'hello world',
      chunks: [{ id: 'c1', text: 'hello world', position: { start: 0, end: 11 } }],
      metadata: { documentType: 'other', title: 'contract' },
    };
  }
}

/** Emits extracting, then returns an error result. */
class FailingRunner implements DocumentRunner {
  async run(
    _f: string,
    _fmt: 'pdf' | 'docx' | 'xlsx' | 'txt',
    _o: Partial<ChunkingOptions> | undefined,
    onProgress: (p: ProcessingProgress) => void,
    _s: CancelSignal
  ): Promise<DocumentProcessingResult> {
    onProgress({ documentId: 'doc_1', stage: 'extracting', progress: 10, message: 'extracting' });
    return {
      documentId: 'doc_1',
      text: '',
      chunks: [],
      metadata: {},
      errors: ['extractor exploded'],
    };
  }
}

/** Like FailingRunner but throws an exception instead of returning errors[]. */
class ThrowingRunner implements DocumentRunner {
  async run(): Promise<DocumentProcessingResult> {
    throw new Error('disk fire');
  }
}

/**
 * Starts processing, waits for a `cancelSignal.cancelled` flip, then throws
 * DocumentProcessingCancelledError — matching the real processor's behavior.
 */
class CancellableRunner implements DocumentRunner {
  started = false;
  resolveStarted!: () => void;
  readonly startedPromise: Promise<void>;

  constructor() {
    this.startedPromise = new Promise<void>((resolve) => {
      this.resolveStarted = resolve;
    });
  }

  async run(
    _f: string,
    _fmt: 'pdf' | 'docx' | 'xlsx' | 'txt',
    _o: Partial<ChunkingOptions> | undefined,
    onProgress: (p: ProcessingProgress) => void,
    signal: CancelSignal
  ): Promise<DocumentProcessingResult> {
    this.started = true;
    onProgress({ documentId: 'doc_1', stage: 'extracting', progress: 10, message: 'extracting' });
    this.resolveStarted();
    // Wait until cancelled
    while (!signal.cancelled) {
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new DocumentProcessingCancelledError();
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('DocumentIngestionService', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
    repo.seed(baseDoc());
  });

  // --------------------------------------------------------------------------
  // Success path
  // --------------------------------------------------------------------------
  describe('success path', () => {
    it('transitions pending → queued → extracting → chunking → persisting → completed', async () => {
      const { service, events } = makeService({ repo, runner: new SuccessRunner(), hash: 'deadbeef' });

      const final = await service.ingest('doc_1', '/tmp/contract.txt');

      expect(final.status).toBe('completed');
      expect(isTerminalDocumentStatus(final.status)).toBe(true);

      const stages = events.map((e) => e.stage);
      // queued fires before the runner starts, then extracting → chunking → persisting → completed.
      expect(stages[0]).toBe('queued');
      expect(stages).toContain('extracting');
      expect(stages).toContain('chunking');
      expect(stages).toContain('persisting');
      expect(stages[stages.length - 1]).toBe('completed');
    });

    it('persists text, chunks, and canonical provenance', async () => {
      const { service } = makeService({ repo, runner: new SuccessRunner(), hash: 'hash123' });

      const final = await service.ingest('doc_1', '/tmp/contract.txt');

      expect(final.textContent).toBe('hello world');
      expect(final.chunks).toHaveLength(1);
      expect(final.metadata?.provenance).toBeDefined();
      const prov = final.metadata!.provenance!;
      expect(prov.sourcePath).toBe('/tmp/contract.txt');
      expect(prov.sha256).toBe('hash123');
      expect(prov.processedAt).toBeGreaterThan(0);
      expect(prov.processingMs).toBeGreaterThanOrEqual(0);
      expect(prov.extractor).toBe('DocumentProcessor');
    });

    it('emits exactly one terminal event with terminal=true', async () => {
      const { service, events } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      await service.ingest('doc_1', '/tmp/contract.txt');

      const terminal = events.filter((e) => e.terminal);
      expect(terminal).toHaveLength(1);
      expect(terminal[0].stage).toBe('completed');
      expect(terminal[0].progress).toBe(100);
    });

    it('merges runner-provided metadata with existing row metadata and provenance', async () => {
      repo = new FakeRepository();
      repo.seed(baseDoc({ metadata: { author: 'Alice' } }));
      const { service } = makeService({ repo, runner: new SuccessRunner(), hash: 'h' });

      const final = await service.ingest('doc_1', '/tmp/contract.txt');

      expect(final.metadata?.author).toBe('Alice'); // preserved
      expect(final.metadata?.title).toBe('contract'); // from runner
      expect(final.metadata?.documentType).toBe('other'); // from runner
      expect(final.metadata?.provenance?.sha256).toBe('h');
    });
  });

  // --------------------------------------------------------------------------
  // Progress path
  // --------------------------------------------------------------------------
  describe('progress path', () => {
    it('emits monotonically non-decreasing progress percent', async () => {
      const { service, events } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      await service.ingest('doc_1', '/tmp/contract.txt');

      const percents = events.map((e) => e.progress);
      for (let i = 1; i < percents.length; i++) {
        expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
      }
    });

    it('stamps every event with the correct documentId and dealId', async () => {
      const { service, events } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      await service.ingest('doc_1', '/tmp/contract.txt');

      for (const e of events) {
        expect(e.documentId).toBe('doc_1');
        expect(e.dealId).toBe('deal_1');
        expect(e.timestamp).toBeGreaterThan(0);
      }
    });

    it('does NOT pre-emit a completed event before persistence (no fake success)', async () => {
      // Runner emits 'complete' mid-flight — service must suppress it until
      // after the DB row has been flipped to completed.
      const { service, events } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      await service.ingest('doc_1', '/tmp/contract.txt');

      const completed = events.filter((e) => e.stage === 'completed');
      expect(completed).toHaveLength(1);
      expect(completed[0].terminal).toBe(true);
    });

    it('emits queued stage before any runner work', async () => {
      let runnerCalled = false;
      const runner: DocumentRunner = {
        async run(_f, _fmt, _o, onProgress, _s) {
          runnerCalled = true;
          onProgress({ documentId: 'doc_1', stage: 'extracting', progress: 10 });
          return { documentId: 'doc_1', text: 't', chunks: [], metadata: {} };
        },
      };
      const { service, events } = makeService({ repo, runner, hash: 'x' });
      await service.ingest('doc_1', '/tmp/contract.txt');

      expect(runnerCalled).toBe(true);
      const queuedIdx = events.findIndex((e) => e.stage === 'queued');
      const extractingIdx = events.findIndex((e) => e.stage === 'extracting');
      expect(queuedIdx).toBeGreaterThanOrEqual(0);
      expect(extractingIdx).toBeGreaterThan(queuedIdx);
    });
  });

  // --------------------------------------------------------------------------
  // Failure paths
  // --------------------------------------------------------------------------
  describe('failure path', () => {
    it('persists status=failed and error when runner returns errors', async () => {
      const { service, events } = makeService({ repo, runner: new FailingRunner(), hash: 'x' });
      const final = await service.ingest('doc_1', '/tmp/contract.txt');

      expect(final.status).toBe('failed');
      expect(final.error).toContain('extractor exploded');
      const terminal = events.filter((e) => e.terminal);
      expect(terminal).toHaveLength(1);
      expect(terminal[0].stage).toBe('failed');
      expect(terminal[0].error).toContain('extractor exploded');
    });

    it('persists status=failed when runner throws an unexpected error', async () => {
      const { service, events } = makeService({ repo, runner: new ThrowingRunner(), hash: 'x' });
      const final = await service.ingest('doc_1', '/tmp/contract.txt');

      expect(final.status).toBe('failed');
      expect(final.error).toContain('disk fire');
      expect(events[events.length - 1].stage).toBe('failed');
      expect(events[events.length - 1].terminal).toBe(true);
    });

    it('rejects re-ingest on a document that is already terminal', async () => {
      repo = new FakeRepository();
      repo.seed(baseDoc({ status: 'completed' }));
      const { service } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });

      await expect(service.ingest('doc_1', '/tmp/c.txt')).rejects.toThrow(/already terminal/);
    });

    it('rejects ingest for an unknown documentId', async () => {
      const { service } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      await expect(service.ingest('doc_missing', '/tmp/c.txt')).rejects.toThrow(/not found/);
    });

    it('does not emit queued progress when the queued status write fails', async () => {
      repo.failUpdateForStatus('queued', 'queue write failed');
      const { service, events } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });

      await expect(service.ingest('doc_1', '/tmp/c.txt')).rejects.toThrow(/queue write failed/);
      expect(events).toHaveLength(0);
      expect(service.activeCount()).toBe(0);
      expect(repo.snapshot('doc_1')?.status).toBe('pending');
    });

    it('does not emit failed terminal progress when the failed status write fails', async () => {
      repo.failUpdateForStatus('failed', 'failed write failed');
      const { service, events } = makeService({ repo, runner: new FailingRunner(), hash: 'x' });

      await expect(service.ingest('doc_1', '/tmp/c.txt')).rejects.toThrow(/failed write failed/);
      expect(events.some((event) => event.stage === 'failed')).toBe(false);
      expect(repo.snapshot('doc_1')?.status).toBe('queued');
    });
  });

  // --------------------------------------------------------------------------
  // Cancellation path
  // --------------------------------------------------------------------------
  describe('cancellation path', () => {
    it('cancel() flips signal and runner aborts with terminal=cancelled', async () => {
      const runner = new CancellableRunner();
      const { service, events } = makeService({ repo, runner, hash: 'x' });

      const ingestPromise = service.ingest('doc_1', '/tmp/c.txt');
      await runner.startedPromise;

      const cancelled = service.cancel('doc_1');
      expect(cancelled).toBe(true);

      const final = await ingestPromise;
      expect(final.status).toBe('cancelled');

      const terminal = events.filter((e) => e.terminal);
      expect(terminal).toHaveLength(1);
      expect(terminal[0].stage).toBe('cancelled');
      expect(terminal[0].error).toBeUndefined();
    });

    it('cancel() returns false when no ingestion is in flight', async () => {
      const { service } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      expect(service.cancel('doc_1')).toBe(false);
    });

    it('rejects a second concurrent ingest for the same document', async () => {
      const runner = new CancellableRunner();
      const { service } = makeService({ repo, runner, hash: 'x' });

      const first = service.ingest('doc_1', '/tmp/c.txt');
      await runner.startedPromise;

      await expect(service.ingest('doc_1', '/tmp/c.txt')).rejects.toThrow(/already being ingested/);

      service.cancel('doc_1');
      await first;
    });

    it('releases the active slot after terminal state', async () => {
      const { service } = makeService({ repo, runner: new SuccessRunner(), hash: 'x' });
      await service.ingest('doc_1', '/tmp/c.txt');
      expect(service.activeCount()).toBe(0);
    });

    it('does not emit cancelled terminal progress when the cancelled status write fails', async () => {
      const runner = new CancellableRunner();
      repo.failUpdateForStatus('cancelled', 'cancel write failed');
      const { service, events } = makeService({ repo, runner, hash: 'x' });

      const ingestPromise = service.ingest('doc_1', '/tmp/c.txt');
      await runner.startedPromise;
      expect(service.cancel('doc_1')).toBe(true);

      await expect(ingestPromise).rejects.toThrow(/cancel write failed/);
      expect(events.some((event) => event.stage === 'cancelled')).toBe(false);
      expect(service.activeCount()).toBe(0);
      expect(repo.snapshot('doc_1')?.status).toBe('queued');
    });
  });

  // --------------------------------------------------------------------------
  // End-to-end with the real in-process DocumentProcessor (no fake runner)
  // --------------------------------------------------------------------------
  describe('with real DocumentProcessor', () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = join(tmpdir(), `ingestion-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(testDir, { recursive: true });
    });

    it('successfully ingests a real TXT file end-to-end', async () => {
      const filePath = join(testDir, 'sample.txt');
      await writeFile(filePath, 'This is a NON-DISCLOSURE AGREEMENT.\n\nSecond paragraph.', 'utf-8');

      repo = new FakeRepository();
      repo.seed(baseDoc({ originalPath: filePath }));
      const { service, events } = makeService({
        repo,
        // Default in-process runner
        runner: {
          async run(fp, fmt, opts, onProgress, signal) {
            const { DocumentProcessor } = await import('@process/services/ma/DocumentProcessor');
            const p = new DocumentProcessor(onProgress);
            return p.processDocument(fp, fmt, opts, signal);
          },
        },
        hash: undefined,
      });

      const final = await service.ingest('doc_1', filePath);
      expect(final.status).toBe('completed');
      expect(final.textContent).toContain('NON-DISCLOSURE');
      expect(final.metadata?.documentType).toBe('nda');
      expect(final.metadata?.provenance?.sourcePath).toBe(filePath);
      expect(events[events.length - 1].stage).toBe('completed');

      await rm(testDir, { recursive: true, force: true });
    });
  });
});
