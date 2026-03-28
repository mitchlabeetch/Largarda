/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentManagerFactory } from '@process/task/orchestrator/SubTaskSession';
import type { AionCliConfig, AgentConfig } from '../config/types';
import { CliAgentManager } from './CliAgentManager';

/**
 * Create an AgentManagerFactory that satisfies the Orchestrator's interface.
 *
 * @param config       Loaded AionCliConfig (models + keys)
 * @param agentPerTask Optional map of subTaskId → agentKey for mixed-model teams.
 *                     E.g. { 'abc1': 'gemini', 'abc2': 'claude' }
 *
 * The Orchestrator uses conversationIds of the form `orch_{runId}_{subTaskId}`,
 * so we parse the subTaskId from the conversationId to look up the per-task agent.
 * This is what enables "Researcher uses Gemini, Implementer uses Claude" in one team.
 */
export function createCliAgentFactory(
  config: AionCliConfig,
  agentPerTask?: Record<string, string>,
): AgentManagerFactory {
  return (conversationId, _presetContext, emitter) => {
    const agentKey = resolveAgentKey(conversationId, config, agentPerTask);
    const agentConfig = resolveAgentConfig(config, agentKey);
    return new CliAgentManager(conversationId, agentConfig, emitter);
  };
}

/** Parse subTaskId from `orch_{runId}_{subTaskId}` and look up its agent key */
function resolveAgentKey(
  conversationId: string,
  config: AionCliConfig,
  agentPerTask?: Record<string, string>,
): string {
  if (agentPerTask) {
    // conversationId format: orch_{runId}_{subTaskId}
    const parts = conversationId.split('_');
    const subTaskId = parts[parts.length - 1];
    if (subTaskId && agentPerTask[subTaskId]) return agentPerTask[subTaskId];
  }
  return config.defaultAgent;
}

function resolveAgentConfig(config: AionCliConfig, key: string): AgentConfig {
  if (config.agents[key]) return config.agents[key];

  // Fall back to first available agent
  const first = Object.values(config.agents)[0];
  if (first) return first;

  throw new Error(
    `No agent configured.\n` +
      `  Set an API key:  export ANTHROPIC_API_KEY=sk-ant-...\n` +
      `  Then run:        node out/main/cli.js config`,
  );
}
