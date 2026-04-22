/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  classifyError,
  generateCorrelationId,
  StructuredLogger,
  ErrorCategory,
  ErrorSeverity,
  createLogger,
} from '@/common/utils/structuredLogger';

describe('structuredLogger', () => {
  describe('classifyError', () => {
    it('should classify authentication errors', () => {
      const error = new Error('401 Unauthorized');
      expect(classifyError(error)).toBe(ErrorCategory.AUTH);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('429 Too Many Requests');
      expect(classifyError(error)).toBe(ErrorCategory.RATE_LIMIT);
    });

    it('should classify network errors', () => {
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';
      expect(classifyError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should classify timeout errors', () => {
      const error = new Error('ETIMEDOUT');
      (error as any).code = 'ETIMEDOUT';
      expect(classifyError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should classify validation errors', () => {
      const error = new Error('400 Bad Request');
      expect(classifyError(error)).toBe(ErrorCategory.VALIDATION);
    });

    it('should classify external API errors', () => {
      const error = new Error('500 Internal Server Error');
      expect(classifyError(error)).toBe(ErrorCategory.EXTERNAL_API);
    });

    it('should classify process crash errors', () => {
      const error = new Error('Process exited unexpectedly');
      expect(classifyError(error)).toBe(ErrorCategory.PROCESS_CRASH);
    });

    it('should classify config errors', () => {
      const error = new Error('Configuration not found');
      expect(classifyError(error)).toBe(ErrorCategory.CONFIG);
    });

    it('should classify file I/O errors', () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      expect(classifyError(error)).toBe(ErrorCategory.FILE_IO);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Some unknown error');
      expect(classifyError(error)).toBe(ErrorCategory.UNKNOWN);
    });

    it('should handle string errors', () => {
      expect(classifyError('401 Unauthorized')).toBe(ErrorCategory.AUTH);
      expect(classifyError('rate limit exceeded')).toBe(ErrorCategory.RATE_LIMIT);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid correlation ID format', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('StructuredLogger', () => {
    it('should set and get correlation ID', () => {
      const logger = new StructuredLogger('TestComponent');
      const correlationId = 'test-123';
      logger.setCorrelationId(correlationId);
      expect(logger.getCorrelationId()).toBe(correlationId);
    });

    it('should generate correlation ID if not set', () => {
      const logger = new StructuredLogger('TestComponent');
      const correlationId = logger.getCorrelationId();
      expect(correlationId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should create log entries with correct structure', () => {
      const logger = new StructuredLogger('TestComponent');
      logger.setCorrelationId('test-corr-id');
      // Just verify methods don't throw
      logger.debug('Debug message', { key: 'value' });
      logger.info('Info message', { key: 'value' });
      logger.warn('Warn message', { key: 'value' });
      logger.error('Error message', new Error('test'), { key: 'value' });
      logger.critical('Critical message', new Error('test'), { key: 'value' });
    });
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger('TestComponent');
      expect(logger).toBeInstanceOf(StructuredLogger);
    });
  });
});
