/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// 复用现有的业务类型定义
import type { ConversationSource, TChatConversation, IConfigStorageRefer } from '@/common/config/storage';
import type { TMessage } from '@/common/chat/chatLib';

/**
 * ======================
 * 数据库专属类型 (新增功能)
 * ======================
 */

/**
 * User account (新增的账户系统)
 */
export interface IUser {
  id: string;
  username: string;
  email?: string;
  password_hash: string;
  avatar_path?: string;
  jwt_secret?: string | null;
  created_at: number;
  updated_at: number;
  last_login?: number | null;
}

// Image metadata removed - images are stored in filesystem and referenced via message.resultDisplay

/**
 * ======================
 * 数据库查询辅助类型
 * ======================
 */

/**
 * Database query result wrapper
 */
export interface IQueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Paginated query result
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * ======================
 * 数据库存储格式 (序列化后的格式)
 * ======================
 */

/**
 * Conversation stored in database (序列化后的格式)
 */
export interface IConversationRow {
  id: string;
  user_id: string;
  name: string;
  type: 'gemini' | 'acp' | 'codex' | 'openclaw-gateway' | 'nanobot' | 'remote';
  extra: string; // JSON string of extra data
  model?: string; // JSON string of TProviderWithModel (gemini type has this)
  status?: 'pending' | 'running' | 'finished';
  source?: ConversationSource; // 会话来源 / Conversation source
  channel_chat_id?: string; // Channel chat isolation ID (e.g. user:xxx or group:xxx)
  created_at: number;
  updated_at: number;
}

/**
 * Message stored in database (序列化后的格式)
 */
export interface IMessageRow {
  id: string;
  conversation_id: string;
  msg_id?: string; // 消息来源ID
  type: string; // TMessage['type']
  content: string; // JSON string of message content
  position?: 'left' | 'right' | 'center' | 'pop';
  status?: 'finish' | 'pending' | 'error' | 'work';
  created_at: number;
}

/**
 * Config stored in database (key-value, 用于数据库版本跟踪)
 */
export interface IConfigRow {
  key: string;
  value: string; // JSON string
  updated_at: number;
}

/**
 * ======================
 * 类型转换函数
 * ======================
 */

/**
 * Convert TChatConversation to database row
 */
export function conversationToRow(conversation: TChatConversation, userId: string): IConversationRow {
  return {
    id: conversation.id,
    user_id: userId,
    name: conversation.name,
    type: conversation.type,
    extra: JSON.stringify(conversation.extra),
    model: 'model' in conversation ? JSON.stringify(conversation.model) : undefined,
    status: conversation.status,
    source: conversation.source,
    channel_chat_id: conversation.channelChatId,
    created_at: conversation.createTime,
    updated_at: conversation.modifyTime,
  };
}

/**
 * Convert database row to TChatConversation
 */
export function rowToConversation(row: IConversationRow): TChatConversation {
  const base = {
    id: row.id,
    name: row.name,
    desc: undefined as string | undefined,
    createTime: row.created_at,
    modifyTime: row.updated_at,
    status: row.status,
    source: row.source,
    channelChatId: row.channel_chat_id,
  };

  // Gemini type has model field
  if (row.type === 'gemini' && row.model) {
    return {
      ...base,
      type: 'gemini' as const,
      extra: JSON.parse(row.extra),
      model: JSON.parse(row.model),
    } as TChatConversation;
  }

  // ACP type
  if (row.type === 'acp') {
    return {
      ...base,
      type: 'acp' as const,
      extra: JSON.parse(row.extra),
    } as TChatConversation;
  }

  // Codex type
  if (row.type === 'codex') {
    return {
      ...base,
      type: 'codex' as const,
      extra: JSON.parse(row.extra),
    } as TChatConversation;
  }

  // OpenClaw Gateway type
  if (row.type === 'openclaw-gateway') {
    return {
      ...base,
      type: 'openclaw-gateway' as const,
      extra: JSON.parse(row.extra),
    } as TChatConversation;
  }

  // Nanobot type
  if (row.type === 'nanobot') {
    return {
      ...base,
      type: 'nanobot' as const,
      extra: JSON.parse(row.extra),
    } as TChatConversation;
  }

  // Remote type
  if (row.type === 'remote') {
    return {
      ...base,
      type: 'remote' as const,
      extra: JSON.parse(row.extra),
    } as TChatConversation;
  }

  // Unknown type - should never happen with valid data
  throw new Error(`Unknown conversation type: ${row.type}`);
}

/**
 * Convert TMessage to database row
 */
export function messageToRow(message: TMessage): IMessageRow {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    msg_id: message.msg_id,
    type: message.type,
    content: JSON.stringify(message.content),
    position: message.position,
    status: message.status,
    created_at: message.createdAt || Date.now(),
  };
}

/**
 * Convert database row to TMessage
 */
export function rowToMessage(row: IMessageRow): TMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    msg_id: row.msg_id,
    type: row.type as TMessage['type'],
    content: JSON.parse(row.content),
    position: row.position,
    status: row.status,
    createdAt: row.created_at,
  } as TMessage;
}

/**
 * ======================
 * 导出类型别名，方便使用
 * ======================
 */

/**
 * ======================
 * 群聊室类型 (Group Chat Room)
 * ======================
 */

export type GroupRoomStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';
export type GroupAgentRole = 'host' | 'sub';
export type GroupAgentStatus = 'idle' | 'running' | 'finished' | 'error' | 'terminated';
export type GroupMessageKind =
  | 'user_input'
  | 'host_response'
  | 'host_dispatch'
  | 'sub_thinking'
  | 'sub_output'
  | 'sub_status'
  | 'result_injection'
  | 'host_thought'
  | 'system';
export type GroupMessageStatus = 'finish' | 'pending' | 'error' | 'work';

export interface IGroupRoomRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  host_conversation_id: string;
  status: GroupRoomStatus;
  config: string; // JSON
  created_at: number;
  updated_at: number;
}

export interface IGroupAgentRow {
  id: string;
  room_id: string;
  role: GroupAgentRole;
  agent_type: string;
  conversation_id: string | null;
  display_name: string;
  status: GroupAgentStatus;
  capabilities: string; // JSON
  current_task: string | null;
  created_at: number;
  terminated_at: number | null;
}

export interface IGroupMessageRow {
  id: string;
  room_id: string;
  sender_type: 'user' | 'agent';
  sender_id: string | null;
  msg_kind: GroupMessageKind;
  content: string; // JSON
  ref_message_id: string | null;
  status: GroupMessageStatus | null;
  seq: number;
  created_at: number;
}

export type {
  // 复用的业务类型
  TChatConversation,
  TMessage,
  IConfigStorageRefer,
};
