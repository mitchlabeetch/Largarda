/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export { BasePlugin } from './BasePlugin';
export type { PluginMessageHandler } from './BasePlugin';

// Telegram plugin
export { TelegramPlugin } from './telegram/TelegramPlugin';
export * from './telegram/TelegramAdapter';
export * from './telegram/TelegramKeyboards';

// DingTalk plugin
export { DingTalkPlugin } from './dingtalk/DingTalkPlugin';

// WeChat plugin
export { WeixinPlugin } from './weixin/WeixinPlugin';

// WeCom (Enterprise WeChat) plugin
export { WecomPlugin } from './wecom/WecomPlugin';

// WhatsApp plugin
export { WhatsAppPlugin } from './whatsapp/WhatsAppPlugin';
export { PolicyChecker } from './whatsapp/PolicyChecker';
// WhatsApp adapter exports are namespaced to avoid conflicts with Telegram
export {
  toWhatsAppSendParams,
  toUnifiedIncomingMessage as toWhatsAppUnifiedIncomingMessage,
  splitMessage as splitWhatsAppMessage,
  validatePhoneNumber,
  WHATSAPP_MESSAGE_LIMIT,
  extractAction as extractWhatsAppAction,
  buildCallbackData as buildWhatsAppCallbackData,
} from './whatsapp/WhatsAppAdapter';
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
} from './whatsapp/types';
