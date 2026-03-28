/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// src/process/task/dispatch/DispatchNotifier.ts

import type { IWorkerTaskManager } from '../IWorkerTaskManager';
import type { DispatchSessionTracker } from './DispatchSessionTracker';
import type { IConversationRepository } from '@process/services/database/IConversationRepository';
import type { TChatConversation } from '@/common/config/storage';
import { uuid } from '@/common/utils';
import { mainLog, mainWarn } from '@process/utils/mainLogger';

/**
 * Handles child task completion notifications to parent dispatcher.
 * - Hot parent (running): inject notification via sendMessage
 * - Cold parent (not running): queue for consumption on next user message
 */
export class DispatchNotifier {
  /** In-memory pending notification queues (parentId -> messages) */
  private pendingQueues = new Map<string, string[]>();

  constructor(
    private readonly taskManager: IWorkerTaskManager,
    private readonly tracker: DispatchSessionTracker,
    private readonly conversationRepo: IConversationRepository
  ) {}

  /**
   * Called when a child task completes or fails.
   * Determines hot/cold parent path and dispatches notification.
   */
  async handleChildCompletion(childId: string, result: 'completed' | 'failed' | 'cancelled'): Promise<void> {
    const parentId = this.tracker.getParent(childId);
    if (!parentId) return;

    const childInfo = this.tracker.getChildInfo(childId);
    const title = childInfo?.title ?? childId;
    const message =
      result === 'cancelled'
        ? `Task "${title}" cancelled by user. Use read_transcript with session_id "${childId}" to see partial results.`
        : `Task "${title}" ${result}. Use read_transcript with session_id "${childId}" to see the outcome.`;

    const parentTask = this.taskManager.getTask(parentId);
    if (!parentTask) {
      mainWarn('[DispatchNotifier]', `Parent task not found: ${parentId}`);
      return;
    }

    if (parentTask.status === 'running') {
      // Hot parent: inject notification directly
      mainLog('[DispatchNotifier]', `Hot parent notification: ${parentId} <- ${childId}`);
      try {
        await parentTask.sendMessage({
          input: `[System Notification] ${message}`,
          msg_id: uuid(),
          isSystemNotification: true,
        });
      } catch (err) {
        mainWarn('[DispatchNotifier]', `Failed to send hot notification to ${parentId}`, err);
        // Fall back to cold path
        this.enqueueNotification(parentId, message);
      }
    } else {
      // Cold parent: queue for later consumption
      mainLog('[DispatchNotifier]', `Cold parent notification queued: ${parentId} <- ${childId}`);
      this.enqueueNotification(parentId, message);
    }
  }

  /**
   * Check if parent has pending notifications.
   */
  hasPending(parentId: string): boolean {
    const queue = this.pendingQueues.get(parentId);
    return queue !== undefined && queue.length > 0;
  }

  /**
   * Get count of pending notifications (for UI hint).
   */
  getPendingCount(parentId: string): number {
    return this.pendingQueues.get(parentId)?.length ?? 0;
  }

  /**
   * Flush all pending notifications for a parent.
   * Called when parent resumes (user sends next message).
   * Returns combined notification text, or undefined if none.
   */
  flushPending(parentId: string): string | undefined {
    const queue = this.pendingQueues.get(parentId);
    if (!queue || queue.length === 0) return undefined;
    const combined = queue.join('\n');
    this.pendingQueues.delete(parentId);
    void this.persistPendingQueue(parentId);
    return combined;
  }

  /**
   * Restore pending queues from database (on app restart).
   */
  async restoreFromDb(parentId: string): Promise<void> {
    try {
      const conversation = await this.conversationRepo.getConversation(parentId);
      if (!conversation || conversation.type !== 'dispatch') return;
      const extra = conversation.extra as { pendingNotifications?: string[] };
      if (extra.pendingNotifications && extra.pendingNotifications.length > 0) {
        this.pendingQueues.set(parentId, [...extra.pendingNotifications]);
      }
    } catch (err) {
      mainWarn('[DispatchNotifier]', `Failed to restore pending queue for ${parentId}`, err);
    }
  }

  private enqueueNotification(parentId: string, message: string): void {
    if (!this.pendingQueues.has(parentId)) {
      this.pendingQueues.set(parentId, []);
    }
    this.pendingQueues.get(parentId)!.push(message);
    void this.persistPendingQueue(parentId);
  }

  /**
   * Persist pending queue to conversation extra for crash recovery.
   */
  private async persistPendingQueue(parentId: string): Promise<void> {
    try {
      const queue = this.pendingQueues.get(parentId) ?? [];
      await this.conversationRepo.updateConversation(parentId, {
        extra: { pendingNotifications: queue },
      } as Partial<TChatConversation>);
    } catch (err) {
      mainWarn('[DispatchNotifier]', `Failed to persist pending queue for ${parentId}`, err);
    }
  }
}
