/**
 * Test helpers for GroupRoom orchestration tests.
 * Provides mock ISqliteDriver (in-memory), mock IPC emitters, and mock agents.
 */
import { vi } from 'vitest';
import Database from 'better-sqlite3';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';

// ==========================================
// 1. In-memory SQLite driver
// ==========================================

/**
 * Create a real better-sqlite3 in-memory database wrapped as ISqliteDriver.
 * Schema includes group_rooms, group_agents, group_messages tables.
 * FK constraints to users/conversations are intentionally omitted.
 */
export function createTestDb(): ISqliteDriver {
  const rawDb = new Database(':memory:');
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS group_rooms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      host_conversation_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle'
        CHECK(status IN ('idle','running','paused','finished','error')),
      config TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS group_agents (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('host','sub')),
      agent_type TEXT NOT NULL,
      conversation_id TEXT,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle'
        CHECK(status IN ('idle','running','finished','error','terminated')),
      capabilities TEXT NOT NULL DEFAULT '{}',
      current_task TEXT,
      created_at INTEGER NOT NULL,
      terminated_at INTEGER,
      FOREIGN KEY (room_id) REFERENCES group_rooms(id) ON DELETE CASCADE
    )
  `);

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('user','agent')),
      sender_id TEXT,
      msg_kind TEXT NOT NULL
        CHECK(msg_kind IN (
          'user_input','host_response','host_dispatch',
          'sub_thinking','sub_output','sub_status',
          'result_injection','host_thought','system'
        )),
      content TEXT NOT NULL,
      ref_message_id TEXT,
      status TEXT CHECK(status IN ('finish','pending','error','work')),
      seq INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES group_rooms(id) ON DELETE CASCADE
    )
  `);

  return {
    prepare: (sql: string) => rawDb.prepare(sql),
    exec: (sql: string) => rawDb.exec(sql),
    transaction: <T>(fn: (...args: unknown[]) => T) => rawDb.transaction(fn),
    pragma: (sql: string, options?: { simple?: boolean }) => rawDb.pragma(sql, options),
    close: () => rawDb.close(),
  } as ISqliteDriver;
}

// ==========================================
// 2. IPC emitter spy collector
// ==========================================

export type EmitterSpy = {
  responseStream: Array<Record<string, unknown>>;
  memberChanged: Array<Record<string, unknown>>;
  turnCompleted: Array<Record<string, unknown>>;
  reset: () => void;
};

/**
 * Build spy arrays that collect all IPC emit calls.
 * Must be called AFTER vi.mock('@/common/adapter/ipcBridge') is set up.
 */
export function createEmitterSpy(): EmitterSpy {
  const spy: EmitterSpy = {
    responseStream: [],
    memberChanged: [],
    turnCompleted: [],
    reset() {
      spy.responseStream.length = 0;
      spy.memberChanged.length = 0;
      spy.turnCompleted.length = 0;
    },
  };
  return spy;
}

// ==========================================
// 3. Mock agent behavior registry
// ==========================================

/**
 * Behavior function: receives (input, callIndex) and returns either:
 *  - a string (plain content)
 *  - { content: string; thoughts?: string[] } (with thought events)
 */
export type AgentBehavior = (input: string, callIndex: number) => string | { content: string; thoughts?: string[] };

/** Module-level behavior map keyed by agent config id */
const agentBehaviors = new Map<string, { fn: AgentBehavior; callCount: number }>();
const defaultBehaviorRef: { fn: AgentBehavior } = {
  fn: () => 'default mock response',
};

export function setAgentBehavior(agentId: string, fn: AgentBehavior): void {
  agentBehaviors.set(agentId, { fn, callCount: 0 });
}

export function setDefaultBehavior(fn: AgentBehavior): void {
  defaultBehaviorRef.fn = fn;
}

export function getAgentBehavior(agentId: string): { fn: AgentBehavior; callCount: number } {
  return agentBehaviors.get(agentId) ?? { fn: defaultBehaviorRef.fn, callCount: 0 };
}

export function resetAllBehaviors(): void {
  agentBehaviors.clear();
  defaultBehaviorRef.fn = () => 'default mock response';
}

/**
 * Execute agent behavior and simulate stream events.
 * Called internally by the mocked AcpAgent.sendMessage.
 */
export function executeAgentBehavior(
  configId: string,
  input: string,
  onStreamEvent: (data: Record<string, unknown>) => void,
  onSignalEvent: ((data: Record<string, unknown>) => void) | undefined,
  msgId: string
): void {
  const entry = agentBehaviors.get(configId) ?? {
    fn: defaultBehaviorRef.fn,
    callCount: 0,
  };
  const idx = entry.callCount;
  entry.callCount += 1;
  // Ensure the updated count is stored
  if (!agentBehaviors.has(configId)) {
    agentBehaviors.set(configId, entry);
  }

  const result = entry.fn(input, idx);

  if (typeof result === 'object' && result.thoughts) {
    for (const thought of result.thoughts) {
      onStreamEvent({
        type: 'thought',
        data: thought,
        msg_id: msgId,
        conversation_id: configId,
      });
    }
  }

  const content = typeof result === 'string' ? result : result.content;
  onStreamEvent({
    type: 'content',
    data: content,
    msg_id: msgId,
    conversation_id: configId,
  });

  const finishEvent = {
    type: 'finish',
    data: '',
    msg_id: msgId,
    conversation_id: configId,
  };

  if (onSignalEvent) {
    onSignalEvent(finishEvent);
    return;
  }

  onStreamEvent(finishEvent);
}

// ==========================================
// 4. Mock ConversationService
// ==========================================

export function createMockConversationService() {
  const conversations = new Map<string, Record<string, unknown>>();

  return {
    createConversation: vi.fn().mockImplementation(async (params: Record<string, unknown>) => {
      const id = params.id ?? `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const conv = {
        id,
        type: params.type ?? 'acp',
        name: params.name ?? 'test-conv',
        extra: params.extra ?? {},
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      conversations.set(id as string, conv);
      return conv;
    }),
    getConversation: vi.fn().mockImplementation(async (id: string) => {
      return conversations.get(id);
    }),
    updateConversation: vi.fn().mockResolvedValue(undefined),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    createWithMigration: vi.fn().mockResolvedValue({}),
    listAllConversations: vi.fn().mockResolvedValue([]),
    _store: conversations,
  };
}
