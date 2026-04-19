/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FloWiseAgentManager - Agent manager for Flowise backend integration.
 * Extends BaseAgentManager to provide M&A-specific AI capabilities.
 */

import BaseAgentManager from '@process/task/BaseAgentManager';
import type { IAgentEventEmitter } from '@process/task/IAgentEventEmitter';
import type { IConfirmation } from '@/common/chat/chatLib';
import type { DealContext, FlowInput, FlowResult, FlowEvent } from '@/common/ma/types';
import { FloWiseConnection, FloWiseError, createFloWiseConnection } from './FloWiseConnection';

export type FloWiseAgentType = 'flowise';

export interface FloWiseAgentManagerData {
  conversation_id: string;
  workspace?: string;
  flowId: string;
  dealContext?: DealContext;
  yoloMode?: boolean;
  baseUrl?: string;
  apiKey?: string;
}

export type FloWiseConfirmationOption = 'allow_once' | 'allow_always' | 'deny';

/**
 * FloWiseAgentManager - Manages Flowise-based AI agent sessions.
 *
 * Features:
 * - Extends BaseAgentManager for consistent agent lifecycle
 * - Streaming message support via SSE
 * - Deal context integration
 * - Tool confirmation handling
 */
export class FloWiseAgentManager extends BaseAgentManager<FloWiseAgentManagerData, FloWiseConfirmationOption> {
  private connection: FloWiseConnection;
  private flowId: string;
  private dealContext: DealContext | null = null;
  private currentMessageId: string | null = null;
  private isStreaming = false;

  constructor(data: FloWiseAgentManagerData, emitter: IAgentEventEmitter) {
    super('flowise', data, emitter, false); // Disable fork - use direct connection

    this.conversation_id = data.conversation_id;
    this.workspace = data.workspace ?? '';
    this.flowId = data.flowId;
    this.dealContext = data.dealContext ?? null;

    // Initialize Flowise connection
    this.connection = createFloWiseConnection({
      baseUrl: data.baseUrl,
      apiKey: data.apiKey,
    });
  }

  /**
   * Send a message to the Flowise flow and stream the response.
   */
  override async sendMessage(message: { content: string; msg_id?: string }): Promise<void> {
    this._lastActivityAt = Date.now();
    this.currentMessageId = message.msg_id ?? this.generateMessageId();

    const input: FlowInput = {
      question: message.content,
      context: this.dealContext ?? undefined,
    };

    this.isStreaming = true;
    this.status = 'running';

    try {
      const result = await this.connection.streamFlow(this.flowId, input, (event) => {
        this.handleFlowEvent(event);
      });

      // Emit final result
      this.emitter.emitMessage(this.conversation_id, {
        type: 'text',
        data: {
          content: result.text,
          msg_id: this.currentMessageId!,
        },
      });

      this.status = 'finished';
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isStreaming = false;
    }
  }

  /**
   * Execute a flow and return the result (non-streaming).
   */
  async executeFlow(input: FlowInput): Promise<FlowResult> {
    return this.connection.executeFlow(this.flowId, input);
  }

  /**
   * Stop the current streaming operation.
   */
  override async stop(): Promise<void> {
    if (this.isStreaming) {
      this.connection.cancel();
      this.isStreaming = false;
    }
    this.status = 'finished';
  }

  /**
   * Kill the agent and cleanup resources.
   */
  override kill(): void {
    this.connection.cancel();
    this.isStreaming = false;
    this.status = 'finished';
  }

  /**
   * Update the deal context for subsequent messages.
   */
  setDealContext(context: DealContext | null): void {
    this.dealContext = context;
  }

  /**
   * Get the current deal context.
   */
  getDealContext(): DealContext | null {
    return this.dealContext;
  }

  /**
   * Check if Flowise backend is healthy.
   */
  async healthCheck(): Promise<boolean> {
    return this.connection.healthCheck();
  }

  /**
   * Handle a tool confirmation from the user.
   */
  override confirm(_msgId: string, callId: string, option: FloWiseConfirmationOption): void {
    // Find the confirmation
    const confirmation = this.confirmations.find((c) => c.callId === callId);
    if (!confirmation) {
      return;
    }

    // Remove from pending confirmations
    this.confirmations = this.confirmations.filter((c) => c.callId !== callId);
    this.emitter.emitConfirmationRemove(this.conversation_id, confirmation.id);

    // For Flowise, we would typically send the confirmation back to the flow
    // This is a placeholder for future implementation
    console.log(`[FloWiseAgentManager] Confirmation received: ${callId} -> ${option}`);
  }

  /**
   * Ensure yoloMode is enabled for auto-approval.
   */
  override async ensureYoloMode(): Promise<boolean> {
    this.yoloMode = true;
    return true;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleFlowEvent(event: FlowEvent): void {
    switch (event.type) {
      case 'token':
        this.emitter.emitMessage(this.conversation_id, {
          type: 'text',
          data: {
            content: event.data as string,
            msg_id: this.currentMessageId!,
          },
        });
        break;

      case 'tool_call':
        this.handleToolCall(event.data);
        break;

      case 'error':
        this.handleError(event.data);
        break;

      case 'node_start':
      case 'node_end':
        // These are informational events, could be used for progress tracking
        break;

      case 'complete':
        // Final result is handled in sendMessage
        break;
    }
  }

  private handleToolCall(data: unknown): void {
    const toolData = data as {
      tool?: string;
      args?: Record<string, unknown>;
      callId?: string;
    };

    if (!toolData.tool || !toolData.callId) {
      return;
    }

    // Create a confirmation request
    const confirmation: IConfirmation<FloWiseConfirmationOption> = {
      id: this.generateMessageId(),
      callId: toolData.callId,
      title: `Tool Call: ${toolData.tool}`,
      description: `The agent wants to use the "${toolData.tool}" tool. Allow this action?`,
      options: [
        {
          value: 'allow_once',
          label: 'Allow Once',
        },
        {
          value: 'allow_always',
          label: 'Always Allow',
        },
        {
          value: 'deny',
          label: 'Deny',
        },
      ],
    };

    this.addConfirmation(confirmation);
  }

  private handleError(error: unknown): void {
    let errorMessage = 'An unknown error occurred';

    if (error instanceof FloWiseError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    this.emitter.emitMessage(this.conversation_id, {
      type: 'error',
      data: {
        content: errorMessage,
        msg_id: this.currentMessageId ?? this.generateMessageId(),
      },
    });

    this.status = 'finished';
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Create a FloWiseAgentManager instance.
 */
export function createFloWiseAgentManager(
  data: FloWiseAgentManagerData,
  emitter: IAgentEventEmitter
): FloWiseAgentManager {
  return new FloWiseAgentManager(data, emitter);
}
