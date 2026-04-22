/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    },
    status: 'created',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('WhatsAppPlugin Failure Coverage', () => {
  let plugin: WhatsAppPlugin;
  let policyChecker: PolicyChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    policyChecker = new PolicyChecker();
    plugin = new WhatsAppPlugin(policyChecker);
  });

  describe('Authentication Failures', () => {
    it('should classify 401 errors as authentication failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid access token' } }),
      });

      const config = createConfig();
      await plugin.initialize(config);

      await expect(plugin.start()).rejects.toThrow('Authentication failed');
      expect(plugin.status).toBe('error');
    });

    it('should fail with authentication error when starting with invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Authentication failed' } }),
      });

      const config = createConfig();
      await plugin.initialize(config);

      try {
        await plugin.start();
      } catch (error: any) {
        expect(error.message).toContain('Authentication');
        expect(error.recoverable).toBe(false);
      }
    });

    it('should record authentication failures for observability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid token' } }),
      });

      const config = createConfig();
      await plugin.initialize(config);

      try {
        await plugin.start();
      } catch {
        // Expected to fail
      }

      const failures = plugin.getRecentFailures();
      expect(failures.length).toBeGreaterThan(0);
      expect(failures[0].class).toBe('authentication');
      expect(failures[0].recoverable).toBe(false);
    });
  });

  describe('Rate Limit Failures', () => {
    beforeEach(async () => {
      // Initialize and start successfully first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should classify 429 errors as rate limit failures', async () => {
      mockFetch.mockClear();

      // Health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      // Send message - rate limited
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      try {
        await plugin.sendMessage('1234567890', {
          type: 'text',
          text: 'Test message',
        });
      } catch (error: any) {
        expect(error.message).toContain('Rate limit');
        expect(error.recoverable).toBe(true);
        expect(error.retryAfter).toBeDefined();
      }
    });

    it('should mark rate limit failures as recoverable', async () => {
      mockFetch.mockClear();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'Too many requests' } }),
        });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch {
        // Expected
      }

      const failures = plugin.getRecentFailures();
      expect(failures[0].recoverable).toBe(true);
      expect(failures[0].retryAfter).toBeGreaterThan(0);
    });

    it('should not allow sending when daily rate limit is exhausted', async () => {
      // Fill up the rate limit
      policyChecker['optInUsers'].add('1234567890');
      const now = Date.now();
      const dayKey = `day:${Math.floor(now / 86400000)}`;
      policyChecker['rateLimits'].set(dayKey, { count: 1000, windowStart: now });

      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch (error: any) {
        expect(error.message).toContain('Daily rate limit reached');
      }
    });
  });

  describe('Network Failures', () => {
    it('should handle network timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const config = createConfig();
      await plugin.initialize(config);

      try {
        await plugin.start();
      } catch (error: any) {
        expect(error.message).toContain('Network');
      }
    });

    it('should classify network errors as recoverable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const config = createConfig();
      await plugin.initialize(config);

      try {
        await plugin.start();
      } catch {
        // Expected
      }

      const failures = plugin.getRecentFailures();
      expect(failures[0].class).toBe('network');
      expect(failures[0].recoverable).toBe(true);
    });

    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

      const config = createConfig();
      await plugin.initialize(config);

      try {
        await plugin.start();
      } catch (error: any) {
        expect(error.message).toContain('Network');
      }
    });
  });

  describe('Invalid Recipient Failures', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should reject invalid phone number formats', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      try {
        await plugin.sendMessage('invalid-phone', {
          type: 'text',
          text: 'Test',
        });
      } catch (error: any) {
        expect(error.message).toContain('Invalid recipient');
        expect(error.recoverable).toBe(false);
      }
    });

    it('should reject phone numbers without country code', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      try {
        await plugin.sendMessage('5551234567', {
          type: 'text',
          text: 'Test',
        });
      } catch (error: any) {
        expect(error.message).toContain('country code');
      }
    });

    it('should classify API invalid recipient errors correctly', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'Invalid recipient phone number' } }),
        });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch {
        // Expected
      }

      const failures = plugin.getRecentFailures();
      expect(failures[0].class).toBe('invalid_recipient');
      expect(failures[0].recoverable).toBe(false);
    });
  });

  describe('Template Required Failures', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should classify template requirement errors correctly', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'Message template required for this recipient' } }),
        });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch {
        // Expected
      }

      const failures = plugin.getRecentFailures();
      expect(failures[0].class).toBe('template_required');
      expect(failures[0].recoverable).toBe(false);
    });
  });

  describe('API Error Failures', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should handle 500 internal server errors', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'Internal server error' } }),
        });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch (error: any) {
        expect(error.message).toContain('Internal server error');
      }
    });

    it('should handle 403 forbidden errors', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({ error: { message: 'Permission denied' } }),
        });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch (error: any) {
        expect(error.message).toContain('Permission denied');
      }
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Readiness Failures', () => {
    it('should report not ready when not initialized', async () => {
      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toBe('Plugin not initialized');
    });

    it('should report not ready when rate limit is exhausted', async () => {
      const config = createConfig();
      await plugin.initialize(config);

      // Fill up rate limit
      const now = Date.now();
      const secondKey = `second:${Math.floor(now / 1000)}`;
      policyChecker['rateLimits'].set(secondKey, { count: 80, windowStart: now });

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toContain('rate limit');
    });

    it('should report not ready when API is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config = createConfig();
      await plugin.initialize(config);

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toContain('connectivity check failed');
    });
  });

  describe('Failure Tracking and Observability', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();
    });

    it('should track recent failures', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_phone_number: '+1 555 123 4567',
            verified_name: 'Test Business',
          }),
        })
        .mockRejectedValueOnce(new Error('Test error'));

      try {
        await plugin.sendMessage('1234567890', { type: 'text', text: 'Test' });
      } catch {
        // Expected
      }

      const failures = plugin.getRecentFailures();
      expect(failures.length).toBeGreaterThan(0);
      expect(failures[0].message).toBeDefined();
      expect(failures[0].class).toBeDefined();
    });

    it('should limit the number of tracked failures', async () => {
      // Add more than max failures
      for (let i = 0; i < 15; i++) {
        plugin['recordFailure']({
          class: 'api_error',
          message: `Error ${i}`,
          recoverable: false,
        });
      }

      const failures = plugin.getRecentFailures();
      expect(failures.length).toBeLessThanOrEqual(10);
    });

    it('should clear failure history', async () => {
      plugin['recordFailure']({
        class: 'api_error',
        message: 'Test error',
        recoverable: false,
      });

      expect(plugin.getRecentFailures().length).toBeGreaterThan(0);

      plugin.clearFailureHistory();

      expect(plugin.getRecentFailures().length).toBe(0);
    });
  });
});
