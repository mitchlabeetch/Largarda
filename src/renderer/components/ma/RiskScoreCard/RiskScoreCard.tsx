/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RiskScoreCard Component
 * Displays risk category breakdown with severity indicators and drill-down capability.
 * Supports comparison view for multiple deals.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Progress, Tooltip, Collapse, Tag } from '@arco-design/web-react';
import {
  Caution,
  CloseOne,
  Help,
  Attention,
  Success,
  Down,
  Right,
  Wallet,
  Scale,
  Tool,
  FileText,
  Trophy,
} from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { Skeleton, EmptyState } from '@/renderer/components/base';
import type { RiskCategory, RiskSeverity, RiskFinding } from '@/common/ma/types';
import styles from './RiskScoreCard.module.css';

// ============================================================================
// Types
// ============================================================================

export interface RiskScoreCardProps {
  /** Risk scores by category */
  riskScores: Record<RiskCategory, number>;
  /** Overall risk score */
  overallScore?: number;
  /** Risk findings for drill-down */
  risks?: RiskFinding[];
  /** Whether in loading state */
  isLoading?: boolean;
  /** Whether in comparison mode */
  isComparison?: boolean;
  /** Comparison data for multiple deals */
  comparisonData?: Record<string, Record<RiskCategory, number>>;
  /** Deal name for comparison view */
  dealName?: string;
  /** Callback when a category is clicked */
  onCategoryClick?: (category: RiskCategory) => void;
  /** Custom class name */
  className?: string;
}

interface CategoryConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 76) return '#722ED1'; // Critical
  if (score >= 51) return '#F53F3F'; // High
  if (score >= 26) return '#FF7D00'; // Medium
  return '#00B42A'; // Low
}

function getSeverityIcon(severity: RiskSeverity): React.ReactNode {
  switch (severity) {
    case 'critical':
      return <CloseOne theme='filled' fill='#722ED1' />;
    case 'high':
      return <Caution theme='filled' fill='#F53F3F' />;
    case 'medium':
      return <Attention theme='filled' fill='#FF7D00' />;
    case 'low':
      return <Success theme='filled' fill='#00B42A' />;
    default:
      return <Help />;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CategoryBarProps {
  category: RiskCategory;
  score: number;
  findings?: RiskFinding[];
  onClick?: () => void;
  isExpanded?: boolean;
  categoryConfig: Record<RiskCategory, CategoryConfig>;
  severityConfig: Record<RiskSeverity, { label: string; color: string }>;
}

function CategoryBar({
  category,
  score,
  findings,
  onClick,
  isExpanded,
  categoryConfig,
  severityConfig,
}: CategoryBarProps) {
  const config = categoryConfig[category];
  const categoryFindings = findings?.filter((f) => f.category === category) ?? [];
  const color = getScoreColor(score);

  return (
    <div className={styles.categoryBar}>
      <div className={styles.categoryHeader} onClick={onClick}>
        <div className={styles.categoryInfo}>
          {config.icon}
          <span className={styles.categoryLabel}>{config.label}</span>
          <Tooltip content={config.description}>
            <Help className={styles.helpIcon} />
          </Tooltip>
        </div>
        <div className={styles.categoryScore}>
          <span className={styles.scoreValue} style={{ color }}>
            {score}
          </span>
          <span className={styles.scoreMax}>/100</span>
          {categoryFindings.length > 0 && (
            <Tag size='small' className={styles.findingCount}>
              {categoryFindings.length}
            </Tag>
          )}
          {categoryFindings.length > 0 && (isExpanded ? <Down /> : <Right />)}
        </div>
      </div>
      <Progress
        percent={score}
        color={color}
        trailColor='var(--color-fill-2)'
        showText={false}
        className={styles.categoryProgress}
      />
      {isExpanded && categoryFindings.length > 0 && (
        <div className={styles.findingsList}>
          {categoryFindings.map((finding) => (
            <div key={finding.id} className={styles.findingItem}>
              <div className={styles.findingHeader}>
                {getSeverityIcon(finding.severity)}
                <span className={styles.findingTitle}>{finding.title}</span>
                <Tag size='small' color={severityConfig[finding.severity].color}>
                  {severityConfig[finding.severity].label}
                </Tag>
              </div>
              <p className={styles.findingDescription}>{finding.description}</p>
              {finding.recommendation && (
                <p className={styles.findingRecommendation}>
                  <Attention theme='filled' size='14' fill='#FF7D00' style={{ marginRight: '4px' }} />
                  {finding.recommendation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ComparisonBarProps {
  category: RiskCategory;
  comparisonData: Record<string, Record<RiskCategory, number>>;
  dealNames?: Record<string, string>;
  categoryConfig: Record<RiskCategory, CategoryConfig>;
}

function ComparisonBar({ category, comparisonData, dealNames, categoryConfig }: ComparisonBarProps) {
  const config = categoryConfig[category];
  const dealIds = Object.keys(comparisonData);

  return (
    <div className={styles.comparisonBar}>
      <div className={styles.categoryInfo}>
        {config.icon}
        <span className={styles.categoryLabel}>{config.label}</span>
      </div>
      <div className={styles.comparisonScores}>
        {dealIds.map((dealId) => {
          const score = comparisonData[dealId][category] ?? 0;
          const color = getScoreColor(score);
          return (
            <Tooltip key={dealId} content={`${dealNames?.[dealId] ?? dealId}: ${score}`}>
              <div className={styles.comparisonScoreItem}>
                <span className={styles.comparisonDealName}>{dealNames?.[dealId] ?? dealId}</span>
                <Progress
                  percent={score}
                  color={color}
                  trailColor='var(--color-fill-2)'
                  showText={false}
                  className={styles.comparisonProgress}
                />
                <span className={styles.comparisonScoreValue} style={{ color }}>
                  {score}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RiskScoreCard({
  riskScores,
  overallScore,
  risks = [],
  isLoading = false,
  isComparison = false,
  comparisonData,
  dealName,
  onCategoryClick,
  className,
}: RiskScoreCardProps) {
  const { t } = useTranslation('ma');
  const [expandedCategories, setExpandedCategories] = useState<Set<RiskCategory>>(new Set());

  const CATEGORY_CONFIG: Record<RiskCategory, CategoryConfig> = {
    financial: {
      label: t('riskScoreCard.categories.financial.label'),
      color: '#165DFF',
      icon: <Wallet theme='filled' size='16' fill='#165DFF' />,
      description: t('riskScoreCard.categories.financial.description'),
    },
    legal: {
      label: t('riskScoreCard.categories.legal.label'),
      color: '#722ED1',
      icon: <Scale theme='filled' size='16' fill='#722ED1' />,
      description: t('riskScoreCard.categories.legal.description'),
    },
    operational: {
      label: t('riskScoreCard.categories.operational.label'),
      color: '#0FC6C2',
      icon: <Tool theme='filled' size='16' fill='#0FC6C2' />,
      description: t('riskScoreCard.categories.operational.description'),
    },
    regulatory: {
      label: t('riskScoreCard.categories.regulatory.label'),
      color: '#F53F3F',
      icon: <FileText theme='filled' size='16' fill='#F53F3F' />,
      description: t('riskScoreCard.categories.regulatory.description'),
    },
    reputational: {
      label: t('riskScoreCard.categories.reputational.label'),
      color: '#FF7D00',
      icon: <Trophy theme='filled' size='16' fill='#FF7D00' />,
      description: t('riskScoreCard.categories.reputational.description'),
    },
  };

  const SEVERITY_CONFIG: Record<RiskSeverity, { label: string; color: string }> = {
    low: { label: t('riskScoreCard.severity.low'), color: '#00B42A' },
    medium: { label: t('riskScoreCard.severity.medium'), color: '#FF7D00' },
    high: { label: t('riskScoreCard.severity.high'), color: '#F53F3F' },
    critical: { label: t('riskScoreCard.severity.critical'), color: '#722ED1' },
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 76) return t('riskScoreCard.severity.critical');
    if (score >= 51) return t('riskScoreCard.severity.high');
    if (score >= 26) return t('riskScoreCard.severity.medium');
    return t('riskScoreCard.severity.low');
  };

  const toggleCategory = useCallback((category: RiskCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleCategoryClick = useCallback(
    (category: RiskCategory) => {
      toggleCategory(category);
      onCategoryClick?.(category);
    },
    [toggleCategory, onCategoryClick]
  );

  const categories = useMemo(
    () => (Object.keys(riskScores) as RiskCategory[]).filter((c) => riskScores[c] > 0),
    [riskScores]
  );

  const calculatedOverallScore = useMemo(() => {
    if (overallScore !== undefined) return overallScore;
    if (categories.length === 0) return 0;
    const sum = categories.reduce((acc, c) => acc + riskScores[c], 0);
    return Math.round(sum / categories.length);
  }, [overallScore, categories, riskScores]);

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.loadingState}>
          <Skeleton variant='card' height='120px' />
        </div>
      </div>
    );
  }

  if (categories.length === 0 && !isComparison) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <EmptyState
          icon={<FileText size={64} />}
          title='No risk data available'
          description='Upload documents to analyze risks'
        />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header with overall score */}
      {!isComparison && (
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{t('riskScoreCard.riskAssessment')}</h3>
            {dealName && <span className={styles.dealName}>{dealName}</span>}
          </div>
          <div className={styles.overallScore}>
            <div className={styles.scoreCircle} style={{ borderColor: getScoreColor(calculatedOverallScore) }}>
              <span className={styles.scoreNumber} style={{ color: getScoreColor(calculatedOverallScore) }}>
                {calculatedOverallScore}
              </span>
              <span className={styles.scoreLabel}>{getScoreLabel(calculatedOverallScore)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Comparison header */}
      {isComparison && comparisonData && (
        <div className={styles.header}>
          <h3 className={styles.title}>{t('riskScoreCard.riskComparison')}</h3>
        </div>
      )}

      {/* Category breakdown */}
      <div className={styles.categories}>
        {!isComparison
          ? // Single deal view
            categories.map((category) => (
              <CategoryBar
                key={category}
                category={category}
                score={riskScores[category]}
                findings={risks}
                onClick={() => handleCategoryClick(category)}
                isExpanded={expandedCategories.has(category)}
                categoryConfig={CATEGORY_CONFIG}
                severityConfig={SEVERITY_CONFIG}
              />
            ))
          : comparisonData
            ? // Comparison view
              (Object.keys(CATEGORY_CONFIG) as RiskCategory[]).map((category) => (
                <ComparisonBar
                  key={category}
                  category={category}
                  comparisonData={comparisonData}
                  categoryConfig={CATEGORY_CONFIG}
                />
              ))
            : null}
      </div>

      {/* Summary stats */}
      {!isComparison && risks.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('riskScoreCard.summary.totalFindings')}</span>
            <span className={styles.summaryValue}>{risks.length}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('riskScoreCard.severity.critical')}</span>
            <span className={styles.summaryValue} style={{ color: '#722ED1' }}>
              {risks.filter((r) => r.severity === 'critical').length}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('riskScoreCard.severity.high')}</span>
            <span className={styles.summaryValue} style={{ color: '#F53F3F' }}>
              {risks.filter((r) => r.severity === 'high').length}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('riskScoreCard.severity.medium')}</span>
            <span className={styles.summaryValue} style={{ color: '#FF7D00' }}>
              {risks.filter((r) => r.severity === 'medium').length}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('riskScoreCard.severity.low')}</span>
            <span className={styles.summaryValue} style={{ color: '#00B42A' }}>
              {risks.filter((r) => r.severity === 'low').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskScoreCard;
