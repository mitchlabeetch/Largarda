/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ResultCollector — 结果回读
 * Subscribes to SubTaskSession events and collects final results.
 * When all registered sessions are done (or failed), emits 'allSettled'.
 */
import { EventEmitter } from 'events';
import type { SubTaskResult } from './types';
import type { SubTaskSession } from './SubTaskSession';

export class ResultCollector extends EventEmitter {
  private results = new Map<string, SubTaskResult>();
  private failures = new Map<string, Error>();
  private totalRegistered = 0;
  private settled = 0;

  /**
   * Register a SubTaskSession to be collected.
   * Call before starting the session.
   */
  register(session: SubTaskSession): void {
    this.totalRegistered++;
    let accumulatedText = '';

    session.on('text', (text: string) => {
      accumulatedText += text;
      this.emit('progress', { subTaskId: session.subTaskId, text });
    });

    session.on('done', () => {
      const result: SubTaskResult = {
        subTaskId: session.subTaskId,
        conversationId: session.conversationId,
        outputText: accumulatedText,
        completedAt: Date.now(),
      };
      this.results.set(session.subTaskId, result);
      this.emit('result', result);
      this.settled++;
      this._checkAllSettled();
    });

    session.on('error', (err: Error) => {
      this.failures.set(session.subTaskId, err);
      this.emit('failure', { subTaskId: session.subTaskId, error: err });
      this.settled++;
      this._checkAllSettled();
    });
  }

  /** Get result for a specific sub-task (结果回读) */
  getResult(subTaskId: string): SubTaskResult | undefined {
    return this.results.get(subTaskId);
  }

  /** Get all collected results */
  getAllResults(): SubTaskResult[] {
    return [...this.results.values()];
  }

  /** Get all failures */
  getAllFailures(): Map<string, Error> {
    return new Map(this.failures);
  }

  /** Whether all registered sessions have settled */
  isAllSettled(): boolean {
    return this.settled >= this.totalRegistered && this.totalRegistered > 0;
  }

  /**
   * Wait until all registered sessions settle.
   * Returns all results (failures are excluded from results array but available via getAllFailures()).
   */
  waitForAll(): Promise<SubTaskResult[]> {
    if (this.isAllSettled()) return Promise.resolve(this.getAllResults());
    return new Promise((resolve, reject) => {
      this.once(
        'allSettled',
        ({ results, failures }: { results: SubTaskResult[]; failures: Map<string, Error> }) => {
          if (failures.size > 0 && results.length === 0) {
            reject(
              new Error(
                `All sub-tasks failed: ${[...failures.values()].map((e) => e.message).join('; ')}`,
              ),
            );
          } else {
            resolve(results);
          }
        },
      );
    });
  }

  private _checkAllSettled(): void {
    if (this.settled < this.totalRegistered) return;
    this.emit('allSettled', {
      results: this.getAllResults(),
      failures: this.getAllFailures(),
    });
  }
}
