/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DueDiligenceService, type DueDiligenceRequest } from '@process/services/ma/DueDiligenceService';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { FLOW_CATALOG, KNOWN_FLOW_KEYS, type FlowKey } from '@/common/ma/flowise';
import type { FlowProvenance } from '@process/services/ma/DueDiligenceService';

vi.mock('@process/services/database/repositories/ma/AnalysisRepository');
vi.mock('@process/services/database/repositories/ma/DocumentRepository');
vi.mock('@process/services/database/repositories/ma/DealRepository');

type MockAnalysisRepo = {
  create: ReturnType<typeof vi.fn>;
  markRunning: ReturnType<typeof vi.fn>;
  markCompleted: ReturnType<typeof vi.fn>;
  markError: ReturnType<typeof vi.fn>;
  getRiskFindings: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  listByDeal: ReturnType<typeof vi.fn>;
  createRiskFindings: ReturnType<typeof vi.fn>;
};

type MockDocumentRepo = {
  get: ReturnType<typeof vi.fn>;
};

type MockDealRepo = {
  get: ReturnType<typeof vi.fn>;
};

type ServiceInternals = {
  analyzeWithFlowise: (...args: unknown[]) => Promise<{
    risks: unknown[];
    executionSource: 'flowise' | 'local_fallback';
  }>;
};

const DEFAULT_FLOW_PROVENANCE: FlowProvenance = {
  flowKey: 'ma.dd.analysis',
  flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
  promptVersionId: '2026-04-20.0',
  flowDescription: 'Risk-categorised due-diligence pass over a deal corpus.',
  resolvedAt: 1_712_345_678_901,
};

describe('DueDiligenceService - Catalog Integration', () => {
  let service: DueDiligenceService;
  let mockAnalysisRepo: MockAnalysisRepo;
  let mockDocumentRepo: MockDocumentRepo;
  let mockDealRepo: MockDealRepo;

  const baseRequest: DueDiligenceRequest = {
    dealId: 'deal-1',
    documentIds: ['doc-1'],
    analysisTypes: ['due_diligence'],
  };

  beforeEach(() => {
    mockAnalysisRepo = {
      create: vi.fn(),
      markRunning: vi.fn(),
      markCompleted: vi.fn(),
      markError: vi.fn(),
      getRiskFindings: vi.fn(),
      get: vi.fn(),
      listByDeal: vi.fn(),
      createRiskFindings: vi.fn(),
    };
    mockDocumentRepo = {
      get: vi.fn(),
    };
    mockDealRepo = {
      get: vi.fn(),
    };

    vi.mocked(AnalysisRepository).mockImplementation(() => mockAnalysisRepo);
    vi.mocked(DocumentRepository).mockImplementation(() => mockDocumentRepo);
    vi.mocked(DealRepository).mockImplementation(() => mockDealRepo);

    service = new DueDiligenceService(mockAnalysisRepo, mockDocumentRepo, mockDealRepo);
  });

  const setupCompletedAnalysis = (flowId?: string): void => {
    mockDocumentRepo.get.mockResolvedValue({
      success: true,
      data: { id: 'doc-1', filename: 'test.txt', textContent: 'Test content' },
    });
    mockDealRepo.get.mockResolvedValue({ success: true, data: null });
    mockAnalysisRepo.create.mockResolvedValue({
      success: true,
      data: { id: 'analysis-1', dealId: 'deal-1', type: 'due_diligence', flowId },
    });
    mockAnalysisRepo.markRunning.mockResolvedValue({ success: true });
    mockAnalysisRepo.markCompleted.mockResolvedValue({ success: true });
    mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
    mockAnalysisRepo.createRiskFindings.mockResolvedValue({ success: true, data: [] });
  };

  describe('invalid key rejection', () => {
    it('rejects an unknown flow key with clear error message', async () => {
      const request: DueDiligenceRequest = {
        ...baseRequest,
        options: {
          useFlowise: true,
          flowKey: 'ma.not.a.real.key' as FlowKey,
        },
      };

      const result = await service.analyze(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid flowKey');
      expect(result.error).toContain('ma.not.a.real.key');
      expect(result.error).toContain('Known keys');
    });

    it('requires flowKey when Flowise execution is explicitly requested', async () => {
      const request: DueDiligenceRequest = {
        ...baseRequest,
        options: {
          useFlowise: true,
        },
      };

      const result = await service.analyze(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid flowKey');
      expect(result.error).toContain('undefined');
    });
  });

  describe('catalog resolution path', () => {
    it('resolves a valid flow key to its flow spec', () => {
      const validKey: FlowKey = 'ma.dd.analysis';
      const spec = FLOW_CATALOG[validKey];

      expect(spec).toBeDefined();
      expect(spec.key).toBe(validKey);
      expect(spec.id).toBe('96da0c29-c819-4d3a-8391-b8c571c3ba4e');
      expect(spec.promptVersionId).toBe('2026-04-20.0');
      expect(spec.status).toBe('authored');
    });

    it('stores the resolved flowId when Flowise execution is requested', async () => {
      setupCompletedAnalysis('96da0c29-c819-4d3a-8391-b8c571c3ba4e');
      vi.spyOn(service as unknown as ServiceInternals, 'analyzeWithFlowise').mockResolvedValue({
        risks: [],
        executionSource: 'flowise',
      });

      const result = await service.analyze({
        ...baseRequest,
        options: {
          useFlowise: true,
          flowKey: 'ma.dd.analysis',
        },
      });

      expect(result.success).toBe(true);
      expect(mockAnalysisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
        })
      );
    });
  });

  describe('provenance persistence and attribution', () => {
    it('persists flow provenance when Flowise actually produced the analysis', async () => {
      setupCompletedAnalysis('96da0c29-c819-4d3a-8391-b8c571c3ba4e');
      vi.spyOn(service as unknown as ServiceInternals, 'analyzeWithFlowise').mockResolvedValue({
        risks: [],
        executionSource: 'flowise',
      });

      const result = await service.analyze({
        ...baseRequest,
        options: {
          useFlowise: true,
          flowKey: 'ma.dd.analysis',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.flowProvenance).toBeDefined();
      expect(result.data?.flowProvenance?.flowKey).toBe('ma.dd.analysis');

      const persistedPayload = mockAnalysisRepo.markCompleted.mock.calls[0][1] as Record<string, unknown>;
      expect(persistedPayload.executionSource).toBe('flowise');
      expect(persistedPayload.flowProvenance).toMatchObject({
        flowKey: 'ma.dd.analysis',
        flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
        promptVersionId: '2026-04-20.0',
      });
    });

    it('omits flow provenance when Flowise falls back to local analysis', async () => {
      setupCompletedAnalysis('96da0c29-c819-4d3a-8391-b8c571c3ba4e');
      vi.spyOn(service as unknown as ServiceInternals, 'analyzeWithFlowise').mockResolvedValue({
        risks: [],
        executionSource: 'local_fallback',
      });

      const result = await service.analyze({
        ...baseRequest,
        options: {
          useFlowise: true,
          flowKey: 'ma.dd.analysis',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.flowProvenance).toBeUndefined();

      const persistedPayload = mockAnalysisRepo.markCompleted.mock.calls[0][1] as Record<string, unknown>;
      expect(persistedPayload.executionSource).toBe('local_fallback');
      expect(persistedPayload.flowProvenance).toBeUndefined();
    });

    it('records local execution source when Flowise is not requested', async () => {
      setupCompletedAnalysis();

      const result = await service.analyze({
        ...baseRequest,
        options: {
          useFlowise: false,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.flowProvenance).toBeUndefined();

      const persistedPayload = mockAnalysisRepo.markCompleted.mock.calls[0][1] as Record<string, unknown>;
      expect(persistedPayload.executionSource).toBe('local');
    });
  });

  describe('read-path provenance reconstruction', () => {
    it('prefers persisted provenance on completed analyses', async () => {
      mockAnalysisRepo.get.mockResolvedValue({
        success: true,
        data: {
          id: 'analysis-1',
          dealId: 'deal-1',
          type: 'due_diligence',
          status: 'completed',
          flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
          completedAt: Date.now(),
          result: {
            riskScores: { financial: 50, legal: 30, operational: 20, regulatory: 15, reputational: 10 },
            overallRiskScore: 35,
            summary: 'Test summary',
            recommendations: ['Test recommendation'],
            executionSource: 'flowise',
            flowProvenance: DEFAULT_FLOW_PROVENANCE,
          },
        },
      });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });

      const result = await service.getAnalysis('analysis-1');

      expect(result.success).toBe(true);
      expect(result.data?.flowProvenance).toEqual(DEFAULT_FLOW_PROVENANCE);
    });

    it('does not reconstruct provenance for persisted local fallback records', async () => {
      mockAnalysisRepo.get.mockResolvedValue({
        success: true,
        data: {
          id: 'analysis-1',
          dealId: 'deal-1',
          type: 'due_diligence',
          status: 'completed',
          flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
          completedAt: Date.now(),
          result: {
            riskScores: { financial: 50, legal: 30, operational: 20, regulatory: 15, reputational: 10 },
            overallRiskScore: 35,
            summary: 'Test summary',
            recommendations: ['Test recommendation'],
            executionSource: 'local_fallback',
          },
        },
      });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });

      const result = await service.getAnalysis('analysis-1');

      expect(result.success).toBe(true);
      expect(result.data?.flowProvenance).toBeUndefined();
    });

    it('reconstructs provenance from flowId for legacy analyses without persisted metadata', async () => {
      mockAnalysisRepo.get.mockResolvedValue({
        success: true,
        data: {
          id: 'analysis-1',
          dealId: 'deal-1',
          type: 'due_diligence',
          status: 'completed',
          flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
          completedAt: Date.now(),
          result: {
            riskScores: { financial: 50, legal: 30, operational: 20, regulatory: 15, reputational: 10 },
            overallRiskScore: 35,
            summary: 'Test summary',
            recommendations: ['Test recommendation'],
          },
        },
      });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });

      const result = await service.getAnalysis('analysis-1');

      expect(result.success).toBe(true);
      expect(result.data?.flowProvenance?.flowKey).toBe('ma.dd.analysis');
      expect(result.data?.flowProvenance?.flowId).toBe('96da0c29-c819-4d3a-8391-b8c571c3ba4e');
    });

    it('returns persisted provenance from listAnalyses', async () => {
      mockAnalysisRepo.listByDeal.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'analysis-1',
            dealId: 'deal-1',
            type: 'due_diligence',
            status: 'completed',
            flowId: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
            completedAt: Date.now(),
            result: {
              riskScores: { financial: 50, legal: 30, operational: 20, regulatory: 15, reputational: 10 },
              overallRiskScore: 35,
              summary: 'Test summary',
              recommendations: ['Test recommendation'],
              executionSource: 'flowise',
              flowProvenance: DEFAULT_FLOW_PROVENANCE,
            },
          },
        ],
      });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });

      const result = await service.listAnalyses('deal-1');

      expect(result.success).toBe(true);
      expect(result.data?.[0].flowProvenance).toEqual(DEFAULT_FLOW_PROVENANCE);
    });
  });

  describe('known flow keys', () => {
    it('includes all DD-related flow keys', () => {
      expect(KNOWN_FLOW_KEYS).toContain('ma.dd.analysis');
      expect(KNOWN_FLOW_KEYS).toContain('ma.dd.risk.drill');
    });

    it('validates each known flow key exists in the catalog', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        expect(FLOW_CATALOG[key]).toBeDefined();
        expect(FLOW_CATALOG[key].key).toBe(key);
      }
    });
  });
});
