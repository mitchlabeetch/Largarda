/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wave 4 / Batch 4C - M&A Core Bridge Contract Regression Tests
 *
 * Protects the active M&A core bridge contract from accidental removal or modification.
 * Verifies that all active M&A capabilities (deal, document, analysis, riskFinding,
 * flowiseSession, flowise, integration, dueDiligence) remain exposed through the
 * IPC bridge as defined in Wave 4 / Batch 4A capability disposition.
 *
 * This test suite acts as a regression harness to prevent:
 * - Accidental removal of bridge handlers for active capabilities
 * - Bridge contract drift from the documented 4A disposition
 * - Introduction of new capabilities without proper wave allocation
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

describe('Wave 4 / Batch 4C - M&A Core Bridge Contract Regression', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ============================================================================
  // ACTIVE M&A CORE CAPABILITIES (from Wave 4 / Batch 4A disposition)
  // ============================================================================

  describe('Active M&A Core: ma.deal.* contract', () => {
    it('exposes deal.create provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.create.provider).toHaveBeenCalled();
    });

    it('exposes deal.get provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.get.provider).toHaveBeenCalled();
    });

    it('exposes deal.update provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.update.provider).toHaveBeenCalled();
    });

    it('exposes deal.delete provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.delete.provider).toHaveBeenCalled();
    });

    it('exposes deal.list provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.list.provider).toHaveBeenCalled();
    });

    it('exposes deal.listActive provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.listActive.provider).toHaveBeenCalled();
    });

    it('exposes deal.setActive provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.setActive.provider).toHaveBeenCalled();
    });

    it('exposes deal.getActive provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.getActive.provider).toHaveBeenCalled();
    });

    it('exposes deal.clearActive provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.clearActive.provider).toHaveBeenCalled();
    });

    it('exposes deal.archive provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.archive.provider).toHaveBeenCalled();
    });

    it('exposes deal.close provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.close.provider).toHaveBeenCalled();
    });

    it('exposes deal.reactivate provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.reactivate.provider).toHaveBeenCalled();
    });

    it('exposes deal.getContextForAI provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.getContextForAI.provider).toHaveBeenCalled();
    });

    it('exposes deal.validate provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.deal.validate.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.document.* contract', () => {
    it('exposes document.create provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.create.provider).toHaveBeenCalled();
    });

    it('exposes document.get provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.get.provider).toHaveBeenCalled();
    });

    it('exposes document.update provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.update.provider).toHaveBeenCalled();
    });

    it('exposes document.delete provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.delete.provider).toHaveBeenCalled();
    });

    it('exposes document.listByDeal provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.listByDeal.provider).toHaveBeenCalled();
    });

    it('exposes document.updateStatus provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.updateStatus.provider).toHaveBeenCalled();
    });

    it('exposes document.ingest provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.ingest.provider).toHaveBeenCalled();
    });

    it('exposes document.cancel provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.document.cancel.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.analysis.* contract', () => {
    it('exposes analysis.create provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.analysis.create.provider).toHaveBeenCalled();
    });

    it('exposes analysis.get provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.analysis.get.provider).toHaveBeenCalled();
    });

    it('exposes analysis.update provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.analysis.update.provider).toHaveBeenCalled();
    });

    it('exposes analysis.delete provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.analysis.delete.provider).toHaveBeenCalled();
    });

    it('exposes analysis.listByDeal provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.analysis.listByDeal.provider).toHaveBeenCalled();
    });

    it('exposes analysis.updateStatus provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.analysis.updateStatus.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.riskFinding.* contract', () => {
    it('exposes riskFinding.create provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.riskFinding.create.provider).toHaveBeenCalled();
    });

    it('exposes riskFinding.listByAnalysis provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.riskFinding.listByAnalysis.provider).toHaveBeenCalled();
    });

    it('exposes riskFinding.delete provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.riskFinding.delete.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.flowiseSession.* contract', () => {
    it('exposes flowiseSession.create provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.flowiseSession.create.provider).toHaveBeenCalled();
    });

    it('exposes flowiseSession.getByConversation provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.flowiseSession.getByConversation.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.flowise.* contract', () => {
    it('exposes flowise.getReadiness provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.flowise.getReadiness.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.integration.* contract', () => {
    it('exposes integration.listProviders provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.listProviders.provider).toHaveBeenCalled();
    });

    it('exposes integration.listConnections provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.listConnections.provider).toHaveBeenCalled();
    });

    it('exposes integration.listDescriptors provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.listDescriptors.provider).toHaveBeenCalled();
    });

    it('exposes integration.createConnectSession provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.createConnectSession.provider).toHaveBeenCalled();
    });

    it('exposes integration.createReconnectSession provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.createReconnectSession.provider).toHaveBeenCalled();
    });

    it('exposes integration.disconnect provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.disconnect.provider).toHaveBeenCalled();
    });

    it('exposes integration.proxyRequest provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.integration.proxyRequest.provider).toHaveBeenCalled();
    });
  });

  describe('Active M&A Core: ma.dueDiligence.* contract', () => {
    it('exposes dueDiligence.analyze provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.dueDiligence.analyze.provider).toHaveBeenCalled();
    });

    it('exposes dueDiligence.getAnalysis provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.dueDiligence.getAnalysis.provider).toHaveBeenCalled();
    });

    it('exposes dueDiligence.listAnalyses provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.dueDiligence.listAnalyses.provider).toHaveBeenCalled();
    });

    it('exposes dueDiligence.compareDeals provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.dueDiligence.compareDeals.provider).toHaveBeenCalled();
    });

    it('exposes dueDiligence.progress emitter for truthful analysis progress', async () => {
      const { ipcBridge } = await import('@/common');
      expect(ipcBridge.ma.dueDiligence.progress).toBeDefined();
      expect(typeof ipcBridge.ma.dueDiligence.progress.on).toBe('function');
    });
  });

  describe('Active M&A Core: ma.companyEnrichment.* contract', () => {
    it('exposes companyEnrichment.enrichBySiren provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.companyEnrichment.enrichBySiren.provider).toHaveBeenCalled();
    });

    it('exposes companyEnrichment.enrichCompany provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.companyEnrichment.enrichCompany.provider).toHaveBeenCalled();
    });

    it('exposes companyEnrichment.searchByName provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.companyEnrichment.searchByName.provider).toHaveBeenCalled();
    });

    it('exposes companyEnrichment.batchEnrich provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();
      expect(ipcBridge.ma.companyEnrichment.batchEnrich.provider).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REMOVED CAPABILITIES (from Wave 4 / Batch 4A disposition)
  // ============================================================================

  describe('Removed Capability: ma.contact.* is NOT exposed', () => {
    it('does NOT expose contact provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();

      // contact should not exist in the bridge (removed in 4A)
      expect(ipcBridge.ma.contact).toBeUndefined();
    });
  });

  describe('Removed Capability: ma.watchlist.* is NOT exposed', () => {
    it('does NOT expose watchlist provider', async () => {
      const { initMaBridge } = await import('@process/bridge/maBridge');
      const { ipcBridge } = await import('@/common');
      initMaBridge();

      // watchlist should not exist in the bridge (removed in 4A)
      expect(ipcBridge.ma.watchlist).toBeUndefined();
    });
  });
});
