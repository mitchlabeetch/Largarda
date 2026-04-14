/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useConversationHistoryContext } from '@/renderer/hooks/context/ConversationHistoryContext';
import { resolveAgentKey } from '../utils/groupingHelpers';
import {
  dispatchWorkspaceExpansionChange,
  readExpandedWorkspaces,
  WORKSPACE_EXPANSION_STORAGE_KEY,
} from './useWorkspaceExpansionState';

const AGENT_COLLAPSE_STORAGE_KEY = 'sider.agentGroups.collapsed';

const readCollapsedAgentGroups = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(AGENT_COLLAPSE_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set<string>(parsed) : new Set();
  } catch {
    return new Set();
  }
};

const writeCollapsedAgentGroups = (collapsed: Set<string>): void => {
  try {
    localStorage.setItem(AGENT_COLLAPSE_STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // ignore
  }
};

export const useConversations = () => {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>(() => readExpandedWorkspaces());
  const [collapsedAgentGroups, setCollapsedAgentGroups] = useState<Set<string>>(() => readCollapsedAgentGroups());
  const { id } = useParams();
  const {
    conversations,
    isConversationGenerating,
    hasCompletionUnread,
    clearCompletionUnread,
    setActiveConversation,
    groupedHistory,
  } = useConversationHistoryContext();

  // Track whether auto-expand has already been performed to avoid
  // re-expanding workspaces after a user manually collapses them (#1156)
  const hasAutoExpandedRef = useRef(false);

  // Scroll active conversation into view.
  // Use double-RAF to wait for async sibling content (e.g. CronJobSiderSection)
  // to finish rendering before calculating scroll position.
  useEffect(() => {
    if (!id) {
      setActiveConversation(null);
      return;
    }

    setActiveConversation(id);
    clearCompletionUnread(id);
    let cancelled = false;
    let outerRafId: number;
    let innerRafId: number;
    outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.getElementById('c-' + id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
    };
  }, [clearCompletionUnread, id, setActiveConversation]);

  // Persist expansion state
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_EXPANSION_STORAGE_KEY, JSON.stringify(expandedWorkspaces));
    } catch {
      // ignore
    }

    dispatchWorkspaceExpansionChange(expandedWorkspaces);
  }, [expandedWorkspaces]);

  const { pinnedConversations, timelineSections } = groupedHistory;

  // Auto-expand all workspaces on first load only (#1156)
  useEffect(() => {
    if (hasAutoExpandedRef.current) return;
    if (expandedWorkspaces.length > 0) {
      hasAutoExpandedRef.current = true;
      return;
    }
    const allWorkspaces: string[] = [];
    timelineSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.type === 'workspace' && item.workspaceGroup) {
          allWorkspaces.push(item.workspaceGroup.workspace);
        }
      });
    });
    if (allWorkspaces.length > 0) {
      setExpandedWorkspaces(allWorkspaces);
      hasAutoExpandedRef.current = true;
    }
  }, [timelineSections]);

  // Derive current valid agent keys from conversations
  const currentAgentKeys = useMemo(() => {
    const keys = new Set<string>();
    conversations.forEach((conv) => keys.add(resolveAgentKey(conv)));
    return keys;
  }, [conversations]);

  // Remove stale collapsed agent group entries that no longer have conversations
  useEffect(() => {
    if (currentAgentKeys.size === 0) return;
    setCollapsedAgentGroups((prev) => {
      const filtered = new Set([...prev].filter((key) => currentAgentKeys.has(key)));
      if (filtered.size === prev.size) return prev;
      writeCollapsedAgentGroups(filtered);
      return filtered;
    });
  }, [currentAgentKeys]);

  // Remove stale workspace entries that no longer exist in the data
  useEffect(() => {
    const currentWorkspaces = new Set<string>();
    timelineSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.type === 'workspace' && item.workspaceGroup) {
          currentWorkspaces.add(item.workspaceGroup.workspace);
        }
      });
    });
    if (currentWorkspaces.size === 0) return;
    setExpandedWorkspaces((prev) => {
      const filtered = prev.filter((ws) => currentWorkspaces.has(ws));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [timelineSections]);

  const handleToggleWorkspace = useCallback((workspace: string) => {
    setExpandedWorkspaces((prev) => {
      if (prev.includes(workspace)) {
        return prev.filter((item) => item !== workspace);
      }
      return [...prev, workspace];
    });
  }, []);

  const handleToggleAgentGroup = useCallback((agentKey: string) => {
    setCollapsedAgentGroups((prev) => {
      const next = new Set(prev);
      if (next.has(agentKey)) {
        next.delete(agentKey);
      } else {
        next.add(agentKey);
      }
      writeCollapsedAgentGroups(next);
      return next;
    });
  }, []);

  return {
    conversations,
    isConversationGenerating,
    hasCompletionUnread,
    expandedWorkspaces,
    pinnedConversations,
    timelineSections,
    collapsedAgentGroups,
    handleToggleWorkspace,
    handleToggleAgentGroup,
  };
};
