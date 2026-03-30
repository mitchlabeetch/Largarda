/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';
import type { DispatchEventMessageType, IMessageDispatchEvent, TMessage } from '@/common/chat/chatLib';
import { transformMessage } from '@/common/chat/chatLib';
import type { ThoughtData } from '@/renderer/components/chat/ThoughtDisplay';
import { useAddOrUpdateMessage } from '@/renderer/pages/conversation/Messages/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseDispatchAdminStreamReturn = {
  /** Current thinking/status text from the admin agent */
  thought: ThoughtData;
  /** Whether the admin agent is currently processing */
  running: boolean;
  /** Reset all state (e.g. on conversation switch) */
  resetState: () => void;
};

/**
 * Subscribes to the unified response stream for dispatch conversations.
 *
 * All admin agent messages (Gemini, ACP, etc.) arrive on `conversation.responseStream`
 * because:
 * - Gemini admin emits natively on this stream
 * - ACP admin messages are re-emitted here by `subscribeAcpResponseStream()`
 * - dispatch_event messages are emitted here by `emitGroupChatEvent()`
 *
 * This hook transforms incoming messages and feeds them to MessageList via addOrUpdateMessage.
 */
export function useDispatchAdminStream(conversationId: string): UseDispatchAdminStreamReturn {
  const addOrUpdateMessage = useAddOrUpdateMessage();
  const [running, setRunning] = useState(false);
  const [thought, setThought] = useState<ThoughtData>({ description: '', subject: '' });
  const runningRef = useRef(false);

  // Throttle thought updates
  const thoughtThrottleRef = useRef<{
    lastUpdate: number;
    pending: ThoughtData | null;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ lastUpdate: 0, pending: null, timer: null });

  const throttledSetThought = useMemo(() => {
    const THROTTLE_MS = 50;
    return (data: ThoughtData) => {
      const now = Date.now();
      const ref = thoughtThrottleRef.current;
      if (now - ref.lastUpdate >= THROTTLE_MS) {
        ref.lastUpdate = now;
        ref.pending = null;
        if (ref.timer) {
          clearTimeout(ref.timer);
          ref.timer = null;
        }
        setThought(data);
      } else {
        ref.pending = data;
        if (!ref.timer) {
          ref.timer = setTimeout(
            () => {
              ref.lastUpdate = Date.now();
              ref.timer = null;
              if (ref.pending) {
                setThought(ref.pending);
                ref.pending = null;
              }
            },
            THROTTLE_MS - (now - ref.lastUpdate)
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (thoughtThrottleRef.current.timer) {
        clearTimeout(thoughtThrottleRef.current.timer);
      }
    };
  }, []);

  const handleMessage = useCallback(
    (message: IResponseMessage) => {
      if (message.conversation_id !== conversationId) return;

      // ── dispatch_event: task lifecycle messages ──
      if (message.type === 'dispatch_event') {
        const eventData = message.data as Record<string, unknown>;
        const isProgress = eventData.messageType === 'task_progress' && eventData.childTaskId;
        // Use stable id for task_progress so subsequent updates overwrite (matches DB storage)
        const stableId = isProgress
          ? `dispatch-progress-${eventData.childTaskId}`
          : String(message.msg_id || `dispatch-${Date.now()}`);

        const dispatchMessage: IMessageDispatchEvent = {
          id: stableId,
          type: 'dispatch_event',
          msg_id: stableId,
          position: 'left',
          conversation_id: message.conversation_id,
          content: {
            sourceSessionId: String(eventData.sourceSessionId || ''),
            sourceRole: (eventData.sourceRole as 'dispatcher' | 'child' | 'user') || 'child',
            displayName: String(eventData.displayName || ''),
            content: String(eventData.content || ''),
            messageType: (eventData.messageType as DispatchEventMessageType) || 'system',
            timestamp: Number(eventData.timestamp) || Date.now(),
            childTaskId: eventData.childTaskId ? String(eventData.childTaskId) : undefined,
            avatar: eventData.avatar ? String(eventData.avatar) : undefined,
            progressSummary: eventData.progressSummary ? String(eventData.progressSummary) : undefined,
          },
        };
        addOrUpdateMessage(dispatchMessage as TMessage);
        return;
      }

      // ── Transient events: thought, start, finish ──
      switch (message.type) {
        case 'thought':
          if (!runningRef.current) {
            setRunning(true);
            runningRef.current = true;
          }
          throttledSetThought(message.data as ThoughtData);
          return;
        case 'start':
          setRunning(true);
          runningRef.current = true;
          return;
        case 'finish':
          setRunning(false);
          runningRef.current = false;
          setThought({ subject: '', description: '' });
          return;
        case 'finished':
        case 'request_trace':
        case 'acp_model_info':
        case 'codex_model_info':
        case 'acp_context_usage':
        case 'system':
          // Metadata events — not persisted to message list
          return;
      }

      // ── Standard message types: transform and add ──
      const transformed = transformMessage(message);
      if (transformed) {
        // Auto-recover running state
        if (!runningRef.current) {
          setRunning(true);
          runningRef.current = true;
        }
        // Clear thought when content arrives
        if (message.type === 'content') {
          setThought({ subject: '', description: '' });
        }
        addOrUpdateMessage(transformed);
      }
    },
    [conversationId, addOrUpdateMessage, throttledSetThought]
  );

  useEffect(() => {
    return ipcBridge.conversation.responseStream.on(handleMessage);
  }, [handleMessage]);

  // Reset on conversation switch
  useEffect(() => {
    setThought({ subject: '', description: '' });
    setRunning(false);
    runningRef.current = false;
  }, [conversationId]);

  const resetState = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    setThought({ subject: '', description: '' });
  }, []);

  return { thought, running, resetState };
}
