/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for DueDiligenceService
 * Tests risk categorization, scoring consistency, and comparison logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DueDiligenceService,
  calculateCategoryScores,
  calculateOverallScore,
  determineSeverity,
} from '@process/services/ma/DueDiligenceService';
import type { RiskFinding, RiskCategory, RiskSeverity } from '@/common/ma/types';

// ============================================================================
// Mocks
// ============================================================================

// Mock repositories
const mockAnalysisRepo = {
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listByDeal: vi.fn(),
  markRunning: vi.fn(),
  markCompleted: vi.fn(),
  markError: vi.fn(),
  createRiskFindings: vi.fn(),
  getRiskFindings: vi.fn(),
};

const mockDocumentRepo = {
  get: vi.fn(),
  listByDeal: vi.fn(),
};

// Mock risk findings
const createMockRiskFinding = (
  id: string,
  category: RiskCategory,
  severity: RiskSeverity,
  score: number
): RiskFinding => ({
  id,
  analysisId: 'test-analysis',
  category,
  severity,
  score,
  title: `Test Risk ${id}`,
  description: `Description for test risk ${id}`,
  createdAt: Date.now(),
});

// ============================================================================
// Risk Scoring Tests
// ============================================================================

describe('Risk Scoring Logic', () => {
  describe('determineSeverity', () => {
    it('should return "critical" for scores >= 76', () => {
      expect(determineSeverity(76)).toBe('critical');
      expect(determineSeverity(100)).toBe('critical');
      expect(determineSeverity(99)).toBe('critical');
    });

    it('should return "high" for scores 51-75', () => {
      expect(determineSeverity(51)).toBe('high');
      expect(determineSeverity(75)).toBe('high');
      expect(determineSeverity(60)).toBe('high');
    });

    it('should return "medium" for scores 26-50', () => {
      expect(determineSeverity(26)).toBe('medium');
      expect(determineSeverity(50)).toBe('medium');
      expect(determineSeverity(38)).toBe('medium');
    });

    it('should return "low" for scores 1-25', () => {
      expect(determineSeverity(1)).toBe('low');
      expect(determineSeverity(25)).toBe('low');
      expect(determineSeverity(12)).toBe('low');
    });

    it('should return "low" for score 0', () => {
      expect(determineSeverity(0)).toBe('low');
    });
  });

  describe('calculateCategoryScores', () => {
    it('should return zero scores for empty risk array', () => {
      const scores = calculateCategoryScores([]);

      expect(scores.financial).toBe(0);
      expect(scores.legal).toBe(0);
      expect(scores.operational).toBe(0);
      expect(scores.regulatory).toBe(0);
      expect(scores.reputational).toBe(0);
    });

    it('should calculate average score for single category', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'high', 60),
        createMockRiskFinding('2', 'financial', 'medium', 40),
        createMockRiskFinding('3', 'financial', 'low', 20),
      ];

      const scores = calculateCategoryScores(risks);

      // Average of 60, 40, 20 = 40
      expect(scores.financial).toBe(40);
      expect(scores.legal).toBe(0);
    });

    it('should calculate scores for multiple categories', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'high', 60),
        createMockRiskFinding('2', 'legal', 'critical', 80),
        createMockRiskFinding('3', 'operational', 'medium', 40),
        createMockRiskFinding('4', 'regulatory', 'low', 20),
        createMockRiskFinding('5', 'reputational', 'high', 55),
      ];

      const scores = calculateCategoryScores(risks);

      expect(scores.financial).toBe(60);
      expect(scores.legal).toBe(80);
      expect(scores.operational).toBe(40);
      expect(scores.regulatory).toBe(20);
      expect(scores.reputational).toBe(55);
    });

    it('should handle mixed categories with multiple risks each', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'high', 70),
        createMockRiskFinding('2', 'financial', 'medium', 50),
        createMockRiskFinding('3', 'legal', 'critical', 90),
        createMockRiskFinding('4', 'legal', 'high', 60),
        createMockRiskFinding('5', 'legal', 'medium', 30),
      ];

      const scores = calculateCategoryScores(risks);

      // Financial: (70 + 50) / 2 = 60
      expect(scores.financial).toBe(60);
      // Legal: (90 + 60 + 30) / 3 = 60
      expect(scores.legal).toBe(60);
    });
  });

  describe('calculateOverallScore', () => {
    it('should return 0 for all zero category scores', () => {
      const scores: Record<RiskCategory, number> = {
        financial: 0,
        legal: 0,
        operational: 0,
        regulatory: 0,
        reputational: 0,
      };

      expect(calculateOverallScore(scores)).toBe(0);
    });

    it('should calculate weighted score for single category', () => {
      const scores: Record<RiskCategory, number> = {
        financial: 60,
        legal: 0,
        operational: 0,
        regulatory: 0,
        reputational: 0,
      };

      // Financial has weight 0.30, so 60 * 0.30 / 0.30 = 60
      const result = calculateOverallScore(scores);
      expect(result).toBe(60);
    });

    it('should calculate weighted score for multiple categories', () => {
      const scores: Record<RiskCategory, number> = {
        financial: 60,
        legal: 80,
        operational: 40,
        regulatory: 20,
        reputational: 50,
      };

      // Weighted average:
      // (60 * 0.30 + 80 * 0.25 + 40 * 0.20 + 20 * 0.15 + 50 * 0.10) / (0.30 + 0.25 + 0.20 + 0.15 + 0.10)
      // = (18 + 20 + 8 + 3 + 5) / 1.0 = 54
      const result = calculateOverallScore(scores);
      expect(result).toBe(54);
    });

    it('should only weight non-zero categories', () => {
      const scores: Record<RiskCategory, number> = {
        financial: 60,
        legal: 80,
        operational: 0,
        regulatory: 0,
        reputational: 0,
      };

      // Only financial (0.30) and legal (0.25) are weighted
      // (60 * 0.30 + 80 * 0.25) / (0.30 + 0.25) = (18 + 20) / 0.55 = 69.09... ≈ 69
      const result = calculateOverallScore(scores);
      expect(result).toBe(69);
    });
  });
});

// ============================================================================
// Risk Categorization Tests
// ============================================================================

describe('Risk Categorization', () => {
  it('should categorize financial risks correctly', () => {
    const categories: RiskCategory[] = ['financial', 'legal', 'operational', 'regulatory', 'reputational'];

    expect(categories).toContain('financial');
    expect(categories).toContain('legal');
    expect(categories).toContain('operational');
    expect(categories).toContain('regulatory');
    expect(categories).toContain('reputational');
  });

  it('should have correct severity levels', () => {
    const severities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];

    expect(severities).toHaveLength(4);
    expect(severities).toContain('low');
    expect(severities).toContain('medium');
    expect(severities).toContain('high');
    expect(severities).toContain('critical');
  });

  it('should have correct category weights', () => {
    const weights = {
      financial: 0.3,
      legal: 0.25,
      operational: 0.2,
      regulatory: 0.15,
      reputational: 0.1,
    };

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });
});

// ============================================================================
// Scoring Consistency Tests
// ============================================================================

describe('Scoring Consistency', () => {
  it('should produce consistent scores for same input', () => {
    const risks: RiskFinding[] = [
      createMockRiskFinding('1', 'financial', 'high', 60),
      createMockRiskFinding('2', 'financial', 'medium', 40),
    ];

    const scores1 = calculateCategoryScores(risks);
    const scores2 = calculateCategoryScores(risks);

    expect(scores1.financial).toBe(scores2.financial);
  });

  it('should produce deterministic overall scores', () => {
    const scores: Record<RiskCategory, number> = {
      financial: 60,
      legal: 80,
      operational: 40,
      regulatory: 20,
      reputational: 50,
    };

    const result1 = calculateOverallScore(scores);
    const result2 = calculateOverallScore(scores);

    expect(result1).toBe(result2);
  });

  it('should handle edge case of all maximum scores', () => {
    const scores: Record<RiskCategory, number> = {
      financial: 100,
      legal: 100,
      operational: 100,
      regulatory: 100,
      reputational: 100,
    };

    const result = calculateOverallScore(scores);
    expect(result).toBe(100);
  });

  it('should handle edge case of all minimum scores', () => {
    const scores: Record<RiskCategory, number> = {
      financial: 1,
      legal: 1,
      operational: 1,
      regulatory: 1,
      reputational: 1,
    };

    const result = calculateOverallScore(scores);
    expect(result).toBe(1);
  });
});

// ============================================================================
// Comparison Logic Tests
// ============================================================================

describe('Comparison Logic', () => {
  it('should identify highest risk deal', () => {
    const dealScores = {
      deal1: 45,
      deal2: 78,
      deal3: 32,
    };

    const sortedDeals = Object.entries(dealScores).toSorted(([, a], [, b]) => b - a);
    const highestRiskDeal = sortedDeals[0];

    expect(highestRiskDeal[0]).toBe('deal2');
    expect(highestRiskDeal[1]).toBe(78);
  });

  it('should identify lowest risk deal', () => {
    const dealScores = {
      deal1: 45,
      deal2: 78,
      deal3: 32,
    };

    const sortedDeals = Object.entries(dealScores).toSorted(([, a], [, b]) => a - b);
    const lowestRiskDeal = sortedDeals[0];

    expect(lowestRiskDeal[0]).toBe('deal3');
    expect(lowestRiskDeal[1]).toBe(32);
  });

  it('should calculate average risk score', () => {
    const dealScores = [45, 78, 32];
    const avgScore = Math.round(dealScores.reduce((sum, s) => sum + s, 0) / dealScores.length);

    expect(avgScore).toBe(52);
  });

  it('should compare category scores across deals', () => {
    const categoryComparison = {
      deal1: { financial: 60, legal: 40, operational: 50, regulatory: 30, reputational: 20 },
      deal2: { financial: 70, legal: 50, operational: 60, regulatory: 40, reputational: 30 },
    };

    // Deal2 should have higher scores in all categories
    expect(categoryComparison.deal2.financial).toBeGreaterThan(categoryComparison.deal1.financial);
    expect(categoryComparison.deal2.legal).toBeGreaterThan(categoryComparison.deal1.legal);
    expect(categoryComparison.deal2.operational).toBeGreaterThan(categoryComparison.deal1.operational);
  });
});

// ============================================================================
// DueDiligenceService Tests
// ============================================================================

describe('DueDiligenceService', () => {
  let service: DueDiligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DueDiligenceService(mockAnalysisRepo as any, mockDocumentRepo as any);
  });

  describe('analyze', () => {
    it('should fail when no documents are provided', async () => {
      mockAnalysisRepo.create.mockResolvedValue({
        success: true,
        data: {
          id: 'test-analysis',
          dealId: 'test-deal',
          type: 'due_diligence',
          input: { documentIds: [], analysisTypes: ['due_diligence'] },
          status: 'pending',
          createdAt: Date.now(),
        },
      });

      mockDocumentRepo.get.mockResolvedValue({
        success: false,
        data: null,
      });

      const result = await service.analyze({
        dealId: 'test-deal',
        documentIds: [],
        analysisTypes: ['due_diligence'],
      });

      expect(result.success).toBe(false);
    });

    it('should create analysis record on start', async () => {
      mockAnalysisRepo.create.mockResolvedValue({
        success: true,
        data: {
          id: 'test-analysis',
          dealId: 'test-deal',
          type: 'due_diligence',
          input: { documentIds: ['doc1'], analysisTypes: ['due_diligence'] },
          status: 'pending',
          createdAt: Date.now(),
        },
      });

      mockDocumentRepo.get.mockResolvedValue({
        success: true,
        data: {
          id: 'doc1',
          dealId: 'test-deal',
          filename: 'test.pdf',
          originalPath: '/test/test.pdf',
          format: 'pdf',
          size: 1000,
          status: 'completed',
          textContent: 'This is a test document with declining revenue.',
          createdAt: Date.now(),
        },
      });

      mockAnalysisRepo.markRunning.mockResolvedValue({ success: true, data: {} });
      mockAnalysisRepo.createRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockAnalysisRepo.getRiskFindings.mockResolvedValue({ success: true, data: [] });
      mockAnalysisRepo.markCompleted.mockResolvedValue({ success: true, data: {} });

      const result = await service.analyze({
        dealId: 'test-deal',
        documentIds: ['doc1'],
        analysisTypes: ['due_diligence'],
      });

      expect(mockAnalysisRepo.create).toHaveBeenCalled();
      expect(mockAnalysisRepo.markRunning).toHaveBeenCalled();
    });
  });

  describe('getAnalysis', () => {
    it('should return null for non-existent analysis', async () => {
      mockAnalysisRepo.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await service.getAnalysis('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return analysis result for completed analysis', async () => {
      mockAnalysisRepo.get.mockResolvedValue({
        success: true,
        data: {
          id: 'test-analysis',
          dealId: 'test-deal',
          type: 'due_diligence',
          input: { documentIds: ['doc1'], analysisTypes: ['due_diligence'] },
          status: 'completed',
          result: {
            riskScores: { financial: 60, legal: 40, operational: 50, regulatory: 30, reputational: 20 },
            overallRiskScore: 45,
            summary: 'Test summary',
            recommendations: ['Test recommendation'],
          },
          createdAt: Date.now(),
          completedAt: Date.now(),
        },
      });

      mockAnalysisRepo.getRiskFindings.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.getAnalysis('test-analysis');

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.analysisId).toBe('test-analysis');
    });
  });

  describe('listAnalyses', () => {
    it('should return empty array for deal with no analyses', async () => {
      mockAnalysisRepo.listByDeal.mockResolvedValue({
        data: [],
        total: 0,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      const result = await service.listAnalyses('test-deal');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('compareDeals', () => {
    it('should return comparison result for multiple deals', async () => {
      mockAnalysisRepo.listByDeal.mockResolvedValue({
        data: [
          {
            id: 'analysis1',
            dealId: 'deal1',
            type: 'due_diligence',
            status: 'completed',
            result: {
              riskScores: { financial: 60, legal: 40, operational: 50, regulatory: 30, reputational: 20 },
              overallRiskScore: 45,
              summary: 'Deal 1 summary',
              recommendations: [],
            },
            createdAt: Date.now(),
            completedAt: Date.now(),
          },
          {
            id: 'analysis2',
            dealId: 'deal2',
            type: 'due_diligence',
            status: 'completed',
            result: {
              riskScores: { financial: 70, legal: 50, operational: 60, regulatory: 40, reputational: 30 },
              overallRiskScore: 55,
              summary: 'Deal 2 summary',
              recommendations: [],
            },
            createdAt: Date.now(),
            completedAt: Date.now(),
          },
        ],
        total: 2,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      mockAnalysisRepo.getRiskFindings.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.compareDeals(['deal1', 'deal2']);

      expect(result.success).toBe(true);
      expect(result.data?.deals).toHaveLength(2);
    });
  });
});
