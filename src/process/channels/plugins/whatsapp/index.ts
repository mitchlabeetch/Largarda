/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export { WhatsAppPlugin } from './WhatsAppPlugin';
export { PolicyChecker } from './PolicyChecker';
export {
  toWhatsAppSendParams,
  toUnifiedIncomingMessage,
  splitMessage,
  validatePhoneNumber,
  WHATSAPP_MESSAGE_LIMIT,
  extractAction,
  buildCallbackData,
} from './WhatsAppAdapter';
export type {
  IWhatsAppConfig,
  IWhatsAppMessagePayload,
  IWhatsAppWebhookEvent,
  IWhatsAppIncomingMessage,
  IWhatsAppStatusUpdate,
  IWhatsAppError,
  IWhatsAppApiResponse,
  IReadinessResult,
  IPolicyResult,
  PolicyCheckType,
  IFailureInfo,
  FailureClass,
} from './types';
