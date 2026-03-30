/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// src/process/task/dispatch/DispatchMcpServer.ts

import type {
  StartChildTaskParams,
  ReadTranscriptOptions,
  TranscriptResult,
  ChildTaskInfo,
  SendMessageToChildParams,
  ListSessionsParams,
} from './dispatchTypes';
import { mainLog, mainWarn } from '@process/utils/mainLogger';

/**
 * Tool handler interface that the DispatchAgentManager implements.
 * The MCP server delegates tool calls to these handlers.
 *
 * Tools aligned with CC's dispatch tool set:
 * start_task, start_code_task, read_transcript, list_sessions, send_message
 *
 * AionUi extensions: agent_type, workspace, model (multi-engine support)
 */
export type DispatchToolHandler = {
  parentSessionId: string;
  startChildSession(params: StartChildTaskParams): Promise<string>;
  readTranscript(options: ReadTranscriptOptions): Promise<TranscriptResult>;
  listChildren(): Promise<ChildTaskInfo[]>;
  sendMessageToChild(params: SendMessageToChildParams): Promise<string>;
  listSessions(params: ListSessionsParams): Promise<string>;
};

/**
 * Dispatch MCP tool handler.
 * Receives tool calls from the HTTP MCP server and delegates to DispatchAgentManager.
 */
export class DispatchMcpServer {
  private handler: DispatchToolHandler;
  private disposed = false;

  constructor(handler: DispatchToolHandler) {
    this.handler = handler;
  }

  /**
   * Handle a tool call from the MCP transport.
   * All responses use MCP content format: { content: [{ type: 'text', text }] }
   */
  async handleToolCall(tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (this.disposed) {
      throw new Error('MCP server has been disposed');
    }

    switch (tool) {
      case 'start_task': {
        const params: StartChildTaskParams = {
          prompt: String(args.prompt ?? ''),
          title: String(args.title ?? 'Untitled Task'),
        };

        if (typeof args.agent_type === 'string' && args.agent_type.trim()) {
          params.agent_type = args.agent_type.trim() as (typeof params)['agent_type'];
        }

        if (typeof args.workspace === 'string' && args.workspace.trim()) {
          params.workspace = args.workspace.trim();
        }

        if (args.model && typeof args.model === 'object') {
          const m = args.model as Record<string, unknown>;
          const providerId = String(m.provider_id ?? '').trim();
          const modelName = String(m.model_name ?? '').trim();
          if (providerId && modelName) {
            params.model = { providerId, modelName };
          }
        }

        try {
          const sessionId = await this.handler.startChildSession(params);
          const children = await this.handler.listChildren();
          const existingList = formatChildList(children);

          return {
            content: [{
              type: 'text',
              text: `Task started.\nsession_id: ${sessionId}\ntitle: ${params.title}\n\n${existingList}`,
            }],
          };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          mainWarn('[DispatchMcpServer:start_task]', `failed: ${errMsg}`);
          return { content: [{ type: 'text', text: `Failed to start task: ${errMsg}` }], isError: true };
        }
      }

      case 'start_code_task': {
        const params: StartChildTaskParams = {
          prompt: String(args.prompt ?? ''),
          title: String(args.title ?? 'Code Task'),
          isolation: 'worktree',
        };

        if (typeof args.workspace === 'string' && args.workspace.trim()) {
          params.workspace = args.workspace.trim();
        }

        if (typeof args.agent_type === 'string' && args.agent_type.trim()) {
          params.agent_type = args.agent_type.trim() as (typeof params)['agent_type'];
        }

        try {
          const sessionId = await this.handler.startChildSession(params);
          const children = await this.handler.listChildren();
          const existingList = formatChildList(children);

          return {
            content: [{
              type: 'text',
              text: `Code task started with worktree isolation.\nsession_id: ${sessionId}\ntitle: ${params.title}\n\n${existingList}`,
            }],
          };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          mainWarn('[DispatchMcpServer:start_code_task]', `failed: ${errMsg}`);
          return { content: [{ type: 'text', text: `Failed to start code task: ${errMsg}` }], isError: true };
        }
      }

      case 'read_transcript': {
        const options: ReadTranscriptOptions = {
          sessionId: String(args.session_id ?? ''),
          limit: typeof args.limit === 'number' ? args.limit : undefined,
          maxWaitSeconds: typeof args.max_wait_seconds === 'number' ? args.max_wait_seconds : undefined,
          format: args.format === 'full' ? 'full' : 'auto',
        };

        const result = await this.handler.readTranscript(options);
        return {
          content: [{
            type: 'text',
            text: `Session "${result.title}": ${result.isRunning ? 'running' : 'idle'}\n\n${result.transcript}`,
          }],
        };
      }

      case 'list_sessions': {
        mainLog('[DispatchMcpServer:list_sessions]', `parentId=${this.handler.parentSessionId}`);
        const limit = typeof args.limit === 'number' ? args.limit : 20;
        const result = await this.handler.listSessions({ limit });
        mainLog('[DispatchMcpServer:list_sessions]', `success, parentId=${this.handler.parentSessionId}`);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'send_message': {
        const sessionId = String(args.session_id ?? '');
        const message = String(args.message ?? '');
        mainLog(
          '[DispatchMcpServer:send_message]',
          `received: childId=${sessionId}, parentId=${this.handler.parentSessionId}`,
        );

        if (!sessionId || !message) {
          return { content: [{ type: 'text', text: 'session_id and message are required' }], isError: true };
        }

        try {
          const resultMsg = await this.handler.sendMessageToChild({ sessionId, message });
          mainLog('[DispatchMcpServer:send_message]', `success: childId=${sessionId}`);
          return { content: [{ type: 'text', text: resultMsg }] };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          mainWarn('[DispatchMcpServer:send_message]', `failed: childId=${sessionId}, error=${errMsg}`);
          return { content: [{ type: 'text', text: `Failed to send message: ${errMsg}` }], isError: true };
        }
      }

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  /**
   * Get the tool schemas for MCP registration.
   * Descriptions aligned with CC's dispatch tool set.
   */
  static getToolSchemas(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }> {
    return [
      {
        name: 'start_task',
        description:
          'Start a new isolated task session. Use this for non-code work — research, writing, planning, ' +
          'anything that doesn\'t need a git repo. If the task involves a git repository (editing code, running tests, ' +
          'making a PR), use start_code_task instead — it has worktree isolation. ' +
          'Returns a session_id for read_transcript or send_message. Pick a short title (3-6 words).',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The initial user message for the task session.',
            },
            title: {
              type: 'string',
              description: 'Short descriptive title (3-6 words) for the task.',
            },
            workspace: {
              type: 'string',
              description: 'Optional working directory. Omit to inherit parent workspace.',
            },
            agent_type: {
              type: 'string',
              description: 'Engine type for the child agent.',
              enum: ['gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'remote'],
            },
            model: {
              type: 'object',
              description: 'Optional model override for this child agent.',
              properties: {
                provider_id: { type: 'string', description: 'Provider ID' },
                model_name: { type: 'string', description: 'Model name' },
              },
              required: ['provider_id', 'model_name'],
            },
          },
          required: ['prompt', 'title'],
        },
      },
      {
        name: 'start_code_task',
        description:
          'Start a new task session with git worktree isolation. ALWAYS prefer this over start_task for code-related ' +
          'work — editing a repo, running tests, fixing a bug, anything touching a codebase.\n\n' +
          'BEFORE calling this:\n' +
          '(1) Check your existing tasks. If the user is following up on work a code session already did, ' +
          'route with send_message to that session_id — it already has the repo, the branch, the worktree, and the context. ' +
          'Only start a new session for genuinely new work or a different repo.\n' +
          '(2) When you call this tool, ALWAYS tell the user which workspace you are starting the task in.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'The user\'s message, VERBATIM. Quote their exact words first, then add context below if genuinely needed. ' +
                'Do NOT paraphrase or interpret — the code session has the repo and can figure out what the user meant.',
            },
            title: {
              type: 'string',
              description: 'Short descriptive title (3-6 words) for the task.',
            },
            workspace: {
              type: 'string',
              description: 'Working directory. Defaults to parent workspace.',
            },
            agent_type: {
              type: 'string',
              description: 'Engine type for the child agent.',
              enum: ['gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'remote'],
            },
          },
          required: ['prompt', 'title'],
        },
      },
      {
        name: 'read_transcript',
        description:
          'Read the transcript of a task session (find session IDs with list_sessions). ' +
          'Blocks while the session is running (up to max_wait_seconds) so you get the completed outcome in one call ' +
          'instead of polling. If still running when the wait expires, by default you\'ll get a one-line progress summary ' +
          '— call again to keep waiting. When finished, returns the full transcript with a [result] line.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'session_id from list_sessions' },
            limit: {
              type: 'number',
              description: 'Max messages to return (default 20, most recent)',
            },
            max_wait_seconds: {
              type: 'number',
              description:
                'Wait up to this many seconds for the session\'s current turn to finish (default 30, 0 to return immediately). ' +
                'For sessions you expect to be quick, keep the default. For long-running sessions, use a shorter wait (e.g. 15) to check in.',
            },
            format: {
              type: 'string',
              enum: ['auto', 'full'],
              description:
                '\'auto\' (default): one-line progress summary if the session is still running, full transcript once it\'s done. ' +
                '\'full\': full transcript regardless — use this if you need to inspect a running session\'s work in detail ' +
                '(e.g. it looks stuck). Prefer \'auto\': repeated full reads on a running session stack up overlapping partial transcripts.',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_sessions',
        description:
          'List all task sessions you can inspect with read_transcript. ' +
          'Returns the most recently active sessions first.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max sessions to return (default 20, most recent first)' },
          },
          required: [],
        },
      },
      {
        name: 'send_message',
        description:
          'Send a user message to a task session. Works for tasks you started AND for other sessions. ' +
          'Use this when the user\'s message is a continuation of an existing session — not a new request. ' +
          'For a new request, use start_task or start_code_task instead.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'session_id from start_task, start_code_task, or list_sessions',
            },
            message: { type: 'string', description: 'The follow-up user message' },
          },
          required: ['session_id', 'message'],
        },
      },
    ];
  }

  /**
   * Dispose the MCP server and release resources.
   */
  dispose(): void {
    this.disposed = true;
    mainLog('[DispatchMcpServer]', `Disposed for session: ${this.handler.parentSessionId}`);
  }
}

/**
 * Format child task list for tool responses (matches CC's format).
 */
function formatChildList(children: ChildTaskInfo[]): string {
  if (children.length === 0) return 'No other tasks running.';
  return (
    'Existing tasks:\n' +
    children
      .map((c) => `  - ${c.sessionId} "${c.title}" (${c.status === 'running' ? 'running' : 'idle'})`)
      .join('\n')
  );
}
