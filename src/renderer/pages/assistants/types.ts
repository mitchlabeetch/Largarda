/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export type AgentTab = 'all' | 'assistant' | 'local' | 'remote';

export type AssistantCardItem = {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  description?: string;
  descriptionI18n?: Record<string, string>;
  avatarSrc: string | null;
  avatarEmoji?: string;
  agentKey: string;
  tab: Exclude<AgentTab, 'all'>;
  isPreset: boolean;
  isBuiltin?: boolean;
  canEdit: boolean;
  editPath?: string;
};
