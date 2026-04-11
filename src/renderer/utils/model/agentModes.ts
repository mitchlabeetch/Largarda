/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CODEX_MODE_AUTO_EDIT,
  CODEX_MODE_FULL_AUTO,
  CODEX_MODE_FULL_AUTO_NO_SANDBOX,
} from '@/common/types/codex/codexModes';
import type { AcpSessionConfigOption } from '@/common/types/acpTypes';

/**
 * Agent mode option interface
 * 代理模式选项接口
 */
export interface AgentModeOption {
  /** Mode value sent to agent / 发送给代理的模式值 */
  value: string;
  /** Display label matching CLI display / 与 CLI 显示一致的标签 */
  label: string;
  /** Optional description / 可选描述 */
  description?: string;
}

/**
 * Fallback agent modes configuration — used when cachedConfigOptions are unavailable.
 * Maps backend type to available modes.
 * Labels match CLI display text exactly — no i18n.
 *
 * Prefer reading modes dynamically from configOptions (category: 'mode') returned by
 * session/new, cached in acp.cachedConfigOptions. This hardcoded map serves as a
 * fallback for backends that don't yet expose modes via configOptions or when the
 * cache is empty (e.g., first launch before any session).
 *
 * Note:
 * - Claude: supports session/set_mode via ACP
 *   - Modes: default, acceptEdits, plan, auto, bypassPermissions (YOLO), dontAsk
 * - Qwen: ACP session/set_mode returns success but does not enforce plan mode behavior.
 *   Plan mode disabled until upstream fix. See https://github.com/QwenLM/qwen-code/issues/1806
 * - OpenCode: plan/build modes via ACP session/set_mode (no yolo support)
 * - iFlow: smart/yolo/default/plan modes via ACP session/set_mode (verified)
 * - Gemini: supports default/autoEdit/yolo (auto-approve at manager layer, not via ACP)
 * - Codex: default modes stay sandboxed; a dedicated unsafe full-auto mode disables the sandbox
 * - Goose: mode set at startup only, not during session
 * - Cursor: agent/plan/ask modes via ACP session/set_mode (verified via `agent acp` session/new response)
 */
export const FALLBACK_AGENT_MODES: Record<string, AgentModeOption[]> = {
  claude: [
    { value: 'default', label: 'Default' },
    { value: 'acceptEdits', label: 'Accept Edits', description: 'Auto-approve file edits, prompt for commands' },
    { value: 'plan', label: 'Plan' },
    { value: 'bypassPermissions', label: 'YOLO' },
    { value: 'dontAsk', label: "Don't Ask", description: 'Block all actions except pre-approved rules' },
  ],
  // Qwen: ACP session/set_mode returns success but does not enforce plan mode behavior.
  // Plan mode disabled until upstream fix. See https://github.com/QwenLM/qwen-code/issues/1806
  qwen: [
    { value: 'default', label: 'Default' },
    { value: 'yolo', label: 'YOLO' },
  ],
  opencode: [
    { value: 'build', label: 'Build' },
    { value: 'plan', label: 'Plan' },
  ],
  iflow: [
    { value: 'default', label: 'Default' },
    { value: 'smart', label: 'Smart' },
    { value: 'plan', label: 'Plan' },
    { value: 'yolo', label: 'YOLO' },
  ],
  gemini: [
    { value: 'default', label: 'Default' },
    { value: 'autoEdit', label: 'Auto-Accept Edits' },
    { value: 'yolo', label: 'YOLO' },
  ],
  aionrs: [
    { value: 'default', label: 'Default' },
    { value: 'auto_edit', label: 'Auto-Accept Edits' },
    { value: 'yolo', label: 'YOLO' },
  ],
  codex: [
    { value: 'default', label: 'Plan' },
    { value: CODEX_MODE_AUTO_EDIT, label: 'Auto Edit' },
    { value: CODEX_MODE_FULL_AUTO, label: 'Full Auto' },
    { value: CODEX_MODE_FULL_AUTO_NO_SANDBOX, label: 'Full Auto (No Sandbox)' },
  ],
  cursor: [
    { value: 'agent', label: 'Agent', description: 'Full agent capabilities with tool access' },
    { value: 'plan', label: 'Plan', description: 'Read-only mode for planning and designing before implementation' },
    { value: 'ask', label: 'Ask', description: 'Q&A mode - no edits or command execution' },
  ],
};

/**
 * Extract mode options from ACP configOptions (category: 'mode').
 * Returns null if configOptions is empty/undefined or contains no mode option,
 * signaling the caller to fall back to FALLBACK_AGENT_MODES.
 */
function extractModesFromConfigOptions(configOptions: AcpSessionConfigOption[] | undefined): AgentModeOption[] | null {
  if (!configOptions || configOptions.length === 0) return null;
  const modeOption = configOptions.find((opt) => opt.category === 'mode' && opt.type === 'select');
  if (!modeOption?.options || modeOption.options.length === 0) return null;
  return modeOption.options.map((opt) => ({
    value: opt.value,
    label: opt.label || opt.name || opt.value,
  }));
}

/**
 * Get available modes for a given backend.
 * Prefers dynamic modes from cachedConfigOptions; falls back to FALLBACK_AGENT_MODES.
 * Returns empty array if backend doesn't support mode switching.
 *
 * @param backend - Agent backend type
 * @param configOptions - Optional cached config options from session/new
 * @returns Array of available modes
 */
export function getAgentModes(
  backend: string | undefined,
  configOptions?: AcpSessionConfigOption[]
): AgentModeOption[] {
  if (!backend) return [];
  const dynamic = extractModesFromConfigOptions(configOptions);
  if (dynamic) return dynamic;
  return FALLBACK_AGENT_MODES[backend] || [];
}

/**
 * Check if a backend supports mode switching during session.
 * Prefers dynamic detection from configOptions; falls back to FALLBACK_AGENT_MODES.
 *
 * @param backend - Agent backend type
 * @param configOptions - Optional cached config options from session/new
 * @returns true if mode switching is supported
 */
export function supportsModeSwitch(backend: string | undefined, configOptions?: AcpSessionConfigOption[]): boolean {
  if (!backend) return false;
  const dynamic = extractModesFromConfigOptions(configOptions);
  if (dynamic) return dynamic.length > 0;
  return backend in FALLBACK_AGENT_MODES && FALLBACK_AGENT_MODES[backend].length > 0;
}

/**
 * Full-auto mode value per backend.
 * Used by cron jobs to run without permission prompts.
 */
const FULL_AUTO_MODE: Record<string, string> = {
  claude: 'bypassPermissions',
  qwen: 'yolo',
  opencode: 'build',
  iflow: 'yolo',
  gemini: 'yolo',
  aionrs: 'yolo',
  codex: CODEX_MODE_FULL_AUTO,
  cursor: 'agent',
};

/**
 * Get the full-auto mode value for a given backend.
 * Falls back to 'yolo' for unknown backends.
 */
export function getFullAutoMode(backend: string | undefined): string {
  if (!backend) return 'yolo';
  return FULL_AUTO_MODE[backend] || 'yolo';
}

/** @deprecated Use FALLBACK_AGENT_MODES — kept for backward compatibility */
export const AGENT_MODES = FALLBACK_AGENT_MODES;
