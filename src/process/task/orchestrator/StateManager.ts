/**
 * StateManager — in-memory lifecycle tracker for all sub-tasks in one orchestrator run.
 *
 * Responsibilities:
 *   - Register sub-tasks before they start
 *   - Transition statuses (pending → running → done/failed/cancelled)
 *   - Accumulate streaming text output per sub-task
 *   - Emit 'subtask:change', 'change', and 'complete' events for downstream consumers
 *
 * Pure in-memory; no persistence. Thread-safe by the JS single-threaded event loop.
 */
import { EventEmitter } from 'events';
import type { OrchestratorState, SubTask, SubTaskState } from './types';

export class StateManager extends EventEmitter {
  private state: OrchestratorState;

  constructor(goal: string) {
    super();
    this.state = {
      runId: crypto.randomUUID(),
      goal,
      subTasks: new Map(),
      status: 'idle',
      createdAt: Date.now(),
    };
  }

  get runId(): string {
    return this.state.runId;
  }

  get goal(): string {
    return this.state.goal;
  }

  get overallStatus(): OrchestratorState['status'] {
    return this.state.status;
  }

  /** Register a sub-task before it starts */
  register(subTask: SubTask, conversationId: string): void {
    const st: SubTaskState = {
      id: subTask.id,
      label: subTask.label,
      status: 'pending',
      conversationId,
      outputText: '',
    };
    this.state.subTasks.set(subTask.id, st);
    this.emit('change', this.snapshot());
  }

  /** Transition a sub-task to running */
  markRunning(subTaskId: string): void {
    this._update(subTaskId, { status: 'running', startedAt: Date.now() });
  }

  /** Append streaming text to a sub-task */
  appendText(subTaskId: string, text: string): void {
    const st = this.state.subTasks.get(subTaskId);
    if (!st) return;
    st.outputText += text;
    this.emit('change', this.snapshot());
  }

  /** Mark a sub-task as done */
  markDone(subTaskId: string): void {
    this._update(subTaskId, { status: 'done', completedAt: Date.now() });
    this._checkOverallCompletion();
  }

  /** Mark a sub-task as failed */
  markFailed(subTaskId: string, error: string): void {
    this._update(subTaskId, { status: 'failed', error, completedAt: Date.now() });
    this._checkOverallCompletion();
  }

  /** Cancel all pending/running sub-tasks */
  cancelAll(): void {
    for (const [id, st] of this.state.subTasks) {
      if (st.status === 'pending' || st.status === 'running') {
        this._update(id, { status: 'cancelled', completedAt: Date.now() });
      }
    }
    this.state.status = 'cancelled';
    this.emit('change', this.snapshot());
  }

  /** Get a read-only snapshot of all sub-task states */
  snapshot(): ReadonlyMap<string, Readonly<SubTaskState>> {
    return new Map(this.state.subTasks);
  }

  /** Get a single sub-task's state */
  getSubTask(id: string): Readonly<SubTaskState> | undefined {
    return this.state.subTasks.get(id);
  }

  /** Returns true when no sub-tasks are still pending or running */
  allDone(): boolean {
    for (const st of this.state.subTasks.values()) {
      if (st.status === 'pending' || st.status === 'running') return false;
    }
    return true;
  }

  private _update(subTaskId: string, patch: Partial<SubTaskState>): void {
    const st = this.state.subTasks.get(subTaskId);
    if (!st) return;
    Object.assign(st, patch);
    this.emit('subtask:change', subTaskId, st);
    this.emit('change', this.snapshot());
  }

  private _checkOverallCompletion(): void {
    if (!this.allDone()) return;
    const anyFailed = [...this.state.subTasks.values()].some((st) => st.status === 'failed');
    this.state.status = anyFailed ? 'failed' : 'done';
    this.state.completedAt = Date.now();
    this.emit('complete', this.state.status);
  }
}
