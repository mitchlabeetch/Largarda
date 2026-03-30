/**
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
 *   'claude-cli' → spawned via `--print --dangerously-skip-permissions`
 *   'codex-cli'  → spawned via `exec --full-auto --skip-git-repo-check`
 *   null         → binary detectable but not yet usable in aion CLI (ACP-only in AionUi)
 */

import type { AgentProvider } from './types';

export type CliEntry = {
  /** Agent key used in config and UI */
  key: string;
  /** Binary name passed to `which` for detection */
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
 * Last synced: 2026-03-30
 */
export const CLI_REGISTRY: readonly CliEntry[] = [
  // ── Fully supported ───────────────────────────────────────────────────────
  { key: 'claude', bin: 'claude', name: 'Claude Code', provider: 'claude-cli' },
  { key: 'codex', bin: 'codex', name: 'Codex', provider: 'codex-cli' },
  { key: 'codebuddy', bin: 'codebuddy', name: 'CodeBuddy', provider: 'claude-cli' },

  // ── Detected only (ACP-only, not yet usable in aion CLI) ─────────────────
  { key: 'qwen', bin: 'qwen', name: 'Qwen Code', provider: null },
  { key: 'iflow', bin: 'iflow', name: 'iFlow CLI', provider: null },
  { key: 'goose', bin: 'goose', name: 'Goose', provider: null },
  { key: 'auggie', bin: 'auggie', name: 'Augment Code', provider: null },
  { key: 'kimi', bin: 'kimi', name: 'Kimi CLI', provider: null },
  { key: 'opencode', bin: 'opencode', name: 'OpenCode', provider: null },
  { key: 'droid', bin: 'droid', name: 'Factory Droid', provider: null },
  { key: 'copilot', bin: 'copilot', name: 'GitHub Copilot', provider: null },
  { key: 'qoder', bin: 'qodercli', name: 'Qoder CLI', provider: null },
  { key: 'vibe', bin: 'vibe-acp', name: 'Mistral Vibe', provider: null },
  { key: 'nanobot', bin: 'nanobot', name: 'Nano Bot', provider: null },
  { key: 'cursor', bin: 'agent', name: 'Cursor Agent', provider: null },
  { key: 'kiro', bin: 'kiro-cli', name: 'Kiro', provider: null },
];

/** Only entries that aion CLI can actually invoke */
export const SUPPORTED_CLIS = CLI_REGISTRY.filter((e) => e.provider !== null) as Array<CliEntry & { provider: AgentProvider }>;
