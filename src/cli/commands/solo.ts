/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Solo command — interactive single-agent REPL.
 *
 * Equivalent to `claude` in Claude Code: one agent, one conversation,
 * streaming output to stdout. Multi-turn history is preserved in the
 * CliAgentManager so follow-up questions build on prior context.
 */
import { loadConfig } from '../config/loader';
import { CliAgentManager } from '../agents/CliAgentManager';
import { startRepl } from '../ui/repl';
import { fmt, hr } from '../ui/format';
import type { IAgentEventEmitter, AgentMessageEvent } from '@process/task/IAgentEventEmitter';

type SoloOptions = {
  agent?: string;
  workspace?: string;
};

/** Passthrough emitter that writes streaming text directly to stdout */
function makeStdoutEmitter(): IAgentEventEmitter {
  return {
    emitConfirmationAdd: () => {},
    emitConfirmationUpdate: () => {},
    emitConfirmationRemove: () => {},
    emitMessage(_cid: string, event: AgentMessageEvent) {
      if (event.type === 'text') {
        const text = (event.data as { content?: string })?.content ?? '';
        process.stdout.write(text);
      } else if (event.type === 'status') {
        const status = (event.data as { status?: string })?.status;
        if (status === 'done') {
          // Blank line after each response for readability
          process.stdout.write('\n\n');
        }
      }
    },
  };
}

export async function runSolo(options: SoloOptions = {}): Promise<void> {
  const config = loadConfig();
  const agentKey = options.agent ?? config.defaultAgent;
  const agentConfig = config.agents[agentKey];

  if (!agentConfig) {
    process.stderr.write(
      fmt.red(`Agent "${agentKey}" not configured.\n`) +
        fmt.dim(`Set ANTHROPIC_API_KEY or run: aion config\n`),
    );
    process.exit(1);
  }

  process.stdout.write(
    `\n${fmt.bold('Aion')}  ${fmt.dim('·')}  ${fmt.cyan(agentKey)}  ${fmt.dim(`(${agentConfig.model})`)}\n`,
  );
  process.stdout.write(fmt.dim(hr()) + '\n');
  process.stdout.write(fmt.dim('Type your message and press Enter. Ctrl+C or Ctrl+D to exit.\n\n'));

  const manager = new CliAgentManager(
    `solo-${Date.now()}`,
    agentConfig,
    makeStdoutEmitter(),
    options.workspace,
  );

  await startRepl('>', async (input) => {
    await manager.sendMessage({ content: input });
  });
}
