/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Converts DispatchMcpServer config format to AcpSessionMcpServer format.
 */

import type { AcpSessionMcpServerStdio } from '@process/agent/acp/mcpSessionConfig';

/**
 * Convert dispatch MCP server config (used by GeminiAgentManager) to
 * AcpSessionMcpServer format (used by AcpConnection.newSession).
 *
 * GeminiAgentManager uses: { command, args, env: Record<string, string> }
 * AcpConnection expects:   { type: 'stdio', name, command, args, env: Array<{name, value}> }
 */
export function toAcpSessionMcpServer(
  name: string,
  config: { command: string; args: string[]; env: Record<string, string> },
): AcpSessionMcpServerStdio {
  const envEntries = Object.entries(config.env)
    .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
    .map(([k, v]) => ({ name: k, value: v }));

  return {
    type: 'stdio',
    name,
    command: config.command,
    args: config.args,
    env: envEntries.length > 0 ? envEntries : undefined,
  };
}
