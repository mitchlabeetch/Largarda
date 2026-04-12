/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cross-backend permission level mapping — process/renderer shared.
 *
 * Safe to import from any layer (process, renderer, worker). Has no DOM or
 * Node-specific dependencies.
 *
 * ## 4-level abstraction
 *
 *   L0 Locked   — read-only / plan-only, no tool calls allowed
 *   L1 Default  — standard mode, every operation requires user confirmation
 *   L2 AutoEdit — file edits auto-approved, shell commands still prompt
 *   L3 FullAuto — bypass all permission checks (YOLO)
 *
 * ## Mapping strategy: "Follow the Leader" (closest match)
 *
 * When the target level has no exact match in a backend, pick the mode whose
 * level is numerically closest to the target.
 *
 * When two modes are equidistant:
 *   - leader is on the permissive side (leaderLevel >= 2) → round UP (more permissive)
 *   - leader is on the strict side     (leaderLevel <= 1) → round DOWN (more strict)
 *
 * This ensures:
 *   1. "leader doesn't pop dialogs → members don't pop dialogs either" (primary guarantee)
 *   2. "leader pops dialogs → members try to pop dialogs too" (secondary, best-effort)
 *
 * ## Equidistant cases in the current backend set
 *
 * | Backend   | Target | Available       | leaderLevel | Result    |
 * |-----------|--------|-----------------|-------------|-----------|
 * | Qwen      | L2     | L1, L3          | L2 (permissive) | L3 yolo  |
 * | Cursor    | L2     | L0, L3          | L2 (permissive) | L3 agent |
 * | Cursor    | L2     | L0, L3          | L1 (strict)     | L0 plan  |
 * | OpenCode  | L1     | L0, L2          | L1 (strict)     | L0 plan  |
 * | OpenCode  | L1     | L0, L2          | L2 (permissive) | L2 build |
 *
 * ## Reverse scenario (extension point)
 *
 * If a future backend only exposes a "yolo" mode, mapLeaderModeToMemberMode
 * would map even a strict L0 leader to yolo. A Manager-layer reverse
 * interceptor would be needed to clamp results to the leader's level.
 * That interceptor is NOT yet implemented — this comment marks the extension point.
 *
 * ## Per-leader mapping tables (for quick reference)
 *
 * ### Leader = Claude
 * | Leader mode        | Level | Gemini    | Codex    | Qwen    | iFlow   | Aionrs    | Cursor  | OpenCode |
 * |--------------------|-------|-----------|----------|---------|---------|-----------|---------|----------|
 * | plan               | L0    | default↓  | default↓ | default↓| plan    | default↓  | ask     | plan     |
 * | default            | L1    | default   | default  | default | default | default   | plan↓   | plan↓    |
 * | dontAsk            | L3    | yolo      | yolo     | yolo    | yolo    | yolo      | agent   | build⚠   |
 * | acceptEdits        | L2    | autoEdit  | autoEdit | yolo↑   | smart   | auto_edit | agent↑  | build    |
 * | bypassPermissions  | L3    | yolo      | yolo     | yolo    | yolo    | yolo      | agent   | build⚠   |
 *
 * ### Leader = Gemini
 * | Leader mode | Level | Claude             | Codex    | Qwen    | iFlow  | Aionrs    | Cursor  | OpenCode |
 * |-------------|-------|--------------------|----------|---------|--------|-----------|---------|----------|
 * | default     | L1    | default            | default  | default | default| default   | plan↓   | plan↓    |
 * | autoEdit    | L2    | acceptEdits        | autoEdit | yolo↑   | smart  | auto_edit | agent↑  | build    |
 * | yolo        | L3    | bypassPermissions  | yolo     | yolo    | yolo   | yolo      | agent   | build⚠   |
 *
 * ↑ = rounded up (more permissive) ↓ = rounded down (more strict)
 * ⚠ = member ceiling below leader level; Manager layer must auto-approve
 */

// ---------------------------------------------------------------------------
// Permission level constants
// ---------------------------------------------------------------------------

export const PermissionLevel = {
  /** Read-only / plan-only. No file edits, no shell commands. */
  L0_LOCKED: 0,
  /** Standard mode: every tool call requires user confirmation. */
  L1_DEFAULT: 1,
  /** Auto-approve file edits; shell commands still prompt. */
  L2_AUTO_EDIT: 2,
  /** Full auto: bypass all permission checks. */
  L3_FULL_AUTO: 3,
} as const;

export type PermissionLevelValue = (typeof PermissionLevel)[keyof typeof PermissionLevel];

// ---------------------------------------------------------------------------
// Mode → Level mapping per backend
// ---------------------------------------------------------------------------

const _modeToLevel: Record<string, Record<string, PermissionLevelValue>> = {
  claude: {
    plan: PermissionLevel.L0_LOCKED,
    default: PermissionLevel.L1_DEFAULT,
    acceptEdits: PermissionLevel.L2_AUTO_EDIT,
    // bypassPermissions must come BEFORE dontAsk so it becomes the canonical L3 mode.
    // When other backends map to claude member at L3, we want "auto-approve everything"
    // (bypassPermissions), not "reject non-matching rules" (dontAsk).
    bypassPermissions: PermissionLevel.L3_FULL_AUTO,
    // dontAsk = "approve pre-approved rules, reject everything else, never prompt"
    // Same L3 level (user intent is "don't bother me"), but NOT canonical for reverse mapping.
    dontAsk: PermissionLevel.L3_FULL_AUTO,
    // Legacy alias used by older ACP versions
    auto: PermissionLevel.L3_FULL_AUTO,
  },
  gemini: {
    default: PermissionLevel.L1_DEFAULT,
    autoEdit: PermissionLevel.L2_AUTO_EDIT,
    yolo: PermissionLevel.L3_FULL_AUTO,
  },
  codex: {
    default: PermissionLevel.L1_DEFAULT,
    autoEdit: PermissionLevel.L2_AUTO_EDIT,
    yolo: PermissionLevel.L3_FULL_AUTO,
    yoloNoSandbox: PermissionLevel.L3_FULL_AUTO,
  },
  qwen: {
    default: PermissionLevel.L1_DEFAULT,
    yolo: PermissionLevel.L3_FULL_AUTO,
    // No L0, no L2
  },
  iflow: {
    plan: PermissionLevel.L0_LOCKED,
    default: PermissionLevel.L1_DEFAULT,
    smart: PermissionLevel.L2_AUTO_EDIT,
    yolo: PermissionLevel.L3_FULL_AUTO,
  },
  aionrs: {
    default: PermissionLevel.L1_DEFAULT,
    auto_edit: PermissionLevel.L2_AUTO_EDIT,
    yolo: PermissionLevel.L3_FULL_AUTO,
  },
  cursor: {
    ask: PermissionLevel.L0_LOCKED,
    plan: PermissionLevel.L0_LOCKED,
    // agent = full tool access (like YOLO), maps to L3
    agent: PermissionLevel.L3_FULL_AUTO,
  },
  opencode: {
    plan: PermissionLevel.L0_LOCKED,
    // build = construction mode with file edits, maps to L2
    build: PermissionLevel.L2_AUTO_EDIT,
  },
  // codebuddy shares Claude's ACP mode strings
  codebuddy: {
    default: PermissionLevel.L1_DEFAULT,
    acceptEdits: PermissionLevel.L2_AUTO_EDIT,
    bypassPermissions: PermissionLevel.L3_FULL_AUTO,
  },
};

// ---------------------------------------------------------------------------
// Level → Mode: dynamic closest-match with direction tiebreak
// ---------------------------------------------------------------------------

/**
 * For each backend, list available (level, mode) pairs sorted ascending by level.
 * Built once from _modeToLevel to avoid duplication.
 */
const _levelOptions: Record<string, Array<{ level: PermissionLevelValue; mode: string }>> = {};

for (const [backend, modeMap] of Object.entries(_modeToLevel)) {
  const seen = new Map<PermissionLevelValue, string>();
  for (const [mode, level] of Object.entries(modeMap)) {
    // For duplicate levels keep the first (most canonical) mode name
    if (!seen.has(level)) seen.set(level, mode);
  }
  _levelOptions[backend] = Array.from(seen.entries())
    .map(([level, mode]) => ({ level, mode }))
    .toSorted((a, b) => a.level - b.level);
}

/**
 * Get the best available mode for a backend at the given target permission level.
 *
 * Uses closest-match with direction tiebreak:
 *   - Exact match → return it.
 *   - One candidate is strictly closer → return that one.
 *   - Equal distance (equidistant) → leaderLevel >= 2 picks the more permissive;
 *     leaderLevel <= 1 picks the more strict. Falls back to more strict when
 *     leaderLevel is undefined.
 *
 * @param backend      Member backend identifier (e.g. 'cursor', 'opencode').
 * @param targetLevel  The abstract level we want to match.
 * @param leaderLevel  The leader's level, used only when candidates are equidistant.
 */
export function getLevelMode(
  backend: string,
  targetLevel: PermissionLevelValue,
  leaderLevel?: PermissionLevelValue
): string {
  const options = _levelOptions[backend];
  if (!options || options.length === 0) return 'default';

  // Exact match fast-path
  const exact = options.find((o) => o.level === targetLevel);
  if (exact) return exact.mode;

  // Find candidates just below and just above the target
  let below: { level: PermissionLevelValue; mode: string } | undefined;
  let above: { level: PermissionLevelValue; mode: string } | undefined;
  for (const o of options) {
    if (o.level < targetLevel) below = o;
    else if (o.level > targetLevel && above === undefined) above = o;
  }

  if (!below && above) return above.mode; // only option above
  if (!above && below) return below.mode; // only option below

  if (below && above) {
    const distBelow = targetLevel - below.level;
    const distAbove = above.level - targetLevel;
    if (distBelow < distAbove) return below.mode; // strictly closer below
    if (distAbove < distBelow) return above.mode; // strictly closer above
    // Equidistant: direction determined by leader bias
    const permissiveBias = leaderLevel !== undefined ? leaderLevel >= PermissionLevel.L2_AUTO_EDIT : false;
    return permissiveBias ? above.mode : below.mode;
  }

  return 'default';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a backend's raw mode string to an abstract PermissionLevel.
 * Unknown modes fall back to L1_DEFAULT (safest assumption for unknown backends).
 */
export function getModeLevel(backend: string, mode: string): PermissionLevelValue {
  return _modeToLevel[backend]?.[mode] ?? PermissionLevel.L1_DEFAULT;
}

/**
 * Get the maximum permission level a backend can natively express.
 * Derived from _modeToLevel (not _levelOptions) so that static mode
 * registrations are the source of truth, not rounding artefacts.
 *
 * Used by Manager-layer clamping: when member ceiling < leader level,
 * the Manager auto-approves remaining requests so users never see dialogs.
 */
export function getMaxAvailableLevel(backend: string): PermissionLevelValue {
  const map = _modeToLevel[backend];
  if (!map) return PermissionLevel.L1_DEFAULT;
  let max: PermissionLevelValue = PermissionLevel.L1_DEFAULT;
  for (const level of Object.values(map)) {
    if (level > max) max = level;
  }
  return max;
}

/**
 * Map a team leader's current mode to the equivalent mode for a member backend.
 *
 * Steps:
 *   1. leaderMode + leaderBackend  → abstract PermissionLevel (leaderLevel)
 *   2. leaderLevel + memberBackend → memberMode  (closest match, direction aware)
 *
 * @example
 *   mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'gemini')  // → 'yolo'
 *   mapLeaderModeToMemberMode('claude', 'acceptEdits',       'codex')   // → 'autoEdit'
 *   mapLeaderModeToMemberMode('claude', 'acceptEdits',       'qwen')    // → 'yolo'  (L2 equidist→permissive)
 *   mapLeaderModeToMemberMode('claude', 'default',           'cursor')  // → 'plan'  (L1→L0 closer than L3)
 *   mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'cursor')  // → 'agent' (L3 exact)
 *   mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'opencode')// → 'build' (ceiling L2, ⚠ needs fallback)
 *   mapLeaderModeToMemberMode('gemini', 'yolo',              'claude')  // → 'bypassPermissions'
 */
export function mapLeaderModeToMemberMode(leaderBackend: string, leaderMode: string, memberBackend: string): string {
  const leaderLevel = getModeLevel(leaderBackend, leaderMode);
  return getLevelMode(memberBackend, leaderLevel, leaderLevel);
}
