/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * aion — Aion CLI entry point
 *
 * Command tree:
 *   aion                              Interactive single-agent mode (default)
 *   aion team [--goal <goal>]         Multi-agent team mode (Orchestrator)
 *   aion team --agents claude,gemini  Multi-MODEL team (Aion differentiator)
 *   aion run <task>                   One-shot task
 *   aion config                       Show config and setup guide
 *   aion doctor                       Check agent availability and connectivity
 *
 * Env vars (auto-detected, no config file needed):
 *   ANTHROPIC_API_KEY   → enables Claude agents
 *   GEMINI_API_KEY      → enables Gemini agents
 */
import { parseArgs } from 'node:util';
import { fmt } from './ui/format';

const VERSION = '1.9.2';

const HELP = `
${fmt.bold('aion')} — Aion CLI  ${fmt.dim(`v${VERSION}`)}

${fmt.bold('Usage:')}
  aion                                   Interactive single-agent chat
  aion team [--goal <text>]              Multi-agent team (3 parallel)
  aion team --agents <k1,k2,k3>          Mixed-model team (Aion-only)
  aion run <task>                        One-shot task execution
  aion config                            Show config & setup guide
  aion doctor                            Check agents & connectivity

${fmt.bold('Options:')}
  ${fmt.cyan('-a, --agent <name>')}        Agent for solo mode  ${fmt.dim('(default: from config)')}
  ${fmt.cyan('-g, --goal <text>')}         Goal for team/run mode
  ${fmt.cyan('    --agents <k1,k2,k3>')}   Agent per sub-task  ${fmt.dim('(comma-separated)')}
  ${fmt.cyan('-c, --concurrency <n>')}     Parallel agents  ${fmt.dim('(default: 3)')}
  ${fmt.cyan('-w, --workspace <dir>')}     Working directory
  ${fmt.cyan('-v, --version')}             Print version
  ${fmt.cyan('-h, --help')}               Show this help

${fmt.bold('Quick start:')}
  ${fmt.dim('export ANTHROPIC_API_KEY=sk-ant-...')}
  ${fmt.cyan('aion')}                              ${fmt.dim('# interactive chat')}
  ${fmt.cyan('aion team --goal "Analyze codebase"')}  ${fmt.dim('# 3-agent team')}
  ${fmt.cyan('aion doctor')}                       ${fmt.dim('# check setup')}

${fmt.bold('Multi-model team (Aion differentiator):')}
  ${fmt.dim('# Configure multiple models:')}
  ${fmt.dim('export ANTHROPIC_API_KEY=sk-ant-...')}
  ${fmt.dim('export GEMINI_API_KEY=...')}

  ${fmt.cyan('aion team --goal "Design a new feature" --agents claude,gemini,claude')}
  ${fmt.dim('#  Researcher[gemini]  Analyst[claude]  Implementer[claude]  — run in parallel')}
`.trim();

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      agent: { type: 'string', short: 'a' },
      goal: { type: 'string', short: 'g' },
      agents: { type: 'string' },
      concurrency: { type: 'string', short: 'c' },
      workspace: { type: 'string', short: 'w' },
      version: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.version) {
    process.stdout.write(`aion v${VERSION}\n`);
    process.exit(0);
  }

  if (values.help) {
    process.stdout.write(HELP + '\n');
    process.exit(0);
  }

  const command = positionals[0];

  switch (command) {
    case 'team': {
      const { runTeam } = await import('./commands/team');
      await runTeam({
        goal: values.goal,
        agents: values.agents,
        concurrency: values.concurrency ? parseInt(values.concurrency, 10) : undefined,
      });
      break;
    }

    case 'run': {
      const task = positionals.slice(1).join(' ') || values.goal;
      if (!task) {
        process.stderr.write(fmt.red('Usage: aion run <task>\n'));
        process.exit(1);
      }
      const { runTeam } = await import('./commands/team');
      await runTeam({ goal: task, concurrency: 1 });
      break;
    }

    case 'config': {
      const { showConfig } = await import('./commands/config');
      await showConfig();
      break;
    }

    case 'doctor': {
      const { runDoctor } = await import('./commands/doctor');
      await runDoctor();
      break;
    }

    case undefined:
    default: {
      const { runSolo } = await import('./commands/solo');
      await runSolo({
        agent: values.agent,
        workspace: values.workspace,
      });
      break;
    }
  }
}

main().catch((err) => {
  process.stderr.write(fmt.red(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`));
  process.exit(1);
});
