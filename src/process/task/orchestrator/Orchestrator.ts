/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Orchestrator — 总控调度
 *
 * Decomposes a goal into sub-tasks, spawns SubTaskSessions, collects results.
 *
 * Usage:
 *   const orch = new Orchestrator(agentFactory);
 *   const results = await orch.run('Analyze the codebase and write a summary', [
 *     { id: '1', label: 'Read files', prompt: 'List all TypeScript files and summarize them' },
 *     { id: '2', label: 'Write report', prompt: 'Write a one-page architecture summary' },
 *   ]);
 */
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { StateManager } from './StateManager';
import { SubTaskSession } from './SubTaskSession';
import { ResultCollector } from './ResultCollector';
import type { SubTask, SubTaskResult, OrchestratorEvent } from './types';
import type { AgentManagerFactory } from './SubTaskSession';

export type { AgentManagerFactory };

export interface OrchestratorOptions {
  /** Max concurrent sub-tasks (default: 3) */
  concurrency?: number;
  /** Timeout per sub-task in ms (default: 5 minutes) */
  subTaskTimeoutMs?: number;
}

export class Orchestrator extends EventEmitter {
  private readonly concurrency: number;
  private readonly subTaskTimeoutMs: number;

  constructor(
    private readonly agentFactory: AgentManagerFactory,
    options: OrchestratorOptions = {},
  ) {
    super();
    this.concurrency = options.concurrency ?? 3;
    this.subTaskTimeoutMs = options.subTaskTimeoutMs ?? 5 * 60 * 1000;
  }

  /**
   * 总控调度 — run all sub-tasks and collect results.
   * Sub-tasks are dispatched with controlled concurrency.
   */
  async run(goal: string, subTasks: SubTask[]): Promise<SubTaskResult[]> {
    if (subTasks.length === 0) return [];

    const runId = randomUUID();
    const stateManager = new StateManager(goal);
    const collector = new ResultCollector();

    // Forward events
    stateManager.on('complete', (status: string) => {
      if (status === 'failed') {
        this._emit({ type: 'orchestrator:failed', error: 'One or more sub-tasks failed' });
      } else {
        this._emit({ type: 'orchestrator:done', results: collector.getAllResults() });
      }
    });

    collector.on('result', (result: SubTaskResult) => {
      stateManager.markDone(result.subTaskId);
      this._emit({ type: 'subtask:done', subTaskId: result.subTaskId, result });
    });

    collector.on('failure', ({ subTaskId, error }: { subTaskId: string; error: Error }) => {
      stateManager.markFailed(subTaskId, error.message);
      this._emit({ type: 'subtask:failed', subTaskId, error: error.message });
    });

    collector.on('progress', ({ subTaskId, text }: { subTaskId: string; text: string }) => {
      stateManager.appendText(subTaskId, text);
      this._emit({ type: 'subtask:progress', subTaskId, text });
    });

    // Dispatch with concurrency control
    const queue = [...subTasks];
    const running = new Set<Promise<void>>();

    const dispatch = async (subTask: SubTask): Promise<void> => {
      const conversationId = `orch_${runId}_${subTask.id}`;
      stateManager.register(subTask, conversationId);

      const session = new SubTaskSession(subTask, conversationId, this.agentFactory);
      collector.register(session);

      stateManager.markRunning(subTask.id);
      this._emit({ type: 'subtask:started', subTaskId: subTask.id, conversationId });

      // Timeout wrapper
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`SubTask ${subTask.id} timed out after ${this.subTaskTimeoutMs}ms`),
            ),
          this.subTaskTimeoutMs,
        ),
      );

      try {
        await Promise.race([this._runSession(session, subTask.prompt), timeoutPromise]);
      } catch (err) {
        session.emit('error', err instanceof Error ? err : new Error(String(err)));
        session.stop().catch((): void => {});
      }
    };

    // Concurrency-controlled dispatcher
    while (queue.length > 0 || running.size > 0) {
      while (queue.length > 0 && running.size < this.concurrency) {
        const subTask = queue.shift()!;
        const p = dispatch(subTask).finally(() => running.delete(p));
        running.add(p);
      }
      if (running.size > 0) {
        await Promise.race(running);
      }
    }

    // Wait for all collectors to settle
    return collector.waitForAll();
  }

  /**
   * 消息续发 — send a follow-up to an existing session.
   * Returns updated result text after the continuation.
   */
  async continueSession(session: SubTaskSession, followUp: string): Promise<string> {
    const collector = new ResultCollector();
    collector.register(session);
    await session.continue(followUp);
    const results = await collector.waitForAll();
    return results[0]?.outputText ?? '';
  }

  private async _runSession(session: SubTaskSession, prompt: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      session.once('done', resolve);
      session.once('error', reject);
      session.start(prompt).catch(reject);
    });
  }

  private _emit(event: OrchestratorEvent): void {
    this.emit(event.type, event);
    this.emit('*', event);
  }
}
