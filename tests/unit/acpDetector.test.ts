import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

const mockSafeExec = vi.fn();
const mockSafeExecFile = vi.fn();
vi.mock('@process/utils/safeExec', () => ({
  safeExec: (...args: unknown[]) => mockSafeExec(...args),
  safeExecFile: (...args: unknown[]) => mockSafeExecFile(...args),
}));

const mockResolveManagedBinary = vi.fn(() => null);
const mockCleanOldVersions = vi.fn(async () => []);
vi.mock('@process/extensions/hub/ManagedInstallResolver', () => ({
  resolveManagedBinary: (...args: unknown[]) => mockResolveManagedBinary(...args),
  cleanOldVersions: (...args: unknown[]) => mockCleanOldVersions(...args),
}));

vi.mock('@/common/types/acpTypes', () => ({
  POTENTIAL_ACP_CLIS: [
    { cmd: 'claude', name: 'Claude Code', backendId: 'claude', args: ['--experimental-acp'] },
    { cmd: 'qwen', name: 'Qwen Code', backendId: 'qwen', args: ['--acp'] },
    { cmd: 'augment', name: 'Augment Code', backendId: 'auggie', args: ['--acp'] },
  ],
}));

vi.mock('@process/utils/initStorage', () => ({
  ProcessConfig: { get: vi.fn(async () => []) },
}));

const mockGetAcpAdapters = vi.fn((): Record<string, unknown>[] => []);
const mockGetLoadedExtensions = vi.fn(() => []);
vi.mock('@process/extensions', () => ({
  ExtensionRegistry: {
    getInstance: () => ({
      getAcpAdapters: mockGetAcpAdapters,
      getLoadedExtensions: mockGetLoadedExtensions,
    }),
  },
}));

vi.mock('@process/utils/shellEnv', () => ({
  getEnhancedEnv: vi.fn(() => ({ ...process.env })),
}));

import { ProcessConfig } from '@process/utils/initStorage';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function createFreshDetector() {
  const mod = await import('@process/agent/acp/AcpDetector');
  return mod.acpDetector;
}

// Helper: set which CLIs are "available" on the system.
// On POSIX the detector uses a single `safeExec` shell call (batch `command -v`).
// On Windows it falls back to per-command `safeExecFile` (where / powershell).
function setAvailableClis(clis: string[]): void {
  const available = new Set(clis);

  // POSIX batch: safeExec receives a shell script with `command -v 'cmd' && echo 'cmd'`
  mockSafeExec.mockImplementation((script: string) => {
    const found: string[] = [];
    for (const m of script.matchAll(/echo '([^']+)'/g)) {
      if (available.has(m[1])) found.push(m[1]);
    }
    return Promise.resolve({ stdout: found.join('\n'), stderr: '' });
  });

  // Windows fallback: individual safeExecFile calls
  mockSafeExecFile.mockImplementation((_bin: string, args: string[]) => {
    const cmd = args[0];
    if (available.has(cmd)) return Promise.resolve({ stdout: '', stderr: '' });
    return Promise.reject(new Error('not found'));
  });
}

// Helper: create a mock extension ACP adapter
function makeExtAdapter(opts: {
  id: string;
  name: string;
  cliCommand?: string;
  extensionName: string;
  acpArgs?: string[];
  avatar?: string;
  connectionType?: string;
  defaultCliPath?: string;
  installedBinaryPath?: string;
  env?: Record<string, string>;
  skillsDirs?: string[];
}) {
  return {
    id: opts.id,
    name: opts.name,
    cliCommand: opts.cliCommand,
    connectionType: opts.connectionType ?? 'cli',
    acpArgs: opts.acpArgs ?? ['--acp'],
    avatar: opts.avatar,
    _extensionName: opts.extensionName,
    defaultCliPath: opts.defaultCliPath,
    installedBinaryPath: opts.installedBinaryPath,
    env: opts.env,
    skillsDirs: opts.skillsDirs,
  };
}

describe('AcpDetector', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetAcpAdapters.mockReturnValue([]);
    vi.mocked(ProcessConfig.get).mockResolvedValue([]);
  });

  describe('initialize', () => {
    it('should detect built-in CLIs that are available on PATH', async () => {
      setAvailableClis(['claude', 'qwen']);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      // Gemini always first + claude + qwen
      expect(agents).toHaveLength(3);
      expect(agents[0].backend).toBe('gemini');
      expect(agents[1]).toMatchObject({ backend: 'claude', cliPath: 'claude' });
      expect(agents[2]).toMatchObject({ backend: 'qwen', cliPath: 'qwen' });
    });

    it('should skip built-in CLIs that are not available', async () => {
      setAvailableClis(['claude']); // only claude, not qwen or augment

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents).toHaveLength(2); // gemini + claude
      expect(agents.find((a) => a.backend === 'qwen')).toBeUndefined();
      expect(agents.find((a) => a.backend === 'auggie')).toBeUndefined();
    });

    it('should always include Gemini as first agent', async () => {
      setAvailableClis([]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({ backend: 'gemini', name: 'Gemini CLI' });
    });

    it('should detect extension-contributed agents via defaultCliPath', async () => {
      setAvailableClis([]);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'goose',
          name: 'Goose',
          extensionName: 'aionext-goose',
          defaultCliPath: 'bunx @goose/cli',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      const gooseAgent = agents.find((a) => a.name === 'Goose');
      expect(gooseAgent).toBeDefined();
      expect(gooseAgent!.cliPath).toBe('bunx @goose/cli');
    });

    it('should skip extension agents without defaultCliPath or installedBinaryPath', async () => {
      setAvailableClis([]);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({ id: 'missing', name: 'Missing Agent', cliCommand: 'nonexistent', extensionName: 'ext-test' }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents).toHaveLength(1); // only gemini
    });

    it('should skip extension agents with non-CLI connection type', async () => {
      setAvailableClis(['http-tool']);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'http-agent',
          name: 'HTTP Agent',
          cliCommand: 'http-tool',
          extensionName: 'ext-http',
          connectionType: 'http',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents).toHaveLength(1); // only gemini
    });

    it('should include custom agents from config', async () => {
      setAvailableClis([]);
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'custom-1', name: 'My Agent', defaultCliPath: '/usr/bin/myagent', enabled: true, acpArgs: ['--acp'] },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents).toHaveLength(2); // gemini + custom
      expect(agents[1]).toMatchObject({ backend: 'custom', name: 'My Agent', customAgentId: 'custom-1' });
    });

    it('should not run twice (isDetected guard)', async () => {
      setAvailableClis(['claude']);

      const detector = await createFreshDetector();
      await detector.initialize();
      await detector.initialize(); // second call — should be no-op

      // safeExecFile called only during first init
      const callCount = mockSafeExecFile.mock.calls.length;
      await detector.initialize();
      expect(mockSafeExecFile.mock.calls.length).toBe(callCount);
    });
  });

  describe('deduplicate', () => {
    it('should deduplicate by name — extension wins over builtin', async () => {
      setAvailableClis(['qwen']);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'Qwen Code',
          name: 'Qwen Code',
          extensionName: 'aionext-qwen',
          defaultCliPath: 'bunx @qwen/cli',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      // Dedup by name: extension is iterated first, so extension wins
      const qwenAgents = agents.filter((a) => a.name === 'Qwen Code');
      expect(qwenAgents).toHaveLength(1);
      expect(qwenAgents[0].backend).toBe('custom'); // extension wins
      expect(qwenAgents[0].isExtension).toBe(true);
    });

    it('should keep extension agent when no builtin matches the same name', async () => {
      setAvailableClis([]);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'unique',
          name: 'Unique Agent',
          extensionName: 'ext-unique',
          defaultCliPath: 'bunx @unique/cli',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      const agent = agents.find((a) => a.name === 'Unique Agent');
      expect(agent).toBeDefined();
      expect(agent!.isExtension).toBe(true);
    });

    it('should keep agents without cliPath (gemini, presets)', async () => {
      setAvailableClis([]);
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'preset-1', name: 'Preset', enabled: true, isPreset: true, avatar: '📚', presetAgentType: 'gemini' },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      // Gemini (no cliPath) + preset (no cliPath) — both kept
      expect(agents).toHaveLength(2);
      expect(agents[0].backend).toBe('gemini');
      expect(agents[1].isPreset).toBe(true);
    });
  });

  describe('refreshExtensionAgents', () => {
    it('should remove old extension agents and add newly detected ones', async () => {
      setAvailableClis(['claude']);
      const detector = await createFreshDetector();
      await detector.initialize();

      expect(detector.getDetectedAgents().find((a) => a.isExtension)).toBeUndefined();

      // Now an extension is installed that contributes a new CLI
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'new',
          name: 'New Ext',
          extensionName: 'ext-new',
          defaultCliPath: 'bunx @ext/new-cli',
        }),
      ]);

      await detector.refreshExtensionAgents();
      const agents = detector.getDetectedAgents();

      const extAgent = agents.find((a) => a.name === 'New Ext');
      expect(extAgent).toBeDefined();
      expect(extAgent!.isExtension).toBe(true);
    });

    it('should remove extension agents whose managed binary is no longer available', async () => {
      mockResolveManagedBinary.mockReturnValue({
        binaryPath: '/managed/ext-temp/1.0.0/bin/temp',
        versionDir: '1.0.0',
      });
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'temp',
          name: 'Temp',
          extensionName: 'ext-temp',
          installedBinaryPath: 'bin/temp',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      expect(detector.getDetectedAgents().find((a) => a.name === 'Temp')).toBeDefined();

      // Managed binary removed, no defaultCliPath fallback
      mockResolveManagedBinary.mockReturnValue(null);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'temp',
          name: 'Temp',
          extensionName: 'ext-temp',
          installedBinaryPath: 'bin/temp',
        }),
      ]);

      await detector.refreshExtensionAgents();

      expect(detector.getDetectedAgents().find((a) => a.name === 'Temp')).toBeUndefined();
    });

    it('should still deduplicate after refresh', async () => {
      setAvailableClis(['qwen']);

      const detector = await createFreshDetector();
      await detector.initialize();

      // Extension contributes same name as builtin
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'qwen',
          name: 'Qwen Code',
          extensionName: 'aionext-qwen',
          defaultCliPath: 'bunx @qwen/cli',
        }),
      ]);

      await detector.refreshExtensionAgents();
      const qwenAgents = detector.getDetectedAgents().filter((a) => a.name === 'Qwen Code');
      expect(qwenAgents).toHaveLength(1);
      expect(qwenAgents[0].backend).toBe('custom'); // extension wins (iterated first in dedup)
    });

    it('should keep extension agents ahead of custom agents after refresh', async () => {
      setAvailableClis([]);
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'custom-1', name: 'My Agent', defaultCliPath: '/usr/bin/myagent', enabled: true },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();

      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'ext-1',
          name: 'Ext Agent',
          extensionName: 'ext-test',
          defaultCliPath: 'bunx @ext/agent',
        }),
      ]);

      await detector.refreshExtensionAgents();
      const agents = detector.getDetectedAgents();

      // Order: Gemini > Custom > Extension (deduplicate puts custom first, then extension+builtin)
      expect(agents.map((agent) => agent.name)).toEqual(['Gemini CLI', 'My Agent', 'Ext Agent']);
    });
  });

  describe('refreshBuiltinAgents', () => {
    it('should keep Gemini ahead of builtin agents after refresh', async () => {
      setAvailableClis(['claude', 'qwen']);

      const detector = await createFreshDetector();
      await detector.initialize();

      await detector.refreshBuiltinAgents();
      const agents = detector.getDetectedAgents();

      expect(agents[0].backend).toBe('gemini');
      expect(agents.slice(1).map((agent) => agent.backend)).toEqual(['claude', 'qwen']);
    });

    it('should preserve queued custom refreshes while builtin refresh is in flight', async () => {
      setAvailableClis([]);
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'old', name: 'Old Agent', defaultCliPath: '/bin/old', enabled: true },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();

      const builtinDetection =
        createDeferred<Array<{ backend: 'claude'; name: string; cliPath: string; acpArgs: string[] }>>();
      const builtinSpy = vi
        .spyOn(
          detector as unknown as {
            detectBuiltinAgents: () => Promise<
              Array<{ backend: 'claude'; name: string; cliPath: string; acpArgs: string[] }>
            >;
          },
          'detectBuiltinAgents'
        )
        .mockImplementation(() => builtinDetection.promise);

      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'new', name: 'New Agent', defaultCliPath: '/bin/new', enabled: true },
      ]);

      const builtinRefresh = detector.refreshBuiltinAgents();
      let customRefreshSettled = false;
      const customRefresh = detector.refreshCustomAgents().then(() => {
        customRefreshSettled = true;
      });

      await Promise.resolve();
      await Promise.resolve();
      expect(customRefreshSettled).toBe(false);

      builtinDetection.resolve([
        {
          backend: 'claude',
          name: 'Claude Code',
          cliPath: 'claude',
          acpArgs: ['--experimental-acp'],
        },
      ]);

      await Promise.all([builtinRefresh, customRefresh]);
      builtinSpy.mockRestore();

      const agents = detector.getDetectedAgents();
      // Order: Gemini > Custom > Extension+Builtin (deduplicate puts custom first)
      expect(agents.map((agent) => agent.name)).toEqual(['Gemini CLI', 'New Agent', 'Claude Code']);
      expect(agents.find((agent) => agent.name === 'Old Agent')).toBeUndefined();
    });
  });

  describe('refreshCustomAgents', () => {
    it('should replace custom agents with updated config', async () => {
      setAvailableClis([]);
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'old', name: 'Old Agent', defaultCliPath: '/bin/old', enabled: true },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      expect(detector.getDetectedAgents().find((a) => a.customAgentId === 'old')).toBeDefined();

      // Config changes
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'new', name: 'New Agent', defaultCliPath: '/bin/new', enabled: true },
      ]);

      await detector.refreshCustomAgents();
      const agents = detector.getDetectedAgents();

      expect(agents.find((a) => a.customAgentId === 'old')).toBeUndefined();
      expect(agents.find((a) => a.customAgentId === 'new')).toBeDefined();
    });

    it('should skip disabled custom agents', async () => {
      setAvailableClis([]);
      vi.mocked(ProcessConfig.get).mockResolvedValue([
        { id: 'disabled', name: 'Disabled', defaultCliPath: '/bin/x', enabled: false },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();

      expect(detector.getDetectedAgents().find((a) => a.customAgentId === 'disabled')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Priority chain tests (Task 3b)
  // ---------------------------------------------------------------------------

  describe('extension agent priority chain', () => {
    it('Priority 1: should use managed binary when resolveManagedBinary returns a result', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue({
        binaryPath: '/home/user/.aionui-agents/aionext-auggie/1.2.0_abc12345/node_modules/.bin/auggie',
        versionDir: '1.2.0_abc12345',
      });
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'auggie',
          name: 'Auggie',
          cliCommand: 'auggie',
          extensionName: 'aionext-auggie',
          installedBinaryPath: 'node_modules/.bin/auggie',
          env: { AUGGIE_MODE: 'acp' },
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      const auggie = agents.find((a) => a.name === 'Auggie');
      expect(auggie).toBeDefined();
      expect(auggie!.cliPath).toBe('/home/user/.aionui-agents/aionext-auggie/1.2.0_abc12345/node_modules/.bin/auggie');
      expect(auggie!.resolvedFrom).toBe('managed');
      expect(auggie!.isExtension).toBe(true);
      expect(auggie!.env).toEqual({ AUGGIE_MODE: 'acp' });
    });

    it('Priority 2: should use defaultCliPath when managed binary is not available', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue(null);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'auggie',
          name: 'Auggie',
          extensionName: 'aionext-auggie',
          installedBinaryPath: 'node_modules/.bin/auggie',
          defaultCliPath: 'bunx @anthropic/auggie',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      const auggie = agents.find((a) => a.name === 'Auggie');
      expect(auggie).toBeDefined();
      expect(auggie!.cliPath).toBe('bunx @anthropic/auggie');
      expect(auggie!.resolvedFrom).toBe('default-cli-path');
      expect(auggie!.isExtension).toBe(true);
    });

    it('Priority 3: should skip agent when no resolution method succeeds', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue(null);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'missing',
          name: 'Missing Agent',
          cliCommand: 'nonexistent',
          extensionName: 'ext-missing',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents.find((a) => a.name === 'Missing Agent')).toBeUndefined();
      expect(agents).toHaveLength(1); // only gemini
    });

    it('should stop at Priority 1 and not check Priority 2', async () => {
      setAvailableClis(['goose']); // available on PATH, but should not be checked
      mockResolveManagedBinary.mockReturnValue({
        binaryPath: '/managed/goose/1.0.0_abc/goose',
        versionDir: '1.0.0_abc',
      });
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'goose',
          name: 'Goose',
          cliCommand: 'goose',
          extensionName: 'aionext-goose',
          installedBinaryPath: 'goose',
          defaultCliPath: 'bunx @goose/cli',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      const goose = agents.find((a) => a.name === 'Goose');
      expect(goose).toBeDefined();
      // Must be managed path, not defaultCliPath
      expect(goose!.cliPath).toBe('/managed/goose/1.0.0_abc/goose');
      expect(goose!.resolvedFrom).toBe('managed');
    });

    it('should pass through env from adapter to detected agent', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue(null);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'myagent',
          name: 'My Agent',
          extensionName: 'ext-myagent',
          defaultCliPath: 'bunx @ext/myagent',
          env: { API_KEY: 'secret', AGENT_MODE: 'acp' },
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      const agent = agents.find((a) => a.name === 'My Agent');
      expect(agent).toBeDefined();
      expect(agent!.env).toEqual({ API_KEY: 'secret', AGENT_MODE: 'acp' });
    });

    it('should skip adapters without defaultCliPath or installedBinaryPath', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue(null);
      mockGetAcpAdapters.mockReturnValue([
        {
          id: 'empty',
          name: 'Empty Agent',
          connectionType: 'cli',
          acpArgs: ['--acp'],
          _extensionName: 'ext-empty',
          // no cliCommand, no defaultCliPath, no installedBinaryPath
        },
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();
      const agents = detector.getDetectedAgents();

      expect(agents.find((a) => a.name === 'Empty Agent')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Background version cleanup (Task 5b)
  // ---------------------------------------------------------------------------

  describe('background version cleanup on initialize', () => {
    it('should call cleanOldVersions for managed extension agents after detection', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue({
        binaryPath: '/managed/aionext-auggie/1.0.0_abc/node_modules/.bin/auggie',
        versionDir: '1.0.0_abc',
      });
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'auggie',
          name: 'Auggie',
          extensionName: 'aionext-auggie',
          installedBinaryPath: 'node_modules/.bin/auggie',
        }),
      ]);
      mockCleanOldVersions.mockResolvedValue([]);

      const detector = await createFreshDetector();
      await detector.initialize();

      // Allow background promise to settle
      await new Promise((r) => setTimeout(r, 10));

      expect(mockCleanOldVersions).toHaveBeenCalledWith('aionext-auggie', 3);
    });

    it('should not call cleanOldVersions when no managed agents detected', async () => {
      setAvailableClis([]);
      mockResolveManagedBinary.mockReturnValue(null);
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'goose',
          name: 'Goose',
          extensionName: 'aionext-goose',
          defaultCliPath: 'bunx @goose/cli',
        }),
      ]);

      const detector = await createFreshDetector();
      await detector.initialize();

      await new Promise((r) => setTimeout(r, 10));

      expect(mockCleanOldVersions).not.toHaveBeenCalled();
    });

    it('should deduplicate extension names for cleanup (one call per extension)', async () => {
      setAvailableClis([]);
      // Same extension with two adapters resolved via managed
      mockResolveManagedBinary.mockReturnValue({
        binaryPath: '/managed/aionext-multi/1.0.0_abc/bin/agent',
        versionDir: '1.0.0_abc',
      });
      mockGetAcpAdapters.mockReturnValue([
        makeExtAdapter({
          id: 'adapter-1',
          name: 'Agent A',
          extensionName: 'aionext-multi',
          installedBinaryPath: 'bin/agent-a',
        }),
        makeExtAdapter({
          id: 'adapter-2',
          name: 'Agent B',
          extensionName: 'aionext-multi',
          installedBinaryPath: 'bin/agent-b',
        }),
      ]);
      mockCleanOldVersions.mockResolvedValue([]);

      const detector = await createFreshDetector();
      await detector.initialize();

      await new Promise((r) => setTimeout(r, 10));

      // Should only be called once for 'aionext-multi', not twice
      expect(mockCleanOldVersions).toHaveBeenCalledTimes(1);
      expect(mockCleanOldVersions).toHaveBeenCalledWith('aionext-multi', 3);
    });
  });
});
