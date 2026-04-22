/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IUnifiedIncomingMessage,
  IUnifiedOutgoingMessage,
  IUnifiedUser,
  IUnifiedMessageContent,
} from '../../types';
import type { IWhatsAppIncomingMessage, IWhatsAppMessagePayload, IWhatsAppWebhookEvent } from './types';

/**
 * Maximum message length for WhatsApp text messages
 * WhatsApp has a 4096 character limit for text messages
 */
export const WHATSAPP_MESSAGE_LIMIT = 4000; // Leave buffer for safety

/**
 * Convert WhatsApp webhook event to unified incoming message format
 */
export function toUnifiedIncomingMessage(event: IWhatsAppWebhookEvent): IUnifiedIncomingMessage | null {
  const entry = event.entry?.[0];
  if (!entry) {
    return null;
  }

  const change = entry.changes?.[0];
  if (!change || change.field !== 'messages') {
    return null;
  }

  const value = change.value;
  const messages = value.messages;
  if (!messages || messages.length === 0) {
    return null;
  }

  const message = messages[0];
  const contact = value.contacts?.[0];

  const user: IUnifiedUser = {
    id: message.from,
    displayName: contact?.profile?.name ?? message.from,
  };

  const content = extractMessageContent(message);

  return {
    id: message.id,
    platform: 'whatsapp',
    chatId: message.from,
    user,
    content,
    timestamp: parseInt(message.timestamp, 10) * 1000, // Convert to milliseconds
    replyToMessageId: message.context?.id,
    raw: event,
  };
}

/**
 * Extract unified message content from WhatsApp message
 */
function extractMessageContent(message: IWhatsAppIncomingMessage): IUnifiedMessageContent {
  // Text message
  if (message.text) {
    return {
      type: 'text',
      text: message.text.body,
    };
  }

  // Image message
  if (message.image) {
    return {
      type: 'photo',
      text: message.image.caption ?? '',
      attachments: [
        {
          type: 'photo',
          fileId: message.image.id,
          mimeType: message.image.mime_type,
        },
      ],
    };
  }

  // Document message
  if (message.document) {
    return {
      type: 'document',
      text: message.document.caption ?? '',
      attachments: [
        {
          type: 'document',
          fileId: message.document.id,
          fileName: message.document.filename,
          mimeType: message.document.mime_type,
        },
      ],
    };
  }

  // Audio/Voice message
  if (message.audio || message.voice) {
    const audio = message.audio || message.voice!;
    return {
      type: 'voice',
      text: '',
      attachments: [
        {
          type: 'voice',
          fileId: audio.id,
          mimeType: audio.mime_type,
        },
      ],
    };
  }

  // Video message
  if (message.video) {
    return {
      type: 'video',
      text: message.video.caption ?? '',
      attachments: [
        {
          type: 'video',
          fileId: message.video.id,
          mimeType: message.video.mime_type,
        },
      ],
    };
  }

  // Default fallback for unknown types
  return {
    type: 'text',
    text: '',
  };
}

/**
 * Convert unified outgoing message to WhatsApp API payload
 */
export function toWhatsAppSendParams(
  chatId: string,
  message: IUnifiedOutgoingMessage
): { payload: IWhatsAppMessagePayload; isTemplate: boolean } {
  const basePayload: Omit<IWhatsAppMessagePayload, 'type' | 'text' | 'image' | 'document'> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: chatId,
  };

  // Handle image messages
  if (message.type === 'image' && message.imageUrl) {
    return {
      payload: {
        ...basePayload,
        type: 'image',
        image: {
          link: message.imageUrl,
        },
      },
      isTemplate: false,
    };
  }

  // Handle file/document messages
  if (message.type === 'file' && message.fileUrl) {
    return {
      payload: {
        ...basePayload,
        type: 'document',
        document: {
          link: message.fileUrl,
          filename: message.fileName ?? 'document',
        },
      },
      isTemplate: false,
    };
  }

  // Handle button/interactive messages
  if (message.type === 'buttons' && message.buttons) {
    return {
      payload: {
        ...basePayload,
        type: 'interactive',
        // Note: Full interactive message structure would require more complex mapping
        // This is a simplified version
        text: { body: message.text ?? '' },
      },
      isTemplate: false,
    };
  }

  // Default to text message
  const text = message.text ?? '';
  const truncatedText = text.length > WHATSAPP_MESSAGE_LIMIT ? text.slice(0, WHATSAPP_MESSAGE_LIMIT - 3) + '...' : text;

  return {
    payload: {
      ...basePayload,
      type: 'text',
      text: {
        body: truncatedText,
        preview_url: true,
      },
    },
    isTemplate: false,
  };
}

/**
 * Split a long message into chunks that fit within WhatsApp limits
 */
export function splitMessage(text: string, limit: number = WHATSAPP_MESSAGE_LIMIT): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Find a good breaking point
    let breakPoint = limit;
    if (remaining.length > limit) {
      // Try to break at a sentence or word boundary
      const lastPeriod = remaining.lastIndexOf('.', limit);
      const lastSpace = remaining.lastIndexOf(' ', limit);

      if (lastPeriod > limit * 0.7) {
        breakPoint = lastPeriod + 1;
      } else if (lastSpace > limit * 0.7) {
        breakPoint = lastSpace;
      }
    }

    chunks.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return chunks;
}

/**
 * Extract action from WhatsApp interactive message callback
 */
export function extractAction(callbackData: string): {
  category: string;
  action: string;
  params?: Record<string, string>;
} {
  const parts = callbackData.split(':');

  if (parts.length >= 2) {
    return {
      category: parts[0],
      action: parts[1],
      params: parts.length > 2 ? Object.fromEntries(parts.slice(2).map((p) => p.split('='))) : undefined,
    };
  }

  return { category: 'unknown', action: callbackData };
}

/**
 * Build callback data for WhatsApp interactive buttons
 */
export function buildCallbackData(category: string, action: string, params?: Record<string, string>): string {
  let data = `${category}:${action}`;
  if (params && Object.keys(params).length > 0) {
    const paramStr = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join(':');
    data += `:${paramStr}`;
  }
  return data;
}

/**
 * Validate WhatsApp phone number format
 * WhatsApp uses E.164 format without the + prefix in most API calls
 */
export function validatePhoneNumber(phoneNumber: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // E.164 format requires 10-15 digits
  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      error: 'Phone number must be between 10 and 15 digits (E.164 format)',
    };
  }

  // Must start with country code (1-3 digits)
  // Valid country codes are 1-3 digits
  const validCountryCodes = [
    '1', // US/Canada
    '33', // France
    '44', // UK
    '49', // Germany
    '86', // China
    '91', // India
    // Add more as needed
  ];

  const hasValidCountryCode = validCountryCodes.some((cc) => digits.startsWith(cc));
  if (!hasValidCountryCode && digits.length < 11) {
    return {
      valid: false,
      error: 'Phone number must include a valid country code',
    };
  }

  return {
    valid: true,
    normalized: digits,
  };
}
