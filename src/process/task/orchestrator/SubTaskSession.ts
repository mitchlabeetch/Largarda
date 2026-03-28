/**
 * SubTaskSession — wraps one IAgentManager instance for a single sub-task.
 *
 * Responsibilities:
 *   - start(prompt): initialise the agent and send the initial prompt
 *   - continue(text): send a follow-up message to the same session (消息续发)
 *   - stop() / kill(): graceful or forceful agent termination
 *
 * Emits:
 *   - 'text'  — streaming text chunk (string)
 *   - 'done'  — agent session completed
 *   - 'error' — agent session failed (Error)
 */
import { EventEmitter } from 'events';
import type { IConfirmation } from '@/common/chat/chatLib';
import type { IAgentManager } from '../IAgentManager';
import type { IAgentEventEmitter, AgentMessageEvent } from '../IAgentEventEmitter';
import type { SubTask } from './types';

// --------------------------------------------------------
// Internal emitter that captures agent output events
// --------------------------------------------------------
class CaptureEmitter extends EventEmitter implements IAgentEventEmitter {
  constructor(
    private readonly onMessage: (event: AgentMessageEvent) => void,
    private readonly onFinish: () => void,
  ) {
    super();
  }

  emitConfirmationAdd(_conversationId: string, _data: IConfirmation): void {}
  emitConfirmationUpdate(_conversationId: string, _data: IConfirmation): void {}
  emitConfirmationRemove(_conversationId: string, _confirmationId: string): void {}

  emitMessage(_conversationId: string, event: AgentMessageEvent): void {
    this.onMessage(event);
    // Detect finish via status event
    if (event.type === 'status') {
      const status = (event.data as Record<string, unknown>)?.status as string | undefined;
      if (
        status === 'done' ||
        status === 'finish' ||
        status === 'complete' ||
        status === 'local_finish'
      ) {
        this.onFinish();
      }
    }
  }
}

/** Factory function to create an IAgentManager — injected to avoid coupling to a concrete class */
export type AgentManagerFactory = (
  conversationId: string,
  presetContext: string,
  emitter: IAgentEventEmitter,
) => IAgentManager;

export class SubTaskSession extends EventEmitter {
  readonly conversationId: string;
  readonly subTaskId: string;

  private manager: IAgentManager | null = null;
  private finished = false;
  private readonly captureEmitter: CaptureEmitter;

  constructor(
    subTask: SubTask,
    conversationId: string,
    private readonly factory: AgentManagerFactory,
  ) {
    super();
    this.subTaskId = subTask.id;
    this.conversationId = conversationId;

    this.captureEmitter = new CaptureEmitter(
      (event) => {
        if (event.type === 'text') {
          const text = (event.data as { content?: string })?.content ?? '';
          if (text) this.emit('text', text);
        }
      },
      () => {
        if (!this.finished) {
          this.finished = true;
          this.emit('done');
        }
      },
    );
  }

  /**
   * Start the agent with the initial prompt.
   * Throws if the session has already been started.
   */
  async start(prompt: string): Promise<void> {
    if (this.manager) throw new Error('SubTaskSession already started');
    this.manager = this.factory(this.conversationId, '', this.captureEmitter);
    this.finished = false;

    // AcpAgentManager.sendMessage expects { content: string; ... }
    await this.manager.sendMessage({ content: prompt });
  }

  /**
   * 消息续发 — send a follow-up message to the same agent session.
   * Can be called after the agent has responded to ask further questions.
   */
  async continue(text: string): Promise<void> {
    if (!this.manager) throw new Error('SubTaskSession not started yet');
    this.finished = false;
    await this.manager.sendMessage({ content: text });
  }

  /** Gracefully stop the agent */
  async stop(): Promise<void> {
    if (this.manager) {
      await this.manager.stop();
    }
  }

  /** Force-kill the agent */
  kill(): void {
    this.manager?.kill();
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get status(): string {
    return this.manager?.status ?? 'not_started';
  }
}
