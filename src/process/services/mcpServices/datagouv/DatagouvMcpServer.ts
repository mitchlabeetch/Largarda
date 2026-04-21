/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * data.gouv.fr MCP Server
 * Native MCP server implementation for French open data platform.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { datagouvToolDefinitions, datagouvToolHandlers } from './toolHandlers';

/**
 * data.gouv.fr MCP Server
 */
export class DatagouvMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'datagouv-fr',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: datagouvToolDefinitions,
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const handler = datagouvToolHandlers[name];
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        return await handler(args ?? {});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[DatagouvMcpServer] Server started on stdio');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.server.close();
    console.error('[DatagouvMcpServer] Server stopped');
  }
}

/**
 * Start the server when run as a standalone process
 */
if (require.main === module) {
  const server = new DatagouvMcpServer();
  server.start().catch((error) => {
    console.error('[DatagouvMcpServer] Failed to start server:', error);
    process.exit(1);
  });
}
