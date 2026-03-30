/**
 * Tests for GroupRoomService — DB operations.
 * Covers Case 6 (消息落库) and Case 11 (创建群组) foundations.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GroupRoomService } from '@process/services/groupRoom/GroupRoomService';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { createTestDb } from './helpers';

// Mock uuid to produce deterministic IDs
let uuidCounter = 0;
vi.mock('@/common/utils', () => ({
  uuid: vi.fn(() => `test-uuid-${++uuidCounter}`),
}));

describe('GroupRoomService', () => {
  let db: ISqliteDriver;
  let service: GroupRoomService;

  beforeEach(() => {
    uuidCounter = 0;
    db = createTestDb();
    service = new GroupRoomService(db);
  });

  afterEach(() => {
    db.close();
  });

  // ==========================================
  // createRoom
  // ==========================================

  describe('createRoom', () => {
    it('creates room and host member in a single transaction', () => {
      const room = service.createRoom({
        userId: 'user-1',
        name: '测试群组',
        hostConversationId: 'conv-host',
      });

      expect(room.id).toBe('test-uuid-1');
      expect(room.userId).toBe('user-1');
      expect(room.name).toBe('测试群组');
      expect(room.status).toBe('idle');
      expect(room.hostConversationId).toBe('conv-host');

      // Verify host member was also created
      const data = service.getRoom(room.id);
      expect(data).not.toBeNull();
      expect(data!.members).toHaveLength(1);
      expect(data!.members[0].role).toBe('host');
      expect(data!.members[0].displayName).toBe('Host');
      expect(data!.members[0].conversationId).toBe('conv-host');
    });

    it('sets description when provided', () => {
      const room = service.createRoom({
        userId: 'user-1',
        name: '有描述的群',
        description: '一段描述',
        hostConversationId: 'conv-host',
      });
      expect(room.description).toBe('一段描述');
    });

    it('sets description to null when omitted', () => {
      const room = service.createRoom({
        userId: 'user-1',
        name: '无描述',
        hostConversationId: 'conv-host',
      });
      expect(room.description).toBeNull();
    });
  });

  // ==========================================
  // getRoom
  // ==========================================

  describe('getRoom', () => {
    it('returns null for non-existent room', () => {
      expect(service.getRoom('nonexistent')).toBeNull();
    });

    it('returns room with all members ordered by created_at', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      // Add a sub agent
      service.addAgent({
        roomId: room.id,
        role: 'sub',
        agentType: 'claude',
        displayName: 'Worker',
        conversationId: 'conv-sub',
      });

      const data = service.getRoom(room.id);
      expect(data!.members).toHaveLength(2);
      expect(data!.members[0].role).toBe('host');
      expect(data!.members[1].role).toBe('sub');
      expect(data!.members[1].displayName).toBe('Worker');
    });
  });

  // ==========================================
  // addAgent
  // ==========================================

  describe('addAgent', () => {
    it('dynamically adds sub-agent to existing room', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      const member = service.addAgent({
        roomId: room.id,
        role: 'sub',
        agentType: 'claude',
        displayName: '代码员小张',
        conversationId: 'conv-zhang',
      });

      expect(member.role).toBe('sub');
      expect(member.agentType).toBe('claude');
      expect(member.displayName).toBe('代码员小张');
      expect(member.status).toBe('idle');
      expect(member.currentTask).toBeNull();

      const data = service.getRoom(room.id);
      expect(data!.members).toHaveLength(2);
    });

    it('allows null conversationId', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      const member = service.addAgent({
        roomId: room.id,
        role: 'sub',
        agentType: 'gemini',
        displayName: '设计师',
        conversationId: null,
      });

      expect(member.conversationId).toBeNull();
    });
  });

  // ==========================================
  // addMessage — seq atomic increment
  // ==========================================

  describe('addMessage', () => {
    it('assigns seq starting from 1', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      service.addMessage({
        roomId: room.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: '你好',
      });

      const msgs = service.getMessagesByRoom(room.id);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].seq).toBe(1);
      expect(msgs[0].content).toBe('你好');
      expect(msgs[0].msgKind).toBe('user_input');
    });

    it('increments seq atomically for consecutive messages', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      service.addMessage({
        roomId: room.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: 'msg-1',
      });
      service.addMessage({
        roomId: room.id,
        senderType: 'agent',
        senderId: 'host',
        msgKind: 'host_response',
        content: 'msg-2',
      });
      service.addMessage({
        roomId: room.id,
        senderType: 'agent',
        senderId: 'sub-1',
        msgKind: 'sub_output',
        content: 'msg-3',
      });

      const msgs = service.getMessagesByRoom(room.id);
      expect(msgs.map((m) => m.seq)).toEqual([1, 2, 3]);
    });

    it('isolates seq across different rooms', () => {
      const room1 = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });
      const room2 = service.createRoom({
        userId: 'u1',
        name: 'r2',
        hostConversationId: 'c2',
      });

      service.addMessage({
        roomId: room1.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: 'room1-msg1',
      });
      service.addMessage({
        roomId: room1.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: 'room1-msg2',
      });
      service.addMessage({
        roomId: room2.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: 'room2-msg1',
      });

      const msgs1 = service.getMessagesByRoom(room1.id);
      const msgs2 = service.getMessagesByRoom(room2.id);
      expect(msgs1.map((m) => m.seq)).toEqual([1, 2]);
      expect(msgs2.map((m) => m.seq)).toEqual([1]);
    });

    it('returns a message id', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      const msgId = service.addMessage({
        roomId: room.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: 'hi',
      });

      expect(typeof msgId).toBe('string');
      expect(msgId.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // getMessagesByRoom
  // ==========================================

  describe('getMessagesByRoom', () => {
    it('returns empty array for room with no messages', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });
      expect(service.getMessagesByRoom(room.id)).toEqual([]);
    });

    it('returns messages in seq order', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      service.addMessage({
        roomId: room.id,
        senderType: 'agent',
        senderId: 'host',
        msgKind: 'host_response',
        content: 'second',
      });
      service.addMessage({
        roomId: room.id,
        senderType: 'user',
        senderId: 'u1',
        msgKind: 'user_input',
        content: 'third',
      });

      const msgs = service.getMessagesByRoom(room.id);
      expect(msgs[0].seq).toBe(1);
      expect(msgs[1].seq).toBe(2);
    });
  });

  // ==========================================
  // updateRoomStatus
  // ==========================================

  describe('updateRoomStatus', () => {
    it('updates room status and updatedAt', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      service.updateRoomStatus(room.id, 'running');

      const data = service.getRoom(room.id);
      expect(data!.room.status).toBe('running');
      expect(data!.room.updatedAt).toBeGreaterThanOrEqual(room.updatedAt);
    });
  });

  // ==========================================
  // updateAgentStatus
  // ==========================================

  describe('updateAgentStatus', () => {
    it('updates agent status and currentTask', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      const sub = service.addAgent({
        roomId: room.id,
        role: 'sub',
        agentType: 'claude',
        displayName: 'Worker',
        conversationId: null,
      });

      service.updateAgentStatus(sub.id, 'running', '执行任务X');

      const data = service.getRoom(room.id);
      const updated = data!.members.find((m) => m.id === sub.id);
      expect(updated!.status).toBe('running');
      expect(updated!.currentTask).toBe('执行任务X');
    });

    it('clears currentTask when set to null', () => {
      const room = service.createRoom({
        userId: 'u1',
        name: 'r1',
        hostConversationId: 'c1',
      });

      const sub = service.addAgent({
        roomId: room.id,
        role: 'sub',
        agentType: 'claude',
        displayName: 'Worker',
        conversationId: null,
      });

      service.updateAgentStatus(sub.id, 'running', '执行中');
      service.updateAgentStatus(sub.id, 'finished', null);

      const data = service.getRoom(room.id);
      const updated = data!.members.find((m) => m.id === sub.id);
      expect(updated!.status).toBe('finished');
      expect(updated!.currentTask).toBeNull();
    });
  });

  // ==========================================
  // listRooms
  // ==========================================

  describe('listRooms', () => {
    it('lists rooms ordered by updatedAt desc', () => {
      const r1 = service.createRoom({ userId: 'u1', name: 'first', hostConversationId: 'c1' });
      service.createRoom({ userId: 'u1', name: 'second', hostConversationId: 'c2' });

      // Force r1 to have a later updatedAt by updating its status
      service.updateRoomStatus(r1.id, 'running');

      const rooms = service.listRooms('u1');
      expect(rooms).toHaveLength(2);
      // r1 was updated more recently, so it comes first
      expect(rooms[0].name).toBe('first');
      expect(rooms[1].name).toBe('second');
    });

    it('returns empty for unknown user', () => {
      expect(service.listRooms('nonexistent')).toEqual([]);
    });
  });
});
