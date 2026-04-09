import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({ app: { isPackaged: false, getPath: vi.fn(() => '/tmp') } }));

import { WorkerTaskManager } from '../../src/process/task/WorkerTaskManager';
import type { IConversationRepository } from '../../src/process/services/database/IConversationRepository';
import type { AgentType } from '../../src/process/task/agentTypes';

function makeRepo(overrides?: Partial<IConversationRepository>): IConversationRepository {
  return {
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn(),
    getMessages: vi.fn(),
    insertMessage: vi.fn(),
    getUserConversations: vi.fn(),
    listAllConversations: vi.fn(() => []),
    searchMessages: vi.fn(() => ({ items: [], total: 0, page: 0, pageSize: 20, hasMore: false })),
    ...overrides,
  };
}

function makeFactory(agent?: any) {
  return { register: vi.fn(), create: vi.fn(() => agent ?? makeAgent()) };
}

function makeAgent(id = 'c1', type: AgentType = 'gemini') {
  return {
    type,
    status: undefined,
    workspace: '/ws',
    conversation_id: id,
    kill: vi.fn(),
    sendMessage: vi.fn(),
    stop: vi.fn(),
    confirm: vi.fn(),
    getConfirmations: vi.fn(() => []),
  };
}

function makeConversation(id: string, type: AgentType = 'gemini') {
  return { id, type, extra: {} };
}

describe('WorkerTaskManager', () => {
  let repo: IConversationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- getTask / addTask ---

  it('getTask returns undefined for unknown id', () => {
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    expect(mgr.getTask('unknown')).toBeUndefined();
  });

  it('addTask stores task and getTask returns it', () => {
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    const agent = makeAgent();
    mgr.addTask('c1', agent as any);
    expect(mgr.getTask('c1')).toBe(agent);
  });

  it('addTask replaces existing task with same id', () => {
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    const agent1 = makeAgent('c1', 'gemini');
    const agent2 = makeAgent('c1', 'acp');
    mgr.addTask('c1', agent1 as any);
    mgr.addTask('c1', agent2 as any);
    expect(mgr.getTask('c1')).toBe(agent2);
  });

  // --- kill ---

  it('kill removes task from list and calls task.kill()', () => {
    const agent = makeAgent();
    const mgr = new WorkerTaskManager(makeFactory(agent) as any, repo);
    mgr.addTask('c1', agent as any);
    mgr.kill('c1');
    expect(mgr.getTask('c1')).toBeUndefined();
    expect(agent.kill).toHaveBeenCalled();
  });

  it('forwards idle_timeout when reaping idle cli agents', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T10:00:00Z'));

    const agent = {
      ...makeAgent('c1', 'acp'),
      lastActivityAt: Date.now() - 6 * 60 * 1000,
    };
    const mgr = new WorkerTaskManager(makeFactory(agent) as any, repo);
    mgr.addTask('c1', agent as any);

    vi.advanceTimersByTime(1 * 60 * 1000 + 1);

    expect(agent.kill).toHaveBeenCalledWith('idle_timeout');
    expect(mgr.getTask('c1')).toBeUndefined();
  });

  it('kill is a no-op for unknown id', () => {
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    expect(() => mgr.kill('nonexistent')).not.toThrow();
  });

  // --- clear ---

  it('clear kills all tasks and empties the list', () => {
    const agent1 = makeAgent('c1', 'gemini');
    const agent2 = makeAgent('c2', 'acp');
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    mgr.addTask('c1', agent1 as any);
    mgr.addTask('c2', agent2 as any);
    mgr.clear();
    expect(agent1.kill).toHaveBeenCalled();
    expect(agent2.kill).toHaveBeenCalled();
    expect(mgr.listTasks()).toHaveLength(0);
  });

  // --- listTasks ---

  it('listTasks returns id and type for each task', () => {
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    mgr.addTask('c1', makeAgent('c1', 'gemini') as any);
    mgr.addTask('c2', makeAgent('c2', 'acp') as any);
    mgr.addTask('c3', makeAgent('c3', 'nanobot') as any);
    expect(mgr.listTasks()).toEqual([
      { id: 'c1', type: 'gemini' },
      { id: 'c2', type: 'acp' },
      { id: 'c3', type: 'nanobot' },
    ]);
  });

  // --- evictExcessAgents (LRU) ---

  it('evicts least-recently-active acp agents when exceeding max concurrent limit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T10:00:00Z'));

    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    const agents = [];

    // Create 5 acp agents with staggered lastActivityAt
    for (let i = 0; i < 5; i++) {
      const agent = {
        ...makeAgent(`c${i}`, 'acp'),
        lastActivityAt: Date.now() - (5 - i) * 1000, // c0 oldest, c4 newest
      };
      agents.push(agent);
      mgr.addTask(`c${i}`, agent as any);
    }

    // Trigger the idle check interval (1 minute) to run eviction
    vi.advanceTimersByTime(1 * 60 * 1000 + 1);

    // Should keep only the 3 most recent (c2, c3, c4) and evict c0, c1
    expect(agents[0].kill).toHaveBeenCalledWith('idle_timeout');
    expect(agents[1].kill).toHaveBeenCalledWith('idle_timeout');
    expect(mgr.getTask('c0')).toBeUndefined();
    expect(mgr.getTask('c1')).toBeUndefined();
    expect(mgr.getTask('c2')).toBeDefined();
    expect(mgr.getTask('c3')).toBeDefined();
    expect(mgr.getTask('c4')).toBeDefined();
  });

  it('evicts excess agents immediately when building a new acp task', async () => {
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);
    const agents = [];

    // Pre-fill 3 acp agents (at the limit)
    for (let i = 0; i < 3; i++) {
      const agent = {
        ...makeAgent(`c${i}`, 'acp'),
        lastActivityAt: Date.now() - (3 - i) * 1000,
      };
      agents.push(agent);
      mgr.addTask(`c${i}`, agent as any);
    }

    // Build a 4th — should evict the oldest (c0)
    const newAgent = {
      ...makeAgent('c3', 'acp'),
      lastActivityAt: Date.now(),
    };
    const factory = makeFactory(newAgent);
    // Need a new manager with this factory, but we want to keep the existing tasks
    // Instead, manually simulate what _buildAndCache does
    vi.mocked(repo.getConversation).mockReturnValue(makeConversation('c3', 'acp') as any);
    const mgr2 = new WorkerTaskManager(factory as any, repo);
    // Add existing agents
    for (let i = 0; i < 3; i++) {
      mgr2.addTask(`c${i}`, agents[i] as any);
    }

    await mgr2.getOrBuildTask('c3');

    // c0 (oldest) should be evicted
    expect(agents[0].kill).toHaveBeenCalledWith('idle_timeout');
    expect(mgr2.getTask('c0')).toBeUndefined();
    expect(mgr2.getTask('c3')).toBeDefined();
  });

  it('does not evict non-acp agents during LRU eviction', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T10:00:00Z'));

    const mgr = new WorkerTaskManager(makeFactory() as any, repo);

    // 4 acp agents + 2 gemini agents
    const acpAgents = [];
    for (let i = 0; i < 4; i++) {
      const agent = {
        ...makeAgent(`acp${i}`, 'acp'),
        lastActivityAt: Date.now() - (4 - i) * 1000,
      };
      acpAgents.push(agent);
      mgr.addTask(`acp${i}`, agent as any);
    }
    const geminiAgent = { ...makeAgent('g1', 'gemini'), lastActivityAt: Date.now() - 100_000 };
    mgr.addTask('g1', geminiAgent as any);

    vi.advanceTimersByTime(1 * 60 * 1000 + 1);

    // Only oldest acp agent evicted (acp0), gemini untouched
    expect(acpAgents[0].kill).toHaveBeenCalled();
    expect(mgr.getTask('acp0')).toBeUndefined();
    expect(mgr.getTask('g1')).toBeDefined();
    expect(geminiAgent.kill).not.toHaveBeenCalled();
  });

  // --- getOrBuildTask: cache hit ---

  it('returns cached task without hitting repo on second call', async () => {
    const agent = makeAgent();
    const factory = makeFactory(agent);
    const mgr = new WorkerTaskManager(factory as any, repo);
    mgr.addTask('c1', agent as any);

    const result = await mgr.getOrBuildTask('c1');
    expect(repo.getConversation).not.toHaveBeenCalled();
    expect(factory.create).not.toHaveBeenCalled();
    expect(result).toBe(agent);
  });

  // --- getOrBuildTask: repo hit ---

  it('hits repo on cache miss and builds task correctly', async () => {
    const agent = makeAgent('c1', 'gemini');
    const factory = makeFactory(agent);
    vi.mocked(repo.getConversation).mockReturnValue(makeConversation('c1', 'gemini') as any);

    const mgr = new WorkerTaskManager(factory as any, repo);
    const result = await mgr.getOrBuildTask('c1');

    expect(repo.getConversation).toHaveBeenCalledWith('c1');
    expect(factory.create).toHaveBeenCalledWith(makeConversation('c1', 'gemini'), undefined);
    expect(result).toBe(agent);
  });

  it('caches task built from repo', async () => {
    const agent = makeAgent();
    const factory = makeFactory(agent);
    vi.mocked(repo.getConversation).mockReturnValue(makeConversation('c1') as any);

    const mgr = new WorkerTaskManager(factory as any, repo);
    await mgr.getOrBuildTask('c1');
    await mgr.getOrBuildTask('c1'); // second call should use cache
    expect(factory.create).toHaveBeenCalledTimes(1);
  });

  // --- getOrBuildTask: failure paths ---

  it('rejects with error when repo returns undefined', async () => {
    vi.mocked(repo.getConversation).mockReturnValue(undefined);
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);

    await expect(mgr.getOrBuildTask('missing')).rejects.toThrow('Conversation not found: missing');
  });

  it('rejects when skipCache is set and repo returns undefined', async () => {
    vi.mocked(repo.getConversation).mockReturnValue(undefined);
    const mgr = new WorkerTaskManager(makeFactory() as any, repo);

    await expect(mgr.getOrBuildTask('missing', { skipCache: true })).rejects.toThrow('Conversation not found: missing');
  });

  // --- getOrBuildTask: skipCache option ---

  it('getOrBuildTask with skipCache bypasses cache and does not store result', async () => {
    const agent = makeAgent();
    const factory = makeFactory(agent);
    vi.mocked(repo.getConversation).mockReturnValue(makeConversation('c1') as any);

    const mgr = new WorkerTaskManager(factory as any, repo);
    mgr.addTask('c1', agent as any);
    await mgr.getOrBuildTask('c1', { skipCache: true });

    expect(factory.create).toHaveBeenCalledTimes(1);
    // Task list should still only have the original (not a duplicate)
    expect(mgr.listTasks()).toHaveLength(1);
  });
});
