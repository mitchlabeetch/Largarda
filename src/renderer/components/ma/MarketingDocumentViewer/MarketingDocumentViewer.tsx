/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MarketingDocumentViewer Component
 *
 * Displays generated marketing documents (teaser, IM) with reviewable
 * structure, provenance metadata, and document lifecycle actions.
 *
 * Features:
 * - Section-by-section navigation and review
 * - Provenance integrity verification
 * - Review status workflow (generated → reviewing → approved/rejected)
 * - Export preparation
 * - Structure validation display
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Tabs, Tag, Tooltip, Badge, Alert, Modal } from '@arco-design/web-react';
import {
  FileText,
  CheckOne,
  CloseOne,
  History,
  Download,
  Shield,
  Info,
  Eyes,
  FileSuccess,
  Right,
} from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { Skeleton, EmptyState } from '@/renderer/components/base';
import MarkdownRenderer from '@/renderer/components/Markdown';
import type { GeneratedDocument, DocumentReviewStatus } from '@/common/ma/template/review';
import type { TemplateKey } from '@/common/ma/template/types';
import {
  validateDocumentStructure,
  formatValidationReport,
  type StructureValidationResult,
} from '@/common/ma/template/structureValidator';
import styles from './MarketingDocumentViewer.module.css';

const TabPane = Tabs.TabPane;

// ============================================================================
// Types
// ============================================================================

export interface MarketingDocumentViewerProps {
  /** The generated document to display */
  document: GeneratedDocument | null;
  /** Whether document is loading */
  isLoading?: boolean;
  /** Callback when review status changes */
  onReviewStatusChange?: (status: DocumentReviewStatus, comments?: string) => void;
  /** Callback when export is requested */
  onExport?: (format: 'markdown' | 'docx' | 'pdf') => void;
  /** Custom class name */
  className?: string;
}

export type DocumentSection = {
  id: string;
  title: string;
  content: string;
  level: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

function extractSections(content: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = content.split('\n');
  let currentSection: DocumentSection | null = null;
  let sectionContent: string[] = [];

  for (const line of lines) {
    // Match markdown headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = sectionContent.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      currentSection = {
        id: `section-${sections.length}`,
        title,
        content: '',
        level,
      };
      sectionContent = [];
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = sectionContent.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

function stripProvenanceLabel(content: string): string {
  return content.replace(/\n---\nlargo-provenance:\n[\s\S]*?\n---$/, '');
}

function getStatusConfig(status: DocumentReviewStatus): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'generated':
      return {
        label: 'Generated',
        color: 'var(--info)',
        icon: <FileText theme='filled' />,
      };
    case 'reviewing':
      return {
        label: 'Under Review',
        color: 'var(--warning)',
        icon: <Eyes theme='filled' />,
      };
    case 'approved':
      return {
        label: 'Approved',
        color: 'var(--success)',
        icon: <CheckOne theme='filled' />,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        color: 'var(--danger)',
        icon: <CloseOne theme='filled' />,
      };
    case 'exported':
      return {
        label: 'Exported',
        color: 'var(--primary)',
        icon: <FileSuccess theme='filled' />,
      };
    default:
      return {
        label: 'Unknown',
        color: 'var(--text-3)',
        icon: <Info theme='filled' />,
      };
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SectionNavigatorProps {
  sections: DocumentSection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
  validationResult: StructureValidationResult | null;
}

function SectionNavigator({ sections, activeSection, onSectionClick, validationResult }: SectionNavigatorProps) {
  const { t } = useTranslation('ma');

  return (
    <div className={styles.sectionNavigator}>
      <h4 className={styles.navigatorTitle}>{t('marketingDocument.sections')}</h4>
      <ul className={styles.sectionList}>
        {sections.map((section) => (
          <li
            key={section.id}
            className={`${styles.sectionItem} ${activeSection === section.id ? styles.active : ''}`}
            style={{ paddingLeft: `${(section.level - 1) * 16}px` }}
          >
            <Button
              type='text'
              size='small'
              onClick={() => onSectionClick(section.id)}
              className={styles.sectionButton}
            >
              <Right size={12} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>{section.title}</span>
            </Button>
          </li>
        ))}
      </ul>

      {validationResult && (
        <div className={styles.validationSummary}>
          <h4 className={styles.navigatorTitle}>{t('marketingDocument.structure')}</h4>
          <div className={styles.validationMetrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('marketingDocument.sectionsFound')}</span>
              <Badge
                count={validationResult.metadata.sectionCount}
                style={{ background: validationResult.metadata.sectionCount > 0 ? 'var(--success)' : 'var(--warning)' }}
              />
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('marketingDocument.wordCount')}</span>
              <span className={styles.metricValue}>{validationResult.metadata.wordCount}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('marketingDocument.provenance')}</span>
              {validationResult.metadata.hasProvenance ? (
                <Shield theme='filled' size={16} style={{ fill: 'var(--success)' }} />
              ) : (
                <Info theme='filled' size={16} style={{ fill: 'var(--warning)' }} />
              )}
            </div>
          </div>
          {!validationResult.valid && (
            <Alert
              type='error'
              className={styles.validationAlert}
              content={t('marketingDocument.structureIssues', { count: validationResult.errors.length })}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ProvenancePanelProps {
  document: GeneratedDocument;
}

function ProvenancePanel({ document }: ProvenancePanelProps) {
  const { t } = useTranslation('ma');
  const { provenance } = document;

  return (
    <div className={styles.provenancePanel}>
      <h4 className={styles.panelTitle}>
        <Shield theme='filled' size={16} style={{ fill: 'var(--primary)' }} />
        {t('marketingDocument.provenanceTitle')}
      </h4>
      <dl className={styles.provenanceList}>
        <dt>{t('marketingDocument.template')}</dt>
        <dd>{document.templateKey}</dd>

        <dt>{t('marketingDocument.flowId')}</dt>
        <dd className={styles.codeValue}>{provenance.flowId}</dd>

        <dt>{t('marketingDocument.promptVersion')}</dt>
        <dd className={styles.codeValue}>{provenance.promptVersionId}</dd>

        <dt>{t('marketingDocument.generatedAt')}</dt>
        <dd>{new Date(provenance.completedAt).toLocaleString()}</dd>

        <dt>{t('marketingDocument.duration')}</dt>
        <dd>{t('marketingDocument.durationMs', { ms: provenance.durationMs })}</dd>

        <dt>{t('marketingDocument.contentHash')}</dt>
        <dd className={styles.codeValue} title={provenance.contentHash}>
          {provenance.contentHash.substring(0, 16)}...
        </dd>
      </dl>
    </div>
  );
}

interface ReviewActionsProps {
  status: DocumentReviewStatus;
  onStatusChange: (status: DocumentReviewStatus, comments?: string) => void;
}

function ReviewActions({ status, onStatusChange }: ReviewActionsProps) {
  const { t } = useTranslation('ma');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  const handleApprove = useCallback(() => {
    onStatusChange('approved');
  }, [onStatusChange]);

  const handleReject = useCallback(() => {
    setShowRejectModal(true);
  }, []);

  const confirmReject = useCallback(() => {
    onStatusChange('rejected', rejectComments);
    setShowRejectModal(false);
    setRejectComments('');
  }, [onStatusChange, rejectComments]);

  const handleStartReview = useCallback(() => {
    onStatusChange('reviewing');
  }, [onStatusChange]);

  return (
    <>
      <div className={styles.reviewActions}>
        {status === 'generated' && (
          <Button type='primary' onClick={handleStartReview}>
            <Eyes theme='filled' />
            {t('marketingDocument.startReview')}
          </Button>
        )}

        {status === 'reviewing' && (
          <>
            <Button type='primary' status='success' onClick={handleApprove}>
              <CheckOne theme='filled' />
              {t('marketingDocument.approve')}
            </Button>
            <Button status='danger' onClick={handleReject}>
              <CloseOne theme='filled' />
              {t('marketingDocument.reject')}
            </Button>
          </>
        )}

        {(status === 'approved' || status === 'rejected') && (
          <Button type='secondary' onClick={handleStartReview}>
            <History theme='filled' />
            {t('marketingDocument.reopenReview')}
          </Button>
        )}
      </div>

      <Modal
        title={t('marketingDocument.rejectReason')}
        visible={showRejectModal}
        onOk={confirmReject}
        onCancel={() => setShowRejectModal(false)}
        okText={t('marketingDocument.confirmReject')}
      >
        <textarea
          className={styles.rejectTextarea}
          placeholder={t('marketingDocument.rejectPlaceholder')}
          value={rejectComments}
          onChange={(e) => setRejectComments(e.target.value)}
          rows={4}
        />
      </Modal>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MarketingDocumentViewer({
  document,
  isLoading = false,
  onReviewStatusChange,
  onExport,
  className,
}: MarketingDocumentViewerProps) {
  const { t } = useTranslation('ma');
  const [activeTab, setActiveTab] = useState('preview');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Extract sections and content without provenance
  const { sections, displayContent } = useMemo(() => {
    if (!document) return { sections: [], displayContent: '' };
    const content = stripProvenanceLabel(document.content);
    return {
      sections: extractSections(content),
      displayContent: content,
    };
  }, [document]);

  // Validate structure
  const validationResult = useMemo(() => {
    if (!document) return null;
    return validateDocumentStructure(document.content, document.templateKey);
  }, [document]);

  // Status configuration
  const statusConfig = useMemo(() => {
    if (!document) return null;
    return getStatusConfig(document.reviewStatus);
  }, [document]);

  // Handle section navigation
  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const element = window.document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle export
  const handleExport = useCallback(
    (format: 'markdown' | 'docx' | 'pdf') => {
      onExport?.(format);
    },
    [onExport]
  );

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.loadingState}>
          <Skeleton variant='card' height='600px' />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <EmptyState
          icon={<FileText size={64} />}
          title='marketingDocument.noDocument'
          description='marketingDocument.generatePrompt'
          i18nNs='ma'
        />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.documentTitle}>
            {document.templateKey === 'tpl.teaser'
              ? t('marketingDocument.teaserTitle')
              : t('marketingDocument.imTitle')}
          </h2>
          {statusConfig && (
            <Tag color={statusConfig.color} icon={statusConfig.icon} className={styles.statusTag}>
              {statusConfig.label}
            </Tag>
          )}
        </div>
        <div className={styles.headerRight}>
          {validationResult && !validationResult.valid && (
            <Tooltip content={t('marketingDocument.validationFailed')}>
              <Button
                type='text'
                status='warning'
                icon={<Info theme='filled' />}
                onClick={() => setShowValidationDetails(true)}
              />
            </Tooltip>
          )}
          <Button.Group>
            <Button type='secondary' icon={<Download theme='filled' />} onClick={() => handleExport('markdown')}>
              Markdown
            </Button>
            <Button type='secondary' onClick={() => handleExport('docx')}>
              DOCX
            </Button>
            <Button type='secondary' onClick={() => handleExport('pdf')}>
              PDF
            </Button>
          </Button.Group>
        </div>
      </div>

      {/* Main content */}
      <div className={styles.mainContent}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <SectionNavigator
            sections={sections}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            validationResult={validationResult}
          />
          <ProvenancePanel document={document} />
        </aside>

        {/* Document content */}
        <div className={styles.documentArea}>
          <Tabs activeTab={activeTab} onChange={setActiveTab} className={styles.tabs}>
            <TabPane key='preview' title={t('marketingDocument.preview')}>
              <div className={styles.documentContent}>
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <div
                      key={section.id}
                      id={section.id}
                      className={`${styles.section} ${activeSection === section.id ? styles.highlighted : ''}`}
                    >
                      <MarkdownRenderer>
                        {`${'#'.repeat(section.level)} ${section.title}\n\n${section.content}`}
                      </MarkdownRenderer>
                    </div>
                  ))
                ) : (
                  <MarkdownRenderer>{displayContent}</MarkdownRenderer>
                )}
              </div>
            </TabPane>

            <TabPane key='source' title={t('marketingDocument.source')}>
              <pre className={styles.sourceView}>{document.content}</pre>
            </TabPane>

            <TabPane key='validation' title={t('marketingDocument.validation')}>
              {validationResult && (
                <div className={styles.validationView}>
                  <Alert
                    type={validationResult.valid ? 'success' : 'error'}
                    title={
                      validationResult.valid
                        ? t('marketingDocument.validStructure')
                        : t('marketingDocument.invalidStructure')
                    }
                    content={formatValidationReport(validationResult)}
                  />
                </div>
              )}
            </TabPane>
          </Tabs>

          {/* Review actions */}
          {onReviewStatusChange && (
            <div className={styles.actionBar}>
              <ReviewActions status={document.reviewStatus} onStatusChange={onReviewStatusChange} />
            </div>
          )}
        </div>
      </div>

      {/* Validation details modal */}
      <Modal
        title={t('marketingDocument.validationDetails')}
        visible={showValidationDetails}
        onOk={() => setShowValidationDetails(false)}
        onCancel={() => setShowValidationDetails(false)}
        okText={t('common.close')}
        cancelText={null}
      >
        {validationResult && <pre className={styles.validationReport}>{formatValidationReport(validationResult)}</pre>}
      </Modal>
    </div>
  );
}

export default MarketingDocumentViewer;
