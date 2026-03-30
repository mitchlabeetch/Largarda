/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * useAgentRegistry — unified Agent Identity registry hook
 * Merges all agent sources into a single Map<agentId, AgentIdentity>
 */

import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/config/storage';
import { resolveLocaleKey } from '@/common/utils';
import { ACP_BACKENDS_ALL } from '@/common/types/acpTypes';
import type { AgentIdentity } from '@/renderer/utils/model/agentIdentity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

type AcpBackendConfig = {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  avatar?: string;
  isPreset?: boolean;
  enabled?: boolean;
  context?: string;
  presetAgentType?: string;
  source?: string;
  description?: string;
  descriptionI18n?: Record<string, string>;
};

/**
 * Fetch and merge custom agents from config storage and extension-contributed assistants.
 * Keyed as 'acp.customAgents' so callers can invalidate via SWR mutate('acp.customAgents').
 */
async function fetchCustomAgents(): Promise<AcpBackendConfig[]> {
  const [agents, extAssistants] = await Promise.all([
    ConfigStorage.get('acp.customAgents'),
    ipcBridge.extensions.getAssistants.invoke().catch(() => [] as Record<string, unknown>[]),
  ]);

  const list = ((agents || []) as AcpBackendConfig[]).filter((a) => a.enabled !== false);

  // Merge extension-contributed assistants
  for (const ext of extAssistants) {
    const id = typeof ext.id === 'string' ? ext.id : '';
    if (!id || list.some((a) => a.id === id)) continue;
    list.push({
      id,
      name: typeof ext.name === 'string' ? ext.name : id,
      nameI18n: ext.nameI18n as Record<string, string> | undefined,
      avatar: typeof ext.avatar === 'string' ? ext.avatar : undefined,
      isPreset: true,
      enabled: true,
      presetAgentType: typeof ext.presetAgentType === 'string' ? ext.presetAgentType : undefined,
      context: typeof ext.context === 'string' ? ext.context : undefined,
      description: typeof ext.description === 'string' ? ext.description : undefined,
      descriptionI18n: ext.descriptionI18n as Record<string, string> | undefined,
    });
  }

  return list;
}

/**
 * Hook that builds a unified agent registry from all sources:
 * - CLI agents (ACP_BACKENDS_ALL + Gemini)
 * - Custom/preset agents (acp.customAgents config — includes user-enabled presets)
 *
 * Only enabled agents are included, matching the homepage (GuidPage) behavior.
 * Returns a Map<agentId, AgentIdentity> for O(1) lookups.
 */
export function useAgentRegistry(): Map<string, AgentIdentity> {
  const { i18n } = useTranslation();
  const localeKey = resolveLocaleKey(i18n.language);

  const { data: customAgents = [] } = useSWR<AcpBackendConfig[]>('acp.customAgents', fetchCustomAgents, {
    revalidateOnFocus: false,
  });

  return useMemo(() => {
    const registry = new Map<string, AgentIdentity>();

    // 1. CLI agents (temporary employees) — Gemini first
    registry.set('gemini', {
      id: 'gemini',
      name: 'Gemini CLI',
      employeeType: 'temporary',
      source: 'cli_agent',
      backendType: 'gemini',
    });
    for (const [key, config] of Object.entries(ACP_BACKENDS_ALL)) {
      if (!config.enabled || !config.cliCommand) continue;
      registry.set(key, {
        id: key,
        name: config.name,
        employeeType: 'temporary',
        source: 'cli_agent',
        backendType: key,
      });
    }

    // 2. Custom agents (permanent employees — user-enabled presets, user-created, dispatch-saved)
    // This is the same source as the homepage (GuidPage), so agent count and names match.
    for (const agent of customAgents) {
      const id = `custom:${agent.id}`;
      const source = agent.source === 'dispatch_teammate' ? 'dispatch_teammate' : 'custom';
      const name = agent.nameI18n?.[localeKey] || agent.nameI18n?.['en-US'] || agent.name;
      const description =
        agent.descriptionI18n?.[localeKey] || agent.descriptionI18n?.['en-US'] || agent.description;
      registry.set(id, {
        id,
        name,
        avatar: agent.avatar,
        employeeType: 'permanent',
        source,
        backendType: agent.presetAgentType,
        description,
      });
    }

    return registry;
  }, [customAgents, localeKey]);
}
