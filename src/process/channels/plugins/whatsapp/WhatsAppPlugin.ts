/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BotInfo, IChannelPluginConfig, IUnifiedOutgoingMessage, PluginType } from '../../types';
import { BasePlugin } from '../BasePlugin';
import { PolicyChecker } from './PolicyChecker';
import {
  toWhatsAppSendParams,
  toUnifiedIncomingMessage,
  splitMessage,
  validatePhoneNumber,
  WHATSAPP_MESSAGE_LIMIT,
} from './WhatsAppAdapter';
import type { IWhatsAppConfig, IWhatsAppWebhookEvent, IReadinessResult, IFailureInfo, FailureClass } from './types';

/**
 * WhatsAppPlugin - WhatsApp Business API integration
 *
 * Features:
 * - Explicit readiness checks before operations
 * - Policy-based compliance gating (rate limits, business hours, opt-in)
 * - Structured failure classification with recovery hints
 * - Webhook-based message receiving
 * - Support for text, image, document, and audio messages
 */
export class WhatsAppPlugin extends BasePlugin {
  readonly type: PluginType = 'whatsapp';

  private whatsappConfig: IWhatsAppConfig | null = null;
  private policyChecker: PolicyChecker;
  private botInfo: { phoneNumber: string; businessName?: string } | null = null;

  // Connection state
  private isConnected = false;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 60000; // 1 minute

  // Message tracking for rate limiting and deduplication
  private sentMessages: Map<string, { timestamp: number; status: 'pending' | 'sent' | 'failed' }> = new Map();
  private processedWebhooks: Set<string> = new Set();

  // Active users for status reporting
  private activeUsers: Set<string> = new Set();

  // Failure tracking for observability
  private recentFailures: IFailureInfo[] = [];
  private readonly maxFailuresToTrack = 10;

  constructor(policyChecker?: PolicyChecker) {
    super();
    this.policyChecker = policyChecker ?? new PolicyChecker();
  }

  // ==================== Lifecycle Methods ====================

  /**
   * Initialize the WhatsApp plugin with configuration
   */
  protected async onInitialize(pluginConfig: IChannelPluginConfig): Promise<void> {
    const credentials = pluginConfig.credentials;
    if (!credentials) {
      throw new Error('WhatsApp credentials are required');
    }

    const accessToken = credentials.accessToken as string | undefined;
    const phoneNumberId = credentials.phoneNumberId as string | undefined;

    if (!accessToken) {
      throw new Error('WhatsApp access token is required');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp phone number ID is required');
    }

    this.whatsappConfig = {
      baseUrl: (credentials.baseUrl as string) ?? 'https://graph.facebook.com',
      apiVersion: (credentials.apiVersion as string) ?? 'v18.0',
      phoneNumberId,
      businessAccountId: credentials.businessAccountId as string | undefined,
      accessToken,
      webhookVerifyToken: credentials.webhookVerifyToken as string | undefined,
      appSecret: credentials.appSecret as string | undefined,
    };
  }

  /**
   * Start the WhatsApp plugin
   * Performs readiness check before marking as running
   */
  protected async onStart(): Promise<void> {
    const readiness = await this.checkReadiness();
    if (!readiness.ready) {
      throw new Error(`WhatsApp plugin not ready: ${readiness.reason}`);
    }

    // Validate credentials by making a test request
    try {
      const phoneNumber = await this.fetchPhoneNumberInfo();
      this.botInfo = {
        phoneNumber: phoneNumber.display_phone_number,
        businessName: phoneNumber.verified_name,
      };

      this.isConnected = true;
      this.lastHealthCheck = Date.now();

      console.log(`[WhatsAppPlugin] Started for ${phoneNumber.display_phone_number}`);
    } catch (error) {
      const failure = this.classifyFailure(error);
      throw new Error(`Failed to start WhatsApp plugin: ${failure.message}`, { cause: error });
    }
  }

  /**
   * Stop the WhatsApp plugin
   */
  protected async onStop(): Promise<void> {
    this.isConnected = false;
    this.botInfo = null;
    this.sentMessages.clear();
    this.activeUsers.clear();

    console.log('[WhatsAppPlugin] Stopped and cleaned up');
  }

  // ==================== Readiness API ====================

  /**
   * Check if the plugin is ready to send/receive messages
   * Explicit readiness contract for policy compliance
   */
  async checkReadiness(): Promise<IReadinessResult> {
    if (!this.whatsappConfig) {
      return { ready: false, reason: 'Plugin not initialized' };
    }

    // Check credentials are present
    if (!this.whatsappConfig.accessToken) {
      return { ready: false, reason: 'Access token not configured' };
    }

    if (!this.whatsappConfig.phoneNumberId) {
      return { ready: false, reason: 'Phone number ID not configured' };
    }

    // Check rate limits aren't exhausted
    const rateStatus = this.policyChecker.getRateLimitStatus();
    if (rateStatus.second.used >= rateStatus.second.limit) {
      return { ready: false, reason: 'Per-second rate limit reached' };
    }

    if (rateStatus.day.used >= rateStatus.day.limit) {
      return { ready: false, reason: 'Daily rate limit reached' };
    }

    // Verify API connectivity if we haven't checked recently
    const now = Date.now();
    if (now - this.lastHealthCheck > this.healthCheckInterval) {
      try {
        await this.fetchPhoneNumberInfo();
        this.lastHealthCheck = now;
      } catch (error) {
        const failure = this.classifyFailure(error);
        this.recordFailure(failure);
        return {
          ready: false,
          reason: `API connectivity check failed: ${failure.message}`,
          details: { failureClass: failure.class },
        };
      }
    }

    return {
      ready: true,
      details: {
        phoneNumber: this.botInfo?.phoneNumber,
        rateLimitStatus: rateStatus,
      },
    };
  }

  /**
   * Get detailed readiness status for diagnostics
   */
  async getReadinessDetails(): Promise<
    IReadinessResult & {
      configPresent: boolean;
      rateLimitStatus: { second: { used: number; limit: number }; day: { used: number; limit: number } };
      lastHealthCheck: number;
      isConnected: boolean;
    }
  > {
    const readiness = await this.checkReadiness();
    return {
      ...readiness,
      configPresent: !!this.whatsappConfig,
      rateLimitStatus: this.policyChecker.getRateLimitStatus(),
      lastHealthCheck: this.lastHealthCheck,
      isConnected: this.isConnected,
    };
  }

  // ==================== Message Sending ====================

  /**
   * Send a message to a WhatsApp user
   * Policy-gated: checks rate limits, opt-in, templates before sending
   */
  async sendMessage(chatId: string, message: IUnifiedOutgoingMessage): Promise<string> {
    // Pre-send readiness check
    const readiness = await this.checkReadiness();
    if (!readiness.ready) {
      throw this.createError('Plugin not ready for sending', 'readiness', false, readiness.reason);
    }

    // Validate phone number format
    const validation = validatePhoneNumber(chatId);
    if (!validation.valid) {
      throw this.createError('Invalid recipient phone number', 'invalid_recipient', false, validation.error);
    }

    // Policy check
    const isSessionMessage = this.activeUsers.has(chatId);
    const { payload, isTemplate } = toWhatsAppSendParams(validation.normalized!, message);

    const policyCheck = this.policyChecker.checkSendPolicy({
      recipientId: chatId,
      isTemplate,
      isSessionMessage,
    });

    if (!policyCheck.allowed) {
      throw this.createError(
        `Policy violation: ${policyCheck.violation}`,
        policyCheck.violation === 'rate_limit' ? 'rate_limit' : 'message_rejected',
        policyCheck.violation === 'rate_limit', // Rate limits are recoverable
        policyCheck.reason,
        policyCheck.retryAfter
      );
    }

    // Send message with chunking for long text
    const text = message.text ?? '';
    const chunks = splitMessage(text, WHATSAPP_MESSAGE_LIMIT);
    let lastMessageId = '';

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunkPayload = i === 0 ? payload : { ...payload, text: { body: chunks[i] } };
        const messageId = await this.sendToWhatsAppApi(validation.normalized!, chunkPayload);
        lastMessageId = messageId;

        // Track for deduplication
        this.sentMessages.set(messageId, { timestamp: Date.now(), status: 'sent' });
        this.policyChecker.recordSend(chatId);
      }

      // Track this user as active
      this.activeUsers.add(chatId);

      return lastMessageId;
    } catch (error) {
      const failure = this.classifyFailure(error);
      this.recordFailure(failure);
      throw this.createError(failure.message, failure.class, failure.recoverable, undefined, failure.retryAfter);
    }
  }

  /**
   * Edit an existing message (not supported by WhatsApp API)
   * Will send a new message instead
   */
  async editMessage(chatId: string, _messageId: string, message: IUnifiedOutgoingMessage): Promise<void> {
    console.warn('[WhatsAppPlugin] Edit not supported by WhatsApp API, sending new message');
    await this.sendMessage(chatId, message);
  }

  // ==================== Webhook Handling ====================

  /**
   * Process incoming webhook from WhatsApp
   * Called by the webhook handler when a message is received
   */
  async processWebhook(event: IWhatsAppWebhookEvent): Promise<void> {
    const entry = event.entry?.[0];
    if (!entry) return;

    const change = entry.changes?.[0];
    if (!change || change.field !== 'messages') return;

    const value = change.value;
    const messages = value.messages;

    if (messages && messages.length > 0) {
      for (const message of messages) {
        // Deduplication check
        if (this.processedWebhooks.has(message.id)) {
          continue;
        }
        this.processedWebhooks.add(message.id);

        // Cleanup old entries periodically
        if (this.processedWebhooks.size > 1000) {
          this.cleanupProcessedWebhooks();
        }

        // Convert and emit
        const unifiedMessage = toUnifiedIncomingMessage(event);
        if (unifiedMessage) {
          this.activeUsers.add(message.from);
          await this.emitMessage(unifiedMessage);
        }
      }
    }
  }

  /**
   * Verify webhook signature from Meta
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.whatsappConfig?.appSecret) {
      console.warn('[WhatsAppPlugin] Cannot verify webhook: appSecret not configured');
      return false;
    }

    try {
      const crypto = require('crypto');
      const expected = crypto.createHmac('sha256', this.whatsappConfig.appSecret).update(body, 'utf8').digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Verify webhook challenge from Meta
   */
  verifyWebhookChallenge(mode: string, token: string, challenge: string): string | false {
    if (mode !== 'subscribe') {
      return false;
    }

    if (token !== this.whatsappConfig?.webhookVerifyToken) {
      return false;
    }

    return challenge;
  }

  // ==================== Status & Info ====================

  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  getBotInfo(): BotInfo | null {
    if (!this.botInfo) return null;
    return {
      id: this.whatsappConfig?.phoneNumberId ?? '',
      displayName: this.botInfo.businessName ?? this.botInfo.phoneNumber,
    };
  }

  /**
   * Get recent failures for observability
   */
  getRecentFailures(): IFailureInfo[] {
    return [...this.recentFailures];
  }

  /**
   * Clear failure history
   */
  clearFailureHistory(): void {
    this.recentFailures = [];
  }

  // ==================== Private Helpers ====================

  /**
   * Send message to WhatsApp Business API
   */
  private async sendToWhatsAppApi(phoneNumber: string, payload: unknown): Promise<string> {
    if (!this.whatsappConfig) {
      throw new Error('Plugin not initialized');
    }

    const url = `${this.whatsappConfig.baseUrl}/${this.whatsappConfig.apiVersion}/${this.whatsappConfig.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.whatsappConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`WhatsApp API error: ${error.error?.message ?? response.statusText}`);
    }

    const data = await response.json();
    return data.messages?.[0]?.id ?? `msg_${Date.now()}`;
  }

  /**
   * Fetch phone number info from WhatsApp API
   */
  private async fetchPhoneNumberInfo(): Promise<{
    display_phone_number: string;
    verified_name: string;
  }> {
    if (!this.whatsappConfig) {
      throw new Error('Plugin not initialized');
    }

    const url = `${this.whatsappConfig.baseUrl}/${this.whatsappConfig.apiVersion}/${this.whatsappConfig.phoneNumberId}?access_token=${this.whatsappConfig.accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Failed to fetch phone number info: ${error.error?.message ?? response.statusText}`);
    }

    return response.json();
  }

  /**
   * Classify an error into a failure type
   */
  private classifyFailure(error: unknown): IFailureInfo {
    const message = error instanceof Error ? error.message : String(error);

    // Authentication errors
    if (message.includes('401') || message.includes('Authentication') || message.includes('token')) {
      return {
        class: 'authentication',
        message: 'Authentication failed: check access token',
        recoverable: false,
      };
    }

    // Rate limit errors
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many')) {
      return {
        class: 'rate_limit',
        message: 'Rate limit exceeded',
        recoverable: true,
        retryAfter: 60000, // 1 minute default
      };
    }

    // Invalid recipient
    if (message.includes('invalid') && message.includes('recipient')) {
      return {
        class: 'invalid_recipient',
        message: 'Invalid recipient phone number',
        recoverable: false,
      };
    }

    // Template required
    if (message.includes('template')) {
      return {
        class: 'template_required',
        message: 'Message template required for this type of message',
        recoverable: false,
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('ECONN')) {
      return {
        class: 'network',
        message: 'Network error: please check connectivity',
        recoverable: true,
        retryAfter: 5000,
      };
    }

    // Default to API error
    return {
      class: 'api_error',
      message,
      recoverable: false,
      originalError: error,
    };
  }

  /**
   * Record a failure for observability
   */
  private recordFailure(failure: IFailureInfo): void {
    this.recentFailures.unshift(failure);
    if (this.recentFailures.length > this.maxFailuresToTrack) {
      this.recentFailures.pop();
    }
  }

  /**
   * Create a structured error with failure classification
   */
  private createError(
    message: string,
    failureClass: FailureClass,
    recoverable: boolean,
    details?: string,
    retryAfter?: number
  ): Error {
    const error = new Error(details ? `${message}: ${details}` : message);
    (error as Error & { failureClass: FailureClass }).failureClass = failureClass;
    (error as Error & { recoverable: boolean }).recoverable = recoverable;
    if (retryAfter) {
      (error as Error & { retryAfter: number }).retryAfter = retryAfter;
    }
    return error;
  }

  /**
   * Clean up old processed webhook IDs
   */
  private cleanupProcessedWebhooks(): void {
    // Keep only the 500 most recent
    const entries = Array.from(this.processedWebhooks);
    this.processedWebhooks = new Set(entries.slice(-500));
  }

  // ==================== Static Test Connection ====================

  /**
   * Test connection with credentials
   * Note: This overrides the base class static method with WhatsApp-specific signature
   */
  static async testConnection(_token: string): Promise<{ success: boolean; botUsername?: string; error?: string }> {
    // WhatsApp requires multiple credentials, not just a token
    // This method should be called with a JSON-encoded config object as the token parameter
    // or use the instance method for proper testing
    return {
      success: false,
      error: 'Use WhatsAppPlugin.testConnectionWithConfig() for WhatsApp-specific testing',
    };
  }

  /**
   * Test connection with full WhatsApp config
   */
  static async testConnectionWithConfig(
    config: IWhatsAppConfig
  ): Promise<{ success: boolean; botInfo?: BotInfo; error?: string }> {
    try {
      const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}?access_token=${config.accessToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));

        if (response.status === 401) {
          return { success: false, error: 'Invalid access token' };
        }

        return { success: false, error: error.error?.message ?? `HTTP ${response.status}` };
      }

      const data = await response.json();

      return {
        success: true,
        botInfo: {
          id: config.phoneNumberId,
          displayName: data.verified_name ?? data.display_phone_number,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}
