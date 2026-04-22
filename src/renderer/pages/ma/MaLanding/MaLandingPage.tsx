/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MaLandingPage Component
 * Default entry point for M&A section with navigation to Deal Context and Due Diligence.
 */

import React from 'react';
import { Button, Typography } from '@arco-design/web-react';
import { Folder, Analysis, Search, Data } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styles from './MaLandingPage.module.css';

const { Title, Text } = Typography;

export function MaLandingPage() {
  const { t } = useTranslation('ma');
  const navigate = useNavigate();

  const cards = [
    {
      key: 'deal-context',
      icon: <Folder size={48} />,
      title: t('dealContext.title'),
      description: t('dealContext.empty.selectDealText'),
      path: '/ma/deal-context',
    },
    {
      key: 'due-diligence',
      icon: <Analysis size={48} />,
      title: t('dueDiligence.title'),
      description: t('dueDiligence.empty.selectDeal'),
      path: '/ma/due-diligence',
    },
    {
      key: 'company-enrichment',
      icon: <Search size={48} />,
      title: t('companyEnrichment.title'),
      description: t('companyEnrichment.empty.description'),
      path: '/ma/company-enrichment',
    },
    {
      key: 'pipeline',
      icon: <Data size={48} />,
      title: t('pipeline.title'),
      description: t('pipeline.description'),
      path: '/ma/pipeline',
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Title heading={2}>{t('dealContext.title')}</Title>
        <Text type='secondary'>{t('dealContext.empty.selectDealText')}</Text>
      </header>

      <div className={styles.cardGrid}>
        {cards.map((card) => (
          <Button
            key={card.key}
            className={styles.cardButton}
            type='text'
            aria-label={card.title}
            onClick={() => navigate(card.path)}
          >
            <div className={styles.cardIcon} aria-hidden='true'>
              {card.icon}
            </div>
            <Title heading={4} className={styles.cardTitle}>
              {card.title}
            </Title>
            <Text type='secondary' className={styles.cardDescription}>
              {card.description}
            </Text>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default MaLandingPage;
