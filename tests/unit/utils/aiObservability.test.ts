/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordAiFailure,
  getAiFailures,
  getAiFailureStats,
  resolveAiFailure,
  clearAiFailures,
  AiFailureType,
} from '@/common/utils/aiObservability';

describe('aiObservability', () => {
  beforeEach(() => {
    clearAiFailures();
  });

  afterEach(() => {
    clearAiFailures();
  });

  describe('recordAiFailure', () => {
    it('should record a failure with required fields', () => {
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const failures = getAiFailures();
      expect(failures).toHaveLength(1);
      expect(failures[0].id).toBe(id);
      expect(failures[0].failureType).toBe(AiFailureType.MODEL_API_FAILURE);
      expect(failures[0].component).toBe('TestComponent');
      expect(failures[0].message).toBe('Test failure');
    });

    it('should record failure with error object', () => {
      const error = new Error('API call failed');
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
        error,
      });

      const failures = getAiFailures();
      expect(failures[0].error).toBeDefined();
      expect(failures[0].error?.name).toBe('Error');
      expect(failures[0].error?.message).toBe('API call failed');
    });

    it('should record failure with context', () => {
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
        context: { url: 'https://api.example.com', model: 'gpt-4' },
      });

      const failures = getAiFailures();
      expect(failures[0].context).toEqual({
        url: 'https://api.example.com',
        model: 'gpt-4',
      });
    });

    it('should record failure with agent type and model', () => {
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
        agentType: 'gemini',
        model: 'gemini-2.5-pro',
        provider: 'google',
      });

      const failures = getAiFailures();
      expect(failures[0].agentType).toBe('gemini');
      expect(failures[0].model).toBe('gemini-2.5-pro');
      expect(failures[0].provider).toBe('google');
    });

    it('should generate correlation ID if not provided', () => {
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
      });

      const failures = getAiFailures();
      expect(failures[0].correlationId).toBeDefined();
      expect(failures[0].correlationId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should use provided correlation ID', () => {
      const correlationId = 'test-correlation-id';
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
        correlationId,
      });

      const failures = getAiFailures();
      expect(failures[0].correlationId).toBe(correlationId);
    });
  });

  describe('getAiFailures', () => {
    beforeEach(() => {
      clearAiFailures();
      // Record some test failures
      recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'Component1',
        message: 'Failure 1',
        correlationId: 'corr-1',
      });
      recordAiFailure({
        failureType: AiFailureType.AGENT_CRASH,
        component: 'Component2',
        message: 'Failure 2',
        correlationId: 'corr-2',
      });
      recordAiFailure({
        failureType: AiFailureType.TIMEOUT,
        component: 'Component1',
        message: 'Failure 3',
        correlationId: 'corr-1',
      });
    });

    it('should get all recent failures by default', () => {
      const failures = getAiFailures();
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should filter by correlation ID', () => {
      const failures = getAiFailures({ correlationId: 'corr-1' });
      expect(failures.length).toBeGreaterThanOrEqual(1);
      expect(failures.every((f: { correlationId: string }) => f.correlationId === 'corr-1')).toBe(true);
    });

    it('should filter by failure type', () => {
      // Record a specific failure type for this test
      recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'Component1',
        message: 'Test model api failure',
      });

      const failures = getAiFailures({ type: AiFailureType.MODEL_API_FAILURE });
      expect(failures.length).toBeGreaterThanOrEqual(1);
      expect(failures.some((f: { failureType: string }) => f.failureType === AiFailureType.MODEL_API_FAILURE)).toBe(
        true
      );
    });

    it('should filter by unresolved status', () => {
      const failures = getAiFailures({ unresolved: true });
      expect(failures.length).toBeGreaterThan(0);
      expect(failures.every((f) => !f.resolved)).toBe(true);
    });

    it('should limit results with recent parameter', () => {
      const failures = getAiFailures({ recent: 1 });
      expect(failures).toHaveLength(1);
    });
  });

  describe('resolveAiFailure', () => {
    it('should mark a failure as resolved', () => {
      const id = recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
      });

      let failures = getAiFailures({ unresolved: true });
      expect(failures).toHaveLength(1);

      resolveAiFailure(id);

      failures = getAiFailures({ unresolved: true });
      expect(failures).toHaveLength(0);

      const allFailures = getAiFailures();
      expect(allFailures[0].resolved).toBe(true);
      expect(allFailures[0].resolvedAt).toBeDefined();
    });
  });

  describe('getAiFailureStats', () => {
    beforeEach(() => {
      clearAiFailures();
      recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'Component1',
        message: 'Failure 1',
      });
      recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'Component1',
        message: 'Failure 2',
      });
      recordAiFailure({
        failureType: AiFailureType.AGENT_CRASH,
        component: 'Component2',
        message: 'Failure 3',
      });
    });

    it('should return failure statistics', () => {
      const stats = getAiFailureStats();
      expect(stats.total).toBe(3);
      expect(stats.unresolved).toBe(3);
      expect(stats.byType).toEqual({
        model_api_failure: 2,
        agent_crash: 1,
      });
      expect(Object.keys(stats.byCategory)).not.toHaveLength(0);
      expect(Object.keys(stats.bySeverity)).not.toHaveLength(0);
    });
  });

  describe('clearAiFailures', () => {
    it('should clear all failure records', () => {
      recordAiFailure({
        failureType: AiFailureType.MODEL_API_FAILURE,
        component: 'TestComponent',
        message: 'Test failure',
      });

      expect(getAiFailures().length).toBeGreaterThan(0);

      clearAiFailures();

      expect(getAiFailures()).toHaveLength(0);
    });
  });
});
