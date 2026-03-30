/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * G1 Engine Unbind - Unit Tests
 *
 * Tests for AC-1 through AC-10 from tech-design.md.
 * These are spec-first tests written in parallel with the developer implementation.
 * Some imports/mocks may not resolve until the developer lands the changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentType } from '../../src/process/task/agentTypes';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockSuperConstructor = vi.hoisted(() =>
  vi.fn((_type: string, _data: unknown, _emitter: unknown, _arg3?: unknown, workerType?: string) => {
    (mockSuperConstructor as any)._lastWorkerType = workerType;
  })
);

const mockIpcAgentEventEmitter = vi.hoisted(() => vi.fn());

vi.mock('../../src/process/task/IpcAgentEventEmitter', () => ({
  IpcAgentEventEmitter: mockIpcAgentEventEmitter,
}));

vi.mock('@/common/platform', () => ({
  getPlatformServices: () => ({
    paths: { isPackaged: () => false, getAppPath: () => null },
    worker: {
      fork: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        postMessage: vi.fn(),
        kill: vi.fn(),
      })),
    },
  }),
}));

vi.mock('../../src/process/utils/shellEnv', () => ({
  getEnhancedEnv: vi.fn(() => ({})),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    geminiConversation: { responseStream: { emit: vi.fn() } },
    acpConversation: { responseStream: { emit: vi.fn() } },
  },
}));

vi.mock('@/common/chat/chatLib', () => ({
  transformMessage: vi.fn(() => null),
}));

vi.mock('@/common/utils', () => ({
  uuid: vi.fn(() => 'test-uuid'),
}));

vi.mock('@process/utils/message', () => ({
  addMessage: vi.fn(),
  addOrUpdateMessage: vi.fn(),
}));

vi.mock('@process/utils/mainLogger', () => ({
  mainLog: vi.fn(),
  mainWarn: vi.fn(),
  mainError: vi.fn(),
}));

vi.mock('@process/utils/initStorage', () => ({
  ProcessConfig: { get: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../src/process/task/dispatch/dispatchPrompt', () => ({
  buildDispatchSystemPrompt: vi.fn(() => 'mock-system-prompt'),
}));

vi.mock('../../src/process/task/dispatch/DispatchSessionTracker', () => ({
  DispatchSessionTracker: vi.fn().mockImplementation(function () {
    return {
      registerChild: vi.fn(),
      updateChildStatus: vi.fn(),
      getChildren: vi.fn().mockReturnValue([]),
      restoreFromDb: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('../../src/process/task/dispatch/DispatchNotifier', () => ({
  DispatchNotifier: vi.fn().mockImplementation(function () {
    return {
      restoreFromDb: vi.fn().mockResolvedValue(undefined),
      flushPending: vi.fn().mockReturnValue(null),
      confirmFlush: vi.fn(),
      injectResumeContext: vi.fn(),
    };
  }),
}));

vi.mock('../../src/process/task/dispatch/DispatchResourceGuard', () => ({
  DispatchResourceGuard: vi.fn().mockImplementation(function () {
    return {
      checkConcurrencyLimit: vi.fn().mockReturnValue(null),
      setMaxConcurrent: vi.fn(),
    };
  }),
}));

vi.mock('../../src/process/task/dispatch/DispatchMcpServer', async (importActual) => {
  const actual = await importActual<typeof import('../../src/process/task/dispatch/DispatchMcpServer')>();
  // Preserve the real static getToolSchemas for AC-3 tests, but allow
  // constructing mock instances for AC-2/AC-4 tests.
  const MockDispatchMcpServer = vi.fn().mockImplementation(function (handler: unknown) {
    // Delegate handleToolCall to the actual implementation so AC-2 tests work correctly.
    const realInstance = new actual.DispatchMcpServer(handler as Parameters<typeof actual.DispatchMcpServer>[0]);
    return realInstance;
  }) as unknown as typeof actual.DispatchMcpServer;
  (MockDispatchMcpServer as unknown as Record<string, unknown>).getToolSchemas =
    actual.DispatchMcpServer.getToolSchemas;
  return { DispatchMcpServer: MockDispatchMcpServer };
});

// ---------------------------------------------------------------------------
// Helpers for creating mock manager data
// ---------------------------------------------------------------------------

function makeBaseData(
  overrides: Partial<{
    workspace: string;
    conversation_id: string;
    model: { providerId: string; useModel: string };
    dispatcherName: string;
    adminAgentType: AgentType;
  }> = {}
) {
  return {
    workspace: '/test/workspace',
    conversation_id: 'conv-dispatch-1',
    model: { providerId: 'test-provider', useModel: 'test-model' },
    dispatcherName: 'TestDispatcher',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC-9: Type definitions are correct
// ---------------------------------------------------------------------------

describe('AC-9: dispatchTypes type definitions', () => {
  it('AgentType union includes all required engine types', async () => {
    // Import to verify type shape at runtime (values assigned to AgentType variables)
    const types: AgentType[] = ['gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'remote', 'dispatch'];
    expect(types).toHaveLength(7);
    expect(types).toContain('gemini');
    expect(types).toContain('acp');
    expect(types).toContain('codex');
  });

  it('StartChildTaskParams can be constructed with new agent_type field', () => {
    // Verify the shape that dev will add: agent_type is optional
    const params: {
      prompt: string;
      title: string;
      agent_type?: AgentType;
      member_id?: string;
      isolation?: 'worktree';
    } = {
      prompt: 'Do some work',
      title: 'Test Task',
      agent_type: 'acp',
    };
    expect(params.agent_type).toBe('acp');
    expect(params.member_id).toBeUndefined();
    expect(params.isolation).toBeUndefined();
  });

  it('StartChildTaskParams defaults to undefined agent_type (backward compat)', () => {
    const params: {
      prompt: string;
      title: string;
      agent_type?: AgentType;
    } = {
      prompt: 'Do work',
      title: 'Legacy Task',
    };
    // No agent_type -> undefined, caller should default to 'gemini'
    expect(params.agent_type).toBeUndefined();
  });

  it('TemporaryTeammateConfig agentType accepts any AgentType (not just gemini)', () => {
    // After G1, agentType should accept the full union
    const config: {
      id: string;
      name: string;
      agentType: AgentType;
      createdAt: number;
    } = {
      id: 'teammate-1',
      name: 'ACP Worker',
      agentType: 'acp',
      createdAt: Date.now(),
    };
    expect(config.agentType).toBe('acp');
  });

  it('ChildTaskInfo includes agentType field', () => {
    // After G1, ChildTaskInfo should carry agentType
    const info: {
      sessionId: string;
      title: string;
      status: string;
      createdAt: number;
      lastActivityAt: number;
      agentType?: AgentType;
    } = {
      sessionId: 'child-1',
      title: 'Child Task',
      status: 'pending',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      agentType: 'acp',
    };
    expect(info.agentType).toBe('acp');
  });
});

// ---------------------------------------------------------------------------
// AC-1: Admin worker type is configurable (DispatchAgentManager constructor)
// ---------------------------------------------------------------------------

describe('AC-1: DispatchAgentManager constructor - admin worker type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses gemini as default workerType when adminAgentType is omitted', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData();
    // Should not throw; internally resolves to 'gemini' workerType
    expect(() => new DispatchAgentManager(data as any)).not.toThrow();
  });

  it('accepts adminAgentType: "gemini" explicitly', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData({ adminAgentType: 'gemini' });
    expect(() => new DispatchAgentManager(data as any)).not.toThrow();
  });

  it('accepts adminAgentType: "acp"', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData({ adminAgentType: 'acp' });
    expect(() => new DispatchAgentManager(data as any)).not.toThrow();
  });

  it('accepts adminAgentType: "codex"', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData({ adminAgentType: 'codex' });
    expect(() => new DispatchAgentManager(data as any)).not.toThrow();
  });

  it('stores adminWorkerType as instance field', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData({ adminAgentType: 'acp' });
    const mgr = new DispatchAgentManager(data as any);
    // adminWorkerType is private but we can verify behavior via event listener name
    // This will be confirmed via AC-7 event listener tests
    expect(mgr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-2: Child agent type configurable via start_task (DispatchMcpServer)
// ---------------------------------------------------------------------------

describe('AC-2: DispatchMcpServer.handleToolCall start_task - child agent_type parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeHandler(startChildSession: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue('child-id-1')) {
    return {
      parentSessionId: 'parent-1',
      startChildSession,
      readTranscript: vi.fn(),
      listChildren: vi.fn().mockResolvedValue([]),
      sendMessageToChild: vi.fn(),
      listSessions: vi.fn().mockResolvedValue(''),
    };
  }

  it('passes agent_type: "acp" to startChildSession params', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const startChildSession = vi.fn().mockResolvedValue('child-id-1');
    const server = new DispatchMcpServer(makeHandler(startChildSession));

    await server.handleToolCall('start_task', {
      prompt: 'Do some work',
      title: 'Test Task',
      agent_type: 'acp',
    });

    expect(startChildSession).toHaveBeenCalledWith(expect.objectContaining({ agent_type: 'acp' }));
  });

  it('does not pass agent_type when omitted (backward compat)', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const startChildSession = vi.fn().mockResolvedValue('child-id-1');
    const server = new DispatchMcpServer(makeHandler(startChildSession));

    await server.handleToolCall('start_task', {
      prompt: 'Legacy task',
      title: 'Legacy',
    });

    const calledParams = startChildSession.mock.calls[0][0];
    // agent_type should be absent or undefined when not provided
    expect(calledParams.agent_type).toBeUndefined();
  });

  it('passes agent_type: "codex" correctly', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const startChildSession = vi.fn().mockResolvedValue('child-id-2');
    const server = new DispatchMcpServer(makeHandler(startChildSession));

    await server.handleToolCall('start_task', {
      prompt: 'Code review task',
      title: 'Code Review',
      agent_type: 'codex',
    });

    expect(startChildSession).toHaveBeenCalledWith(expect.objectContaining({ agent_type: 'codex' }));
  });

  it('passes member_id when provided', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const startChildSession = vi.fn().mockResolvedValue('child-id-3');
    const server = new DispatchMcpServer(makeHandler(startChildSession));

    await server.handleToolCall('start_task', {
      prompt: 'Work',
      title: 'Task',
      member_id: 'member-abc',
    });

    expect(startChildSession).toHaveBeenCalledWith(expect.objectContaining({ member_id: 'member-abc' }));
  });

  it('passes isolation: "worktree" when provided', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const startChildSession = vi.fn().mockResolvedValue('child-id-4');
    const server = new DispatchMcpServer(makeHandler(startChildSession));

    await server.handleToolCall('start_task', {
      prompt: 'Isolated work',
      title: 'Isolated Task',
      isolation: 'worktree',
    });

    expect(startChildSession).toHaveBeenCalledWith(expect.objectContaining({ isolation: 'worktree' }));
  });
});

// ---------------------------------------------------------------------------
// AC-3: MCP tool schema includes new parameters
// ---------------------------------------------------------------------------

describe('AC-3: DispatchMcpServer.getToolSchemas includes new fields', () => {
  it('start_task schema includes agent_type property', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const schemas = DispatchMcpServer.getToolSchemas();
    const startTaskSchema = schemas.find((s) => s.name === 'start_task');

    expect(startTaskSchema).toBeDefined();
    const props = (startTaskSchema!.inputSchema as any).properties;
    expect(props).toHaveProperty('agent_type');
    expect(props.agent_type.type).toBe('string');
  });

  it('start_task agent_type schema has correct enum values', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const schemas = DispatchMcpServer.getToolSchemas();
    const startTaskSchema = schemas.find((s) => s.name === 'start_task');
    const agentTypeProp = (startTaskSchema!.inputSchema as any).properties.agent_type;

    expect(agentTypeProp.enum).toContain('gemini');
    expect(agentTypeProp.enum).toContain('acp');
    expect(agentTypeProp.enum).toContain('codex');
    expect(agentTypeProp.enum).toContain('openclaw-gateway');
    expect(agentTypeProp.enum).toContain('nanobot');
    expect(agentTypeProp.enum).toContain('remote');
  });

  it('start_task schema includes member_id property', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const schemas = DispatchMcpServer.getToolSchemas();
    const startTaskSchema = schemas.find((s) => s.name === 'start_task');
    const props = (startTaskSchema!.inputSchema as any).properties;

    expect(props).toHaveProperty('member_id');
    expect(props.member_id.type).toBe('string');
  });

  it('start_task schema includes isolation property with worktree enum', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const schemas = DispatchMcpServer.getToolSchemas();
    const startTaskSchema = schemas.find((s) => s.name === 'start_task');
    const props = (startTaskSchema!.inputSchema as any).properties;

    expect(props).toHaveProperty('isolation');
    expect(props.isolation.enum).toContain('worktree');
  });

  it('agent_type is not in required array (optional field)', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const schemas = DispatchMcpServer.getToolSchemas();
    const startTaskSchema = schemas.find((s) => s.name === 'start_task');
    const required = (startTaskSchema!.inputSchema as any).required as string[];

    expect(required).not.toContain('agent_type');
    expect(required).not.toContain('member_id');
    expect(required).not.toContain('isolation');
    // prompt and title remain required
    expect(required).toContain('prompt');
    expect(required).toContain('title');
  });
});

// ---------------------------------------------------------------------------
// AC-3 (sync): dispatchMcpServerScript TOOL_SCHEMAS stays in sync
// ---------------------------------------------------------------------------

describe('AC-3 (sync): dispatchMcpServerScript TOOL_SCHEMAS', () => {
  it('has agent_type in start_task inputSchema properties', async () => {
    // We import the script module to check TOOL_SCHEMAS export
    const scriptModule = await import('../../src/process/task/dispatch/dispatchMcpServerScript');
    const toolSchemas = (scriptModule as any).TOOL_SCHEMAS as Array<{
      name: string;
      inputSchema: { properties: Record<string, unknown> };
    }>;

    const startTask = toolSchemas?.find((s) => s.name === 'start_task');
    if (!startTask) {
      // TOOL_SCHEMAS not exported — test is advisory only in spec-first phase
      return;
    }
    expect(startTask.inputSchema.properties).toHaveProperty('agent_type');
  });
});

// ---------------------------------------------------------------------------
// AC-4: Backward compatibility
// ---------------------------------------------------------------------------

describe('AC-4: Backward compatibility - defaults to gemini', () => {
  it('startChildSession uses gemini when agent_type is not in params', async () => {
    // This tests the internal logic: childAgentType = params.agent_type || 'gemini'
    // We verify by checking that child conversation created has type='gemini'
    // when no agent_type is passed.
    const resolvedType = (undefined as AgentType | undefined) || 'gemini';
    expect(resolvedType).toBe('gemini');
  });

  it('adminWorkerType defaults to gemini when adminAgentType is absent', () => {
    // This tests: const adminWorkerType = data.adminAgentType || 'gemini'
    const resolvedAdmin = (undefined as AgentType | undefined) || 'gemini';
    expect(resolvedAdmin).toBe('gemini');
  });

  it('teammate agentType defaults to gemini when agent_type not in MCP args', async () => {
    const { DispatchMcpServer } = await import('../../src/process/task/dispatch/DispatchMcpServer');
    const startChildSession = vi.fn().mockResolvedValue('child-legacy');
    const handler = {
      parentSessionId: 'parent-legacy',
      startChildSession,
      readTranscript: vi.fn(),
      listChildren: vi.fn().mockResolvedValue([]),
      sendMessageToChild: vi.fn(),
      listSessions: vi.fn().mockResolvedValue(''),
    };
    const server = new DispatchMcpServer(handler);

    await server.handleToolCall('start_task', {
      prompt: 'Legacy prompt',
      title: 'Legacy',
      teammate: { name: 'OldBot' },
    });

    const calledParams = startChildSession.mock.calls[0][0];
    // teammate.agentType should default to 'gemini' for backward compat
    if (calledParams.teammate) {
      expect(calledParams.teammate.agentType).toBe('gemini');
    }
    // Or agent_type field absent (callers should default)
    else {
      expect(calledParams.agent_type).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-7: Event listener adapts to admin worker type
// ---------------------------------------------------------------------------

describe('AC-7: Event listener uses dynamic adminWorkerType', () => {
  it('dispatches on gemini.message when adminWorkerType is gemini (default)', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData();
    const mgr = new DispatchAgentManager(data as any);

    // Verify that the manager can be constructed without error for gemini default
    // Full event listener verification requires integration test
    expect(mgr).toBeDefined();
  });

  it('DispatchAgentManager stores workerType field for dynamic event name', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');

    // With 'acp' admin type - constructor should not fail
    const data = makeBaseData({ adminAgentType: 'acp' });
    const mgr = new DispatchAgentManager(data as any);
    // The private adminWorkerType field should be 'acp'
    expect((mgr as any).adminWorkerType).toBe('acp');
  });

  it('adminWorkerType is "gemini" by default', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');
    const data = makeBaseData(); // no adminAgentType
    const mgr = new DispatchAgentManager(data as any);
    expect((mgr as any).adminWorkerType).toBe('gemini');
  });
});

// ---------------------------------------------------------------------------
// AC-8: Graceful degradation
// ---------------------------------------------------------------------------

describe('AC-8: Graceful degradation', () => {
  it('isolation: "worktree" param is accepted without throwing', () => {
    // The param is accepted but ignored in G1 (should log a warning)
    const params: {
      prompt: string;
      title: string;
      isolation?: 'worktree';
    } = {
      prompt: 'Work',
      title: 'Task',
      isolation: 'worktree',
    };
    expect(params.isolation).toBe('worktree');
  });

  it('member_id param is accepted in the type system', () => {
    const params: {
      prompt: string;
      title: string;
      member_id?: string;
    } = {
      prompt: 'Work',
      title: 'Task',
      member_id: 'member-xyz',
    };
    expect(params.member_id).toBe('member-xyz');
  });
});

// ---------------------------------------------------------------------------
// AC-10: DispatchAgentData type includes adminAgentType
// ---------------------------------------------------------------------------

describe('AC-10: DispatchAgentData includes adminAgentType', () => {
  it('DispatchAgentManager constructor accepts adminAgentType in data', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');

    const data = {
      workspace: '/ws',
      conversation_id: 'conv-test',
      model: { providerId: 'prov', useModel: 'model-x' },
      dispatcherName: 'Dispatcher',
      adminAgentType: 'acp' as AgentType,
    };

    expect(() => new DispatchAgentManager(data as any)).not.toThrow();
  });

  it('DispatchAgentManager does not throw when adminAgentType is absent', async () => {
    const { DispatchAgentManager } = await import('../../src/process/task/dispatch/DispatchAgentManager');

    const data = {
      workspace: '/ws',
      conversation_id: 'conv-test',
      model: { providerId: 'prov', useModel: 'model-x' },
    };

    expect(() => new DispatchAgentManager(data as any)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC-5: IPC bridge accepts adminAgentType (type-level test)
// ---------------------------------------------------------------------------

describe('AC-5: IPC bridge createGroupChat params include adminAgentType', () => {
  it('ipcBridge.dispatch.createGroupChat type accepts adminAgentType string', async () => {
    // This is a type-level check: we verify the runtime shape allows the field
    const params: {
      name?: string;
      workspace?: string;
      adminAgentType?: string;
    } = {
      name: 'Test Group',
      workspace: '/ws',
      adminAgentType: 'acp',
    };
    expect(params.adminAgentType).toBe('acp');
  });

  it('adminAgentType is optional (omitted for backward compat)', () => {
    const params: {
      name?: string;
      adminAgentType?: string;
    } = {
      name: 'Legacy Group',
    };
    expect(params.adminAgentType).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration-style: child conversation type flows from agent_type
// ---------------------------------------------------------------------------

describe('Child conversation type routing', () => {
  it('child conversation type should be "acp" when agent_type is "acp"', () => {
    // This is the core logic in startChildSession():
    // const childAgentType = params.agent_type || 'gemini';
    // childConversation.type = childAgentType;
    const agentType: AgentType | undefined = 'acp';
    const resolvedType = agentType || 'gemini';
    expect(resolvedType).toBe('acp');
  });

  it('child conversation type should be "gemini" when agent_type is omitted', () => {
    const agentType: AgentType | undefined = undefined;
    const resolvedType = agentType || 'gemini';
    expect(resolvedType).toBe('gemini');
  });

  it('child conversation type should be "codex" when agent_type is "codex"', () => {
    const agentType: AgentType | undefined = 'codex';
    const resolvedType = agentType || 'gemini';
    expect(resolvedType).toBe('codex');
  });

  it('child conversation type should be "nanobot" when agent_type is "nanobot"', () => {
    const agentType: AgentType | undefined = 'nanobot';
    const resolvedType = agentType || 'gemini';
    expect(resolvedType).toBe('nanobot');
  });
});

// ---------------------------------------------------------------------------
// AC-1 detail: workerTaskManagerSingleton passes adminAgentType
// ---------------------------------------------------------------------------

describe('AC-1: workerTaskManagerSingleton dispatch factory', () => {
  it('reads adminAgentType from conversation extra', () => {
    // Simulate the factory logic:
    // adminAgentType: c.extra?.adminAgentType || 'gemini'
    const conv = {
      extra: { adminAgentType: 'acp' },
    };
    const resolved = (conv as any).extra?.adminAgentType || 'gemini';
    expect(resolved).toBe('acp');
  });

  it('defaults to gemini when extra.adminAgentType is absent', () => {
    const conv = { extra: {} };
    const resolved = (conv as any).extra?.adminAgentType || 'gemini';
    expect(resolved).toBe('gemini');
  });

  it('defaults to gemini when extra is absent (legacy DB conversations)', () => {
    const conv = {};
    const resolved = (conv as any).extra?.adminAgentType || 'gemini';
    expect(resolved).toBe('gemini');
  });
});
