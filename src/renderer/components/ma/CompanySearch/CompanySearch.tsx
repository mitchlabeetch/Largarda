/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CompanySearch Component
 * Search interface for finding companies by name with enrichment capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Input, Button, List, Typography, Spin, Message } from '@arco-design/web-react';
import { Search, Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useCompanyEnrichment, type SearchResult } from '@renderer/hooks/ma/useCompanyEnrichment';
import EmptyState from '@renderer/components/base/EmptyState/EmptyState';
import styles from './CompanySearch.module.css';

const { Text } = Typography;

export interface CompanySearchProps {
  /** Callback when a company is selected */
  onSelect?: (company: SearchResult) => void;
  /** Callback when a company is enriched */
  onEnrich?: (company: SearchResult) => void;
  /** Show enrich button for each result */
  showEnrichButton?: boolean;
  /** Initial search query */
  initialQuery?: string;
  /** Custom class name */
  className?: string;
}

/**
 * Company search component with real-time search and enrichment
 */
export function CompanySearch({
  onSelect,
  onEnrich,
  showEnrichButton = true,
  initialQuery = '',
  className,
}: CompanySearchProps) {
  const { t } = useTranslation('ma');
  const [query, setQuery] = useState(initialQuery);
  const { searchResults, isSearching, isEnriching, error, searchByName, enrichBySiren, clear, enrichedCompany } =
    useCompanyEnrichment();
  const [selectedCompany, setSelectedCompany] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (error) {
      Message.error(t('companyEnrichment.error.searchFailed'));
    }
  }, [error, t]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      searchByName(query, 10);
    }
  }, [query, searchByName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSelect = useCallback(
    (company: SearchResult) => {
      setSelectedCompany(company);
      onSelect?.(company);
    },
    [onSelect]
  );

  const handleEnrich = useCallback(
    async (company: SearchResult) => {
      const result = await enrichBySiren(company.siren);
      if (result) {
        Message.success(t('companyEnrichment.messages.enrichSuccess'));
        onEnrich?.(company);
      } else {
        Message.error(t('companyEnrichment.error.enrichFailed'));
      }
    },
    [enrichBySiren, onEnrich, t]
  );

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.searchBar}>
        <Input
          placeholder={t('companyEnrichment.search.placeholder')}
          value={query}
          onChange={setQuery}
          onKeyDown={handleKeyDown}
          prefix={<Search />}
          suffix={
            isSearching ? (
              <Spin size={14} />
            ) : (
              <Button type='text' size='small' icon={<Search />} onClick={handleSearch} disabled={!query.trim()}>
                {t('companyEnrichment.search.button')}
              </Button>
            )
          }
          allowClear
          onClear={clear}
        />
      </div>

      {isSearching && (
        <div className={styles.loadingState}>
          <Spin size={20} />
          <Text type='secondary'>{t('companyEnrichment.loading.searching')}</Text>
        </div>
      )}

      {!isSearching && searchResults.length === 0 && !error && query && (
        <EmptyState
          title={t('companyEnrichment.search.noResults')}
          description={t('companyEnrichment.empty.searchPrompt')}
          i18nNs='ma'
        />
      )}

      {!isSearching && searchResults.length === 0 && !query && (
        <EmptyState
          title={t('companyEnrichment.empty.title')}
          description={t('companyEnrichment.empty.description')}
          i18nNs='ma'
        />
      )}

      {searchResults.length > 0 && (
        <div className={styles.resultsSection}>
          <Text type='secondary' className={styles.resultsCount}>
            {t('companyEnrichment.search.resultsCount', { count: searchResults.length })}
          </Text>
          <List
            className={styles.resultsList}
            dataSource={searchResults}
            render={(item: SearchResult) => (
              <List.Item
                key={item.siren}
                className={`${styles.resultItem} ${selectedCompany?.siren === item.siren ? styles.selected : ''}`}
                onClick={() => handleSelect(item)}
                actions={
                  showEnrichButton
                    ? [
                        <Button
                          key='enrich'
                          type='text'
                          size='small'
                          icon={<Refresh />}
                          loading={isEnriching}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnrich(item);
                          }}
                        >
                          {t('companyEnrichment.actions.enrich')}
                        </Button>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  title={item.name}
                  description={
                    <div className={styles.resultDetails}>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        SIREN: {item.siren}
                      </Text>
                      {item.legalForm && (
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {item.legalForm}
                        </Text>
                      )}
                      {item.headquartersAddress && (
                        <Text type='secondary' style={{ fontSize: 12 }} ellipsis>
                          {item.headquartersAddress}
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}

      {enrichedCompany && <Message type='success' content={t('companyEnrichment.messages.companyUpdated')} />}
    </div>
  );
}

export default CompanySearch;
