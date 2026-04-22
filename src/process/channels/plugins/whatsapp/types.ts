/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WhatsApp Business API configuration
 */
export interface IWhatsAppConfig {
  /** Base URL for WhatsApp Business API */
  baseUrl: string;
  /** API version (e.g., 'v18.0') */
  apiVersion: string;
  /** Phone number ID for sending messages */
  phoneNumberId: string;
  /** Business account ID */
  businessAccountId?: string;
  /** Access token from Meta Developer Console */
  accessToken: string;
  /** Webhook verification token */
  webhookVerifyToken?: string;
  /** Optional: App secret for signature verification */
  appSecret?: string;
}

/**
 * WhatsApp message types supported by the Business API
 */
export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive';

/**
 * WhatsApp API message payload
 */
export interface IWhatsAppMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: WhatsAppMessageType;
  text?: { body: string; preview_url?: boolean };
  image?: { id?: string; link?: string; caption?: string };
  document?: { id?: string; link?: string; caption?: string; filename?: string };
  audio?: { id?: string; link?: string };
  video?: { id?: string; link?: string; caption?: string };
}

/**
 * WhatsApp webhook event structure
 */
export interface IWhatsAppWebhookEvent {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: IWhatsAppIncomingMessage[];
        statuses?: IWhatsAppStatusUpdate[];
      };
      field: 'messages';
    }>;
  }>;
}

/**
 * Incoming message from WhatsApp
 */
export interface IWhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; sha256: string; caption?: string; filename: string };
  audio?: { id: string; mime_type: string; sha256: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  voice?: { id: string; mime_type: string; sha256: string };
  context?: {
    from: string;
    id: string;
  };
}

/**
 * WhatsApp message status update
 */
export interface IWhatsAppStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: IWhatsAppError[];
}

/**
 * WhatsApp API error structure
 */
export interface IWhatsAppError {
  code: number;
  title: string;
  message: string;
  error_data?: { details: string };
  fbtrace_id?: string;
}

/**
 * WhatsApp API response
 */
export interface IWhatsAppApiResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status: 'accepted' }>;
}

/**
 * Readiness check result
 */
export interface IReadinessResult {
  ready: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Policy check types for compliance gating
 */
export type PolicyCheckType =
  | 'rate_limit'
  | 'business_hours'
  | 'template_required'
  | 'opt_in_verified'
  | 'content_compliance';

/**
 * Policy check result
 */
export interface IPolicyResult {
  allowed: boolean;
  violation?: PolicyCheckType;
  reason?: string;
  retryAfter?: number;
}

/**
 * Failure classification for WhatsApp operations
 */
export type FailureClass =
  | 'network'
  | 'authentication'
  | 'rate_limit'
  | 'invalid_recipient'
  | 'message_rejected'
  | 'template_required'
  | 'api_error'
  | 'readiness'
  | 'unknown';

/**
 * Structured failure information
 */
export interface IFailureInfo {
  class: FailureClass;
  code?: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
  originalError?: unknown;
}
