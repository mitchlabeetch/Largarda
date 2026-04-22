/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppPlugin } from '@process/channels/plugins/whatsapp/WhatsAppPlugin';
import { PolicyChecker } from '@process/channels/plugins/whatsapp/PolicyChecker';
import type { IChannelPluginConfig } from '@process/channels/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createConfig(overrides?: Partial<IChannelPluginConfig>): IChannelPluginConfig {
  const now = Date.now();
  return {
    id: 'whatsapp-1',
    type: 'whatsapp',
    name: 'WhatsApp',
    enabled: true,
    credentials: {
      accessToken: 'test-access-token',
      phoneNumberId: '123456789',
      businessAccountId: 'test-business-id',
    },
    status: 'created',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mockPhoneNumberInfoResponse() {
  return {
    display_phone_number: '+1 555 123 4567',
    verified_name: 'Test Business',
  };
}

function mockSuccessfulSendResponse(messageId = 'wamid.test123') {
  return {
    messaging_product: 'whatsapp',
    contacts: [{ input: '1234567890', wa_id: '1234567890' }],
    messages: [{ id: messageId, message_status: 'accepted' }],
  };
}

describe('WhatsAppPlugin Service Coverage', () => {
  let plugin: WhatsAppPlugin;
  let policyChecker: PolicyChecker;

  beforeEach(() => {
    // Restore the fetch mock in case previous tests replaced it
    global.fetch = mockFetch;
    // Only clear call history, not implementations
    mockFetch.mockClear();
    policyChecker = new PolicyChecker();
    plugin = new WhatsAppPlugin(policyChecker);
  });

  describe('Lifecycle', () => {
    it('should initialize with valid credentials', async () => {
      const config = createConfig();
      await plugin.initialize(config);

      expect(plugin.status).toBe('ready');
    });

    it('should throw error when initializing without credentials', async () => {
      const config = createConfig({ credentials: undefined });

      await expect(plugin.initialize(config)).rejects.toThrow('WhatsApp credentials are required');
    });

    it('should throw error when initializing without access token', async () => {
      const config = createConfig({ credentials: { phoneNumberId: '123' } });

      await expect(plugin.initialize(config)).rejects.toThrow('WhatsApp access token is required');
    });

    it('should throw error when initializing without phone number ID', async () => {
      const config = createConfig({ credentials: { accessToken: 'token' } });

      await expect(plugin.initialize(config)).rejects.toThrow('WhatsApp phone number ID is required');
    });

    it('should start successfully when API is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumberInfoResponse(),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();

      expect(plugin.status).toBe('running');
      expect(plugin.getBotInfo()).toEqual({
        id: '123456789',
        displayName: 'Test Business',
      });
    });

    it('should stop successfully and cleanup state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumberInfoResponse(),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
      await plugin.stop();

      expect(plugin.status).toBe('stopped');
      expect(plugin.getBotInfo()).toBeNull();
    });

    it('should track active users count correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumberInfoResponse(),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();

      expect(plugin.getActiveUserCount()).toBe(0);

      // Simulate adding users through webhook processing
      plugin['activeUsers'].add('1234567890');
      plugin['activeUsers'].add('0987654321');

      expect(plugin.getActiveUserCount()).toBe(2);
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumberInfoResponse(),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should send a text message successfully', async () => {
      const messageId = 'wamid.abc123';
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhoneNumberInfoResponse(), // health check
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessfulSendResponse(messageId),
        });

      const result = await plugin.sendMessage('1234567890', {
        type: 'text',
        text: 'Hello, World!',
      });

      expect(result).toBe(messageId);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should split long messages into chunks', async () => {
      const longText = 'A'.repeat(5000);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhoneNumberInfoResponse(), // health check
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessfulSendResponse('wamid.chunk1'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessfulSendResponse('wamid.chunk2'),
        });

      await plugin.sendMessage('1234567890', {
        type: 'text',
        text: longText,
      });

      // Should make two API calls for the two chunks
      const calls = mockFetch.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should edit message by sending new message (WhatsApp does not support edit)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhoneNumberInfoResponse(), // health check
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessfulSendResponse('wamid.new'),
        });

      // WhatsApp doesn't support editing, so it should send a new message
      await plugin.editMessage('1234567890', 'wamid.old', {
        type: 'text',
        text: 'Updated message',
      });

      // Should have called send API
      const postCalls = mockFetch.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(postCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should track sent messages for deduplication', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhoneNumberInfoResponse(), // health check
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessfulSendResponse('wamid.track123'),
        });

      await plugin.sendMessage('1234567890', {
        type: 'text',
        text: 'Track me',
      });

      expect(plugin['sentMessages'].has('wamid.track123')).toBe(true);
    });
  });

  describe('Webhook Processing', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumberInfoResponse(),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should process incoming webhook messages', async () => {
      const messageHandler = vi.fn();
      plugin.onMessage(messageHandler);

      const webhookEvent = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test-business-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: '123456789',
                  },
                  contacts: [{ profile: { name: 'Test User' }, wa_id: '1234567890' }],
                  messages: [
                    {
                      from: '1234567890',
                      id: 'wamid.incoming1',
                      timestamp: Date.now().toString(),
                      type: 'text',
                      text: { body: 'Hello bot!' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      await plugin.processWebhook(webhookEvent as any);

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'whatsapp',
          chatId: '1234567890',
          user: expect.objectContaining({
            id: '1234567890',
            displayName: 'Test User',
          }),
          content: expect.objectContaining({
            type: 'text',
            text: 'Hello bot!',
          }),
        })
      );
    });

    it('should deduplicate messages by ID', async () => {
      const messageHandler = vi.fn();
      plugin.onMessage(messageHandler);

      const webhookEvent = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test-business-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: '123456789',
                  },
                  messages: [
                    {
                      from: '1234567890',
                      id: 'wamid.duplicate',
                      timestamp: Date.now().toString(),
                      type: 'text',
                      text: { body: 'Duplicate message' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      // Process same message twice
      await plugin.processWebhook(webhookEvent as any);
      await plugin.processWebhook(webhookEvent as any);

      // Should only be handled once
      expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    it('should verify webhook challenge correctly', async () => {
      const config = createConfig({
        credentials: {
          accessToken: 'token',
          phoneNumberId: '123',
          webhookVerifyToken: 'my-verify-token',
        },
      });

      await plugin.initialize(config);

      const result = plugin.verifyWebhookChallenge('subscribe', 'my-verify-token', 'challenge123');
      expect(result).toBe('challenge123');
    });

    it('should reject invalid webhook challenge mode', async () => {
      const result = plugin.verifyWebhookChallenge('invalid', 'token', 'challenge');
      expect(result).toBe(false);
    });

    it('should reject webhook challenge with wrong token', async () => {
      const result = plugin.verifyWebhookChallenge('subscribe', 'wrong-token', 'challenge');
      expect(result).toBe(false);
    });
  });

  describe('Test Connection', () => {
    afterEach(() => {
      // Restore the global fetch mock for other tests
      global.fetch = mockFetch;
    });

    it('should return success for valid credentials', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
      );

      const result = await WhatsAppPlugin.testConnectionWithConfig({
        baseUrl: 'https://graph.facebook.com',
        apiVersion: 'v18.0',
        phoneNumberId: '123456789',
        accessToken: 'valid-token',
      });

      expect(result.success).toBe(true);
      expect(result.botInfo).toEqual({
        id: '123456789',
        displayName: 'Test Business',
      });
    });

    it('should return failure for invalid token', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: { message: 'Invalid token' } }),
        })
      );

      const result = await WhatsAppPlugin.testConnectionWithConfig({
        baseUrl: 'https://graph.facebook.com',
        apiVersion: 'v18.0',
        phoneNumberId: '123456789',
        accessToken: 'invalid-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid access token');
    });

    it('should return failure for network errors', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network timeout')));

      const result = await WhatsAppPlugin.testConnectionWithConfig({
        baseUrl: 'https://graph.facebook.com',
        apiVersion: 'v18.0',
        phoneNumberId: '123456789',
        accessToken: 'token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });
});
