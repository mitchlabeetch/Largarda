/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { useCallback, useRef, useState } from 'react';

type TranscriptMessage = {
  role: string;
  content: string;
  timestamp: number;
};

/**
 * Hook to load child task transcript on-demand when a status card is expanded.
 * Uses useRef for the transcripts Map to avoid stale closure issues and
 * unnecessary re-creation of callbacks on unrelated transcript loads.
 */
export function useChildTaskDetail() {
  const transcriptsRef = useRef<Map<string, TranscriptMessage[]>>(new Map());
  const [, forceUpdate] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const loadTranscript = useCallback((childSessionId: string) => {
    if (transcriptsRef.current.has(childSessionId)) return;

    setLoadingIds((prev) => new Set(prev).add(childSessionId));
    setErrorIds((prev) => {
      if (!prev.has(childSessionId)) return prev;
      const next = new Set(prev);
      next.delete(childSessionId);
      return next;
    });

    // SF-2: Timeout to prevent infinite loading state
    const TIMEOUT_MS = 15_000;
    let didFinish = false;
    const timeoutId = setTimeout(() => {
      if (!didFinish) {
        didFinish = true;
        console.warn(`[useChildTaskDetail] Transcript load timed out for ${childSessionId}`);
        setErrorIds((prev) => new Set(prev).add(childSessionId));
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(childSessionId);
          return next;
        });
      }
    }, TIMEOUT_MS);

    ipcBridge.dispatch.getChildTranscript
      .invoke({ childSessionId, limit: 50 })
      .then((response) => {
        if (didFinish) return;
        didFinish = true;
        clearTimeout(timeoutId);
        if (response.success && response.data) {
          const next = new Map(transcriptsRef.current);
          next.set(childSessionId, response.data?.messages ?? []);
          transcriptsRef.current = next;
          forceUpdate((n) => n + 1);
        }
      })
      .catch(() => {
        if (didFinish) return;
        didFinish = true;
        clearTimeout(timeoutId);
        // Failed to load - user can retry by collapsing and re-expanding
      })
      .finally(() => {
        if (!didFinish) {
          clearTimeout(timeoutId);
        }
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(childSessionId);
          return next;
        });
      });
  }, []);

  const getTranscript = useCallback((childSessionId: string): TranscriptMessage[] | undefined => {
    return transcriptsRef.current.get(childSessionId);
  }, []);

  const isTranscriptLoading = useCallback(
    (childSessionId: string): boolean => {
      return loadingIds.has(childSessionId);
    },
    [loadingIds]
  );

  const hasTranscriptError = useCallback(
    (childSessionId: string): boolean => {
      return errorIds.has(childSessionId);
    },
    [errorIds]
  );

  return { loadTranscript, getTranscript, isTranscriptLoading, hasTranscriptError };
}
