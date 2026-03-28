/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// src/process/task/agentTypes.ts

export type AgentType = 'gemini' | 'acp' | 'codex' | 'openclaw-gateway' | 'nanobot' | 'remote' | 'dispatch';

/**
 * Agent lifecycle status.
 * Existing agents (Gemini, ACP, etc.) use: pending -> running -> finished.
 * Dispatch child agents additionally use 'idle' (completed, transcript readable)
 * and 'failed' (execution error).
 */
export type AgentStatus = 'pending' | 'running' | 'idle' | 'finished' | 'failed' | 'cancelled';

export interface BuildConversationOptions {
  /** Force yolo mode (auto-approve all tool calls) */
  yoloMode?: boolean;
  /** Skip task cache — create a new isolated instance */
  skipCache?: boolean;
  /** Phase 1: dispatch session role */
  dispatchSessionType?: 'dispatcher' | 'dispatch_child' | 'normal';
  /** Phase 1: parent session ID (only for dispatch_child) */
  parentSessionId?: string;
}
