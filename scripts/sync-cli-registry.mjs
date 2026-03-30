/**
 * sync-cli-registry.mjs
 *
 * Reads ACP_BACKENDS_ALL from AionUi/src/common/types/acpTypes.ts and
 * regenerates src/cli/config/cliRegistry.ts.
 *
 * Usage:
 *   npm run sync:registry
 *
 * Run this whenever AionUi adds new CLI entries to acpTypes.ts.
 * The provider mapping (claude-cli / codex-cli / null) must be maintained manually
 * since aion CLI uses --print mode, not ACP.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AIONUI_TYPES = resolve(__dirname, '../../AionUi/src/common/types/acpTypes.ts');
const REGISTRY_OUT = resolve(__dirname, '../src/cli/config/cliRegistry.ts');

// Known provider mappings for aion CLI (--print mode, not ACP)
// Entries not listed here default to null (detected but not usable)
const PROVIDER_MAP = {
  claude:    'claude-cli',
  codebuddy: 'claude-cli', // same --print interface as claude
  codex:     'codex-cli',
};

function extractClis(src) {
  // Extract cliCommand values from ACP_BACKENDS_ALL entries
  const entries = [];
  const blockRe = /(\w+):\s*\{[^}]*cliCommand:\s*'([^']+)'[^}]*name:\s*'([^']+)'[^}]*\}/gs;
  // Simpler regex: find all  key: { ... cliCommand: '...' ... name: '...' ... }
  // We'll do it differently: find all cliCommand entries with their surrounding context

  // Match patterns like:  someKey: {  ...  cliCommand: 'binary',  ...  name: 'Name',  ... }
  const re = /(\w[\w-]*):\s*\{(?:[^{}]|\{[^}]*\})*?cliCommand:\s*'([^']+)'(?:[^{}]|\{[^}]*\})*?\}/gs;
  let m;
  while ((m = re.exec(src)) !== null) {
    const key = m[1];
    const bin = m[2];
    if (key === 'gemini' || key === 'custom') continue; // excluded from ACP CLI list
    // Extract name from same block
    const block = m[0];
    const nameMatch = /name:\s*'([^']+)'/.exec(block);
    const name = nameMatch ? nameMatch[1] : key;
    entries.push({ key, bin, name });
  }
  return entries;
}

let src;
try {
  src = readFileSync(AIONUI_TYPES, 'utf-8');
} catch {
  console.error(`Cannot read ${AIONUI_TYPES}`);
  console.error('Make sure AionUi project is at ../AionUi relative to aion-agent-team.');
  process.exit(1);
}

const clis = extractClis(src);
if (clis.length === 0) {
  console.error('No CLI entries found — regex may need updating');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

const supported = clis.filter((e) => PROVIDER_MAP[e.key]);
const apcOnly = clis.filter((e) => !PROVIDER_MAP[e.key]);

const supportedLines = supported
  .map((e) => `  { key: '${e.key}', bin: '${e.bin}', name: '${e.name}', provider: '${PROVIDER_MAP[e.key]}' },`)
  .join('\n');

const acpLines = apcOnly
  .map((e) => `  { key: '${e.key}', bin: '${e.bin}', name: '${e.name}', provider: null },`)
  .join('\n');

const output = `/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI Registry — single source of truth for detectable AI CLI tools.
 *
 * Synced from: AionUi/src/common/types/acpTypes.ts (ACP_BACKENDS_ALL)
 * To update:   npm run sync:registry
 *
 * provider mapping:
 *   'claude-cli' → spawned via \`--print --dangerously-skip-permissions\`
 *   'codex-cli'  → spawned via \`exec --full-auto --skip-git-repo-check\`
 *   null         → binary detectable but not yet usable in aion CLI (ACP-only in AionUi)
 */

import type { AgentProvider } from './types';

export type CliEntry = {
  /** Agent key used in config and UI */
  key: string;
  /** Binary name passed to \`which\` for detection */
  bin: string;
  /** Display name shown in UI */
  name: string;
  /**
   * How aion CLI invokes this tool.
   * null = detected but not yet supported (ACP-only).
   */
  provider: AgentProvider | null;
};

/**
 * All known AI CLI tools.
 * Entries with provider=null are detected (shown in doctor) but cannot be used yet.
 * Last synced: ${today}
 */
export const CLI_REGISTRY: readonly CliEntry[] = [
  // ── Fully supported ───────────────────────────────────────────────────────
${supportedLines}

  // ── Detected only (ACP-only, not yet usable in aion CLI) ─────────────────
${acpLines}
];

/** Only entries that aion CLI can actually invoke */
export const SUPPORTED_CLIS = CLI_REGISTRY.filter((e) => e.provider !== null) as Array<CliEntry & { provider: AgentProvider }>;
`;

writeFileSync(REGISTRY_OUT, output, 'utf-8');
console.log(`✓ Synced ${clis.length} CLI entries (${supported.length} supported, ${apcOnly.length} ACP-only)`);
console.log(`  → ${REGISTRY_OUT}`);
