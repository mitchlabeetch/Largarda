/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SectorResearchPage Component
 * Research-friendly sector page that displays sector catalogue and
 * company data with provenance, freshness, and source attribution.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, Typography, Tag, Space, Button, Input, Select, Empty, Table } from '@arco-design/web-react';
import { Search, Folder, Info } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { SECTORS, resolveSectorFromNaf } from '@/common/ma/sector/catalogue';
import type { MaSector, MaSectorId } from '@/common/ma/sector/types';
import styles from './SectorResearchPage.module.css';

const { Title, Text } = Typography;
const { Search: SearchInput } = Input;

interface SectorCompany {
  id: string;
  siren: string;
  name: string;
  nafCode?: string;
  freshness?: 'fresh' | 'stale' | 'expired' | 'unknown';
  lastEnrichedAt?: number;
}

function SectorCard({
  sector,
  onClick,
  isSelected,
}: {
  sector: MaSector;
  onClick: (id: MaSectorId) => void;
  isSelected: boolean;
}) {
  const { t } = useTranslation('ma');
  const { i18n } = useTranslation();

  return (
    <Card
      className={`${styles.sectorCard} ${isSelected ? styles.selected : ''}`}
      hoverable
      onClick={() => onClick(sector.id)}
    >
      <Space direction='vertical' size='small' style={{ width: '100%' }}>
        <div className={styles.sectorHeader}>
          <Folder className={styles.sectorIcon} />
          <Text className={styles.sectorName}>{i18n.language.startsWith('fr') ? sector.labelFr : sector.labelEn}</Text>
        </div>
        <Text type='secondary' className={styles.sectorId}>
          {sector.id}
        </Text>
        {sector.nafPrefixes.length > 0 && (
          <div className={styles.nafPrefixes}>
            <Text type='secondary' className={styles.nafLabel}>
              {t('sectorResearch.nafPrefixes')}:
            </Text>
            <div className={styles.nafTags}>
              {sector.nafPrefixes.slice(0, 4).map((prefix) => (
                <Tag key={prefix} size='small'>
                  {prefix}
                </Tag>
              ))}
              {sector.nafPrefixes.length > 4 && <Tag size='small'>+{sector.nafPrefixes.length - 4}</Tag>}
            </div>
          </div>
        )}
        {sector.ruleOfThumb && (
          <Tag color='green' className={styles.ruleOfThumbTag}>
            {t('sectorResearch.ruleOfThumb')}: {sector.ruleOfThumb}
          </Tag>
        )}
      </Space>
    </Card>
  );
}

function CompanyTable({ companies }: { companies: SectorCompany[] }) {
  const { t } = useTranslation('ma');

  const columns = [
    {
      title: t('sectorResearch.companies.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: t('company.siren'),
      dataIndex: 'siren',
      key: 'siren',
      width: 120,
      render: (siren: string) => <Text code>{siren}</Text>,
    },
    {
      title: t('company.nafCode'),
      dataIndex: 'nafCode',
      key: 'nafCode',
      width: 100,
      render: (nafCode?: string) => (nafCode ? <Text code>{nafCode}</Text> : <Text type='secondary'>-</Text>),
    },
    {
      title: t('companyResearch.freshness.title'),
      dataIndex: 'freshness',
      key: 'freshness',
      width: 100,
      render: (freshness?: 'fresh' | 'stale' | 'expired' | 'unknown') => {
        if (!freshness) return <Text type='secondary'>-</Text>;
        const colors = {
          fresh: 'green',
          stale: 'orange',
          expired: 'red',
          unknown: 'gray',
        };
        return <Tag color={colors[freshness]}>{t(`companyResearch.freshness.${freshness}`)}</Tag>;
      },
    },
    {
      title: t('companyResearch.provenance.enrichedAt'),
      dataIndex: 'lastEnrichedAt',
      key: 'lastEnrichedAt',
      width: 150,
      render: (timestamp?: number) => {
        if (!timestamp) return <Text type='secondary'>-</Text>;
        return <Text type='secondary'>{new Date(timestamp).toLocaleDateString()}</Text>;
      },
    },
  ];

  if (companies.length === 0) {
    return (
      <div className={styles.emptyCompanies}>
        <Empty description={t('sectorResearch.companies.empty')} />
      </div>
    );
  }

  return <Table columns={columns} data={companies} pagination={{ pageSize: 10 }} size='small' rowKey='id' />;
}

export function SectorResearchPage() {
  const { t } = useTranslation('ma');
  const [selectedSectorId, setSelectedSectorId] = useState<MaSectorId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nafFilter, setNafFilter] = useState<string>('');

  const filteredSectors = useMemo(() => {
    return SECTORS.filter((sector) => {
      const matchesSearch =
        searchQuery === '' ||
        sector.labelFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sector.labelEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sector.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesNaf = nafFilter === '' || sector.nafPrefixes.some((prefix) => prefix.startsWith(nafFilter));

      return matchesSearch && matchesNaf;
    });
  }, [searchQuery, nafFilter]);

  const selectedSector = useMemo(() => {
    if (!selectedSectorId) return null;
    return SECTORS.find((s) => s.id === selectedSectorId) || null;
  }, [selectedSectorId]);

  const mockCompanies = useMemo<SectorCompany[]>(() => {
    if (!selectedSector) return [];
    // Mock data for demonstration - in production this would come from the data spine
    return [
      {
        id: '1',
        siren: '123456789',
        name: 'Example Company SAS',
        nafCode: selectedSector.nafPrefixes[0] || undefined,
        freshness: 'fresh',
        lastEnrichedAt: Date.now() - 86400000,
      },
      {
        id: '2',
        siren: '987654321',
        name: 'Another Company SA',
        nafCode: selectedSector.nafPrefixes[0] ? `${selectedSector.nafPrefixes[0]}A` : undefined,
        freshness: 'stale',
        lastEnrichedAt: Date.now() - 604800000,
      },
    ];
  }, [selectedSector]);

  const handleSectorSelect = useCallback((sectorId: MaSectorId) => {
    setSelectedSectorId(sectorId);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedSectorId(null);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Title heading={4}>{t('sectorResearch.title')}</Title>
          <Text type='secondary'>{t('sectorResearch.description')}</Text>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.filters}>
          <Space size='medium'>
            <SearchInput
              placeholder={t('sectorResearch.searchPlaceholder')}
              value={searchQuery}
              onChange={setSearchQuery}
              style={{ width: 300 }}
              allowClear
            />
            <Input
              placeholder={t('sectorResearch.nafFilterPlaceholder')}
              value={nafFilter}
              onChange={setNafFilter}
              style={{ width: 150 }}
              allowClear
            />
          </Space>
        </div>

        <div className={styles.mainLayout}>
          <div className={styles.sectorList}>
            <div className={styles.sectionHeader}>
              <Title heading={5}>{t('sectorResearch.sectorsList')}</Title>
              <Text type='secondary'>
                {filteredSectors.length} {t('sectorResearch.sectors')}
              </Text>
            </div>
            <div className={styles.sectorGrid}>
              {filteredSectors.map((sector) => (
                <SectorCard
                  key={sector.id}
                  sector={sector}
                  onClick={handleSectorSelect}
                  isSelected={selectedSectorId === sector.id}
                />
              ))}
            </div>
          </div>

          {selectedSector && (
            <div className={styles.sectorDetail}>
              <div className={styles.detailHeader}>
                <div>
                  <Title heading={5}>{selectedSector.labelFr}</Title>
                  <Text type='secondary'>{selectedSector.labelEn}</Text>
                </div>
                <Button onClick={handleClearSelection}>{t('sectorResearch.actions.close')}</Button>
              </div>

              <Card className={styles.detailCard} title={t('sectorResearch.details.title')}>
                <Space direction='vertical' size='medium' style={{ width: '100%' }}>
                  <div>
                    <Text className={styles.detailLabel}>{t('sectorResearch.details.id')}:</Text>
                    <Text>{selectedSector.id}</Text>
                  </div>
                  <div>
                    <Text className={styles.detailLabel}>{t('sectorResearch.details.nafPrefixes')}:</Text>
                    <div className={styles.nafTags}>
                      {selectedSector.nafPrefixes.map((prefix) => (
                        <Tag key={prefix} color='arcoblue'>
                          {prefix}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  {selectedSector.ruleOfThumb && (
                    <div>
                      <Text className={styles.detailLabel}>{t('sectorResearch.details.ruleOfThumb')}:</Text>
                      <Tag color='green'>{selectedSector.ruleOfThumb}</Tag>
                    </div>
                  )}
                </Space>
              </Card>

              <Card className={styles.companiesCard} title={t('sectorResearch.companies.title')}>
                <CompanyTable companies={mockCompanies} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SectorResearchPage;
