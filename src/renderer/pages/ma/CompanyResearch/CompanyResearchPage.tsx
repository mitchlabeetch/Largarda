/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CompanyResearchPage Component
 * Research-friendly company page that surfaces Wave 5 data spine with
 * provenance, freshness, and source attribution.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, Typography, Tag, Space, Button, Descriptions, Empty, Spin } from '@arco-design/web-react';
import { Search, Refresh, Info, Check, CloseOne, Attention } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useCompanyEnrichment } from '@renderer/hooks/ma/useCompanyEnrichment';
import type { Company } from '@/common/ma/company/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';
import styles from './CompanyResearchPage.module.css';

const { Title, Text } = Typography;

interface ProvenanceData {
  source: string;
  fetchedAt: number;
  upstreamVersion?: string;
  etag?: string;
  freshnessTtlMs?: number;
  policy: 'canonical' | 'supplementary' | 'override';
}

interface CompanyResearchPageProps {
  companyId?: string;
  siren?: string;
}

const FRESHNESS_CONFIG: Record<FreshnessStatus, { color: string; icon: React.ReactNode; label: string }> = {
  fresh: { color: 'var(--success)', icon: <Check />, label: 'companyResearch.freshness.fresh' },
  stale: { color: 'var(--warning)', icon: <Attention />, label: 'companyResearch.freshness.stale' },
  expired: { color: 'var(--danger)', icon: <CloseOne />, label: 'companyResearch.freshness.expired' },
  unknown: { color: 'var(--text-tertiary)', icon: <Info />, label: 'companyResearch.freshness.unknown' },
};

function ProvenanceCard({ company }: { company: Company }) {
  const { t } = useTranslation('ma');

  const provenance = useMemo<ProvenanceData | null>(() => {
    if (!company.provenanceJson) return null;
    try {
      return JSON.parse(company.provenanceJson);
    } catch {
      return null;
    }
  }, [company.provenanceJson]);

  const sources = useMemo(() => {
    if (!company.sourcesJson) return [];
    try {
      return JSON.parse(company.sourcesJson);
    } catch {
      return [];
    }
  }, [company.sourcesJson]);

  const freshnessConfig = FRESHNESS_CONFIG[company.freshness ?? 'unknown'];

  if (!provenance && sources.length === 0) {
    return (
      <Card className={styles.card} title={t('companyResearch.provenance.title')}>
        <Empty description={t('companyResearch.provenance.empty')} />
      </Card>
    );
  }

  return (
    <Card className={styles.card} title={t('companyResearch.provenance.title')}>
      {company.freshness && (
        <div className={styles.freshnessSection}>
          <Space>
            <span style={{ color: freshnessConfig.color }}>{freshnessConfig.icon}</span>
            <Text>{t(freshnessConfig.label)}</Text>
          </Space>
          {company.lastEnrichedAt && (
            <Text type='secondary' className={styles.enrichedAt}>
              {t('companyResearch.provenance.enrichedAt')}: {new Date(company.lastEnrichedAt).toLocaleString()}
            </Text>
          )}
        </div>
      )}

      {provenance && (
        <div className={styles.provenanceDetails}>
          <Descriptions
            column={1}
            size='small'
            data={[
              {
                label: t('companyResearch.provenance.source'),
                value: provenance.source,
              },
              ...(provenance.upstreamVersion
                ? [
                    {
                      label: t('companyResearch.provenance.version'),
                      value: provenance.upstreamVersion,
                    },
                  ]
                : []),
              ...(provenance.policy
                ? [
                    {
                      label: t('companyResearch.provenance.policy'),
                      value: (
                        <Tag color={provenance.policy === 'canonical' ? 'green' : 'blue'}>{provenance.policy}</Tag>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}

      {sources.length > 0 && (
        <div className={styles.sourcesList}>
          <Text className={styles.sourcesTitle}>{t('companyResearch.provenance.sources')}</Text>
          <div className={styles.sourceTags}>
            {sources.map((source: string, index: number) => (
              <Tag key={index} color='arcoblue'>
                {source}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function CompanyProfileCard({ company }: { company: Company }) {
  const { t } = useTranslation('ma');

  const data = [
    { label: t('company.siren'), value: company.siren },
    ...(company.siret ? [{ label: t('company.siret'), value: company.siret }] : []),
    {
      label: t('company.legalForm'),
      value: company.legalForm || t('companyResearch.profile.unknown'),
    },
    ...(company.nafCode ? [{ label: t('company.nafCode'), value: company.nafCode }] : []),
    ...(company.sectorId ? [{ label: t('companyResearch.profile.sector'), value: company.sectorId }] : []),
    ...(company.jurisdiction
      ? [{ label: t('companyResearch.profile.jurisdiction'), value: company.jurisdiction }]
      : []),
    ...(company.headquartersAddress
      ? [{ label: t('companyResearch.profile.headquarters'), value: company.headquartersAddress }]
      : []),
    ...(company.registeredAt
      ? [
          {
            label: t('companyResearch.profile.registeredAt'),
            value: new Date(company.registeredAt).toLocaleDateString(),
          },
        ]
      : []),
    ...(company.employeeCount !== undefined
      ? [{ label: t('company.workforce'), value: company.employeeCount.toString() }]
      : []),
    ...(company.revenue !== undefined
      ? [{ label: t('companyResearch.profile.revenue'), value: company.revenue.toLocaleString() + ' €' }]
      : []),
  ];

  return (
    <Card className={styles.card} title={t('companyResearch.profile.title')}>
      <Descriptions column={2} size='small' data={data} />
    </Card>
  );
}

export function CompanyResearchPage({ companyId, siren }: CompanyResearchPageProps) {
  const { t } = useTranslation('ma');
  const { enrichCompany, enrichBySiren, enrichedCompany, isEnriching, error, clear } = useCompanyEnrichment();
  const [company, setCompany] = useState<Company | null>(null);

  const loadCompany = useCallback(async () => {
    clear();
    let result: Company | null = null;
    if (companyId) {
      result = await enrichCompany(companyId);
    } else if (siren) {
      result = await enrichBySiren(siren);
    }
    setCompany(result);
  }, [companyId, siren, enrichCompany, enrichBySiren, clear]);

  React.useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleRefresh = useCallback(async () => {
    await loadCompany();
  }, [loadCompany]);

  if (isEnriching) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Spin size={30} />
          <Text>{t('companyResearch.loading')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Card className={styles.errorCard}>
          <Space direction='vertical' size='medium'>
            <Text type='error'>{error}</Text>
            <Button icon={<Refresh />} onClick={handleRefresh}>
              {t('companyResearch.actions.retry')}
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (!company && !enrichedCompany) {
    return (
      <div className={styles.container}>
        <Empty description={t('companyResearch.empty.noCompany')} />
      </div>
    );
  }

  const displayCompany = company || enrichedCompany;

  if (!displayCompany) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Title heading={4}>{displayCompany.name}</Title>
          <Text type='secondary'>{t('companyResearch.title')}</Text>
        </div>
        <div className={styles.actions}>
          <Button icon={<Refresh />} onClick={handleRefresh}>
            {t('companyResearch.actions.refresh')}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <CompanyProfileCard company={displayCompany} />
        <ProvenanceCard company={displayCompany} />
      </div>
    </div>
  );
}

export default CompanyResearchPage;
