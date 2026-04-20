/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useDueDiligence Hook
 * Manages due diligence analysis state, execution, progress tracking, and results.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type { RiskCategory, RiskFinding } from '@/common/ma/types';
import type {
  DueDiligenceRequest,
  DueDiligenceResult,
  ComparisonResult,
  AnalysisProgress,
  AnalysisType,
} from '@process/services/ma/DueDiligenceService';

// ============================================================================
// Types
// ============================================================================

export interface UseDueDiligenceOptions {
  /** Deal ID to fetch analyses for */
  dealId?: string;
  /** Whether to auto-refresh analyses */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
}

export interface AnalysisState {
  /** Current analysis ID */
  analysisId: string | null;
  /** Current progress */
  progress: AnalysisProgress | null;
  /** Whether analysis is running */
  isRunning: boolean;
  /** Error if analysis failed */
  error: string | null;
}

export interface UseDueDiligenceReturn {
  /** List of analyses for the deal */
  analyses: DueDiligenceResult[];
  /** Current analysis state */
  currentAnalysis: AnalysisState;
  /** Whether analyses are being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refresh analyses manually */
  refresh: () => void;
  /** Start a new analysis */
  startAnalysis: (request: Omit<DueDiligenceRequest, 'dealId'>) => Promise<DueDiligenceResult>;
  /** Cancel current analysis */
  cancelAnalysis: () => void;
  /** Get a specific analysis */
  getAnalysis: (id: string) => Promise<DueDiligenceResult | null>;
  /** Compare multiple deals */
  compareDeals: (dealIds: string[]) => Promise<ComparisonResult>;
  /** Get risk findings for an analysis */
  getRiskFindings: (analysisId: string) => Promise<RiskFinding[]>;
  /** Get risks by category */
  getRisksByCategory: (analysisId: string, category: RiskCategory) => Promise<RiskFinding[]>;
  /** Get risks by severity */
  getRisksBySeverity: (analysisId: string, severity: string) => Promise<RiskFinding[]>;
  /** Clear current analysis state */
  clearCurrentAnalysis: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

const analysesFetcher = (dealId: string) => ipcBridge.ma.dueDiligence.listAnalyses.invoke({ dealId });

export function useDueDiligence(options: UseDueDiligenceOptions = {}): UseDueDiligenceReturn {
  const { dealId, autoRefresh = true, refreshInterval = 30000 } = options;

  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisState>({
    analysisId: null,
    progress: null,
    isRunning: false,
    error: null,
  });

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch analyses for deal
  const {
    data: analyses = [],
    isLoading,
    error,
    mutate,
  } = useSWR<DueDiligenceResult[]>(dealId ? `ma.dueDiligence.${dealId}` : null, () => analysesFetcher(dealId!), {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    refreshInterval: autoRefresh ? refreshInterval : undefined,
  });

  // Cleanup progress polling on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const startAnalysis = useCallback(
    async (request: Omit<DueDiligenceRequest, 'dealId'>): Promise<DueDiligenceResult> => {
      if (!dealId) {
        throw new Error('No deal ID provided');
      }

      // Reset state
      setCurrentAnalysis({
        analysisId: null,
        progress: {
          analysisId: 'pending',
          stage: 'initializing',
          progress: 0,
          message: 'Starting analysis...',
        },
        isRunning: true,
        error: null,
      });

      try {
        const fullRequest: DueDiligenceRequest = {
          ...request,
          dealId,
        };

        const result = await ipcBridge.ma.dueDiligence.analyze.invoke(fullRequest);

        // Update state with completion
        setCurrentAnalysis({
          analysisId: result.analysisId,
          progress: {
            analysisId: result.analysisId,
            stage: 'complete',
            progress: 100,
            message: 'Analysis complete',
            risksFound: result.risks.length,
          },
          isRunning: false,
          error: null,
        });

        // Refresh analyses list
        mutate();

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        setCurrentAnalysis((prev) => ({
          ...prev,
          progress: {
            analysisId: prev.analysisId ?? 'error',
            stage: 'error',
            progress: 0,
            message: errorMessage,
          },
          isRunning: false,
          error: errorMessage,
        }));

        throw err;
      }
    },
    [dealId, mutate]
  );

  const cancelAnalysis = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setCurrentAnalysis((prev) => ({
      ...prev,
      progress: {
        analysisId: prev.analysisId ?? 'cancelled',
        stage: 'error',
        progress: 0,
        message: 'Analysis cancelled',
      },
      isRunning: false,
      error: 'Analysis cancelled',
    }));
  }, []);

  const getAnalysis = useCallback(async (id: string): Promise<DueDiligenceResult | null> => {
    const result = await ipcBridge.ma.dueDiligence.getAnalysis.invoke({ id });
    return result;
  }, []);

  const compareDeals = useCallback(async (dealIds: string[]): Promise<ComparisonResult> => {
    const result = await ipcBridge.ma.dueDiligence.compareDeals.invoke({ dealIds });
    return result;
  }, []);

  const getRiskFindings = useCallback(async (analysisId: string): Promise<RiskFinding[]> => {
    const result = await ipcBridge.ma.riskFinding.listByAnalysis.invoke({ analysisId });
    return result;
  }, []);

  const getRisksByCategory = useCallback(
    async (analysisId: string, category: RiskCategory): Promise<RiskFinding[]> => {
      const allRisks = await getRiskFindings(analysisId);
      return allRisks.filter((r) => r.category === category);
    },
    [getRiskFindings]
  );

  const getRisksBySeverity = useCallback(
    async (analysisId: string, severity: string): Promise<RiskFinding[]> => {
      const allRisks = await getRiskFindings(analysisId);
      return allRisks.filter((r) => r.severity === severity);
    },
    [getRiskFindings]
  );

  const clearCurrentAnalysis = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setCurrentAnalysis({
      analysisId: null,
      progress: null,
      isRunning: false,
      error: null,
    });
  }, []);

  return {
    analyses,
    currentAnalysis,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error(String(error))) : null,
    refresh,
    startAnalysis,
    cancelAnalysis,
    getAnalysis,
    compareDeals,
    getRiskFindings,
    getRisksByCategory,
    getRisksBySeverity,
    clearCurrentAnalysis,
  };
}

export default useDueDiligence;
