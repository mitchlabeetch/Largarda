/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useDailyBrief Hook
 * React hook for accessing daily brief and reporting data.
 * Part of Wave 10 / Batch 10C.
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type {
  DailyBrief,
  Report,
  GenerateBriefInput,
  GenerateReportInput,
  BriefTimeWindow,
  ReportType,
} from '@/common/ma/types';

interface UseDailyBriefOptions {
  /** Initial time window for brief generation */
  initialTimeWindow?: BriefTimeWindow;
  /** Whether to auto-refresh brief data */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
}

interface UseDailyBriefReturn {
  /** Current daily brief data */
  brief: DailyBrief | null;
  /** Whether brief is being loaded */
  isLoadingBrief: boolean;
  /** Error if brief loading failed */
  briefError: Error | null;
  /** Current report data */
  report: Report | null;
  /** Whether report is being generated */
  isGeneratingReport: boolean;
  /** Error if report generation failed */
  reportError: Error | null;
  /** Current time window */
  timeWindow: BriefTimeWindow;
  /** Set the time window for brief generation */
  setTimeWindow: (window: BriefTimeWindow) => void;
  /** Refresh brief data manually */
  refreshBrief: () => void;
  /** Generate a daily brief with custom parameters */
  generateBrief: (input?: GenerateBriefInput) => Promise<DailyBrief>;
  /** Generate a report */
  generateReport: (input: GenerateReportInput) => Promise<Report>;
  /** Clear the current report */
  clearReport: () => void;
}

const briefFetcher = (input: GenerateBriefInput) => ipcBridge.ma.brief.generateDaily.invoke(input);

export function useDailyBrief(options: UseDailyBriefOptions = {}): UseDailyBriefReturn {
  const {
    initialTimeWindow = '24h',
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute default for brief
  } = options;

  const [timeWindow, setTimeWindowState] = useState<BriefTimeWindow>(initialTimeWindow);
  const [report, setReport] = useState<Report | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<Error | null>(null);

  // Fetch daily brief
  const {
    data: brief,
    isLoading: isLoadingBrief,
    error: briefError,
    mutate,
  } = useSWR<DailyBrief>(['ma.brief', timeWindow], () => briefFetcher({ timeWindow }), {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    refreshInterval: autoRefresh ? refreshInterval : undefined,
  });

  const setTimeWindow = useCallback(
    (window: BriefTimeWindow) => {
      setTimeWindowState(window);
      // Brief will auto-refresh due to key change
    },
    [setTimeWindowState]
  );

  const refreshBrief = useCallback(() => {
    mutate();
  }, [mutate]);

  const generateBrief = useCallback(
    async (input: GenerateBriefInput = {}): Promise<DailyBrief> => {
      const result = await ipcBridge.ma.brief.generateDaily.invoke(input);
      // Update the cached data
      mutate(result, false);
      return result;
    },
    [mutate]
  );

  const generateReport = useCallback(async (input: GenerateReportInput): Promise<Report> => {
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const result = await ipcBridge.ma.report.generate.invoke(input);
      setReport(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setReportError(error);
      throw error;
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  const clearReport = useCallback(() => {
    setReport(null);
    setReportError(null);
  }, []);

  return {
    brief: brief ?? null,
    isLoadingBrief,
    briefError: briefError ?? null,
    report,
    isGeneratingReport,
    reportError,
    timeWindow,
    setTimeWindow,
    refreshBrief,
    generateBrief,
    generateReport,
    clearReport,
  };
}

// Convenience hook for report generation only
interface UseReportGeneratorReturn {
  /** Current report data */
  report: Report | null;
  /** Whether report is being generated */
  isGenerating: boolean;
  /** Error if report generation failed */
  error: Error | null;
  /** Generate a report */
  generateReport: (type: ReportType, title?: string) => Promise<Report>;
  /** Generate an executive summary */
  generateExecutiveSummary: () => Promise<Report>;
  /** Generate a due diligence report */
  generateDueDiligenceReport: (dealIds?: string[]) => Promise<Report>;
  /** Generate a risk assessment report */
  generateRiskAssessmentReport: (dealIds?: string[]) => Promise<Report>;
  /** Generate a document status report */
  generateDocumentStatusReport: (dealIds?: string[]) => Promise<Report>;
  /** Generate a deal comparison report */
  generateDealComparisonReport: (dealIds?: string[]) => Promise<Report>;
  /** Clear the current report */
  clearReport: () => void;
}

export function useReportGenerator(): UseReportGeneratorReturn {
  const [report, setReport] = useState<Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateReport = useCallback(async (type: ReportType, title?: string): Promise<Report> => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await ipcBridge.ma.report.generate.invoke({ type, title });
      setReport(result);
      return result;
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj);
      throw errObj;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateExecutiveSummary = useCallback(
    () => generateReport('executive_summary', 'Executive Summary'),
    [generateReport]
  );

  const generateDueDiligenceReport = useCallback(
    (dealIds?: string[]) => generateReport('due_diligence', 'Due Diligence Report'),
    [generateReport]
  );

  const generateRiskAssessmentReport = useCallback(
    (dealIds?: string[]) => generateReport('risk_assessment', 'Risk Assessment Report'),
    [generateReport]
  );

  const generateDocumentStatusReport = useCallback(
    (dealIds?: string[]) => generateReport('document_status', 'Document Status Report'),
    [generateReport]
  );

  const generateDealComparisonReport = useCallback(
    (dealIds?: string[]) => generateReport('deal_comparison', 'Deal Comparison Report'),
    [generateReport]
  );

  const clearReport = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return {
    report,
    isGenerating,
    error,
    generateReport,
    generateExecutiveSummary,
    generateDueDiligenceReport,
    generateRiskAssessmentReport,
    generateDocumentStatusReport,
    generateDealComparisonReport,
    clearReport,
  };
}
