/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Analysis Worker Task
 * Provides a managed interface for due diligence analysis workers.
 * Extends ForkTask for proper lifecycle management with cancellation support.
 */

import { ForkTask } from '@process/worker/fork/ForkTask';
import type {
  DueDiligenceRequest,
  DueDiligenceResult,
  AnalysisProgress,
} from '@process/services/ma/DueDiligenceService';

// ============================================================================
// Types
// ============================================================================

export interface AnalysisWorkerInput {
  request: DueDiligenceRequest;
}

export type AnalysisWorkerProgress = AnalysisProgress;

// ============================================================================
// AnalysisWorkerTask Class
// ============================================================================

/**
 * AnalysisWorkerTask manages a due diligence analysis worker.
 * Provides progress events, cancellation support, and result handling.
 */
export class AnalysisWorkerTask extends ForkTask<AnalysisWorkerInput> {
  private result: DueDiligenceResult | null = null;
  private progressHistory: AnalysisProgress[] = [];

  constructor(data: AnalysisWorkerInput) {
    // Get the path to the worker script
    const workerPath = require.resolve('./AnalysisWorker');
    super(workerPath, data, true);

    // Handle progress events
    this.on('progress', (data: AnalysisProgress) => {
      this.progressHistory.push(data);
      this.emit('analysis:progress', data);
    });
  }

  /**
   * Start the analysis
   */
  async startAnalysis(): Promise<DueDiligenceResult> {
    await this.start();

    return new Promise((resolve, reject) => {
      this.once('complete', (data: DueDiligenceResult) => {
        this.result = data;
        resolve(data);
      });

      this.once('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Get the analysis result
   */
  getResult(): DueDiligenceResult | null {
    return this.result;
  }

  /**
   * Get progress history
   */
  getProgressHistory(): AnalysisProgress[] {
    return [...this.progressHistory];
  }

  /**
   * Get the latest progress
   */
  getLatestProgress(): AnalysisProgress | null {
    return this.progressHistory.length > 0 ? this.progressHistory[this.progressHistory.length - 1] : null;
  }

  /**
   * Cancel the analysis
   */
  cancel(): void {
    this.postMessage('stop', {});
  }

  /**
   * Check if analysis is complete
   */
  isComplete(): boolean {
    const latest = this.getLatestProgress();
    return latest?.stage === 'complete' || latest?.stage === 'error';
  }

  /**
   * Check if analysis has errors
   */
  hasError(): boolean {
    const latest = this.getLatestProgress();
    return latest?.stage === 'error';
  }

  /**
   * Get current progress percentage
   */
  getProgressPercentage(): number {
    const latest = this.getLatestProgress();
    return latest?.progress ?? 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run due diligence analysis in a background worker
 */
export async function runAnalysisInWorker(
  request: DueDiligenceRequest,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<DueDiligenceResult> {
  const task = new AnalysisWorkerTask({ request });

  if (onProgress) {
    task.on('analysis:progress', onProgress);
  }

  return task.startAnalysis();
}

/**
 * Run analysis with timeout
 */
export async function runAnalysisWithTimeout(
  request: DueDiligenceRequest,
  timeoutMs: number,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<DueDiligenceResult> {
  const task = new AnalysisWorkerTask({ request });

  if (onProgress) {
    task.on('analysis:progress', onProgress);
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      task.cancel();
      reject(new Error(`Analysis timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Race between analysis and timeout
  return Promise.race([task.startAnalysis(), timeoutPromise]);
}
