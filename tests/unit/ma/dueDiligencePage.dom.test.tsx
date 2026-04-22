/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock react-i18next
// ============================================================================

const translations: Record<string, string> = {
  'ma.dueDiligence.title': 'Due Diligence Analysis',
  'ma.dueDiligence.empty.selectDeal': 'Select a deal to start due diligence analysis',
  'ma.dueDiligence.documents.title': 'Document Selection',
  'ma.dueDiligence.documents.selectCount': 'Select Documents (0/0)',
  'ma.dueDiligence.documents.selectAll': 'Select All',
  'ma.dueDiligence.documents.clear': 'Clear',
  'ma.dueDiligence.documents.empty': 'No documents uploaded yet',
  'ma.dueDiligence.readiness.blockedTitle': 'Analysis Unavailable',
  'ma.dueDiligence.readiness.blockedDescription':
    'The AI analysis backend is not configured or unreachable. Check your settings and try again.',
  'ma.dueDiligence.prerequisites.noDocumentsTitle': 'No Documents',
  'ma.dueDiligence.prerequisites.noDocumentsDescription':
    'Upload and process documents for this deal before running analysis.',
  'ma.dueDiligence.prerequisites.processingTitle': 'Documents Processing',
  'ma.dueDiligence.prerequisites.processingDescription':
    'Some documents are still being processed. Wait for ingestion to complete before analyzing.',
  'ma.dueDiligence.progress.stages.initializing': 'Initializing',
  'ma.dueDiligence.progress.stages.analyzing': 'Analyzing',
  'ma.dueDiligence.actions.analyzing': 'Analyzing...',
  'ma.dueDiligence.actions.startAnalysis': 'Start Analysis',
  'ma.dueDiligence.actions.cancel': 'Cancel',
  'ma.dueDiligence.actions.refresh': 'Refresh',
  'ma.dueDiligence.actions.compareDeals': 'Compare Deals',
  'ma.dueDiligence.messages.analysisSuccess': 'Analysis completed successfully',
  'ma.dueDiligence.messages.analysisFailed': 'Analysis failed',
  'ma.dueDiligence.empty.noResults': 'No analysis results yet. Select documents and start an analysis.',
  'ma.dueDiligence.history.title': 'Analysis History',
  'ma.dueDiligence.history.empty': 'No previous analyses',
  'ma.dueDiligence.results.summary': 'Analysis Summary',
  'ma.dueDiligence.results.generatedAt': 'Generated',
  'ma.dueDiligence.results.findings': 'Risk Findings (0)',
  'ma.dueDiligence.results.severity': 'Severity',
  'ma.dueDiligence.results.score': 'Score',
  'ma.dueDiligence.results.title': 'Title',
  'ma.dueDiligence.results.category': 'Category',
  'ma.dueDiligence.categories.financial': 'Financial',
  'ma.dueDiligence.categories.legal': 'Legal',
  'ma.dueDiligence.categories.operational': 'Operational',
  'ma.dueDiligence.categories.regulatory': 'Regulatory',
  'ma.dueDiligence.categories.reputational': 'Reputational',
  'ma.dueDiligence.comparison.title': 'Deal Comparison',
  'ma.dueDiligence.comparison.topRisks': 'Top Risks Across All Deals',
  'errorState.retry': 'Retry',
  'errorState.title': 'Something went wrong',
  'errorState.stackTrace': 'Stack Trace',
  'errorState.copy': 'Copy',
  'errorState.copied': 'Copied!',
  'errorState.observability': 'View in Observability',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _opts?: unknown) => translations[key] ?? key,
    i18n: {
      language: 'en-US',
    },
  }),
}));

// ============================================================================
// Mock dependencies
// ============================================================================

vi.mock('@renderer/components/ma/RiskScoreCard', () => ({
  RiskScoreCard: () => <div data-testid='risk-score-card'>RiskScoreCard</div>,
}));

vi.mock('@renderer/hooks/ma/useDealContext');
vi.mock('@renderer/hooks/ma/useDocuments');
vi.mock('@renderer/hooks/ma/useDueDiligence');
vi.mock('@renderer/hooks/ma/useFlowiseReadiness');

import { useDealContext } from '@renderer/hooks/ma/useDealContext';
import { useDocuments } from '@renderer/hooks/ma/useDocuments';
import { useDueDiligence } from '@renderer/hooks/ma/useDueDiligence';
import { useFlowiseReadiness } from '@renderer/hooks/ma/useFlowiseReadiness';
import { DueDiligencePage } from '@renderer/pages/ma/DueDiligence/DueDiligencePage';

// ============================================================================
// Fixtures
// ============================================================================

const defaultDeal = {
  id: 'deal-1',
  name: 'Test Deal',
  parties: [{ name: 'Buyer', role: 'buyer' }],
  transactionType: 'acquisition',
  targetCompany: { name: 'Target Corp' },
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const defaultDocuments = [
  {
    id: 'doc-1',
    dealId: 'deal-1',
    filename: 'test.pdf',
    status: 'completed',
    format: 'pdf',
    size: 1000,
    originalPath: '/test.pdf',
    createdAt: Date.now(),
  },
];

const defaultAnalysis = {
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
};

const defaultReadiness = {
  baseUrl: 'http://localhost',
  hasApiKey: true,
  apiKeySource: 'env' as const,
  pingOk: true,
  authOk: true,
  checkedAt: Date.now(),
};

// ============================================================================
// Helpers
// ============================================================================

function setupMocks(
  overrides: {
    dealContext?: Record<string, unknown>;
    documents?: Record<string, unknown>;
    dueDiligence?: Record<string, unknown>;
    flowiseReadiness?: Record<string, unknown>;
  } = {}
) {
  vi.mocked(useDealContext).mockReturnValue({
    activeDeal: defaultDeal,
    deals: [defaultDeal],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    deleteDeal: vi.fn(),
    setActiveDeal: vi.fn(),
    archiveDeal: vi.fn(),
    closeDeal: vi.fn(),
    reactivateDeal: vi.fn(),
    clearActiveDeal: vi.fn(),
    isActive: vi.fn(),
    getContextForAI: vi.fn(),
    validateInput: vi.fn(),
    ...overrides.dealContext,
  } as unknown as ReturnType<typeof useDealContext>);

  vi.mocked(useDocuments).mockReturnValue({
    documents: defaultDocuments,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    upload: vi.fn(),
    deleteDocument: vi.fn(),
    updateStatus: vi.fn(),
    uploadStatus: new Map(),
    ...overrides.documents,
  } as unknown as ReturnType<typeof useDocuments>);

  vi.mocked(useDueDiligence).mockReturnValue({
    analyses: [defaultAnalysis],
    currentAnalysis: {
      analysisId: null,
      progress: null,
      isRunning: false,
      error: null,
      status: 'idle',
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    startAnalysis: vi.fn(),
    getAnalysis: vi.fn(),
    compareDeals: vi.fn(),
    getRiskFindings: vi.fn(),
    getRisksByCategory: vi.fn(),
    getRisksBySeverity: vi.fn(),
    clearCurrentAnalysis: vi.fn(),
    ...overrides.dueDiligence,
  } as unknown as ReturnType<typeof useDueDiligence>);

  vi.mocked(useFlowiseReadiness).mockReturnValue({
    readiness: defaultReadiness,
    isLoading: false,
    isReady: true,
    error: undefined,
    refresh: vi.fn(),
    ...overrides.flowiseReadiness,
  } as unknown as ReturnType<typeof useFlowiseReadiness>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Tests
// ============================================================================

describe('DueDiligencePage', () => {
  it('shows blocked-by-readiness state when Flowise is not ready', () => {
    setupMocks({
      flowiseReadiness: {
        isReady: false,
        isLoading: false,
        readiness: {
          ...defaultReadiness,
          hasApiKey: false,
          apiKeySource: 'none',
          pingOk: false,
          error: 'No API key configured',
        },
      },
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'idle',
        },
      },
    });

    render(<DueDiligencePage />);

    expect(screen.getByText('Analysis Unavailable')).toBeInTheDocument();
    expect(screen.getByText('No API key configured')).toBeInTheDocument();
  });

  it('shows blocked-by-no-documents state when there are no documents', () => {
    setupMocks({
      documents: { documents: [], isLoading: false },
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'idle',
        },
      },
    });

    render(<DueDiligencePage />);

    expect(screen.getByText('No Documents')).toBeInTheDocument();
    expect(screen.getByText('Upload and process documents for this deal before running analysis.')).toBeInTheDocument();
  });

  it('shows loading skeleton while documents are loading', () => {
    setupMocks({
      documents: { documents: [], isLoading: true },
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'idle',
        },
      },
    });

    render(<DueDiligencePage />);

    expect(document.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('shows processing state when analysis is running', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: 'analysis-2',
          progress: {
            analysisId: 'analysis-2',
            stage: 'analyzing',
            progress: 50,
            message: 'Analyzing documents...',
          },
          isRunning: true,
          error: null,
          status: 'running',
        },
      },
    });

    render(<DueDiligencePage />);

    expect(screen.getByRole('button', { name: 'Analyzing...' })).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Analyzing...');
  });

  it('shows failure state with retry when analysis failed', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: 'Backend timeout',
          status: 'failed',
        },
      },
    });

    render(<DueDiligencePage />);

    expect(screen.getByText('Backend timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows success state with analysis results', () => {
    setupMocks();

    render(<DueDiligencePage />);

    expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
    expect(screen.getByTestId('risk-score-card')).toBeInTheDocument();
  });

  it('keeps analysis blocked while uploaded documents are still processing', () => {
    setupMocks({
      documents: {
        documents: [{ ...defaultDocuments[0], status: 'extracting' }],
        isLoading: false,
      },
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'idle',
        },
      },
    });

    render(<DueDiligencePage />);

    expect(screen.getByText('Documents Processing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeDisabled();
  });

  it('allows analysis once uploaded documents are completed and selected', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'idle',
        },
      },
    });

    render(<DueDiligencePage />);

    fireEvent.click(screen.getByText('test.pdf'));

    expect(screen.queryByText('Documents Processing')).not.toBeInTheDocument();
    expect(screen.queryByText('No Documents')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeEnabled();
  });
});

describe('DueDiligencePage - Async Accessibility Coverage', () => {
  it('should have aria-live region for screen reader announcements', () => {
    setupMocks();

    render(<DueDiligencePage />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('should announce analysis initialization to screen readers', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: 'analysis-2',
          progress: {
            analysisId: 'analysis-2',
            stage: 'initializing',
            progress: 0,
          },
          isRunning: true,
          error: null,
          status: 'initializing',
        },
      },
    });

    render(<DueDiligencePage />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Initializing');
  });

  it('should announce analysis running to screen readers', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: 'analysis-2',
          progress: {
            analysisId: 'analysis-2',
            stage: 'analyzing',
            progress: 50,
            message: 'Analyzing documents...',
          },
          isRunning: true,
          error: null,
          status: 'running',
        },
      },
    });

    render(<DueDiligencePage />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Analyzing...');
  });

  it('should announce analysis completion to screen readers', () => {
    setupMocks({
      dueDiligence: {
        analyses: [defaultAnalysis],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'completed',
        },
      },
    });

    render(<DueDiligencePage />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Analysis completed successfully');
  });

  it('should announce analysis failure to screen readers', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: 'Backend timeout',
          status: 'failed',
        },
      },
    });

    render(<DueDiligencePage />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Analysis failed');
  });

  it('should not contain emoji in progress display', () => {
    setupMocks({
      dueDiligence: {
        analyses: [],
        currentAnalysis: {
          analysisId: 'analysis-2',
          progress: {
            analysisId: 'analysis-2',
            stage: 'analyzing',
            progress: 50,
            message: 'Analyzing documents...',
            currentDocument: 'test.pdf',
          },
          isRunning: true,
          error: null,
          status: 'running',
        },
      },
    });

    render(<DueDiligencePage />);

    const html = document.body.innerHTML;
    // Check that document emoji is not present
    expect(html).not.toContain('📄');
  });

  it('should use semantic color variables in severity tags', () => {
    setupMocks({
      dueDiligence: {
        analyses: [
          {
            ...defaultAnalysis,
            risks: [
              {
                id: 'risk-1',
                category: 'financial',
                severity: 'high',
                title: 'Test Risk',
                description: 'Test description',
                score: 75,
              },
            ],
          },
        ],
        currentAnalysis: {
          analysisId: null,
          progress: null,
          isRunning: false,
          error: null,
          status: 'idle',
        },
      },
    });

    render(<DueDiligencePage />);

    const html = document.body.innerHTML;
    // This assertion targets the DD page's own severity tag rendering, not the mocked RiskScoreCard.
    expect(html).toContain('var(--warning)');
    expect(html).not.toContain('#F53F3F');
    expect(html).not.toContain('#FF7D00');
  });
});
