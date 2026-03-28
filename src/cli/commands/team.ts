/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Team command — multi-agent parallel collaboration.
 *
 * Core Aion differentiator: each agent in the team can use a DIFFERENT model.
 * Claude Code only supports one model. Aion supports mixing any configured models.
 *
 * Examples:
 *   aion team --goal "Analyze codebase"
 *     → 3 agents all using the default model
 *
 *   aion team --goal "Build a feature" --agents claude,gemini,claude
 *     → Researcher(claude) + Analyst(gemini) + Implementer(claude) in parallel
 *
 *   aion team --goal "Design an API" -c 5
 *     → 5 parallel agents, all using default model
 */
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Orchestrator } from '@process/task/orchestrator/Orchestrator';
import type { SubTask } from '@process/task/orchestrator/types';
import { createCliAgentFactory } from '../agents/factory';
import { loadConfig } from '../config/loader';
import { TeamPanel } from '../ui/teamPanel';
import { fmt, hr } from '../ui/format';

export type TeamOptions = {
  goal?: string;
  /** Comma-separated agent keys, one per sub-task. E.g. "claude,gemini,claude" */
  agents?: string;
  concurrency?: number;
};

const DEFAULT_ROLES = [
  { label: 'Researcher', focus: 'Research and gather relevant information for' },
  { label: 'Analyst', focus: 'Analyze requirements, constraints, and trade-offs for' },
  { label: 'Implementer', focus: 'Provide a concrete, actionable implementation plan for' },
];

export async function runTeam(options: TeamOptions = {}): Promise<void> {
  const config = loadConfig();
  const concurrency = options.concurrency ?? config.team?.concurrency ?? 3;
  const timeoutMs = config.team?.timeoutMs ?? 5 * 60 * 1000;

  const goal = options.goal ?? (await promptGoal());

  // Build sub-tasks and per-task agent mapping
  const agentKeys = options.agents
    ? options.agents.split(',').map((s) => s.trim())
    : [];

  const roles = DEFAULT_ROLES.slice(0, Math.max(concurrency, agentKeys.length || concurrency));
  const subTasks: SubTask[] = roles.map((role, i) => ({
    id: randomUUID().slice(0, 8),
    label: role.label,
    prompt: `${role.focus}: ${goal}\n\nBe thorough and specific. Provide a well-structured response.`,
    agentType: 'acp',
  }));

  // Map subTaskId → agentKey for multi-model teams
  const agentPerTask: Record<string, string> | undefined =
    agentKeys.length > 0
      ? Object.fromEntries(
          subTasks.map((t, i) => [t.id, agentKeys[i] ?? config.defaultAgent]),
        )
      : undefined;

  const factory = createCliAgentFactory(config, agentPerTask);
  const orch = new Orchestrator(factory, { concurrency, subTaskTimeoutMs: timeoutMs });
  const panel = new TeamPanel();

  orch.on('*', (event) => panel.update(event));

  // Pre-register labels so they appear in the panel before agents start
  panel.setGoal(goal);
  for (const task of subTasks) {
    panel.setLabel(task.id, task.label);
  }

  // Build header line showing which model each agent uses
  const agentSummary = subTasks
    .map((t, i) => {
      const key = agentPerTask?.[t.id] ?? config.defaultAgent;
      return `${t.label}${fmt.dim(`[${key}]`)}`;
    })
    .join(fmt.dim(' · '));

  process.stdout.write(
    `\n${fmt.bold('Aion Team')}  ${fmt.dim('·')}  ${agentSummary}\n`,
  );
  process.stdout.write(fmt.dim(hr()) + '\n\n');

  try {
    const results = await orch.run(goal, subTasks);
    panel.clear();

    process.stdout.write(
      `${fmt.green(fmt.bold('✓ Team complete'))}  ${fmt.dim(`(${results.length} agents)`)}\n`,
    );
    process.stdout.write(fmt.dim(hr()) + '\n\n');

    for (const result of results) {
      const task = subTasks.find((t) => t.id === result.subTaskId);
      const key = agentPerTask?.[result.subTaskId] ?? config.defaultAgent;
      const label = task?.label ?? result.subTaskId;

      process.stdout.write(
        `${fmt.bold(fmt.cyan(`▸ ${label}`))}  ${fmt.dim(`[${key}]`)}\n`,
      );
      process.stdout.write(result.outputText.trim() + '\n\n');
    }
  } catch (err) {
    panel.clear();
    process.stderr.write(
      fmt.red(`\n✗ Team failed: ${err instanceof Error ? err.message : String(err)}\n`),
    );
    process.exit(1);
  }
}

async function promptGoal(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => {
    rl.question(fmt.bold('Goal: '), (answer) => {
      rl.close();
      const goal = answer.trim();
      if (!goal) {
        process.stderr.write(fmt.red('Goal cannot be empty.\n'));
        process.exit(1);
      }
      resolve(goal);
    });
  });
}
