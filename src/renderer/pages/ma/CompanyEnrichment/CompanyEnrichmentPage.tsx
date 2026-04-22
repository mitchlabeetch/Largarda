/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CompanyEnrichmentPage Component
 * Routed page for company enrichment with search, batch operations, and data sources display.
 */

import React, { useState } from 'react';
import { Typography, Tabs, Card, Message } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import CompanySearch from '@renderer/components/ma/CompanySearch/CompanySearch';
import { useCompanyEnrichment, type SearchResult } from '@renderer/hooks/ma/useCompanyEnrichment';
import EmptyState from '@renderer/components/base/EmptyState/EmptyState';
import { Search, Folder } from '@icon-park/react';
import styles from './CompanyEnrichmentPage.module.css';

const { Title } = Typography;
const TabPane = Tabs.TabPane;

/**
 * Company Enrichment Page
 * Main entry point for company enrichment from the M&A section.
 */
export function CompanyEnrichmentPage() {
  const { t } = useTranslation('ma');
  const [activeTab, setActiveTab] = useState('search');
  const [selectedCompany, setSelectedCompany] = useState<SearchResult | null>(null);
  const { enrichedCompany } = useCompanyEnrichment();

  const handleCompanySelect = (company: SearchResult) => {
    setSelectedCompany(company);
    Message.info(`${t('companyEnrichment.fields.name')}: ${company.name}`);
  };

  const handleCompanyEnrich = () => {
    if (enrichedCompany) {
      Message.success(t('companyEnrichment.messages.enrichSuccess'));
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Title heading={3}>{t('companyEnrichment.title')}</Title>
      </header>

      <Tabs activeTab={activeTab} onChange={setActiveTab} className={styles.tabs}>
        <TabPane
          key='search'
          title={
            <span className={styles.tabTitle}>
              <Search size={16} />
              {t('companyEnrichment.search.button')}
            </span>
          }
        >
          <Card className={styles.card}>
            <CompanySearch onSelect={handleCompanySelect} onEnrich={handleCompanyEnrich} showEnrichButton />
          </Card>

          {selectedCompany && (
            <Card className={styles.detailsCard} title={t('companyEnrichment.fields.name')}>
              <div className={styles.companyDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('companyEnrichment.fields.name')}</span>
                  <span className={styles.detailValue}>{selectedCompany.name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('companyEnrichment.fields.siren')}</span>
                  <span className={styles.detailValue}>{selectedCompany.siren}</span>
                </div>
                {selectedCompany.siret && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('companyEnrichment.fields.siret')}</span>
                    <span className={styles.detailValue}>{selectedCompany.siret}</span>
                  </div>
                )}
                {selectedCompany.legalForm && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('companyEnrichment.fields.legalForm')}</span>
                    <span className={styles.detailValue}>{selectedCompany.legalForm}</span>
                  </div>
                )}
                {selectedCompany.nafCode && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('companyEnrichment.fields.nafCode')}</span>
                    <span className={styles.detailValue}>{selectedCompany.nafCode}</span>
                  </div>
                )}
                {selectedCompany.headquartersAddress && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('companyEnrichment.fields.headquartersAddress')}</span>
                    <span className={styles.detailValue}>{selectedCompany.headquartersAddress}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabPane>

        <TabPane
          key='sources'
          title={
            <span className={styles.tabTitle}>
              <Folder size={16} />
              {t('companyEnrichment.sources.title')}
            </span>
          }
        >
          <Card className={styles.card}>
            <EmptyState
              icon={<Folder size={48} />}
              title={t('companyEnrichment.sources.rechercheEntreprises')}
              description={t('companyEnrichment.sources.title')}
              i18nNs='ma'
            />
            <div className={styles.sourceInfo}>
              <p>
                <strong>{t('companyEnrichment.sources.rechercheEntreprises')}</strong>
              </p>
              <p>API Recherche d&apos;entreprises (api.gouv.fr)</p>
              <p>{t('companyEnrichment.empty.description')}</p>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default CompanyEnrichmentPage;
