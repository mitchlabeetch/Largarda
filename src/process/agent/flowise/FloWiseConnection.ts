/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FloWiseConnection - HTTP/WebSocket client for Flowise backend communication.
 * Provides flow execution, streaming, and health check capabilities.
 */

import type {
  FlowiseConfig,
  FlowInput,
  FlowResult,
  FlowEvent,
  FlowMeta,
  FlowDetail,
  FlowiseReadiness,
} from '@/common/ma/types';
import { FLOWISE_DEFAULT_CONFIG, FLOWISE_ENDPOINTS } from '@/common/ma/constants';

export type { FlowiseConfig, FlowInput, FlowResult, FlowEvent, FlowMeta, FlowDetail, FlowiseReadiness };

/**
 * Env-var names used for Flowise configuration fallback. These are
 * read from `process.env` at the moment `createFloWiseConnection` is
 * called, so callers can mutate the env (tests, Electron main bootstrap)
 * before any service touches Flowise.
 */
export const FLOWISE_ENV = {
  baseUrl: 'FLOWISE_BASE_URL',
  apiKey: 'FLOWISE_API_KEY',
} as const;

/**
 * FloWiseConnection - Client for Flowise API communication.
 *
 * Features:
 * - HTTP client for Flowise API
 * - SSE streaming for real-time responses
 * - Health check with retry logic
 * - Exponential backoff for retries
 */
export class FloWiseConnection {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryBaseDelay: number;
  private readonly retryMaxDelay: number;
  private abortController: AbortController | null = null;

  constructor(config: FlowiseConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? FLOWISE_DEFAULT_CONFIG.timeout;
    this.retryAttempts = config.retryAttempts ?? FLOWISE_DEFAULT_CONFIG.retryAttempts;
    this.retryBaseDelay = config.retryBaseDelay ?? FLOWISE_DEFAULT_CONFIG.retryBaseDelay;
    this.retryMaxDelay = config.retryMaxDelay ?? FLOWISE_DEFAULT_CONFIG.retryMaxDelay;
  }

  /**
   * Execute a flow and return the result.
   * Non-streaming mode - waits for complete response.
   */
  async executeFlow(flowId: string, input: FlowInput): Promise<FlowResult> {
    const url = `${this.baseUrl}${FLOWISE_ENDPOINTS.prediction}/${flowId}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        question: input.question,
        overrideConfig: input.overrideConfig,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new FloWiseError(
        'FLOWISE_FLOW_ERROR',
        `Flow execution failed: ${response.status} ${response.statusText}`,
        { flowId, status: response.status, body: errorText },
        true
      );
    }

    const data = await response.json();
    return this.parseFlowResult(data);
  }

  /**
   * Execute a flow with streaming response.
   * Calls onEvent callback for each streaming event.
   */
  async streamFlow(flowId: string, input: FlowInput, onEvent: (event: FlowEvent) => void): Promise<FlowResult> {
    const url = `${this.baseUrl}${FLOWISE_ENDPOINTS.prediction}/${flowId}`;

    this.abortController = new AbortController();

    const response = await this.fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          question: input.question,
          overrideConfig: input.overrideConfig,
          stream: true,
        }),
        signal: this.abortController.signal,
      },
      false // Don't retry streaming requests
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new FloWiseError(
        'FLOWISE_FLOW_ERROR',
        `Flow streaming failed: ${response.status} ${response.statusText}`,
        { flowId, status: response.status, body: errorText },
        true
      );
    }

    if (!response.body) {
      throw new FloWiseError('FLOWISE_FLOW_ERROR', 'Response body is null', { flowId }, false);
    }

    // Parse SSE stream
    let result: FlowResult = { text: '' };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() === '[DONE]') {
              onEvent({ type: 'complete', data: result });
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const event = this.parseStreamEvent(parsed);
              onEvent(event);

              // Accumulate text for final result
              if (event.type === 'token' && typeof event.data === 'string') {
                result.text += event.data;
              } else if (event.type === 'complete' && typeof event.data === 'object') {
                result = event.data as FlowResult;
              }
            } catch {
              // Skip unparseable events
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return result;
  }

  /**
   * List all available flows.
   */
  async listFlows(): Promise<FlowMeta[]> {
    const url = `${this.baseUrl}${FLOWISE_ENDPOINTS.chatflows}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new FloWiseError(
        'FLOWISE_CONNECTION_FAILED',
        `Failed to list flows: ${response.status} ${response.statusText}`,
        { status: response.status },
        true
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(this.parseFlowMeta) : [];
  }

  /**
   * Get details of a specific flow.
   */
  async getFlow(flowId: string): Promise<FlowDetail> {
    const url = `${this.baseUrl}${FLOWISE_ENDPOINTS.chatflows}/${flowId}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new FloWiseError('FLOWISE_FLOW_ERROR', `Flow not found: ${flowId}`, { flowId }, false);
      }
      throw new FloWiseError(
        'FLOWISE_CONNECTION_FAILED',
        `Failed to get flow: ${response.status} ${response.statusText}`,
        { flowId, status: response.status },
        true
      );
    }

    const data = await response.json();
    return this.parseFlowDetail(data);
  }

  /**
   * Check if Flowise backend is healthy.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}${FLOWISE_ENDPOINTS.chatflows}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Cancel an ongoing streaming request.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async fetchWithRetry(url: string, options: RequestInit, shouldRetry = true): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: options.signal ?? controller.signal,
        });

        clearTimeout(timeoutId);

        // Don't retry on client errors (4xx)
        if (!response.ok && response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx) or network issues
        if (response.ok || !shouldRetry) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort
        if ((error as Error).name === 'AbortError') {
          throw new FloWiseError('FLOWISE_CONNECTION_FAILED', 'Request aborted', {}, false);
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < this.retryAttempts) {
        const delay = Math.min(this.retryBaseDelay * Math.pow(2, attempt), this.retryMaxDelay);
        await this.sleep(delay);
      }
    }

    throw new FloWiseError(
      'FLOWISE_CONNECTION_FAILED',
      `Connection failed after ${this.retryAttempts} retries: ${lastError?.message}`,
      { lastError: lastError?.message },
      true
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseStreamEvent(data: Record<string, unknown>): FlowEvent {
    const eventType = data.event as string;

    switch (eventType) {
      case 'token':
        return { type: 'token', data: data.token ?? '' };
      case 'metadata':
        return { type: 'node_start', data };
      case 'usedTools':
        return { type: 'tool_call', data: data.usedTools };
      case 'sourceDocuments':
        return { type: 'node_end', data: data.sourceDocuments };
      case 'agentReasoning':
        return { type: 'tool_call', data: data.agentReasoning };
      case 'error':
        return { type: 'error', data: data.error ?? 'Unknown error' };
      case 'complete':
        return { type: 'complete', data: this.parseFlowResult(data) };
      default:
        return { type: 'node_start', data };
    }
  }

  private parseFlowResult(data: Record<string, unknown>): FlowResult {
    return {
      text: (data.text as string) ?? '',
      artifacts: data.artifacts as Record<string, unknown> | undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
    };
  }

  private parseFlowMeta(data: Record<string, unknown>): FlowMeta {
    return {
      id: (data.id as string) ?? '',
      name: (data.name as string) ?? '',
      description: data.description as string | undefined,
      category: data.category as string | undefined,
      tags: data.tags as string[] | undefined,
    };
  }

  private parseFlowDetail(data: Record<string, unknown>): FlowDetail {
    const flow = data.flow as Record<string, unknown> | undefined;
    return {
      ...this.parseFlowMeta(data),
      nodes: flow?.nodes as FlowDetail['nodes'],
      edges: flow?.edges as FlowDetail['edges'],
      createdAt: data.createdAt as string | undefined,
      updatedAt: data.updatedAt as string | undefined,
    };
  }
}

/**
 * Custom error class for FloWise operations.
 */
export class FloWiseError extends Error {
  constructor(
    public readonly code: 'FLOWISE_CONNECTION_FAILED' | 'FLOWISE_FLOW_ERROR' | 'RATE_LIMIT_EXCEEDED',
    message: string,
    public readonly details: Record<string, unknown>,
    public readonly recoverable: boolean
  ) {
    super(message);
    this.name = 'FloWiseError';
  }
}

/**
 * Resolve the effective Flowise configuration, layering values in this
 * order (most explicit wins):
 *
 *   1. Values passed in `config`.
 *   2. `process.env.FLOWISE_BASE_URL` / `process.env.FLOWISE_API_KEY`.
 *   3. `FLOWISE_DEFAULT_CONFIG.baseUrl` (no env-default for apiKey).
 *
 * Exported separately from `createFloWiseConnection` so the readiness
 * probe and tests can reason about the layering without instantiating
 * a connection.
 */
export function resolveFlowiseConfig(config: Partial<FlowiseConfig> = {}): {
  baseUrl: string;
  apiKey: string | undefined;
  apiKeySource: 'arg' | 'env' | 'none';
} {
  const envBaseUrl = typeof process !== 'undefined' ? process.env[FLOWISE_ENV.baseUrl] : undefined;
  const envApiKey = typeof process !== 'undefined' ? process.env[FLOWISE_ENV.apiKey] : undefined;

  const baseUrl = config.baseUrl ?? (envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : FLOWISE_DEFAULT_CONFIG.baseUrl);

  let apiKey: string | undefined;
  let apiKeySource: 'arg' | 'env' | 'none';
  if (config.apiKey && config.apiKey.length > 0) {
    apiKey = config.apiKey;
    apiKeySource = 'arg';
  } else if (envApiKey && envApiKey.length > 0) {
    apiKey = envApiKey;
    apiKeySource = 'env';
  } else {
    apiKey = undefined;
    apiKeySource = 'none';
  }

  return { baseUrl, apiKey, apiKeySource };
}

/**
 * Create a FloWiseConnection with default configuration, applying the
 * env-var fallback described in `resolveFlowiseConfig`.
 */
export function createFloWiseConnection(config: Partial<FlowiseConfig> = {}): FloWiseConnection {
  const resolved = resolveFlowiseConfig(config);
  return new FloWiseConnection({
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    retryBaseDelay: config.retryBaseDelay,
    retryMaxDelay: config.retryMaxDelay,
  });
}

/**
 * Probe whether Flowise is reachable and whether the resolved API key
 * authenticates successfully. Never throws: returns a `FlowiseReadiness`
 * snapshot with `pingOk=false` / `authOk=false` on failure, plus a short
 * `error` string for diagnostics.
 *
 * Contract guarantees:
 *
 * - Runs two HTTP calls at most: `GET /api/v1/ping` always, and
 *   `GET /api/v1/chatflows` only when a key is present.
 * - Hard-caps each call at 5000 ms so the UI doesn't block on a slow
 *   Flowise.
 * - Performs no mutations and does not affect the connection singleton.
 */
export async function probeFlowiseReadiness(config: Partial<FlowiseConfig> = {}): Promise<FlowiseReadiness> {
  const { baseUrl, apiKey, apiKeySource } = resolveFlowiseConfig(config);
  const normalisedBase = baseUrl.replace(/\/$/, '');
  const checkedAt = Date.now();
  const hasApiKey = apiKey !== undefined && apiKey.length > 0;

  const pingUrl = `${normalisedBase}${FLOWISE_ENDPOINTS.ping}`;
  let pingOk = false;
  let error: string | undefined;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(pingUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    pingOk = response.ok;
    if (!pingOk) {
      error = `ping ${response.status}`;
    }
  } catch (err) {
    error = `ping ${err instanceof Error ? err.message : String(err)}`;
  }

  if (!pingOk || !hasApiKey) {
    return { baseUrl: normalisedBase, hasApiKey, apiKeySource, pingOk, checkedAt, error };
  }

  const flowsUrl = `${normalisedBase}${FLOWISE_ENDPOINTS.chatflows}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(flowsUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return {
        baseUrl: normalisedBase,
        hasApiKey,
        apiKeySource,
        pingOk,
        authOk: false,
        checkedAt,
        error: `auth ${response.status}`,
      };
    }
    const data = (await response.json()) as unknown;
    const flowCount = Array.isArray(data) ? data.length : 0;
    return { baseUrl: normalisedBase, hasApiKey, apiKeySource, pingOk, authOk: true, flowCount, checkedAt };
  } catch (err) {
    return {
      baseUrl: normalisedBase,
      hasApiKey,
      apiKeySource,
      pingOk,
      authOk: false,
      checkedAt,
      error: `auth ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
