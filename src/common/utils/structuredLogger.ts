/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Structured logging with error classification and correlation IDs.
 * Provides production-safe observability for AI failures and debugging.
 */

import { safeStringify } from './secretMasking';

/**
 * Error categories for classification and routing.
 */
export enum ErrorCategory {
  // Authentication/Authorization failures
  AUTH = 'auth',
  // Network/Connectivity issues
  NETWORK = 'network',
  // Rate limiting/quota exceeded
  RATE_LIMIT = 'rate_limit',
  // Invalid input/validation errors
  VALIDATION = 'validation',
  // External API failures (OpenAI, Anthropic, etc.)
  EXTERNAL_API = 'external_api',
  // Process/worker crashes
  PROCESS_CRASH = 'process_crash',
  // Configuration errors
  CONFIG = 'config',
  // File system I/O errors
  FILE_IO = 'file_io',
  // MCP server errors
  MCP = 'mcp',
  // Unknown/unclassified errors
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels for alerting and filtering.
 */
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Structured log entry with full context.
 */
export interface LogEntry {
  timestamp: string;
  level: ErrorSeverity;
  category?: ErrorCategory;
  correlationId?: string;
  component: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
}

/**
 * Classify an error into a category based on error patterns.
 */
export function classifyError(error: Error | string | unknown): ErrorCategory {
  const errorMessage = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof Error ? (error as any).code : undefined;

  // Authentication errors
  if (
    /401|unauthorized|invalid.*key|expired.*token|authentication/i.test(errorMessage) ||
    errorCode === 'ERR_INVALID_AUTH'
  ) {
    return ErrorCategory.AUTH;
  }

  // Rate limiting
  if (/429|rate.*limit|quota|too.*many.*requests/i.test(errorMessage) || errorCode === 'ERR_RATE_LIMIT') {
    return ErrorCategory.RATE_LIMIT;
  }

  // Network errors
  if (
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network|connection|timeout/i.test(errorMessage) ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ENOTFOUND'
  ) {
    return ErrorCategory.NETWORK;
  }

  // Validation errors
  if (/400|invalid.*input|validation|malformed|bad.*request/i.test(errorMessage) || errorCode === 'ERR_VALIDATION') {
    return ErrorCategory.VALIDATION;
  }

  // External API errors (500, 502, 503, etc.)
  if (
    /500|502|503|504|internal.*error|service.*unavailable|bad.*gateway/i.test(errorMessage) ||
    errorCode === 'ERR_EXTERNAL_API'
  ) {
    return ErrorCategory.EXTERNAL_API;
  }

  // Process crashes
  if (/process.*exit|crash|killed|signal/i.test(errorMessage) || errorCode === 'ERR_PROCESS_CRASH') {
    return ErrorCategory.PROCESS_CRASH;
  }

  // Configuration errors
  if (/config|setting|not.*configured|missing.*config/i.test(errorMessage) || errorCode === 'ERR_CONFIG') {
    return ErrorCategory.CONFIG;
  }

  // File I/O errors
  if (
    /ENOENT|EACCES|EPERM|file.*not.*found|permission.*denied/i.test(errorMessage) ||
    errorCode === 'ENOENT' ||
    errorCode === 'EACCES' ||
    errorCode === 'EPERM'
  ) {
    return ErrorCategory.FILE_IO;
  }

  // MCP errors
  if (/mcp|tool.*call|server.*error/i.test(errorMessage)) {
    return ErrorCategory.MCP;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Generate a correlation ID for request tracing.
 * Format: {timestamp}-{random}
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Structured logger with correlation ID support and secret redaction.
 */
export class StructuredLogger {
  private component: string;
  private correlationId?: string;

  constructor(component: string) {
    this.component = component;
  }

  /**
   * Set the correlation ID for the current request/session.
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get the current correlation ID, generating one if not set.
   */
  getCorrelationId(): string {
    if (!this.correlationId) {
      this.correlationId = generateCorrelationId();
    }
    return this.correlationId;
  }

  /**
   * Create a log entry with full context.
   */
  private createLogEntry(
    level: ErrorSeverity,
    message: string,
    data?: Record<string, unknown>,
    error?: Error | unknown
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      correlationId: this.correlationId,
      message,
    };

    if (data) {
      entry.data = data as Record<string, unknown>;
    }

    if (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      entry.error = {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
        code: (errorObj as any).code,
      };
      entry.category = classifyError(errorObj);
    }

    return entry;
  }

  /**
   * Emit a log entry to console (bridged to renderer via mainLogger).
   */
  private emit(entry: LogEntry): void {
    const prefix = `[${entry.component}]`;
    const correlationPrefix = entry.correlationId ? `[${entry.correlationId}]` : '';
    const categoryPrefix = entry.category ? `[${entry.category}]` : '';
    const fullPrefix = `${prefix}${correlationPrefix}${categoryPrefix}`;

    const message = `${fullPrefix} ${entry.message}`;

    switch (entry.level) {
      case ErrorSeverity.DEBUG:
        console.debug(message, entry.data ? safeStringify(entry.data) : '');
        break;
      case ErrorSeverity.INFO:
        console.log(message, entry.data ? safeStringify(entry.data) : '');
        break;
      case ErrorSeverity.WARN:
        console.warn(message, entry.data ? safeStringify(entry.data) : '');
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        console.error(message, entry.data ? safeStringify(entry.data) : '', entry.error);
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.emit(this.createLogEntry(ErrorSeverity.DEBUG, message, data));
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.emit(this.createLogEntry(ErrorSeverity.INFO, message, data));
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.emit(this.createLogEntry(ErrorSeverity.WARN, message, data));
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    this.emit(this.createLogEntry(ErrorSeverity.ERROR, message, data, error));
  }

  critical(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    this.emit(this.createLogEntry(ErrorSeverity.CRITICAL, message, data, error));
  }
}

/**
 * Create a logger instance for a component.
 */
export function createLogger(component: string): StructuredLogger {
  return new StructuredLogger(component);
}
