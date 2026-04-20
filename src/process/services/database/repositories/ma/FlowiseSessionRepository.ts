/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import {
  type CreateFlowiseSessionInput,
  type FlowiseSession,
  type IMaFlowiseSessionRow,
  flowiseSessionToRow,
  rowToFlowiseSession,
} from '@/common/ma/types';
import { getDatabase } from '@process/services/database';
import type { IQueryResult } from '@process/services/database/types';

/**
 * Repository for Flowise conversation sessions.
 */
export class FlowiseSessionRepository {
  async create(input: CreateFlowiseSessionInput): Promise<IQueryResult<FlowiseSession>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const session: FlowiseSession = {
        id: crypto.randomUUID(),
        conversationId: input.conversationId,
        flowId: input.flowId,
        dealId: input.dealId,
        sessionKey: input.sessionKey,
        config: input.config,
        createdAt: Date.now(),
      };

      const row = flowiseSessionToRow(session);
      driver
        .prepare(
          `INSERT INTO ma_flowise_sessions (id, conversation_id, flow_id, deal_id, session_key, config, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(row.id, row.conversation_id, row.flow_id, row.deal_id, row.session_key, row.config, row.created_at);

      return { success: true, data: session };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  async getByConversation(conversationId: string): Promise<IQueryResult<FlowiseSession | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver
        .prepare(
          `SELECT * FROM ma_flowise_sessions
           WHERE conversation_id = ?
           ORDER BY created_at DESC
           LIMIT 1`
        )
        .get(conversationId) as IMaFlowiseSessionRow | undefined;

      return {
        success: true,
        data: row ? rowToFlowiseSession(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }
}

let flowiseSessionRepository: FlowiseSessionRepository | null = null;

export function getFlowiseSessionRepository(): FlowiseSessionRepository {
  flowiseSessionRepository ??= new FlowiseSessionRepository();
  return flowiseSessionRepository;
}
