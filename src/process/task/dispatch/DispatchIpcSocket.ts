/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unix Domain Socket IPC for dispatch MCP server script ↔ main process.
 *
 * The MCP server script is spawned by the admin agent's CLI (Gemini CLI, CC CLI, etc.)
 * via the MCP SDK's StdioClientTransport (child_process.spawn). Because spawn() does NOT
 * create a Node.js IPC channel, process.send() is unavailable in the script. This module
 * provides an alternative bidirectional channel using a Unix domain socket.
 *
 * Protocol: newline-delimited JSON (NDJSON) over a Unix domain socket.
 *   Client→Server: {"type":"tool_call","id":"mcp_1","tool":"start_task","args":{...}}
 *   Server→Client: {"type":"tool_result","id":"mcp_1","result":{...}}
 *   Server→Client: {"type":"tool_result","id":"mcp_1","error":"..."}
 */

import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mainLog, mainWarn, mainError } from '@process/utils/mainLogger';

type ToolCallHandler = (tool: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * Server-side Unix domain socket for receiving MCP tool calls from the dispatch script.
 * Created by DispatchAgentManager, one per dispatch conversation.
 */
export class DispatchIpcSocketServer {
  private server: net.Server | null = null;
  private connections: Set<net.Socket> = new Set();
  private handler: ToolCallHandler;
  readonly socketPath: string;
  private disposed = false;

  constructor(conversationId: string, handler: ToolCallHandler) {
    this.handler = handler;
    // Use a short hash to avoid exceeding Unix socket path length limit (104 bytes on macOS)
    const shortId = conversationId.slice(0, 12);
    this.socketPath = path.join(os.tmpdir(), `aionui-dispatch-${shortId}.sock`);
  }

  /**
   * Start listening for connections.
   */
  async start(): Promise<void> {
    if (this.disposed) return;

    // Clean up stale socket file
    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      // File doesn't exist, that's fine
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (err) => {
        mainError('[DispatchIpcSocket]', 'Server error', err);
        reject(err);
      });

      this.server.listen(this.socketPath, () => {
        mainLog('[DispatchIpcSocket]', `Listening on ${this.socketPath}`);
        resolve();
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    this.connections.add(socket);
    mainLog('[DispatchIpcSocket]', 'Client connected');

    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      // Process complete NDJSON lines
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) {
          void this.handleMessage(socket, line);
        }
      }
    });

    socket.on('close', () => {
      this.connections.delete(socket);
      mainLog('[DispatchIpcSocket]', 'Client disconnected');
    });

    socket.on('error', (err) => {
      mainWarn('[DispatchIpcSocket]', 'Socket error', err);
      this.connections.delete(socket);
    });
  }

  private async handleMessage(socket: net.Socket, line: string): Promise<void> {
    let msg: { type: string; id: string; tool: string; args: Record<string, unknown> };
    try {
      msg = JSON.parse(line);
    } catch {
      mainWarn('[DispatchIpcSocket]', `Failed to parse message: ${line.slice(0, 200)}`);
      return;
    }

    if (msg.type === 'ready') {
      mainLog('[DispatchIpcSocket]', 'MCP script signaled ready');
      return;
    }

    if (msg.type !== 'tool_call') {
      mainWarn('[DispatchIpcSocket]', `Unknown message type: ${msg.type}`);
      return;
    }

    try {
      const result = await this.handler(msg.tool, msg.args ?? {});
      this.send(socket, { type: 'tool_result', id: msg.id, result });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.send(socket, { type: 'tool_result', id: msg.id, error: errMsg });
    }
  }

  private send(socket: net.Socket, data: Record<string, unknown>): void {
    if (socket.destroyed) return;
    socket.write(JSON.stringify(data) + '\n');
  }

  /**
   * Dispose the server and clean up the socket file.
   */
  dispose(): void {
    this.disposed = true;
    for (const socket of this.connections) {
      socket.destroy();
    }
    this.connections.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      // Already cleaned up
    }

    mainLog('[DispatchIpcSocket]', `Disposed: ${this.socketPath}`);
  }
}
