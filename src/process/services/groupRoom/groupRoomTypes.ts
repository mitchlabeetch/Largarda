/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
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

export type IGroupRoom = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  hostConversationId: string;
  status: GroupRoomStatus;
  createdAt: number;
  updatedAt: number;
};

export type IGroupMember = {
  id: string;
  roomId: string;
  role: GroupAgentRole;
  agentType: string;
  conversationId: string | null;
  displayName: string;
  status: GroupAgentStatus;
  currentTask: string | null;
  createdAt: number;
};
