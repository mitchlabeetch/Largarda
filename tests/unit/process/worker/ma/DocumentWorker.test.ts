/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CancelSignal, ProcessingProgress } from '@process/services/ma/DocumentProcessor';

const postMessage = vi.fn();
let messageHandler: ((message: unknown) => void) | undefined;

vi.mock('worker_threads', () => ({
  parentPort: {
    on: vi.fn((event: string, handler: (message: unknown) => void) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    }),
    postMessage,
  },
}));

vi.mock('@process/services/ma/DocumentProcessor', () => ({
  DocumentProcessor: class {
    private readonly onProgress: (progress: ProcessingProgress) => void;

    constructor(onProgress: (progress: ProcessingProgress) => void) {
      this.onProgress = onProgress;
    }

    async processDocument(_filePath: string, _format: 'txt', _options: undefined, _cancelSignal: CancelSignal) {
      this.onProgress({
        documentId: 'processor-generated-id',
        stage: 'extracting',
        progress: 25,
        message: 'Extracting content',
      });

      return {
        documentId: 'processor-generated-id',
        text: 'worker result',
        chunks: [],
        metadata: {},
      };
    }
  },
}));

describe('DocumentWorker', () => {
  beforeEach(() => {
    postMessage.mockClear();
    messageHandler = undefined;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('remaps processor-generated document ids to the persisted row id', async () => {
    await import('@process/worker/ma/DocumentWorker');

    expect(messageHandler).toBeDefined();

    messageHandler?.({
      type: 'start',
      data: {
        documentId: 'row-doc-1',
        filePath: '/tmp/test.txt',
        format: 'txt',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'progress',
        data: expect.objectContaining({
          documentId: 'row-doc-1',
          stage: 'extracting',
        }),
      })
    );

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'complete',
        data: expect.objectContaining({
          documentId: 'row-doc-1',
          text: 'worker result',
        }),
      })
    );
  });
});
