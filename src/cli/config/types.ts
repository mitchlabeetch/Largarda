/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export type AgentProvider = 'anthropic' | 'gemini' | 'openai';

export type AgentConfig = {
  provider: AgentProvider;
  model: string;
  apiKey: string;
};

export type AionCliConfig = {
  defaultAgent: string;
  agents: Record<string, AgentConfig>;
  team?: {
    concurrency?: number;
    timeoutMs?: number;
  };
};
