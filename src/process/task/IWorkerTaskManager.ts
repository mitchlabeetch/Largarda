/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// src/process/task/IWorkerTaskManager.ts

import type { IAgentManager } from './IAgentManager';
import type { BuildConversationOptions, AgentType } from './agentTypes';

export interface IWorkerTaskManager {
  getTask(id: string): IAgentManager | undefined;
  getOrBuildTask(id: string, options?: BuildConversationOptions): Promise<IAgentManager>;
  addTask(id: string, task: IAgentManager): void;
  kill(id: string): void;
  clear(): void;
  listTasks(): Array<{ id: string; type: AgentType }>;

  // Phase 1 dispatch extensions
  /** Register a callback for task completion events */
  onTaskCompleted?(callback: (taskId: string, result: 'completed' | 'failed') => void): void;
  /** Notify that a task has completed */
  notifyTaskCompleted?(taskId: string, result: 'completed' | 'failed'): void;
  /** Wait for a task to reach idle/finished/failed state */
  waitForTaskIdle?(taskId: string, timeoutMs: number): Promise<boolean>;
}
