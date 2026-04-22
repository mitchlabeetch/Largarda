/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp'), isPackaged: false, on: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((value: string) => Buffer.from(value, 'utf-8')),
    decryptString: vi.fn((value: Buffer) => value.toString('utf-8')),
    getSelectedStorageBackend: vi.fn(() => 'mock'),
  },
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn() },
  shell: { openExternal: vi.fn() },
  dialog: {},
}));

// Mock the bridge so provider() calls are no-ops
vi.mock('@office-ai/platform', () => ({
  bridge: {
    buildProvider: () => ({
      provider: vi.fn(),
      invoke: vi.fn(),
    }),
    buildEmitter: () => ({
      emit: vi.fn(),
      on: vi.fn(),
    }),
  },
}));

// Mock initStorage path helpers
vi.mock('@process/utils/initStorage', () => ({
  getSkillsDir: () => '/mock/skills',
  getBuiltinSkillsDir: () => '/mock/skills/_builtin',
  getSystemDir: () => ({
    workDir: '/mock/work',
    cacheDir: '/mock/cache',
    logDir: '/mock/logs',
    platform: 'linux',
    arch: 'x64',
  }),
  getAssistantsDir: () => '/mock/assistants',
}));

// Mock common ipcBridge
vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      deal: {
        create: { provider: vi.fn() },
        get: { provider: vi.fn() },
        update: { provider: vi.fn() },
        delete: { provider: vi.fn() },
        list: { provider: vi.fn() },
        listActive: { provider: vi.fn() },
        setActive: { provider: vi.fn() },
        getActive: { provider: vi.fn() },
        clearActive: { provider: vi.fn() },
        archive: { provider: vi.fn() },
        close: { provider: vi.fn() },
        reactivate: { provider: vi.fn() },
        getContextForAI: { provider: vi.fn() },
        validate: { provider: vi.fn() },
      },
      document: {
        create: { provider: vi.fn() },
        get: { provider: vi.fn() },
        update: { provider: vi.fn() },
        delete: { provider: vi.fn() },
        listByDeal: { provider: vi.fn() },
        updateStatus: { provider: vi.fn() },
        ingest: { provider: vi.fn() },
        cancel: { provider: vi.fn() },
        progress: { emit: vi.fn(), on: vi.fn() },
      },
      analysis: {
        create: { provider: vi.fn() },
        get: { provider: vi.fn() },
        update: { provider: vi.fn() },
        delete: { provider: vi.fn() },
        listByDeal: { provider: vi.fn() },
        updateStatus: { provider: vi.fn() },
      },
      riskFinding: {
        create: { provider: vi.fn() },
        listByAnalysis: { provider: vi.fn() },
        delete: { provider: vi.fn() },
      },
      flowiseSession: {
        create: { provider: vi.fn() },
        getByConversation: { provider: vi.fn() },
      },
      flowise: {
        getReadiness: { provider: vi.fn() },
      },
      integration: {
        listProviders: { provider: vi.fn() },
        listConnections: { provider: vi.fn() },
        listDescriptors: { provider: vi.fn() },
        createConnectSession: { provider: vi.fn() },
        createReconnectSession: { provider: vi.fn() },
        disconnect: { provider: vi.fn() },
        proxyRequest: { provider: vi.fn() },
      },
      dueDiligence: {
        analyze: { provider: vi.fn() },
        getAnalysis: { provider: vi.fn() },
        listAnalyses: { provider: vi.fn() },
        compareDeals: { provider: vi.fn() },
        progress: { emit: vi.fn(), on: vi.fn() },
      },
      companyEnrichment: {
        enrichBySiren: { provider: vi.fn() },
        enrichCompany: { provider: vi.fn() },
        searchByName: { provider: vi.fn() },
        batchEnrich: { provider: vi.fn() },
      },
      emailSync: {
        getReadiness: { provider: vi.fn() },
        start: { provider: vi.fn() },
        getJob: { provider: vi.fn() },
        listJobs: { provider: vi.fn() },
        cancel: { provider: vi.fn() },
        progress: { emit: vi.fn(), on: vi.fn() },
      },
      crmSync: {
        getReadiness: { provider: vi.fn() },
        start: { provider: vi.fn() },
        getJob: { provider: vi.fn() },
        listJobs: { provider: vi.fn() },
        cancel: { provider: vi.fn() },
        progress: { emit: vi.fn(), on: vi.fn() },
      },
      brief: {
        generateDaily: { provider: vi.fn() },
      },
      report: {
        generate: { provider: vi.fn() },
      },
    },
  },
}));

describe('maBridge standalone compatibility', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('imports without requiring electron', async () => {
    // If this import succeeds, the module has no top-level Electron dependency
    const mod = await import('@process/bridge/maBridge');
    expect(mod.initMaBridge).toBeTypeOf('function');
  });

  it('initMaBridge() registers all providers without throwing', async () => {
    const { initMaBridge } = await import('@process/bridge/maBridge');
    expect(() => initMaBridge()).not.toThrow();
  });

  it('registers clearActive provider', async () => {
    const { initMaBridge } = await import('@process/bridge/maBridge');
    const { ipcBridge } = await import('@/common');
    initMaBridge();
    expect(ipcBridge.ma.deal.clearActive.provider).toHaveBeenCalled();
  });

  it('registers getReadiness provider', async () => {
    const { initMaBridge } = await import('@process/bridge/maBridge');
    const { ipcBridge } = await import('@/common');
    initMaBridge();
    expect(ipcBridge.ma.flowise.getReadiness.provider).toHaveBeenCalled();
  });
});
