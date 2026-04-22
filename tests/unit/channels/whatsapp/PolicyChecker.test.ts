/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PolicyChecker } from '@process/channels/plugins/whatsapp/PolicyChecker';
import type { PolicyCheckType } from '@process/channels/plugins/whatsapp/types';

describe('PolicyChecker', () => {
  let policyChecker: PolicyChecker;

  beforeEach(() => {
    policyChecker = new PolicyChecker({
      messagesPerSecond: 10,
      messagesPerDay: 1000,
      businessHoursOnly: false,
    });
  });

  describe('Rate Limiting', () => {
    it('should allow messages within rate limit', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(true);
    });

    it('should enforce per-second rate limit', () => {
      // Exhaust the per-second limit
      for (let i = 0; i < 10; i++) {
        policyChecker.recordSend('1234567890');
      }

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('rate_limit' as PolicyCheckType);
      expect(result.retryAfter).toBeDefined();
    });

    it('should report rate limit status', () => {
      policyChecker.recordSend('1234567890');
      policyChecker.recordSend('1234567890');

      const status = policyChecker.getRateLimitStatus();
      expect(status.second.used).toBe(2);
      expect(status.second.limit).toBe(10);
    });

    it('should reset rate limits', () => {
      policyChecker.recordSend('1234567890');
      policyChecker.resetRateLimits();

      const status = policyChecker.getRateLimitStatus();
      expect(status.second.used).toBe(0);
    });
  });

  describe('Business Hours Policy', () => {
    it('should enforce business hours restriction', () => {
      const businessHoursChecker = new PolicyChecker({
        businessHoursOnly: true,
        businessHours: { start: 9, end: 17, timezone: 'UTC' },
      });

      // Set time to 8 PM (outside business hours)
      vi.setSystemTime(new Date('2025-01-15T20:00:00Z'));

      const result = businessHoursChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('business_hours' as PolicyCheckType);
      expect(result.retryAfter).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should allow messages during business hours', () => {
      const businessHoursChecker = new PolicyChecker({
        businessHoursOnly: true,
        businessHours: { start: 9, end: 17, timezone: 'UTC' },
      });

      // Set time to 2 PM (within business hours)
      vi.setSystemTime(new Date('2025-01-15T14:00:00Z'));

      const result = businessHoursChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should not enforce business hours when disabled', () => {
      const noBusinessHoursChecker = new PolicyChecker({
        businessHoursOnly: false,
      });

      // Set time to 8 PM
      vi.setSystemTime(new Date('2025-01-15T20:00:00Z'));

      const result = noBusinessHoursChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Opt-in Policy', () => {
    it('should require opt-in for non-session messages', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('opt_in_verified' as PolicyCheckType);
    });

    it('should allow messages to opted-in users', () => {
      policyChecker.recordOptIn('1234567890');

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: true,
      });

      expect(result.allowed).toBe(true);
    });

    it('should track opt-in status', () => {
      expect(policyChecker.hasOptIn('1234567890')).toBe(false);

      policyChecker.recordOptIn('1234567890');

      expect(policyChecker.hasOptIn('1234567890')).toBe(true);
    });

    it('should clear opt-in records', () => {
      policyChecker.recordOptIn('1234567890');
      policyChecker.clearOptIns();

      expect(policyChecker.hasOptIn('1234567890')).toBe(false);
    });
  });

  describe('Template Policy', () => {
    beforeEach(() => {
      policyChecker.recordOptIn('1234567890');
    });

    it('should require templates for non-session messages', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('template_required' as PolicyCheckType);
    });

    it('should validate approved templates', () => {
      policyChecker.addApprovedTemplate('welcome_template');

      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: true,
        templateName: 'welcome_template',
      });

      expect(result.allowed).toBe(true);
    });

    it('should reject unapproved templates', () => {
      const result = policyChecker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: false,
        isTemplate: true,
        templateName: 'unapproved_template',
      });

      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('template_required' as PolicyCheckType);
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

  describe('Combined Policies', () => {
    it('should check all policies in order', () => {
      const checker = new PolicyChecker({
        messagesPerSecond: 1,
        businessHoursOnly: true,
        businessHours: { start: 9, end: 17, timezone: 'UTC' },
      });

      // Set time outside business hours
      vi.setSystemTime(new Date('2025-01-15T20:00:00Z'));

      const result = checker.checkSendPolicy({
        recipientId: '1234567890',
        isSessionMessage: true,
      });

      // Should fail on business hours before rate limit
      expect(result.allowed).toBe(false);
      expect(result.violation).toBe('business_hours' as PolicyCheckType);

      vi.useRealTimers();
    });

    it('should handle multiple recipients independently', () => {
      policyChecker.recordOptIn('1111111111');

      // Should allow opted-in user
      expect(
        policyChecker.checkSendPolicy({
          recipientId: '1111111111',
          isSessionMessage: false,
          isTemplate: true,
        }).allowed
      ).toBe(true);

      // Should reject non-opted-in user
      expect(
        policyChecker.checkSendPolicy({
          recipientId: '2222222222',
          isSessionMessage: false,
          isTemplate: true,
        }).allowed
      ).toBe(false);
    });
  });
});
