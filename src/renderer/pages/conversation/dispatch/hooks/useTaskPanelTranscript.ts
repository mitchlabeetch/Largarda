/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { GroupChatMessageData, TranscriptMessage, UseTaskPanelTranscriptResult } from '../types';

const VALID_STATUSES: ReadonlySet<UseTaskPanelTranscriptResult['status']> = new Set([
  'pending',
  'running',
  'idle',
  'finished',
  'failed',
  'cancelled',
  'unknown',
]);

/**
 * Hook to provide transcript data for TaskPanel with auto-refresh logic.
 * Combines 5-second polling (while running) with responseStream event-triggered final refresh.
 */
export function useTaskPanelTranscript(childSessionId: string, isRunning: boolean): UseTaskPanelTranscriptResult {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [status, setStatus] = useState<UseTaskPanelTranscriptResult['status']>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchTranscript = useCallback(async () => {
    try {
      const response = await ipcBridge.dispatch.getChildTranscript.invoke({
        childSessionId,
        limit: 50,
        offset: 0,
      });
      if (!isMountedRef.current) return;
      if (response.success && response.data) {
        setTranscript(response.data.messages ?? []);
        const rawStatus = response.data.status;
        setStatus(
          VALID_STATUSES.has(rawStatus as UseTaskPanelTranscriptResult['status'])
            ? (rawStatus as UseTaskPanelTranscriptResult['status'])
            : 'pending'
        );
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(String(err));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [childSessionId]);

  // 1. Initial load
  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    void fetchTranscript();
    return () => {
      isMountedRef.current = false;
    };
  }, [childSessionId, fetchTranscript]);

  // 2. 5-second polling (only when running)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      void fetchTranscript();
    }, 5000);
    return () => clearInterval(interval);
  }, [childSessionId, isRunning, fetchTranscript]);

  // 3. responseStream event-triggered final refresh
  useEffect(() => {
    const unsub = ipcBridge.conversation.responseStream.on((msg) => {
      if (msg.type !== 'dispatch_event') return;
      if (!msg.data || typeof msg.data !== 'object') return;
      const data = msg.data as GroupChatMessageData;
      if (!data.childTaskId || data.childTaskId !== childSessionId) return;
      if (
        data.messageType === 'task_completed' ||
        data.messageType === 'task_failed' ||
        data.messageType === 'task_cancelled'
      ) {
        // Delay 500ms to ensure DB write completes
        setTimeout(() => {
          if (isMountedRef.current) {
            void fetchTranscript();
          }
        }, 500);
      }
    });
    return unsub;
  }, [childSessionId, fetchTranscript]);

  const refresh = useCallback(() => {
    void fetchTranscript();
  }, [fetchTranscript]);

  return { transcript, status, isLoading, error, refresh };
}
