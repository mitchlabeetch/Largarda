/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/config/storage';
import { resolveLocaleKey } from '@/common/utils';
import {
  isExtensionAssistant,
  normalizeExtensionAssistants,
} from '@/renderer/pages/settings/AgentSettings/AssistantManagement/assistantUtils';
import type { AssistantListItem } from '@/renderer/pages/settings/AgentSettings/AssistantManagement/types';
import { getAgentLogo, resolveAgentLogo } from '@/renderer/utils/model/agentLogo';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { AgentTab, AssistantCardItem } from '../types';

/**
 * Aggregates preset assistants, local ACP agents, and remote agents
 * into a unified AssistantCardItem list with tab-based filtering.
 */
export const useAssistantsPageData = () => {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<AgentTab>('all');
  const localeKey = resolveLocaleKey(i18n.language);

  // Fetch extension-contributed assistants
  const { data: extensionAssistantsRaw } = useSWR('extensions.assistants', () =>
    ipcBridge.extensions.getAssistants.invoke().catch(() => [] as Record<string, unknown>[])
  );

  const normalizedExtAssistants = React.useMemo<AssistantListItem[]>(
    () => normalizeExtensionAssistants(extensionAssistantsRaw || []),
    [extensionAssistantsRaw]
  );

  // Fetch available local ACP agents (reuses GuidPage SWR key)
  const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
    const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
    if (result.success) {
      return result.data.filter((agent) => !(agent.backend === 'gemini' && agent.cliPath));
    }
    return [];
  });

  // Fetch remote agents (reuses GuidPage SWR key)
  const { data: remoteAgentsData } = useSWR('remote-agents.list', () => ipcBridge.remoteAgent.list.invoke());

  // Load preset assistants (from config storage)
  const { data: configAssistants } = useSWR('acp.customAgents', async () => {
    const local: AssistantListItem[] = (await ConfigStorage.get('acp.customAgents')) || [];
    return local;
  });

  // Build preset assistant items (isPreset=true, tab='assistant')
  const assistantItems = useMemo<AssistantCardItem[]>(() => {
    const baseList: AssistantListItem[] = configAssistants || [];
    const merged = [...baseList];
    for (const ext of normalizedExtAssistants) {
      if (!merged.some((a) => a.id === ext.id)) {
        merged.push(ext);
      }
    }

    return merged
      .filter((a) => a.isPreset)
      .map((a): AssistantCardItem => {
        const isExt = isExtensionAssistant(a);
        const resolvedName = (a.nameI18n?.[localeKey] as string | undefined) || a.name;
        const resolvedDescription = (a.descriptionI18n?.[localeKey] as string | undefined) || a.description;
        const avatarValue = a.avatar?.trim();
        const avatarSrc = resolveAgentLogo({ icon: avatarValue, backend: a.presetAgentType as string });

        return {
          id: a.id,
          name: resolvedName,
          nameI18n: a.nameI18n as Record<string, string> | undefined,
          description: resolvedDescription,
          descriptionI18n: a.descriptionI18n as Record<string, string> | undefined,
          avatarSrc,
          avatarEmoji: avatarValue,
          agentKey: `custom:${a.id}`,
          tab: 'assistant',
          isPreset: true,
          isBuiltin: a.isBuiltin,
          canEdit: !isExt && !a.isBuiltin,
          editPath: `/settings/assistants`,
        };
      });
  }, [configAssistants, normalizedExtAssistants, localeKey]);

  // Build local agent items (isPreset=false, tab='local')
  const localAgentItems = useMemo<AssistantCardItem[]>(() => {
    const agents = availableAgentsData || [];
    return agents
      .filter((a) => !a.isPreset && a.backend !== 'remote')
      .map((a): AssistantCardItem => {
        const logo = resolveAgentLogo({
          icon: a.avatar,
          backend: a.backend,
          customAgentId: a.customAgentId,
          isExtension: a.isExtension,
        });
        const agentKey = a.customAgentId ? `custom:${a.customAgentId}` : a.backend;
        return {
          id: a.customAgentId || a.backend,
          name: a.name,
          avatarSrc: logo,
          agentKey,
          tab: 'local',
          isPreset: false,
          canEdit: false,
        };
      });
  }, [availableAgentsData]);

  // Build remote agent items (tab='remote')
  const remoteAgentItems = useMemo<AssistantCardItem[]>(() => {
    const remotes = remoteAgentsData || [];
    return remotes.map((ra): AssistantCardItem => {
      const logo = getAgentLogo('remote');
      return {
        id: ra.id,
        name: ra.name,
        avatarSrc: ra.avatar || logo,
        agentKey: `remote:${ra.id}`,
        tab: 'remote',
        isPreset: false,
        canEdit: false,
      };
    });
  }, [remoteAgentsData]);

  // All items combined
  const items = useMemo<AssistantCardItem[]>(
    () => [...assistantItems, ...localAgentItems, ...remoteAgentItems],
    [assistantItems, localAgentItems, remoteAgentItems]
  );

  const setActiveTabHandler = useCallback((tab: AgentTab) => {
    setActiveTab(tab);
  }, []);

  const filteredItems = useMemo<AssistantCardItem[]>(() => {
    if (activeTab === 'all') return items;
    return items.filter((item) => item.tab === activeTab);
  }, [items, activeTab]);

  const tabCounts = useMemo(
    () => ({
      all: items.length,
      assistant: assistantItems.length,
      local: localAgentItems.length,
      remote: remoteAgentItems.length,
    }),
    [items.length, assistantItems.length, localAgentItems.length, remoteAgentItems.length]
  );

  return {
    items,
    filteredItems,
    activeTab,
    setActiveTab: setActiveTabHandler,
    tabCounts,
  };
};
