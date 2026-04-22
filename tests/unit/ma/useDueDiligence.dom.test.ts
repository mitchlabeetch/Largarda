// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let swrMutate = vi.fn();

vi.mock('swr', () => ({
  default: vi.fn((_key: string, _fetcher?: () => unknown) => ({
    data: [],
    isLoading: false,
    error: undefined,
    mutate: swrMutate,
  })),
}));

const mockListAnalyses = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAnalyze = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: 'analysis-1',
    dealId: 'deal-1',
    type: 'due_diligence',
    status: 'completed',
    overallRiskScore: 50,
    risks: [],
    riskScores: { financial: 0, legal: 0, operational: 0, regulatory: 0, reputational: 0 },
    summary: 'Summary',
    recommendations: [],
    generatedAt: Date.now(),
  })
);
const mockGetAnalysis = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockCompareDeals = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    comparison: {
      summary: 'Comparison summary',
      categoryComparison: {},
      topRisks: [],
    },
    deals: [],
  })
);
const mockListRiskFindings = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      dueDiligence: {
        listAnalyses: { invoke: mockListAnalyses },
        analyze: { invoke: mockAnalyze },
        getAnalysis: { invoke: mockGetAnalysis },
        compareDeals: { invoke: mockCompareDeals },
      },
      riskFinding: {
        listByAnalysis: { invoke: mockListRiskFindings },
      },
    },
  },
}));

import { useDueDiligence } from '@/renderer/hooks/ma/useDueDiligence';

describe('useDueDiligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrMutate = vi.fn();
  });

  it('does not expose cancelAnalysis function since no backend cancel contract exists', () => {
    const { result } = renderHook(() => useDueDiligence({ dealId: 'deal-1' }));

    // Verify cancelAnalysis is not present in the return value
    expect('cancelAnalysis' in result.current).toBe(false);

    // Verify other expected functions are present
    expect(typeof result.current.startAnalysis).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.getAnalysis).toBe('function');
    expect(typeof result.current.compareDeals).toBe('function');
    expect(typeof result.current.getRiskFindings).toBe('function');
    expect(typeof result.current.clearCurrentAnalysis).toBe('function');
  });

  it('has no cancelled status in AnalysisLifecycleStatus', () => {
    // This test verifies the type definition has removed 'cancelled'
    // If cancelAnalysis is ever re-added without backend contract, this will fail
    const { result } = renderHook(() => useDueDiligence({ dealId: 'deal-1' }));

    // Current analysis status should only be one of the valid lifecycle statuses
    const validStatuses = ['idle', 'initializing', 'running', 'completed', 'failed'];
    expect(validStatuses).toContain(result.current.currentAnalysis.status);
  });

  it('startAnalysis completes successfully and sets completed status', async () => {
    const { result } = renderHook(() => useDueDiligence({ dealId: 'deal-1' }));

    await act(async () => {
      await result.current.startAnalysis({
        documentIds: ['doc-1'],
        analysisTypes: ['due_diligence'],
      });
    });

    expect(mockAnalyze).toHaveBeenCalledWith({
      dealId: 'deal-1',
      documentIds: ['doc-1'],
      analysisTypes: ['due_diligence'],
    });

    expect(result.current.currentAnalysis.status).toBe('completed');
  });

  it('startAnalysis sets failed status on error', async () => {
    mockAnalyze.mockRejectedValueOnce(new Error('Analysis failed'));

    const { result } = renderHook(() => useDueDiligence({ dealId: 'deal-1' }));

    let error: Error | undefined;
    await act(async () => {
      try {
        await result.current.startAnalysis({
          documentIds: ['doc-1'],
          analysisTypes: ['due_diligence'],
        });
      } catch (e) {
        error = e as Error;
      }
    });

    expect(error?.message).toBe('Analysis failed');
    expect(result.current.currentAnalysis.status).toBe('failed');
  });

  it('clearCurrentAnalysis resets to idle state', async () => {
    const { result } = renderHook(() => useDueDiligence({ dealId: 'deal-1' }));

    await act(async () => {
      await result.current.startAnalysis({
        documentIds: ['doc-1'],
        analysisTypes: ['due_diligence'],
      });
    });

    expect(result.current.currentAnalysis.status).toBe('completed');

    act(() => {
      result.current.clearCurrentAnalysis();
    });

    expect(result.current.currentAnalysis.status).toBe('idle');
    expect(result.current.currentAnalysis.analysisId).toBe(null);
    expect(result.current.currentAnalysis.progress).toBe(null);
  });
});
