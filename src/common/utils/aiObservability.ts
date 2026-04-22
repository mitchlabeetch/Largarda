/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI failure observability surface.
 * Tracks and categorizes AI-related failures for debugging and monitoring.
 */

import { createLogger, ErrorCategory, ErrorSeverity, generateCorrelationId } from './structuredLogger';

const logger = createLogger('AIObservability');

/**
 * AI failure types for categorization.
 */
export enum AiFailureType {
  // Model API failures (OpenAI, Anthropic, Gemini, etc.)
  MODEL_API_FAILURE = 'model_api_failure',
  // MCP tool execution failures
  MCP_TOOL_FAILURE = 'mcp_tool_failure',
  // Agent process crashes
  AGENT_CRASH = 'agent_crash',
  // Timeout failures
  TIMEOUT = 'timeout',
  // Context window exceeded
  CONTEXT_EXCEEDED = 'context_exceeded',
  // Permission denied
  PERMISSION_DENIED = 'permission_denied',
  // Configuration errors
  CONFIG_ERROR = 'config_error',
  // Invalid response from model
  INVALID_RESPONSE = 'invalid_response',
  // Stream parsing errors
  STREAM_PARSE_ERROR = 'stream_parse_error',
}

/**
 * AI failure record with full context.
 */
export interface AiFailureRecord {
  id: string;
  correlationId: string;
  timestamp: string;
  failureType: AiFailureType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  component: string;
  agentType?: string;
  model?: string;
  provider?: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  context?: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: string;
}

/**
 * In-memory failure store (could be persisted to DB in production).
 */
class FailureStore {
  private failures: Map<string, AiFailureRecord> = new Map();
  private maxFailures = 1000;

  add(record: AiFailureRecord): void {
    // Prune oldest if at capacity
    if (this.failures.size >= this.maxFailures) {
      const oldestKey = this.failures.keys().next().value;
      this.failures.delete(oldestKey);
    }
    this.failures.set(record.id, record);
  }

  get(id: string): AiFailureRecord | undefined {
    return this.failures.get(id);
  }

  getByCorrelationId(correlationId: string): AiFailureRecord[] {
    return Array.from(this.failures.values()).filter((f) => f.correlationId === correlationId);
  }

  getByType(type: AiFailureType): AiFailureRecord[] {
    return Array.from(this.failures.values()).filter((f) => f.failureType === type);
  }

  getByCategory(category: ErrorCategory): AiFailureRecord[] {
    return Array.from(this.failures.values()).filter((f) => f.category === category);
  }

  getRecent(limit: number = 50): AiFailureRecord[] {
    return Array.from(this.failures.values())
      .toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getUnresolved(): AiFailureRecord[] {
    return Array.from(this.failures.values()).filter((f) => !f.resolved);
  }

  markResolved(id: string): void {
    const record = this.failures.get(id);
    if (record) {
      record.resolved = true;
      record.resolvedAt = new Date().toISOString();
    }
  }

  clear(): void {
    this.failures.clear();
  }

  getStats(): {
    total: number;
    unresolved: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const failures = Array.from(this.failures.values());
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const f of failures) {
      byType[f.failureType] = (byType[f.failureType] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    }

    return {
      total: failures.length,
      unresolved: failures.filter((f) => !f.resolved).length,
      byType,
      byCategory,
      bySeverity,
    };
  }
}

const failureStore = new FailureStore();

/**
 * Record an AI failure with full context.
 */
export function recordAiFailure(params: {
  failureType: AiFailureType;
  component: string;
  message: string;
  error?: Error | unknown;
  context?: Record<string, unknown>;
  agentType?: string;
  model?: string;
  provider?: string;
  correlationId?: string;
}): string {
  const correlationId = params.correlationId || generateCorrelationId();
  const errorObj =
    params.error instanceof Error ? params.error : params.error ? new Error(String(params.error)) : undefined;

  const category = errorObj ? classifyError(errorObj) : ErrorCategory.UNKNOWN;
  const severity = determineSeverity(params.failureType, category);

  const record: AiFailureRecord = {
    id: `${correlationId}-${Date.now()}`,
    correlationId,
    timestamp: new Date().toISOString(),
    failureType: params.failureType,
    category,
    severity,
    component: params.component,
    agentType: params.agentType,
    model: params.model,
    provider: params.provider,
    message: params.message,
    error: errorObj
      ? {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack,
          code: (errorObj as any).code,
        }
      : undefined,
    context: params.context,
    resolved: false,
  };

  failureStore.add(record);

  // Log the failure
  logger.error(`[${params.failureType}] ${params.message}`, errorObj, {
    ...params.context,
    failureId: record.id,
    agentType: params.agentType,
    model: params.model,
    provider: params.provider,
  });

  return record.id;
}

/**
 * Classify error for category determination.
 */
function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const code = (error as any).code?.toLowerCase();

  if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid key')) {
    return ErrorCategory.AUTH;
  }
  if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
    return ErrorCategory.RATE_LIMIT;
  }
  if (message.includes('timeout') || code === 'etimedout') {
    return ErrorCategory.NETWORK;
  }
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return ErrorCategory.EXTERNAL_API;
  }
  if (message.includes('process') && (message.includes('exit') || message.includes('crash'))) {
    return ErrorCategory.PROCESS_CRASH;
  }
  if (message.includes('config') || message.includes('setting')) {
    return ErrorCategory.CONFIG;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine severity based on failure type and category.
 */
function determineSeverity(failureType: AiFailureType, category: ErrorCategory): ErrorSeverity {
  // Critical failures
  if (failureType === AiFailureType.AGENT_CRASH || category === ErrorCategory.PROCESS_CRASH) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity
  if (category === ErrorCategory.AUTH || category === ErrorCategory.RATE_LIMIT) {
    return ErrorSeverity.ERROR;
  }

  // Medium severity
  if (failureType === AiFailureType.TIMEOUT || category === ErrorCategory.NETWORK) {
    return ErrorSeverity.WARN;
  }

  return ErrorSeverity.ERROR;
}

/**
 * Mark a failure as resolved.
 */
export function resolveAiFailure(id: string): void {
  failureStore.markResolved(id);
  logger.info(`Resolved failure: ${id}`);
}

/**
 * Get failure records for debugging.
 */
export function getAiFailures(params?: {
  correlationId?: string;
  type?: AiFailureType;
  category?: ErrorCategory;
  recent?: number;
  unresolved?: boolean;
}): AiFailureRecord[] {
  if (params?.correlationId) {
    return failureStore.getByCorrelationId(params.correlationId);
  }
  if (params?.type) {
    return failureStore.getByType(params.type);
  }
  if (params?.category) {
    return failureStore.getByCategory(params.category);
  }
  if (params?.unresolved) {
    return failureStore.getUnresolved();
  }
  if (params?.recent) {
    return failureStore.getRecent(params.recent);
  }
  return failureStore.getRecent(50);
}

/**
 * Get failure statistics.
 */
export function getAiFailureStats(): ReturnType<FailureStore['getStats']> {
  return failureStore.getStats();
}

/**
 * Clear all failure records (useful for testing).
 */
export function clearAiFailures(): void {
  failureStore.clear();
  logger.info('Cleared all failure records');
}
