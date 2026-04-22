/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DueDiligencePage Component
 * Main page for due diligence analysis with document selection, configuration,
 * progress display, results visualization, and comparison view.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button, Card, Empty, Message, Progress, Table, Tag, Typography } from '@arco-design/web-react';
import {
  Play,
  Refresh,
  Analysis as CompareIcon,
  DocDetail as DocumentIcon,
  Analysis,
  Attention,
  Close,
} from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { RiskScoreCard } from '@/renderer/components/ma/RiskScoreCard';
import { useDealContext } from '@/renderer/hooks/ma/useDealContext';
import { useDocuments } from '@/renderer/hooks/ma/useDocuments';
import { useDueDiligence } from '@/renderer/hooks/ma/useDueDiligence';
import { useFlowiseReadiness } from '@/renderer/hooks/ma/useFlowiseReadiness';
import { useMaDateFormatters } from '@/renderer/utils/ma/formatters';
import { EmptyState, ErrorState, Skeleton } from '@/renderer/components/base';
import { isActiveDocumentStatus } from '@/common/ma/types';
import type { MaDocument, RiskCategory, RiskSeverity } from '@/common/ma/types';
import type { AnalysisType, DueDiligenceResult, ComparisonResult } from '@process/services/ma/DueDiligenceService';
import styles from './DueDiligencePage.module.css';

const { Title, Text } = Typography;

type ViewMode = 'analysis' | 'comparison' | 'history';

const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  low: 'var(--success)',
  medium: 'var(--info)',
  high: 'var(--warning)',
  critical: 'var(--danger)',
};

const EMPTY_RISK_SCORES: Record<RiskCategory, number> = {
  financial: 0,
  legal: 0,
  operational: 0,
  regulatory: 0,
  reputational: 0,
};

interface DocumentSelectorProps {
  documents: MaDocument[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function DocumentSelector({ documents, selectedIds, onSelectionChange }: DocumentSelectorProps) {
  const { t } = useTranslation();

  const getDocumentStatusLabel = useCallback(
    (status: MaDocument['status']) => {
      switch (status) {
        case 'completed':
          return t('ma.documentUpload.status.uploaded');
        case 'failed':
        case 'error':
          return t('ma.documentUpload.status.failed');
        case 'cancelled':
          return t('ma.documentUpload.status.cancelled');
        case 'queued':
          return t('ma.documentUpload.stage.queued');
        case 'extracting':
          return t('ma.documentUpload.stage.extracting');
        case 'chunking':
          return t('ma.documentUpload.stage.chunking');
        case 'processing':
          return t('ma.documentUpload.status.ingesting');
        default:
          return status;
      }
    },
    [t]
  );

  const handleSelectAll = useCallback(() => {
    onSelectionChange(documents.filter((doc) => doc.status === 'completed').map((doc) => doc.id));
  }, [documents, onSelectionChange]);

  const handleClearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const handleToggle = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((itemId) => itemId !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    },
    [onSelectionChange, selectedIds]
  );

  if (documents.length === 0) {
    return (
      <div className={styles.emptyDocuments}>
        <Empty description={t('ma.dueDiligence.documents.empty')} />
      </div>
    );
  }

  return (
    <div className={styles.documentSelector}>
      <div className={styles.selectorHeader}>
        <Text>
          {t('ma.dueDiligence.documents.selectCount', { selected: selectedIds.length, total: documents.length })}
        </Text>
        <div className={styles.selectorActions}>
          <Button size='small' onClick={handleSelectAll}>
            {t('ma.dueDiligence.documents.selectAll')}
          </Button>
          <Button size='small' onClick={handleClearAll}>
            {t('ma.dueDiligence.documents.clear')}
          </Button>
        </div>
      </div>
      <div className={styles.documentList}>
        {documents.map((doc) => {
          const isSelected = selectedIds.includes(doc.id);
          const isCompleted = doc.status === 'completed';

          return (
            <Button
              key={doc.id}
              type='text'
              className={`${styles.documentItem} ${isSelected ? styles.selected : ''} ${!isCompleted ? styles.disabled : ''}`}
              onClick={() => isCompleted && handleToggle(doc.id)}
              disabled={!isCompleted}
              aria-pressed={isSelected}
              long
            >
              <div className={styles.documentItemContent}>
                <DocumentIcon className={styles.documentIcon} />
                <div className={styles.documentInfo}>
                  <span className={styles.documentName}>{doc.filename}</span>
                  <span className={styles.documentMeta}>
                    {doc.format.toUpperCase()} -{' '}
                    {doc.metadata?.documentType ?? t('ma.dueDiligence.documents.unknownType')}
                  </span>
                </div>
                <Tag
                  size='small'
                  color={
                    isCompleted
                      ? 'var(--success)'
                      : doc.status === 'error' || doc.status === 'failed'
                        ? 'var(--danger)'
                        : 'var(--primary)'
                  }
                >
                  {getDocumentStatusLabel(doc.status)}
                </Tag>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface AnalysisConfigProps {
  selectedTypes: AnalysisType[];
  onTypesChange: (types: AnalysisType[]) => void;
}

function AnalysisConfig({ selectedTypes, onTypesChange }: AnalysisConfigProps) {
  const { t } = useTranslation();

  const analysisTypes: { value: AnalysisType; labelKey: string; descriptionKey: string }[] = [
    {
      value: 'due_diligence',
      labelKey: 'ma.dueDiligence.analysisTypes.dueDiligence',
      descriptionKey: 'ma.dueDiligence.analysisTypes.dueDiligenceDesc',
    },
    {
      value: 'risk_assessment',
      labelKey: 'ma.dueDiligence.analysisTypes.riskAssessment',
      descriptionKey: 'ma.dueDiligence.analysisTypes.riskAssessmentDesc',
    },
    {
      value: 'financial_extraction',
      labelKey: 'ma.dueDiligence.analysisTypes.financialExtraction',
      descriptionKey: 'ma.dueDiligence.analysisTypes.financialExtractionDesc',
    },
    {
      value: 'document_comparison',
      labelKey: 'ma.dueDiligence.analysisTypes.documentComparison',
      descriptionKey: 'ma.dueDiligence.analysisTypes.documentComparisonDesc',
    },
  ];

  const handleToggle = useCallback(
    (type: AnalysisType) => {
      if (selectedTypes.includes(type)) {
        onTypesChange(selectedTypes.filter((selectedType) => selectedType !== type));
      } else {
        onTypesChange([...selectedTypes, type]);
      }
    },
    [onTypesChange, selectedTypes]
  );

  return (
    <div className={styles.analysisConfig}>
      <Text className={styles.configLabel}>{t('ma.dueDiligence.analysisTypes.title')}</Text>
      <div className={styles.typeList}>
        {analysisTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.value);

          return (
            <Button
              key={type.value}
              type='text'
              className={`${styles.typeItem} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleToggle(type.value)}
              aria-pressed={isSelected}
              long
            >
              <div className={styles.typeItemContent}>
                <div className={styles.typeInfo}>
                  <span className={styles.typeLabel}>{t(type.labelKey)}</span>
                  <span className={styles.typeDescription}>{t(type.descriptionKey)}</span>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface ProgressDisplayProps {
  progress: {
    stage: string;
    progress: number;
    message?: string;
    currentDocument?: string;
    risksFound?: number;
  };
}

function ProgressDisplay({ progress }: ProgressDisplayProps) {
  const { t } = useTranslation();

  const stageLabels: Record<string, string> = {
    initializing: t('ma.dueDiligence.progress.stages.initializing'),
    extracting: t('ma.dueDiligence.progress.stages.extracting'),
    analyzing: t('ma.dueDiligence.progress.stages.analyzing'),
    scoring: t('ma.dueDiligence.progress.stages.scoring'),
    complete: t('ma.dueDiligence.progress.stages.complete'),
    error: t('ma.dueDiligence.progress.stages.error'),
  };

  return (
    <div className={styles.progressDisplay}>
      <div className={styles.progressHeader}>
        <Text className={styles.progressStage}>{stageLabels[progress.stage] ?? progress.stage}</Text>
        {progress.risksFound !== undefined && (
          <Tag style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
            {t('ma.dueDiligence.progress.risksFound', { count: progress.risksFound })}
          </Tag>
        )}
      </div>
      <Progress
        percent={progress.progress}
        status={progress.stage === 'error' ? 'error' : progress.stage === 'complete' ? 'success' : 'normal'}
      />
      {progress.message && <Text className={styles.progressMessage}>{progress.message}</Text>}
      {progress.currentDocument && <Text className={styles.progressDocument}>{progress.currentDocument}</Text>}
    </div>
  );
}

interface ResultsDisplayProps {
  result: DueDiligenceResult;
  onCompare?: () => void;
}

function ResultsDisplay({ result, onCompare }: ResultsDisplayProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useMaDateFormatters();
  const [selectedCategory, setSelectedCategory] = useState<RiskCategory | null>(null);

  const filteredRisks = useMemo(() => {
    if (!selectedCategory) return result.risks;
    return result.risks.filter((risk) => risk.category === selectedCategory);
  }, [result.risks, selectedCategory]);

  const columns = [
    {
      title: t('ma.dueDiligence.results.severity'),
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: RiskSeverity) => (
        <Tag style={{ color: SEVERITY_COLORS[severity], borderColor: SEVERITY_COLORS[severity] }}>
          {t(`ma.riskScoreCard.severity.${severity}`)}
        </Tag>
      ),
    },
    {
      title: t('ma.dueDiligence.results.score'),
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => <Text bold>{score}</Text>,
    },
    {
      title: t('ma.dueDiligence.results.title'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Text>{title}</Text>,
    },
    {
      title: t('ma.dueDiligence.results.category'),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: RiskCategory) => <Tag>{t(`ma.dueDiligence.categories.${category}`)}</Tag>,
    },
  ];

  return (
    <div className={styles.resultsDisplay}>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <Title heading={5}>{t('ma.dueDiligence.results.summary')}</Title>
          <Text type='secondary'>
            {t('ma.dueDiligence.results.generatedAt')}: {formatDateTime(result.generatedAt)}
          </Text>
        </div>
        <Text className={styles.summaryText}>{result.summary}</Text>
        {result.recommendations.length > 0 && (
          <div className={styles.recommendations}>
            <Text className={styles.recommendationsTitle}>{t('ma.dueDiligence.results.recommendations')}</Text>
            <ul className={styles.recommendationsList}>
              {result.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>
        )}
        {onCompare && (
          <Button icon={<CompareIcon />} onClick={onCompare}>
            {t('ma.dueDiligence.results.compareDeals')}
          </Button>
        )}
      </Card>

      <RiskScoreCard riskScores={result.riskScores} overallScore={result.overallRiskScore} risks={result.risks} />

      <Card className={styles.findingsCard}>
        <div className={styles.findingsHeader}>
          <Title heading={5}>{t('ma.dueDiligence.results.findings', { count: result.risks.length })}</Title>
          <div className={styles.categoryFilters}>
            {(['financial', 'legal', 'operational', 'regulatory', 'reputational'] as RiskCategory[]).map((category) => (
              <Button
                key={category}
                size='small'
                type={selectedCategory === category ? 'primary' : 'default'}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              >
                {t(`ma.dueDiligence.categories.${category}`)}
              </Button>
            ))}
          </div>
        </div>
        <Table columns={columns} data={filteredRisks} rowKey='id' pagination={{ pageSize: 10 }} size='small' />
      </Card>
    </div>
  );
}

interface ComparisonDisplayProps {
  comparison: ComparisonResult;
  onClose: () => void;
}

function ComparisonDisplay({ comparison, onClose }: ComparisonDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.comparisonDisplay}>
      <div className={styles.comparisonHeader}>
        <Title heading={5}>{t('ma.dueDiligence.comparison.title')}</Title>
        <Button icon={<Close />} onClick={onClose} />
      </div>

      <Card className={styles.comparisonSummary}>
        <Text>{comparison.comparison.summary}</Text>
      </Card>

      <RiskScoreCard
        riskScores={comparison.deals[0]?.categoryScores ?? EMPTY_RISK_SCORES}
        isComparison
        comparisonData={comparison.comparison.categoryComparison}
      />

      <Card className={styles.topRisksCard}>
        <Title heading={5}>{t('ma.dueDiligence.comparison.topRisks')}</Title>
        <div className={styles.topRisksList}>
          {comparison.comparison.topRisks.map((risk) => (
            <div key={risk.id} className={styles.topRiskItem}>
              <Tag style={{ color: SEVERITY_COLORS[risk.severity], borderColor: SEVERITY_COLORS[risk.severity] }}>
                {t(`ma.riskScoreCard.severity.${risk.severity}`)}
              </Tag>
              <Text>{risk.title}</Text>
              <Text type='secondary'>
                {t('ma.dueDiligence.results.score')}: {risk.score}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function DueDiligencePage() {
  const { t } = useTranslation();
  const { formatDateTime } = useMaDateFormatters();
  const { activeDeal, deals } = useDealContext();
  const { documents, isLoading: documentsLoading } = useDocuments({
    dealId: activeDeal?.id ?? '',
    autoRefresh: !!activeDeal,
  });

  const { analyses, currentAnalysis, startAnalysis, compareDeals, refresh } = useDueDiligence({
    dealId: activeDeal?.id,
  });

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<AnalysisType[]>(['due_diligence']);
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const { isReady: isFlowiseReady, isLoading: readinessLoading, readiness } = useFlowiseReadiness();

  useEffect(() => {
    const completedIds = new Set(documents.filter((doc) => doc.status === 'completed').map((doc) => doc.id));
    setSelectedDocumentIds((prev) => prev.filter((id) => completedIds.has(id)));
  }, [documents]);

  const hasActiveDocuments = useMemo(() => documents.some((doc) => isActiveDocumentStatus(doc.status)), [documents]);

  const canStartAnalysis = useMemo(() => {
    if (!activeDeal || !isFlowiseReady) return false;
    if (selectedDocumentIds.length === 0 || selectedAnalysisTypes.length === 0) return false;
    if (currentAnalysis.status === 'initializing' || currentAnalysis.status === 'running') return false;

    const selectedDocs = documents.filter((doc) => selectedDocumentIds.includes(doc.id));
    return selectedDocs.length > 0 && selectedDocs.every((doc) => doc.status === 'completed');
  }, [activeDeal, currentAnalysis.status, documents, isFlowiseReady, selectedAnalysisTypes, selectedDocumentIds]);

  const announcement = useMemo(() => {
    if (currentAnalysis.status === 'initializing') return t('ma.dueDiligence.progress.stages.initializing');
    if (currentAnalysis.status === 'running') return t('ma.dueDiligence.actions.analyzing');
    if (currentAnalysis.status === 'completed') return t('ma.dueDiligence.messages.analysisSuccess');
    if (currentAnalysis.status === 'failed') return t('ma.dueDiligence.messages.analysisFailed');
    return '';
  }, [currentAnalysis.status, t]);

  const handleStartAnalysis = useCallback(async () => {
    if (!canStartAnalysis) return;

    try {
      await startAnalysis({
        documentIds: selectedDocumentIds,
        analysisTypes: selectedAnalysisTypes,
      });
      Message.success(t('ma.dueDiligence.messages.analysisSuccess'));
    } catch (error) {
      Message.error(error instanceof Error ? error.message : t('ma.dueDiligence.messages.analysisFailed'));
    }
  }, [canStartAnalysis, selectedAnalysisTypes, selectedDocumentIds, startAnalysis, t]);

  const handleCompare = useCallback(async () => {
    const activeDeals = deals.filter((deal) => deal.status === 'active');
    if (activeDeals.length < 2) {
      Message.warning(t('ma.dueDiligence.messages.needTwoDeals'));
      return;
    }

    setIsComparing(true);
    try {
      const result = await compareDeals(activeDeals.map((deal) => deal.id));
      setComparisonResult(result);
      setViewMode('comparison');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : t('ma.dueDiligence.messages.comparisonFailed'));
    } finally {
      setIsComparing(false);
    }
  }, [compareDeals, deals, t]);

  const latestAnalysis = analyses[0];

  if (!activeDeal) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Empty description={t('ma.dueDiligence.empty.selectDeal')} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Title heading={4}>{t('ma.dueDiligence.title')}</Title>
          <Text type='secondary'>{activeDeal.name}</Text>
        </div>
        <div className={styles.actions}>
          <Button icon={<Refresh />} onClick={refresh}>
            {t('ma.dueDiligence.actions.refresh')}
          </Button>
          <Button
            icon={<CompareIcon />}
            onClick={handleCompare}
            loading={isComparing}
            disabled={deals.filter((deal) => deal.status === 'active').length < 2}
          >
            {t('ma.dueDiligence.actions.compareDeals')}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.configPanel}>
          <Card className={styles.configCard}>
            <Title heading={5}>{t('ma.dueDiligence.documents.title')}</Title>
            {documentsLoading ? (
              <div className={styles.loadingState}>
                <Skeleton variant='line' lines={4} />
              </div>
            ) : (
              <DocumentSelector
                documents={documents}
                selectedIds={selectedDocumentIds}
                onSelectionChange={setSelectedDocumentIds}
              />
            )}
          </Card>

          <Card className={styles.configCard}>
            <AnalysisConfig selectedTypes={selectedAnalysisTypes} onTypesChange={setSelectedAnalysisTypes} />
          </Card>

          <div className={styles.startButton}>
            <Button
              type='primary'
              size='large'
              icon={<Play />}
              onClick={handleStartAnalysis}
              disabled={!canStartAnalysis}
              loading={currentAnalysis.status === 'initializing' || currentAnalysis.status === 'running'}
              long
            >
              {currentAnalysis.status === 'initializing' || currentAnalysis.status === 'running'
                ? t('ma.dueDiligence.actions.analyzing')
                : t('ma.dueDiligence.actions.startAnalysis')}
            </Button>
          </div>
        </div>

        <div className={styles.resultsPanel}>
          <div aria-live='polite' aria-atomic='true' className={styles.srOnly}>
            {announcement}
          </div>

          {documentsLoading && (
            <div className={styles.emptyResults}>
              <Skeleton variant='card' />
            </div>
          )}

          {!documentsLoading && readinessLoading && (
            <div className={styles.emptyResults}>
              <Skeleton variant='card' />
            </div>
          )}

          {!documentsLoading && !readinessLoading && !isFlowiseReady && (
            <div className={styles.emptyResults}>
              <EmptyState
                icon={<Attention size={48} />}
                title='ma.dueDiligence.readiness.blockedTitle'
                description={readiness?.error ?? 'ma.dueDiligence.readiness.blockedDescription'}
                i18nNs='ma'
              />
            </div>
          )}

          {!documentsLoading && !readinessLoading && isFlowiseReady && documents.length === 0 && (
            <div className={styles.emptyResults}>
              <EmptyState
                icon={<DocumentIcon size={48} />}
                title='ma.dueDiligence.prerequisites.noDocumentsTitle'
                description='ma.dueDiligence.prerequisites.noDocumentsDescription'
                i18nNs='ma'
              />
            </div>
          )}

          {!documentsLoading && !readinessLoading && isFlowiseReady && documents.length > 0 && hasActiveDocuments && (
            <div className={styles.emptyResults}>
              <EmptyState
                icon={<Analysis size={48} />}
                title='ma.dueDiligence.prerequisites.processingTitle'
                description='ma.dueDiligence.prerequisites.processingDescription'
                i18nNs='ma'
              />
            </div>
          )}

          {(currentAnalysis.status === 'initializing' || currentAnalysis.status === 'running') &&
            currentAnalysis.progress && (
              <Card className={styles.progressCard}>
                <ProgressDisplay progress={currentAnalysis.progress} />
              </Card>
            )}

          {currentAnalysis.status === 'failed' && (
            <ErrorState
              error={currentAnalysis.error ?? t('ma.dueDiligence.messages.analysisFailed')}
              onRetry={handleStartAnalysis}
            />
          )}

          {viewMode === 'comparison' && comparisonResult && (
            <ComparisonDisplay
              comparison={comparisonResult}
              onClose={() => {
                setComparisonResult(null);
                setViewMode('analysis');
              }}
            />
          )}

          {viewMode === 'analysis' &&
            latestAnalysis &&
            currentAnalysis.status !== 'initializing' &&
            currentAnalysis.status !== 'running' && (
              <ResultsDisplay result={latestAnalysis} onCompare={handleCompare} />
            )}

          {viewMode === 'analysis' &&
            !latestAnalysis &&
            currentAnalysis.status !== 'initializing' &&
            currentAnalysis.status !== 'running' &&
            currentAnalysis.status !== 'failed' &&
            !documentsLoading &&
            !readinessLoading &&
            isFlowiseReady &&
            documents.length > 0 &&
            !hasActiveDocuments && (
              <div className={styles.emptyResults}>
                <Empty
                  icon={<Analysis className={styles.emptyIcon} />}
                  description={t('ma.dueDiligence.empty.noResults')}
                />
              </div>
            )}

          {viewMode === 'history' && (
            <Card>
              <Title heading={5}>{t('ma.dueDiligence.history.title')}</Title>
              {analyses.length === 0 ? (
                <Empty description={t('ma.dueDiligence.history.empty')} />
              ) : (
                <div className={styles.historyList}>
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className={styles.historyItem}>
                      <div className={styles.historyInfo}>
                        <Text>{formatDateTime(analysis.generatedAt)}</Text>
                        <Tag>{t('ma.dueDiligence.history.riskScore', { score: analysis.overallRiskScore })}</Tag>
                      </div>
                      <Text type='secondary'>
                        {t('ma.dueDiligence.history.findingsCount', { count: analysis.risks.length })}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default DueDiligencePage;
