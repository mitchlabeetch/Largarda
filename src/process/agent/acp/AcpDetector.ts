/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AcpBackendAll, PresetAgentType } from '@/common/types/acpTypes';
import { POTENTIAL_ACP_CLIS } from '@/common/types/acpTypes';
import { ExtensionRegistry } from '@process/extensions';
import { ProcessConfig } from '@process/utils/initStorage';
import { safeExec, safeExecFile } from '@process/utils/safeExec';
import { getEnhancedEnv } from '@process/utils/shellEnv';
import { cleanOldVersions, resolveManagedBinary } from '@process/extensions/hub/ManagedInstallResolver';

/** How the CLI path was resolved — useful for diagnostics and UI display */
export type CliResolvedFrom = 'user-config' | 'managed' | 'default-cli-path' | 'none';
export type DetectedKind = 'builtinAgent' | 'extensionAgent' | 'customAgent' | 'assistant';

interface DetectedAgent {
  id: string;
  kind: DetectedKind;
  // There are 4 real-kind: builtinAgent, extensionAgent, customAgent, AssistantAgent
  // - Builtin:   backend is a known CLI id (claude, qwen, goose, …) or 'gemini'
  // - Extension: `backend: 'custom', isExtension: true`,           isPreset: false, customAgentId = `ext:<extensionName>:<adapterId>`
  // - Custom:    `backend: 'custom', isExtension: false|undefined, isPreset: false, customAgentId is user-defined
  // - Assistant: `backend: 'custom', isExtension: false|undefined, isPreset: true`, customAgentId is user-defined
  backend: AcpBackendAll;
  isExtension?: boolean;
  customAgentId?: string;
  isPreset?: boolean;

  name: string;
  cliPath?: string;
  acpArgs?: string[];
  context?: string;
  avatar?: string;
  presetAgentType?: PresetAgentType | string;
  extensionName?: string;
  /** How the CLI path was resolved (extension agents only) */
  resolvedFrom?: CliResolvedFrom;
  /** Custom env from manifest (extension agents only) */
  env?: Record<string, string>;
  /** Skill directories from manifest (extension agents only) */
  skillsDirs?: string[];
}

const isBuiltinAgent = (agent: DetectedAgent): boolean => agent.backend !== 'gemini' && agent.backend !== 'custom';
const isExtensionAgent = (agent: DetectedAgent): boolean => agent.backend === 'custom' && agent.isExtension === true;
const isCustomAgent = (agent: DetectedAgent): boolean =>
  agent.backend === 'custom' && !agent.isExtension && !agent.isPreset;
const isAssistant = (agent: DetectedAgent): boolean =>
  agent.backend === 'custom' && !agent.isExtension && agent.isPreset;

/**
 * Global ACP detector — detects available agents from three sources:
 *
 * **Builtin agents** — Defined in POTENTIAL_ACP_CLIS. These are well-known
 * CLI tools (claude, qwen, goose, etc.) that the app knows about at compile
 * time. Each has a real `backendId` (e.g. 'claude', 'qwen') and is detected
 * via `which`/`where` on the system PATH. Gemini is a special builtin that
 * is always present (no CLI detection needed).
 *
 * **Extension agents** — Contributed by installed extensions via
 * `contributes.acpAdapters` in the extension manifest. Discovered from
 * ExtensionRegistry at runtime. Always have `backend: 'custom'` with a
 * `customAgentId` of the form `ext:<extensionName>:<adapterId>` and
 * `isExtension: true`. Also verified via `isCliAvailable` before inclusion.
 *
 * **Custom agents** — User-configured agents from the config store
 * (`acp.customAgents`). Always have `backend: 'custom'`. No CLI detection
 * is performed — the user is responsible for ensuring the CLI is available.
 * Includes preset agents (built-in templates like Academic Paper).
 *
 * All three sources run in parallel during detection, then results are
 * deduplicated by `cliPath` (first wins). Merge order determines priority:
 * Gemini > Builtin > Extension > Custom.
 */
class AcpDetector {
  private detectedAgents: DetectedAgent[] = [];
  private isDetected = false;
  private enhancedEnv: NodeJS.ProcessEnv | undefined;
  private mutationQueue: Promise<void> = Promise.resolve();
  private lastRefreshAt = 0;

  private createGeminiAgent(): DetectedAgent {
    return {
      kind: 'builtinAgent',
      id: 'gemini',
      backend: 'gemini',
      name: 'Gemini CLI',
      cliPath: undefined,
      acpArgs: undefined,
    };
  }

  private mergeDetectedAgents(params: {
    builtinAgents?: DetectedAgent[];
    extensionAgents?: DetectedAgent[];
    customAgents?: DetectedAgent[];
  }): DetectedAgent[] {
    const { builtinAgents = [], extensionAgents = [], customAgents = [] } = params;
    const deduped = this.deduplicate(builtinAgents, extensionAgents, customAgents);
    return [this.createGeminiAgent(), ...deduped];
  }

  private async runExclusiveMutation<T>(task: () => Promise<T>): Promise<T> {
    const previousMutation = this.mutationQueue;
    let releaseCurrentMutation: (() => void) | undefined;

    this.mutationQueue = new Promise<void>((resolve) => {
      releaseCurrentMutation = resolve;
    });

    await previousMutation;

    try {
      return await task();
    } finally {
      releaseCurrentMutation?.();
    }
  }

  /**
   * Check which CLI commands are available on the system PATH (batch).
   *
   * On POSIX: single shell invocation using `command -v` (shell builtin,
   * no per-command process spawn). Outputs found command names, one per line.
   *
   * On Windows: parallel `where` calls with PowerShell fallback (unchanged
   * from prior per-command approach, since `where` doesn't support batch).
   */
  private async batchCheckCliAvailability(commands: string[]): Promise<Set<string>> {
    if (commands.length === 0) return new Set();

    if (!this.enhancedEnv) {
      this.enhancedEnv = getEnhancedEnv();
    }

    const isWindows = process.platform === 'win32';

    if (!isWindows) {
      // Single shell: `command -v` is a POSIX shell builtin — no child process per command.
      // We echo the command name only when found, so output is a clean list of available CLIs.
      const checks = commands.map((cmd) => `command -v '${cmd}' >/dev/null 2>&1 && echo '${cmd}'`);
      // Append `; true` so the script always exits 0 — otherwise safeExec
      // rejects when the last CLI is not found (command -v returns 1).
      const script = checks.join('; ') + '; true';
      try {
        const { stdout } = await safeExec(script, { timeout: 3000, env: this.enhancedEnv });
        return new Set(stdout.trim().split('\n').filter(Boolean));
      } catch (err) {
        console.error('[AcpDetector] Batch CLI availability check failed, falling back to individual checks:', err);
        return new Set();
      }
    }

    // Windows: parallel individual `where` + PowerShell fallback
    const results = await Promise.allSettled(
      commands.map(async (cmd): Promise<string | null> => {
        try {
          await safeExecFile('where', [cmd], { timeout: 1000, env: this.enhancedEnv });
          return cmd;
        } catch {
          /* where failed, try PowerShell */
        }
        try {
          await safeExecFile(
            'powershell',
            [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              `Get-Command -All ${cmd} | Select-Object -First 1 | Out-Null`,
            ],
            { timeout: 1000, env: this.enhancedEnv }
          );
          return cmd;
        } catch {
          return null;
        }
      })
    );
    return new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value)
    );
  }

  /** Collect backend IDs of extension agents resolved via managed install directory. */
  private collectManagedAgentIds(extensionAgents: DetectedAgent[]): Set<string> {
    return new Set(extensionAgents.filter((a) => a.resolvedFrom === 'managed').map((a) => a.id));
  }

  // ---------------------------------------------------------------------------
  // Three detection sources — each returns an array of DetectedAgent candidates
  // ---------------------------------------------------------------------------

  /**
   * Source 1: Built-in POTENTIAL_ACP_CLIS — batch CLI availability check.
   *
   * @param skipIds - Backend IDs to skip (already resolved via managed install).
   *   When an extension agent was found through its managed install directory,
   *   there is no need to also `which` the same CLI on the system PATH.
   */
  private async detectBuiltinAgents(skipIds?: Set<string>): Promise<DetectedAgent[]> {
    const clis = skipIds ? POTENTIAL_ACP_CLIS.filter((cli) => !skipIds.has(cli.backendId)) : [...POTENTIAL_ACP_CLIS];

    if (clis.length === 0) return [];

    const available = await this.batchCheckCliAvailability(clis.map((cli) => cli.cmd));

    return clis
      .filter((cli) => available.has(cli.cmd))
      .map((cli) => ({
        kind: 'builtinAgent' as const,
        id: cli.backendId,
        backend: cli.backendId,
        isExtension: false,
        isPreset: false,
        name: cli.name,
        cliPath: cli.cmd,
        acpArgs: cli.args,
      }));
  }

  /**
   * Source 2: Extension-contributed ACP adapters.
   *
   * Resolution priority for each adapter:
   *   1. Managed install directory (absolute path, no `which` needed)
   *   2. defaultCliPath from manifest (bunx fallback, no `which` needed)
   *   3. Skip — adapter not available
   */
  private async detectExtensionAgents(): Promise<DetectedAgent[]> {
    try {
      const adapters = ExtensionRegistry.getInstance().getAcpAdapters();
      if (!adapters || adapters.length === 0) return [];

      const agents: DetectedAgent[] = [];

      for (const item of adapters) {
        const adapter = item as Record<string, unknown>;
        const id = typeof adapter.id === 'string' ? adapter.id : '';
        const name = typeof adapter.name === 'string' ? adapter.name : id;
        const defaultCliPath = typeof adapter.defaultCliPath === 'string' ? adapter.defaultCliPath : undefined;
        const acpArgs = Array.isArray(adapter.acpArgs)
          ? adapter.acpArgs.filter((v): v is string => typeof v === 'string')
          : undefined;
        const env =
          typeof adapter.env === 'object' && adapter.env !== null ? (adapter.env as Record<string, string>) : undefined;
        const avatar = typeof adapter.avatar === 'string' ? adapter.avatar : undefined;
        const extensionName = typeof adapter._extensionName === 'string' ? adapter._extensionName : 'unknown-extension';
        const connectionType = typeof adapter.connectionType === 'string' ? adapter.connectionType : 'unknown';
        const installedBinaryPath =
          typeof adapter.installedBinaryPath === 'string' ? adapter.installedBinaryPath : undefined;

        if (connectionType !== 'cli' && connectionType !== 'stdio') continue;
        if (!defaultCliPath && !installedBinaryPath) continue;

        // Priority 1: Check managed install directory
        const managed = resolveManagedBinary(extensionName, installedBinaryPath);
        if (managed) {
          agents.push({
            kind: 'extensionAgent',
            id: id,
            backend: 'custom' as const,
            isExtension: true,
            customAgentId: `ext:${extensionName}:${id}`,
            isPreset: false,
            name: name,
            cliPath: managed.binaryPath,
            acpArgs: acpArgs,
            env: env,
            avatar: avatar,
            extensionName: extensionName,
            resolvedFrom: 'managed',
          });
          continue;
        }

        // Priority 2: defaultCliPath (bunx fallback — always available, no `which` needed)
        if (defaultCliPath) {
          agents.push({
            kind: 'extensionAgent',
            id: id,
            backend: 'custom' as const,
            isExtension: true,
            customAgentId: `ext:${extensionName}:${id}`,
            isPreset: false,
            name: name,
            cliPath: defaultCliPath,
            acpArgs: acpArgs,
            env: env,
            avatar: avatar,
            extensionName: extensionName,
            resolvedFrom: 'default-cli-path',
          });
          continue;
        }
      }

      return agents;
    } catch (error) {
      console.warn('[AcpDetector] Failed to load extension ACP adapters:', error);
      return [];
    }
  }

  /**
   * Source 3: User-configured custom agents (no CLI check — user is responsible).
   */
  private async detectCustomAgents(): Promise<DetectedAgent[]> {
    try {
      const customAgents = await ProcessConfig.get('acp.customAgents');
      if (!customAgents || !Array.isArray(customAgents) || customAgents.length === 0) return [];

      const enabledAgents = customAgents.filter((agent) => agent.enabled && (agent.defaultCliPath || agent.isPreset));
      if (enabledAgents.length === 0) return [];

      return enabledAgents.map((agent) => ({
        kind: agent.isPreset ? 'assistant' : 'customAgent',
        id: agent.id,
        backend: 'custom' as const,
        isExtension: false,
        customAgentId: agent.id,
        isPreset: agent.isPreset,
        name: agent.name || 'Custom Agent',
        cliPath: agent.defaultCliPath,
        acpArgs: agent.acpArgs,
        context: agent.context,
        avatar: agent.avatar,
        presetAgentType: agent.presetAgentType,
      }));
    } catch (error) {
      if (error instanceof Error && (error.message.includes('ENOENT') || error.message.includes('not found'))) {
        return [];
      }
      console.warn('[AcpDetector] Unexpected error loading custom agents:', error);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Deduplication
  // ---------------------------------------------------------------------------

  /**
   * Deduplicate agents by cliPath. First occurrence wins (so ordering of the
   * input arrays determines priority: builtin > extension > custom).
   * Agents without cliPath (e.g. Gemini, presets) are always kept.
   */
  private deduplicate(
    builtinAgents: DetectedAgent[],
    extensionAgents: DetectedAgent[],
    customAgents: DetectedAgent[]
  ): DetectedAgent[] {
    const agents = [...builtinAgents, ...extensionAgents, ...customAgents];
    console.debug(`[AcpDetector] Deduplicating ${agents.length} agents: [ ${agents.map((a) => a.name).join(', ')} ]`);

    // customAgent dedup by customAgentId (if present) to allow multiple custom agents with same CLI but different configs
    const customSeen = new Set<string>();
    const customeDeduped: DetectedAgent[] = [];
    for (const agent of customAgents) {
      if (agent.customAgentId) {
        if (customSeen.has(agent.customAgentId)) continue;
        customSeen.add(agent.customAgentId);
      }
      customeDeduped.push(agent);
    }

    // extensionAgent dedup by cliPath to avoid duplicates between managed/default/system paths — keep the first one found by priority
    const extSeen = new Set<string>();
    const extensionDeduped: DetectedAgent[] = [];
    for (const agent of extensionAgents) {
      if (agent.cliPath) {
        if (extSeen.has(agent.cliPath)) continue;
        extSeen.add(agent.cliPath);
      }
      extensionDeduped.push(agent);
    }

    // builtinAgent dedup by cliPath to avoid duplicates between different builtins that resolve to the same CLI (unlikely but just in case) — keep the first one found by priority
    const builtinSeen = new Set<string>();
    const builtinDeduped: DetectedAgent[] = [];
    for (const agent of builtinAgents) {
      if (agent.cliPath) {
        if (builtinSeen.has(agent.cliPath)) continue;
        builtinSeen.add(agent.cliPath);
      }
      builtinDeduped.push(agent);
    }

    // Deduplicate across extension and builtin as well by name
    const nameSeen = new Set<string>();
    const finalDeduped: DetectedAgent[] = [];
    for (const agent of [...extensionDeduped, ...builtinDeduped]) {
      if (nameSeen.has(agent.name)) continue;
      nameSeen.add(agent.name);
      finalDeduped.push(agent);
    }

    const result = [...customeDeduped, ...finalDeduped];
    console.debug(
      `[AcpDetector] Deduplication result: ${result.length} agents: [ ${result.map((a) => a.name).join(', ')} ]`
    );
    console.debug(
      `[AcpDetector] Deduplication result: ${result.length} agents: \n${result.map((a) => JSON.stringify(a)).join('\n')}`
    );
    return result;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    await this.runExclusiveMutation(async () => {
      if (this.isDetected) return;

      console.log('[ACP] Starting agent detection...');
      const startTime = Date.now();

      // Phase 1: extension + custom (parallel, no `which` needed)
      const [extensionAgents, customAgents] = await Promise.all([
        this.detectExtensionAgents(),
        this.detectCustomAgents(),
      ]);

      // Phase 2: builtin — skip CLIs already found via managed install
      const managedIds = this.collectManagedAgentIds(extensionAgents);
      if (managedIds.size > 0) {
        console.log(`[AcpDetector] Skipping builtin detection for managed agents: [${[...managedIds].join(', ')}]`);
      }
      const builtinAgents = await this.detectBuiltinAgents(managedIds);

      this.detectedAgents = this.mergeDetectedAgents({ builtinAgents, extensionAgents, customAgents });
      this.isDetected = true;
      this.lastRefreshAt = Date.now();
      const elapsed = Date.now() - startTime;

      const agentSummary = this.detectedAgents.map((a) => `* ${a.backend}: ${a.name}`).join('\n');
      console.log(
        `[ACP Detector] Completed in ${elapsed}ms, found ${this.detectedAgents.length} agents:\n${agentSummary}`
      );

      // Background cleanup: remove old version directories for managed extensions.
      // Non-blocking — does not delay startup. Keep 3 most recent versions per extension.
      const extensionNames = new Set(
        this.detectedAgents
          .filter((a) => isExtensionAgent(a) && a.resolvedFrom === 'managed' && a.extensionName)
          .map((a) => a.extensionName!)
      );
      if (extensionNames.size > 0) {
        Promise.all([...extensionNames].map((name) => cleanOldVersions(name, 3))).catch((err) =>
          console.warn('[AcpDetector] Background version cleanup failed:', err)
        );
      }
    });
  }

  getDetectedAgents(): DetectedAgent[] {
    return this.detectedAgents;
  }

  hasAgents(): boolean {
    return this.detectedAgents.length > 0;
  }

  /**
   * Refresh custom agents detection only (called when config changes).
   */
  async refreshCustomAgents(): Promise<void> {
    await this.runExclusiveMutation(async () => {
      const builtinAgents = this.detectedAgents.filter(isBuiltinAgent);
      const extensionAgents = this.detectedAgents.filter(isExtensionAgent);
      const customAgents = await this.detectCustomAgents();
      this.detectedAgents = this.mergeDetectedAgents({ builtinAgents, extensionAgents, customAgents });
    });
  }

  /**
   * Refresh builtin CLI agents only (called when system PATH may have changed).
   * Clears cached env so newly installed/removed CLIs are detected.
   * Gemini is a builtin that requires no CLI — it is always kept.
   */
  async refreshBuiltinAgents(): Promise<void> {
    await this.runExclusiveMutation(async () => {
      this.enhancedEnv = undefined;
      // Snapshot old builtin backends for diff logging
      const extensionAgents = this.detectedAgents.filter(isExtensionAgent);
      const customAgents = this.detectedAgents.filter(isCustomAgent);

      const oldBuiltins = this.detectedAgents.filter(isBuiltinAgent).map((a) => a.backend);
      const builtinAgents = await this.detectBuiltinAgents(this.collectManagedAgentIds(extensionAgents));
      const newBuiltins = builtinAgents.map((a) => a.backend);
      this.detectedAgents = this.mergeDetectedAgents({ builtinAgents, extensionAgents, customAgents });

      const added = newBuiltins.filter((b) => !oldBuiltins.includes(b));
      const removed = oldBuiltins.filter((b) => !newBuiltins.includes(b));
      if (added.length > 0 || removed.length > 0) {
        console.log(`[AcpDetector] Builtin agents changed: +[${added.join(', ')}] -[${removed.join(', ')}]`);
      }
    });
  }

  /**
   * Refresh extension-contributed agents (called after ExtensionRegistry.hotReload).
   * Clears cached env so newly installed CLIs are discoverable.
   */
  async refreshExtensionAgents(): Promise<void> {
    await this.runExclusiveMutation(async () => {
      this.enhancedEnv = undefined;
      const builtinAgents = this.detectedAgents.filter(isBuiltinAgent);
      const customAgents = this.detectedAgents.filter(isCustomAgent);
      const extensionAgents = await this.detectExtensionAgents();
      this.detectedAgents = this.mergeDetectedAgents({ builtinAgents, extensionAgents, customAgents });
      this.lastRefreshAt = Date.now();
    });
  }

  /**
   * Re-run all three detection paths from scratch.
   * Called after hub install since onInstall hooks may have installed new CLIs.
   * Clears cached env to pick up PATH changes.
   */
  async refreshAll(): Promise<void> {
    await this.runExclusiveMutation(async () => {
      this.enhancedEnv = undefined;

      // Phase 1: extension + custom (no `which`)
      const [extensionAgents, customAgents] = await Promise.all([
        this.detectExtensionAgents(),
        this.detectCustomAgents(),
      ]);

      // Phase 2: builtin — skip CLIs already found via managed install
      const builtinAgents = await this.detectBuiltinAgents(this.collectManagedAgentIds(extensionAgents));

      this.detectedAgents = this.mergeDetectedAgents({ builtinAgents, extensionAgents, customAgents });
      this.lastRefreshAt = Date.now();
    });
  }

  /**
   * Refresh all agents only if the last refresh was more than `ttlMs` ago.
   * Avoids redundant back-to-back refreshes (e.g. install just refreshed,
   * then getExtensionListWithStatus triggers another one immediately).
   */
  async refreshAllIfStale(ttlMs: number): Promise<void> {
    if (Date.now() - this.lastRefreshAt < ttlMs) return;
    await this.refreshAll();
  }
}

export const acpDetector = new AcpDetector();
export { isAssistant, isBuiltinAgent, isCustomAgent, isExtensionAgent };
export type { DetectedAgent };
