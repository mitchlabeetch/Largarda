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
import { Progress, Tooltip, Collapse, Empty, Spin, Tag } from '@arco-design/web-react';
import { Caution, CloseOne, Help, Attention, Success, Down, Right } from '@icon-park/react';
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
// Constants
// ============================================================================

const CATEGORY_CONFIG: Record<RiskCategory, CategoryConfig> = {
  financial: {
    label: 'Financial',
    color: '#165DFF',
    icon: <span className={styles.categoryIcon}>💰</span>,
    description: 'Risks related to financial health, revenue, and profitability',
  },
  legal: {
    label: 'Legal',
    color: '#722ED1',
    icon: <span className={styles.categoryIcon}>⚖️</span>,
    description: 'Risks related to litigation, contracts, and legal compliance',
  },
  operational: {
    label: 'Operational',
    color: '#0FC6C2',
    icon: <span className={styles.categoryIcon}>⚙️</span>,
    description: 'Risks related to business operations and key personnel',
  },
  regulatory: {
    label: 'Regulatory',
    color: '#F53F3F',
    icon: <span className={styles.categoryIcon}>📋</span>,
    description: 'Risks related to regulatory compliance and permits',
  },
  reputational: {
    label: 'Reputational',
    color: '#FF7D00',
    icon: <span className={styles.categoryIcon}>🏆</span>,
    description: 'Risks related to brand reputation and public perception',
  },
};

const SEVERITY_CONFIG: Record<RiskSeverity, { label: string; color: string }> = {
  low: { label: 'Low', color: '#00B42A' },
  medium: { label: 'Medium', color: '#FF7D00' },
  high: { label: 'High', color: '#F53F3F' },
  critical: { label: 'Critical', color: '#722ED1' },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 76) return '#722ED1'; // Critical
  if (score >= 51) return '#F53F3F'; // High
  if (score >= 26) return '#FF7D00'; // Medium
  return '#00B42A'; // Low
}

function getScoreLabel(score: number): string {
  if (score >= 76) return 'Critical';
  if (score >= 51) return 'High';
  if (score >= 26) return 'Medium';
  return 'Low';
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
}

function CategoryBar({ category, score, findings, onClick, isExpanded }: CategoryBarProps) {
  const config = CATEGORY_CONFIG[category];
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
                <Tag size='small' color={SEVERITY_CONFIG[finding.severity].color}>
                  {SEVERITY_CONFIG[finding.severity].label}
                </Tag>
              </div>
              <p className={styles.findingDescription}>{finding.description}</p>
              {finding.recommendation && <p className={styles.findingRecommendation}>💡 {finding.recommendation}</p>}
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
}

function ComparisonBar({ category, comparisonData, dealNames }: ComparisonBarProps) {
  const config = CATEGORY_CONFIG[category];
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
  const [expandedCategories, setExpandedCategories] = useState<Set<RiskCategory>>(new Set());

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
          <Spin />
          <span>Analyzing risks...</span>
        </div>
      </div>
    );
  }

  if (categories.length === 0 && !isComparison) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <Empty description='No risk data available' />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header with overall score */}
      {!isComparison && (
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>Risk Assessment</h3>
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
          <h3 className={styles.title}>Risk Comparison</h3>
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
              />
            ))
          : comparisonData
            ? // Comparison view
              (Object.keys(CATEGORY_CONFIG) as RiskCategory[]).map((category) => (
                <ComparisonBar key={category} category={category} comparisonData={comparisonData} />
              ))
            : null}
      </div>

      {/* Summary stats */}
      {!isComparison && risks.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total Findings</span>
            <span className={styles.summaryValue}>{risks.length}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Critical</span>
            <span className={styles.summaryValue} style={{ color: '#722ED1' }}>
              {risks.filter((r) => r.severity === 'critical').length}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>High</span>
            <span className={styles.summaryValue} style={{ color: '#F53F3F' }}>
              {risks.filter((r) => r.severity === 'high').length}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Medium</span>
            <span className={styles.summaryValue} style={{ color: '#FF7D00' }}>
              {risks.filter((r) => r.severity === 'medium').length}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Low</span>
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
