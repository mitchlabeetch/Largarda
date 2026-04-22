/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IPolicyResult, PolicyCheckType } from './types';

/**
 * Rate limit tracking for WhatsApp Business API
 * API limits: https://developers.facebook.com/docs/whatsapp/cloud-api/overview/rate-limits
 */
interface IRateLimitBucket {
  count: number;
  windowStart: number;
}

/**
 * PolicyChecker - Validates operations against compliance and policy rules
 *
 * Implements explicit policy gating for:
 * - Rate limiting (messages per second/minute)
 * - Business hours restrictions
 * - Template requirements for outbound messages
 * - Opt-in verification
 * - Content compliance
 */
export class PolicyChecker {
  private rateLimits: Map<string, IRateLimitBucket> = new Map();
  private readonly messagesPerSecond: number;
  private readonly messagesPerDay: number;
  private businessHoursOnly: boolean;
  private businessHours: { start: number; end: number; timezone: string };

  /**
   * Template IDs for approved message templates (required for promotional messages)
   */
  private approvedTemplates: Set<string> = new Set();

  /**
   * Users who have explicitly opted in to receive messages
   */
  private optInUsers: Set<string> = new Set();

  constructor(options?: {
    messagesPerSecond?: number;
    messagesPerDay?: number;
    businessHoursOnly?: boolean;
    businessHours?: { start: number; end: number; timezone: string };
  }) {
    this.messagesPerSecond = options?.messagesPerSecond ?? 80;
    this.messagesPerDay = options?.messagesPerDay ?? 1000;
    this.businessHoursOnly = options?.businessHoursOnly ?? false;
    this.businessHours = options?.businessHours ?? {
      start: 9, // 9 AM
      end: 18, // 6 PM
      timezone: 'UTC',
    };
  }

  /**
   * Check if sending a message is allowed under current policies
   */
  checkSendPolicy(params: {
    recipientId: string;
    isTemplate?: boolean;
    templateName?: string;
    isSessionMessage?: boolean;
  }): IPolicyResult {
    const { recipientId, isTemplate, templateName, isSessionMessage } = params;

    // Check opt-in for non-session messages
    if (!isSessionMessage && !this.optInUsers.has(recipientId)) {
      return {
        allowed: false,
        violation: 'opt_in_verified',
        reason: 'Recipient has not opted in to receive messages',
      };
    }

    // Check rate limits
    const rateLimitCheck = this.checkRateLimits();
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck;
    }

    // Check business hours for non-template messages
    if (!isTemplate && this.businessHoursOnly) {
      const hoursCheck = this.checkBusinessHours();
      if (!hoursCheck.allowed) {
        return hoursCheck;
      }
    }

    // Check template requirement for promotional/outbound messages
    if (!isSessionMessage && !isTemplate) {
      return {
        allowed: false,
        violation: 'template_required',
        reason: 'Non-session messages require an approved template',
      };
    }

    // Validate template name if provided
    if (isTemplate && templateName && !this.approvedTemplates.has(templateName)) {
      return {
        allowed: false,
        violation: 'template_required',
        reason: `Template "${templateName}" is not in the approved templates list`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check rate limits for the current window
   */
  private checkRateLimits(): IPolicyResult {
    const now = Date.now();
    const secondKey = `second:${Math.floor(now / 1000)}`;
    const dayKey = `day:${Math.floor(now / 86400000)}`;

    // Check per-second limit
    const secondBucket = this.rateLimits.get(secondKey) ?? { count: 0, windowStart: now };
    if (secondBucket.count >= this.messagesPerSecond) {
      return {
        allowed: false,
        violation: 'rate_limit',
        reason: `Rate limit exceeded: ${this.messagesPerSecond} messages per second`,
        retryAfter: 1000 - (now - secondBucket.windowStart),
      };
    }

    // Check per-day limit
    const dayBucket = this.rateLimits.get(dayKey) ?? { count: 0, windowStart: now };
    if (dayBucket.count >= this.messagesPerDay) {
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(0, 0, 0, 0);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      return {
        allowed: false,
        violation: 'rate_limit',
        reason: `Daily rate limit exceeded: ${this.messagesPerDay} messages per day`,
        retryAfter: tomorrow.getTime() - now,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if current time is within business hours
   */
  private checkBusinessHours(): IPolicyResult {
    const now = new Date();
    const currentHour = now.getUTCHours();

    if (currentHour < this.businessHours.start || currentHour >= this.businessHours.end) {
      const nextBusinessStart = new Date(now);
      nextBusinessStart.setUTCHours(this.businessHours.start, 0, 0, 0);
      if (currentHour >= this.businessHours.end) {
        nextBusinessStart.setUTCDate(nextBusinessStart.getUTCDate() + 1);
      }

      return {
        allowed: false,
        violation: 'business_hours',
        reason: `Messages can only be sent during business hours (${this.businessHours.start}:00-${this.businessHours.end}:00 ${this.businessHours.timezone})`,
        retryAfter: nextBusinessStart.getTime() - now.getTime(),
      };
    }

    return { allowed: true };
  }

  /**
   * Record a successful message send for rate limiting
   */
  recordSend(recipientId: string): void {
    const now = Date.now();
    const secondKey = `second:${Math.floor(now / 1000)}`;
    const dayKey = `day:${Math.floor(now / 86400000)}`;

    // Update second bucket
    const secondBucket = this.rateLimits.get(secondKey);
    if (secondBucket) {
      secondBucket.count++;
    } else {
      this.rateLimits.set(secondKey, { count: 1, windowStart: now });
    }

    // Update day bucket
    const dayBucket = this.rateLimits.get(dayKey);
    if (dayBucket) {
      dayBucket.count++;
    } else {
      this.rateLimits.set(dayKey, { count: 1, windowStart: now });
    }

    // Cleanup old entries
    this.cleanupRateLimits();

    // Track this as a session message recipient
    this.optInUsers.add(recipientId);
  }

  /**
   * Add an approved template
   */
  addApprovedTemplate(templateName: string): void {
    this.approvedTemplates.add(templateName);
  }

  /**
   * Record user opt-in
   */
  recordOptIn(phoneNumber: string): void {
    this.optInUsers.add(phoneNumber);
  }

  /**
   * Check if user has opted in
   */
  hasOptIn(phoneNumber: string): boolean {
    return this.optInUsers.has(phoneNumber);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    second: { used: number; limit: number };
    day: { used: number; limit: number };
  } {
    const now = Date.now();
    const secondKey = `second:${Math.floor(now / 1000)}`;
    const dayKey = `day:${Math.floor(now / 86400000)}`;

    return {
      second: {
        used: this.rateLimits.get(secondKey)?.count ?? 0,
        limit: this.messagesPerSecond,
      },
      day: {
        used: this.rateLimits.get(dayKey)?.count ?? 0,
        limit: this.messagesPerDay,
      },
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = Math.floor(now / 86400000);

    for (const [key] of this.rateLimits) {
      const [, timestamp] = key.split(':');
      const window = key.startsWith('second:') ? currentSecond : currentDay;
      if (parseInt(timestamp, 10) < window) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Reset rate limits (useful for testing)
   */
  resetRateLimits(): void {
    this.rateLimits.clear();
  }

  /**
   * Clear opt-in records (useful for testing)
   */
  clearOptIns(): void {
    this.optInUsers.clear();
  }
}
