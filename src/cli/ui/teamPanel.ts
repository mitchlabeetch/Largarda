/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TeamPanel — real-time terminal display of multi-agent team progress.
 *
 * Subscribes to OrchestratorEvent and renders a live status panel showing
 * each agent's label, status icon, and a rolling preview of streaming output.
 * Uses terminal escape codes to update in place (no external deps).
 */
import type { OrchestratorEvent } from '@process/task/orchestrator/types';
import { fmt, STATUS_ICONS, clearLines, hr } from './format';

type AgentState = {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  preview: string;
};

export class TeamPanel {
  private agents = new Map<string, AgentState>();
  private lastLineCount = 0;
  private goal = '';

  setGoal(goal: string): void {
    this.goal = goal;
  }

  setLabel(subTaskId: string, label: string): void {
    const agent = this.agents.get(subTaskId);
    if (agent) {
      agent.label = label;
    } else {
      this.agents.set(subTaskId, { label, status: 'pending', preview: '' });
    }
  }

  update(event: OrchestratorEvent): void {
    switch (event.type) {
      case 'subtask:started': {
        const existing = this.agents.get(event.subTaskId);
        this.agents.set(event.subTaskId, {
          label: existing?.label ?? event.subTaskId,
          status: 'running',
          preview: '',
        });
        break;
      }
      case 'subtask:progress': {
        const agent = this.agents.get(event.subTaskId);
        if (agent) {
          // Keep a rolling 80-char preview of streaming output
          agent.preview = (agent.preview + event.text).replace(/\n/g, ' ').slice(-80);
        }
        break;
      }
      case 'subtask:done': {
        const agent = this.agents.get(event.subTaskId);
        if (agent) agent.status = 'done';
        break;
      }
      case 'subtask:failed': {
        const agent = this.agents.get(event.subTaskId);
        if (agent) {
          agent.status = 'failed';
          agent.preview = event.error;
        }
        break;
      }
    }
    this.render();
  }

  render(): void {
    if (this.lastLineCount > 0) {
      clearLines(this.lastLineCount);
    }

    const lines: string[] = [];

    if (this.goal) {
      lines.push(`${fmt.bold('Goal:')} ${fmt.cyan(this.goal)}`);
      lines.push(fmt.dim(hr()));
    }

    for (const [id, state] of this.agents) {
      const icon = STATUS_ICONS[state.status];
      const coloredIcon =
        state.status === 'running'
          ? fmt.yellow(icon)
          : state.status === 'done'
            ? fmt.green(icon)
            : state.status === 'failed'
              ? fmt.red(icon)
              : fmt.dim(icon);

      const label = fmt.bold(state.label || id);
      const preview = state.preview
        ? fmt.dim(' ' + state.preview.slice(0, 60).trim())
        : '';
      lines.push(`  ${coloredIcon} ${label}${preview}`);
    }

    if (lines.length > 0) {
      process.stdout.write(lines.join('\n') + '\n');
    }
    this.lastLineCount = lines.length;
  }

  clear(): void {
    if (this.lastLineCount > 0) {
      clearLines(this.lastLineCount);
      this.lastLineCount = 0;
    }
  }
}
