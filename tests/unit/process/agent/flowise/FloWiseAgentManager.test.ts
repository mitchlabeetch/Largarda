/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FloWiseAgentManager,
  createFloWiseAgentManager,
  type FloWiseAgentManagerData,
} from '@process/agent/flowise/FloWiseAgentManager';
import type { IAgentEventEmitter } from '@process/task/IAgentEventEmitter';
import type { DealContext } from '@/common/ma/types';

// Mock FloWiseConnection
vi.mock('@process/agent/flowise/FloWiseConnection', () => ({
  FloWiseConnection: vi.fn().mockImplementation(() => ({
    streamFlow: vi.fn().mockResolvedValue({ text: 'Test response' }),
    executeFlow: vi.fn().mockResolvedValue({ text: 'Test response' }),
    healthCheck: vi.fn().mockResolvedValue(true),
    cancel: vi.fn(),
  })),
  FloWiseError: class FloWiseError extends Error {
    constructor(
      public code: string,
      message: string,
      public details: Record<string, unknown>,
      public recoverable: boolean
    ) {
      super(message);
      this.name = 'FloWiseError';
    }
  },
  createFloWiseConnection: vi.fn().mockReturnValue({
    streamFlow: vi.fn().mockResolvedValue({ text: 'Test response' }),
    executeFlow: vi.fn().mockResolvedValue({ text: 'Test response' }),
    healthCheck: vi.fn().mockResolvedValue(true),
    cancel: vi.fn(),
  }),
}));

describe('FloWiseAgentManager', () => {
  let mockEmitter: IAgentEventEmitter;
  let testData: FloWiseAgentManagerData;

  beforeEach(() => {
    mockEmitter = {
      emitConfirmationAdd: vi.fn(),
      emitConfirmationUpdate: vi.fn(),
      emitConfirmationRemove: vi.fn(),
      emitMessage: vi.fn(),
    };

    testData = {
      conversation_id: 'test-conversation-123',
      workspace: '/test/workspace',
      flowId: 'test-flow-id',
      yoloMode: false,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with correct properties', () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      expect(manager.type).toBe('flowise');
      expect(manager.conversation_id).toBe('test-conversation-123');
      expect(manager.workspace).toBe('/test/workspace');
    });

    it('should accept deal context in data', () => {
      const dealContext: DealContext = {
        id: 'deal-123',
        name: 'Test Deal',
        parties: [{ name: 'Acme Corp', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target Inc' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const manager = new FloWiseAgentManager(
        { ...testData, dealContext },
        mockEmitter
      );

      expect(manager.getDealContext()).toEqual(dealContext);
    });
  });

  describe('sendMessage', () => {
    it('should stream flow and emit messages', async () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      await manager.sendMessage({ content: 'Test message' });

      expect(mockEmitter.emitMessage).toHaveBeenCalled();
    });

    it('should update lastActivityAt on message send', async () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);
      const initialActivity = manager.lastActivityAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.sendMessage({ content: 'Test message' });

      expect(manager.lastActivityAt).toBeGreaterThan(initialActivity);
    });
  });

  describe('stop', () => {
    it('should cancel streaming and set status to finished', async () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      await manager.stop();

      expect(manager.status).toBe('finished');
    });
  });

  describe('kill', () => {
    it('should cleanup resources and set status to finished', () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      manager.kill();

      expect(manager.status).toBe('finished');
    });
  });

  describe('setDealContext', () => {
    it('should update deal context', () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      const dealContext: DealContext = {
        id: 'deal-456',
        name: 'New Deal',
        parties: [{ name: 'Buyer Inc', role: 'buyer' }],
        transactionType: 'merger',
        targetCompany: { name: 'Target Corp' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      manager.setDealContext(dealContext);

      expect(manager.getDealContext()).toEqual(dealContext);
    });

    it('should clear deal context when set to null', () => {
      const manager = new FloWiseAgentManager(
        { ...testData, dealContext: {} as DealContext },
        mockEmitter
      );

      manager.setDealContext(null);

      expect(manager.getDealContext()).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Flowise is healthy', async () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      const result = await manager.healthCheck();

      expect(result).toBe(true);
    });
  });

  describe('ensureYoloMode', () => {
    it('should enable yoloMode and return true', async () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      const result = await manager.ensureYoloMode();

      expect(result).toBe(true);
    });
  });

  describe('getConfirmations', () => {
    it('should return empty array initially', () => {
      const manager = new FloWiseAgentManager(testData, mockEmitter);

      expect(manager.getConfirmations()).toEqual([]);
    });
  });
});

describe('createFloWiseAgentManager', () => {
  it('should create a FloWiseAgentManager instance', () => {
    const mockEmitter: IAgentEventEmitter = {
      emitConfirmationAdd: vi.fn(),
      emitConfirmationUpdate: vi.fn(),
      emitConfirmationRemove: vi.fn(),
      emitMessage: vi.fn(),
    };

    const data: FloWiseAgentManagerData = {
      conversation_id: 'test-conv',
      flowId: 'test-flow',
    };

    const manager = createFloWiseAgentManager(data, mockEmitter);

    expect(manager).toBeInstanceOf(FloWiseAgentManager);
    expect(manager.type).toBe('flowise');
  });
});
