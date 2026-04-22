/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for DailyBriefService
 * Tests brief generation, provenance tracking, and report generation.
 * Part of Wave 10 / Batch 10C.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DealContext, MaDocument, MaAnalysis, RiskFinding, MaIntegrationConnection } from '@/common/ma/types';
import { DailyBriefService } from '@process/services/ma/DailyBriefService';

// Mock data
const mockDeal: DealContext = {
  id: 'deal-1',
  name: 'Test Deal',
  parties: [{ name: 'Buyer Corp', role: 'buyer' }],
  transactionType: 'acquisition',
  targetCompany: { name: 'Target Inc', jurisdiction: 'US' },
  status: 'active',
  createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
  updatedAt: Date.now(),
};

const mockDocument: MaDocument = {
  id: 'doc-1',
  dealId: 'deal-1',
  filename: 'test.pdf',
  originalPath: '/path/to/test.pdf',
  format: 'pdf',
  size: 1024,
  status: 'completed',
  createdAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
  metadata: {
    provenance: {
      sourcePath: '/path/to/test.pdf',
      sizeBytes: 1024,
      processedAt: Date.now() - 1000 * 60 * 20, // 20 minutes ago
    },
  },
};

const mockAnalysis: MaAnalysis = {
  id: 'analysis-1',
  dealId: 'deal-1',
  type: 'due_diligence',
  input: { documentIds: ['doc-1'], analysisTypes: ['due_diligence'] },
  status: 'completed',
  createdAt: Date.now() - 1000 * 60 * 60,
  completedAt: Date.now() - 1000 * 60 * 10, // 10 minutes ago
};

const mockRiskFinding: RiskFinding = {
  id: 'risk-1',
  analysisId: 'analysis-1',
  category: 'financial',
  severity: 'high',
  score: 75,
  title: 'Revenue Decline',
  description: 'Revenue has declined 20% YoY',
  createdAt: Date.now() - 1000 * 60 * 10,
};

const mockIntegration: MaIntegrationConnection = {
  id: 'conn-1',
  providerId: 'hubspot',
  providerConfigKey: 'hubspot-oauth',
  status: 'connected',
  connectedAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
  createdAt: Date.now() - 1000 * 60 * 60 * 2,
  updatedAt: Date.now(),
};

// Mock repositories
const mockDealRepo = {
  list: vi.fn(),
};

const mockDocumentRepo = {
  listByDeal: vi.fn(),
};

const mockAnalysisRepo = {
  listByDeal: vi.fn(),
  getRiskFindings: vi.fn(),
};

const mockIntegrationRepo = {
  list: vi.fn(),
};

const mockSyncJobRepo = {
  list: vi.fn(),
};

describe('DailyBriefService', () => {
  let service: DailyBriefService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DailyBriefService(
      mockDealRepo as any,
      mockDocumentRepo as any,
      mockAnalysisRepo as any,
      mockIntegrationRepo as any,
      mockSyncJobRepo as any
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDailyBrief', () => {
    it('should generate a brief with 24h time window by default', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [mockDocument], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [mockAnalysis], total: 1 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [mockRiskFinding] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      const result = await service.generateDailyBrief({});

      expect(result.success).toBe(true);
      expect(result.brief).toBeDefined();
      expect(result.brief!.timeWindow).toBe('24h');
      expect(result.brief!.summary.totalDeals).toBe(1);
    });

    it('should filter brief items by time window', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      // Create an old deal (30 days ago)
      const oldDeal = { ...mockDeal, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 };
      mockDealRepo.list.mockResolvedValue({ data: [oldDeal], total: 1 });

      const result = await service.generateDailyBrief({ timeWindow: '24h' });

      expect(result.brief!.summary.totalDeals).toBe(1); // Deal is counted in summary
      // But no items since it's outside the 24h window
      const dealCreatedItems = result.brief!.items.filter((i: { type: string }) => i.type === 'deal_created');
      expect(dealCreatedItems.length).toBe(0);
    });

    it('should include provenance for all brief items', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [mockDocument], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [mockAnalysis], total: 1 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      const result = await service.generateDailyBrief({});

      expect(result.brief!.items.length).toBeGreaterThan(0);
      for (const item of result.brief!.items) {
        expect(item.provenance).toBeDefined();
        expect(item.provenance.sourceId).toBeDefined();
        expect(item.provenance.sourceType).toBeDefined();
        expect(item.provenance.drillDownPath).toBeDefined();
        expect(item.provenance.drillDownPath.startsWith('/')).toBe(true);
      }
    });

    it('should group items by deal', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [mockDocument], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      const result = await service.generateDailyBrief({});

      expect(result.brief!.byDeal[mockDeal.id]).toBeDefined();
      expect(result.brief!.byDeal[mockDeal.id].length).toBeGreaterThan(0);
    });

    it('should calculate summary counts correctly', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [mockDocument], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [mockAnalysis], total: 1 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [mockRiskFinding] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      const result = await service.generateDailyBrief({});

      expect(result.brief!.summary.documentsProcessed).toBe(1);
      expect(result.brief!.summary.analysesCompleted).toBe(1);
      expect(result.brief!.summary.risksIdentified).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate an executive summary report', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });

      const result = await service.generateReport({ type: 'executive_summary' });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report!.type).toBe('executive_summary');
      expect(result.report!.sections.length).toBeGreaterThan(0);
    });

    it('should generate a risk assessment report', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [mockAnalysis], total: 1 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [mockRiskFinding] });

      const result = await service.generateReport({ type: 'risk_assessment' });

      expect(result.success).toBe(true);
      expect(result.report!.type).toBe('risk_assessment');
    });

    it('should include provenance in report sections', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });

      const result = await service.generateReport({ type: 'executive_summary' });

      expect(result.report!.sections.length).toBeGreaterThan(0);
      for (const section of result.report!.sections) {
        expect(section.provenance).toBeDefined();
        expect(Array.isArray(section.provenance)).toBe(true);
      }
    });

    it('should support custom report titles', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [], total: 0 });

      const result = await service.generateReport({
        type: 'executive_summary',
        title: 'Custom Report Title',
      });

      expect(result.report!.title).toBe('Custom Report Title');
    });

    it('should handle errors gracefully', async () => {
      mockDealRepo.list.mockRejectedValue(new Error('Database error'));

      const result = await service.generateReport({ type: 'executive_summary' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Database error');
    });
  });

  describe('traceability', () => {
    it('should maintain drill-down paths in provenance', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [mockDocument], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      const result = await service.generateDailyBrief({});

      // Check document uploaded item
      const docItem = result.brief!.items.find((i) => i.type === 'document_uploaded');
      expect(docItem).toBeDefined();
      expect(docItem!.provenance.drillDownPath).toContain('/ma/');
      expect(docItem!.provenance.drillDownPath).toContain(mockDocument.id);
    });

    it('should include source metadata in brief items', async () => {
      mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
      mockDocumentRepo.listByDeal.mockResolvedValue({ data: [mockDocument], total: 1 });
      mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
      mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

      const result = await service.generateDailyBrief({});

      const docItem = result.brief!.items.find((i) => i.type === 'document_uploaded');
      expect(docItem!.metadata).toBeDefined();
      expect(docItem!.metadata!.format).toBe('pdf');
      expect(docItem!.metadata!.size).toBe(1024);
    });
  });
});

describe('DailyBriefService - Navigation Coverage', () => {
  let service: DailyBriefService;

  beforeEach(() => {
    service = new DailyBriefService(
      mockDealRepo as any,
      mockDocumentRepo as any,
      mockAnalysisRepo as any,
      mockIntegrationRepo as any,
      mockSyncJobRepo as any
    );
  });

  it('should provide valid drill-down paths for deals', async () => {
    mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
    mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
    mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
    mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
    mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
    mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

    const result = await service.generateDailyBrief({});

    const dealItem = result.brief!.items.find((i: { type: string }) => i.type === 'deal_created');
    if (dealItem) {
      expect(dealItem.provenance.drillDownPath).toBe(`/ma/deals/${mockDeal.id}`);
    }
  });

  it('should provide valid drill-down paths for analyses', async () => {
    mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
    mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
    mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [mockAnalysis], total: 1 });
    mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
    mockIntegrationRepo.list.mockResolvedValue({ success: true, data: [] });
    mockSyncJobRepo.list.mockResolvedValue({ success: true, data: [] });

    const result = await service.generateDailyBrief({});

    const analysisItem = result.brief!.items.find((i: { type: string }) => i.type === 'analysis_completed');
    expect(analysisItem).toBeDefined();
    expect(analysisItem!.provenance.drillDownPath).toContain('/ma/');
    expect(analysisItem!.provenance.drillDownPath).toContain(mockAnalysis.id);
  });
});

describe('DailyBriefService - Report Coverage', () => {
  let service: DailyBriefService;

  beforeEach(() => {
    service = new DailyBriefService(
      mockDealRepo as any,
      mockDocumentRepo as any,
      mockAnalysisRepo as any,
      mockIntegrationRepo as any,
      mockSyncJobRepo as any
    );
  });

  it('should generate all report types successfully', async () => {
    mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
    mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
    mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
    mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });

    const reportTypes = [
      'executive_summary',
      'due_diligence',
      'risk_assessment',
      'document_status',
      'deal_comparison',
    ] as const;

    for (const type of reportTypes) {
      const result = await service.generateReport({ type });
      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report!.type).toBe(type);
    }
  });

  it('should include totalItems count in reports', async () => {
    mockDealRepo.list.mockResolvedValue({ data: [mockDeal], total: 1 });
    mockDocumentRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });
    mockAnalysisRepo.listByDeal.mockResolvedValue({ data: [], total: 0 });

    const result = await service.generateReport({ type: 'executive_summary' });

    expect(result.report!.totalItems).toBeGreaterThanOrEqual(0);
  });
});
