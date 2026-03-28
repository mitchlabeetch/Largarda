import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../../src/process/task/orchestrator/StateManager';

describe('StateManager', () => {
  let sm: StateManager;

  beforeEach(() => {
    sm = new StateManager('Test goal');
  });

  it('initialises with idle status and empty sub-tasks', () => {
    expect(sm.overallStatus).toBe('idle');
    expect(sm.snapshot().size).toBe(0);
  });

  it('registers a sub-task as pending', () => {
    const subTask = { id: 'st-1', label: 'Task 1', prompt: 'Do X', agentType: 'acp' };
    sm.register(subTask, 'conv-1');
    expect(sm.getSubTask('st-1')?.status).toBe('pending');
    expect(sm.getSubTask('st-1')?.conversationId).toBe('conv-1');
  });

  it('transitions pending → running → done', () => {
    const subTask = { id: 'st-2', label: 'Task 2', prompt: 'Do Y', agentType: 'acp' };
    sm.register(subTask, 'conv-2');
    sm.markRunning('st-2');
    expect(sm.getSubTask('st-2')?.status).toBe('running');
    sm.markDone('st-2');
    expect(sm.getSubTask('st-2')?.status).toBe('done');
  });

  it('marks failed with error message', () => {
    const subTask = { id: 'st-3', label: 'Task 3', prompt: 'Do Z', agentType: 'acp' };
    sm.register(subTask, 'conv-3');
    sm.markRunning('st-3');
    sm.markFailed('st-3', 'timeout');
    expect(sm.getSubTask('st-3')?.status).toBe('failed');
    expect(sm.getSubTask('st-3')?.error).toBe('timeout');
  });

  it('appends text output to sub-task', () => {
    const subTask = { id: 'st-4', label: 'Task 4', prompt: 'Write', agentType: 'acp' };
    sm.register(subTask, 'conv-4');
    sm.appendText('st-4', 'Hello ');
    sm.appendText('st-4', 'World');
    expect(sm.getSubTask('st-4')?.outputText).toBe('Hello World');
  });

  it('emits complete event when all sub-tasks done', () => {
    return new Promise<void>((resolve) => {
      sm.on('complete', (status: string) => {
        expect(status).toBe('done');
        resolve();
      });
      const st = { id: 'st-5', label: 'T5', prompt: 'P', agentType: 'acp' };
      sm.register(st, 'c-5');
      sm.markRunning('st-5');
      sm.markDone('st-5');
    });
  });

  it('emits complete:failed when any sub-task failed', () => {
    return new Promise<void>((resolve) => {
      sm.on('complete', (status: string) => {
        expect(status).toBe('failed');
        resolve();
      });
      const st = { id: 'st-6', label: 'T6', prompt: 'P', agentType: 'acp' };
      sm.register(st, 'c-6');
      sm.markRunning('st-6');
      sm.markFailed('st-6', 'error');
    });
  });

  it('allDone returns false while tasks are running', () => {
    const st = { id: 'st-7', label: 'T7', prompt: 'P', agentType: 'acp' };
    sm.register(st, 'c-7');
    sm.markRunning('st-7');
    expect(sm.allDone()).toBe(false);
  });

  it('cancelAll sets all pending/running tasks to cancelled', () => {
    const st1 = { id: 'a1', label: 'A1', prompt: 'P', agentType: 'acp' };
    const st2 = { id: 'a2', label: 'A2', prompt: 'P', agentType: 'acp' };
    sm.register(st1, 'ca1');
    sm.register(st2, 'ca2');
    sm.markRunning('a1');
    sm.cancelAll();
    expect(sm.getSubTask('a1')?.status).toBe('cancelled');
    expect(sm.getSubTask('a2')?.status).toBe('cancelled');
    expect(sm.overallStatus).toBe('cancelled');
  });
});
