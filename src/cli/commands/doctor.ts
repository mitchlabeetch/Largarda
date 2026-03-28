/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../config/loader';
import { fmt } from '../ui/format';

export async function runDoctor(): Promise<void> {
  process.stdout.write(`\n${fmt.bold('Aion Doctor')} — checking your setup\n\n`);

  // ── Environment variables ────────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  process.stdout.write(fmt.bold('Environment:\n'));
  process.stdout.write(
    `  ANTHROPIC_API_KEY  ${anthropicKey ? fmt.green('✓ set') : fmt.dim('not set')}\n`,
  );
  process.stdout.write(
    `  GEMINI_API_KEY     ${geminiKey ? fmt.green('✓ set') : fmt.dim('not set')}\n`,
  );

  // ── Configured agents ────────────────────────────────────────────────────
  const config = loadConfig();
  process.stdout.write('\n' + fmt.bold('Configured agents:\n'));
  if (Object.keys(config.agents).length === 0) {
    process.stdout.write(fmt.dim('  (none)\n'));
  } else {
    for (const [name, agent] of Object.entries(config.agents)) {
      const hasKey = !!agent.apiKey;
      const isDefault = name === config.defaultAgent ? fmt.green(' [default]') : '';
      process.stdout.write(
        `  ${fmt.cyan(name)}${isDefault}: ${agent.model} — ${
          hasKey ? fmt.green('key present') : fmt.red('no key')
        }\n`,
      );
    }
  }

  // ── Connectivity test ────────────────────────────────────────────────────
  const anthropicAgents = Object.entries(config.agents).filter(
    ([_, a]) => a.provider === 'anthropic' && a.apiKey,
  );

  if (anthropicAgents.length > 0) {
    process.stdout.write('\n' + fmt.bold('Connectivity:\n'));
    for (const [name, agent] of anthropicAgents) {
      process.stdout.write(`  ${fmt.cyan(name)} (${agent.model})... `);
      try {
        const client = new Anthropic({ apiKey: agent.apiKey });
        await client.messages.create({
          model: agent.model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        });
        process.stdout.write(fmt.green('✓ OK\n'));
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 80) : String(err);
        process.stdout.write(fmt.red(`✗ ${msg}\n`));
      }
    }
  }

  process.stdout.write('\n' + fmt.bold('Usage:\n'));
  process.stdout.write(`  ${fmt.cyan('aion')}                     Solo interactive mode\n`);
  process.stdout.write(
    `  ${fmt.cyan('aion team --goal "..."')}  Multi-agent team (3 parallel agents)\n`,
  );
  process.stdout.write(`  ${fmt.cyan('aion config')}              Show config & setup guide\n\n`);
}
