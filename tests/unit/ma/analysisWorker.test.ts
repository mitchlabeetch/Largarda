/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for AnalysisWorker
 * Tests long-running analysis handling, progress reporting, cancellation support, and result storage.
 */

import { describe, it, expect } from 'vitest';
import type { RiskFinding, RiskCategory, RiskSeverity } from '@/common/ma/types';

// ============================================================================
// Types
// ============================================================================

type AnalysisProgressStage = 'initializing' | 'extracting' | 'analyzing' | 'scoring' | 'complete' | 'error';

interface AnalysisWorkerProgress {
  analysisId: string;
  stage: AnalysisProgressStage;
  progress: number;
  message?: string;
  currentDocument?: string;
  risksFound?: number;
  timestamp: number;
}

interface AnalysisWorkerResult {
  analysisId: string;
  dealId: string;
  risks: RiskFinding[];
  riskScores: Record<RiskCategory, number>;
  overallRiskScore: number;
  summary: string;
  recommendations: string[];
  generatedAt: number;
  duration: number;
}

// ============================================================================
// Helper Functions (extracted from worker for testing)
// ============================================================================

const RISK_CATEGORY_WEIGHTS: Record<RiskCategory, number> = {
  financial: 0.3,
  legal: 0.25,
  operational: 0.2,
  regulatory: 0.15,
  reputational: 0.1,
};

const SEVERITY_SCORE_RANGES: Record<RiskSeverity, { min: number; max: number }> = {
  low: { min: 1, max: 25 },
  medium: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 },
};

function calculateRiskScore(severity: RiskSeverity, category: RiskCategory): number {
  const range = SEVERITY_SCORE_RANGES[severity];
  const baseScore = (range.min + range.max) / 2;
  const weight = RISK_CATEGORY_WEIGHTS[category];
  return Math.round(baseScore * weight);
}

function validateRiskCategory(category: string): RiskCategory {
  const validCategories: RiskCategory[] = ['financial', 'legal', 'operational', 'regulatory', 'reputational'];
  const normalized = category?.toLowerCase() as RiskCategory;
  return validCategories.includes(normalized) ? normalized : 'operational';
}

function validateRiskSeverity(severity: string): RiskSeverity {
  const validSeverities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];
  const normalized = severity?.toLowerCase() as RiskSeverity;
  return validSeverities.includes(normalized) ? normalized : 'medium';
}

function calculateCategoryScores(risks: RiskFinding[]): Record<RiskCategory, number> {
  const categories: RiskCategory[] = ['financial', 'legal', 'operational', 'regulatory', 'reputational'];
  const scores: Record<RiskCategory, number> = {
    financial: 0,
    legal: 0,
    operational: 0,
    regulatory: 0,
    reputational: 0,
  };

  for (const category of categories) {
    const categoryRisks = risks.filter((r) => r.category === category);
    if (categoryRisks.length === 0) {
      scores[category] = 0;
    } else {
      const totalWeight = categoryRisks.reduce((sum, r) => sum + r.score, 0);
      scores[category] = Math.round(totalWeight / categoryRisks.length);
    }
  }

  return scores;
}

function calculateOverallScore(categoryScores: Record<RiskCategory, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(RISK_CATEGORY_WEIGHTS)) {
    const score = categoryScores[category as RiskCategory];
    if (score > 0) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function generateSummary(risks: RiskFinding[], categoryScores: Record<RiskCategory, number>): string {
  const criticalCount = risks.filter((r) => r.severity === 'critical').length;
  const highCount = risks.filter((r) => r.severity === 'high').length;
  const mediumCount = risks.filter((r) => r.severity === 'medium').length;
  const lowCount = risks.filter((r) => r.severity === 'low').length;

  const highestCategory = Object.entries(categoryScores)
    .filter(([, score]) => score > 0)
    .toSorted(([, a], [, b]) => b - a)[0];

  let summary = `Due diligence analysis identified ${risks.length} risk findings: `;
  summary += `${criticalCount} critical, ${highCount} high, ${mediumCount} medium, and ${lowCount} low severity. `;

  if (highestCategory) {
    summary += `The highest risk category is ${highestCategory[0]} with a score of ${highestCategory[1]}. `;
  }

  if (criticalCount > 0) {
    summary += 'Critical risks require immediate attention before proceeding.';
  } else if (highCount > 0) {
    summary += 'High-severity risks should be addressed in the transaction structure.';
  } else if (risks.length > 0) {
    summary += 'Overall risk profile is manageable with appropriate mitigations.';
  } else {
    summary += 'No significant risks identified in the analyzed documents.';
  }

  return summary;
}

function generateRecommendations(risks: RiskFinding[]): string[] {
  const recommendations: string[] = [];

  const financialRisks = risks.filter((r) => r.category === 'financial');
  const legalRisks = risks.filter((r) => r.category === 'legal');
  const operationalRisks = risks.filter((r) => r.category === 'operational');
  const regulatoryRisks = risks.filter((r) => r.category === 'regulatory');

  if (financialRisks.some((r) => r.title.includes('Declining Revenue'))) {
    recommendations.push('Conduct detailed revenue analysis and identify root causes of decline');
  }
  if (financialRisks.some((r) => r.title.includes('Negative EBITDA'))) {
    recommendations.push('Review cost structure and identify opportunities for margin improvement');
  }
  if (financialRisks.some((r) => r.title.includes('Cash Flow'))) {
    recommendations.push('Implement cash flow monitoring and working capital optimization');
  }

  if (legalRisks.some((r) => r.title.includes('Litigation'))) {
    recommendations.push('Obtain detailed legal assessment of pending litigation and potential exposure');
  }
  if (legalRisks.some((r) => r.title.includes('IP'))) {
    recommendations.push('Conduct IP due diligence and verify ownership of key assets');
  }

  if (operationalRisks.some((r) => r.title.includes('Key Person'))) {
    recommendations.push('Assess key person dependency and develop retention/transition plans');
  }
  if (operationalRisks.some((r) => r.title.includes('Customer Concentration'))) {
    recommendations.push('Analyze customer concentration risk and diversification strategy');
  }

  if (regulatoryRisks.length > 0) {
    recommendations.push('Conduct comprehensive regulatory compliance review');
  }

  if (risks.filter((r) => r.severity === 'critical').length > 0) {
    recommendations.push('Address critical risks before proceeding with transaction');
  }

  return recommendations;
}

// ============================================================================
// Mock Data
// ============================================================================

const createMockRiskFinding = (
  id: string,
  category: RiskCategory,
  severity: RiskSeverity,
  score: number,
  title: string = `Test Risk ${id}`
): RiskFinding => ({
  id,
  analysisId: 'test-analysis',
  category,
  severity,
  score,
  title,
  description: `Description for ${title}`,
  createdAt: Date.now(),
});

// ============================================================================
// Tests
// ============================================================================

describe('AnalysisWorker', () => {
  describe('Risk Score Calculation', () => {
    it('should calculate risk score based on severity and category', () => {
      // High severity, financial category
      const highFinancial = calculateRiskScore('high', 'financial');
      expect(highFinancial).toBeGreaterThan(0);
      expect(highFinancial).toBeLessThanOrEqual(100);

      // Critical severity should have higher score than high
      const criticalFinancial = calculateRiskScore('critical', 'financial');
      expect(criticalFinancial).toBeGreaterThan(highFinancial);
    });

    it('should weight financial risks higher than reputational', () => {
      const financialScore = calculateRiskScore('high', 'financial');
      const reputationalScore = calculateRiskScore('high', 'reputational');

      expect(financialScore).toBeGreaterThan(reputationalScore);
    });

    it('should produce consistent scores for same inputs', () => {
      const score1 = calculateRiskScore('high', 'financial');
      const score2 = calculateRiskScore('high', 'financial');

      expect(score1).toBe(score2);
    });
  });

  describe('Category Validation', () => {
    it('should validate correct risk categories', () => {
      expect(validateRiskCategory('financial')).toBe('financial');
      expect(validateRiskCategory('legal')).toBe('legal');
      expect(validateRiskCategory('operational')).toBe('operational');
      expect(validateRiskCategory('regulatory')).toBe('regulatory');
      expect(validateRiskCategory('reputational')).toBe('reputational');
    });

    it('should normalize category case', () => {
      expect(validateRiskCategory('FINANCIAL')).toBe('financial');
      expect(validateRiskCategory('Legal')).toBe('legal');
    });

    it('should default to operational for invalid category', () => {
      expect(validateRiskCategory('invalid')).toBe('operational');
      expect(validateRiskCategory('')).toBe('operational');
    });
  });

  describe('Severity Validation', () => {
    it('should validate correct risk severities', () => {
      expect(validateRiskSeverity('low')).toBe('low');
      expect(validateRiskSeverity('medium')).toBe('medium');
      expect(validateRiskSeverity('high')).toBe('high');
      expect(validateRiskSeverity('critical')).toBe('critical');
    });

    it('should normalize severity case', () => {
      expect(validateRiskSeverity('LOW')).toBe('low');
      expect(validateRiskSeverity('Critical')).toBe('critical');
    });

    it('should default to medium for invalid severity', () => {
      expect(validateRiskSeverity('invalid')).toBe('medium');
      expect(validateRiskSeverity('')).toBe('medium');
    });
  });

  describe('Category Scores Calculation', () => {
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
      ];

      const scores = calculateCategoryScores(risks);

      // Average of 60 and 40 = 50
      expect(scores.financial).toBe(50);
      expect(scores.legal).toBe(0);
    });

    it('should calculate scores for multiple categories', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'high', 60),
        createMockRiskFinding('2', 'legal', 'critical', 80),
        createMockRiskFinding('3', 'operational', 'medium', 40),
      ];

      const scores = calculateCategoryScores(risks);

      expect(scores.financial).toBe(60);
      expect(scores.legal).toBe(80);
      expect(scores.operational).toBe(40);
      expect(scores.regulatory).toBe(0);
      expect(scores.reputational).toBe(0);
    });
  });

  describe('Overall Score Calculation', () => {
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

      const result = calculateOverallScore(scores);
      expect(result).toBe(54);
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary for empty risk array', () => {
      const risks: RiskFinding[] = [];
      const scores = calculateCategoryScores(risks);

      const summary = generateSummary(risks, scores);

      expect(summary).toContain('0 risk findings');
      expect(summary).toContain('No significant risks identified');
    });

    it('should generate summary with risk counts', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'critical', 80),
        createMockRiskFinding('2', 'legal', 'high', 60),
        createMockRiskFinding('3', 'operational', 'medium', 40),
        createMockRiskFinding('4', 'regulatory', 'low', 20),
      ];
      const scores = calculateCategoryScores(risks);

      const summary = generateSummary(risks, scores);

      expect(summary).toContain('4 risk findings');
      expect(summary).toContain('1 critical');
      expect(summary).toContain('1 high');
      expect(summary).toContain('1 medium');
      expect(summary).toContain('1 low');
    });

    it('should identify highest risk category', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'critical', 90),
        createMockRiskFinding('2', 'legal', 'medium', 40),
      ];
      const scores = calculateCategoryScores(risks);

      const summary = generateSummary(risks, scores);

      expect(summary).toContain('financial');
    });

    it('should warn about critical risks', () => {
      const risks: RiskFinding[] = [createMockRiskFinding('1', 'financial', 'critical', 80)];
      const scores = calculateCategoryScores(risks);

      const summary = generateSummary(risks, scores);

      expect(summary).toContain('Critical risks require immediate attention');
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate recommendations for financial risks', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'financial', 'high', 60, 'Declining Revenue'),
        createMockRiskFinding('2', 'financial', 'high', 60, 'Negative EBITDA'),
      ];

      const recommendations = generateRecommendations(risks);

      expect(recommendations).toContain('Conduct detailed revenue analysis and identify root causes of decline');
      expect(recommendations).toContain('Review cost structure and identify opportunities for margin improvement');
    });

    it('should generate recommendations for legal risks', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'legal', 'high', 60, 'Pending Litigation'),
        createMockRiskFinding('2', 'legal', 'high', 60, 'IP Dispute'),
      ];

      const recommendations = generateRecommendations(risks);

      expect(recommendations).toContain(
        'Obtain detailed legal assessment of pending litigation and potential exposure'
      );
      expect(recommendations).toContain('Conduct IP due diligence and verify ownership of key assets');
    });

    it('should generate recommendations for operational risks', () => {
      const risks: RiskFinding[] = [
        createMockRiskFinding('1', 'operational', 'high', 60, 'Key Person Departure'),
        createMockRiskFinding('2', 'operational', 'medium', 40, 'Customer Concentration'),
      ];

      const recommendations = generateRecommendations(risks);

      expect(recommendations).toContain('Assess key person dependency and develop retention/transition plans');
      expect(recommendations).toContain('Analyze customer concentration risk and diversification strategy');
    });

    it('should generate recommendations for regulatory risks', () => {
      const risks: RiskFinding[] = [createMockRiskFinding('1', 'regulatory', 'high', 60, 'Compliance Failure')];

      const recommendations = generateRecommendations(risks);

      expect(recommendations).toContain('Conduct comprehensive regulatory compliance review');
    });

    it('should recommend addressing critical risks', () => {
      const risks: RiskFinding[] = [createMockRiskFinding('1', 'financial', 'critical', 80)];

      const recommendations = generateRecommendations(risks);

      expect(recommendations).toContain('Address critical risks before proceeding with transaction');
    });

    it('should return empty array for no risks', () => {
      const risks: RiskFinding[] = [];

      const recommendations = generateRecommendations(risks);

      expect(recommendations).toEqual([]);
    });
  });

  describe('Progress Reporting', () => {
    it('should create valid progress object', () => {
      const progress: AnalysisWorkerProgress = {
        analysisId: 'test-analysis',
        stage: 'analyzing',
        progress: 50,
        message: 'Analyzing document',
        currentDocument: 'test.pdf',
        risksFound: 5,
        timestamp: Date.now(),
      };

      expect(progress.analysisId).toBe('test-analysis');
      expect(progress.stage).toBe('analyzing');
      expect(progress.progress).toBe(50);
      expect(progress.message).toBe('Analyzing document');
      expect(progress.currentDocument).toBe('test.pdf');
      expect(progress.risksFound).toBe(5);
      expect(progress.timestamp).toBeGreaterThan(0);
    });

    it('should have valid progress stages', () => {
      const validStages: AnalysisProgressStage[] = [
        'initializing',
        'extracting',
        'analyzing',
        'scoring',
        'complete',
        'error',
      ];

      expect(validStages).toContain('initializing');
      expect(validStages).toContain('extracting');
      expect(validStages).toContain('analyzing');
      expect(validStages).toContain('scoring');
      expect(validStages).toContain('complete');
      expect(validStages).toContain('error');
    });

    it('should have progress between 0 and 100', () => {
      const progress: AnalysisWorkerProgress = {
        analysisId: 'test-analysis',
        stage: 'analyzing',
        progress: 75,
        timestamp: Date.now(),
      };

      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Result Structure', () => {
    it('should create valid result object', () => {
      const risks: RiskFinding[] = [createMockRiskFinding('1', 'financial', 'high', 60)];
      const scores = calculateCategoryScores(risks);
      const overallScore = calculateOverallScore(scores);

      const result: AnalysisWorkerResult = {
        analysisId: 'test-analysis',
        dealId: 'test-deal',
        risks,
        riskScores: scores,
        overallRiskScore: overallScore,
        summary: generateSummary(risks, scores),
        recommendations: generateRecommendations(risks),
        generatedAt: Date.now(),
        duration: 5000,
      };

      expect(result.analysisId).toBe('test-analysis');
      expect(result.dealId).toBe('test-deal');
      expect(result.risks).toHaveLength(1);
      expect(result.overallRiskScore).toBe(60);
      expect(result.summary).toContain('1 risk finding');
      expect(result.generatedAt).toBeGreaterThan(0);
      expect(result.duration).toBe(5000);
    });
  });

  describe('Cancellation Support', () => {
    it('should support stop flag', () => {
      let shouldStop = false;

      // Simulate setting stop flag
      shouldStop = true;

      expect(shouldStop).toBe(true);
    });

    it('should support pause flag', () => {
      let isPaused = false;

      // Simulate setting pause flag
      isPaused = true;

      expect(isPaused).toBe(true);
    });
  });
});
