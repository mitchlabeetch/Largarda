/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DailyBriefPage Component
 * Displays navigable, traceable daily brief with full provenance.
 * Part of Wave 10 / Batch 10C.
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Spin,
  Empty,
  Radio,
  Space,
  Button,
  Badge,
  Timeline,
  Tooltip,
  Tag,
} from '@arco-design/web-react';
import {
  Refresh,
  FileText,
  Check as CheckIcon,
  Caution as WarningIcon,
  Briefcase,
  LinkOne as LinkIcon,
  Time,
  ActivitySource,
} from '@icon-park/react';
import { useDailyBrief } from '@renderer/hooks/ma/useDailyBrief';
import type { DailyBrief, BriefItem, BriefTimeWindow } from '@/common/ma/types';
import styles from './DailyBriefPage.module.css';

const { Title, Text, Paragraph } = Typography;
const RadioGroup = Radio.Group;

interface BriefItemIconProps {
  type: BriefItem['type'];
}

const BriefItemIcon: React.FC<BriefItemIconProps> = ({ type }) => {
  switch (type) {
    case 'deal_created':
      return <Briefcase className={styles.iconDeal} />;
    case 'document_uploaded':
      return <FileText className={styles.iconDocument} />;
    case 'document_processed':
      return <CheckIcon className={styles.iconSuccess} />;
    case 'analysis_completed':
      return <ActivitySource className={styles.iconAnalysis} />;
    case 'risk_found':
      return <WarningIcon className={styles.iconRisk} />;
    case 'integration_connected':
      return <LinkIcon className={styles.iconIntegration} />;
    case 'sync_completed':
      return <CheckIcon className={styles.iconSync} />;
    default:
      return <Time className={styles.iconDefault} />;
  }
};

interface BriefItemTagProps {
  type: BriefItem['type'];
}

const BriefItemTag: React.FC<BriefItemTagProps> = ({ type }) => {
  const { t } = useTranslation('dashboard');

  switch (type) {
    case 'deal_created':
      return <Tag color='blue'>{t('brief.itemType.dealCreated')}</Tag>;
    case 'document_uploaded':
      return <Tag color='cyan'>{t('brief.itemType.documentUploaded')}</Tag>;
    case 'document_processed':
      return <Tag color='green'>{t('brief.itemType.documentProcessed')}</Tag>;
    case 'analysis_completed':
      return <Tag color='purple'>{t('brief.itemType.analysisCompleted')}</Tag>;
    case 'risk_found':
      return <Tag color='red'>{t('brief.itemType.riskFound')}</Tag>;
    case 'integration_connected':
      return <Tag color='orange'>{t('brief.itemType.integrationConnected')}</Tag>;
    case 'sync_completed':
      return <Tag color='green'>{t('brief.itemType.syncCompleted')}</Tag>;
    default:
      return <Tag>{t('brief.itemType.unknown')}</Tag>;
  }
};

interface BriefSummaryCardProps {
  brief: DailyBrief;
}

const BriefSummaryCard: React.FC<BriefSummaryCardProps> = ({ brief }) => {
  const { t } = useTranslation('dashboard');
  const { summary } = brief;

  return (
    <div className={styles.summaryGrid}>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryItem}>
          <Text className={styles.summaryLabel}>{t('brief.summary.deals')}</Text>
          <div className={styles.summaryValue}>
            <Badge count={summary.activeDeals} className={styles.badge}>
              <Text className={styles.summaryNumber}>{summary.totalDeals}</Text>
            </Badge>
            <Text className={styles.summarySubtext}>{t('brief.summary.active')}</Text>
          </div>
        </div>
      </Card>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryItem}>
          <Text className={styles.summaryLabel}>{t('brief.summary.documents')}</Text>
          <div className={styles.summaryValue}>
            <Text className={styles.summaryNumber}>{summary.documentsUploaded}</Text>
            <Text className={styles.summarySubtext}>
              {t('brief.summary.processed', { count: summary.documentsProcessed })}
            </Text>
          </div>
        </div>
      </Card>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryItem}>
          <Text className={styles.summaryLabel}>{t('brief.summary.analyses')}</Text>
          <div className={styles.summaryValue}>
            <Text className={styles.summaryNumber}>{summary.analysesCompleted}</Text>
          </div>
        </div>
      </Card>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryItem}>
          <Text className={styles.summaryLabel}>{t('brief.summary.risks')}</Text>
          <div className={styles.summaryValue}>
            <Badge count={summary.risksIdentified} status={summary.risksIdentified > 0 ? 'error' : 'success'}>
              <Text className={styles.summaryNumber}>{summary.risksIdentified}</Text>
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

interface BriefItemRowProps {
  item: BriefItem;
  onNavigate: (path: string) => void;
}

const BriefItemRow: React.FC<BriefItemRowProps> = ({ item, onNavigate }) => {
  const { t } = useTranslation('dashboard');

  const handleClick = useCallback(() => {
    onNavigate(item.provenance.drillDownPath);
  }, [item.provenance.drillDownPath, onNavigate]);

  const timeAgo = useMemo(() => {
    const now = Date.now();
    const diff = now - item.timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) {
      return t('brief.time.justNow');
    } else if (hours < 24) {
      return t('brief.time.hoursAgo', { count: hours });
    } else {
      return t('brief.time.daysAgo', { count: days });
    }
  }, [item.timestamp, t]);

  return (
    <Timeline.Item className={styles.timelineItem} label={<Text className={styles.timeLabel}>{timeAgo}</Text>}>
      <div className={styles.itemContent} onClick={handleClick} role='button' tabIndex={0}>
        <div className={styles.itemHeader}>
          <Space size='small'>
            <BriefItemIcon type={item.type} />
            <Text className={styles.itemTitle}>{item.title}</Text>
            <BriefItemTag type={item.type} />
          </Space>
        </div>
        <Paragraph className={styles.itemDescription}>{item.description}</Paragraph>
        {item.dealName && (
          <Text className={styles.itemDeal} type='secondary'>
            {t('brief.itemDeal', { name: item.dealName })}
          </Text>
        )}
        <Tooltip content={t('brief.provenanceTooltip')}>
          <div className={styles.provenance}>
            <LinkIcon className={styles.provenanceIcon} />
            <Text className={styles.provenanceText} type='secondary'>
              {item.provenance.sourceName}
            </Text>
          </div>
        </Tooltip>
      </div>
    </Timeline.Item>
  );
};

interface BriefTimelineProps {
  items: BriefItem[];
  onNavigate: (path: string) => void;
}

const BriefTimeline: React.FC<BriefTimelineProps> = ({ items, onNavigate }) => {
  const { t } = useTranslation('dashboard');

  if (items.length === 0) {
    return <Empty description={t('brief.empty.noActivity')} className={styles.empty} />;
  }

  return (
    <Timeline className={styles.timeline}>
      {items.map((item) => (
        <BriefItemRow key={item.id} item={item} onNavigate={onNavigate} />
      ))}
    </Timeline>
  );
};

const DailyBriefPage: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { brief, isLoadingBrief, briefError, timeWindow, setTimeWindow, refreshBrief } = useDailyBrief({
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const handleTimeWindowChange = useCallback(
    (value: BriefTimeWindow) => {
      setTimeWindow(value);
    },
    [setTimeWindow]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  if (isLoadingBrief && !brief) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size={40} tip={t('brief.loading')} />
      </div>
    );
  }

  if (briefError) {
    return (
      <div className={styles.errorContainer}>
        <Card>
          <Empty description={t('brief.error', { message: briefError.message })} />
          <div className={styles.errorActions}>
            <Button type='primary' onClick={refreshBrief}>
              {t('brief.retry')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title heading={4} className={styles.title}>
          {t('brief.title')}
        </Title>
        <Space size='medium'>
          <RadioGroup
            type='button'
            value={timeWindow}
            onChange={handleTimeWindowChange}
            options={[
              { label: t('brief.timeWindow.24h'), value: '24h' },
              { label: t('brief.timeWindow.7d'), value: '7d' },
              { label: t('brief.timeWindow.30d'), value: '30d' },
            ]}
          />
          <Button icon={<Refresh />} onClick={refreshBrief} loading={isLoadingBrief}>
            {t('brief.refresh')}
          </Button>
        </Space>
      </div>

      {brief && (
        <>
          <BriefSummaryCard brief={brief} />

          <Card className={styles.timelineCard}>
            <div className={styles.timelineHeader}>
              <Title heading={6}>{t('brief.activityTimeline')}</Title>
              <Text type='secondary'>
                {t('brief.generatedAt', {
                  time: new Date(brief.generatedAt).toLocaleString(),
                })}
              </Text>
            </div>
            <BriefTimeline items={brief.items} onNavigate={handleNavigate} />
          </Card>
        </>
      )}
    </div>
  );
};

export default DailyBriefPage;
