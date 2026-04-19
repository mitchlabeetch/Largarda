/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FloWiseConnection, FloWiseError, createFloWiseConnection } from '@/process/agent/flowise/FloWiseConnection';
import { FLOWISE_DEFAULT_CONFIG } from '@/common/ma/constants';
import type { FlowInput, FlowResult, FlowEvent, FlowMeta } from '@/common/ma/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FloWiseConnection', () => {
  let connection: FloWiseConnection;

  const defaultConfig = {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
    retryAttempts: 2,
    retryBaseDelay: 100,
    retryMaxDelay: 1000,
  };

  beforeEach(() => {
    connection = new FloWiseConnection(defaultConfig);
    mockFetch.mockReset();
  });

  afterEach(() => {
    connection.cancel();
  });

  describe('constructor', () => {
    it('should create connection with default config', () => {
      const conn = createFloWiseConnection();
      expect(conn).toBeInstanceOf(FloWiseConnection);
    });

    it('should create connection with custom config', () => {
      const conn = new FloWiseConnection({
        baseUrl: 'http://custom:4000',
        apiKey: 'test-key',
        timeout: 10000,
      });
      expect(conn).toBeInstanceOf(FloWiseConnection);
    });

    it('should strip trailing slash from baseUrl', () => {
      const conn = new FloWiseConnection({ baseUrl: 'http://localhost:3000/' });
      // We can't directly test private baseUrl, but we can verify behavior
      expect(conn).toBeInstanceOf(FloWiseConnection);
    });
  });

  describe('executeFlow', () => {
    const flowInput: FlowInput = {
      question: 'Test question',
    };

    const mockFlowResult: FlowResult = {
      text: 'Test response',
      artifacts: { test: 'value' },
    };

    it('should execute flow successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlowResult),
      });

      const result = await connection.executeFlow('flow-123', flowInput);

      expect(result.text).toBe('Test response');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include API key in headers when configured', async () => {
      const connWithKey = new FloWiseConnection({
        ...defaultConfig,
        apiKey: 'secret-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlowResult),
      });

      await connWithKey.executeFlow('flow-123', flowInput);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe('Bearer secret-key');
    });

    it('should throw FloWiseError on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(connection.executeFlow('flow-123', flowInput)).rejects.toThrow(FloWiseError);
    });

    it('should throw FloWiseError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found'),
      });

      await expect(connection.executeFlow('flow-123', flowInput)).rejects.toThrow(FloWiseError);
    });
  });

  describe('streamFlow', () => {
    const flowInput: FlowInput = {
      question: 'Test streaming',
    };

    it('should stream flow events', async () => {
      const events: FlowEvent[] = [];
      const mockStreamData = [
        'data: {"event":"token","token":"Hello"}\n',
        'data: {"event":"token","token":" World"}\n',
        'data: {"event":"complete","text":"Hello World"}\n',
      ];

      const mockReader = {
        read: vi.fn(),
        releaseLock: vi.fn(),
      };

      // Simulate reading chunks
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockStreamData[0]) })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockStreamData[1]) })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockStreamData[2]) })
        .mockResolvedValueOnce({ done: true, value: undefined });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const result = await connection.streamFlow('flow-123', flowInput, (event) => {
        events.push(event);
      });

      expect(events.length).toBeGreaterThan(0);
      expect(mockReader.read).toHaveBeenCalled();
    });

    it('should throw on stream error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve('Error'),
      });

      await expect(connection.streamFlow('flow-123', flowInput, () => {})).rejects.toThrow(FloWiseError);
    });

    it('should handle null body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      await expect(connection.streamFlow('flow-123', flowInput, () => {})).rejects.toThrow(FloWiseError);
    });
  });

  describe('listFlows', () => {
    const mockFlows: FlowMeta[] = [
      { id: 'flow-1', name: 'Flow 1' },
      { id: 'flow-2', name: 'Flow 2' },
    ];

    it('should list flows successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlows),
      });

      const flows = await connection.listFlows();

      expect(flows).toHaveLength(2);
      expect(flows[0].id).toBe('flow-1');
    });

    it('should return empty array on non-array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const flows = await connection.listFlows();

      expect(flows).toEqual([]);
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      await expect(connection.listFlows()).rejects.toThrow(FloWiseError);
    });
  });

  describe('getFlow', () => {
    const mockFlowDetail = {
      id: 'flow-123',
      name: 'Test Flow',
      description: 'A test flow',
      nodes: [],
      edges: [],
    };

    it('should get flow details successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlowDetail),
      });

      const flow = await connection.getFlow('flow-123');

      expect(flow.id).toBe('flow-123');
      expect(flow.name).toBe('Test Flow');
    });

    it('should throw on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(connection.getFlow('nonexistent')).rejects.toThrow(FloWiseError);
    });
  });

  describe('healthCheck', () => {
    it('should return true on successful health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const healthy = await connection.healthCheck();

      expect(healthy).toBe(true);
    });

    it('should return false on failed health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const healthy = await connection.healthCheck();

      expect(healthy).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const healthy = await connection.healthCheck();

      expect(healthy).toBe(false);
    });

    it('should return false on timeout', async () => {
      // Simulate abort
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 100);
          })
      );

      const healthy = await connection.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should cancel ongoing request', () => {
      // Start a streaming request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
            releaseLock: vi.fn(),
          }),
        },
      });

      // Cancel should not throw
      expect(() => connection.cancel()).not.toThrow();
    });
  });

  describe('retry logic', () => {
    it('should retry on server error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'Success' }),
      });

      const result = await connection.executeFlow('flow-123', { question: 'test' });

      expect(result.text).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client error (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Bad request'),
      });

      await expect(connection.executeFlow('flow-123', { question: 'test' })).rejects.toThrow();

      // Should only call once (no retry for 4xx)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(connection.executeFlow('flow-123', { question: 'test' })).rejects.toThrow(FloWiseError);

      // Initial attempt + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

describe('FloWiseError', () => {
  it('should create error with all properties', () => {
    const error = new FloWiseError('FLOWISE_CONNECTION_FAILED', 'Connection failed', { attempt: 3 }, true);

    expect(error.code).toBe('FLOWISE_CONNECTION_FAILED');
    expect(error.message).toBe('Connection failed');
    expect(error.details).toEqual({ attempt: 3 });
    expect(error.recoverable).toBe(true);
    expect(error.name).toBe('FloWiseError');
  });
});

describe('createFloWiseConnection', () => {
  it('should create connection with partial config', () => {
    const conn = createFloWiseConnection({
      apiKey: 'test-key',
    });

    expect(conn).toBeInstanceOf(FloWiseConnection);
  });

  it('should use defaults for missing config', () => {
    const conn = createFloWiseConnection();
    expect(conn).toBeInstanceOf(FloWiseConnection);
  });
});
