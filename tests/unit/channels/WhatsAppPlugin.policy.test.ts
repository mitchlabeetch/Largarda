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

describe('WhatsAppPlugin Policy and Readiness Coverage', () => {
  let plugin: WhatsAppPlugin;
  let policyChecker: PolicyChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    policyChecker = new PolicyChecker();
    plugin = new WhatsAppPlugin(policyChecker);
  });

  describe('Readiness Checks', () => {
    it('should report ready when all conditions are met', async () => {
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

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(true);
    });

    it('should report not ready when not initialized', async () => {
      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toBe('Plugin not initialized');
    });

    it('should report not ready when access token is missing', async () => {
      const config = createConfig({ credentials: { phoneNumberId: '123' } });
      await plugin.initialize(config);

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toBe('Access token not configured');
    });

    it('should report not ready when phone number ID is missing', async () => {
      const config = createConfig({ credentials: { accessToken: 'token' } });
      await plugin.initialize(config);

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toBe('Phone number ID not configured');
    });

    it('should report not ready when per-second rate limit is reached', async () => {
      const config = createConfig();
      await plugin.initialize(config);

      // Fill up per-second rate limit
      const now = Date.now();
      const secondKey = `second:${Math.floor(now / 1000)}`;
      policyChecker['rateLimits'].set(secondKey, { count: 80, windowStart: now });

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toBe('Per-second rate limit reached');
    });

    it('should report not ready when daily rate limit is reached', async () => {
      const config = createConfig();
      await plugin.initialize(config);

      // Fill up daily rate limit
      const now = Date.now();
      const dayKey = `day:${Math.floor(now / 86400000)}`;
      policyChecker['rateLimits'].set(dayKey, { count: 1000, windowStart: now });

      const readiness = await plugin.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toBe('Daily rate limit reached');
    });

    it('should include rate limit status in readiness details when ready', async () => {
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

      const readiness = await plugin.checkReadiness();
      expect(readiness.details).toBeDefined();
      expect(readiness.details!.rateLimitStatus).toBeDefined();
      expect(readiness.details!.rateLimitStatus.second).toBeDefined();
      expect(readiness.details!.rateLimitStatus.day).toBeDefined();
    });

    it('should cache health check results and not call API within interval', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();

      // First check calls API
      await plugin.checkReadiness();
      const callCount = mockFetch.mock.calls.length;

      // Second check within interval should not call API
      await plugin.checkReadiness();
      expect(mockFetch.mock.calls.length).toBe(callCount);
    });

    it('should refresh health check after interval expires', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          display_phone_number: '+1 555 123 4567',
          verified_name: 'Test Business',
        }),
      });

      const config = createConfig();
      await plugin.initialize(config);
      await plugin.start();

      // First check
      await plugin.checkReadiness();
      const callCount = mockFetch.mock.calls.length;

      // Simulate time passing
      plugin['lastHealthCheck'] = Date.now() - 70000; // More than 1 minute ago

      // Should call API again
      await plugin.checkReadiness();
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callCount);
    });
  });

  describe('PolicyChecker - Rate Limiting', () => {
    it('should enforce per-second rate limits', () => {
      const now = Date.now();
      const secondKey = `second:${Math.floor(now / 1000)}`;

      // Set rate at limit
      policyChecker['rateLimits'].set(secondKey, { count: 80, windowStart: now });

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('rate_limit');
    });

    it('should enforce daily rate limits', () => {
      const now = Date.now();
      const dayKey = `day:${Math.floor(now / 86400000)}`;

      // Set daily rate at limit
      policyChecker['rateLimits'].set(dayKey, { count: 1000, windowStart: now });

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('rate_limit');
    });

    it('should include retryAfter for rate limit violations', () => {
      const now = Date.now();
      const secondKey = `second:${Math.floor(now / 1000)}`;

      policyChecker['rateLimits'].set(secondKey, { count: 80, windowStart: now - 500 });

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track rate limit usage correctly', () => {
      const initialStatus = policyChecker.getRateLimitStatus();
      expect(initialStatus.second.used).toBe(0);
      expect(initialStatus.day.used).toBe(0);

      policyChecker.recordSend('1234567890');

      const updatedStatus = policyChecker.getRateLimitStatus();
      expect(updatedStatus.second.used).toBe(1);
      expect(updatedStatus.day.used).toBe(1);
    });

    it('should reset rate limits when resetRateLimits is called', () => {
      policyChecker.recordSend('1234567890');
      expect(policyChecker.getRateLimitStatus().second.used).toBe(1);

      policyChecker.resetRateLimits();
      expect(policyChecker.getRateLimitStatus().second.used).toBe(0);
    });
  });

  describe('PolicyChecker - Business Hours', () => {
    it('should enforce business hours when enabled', () => {
      vi.useFakeTimers();
      // Set time to 11 PM UTC (outside business hours 9-17)
      vi.setSystemTime(new Date('2025-01-01T23:00:00Z'));

      const policyWithBusinessHours = new PolicyChecker({
        businessHoursOnly: true,
        businessHours: { start: 9, end: 17, timezone: 'UTC' },
      });

      const result = policyWithBusinessHours.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('business_hours');

      vi.useRealTimers();
    });

    it('should allow messages within business hours', () => {
      vi.useFakeTimers();
      // Set time to 2 PM UTC (within business hours 9-17)
      vi.setSystemTime(new Date('2025-01-01T14:00:00Z'));

      const policyWithBusinessHours = new PolicyChecker({
        businessHoursOnly: true,
        businessHours: { start: 9, end: 17, timezone: 'UTC' },
      });

      const result = policyWithBusinessHours.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should include retryAfter for business hours violations', () => {
      vi.useFakeTimers();
      // Set time to 11 PM UTC (outside business hours)
      vi.setSystemTime(new Date('2025-01-01T23:00:00Z'));

      const policyWithBusinessHours = new PolicyChecker({
        businessHoursOnly: true,
        businessHours: { start: 9, end: 17, timezone: 'UTC' },
      });

      const result = policyWithBusinessHours.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('PolicyChecker - Opt-in Verification', () => {
    it('should require opt-in for non-session messages', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('opt_in_verified');
      expect(result.reason).toContain('opted in');
    });

    it('should allow messages to opted-in users', () => {
      policyChecker.recordOptIn('1234567890');

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: false,
      });

      expect(result.allowed).toBe(true);
    });

    it('should automatically opt-in users who receive messages', async () => {
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

      // User not opted in initially
      expect(policyChecker.hasOptIn('1234567890')).toBe(false);

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
          ok: true,
          json: async () => ({
            messaging_product: 'whatsapp',
            contacts: [{ input: '1234567890', wa_id: '1234567890' }],
            messages: [{ id: 'wamid.test', message_status: 'accepted' }],
          }),
        });

      await plugin.sendMessage('1234567890', {
        type: 'text',
        text: 'Hello!',
      });

      // User should now be opted in
      expect(policyChecker.hasOptIn('1234567890')).toBe(true);
    });

    it('should allow session messages without explicit opt-in', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(true);
    });

    it('should clear opt-ins when clearOptIns is called', () => {
      policyChecker.recordOptIn('1234567890');
      expect(policyChecker.hasOptIn('1234567890')).toBe(true);

      policyChecker.clearOptIns();
      expect(policyChecker.hasOptIn('1234567890')).toBe(false);
    });
  });

  describe('PolicyChecker - Template Requirements', () => {
    it('should require templates for non-session promotional messages', () => {
      policyChecker.recordOptIn('1234567890');

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('template_required');
    });

    it('should allow messages with approved templates', () => {
      policyChecker.recordOptIn('1234567890');
      policyChecker.addApprovedTemplate('welcome_message');

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: true,
        templateName: 'welcome_message',
      });

      expect(result.allowed).toBe(true);
    });

    it('should reject messages with unapproved templates', () => {
      policyChecker.recordOptIn('1234567890');

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: true,
        templateName: 'unapproved_template',
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('template_required');
    });

    it('should allow session messages without templates', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
        isTemplate: false,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('PolicyChecker Configuration', () => {
    it('should use custom rate limits when provided', () => {
      const customPolicy = new PolicyChecker({
        messagesPerSecond: 50,
        messagesPerDay: 500,
      });

      expect(customPolicy.getRateLimitStatus().second.limit).toBe(50);
      expect(customPolicy.getRateLimitStatus().day.limit).toBe(500);
    });

    it('should use default rate limits when not specified', () => {
      expect(policyChecker.getRateLimitStatus().second.limit).toBe(80);
      expect(policyChecker.getRateLimitStatus().day.limit).toBe(1000);
    });

    it('should use custom business hours when provided', () => {
      const customPolicy = new PolicyChecker({
        businessHoursOnly: true,
        businessHours: { start: 8, end: 20, timezone: 'America/New_York' },
      });

      expect(customPolicy['businessHours'].start).toBe(8);
      expect(customPolicy['businessHours'].end).toBe(20);
      expect(customPolicy['businessHours'].timezone).toBe('America/New_York');
    });
  });

  describe('Readiness Details', () => {
    it('should return detailed readiness information', async () => {
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

      const details = plugin.getReadinessDetails();
      expect(details.configPresent).toBe(true);
      expect(details.isConnected).toBe(true);
      expect(details.rateLimitStatus).toBeDefined();
      expect(details.lastHealthCheck).toBeGreaterThan(0);
    });

    it('should include failure class in readiness when API check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('401 Unauthorized'));

      const config = createConfig();
      await plugin.initialize(config);

      const readiness = await plugin.checkReadiness();
      expect(readiness.details).toBeDefined();
      expect(readiness.details!.failureClass).toBe('authentication');
    });
  });
});
