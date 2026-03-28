/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AionCliConfig } from './types';

export const CONFIG_DIR = join(homedir(), '.aion');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const BASE_DEFAULT: AionCliConfig = {
  defaultAgent: 'claude',
  agents: {},
};

export function loadConfig(): AionCliConfig {
  const file = loadFileConfig();
  return applyEnvOverrides(file);
}

function loadFileConfig(): AionCliConfig {
  if (!existsSync(CONFIG_FILE)) return { ...BASE_DEFAULT, agents: {} };
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AionCliConfig>;
    return { ...BASE_DEFAULT, ...parsed, agents: parsed.agents ?? {} };
  } catch {
    return { ...BASE_DEFAULT, agents: {} };
  }
}

/**
 * Auto-populate agents from well-known environment variables so that
 * users can run `aion` immediately after setting ANTHROPIC_API_KEY without
 * any manual config step.
 */
function applyEnvOverrides(config: AionCliConfig): AionCliConfig {
  const result: AionCliConfig = { ...config, agents: { ...config.agents } };

  if (process.env.ANTHROPIC_API_KEY && !result.agents['claude']) {
    result.agents['claude'] = {
      provider: 'anthropic',
      model: 'claude-opus-4-6',
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }

  if ((process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY) && !result.agents['gemini']) {
    result.agents['gemini'] = {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY)!,
    };
  }

  // Ensure defaultAgent points to an existing agent
  if (!result.agents[result.defaultAgent]) {
    const first = Object.keys(result.agents)[0];
    if (first) result.defaultAgent = first;
  }

  return result;
}

export function saveConfig(config: AionCliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
