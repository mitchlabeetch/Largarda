/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// src/process/task/dispatch/DispatchResourceGuard.ts

import type { IWorkerTaskManager } from '../IWorkerTaskManager';
import type { DispatchSessionTracker } from './DispatchSessionTracker';
import { MAX_CONCURRENT_CHILDREN } from './dispatchTypes';
import { mainLog } from '@process/utils/mainLogger';

/**
 * Phase 1 basic resource management for dispatch sessions.
 * Handles concurrency limits, child release, and cascade kill.
 */
export class DispatchResourceGuard {
  constructor(
    private readonly taskManager: IWorkerTaskManager,
    private readonly tracker: DispatchSessionTracker
  ) {}

  /**
   * Check concurrency limit before creating a new child task.
   * @returns undefined if allowed; error message string if limit exceeded
   */
  checkConcurrencyLimit(parentId: string): string | undefined {
    const activeCount = this.tracker.countActiveChildren(parentId);

    if (activeCount >= MAX_CONCURRENT_CHILDREN) {
      return (
        `Maximum concurrent tasks reached (${activeCount}/${MAX_CONCURRENT_CHILDREN}). ` +
        `Wait for existing tasks to complete or read their transcripts.`
      );
    }
    return undefined;
  }

  /**
   * Release a completed child worker process.
   * Called after notification sent + transcript read by dispatcher.
   * Transitions child from 'idle' to 'finished' and kills worker.
   */
  releaseChild(childId: string): void {
    const task = this.taskManager.getTask(childId);
    if (task && (task.status === 'idle' || task.status === 'failed' || task.status === 'cancelled')) {
      mainLog('[DispatchResourceGuard]', `Releasing child worker: ${childId}`);
      this.taskManager.kill(childId);
      this.tracker.removeChild(childId);
    }
  }

  /**
   * Cascade kill: when dispatcher is killed, kill all children too.
   * Triggered by: user closes group chat, dispatcher finishes, app exit.
   */
  cascadeKill(parentId: string): void {
    const childIds = this.tracker.getChildIds(parentId);
    for (const childId of childIds) {
      mainLog('[DispatchResourceGuard]', `Cascade killing child: ${childId}`);
      this.taskManager.kill(childId);
    }
    this.tracker.removeParent(parentId);
    this.taskManager.kill(parentId);
  }
}
