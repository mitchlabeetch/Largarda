/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAgentFactory } from './IAgentFactory';
import type { IAgentManager } from './IAgentManager';
import type { IWorkerTaskManager } from './IWorkerTaskManager';
import type { BuildConversationOptions, AgentType } from './agentTypes';
import type { IConversationRepository } from '@process/services/database/IConversationRepository';
import type { TChatConversation } from '@/common/config/storage';

/** Callback for post-build dependency injection (e.g. dispatch agents) */
type PostBuildHook = (task: IAgentManager) => void;

export class WorkerTaskManager implements IWorkerTaskManager {
  private taskList: Array<{ id: string; task: IAgentManager }> = [];
  private postBuildHooks: PostBuildHook[] = [];
  /** Task completion callbacks for dispatch notification system */
  private completionCallbacks: Array<(taskId: string, result: 'completed' | 'failed') => void> = [];

  constructor(
    private readonly factory: IAgentFactory,
    private readonly repo: IConversationRepository
  ) {}

  /**
   * Register a hook that runs after every task is built.
   * Used to inject dependencies (e.g. DispatchAgentManager needs WorkerTaskManager).
   */
  onPostBuild(hook: PostBuildHook): void {
    this.postBuildHooks.push(hook);
  }

  getTask(id: string): IAgentManager | undefined {
    return this.taskList.find((item) => item.id === id)?.task;
  }

  async getOrBuildTask(id: string, options?: BuildConversationOptions): Promise<IAgentManager> {
    if (!options?.skipCache) {
      const existing = this.getTask(id);
      if (existing) return existing;
    }

    const conversation = await this.repo.getConversation(id);
    if (conversation) return this._buildAndCache(conversation, options);

    throw new Error(`Conversation not found: ${id}`);
  }

  private _buildAndCache(conversation: TChatConversation, options?: BuildConversationOptions): IAgentManager {
    const task = this.factory.create(conversation, options);
    // Run post-build hooks (e.g. dispatch dependency injection)
    for (const hook of this.postBuildHooks) {
      hook(task);
    }
    if (!options?.skipCache) {
      this.taskList.push({ id: conversation.id, task });
    }
    return task;
  }

  addTask(id: string, task: IAgentManager): void {
    const existing = this.taskList.find((item) => item.id === id);
    if (existing) {
      existing.task = task;
    } else {
      this.taskList.push({ id, task });
    }
  }

  kill(id: string): void {
    const index = this.taskList.findIndex((item) => item.id === id);
    if (index === -1) return;
    this.taskList[index]?.task.kill();
    this.taskList.splice(index, 1);
  }

  clear(): void {
    this.taskList.forEach((item) => item.task.kill());
    this.taskList = [];
  }

  listTasks(): Array<{ id: string; type: AgentType }> {
    return this.taskList.map((t) => ({ id: t.id, type: t.task.type }));
  }

  // ==================== Phase 1: Dispatch Extensions ====================

  /**
   * Register a callback for task completion events.
   * Used by DispatchNotifier to detect child task completion.
   */
  onTaskCompleted(callback: (taskId: string, result: 'completed' | 'failed') => void): void {
    this.completionCallbacks.push(callback);
  }

  /**
   * Remove a previously registered task completion callback.
   * CR-003: Prevents callback accumulation / memory leak.
   */
  removeCompletionCallback(callback: (taskId: string, result: 'completed' | 'failed') => void): void {
    const idx = this.completionCallbacks.indexOf(callback);
    if (idx !== -1) {
      this.completionCallbacks.splice(idx, 1);
    }
  }

  /**
   * Notify all registered callbacks that a task completed.
   * Called internally when a task status changes to finished/idle/failed.
   */
  notifyTaskCompleted(taskId: string, result: 'completed' | 'failed'): void {
    // Iterate over a copy since callbacks may remove themselves via removeCompletionCallback
    const callbacks = [...this.completionCallbacks];
    for (const cb of callbacks) {
      try {
        cb(taskId, result);
      } catch {
        // ignore callback errors
      }
    }
  }

  /**
   * Wait for a task to reach idle/finished/failed state.
   * Returns true if reached target state, false if timed out.
   * CR-003: Callbacks are cleaned up after resolve to prevent memory leaks.
   */
  async waitForTaskIdle(taskId: string, timeoutMs: number): Promise<boolean> {
    const task = this.getTask(taskId);
    if (!task) return false;
    if (task.status === 'finished' || task.status === 'idle' || task.status === 'failed') return true;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.removeCompletionCallback(check);
        resolve(false);
      }, timeoutMs);
      const check = (completedId: string) => {
        if (completedId === taskId) {
          clearTimeout(timer);
          this.removeCompletionCallback(check);
          resolve(true);
        }
      };
      this.onTaskCompleted(check);
    });
  }
}
