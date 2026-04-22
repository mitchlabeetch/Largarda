/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { Dropdown, Button } from '@arco-design/web-react';
import { Down, Plus, Check, FileText } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { Skeleton, EmptyState } from '@/renderer/components/base';
import type { DealContext, DealStatus } from '@/common/ma/types';
import styles from './DealSelector.module.css';

interface DealSelectorProps {
  /** List of available deals */
  deals: DealContext[];
  /** Currently active deal */
  activeDeal: DealContext | null;
  /** Whether deals are loading */
  isLoading?: boolean;
  /** Callback when a deal is selected */
  onSelect: (deal: DealContext) => void;
  /** Callback to create a new deal */
  onCreateNew?: () => void;
  /** Whether to show the create new button */
  showCreateButton?: boolean;
  /** Custom class name */
  className?: string;
}

export function DealSelector({
  deals,
  activeDeal,
  isLoading = false,
  onSelect,
  onCreateNew,
  showCreateButton = true,
  className,
}: DealSelectorProps) {
  const { t } = useTranslation('ma');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  const statusLabels: Record<DealStatus, string> = {
    active: t('dealSelector.status.active'),
    archived: t('dealSelector.status.archived'),
    closed: t('dealSelector.status.closed'),
  };

  const transactionTypeLabels: Record<DealContext['transactionType'], string> = {
    acquisition: t('dealForm.transactionTypes.acquisition'),
    merger: t('dealForm.transactionTypes.merger'),
    divestiture: t('dealForm.transactionTypes.divestiture'),
    joint_venture: t('dealForm.transactionTypes.jointVenture'),
  };

  const handleSelect = useCallback(
    (deal: DealContext) => {
      onSelect(deal);
      setIsDropdownVisible(false);
    },
    [onSelect]
  );

  const renderDealItem = useCallback(
    (deal: DealContext) => {
      const isActive = activeDeal?.id === deal.id;

      return (
        <Button
          key={deal.id}
          type='text'
          className={`${styles.dealItemButton} ${isActive ? styles.active : ''}`}
          onClick={() => handleSelect(deal)}
          aria-pressed={isActive}
          long
        >
          <div className={styles.dealInfo}>
            <span className={styles.dealName}>
              {isActive && <Check className={styles.activeIndicator} />}
              {deal.name}
            </span>
            <span className={styles.dealMeta}>
              {transactionTypeLabels[deal.transactionType]} - {deal.targetCompany.name}
            </span>
          </div>
          <span className={`${styles.dealStatus} ${styles[deal.status]}`}>{statusLabels[deal.status]}</span>
        </Button>
      );
    },
    [activeDeal, handleSelect, statusLabels, transactionTypeLabels]
  );

  const dropdownContent = (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.emptyState}>
          <Skeleton variant='circle' />
          <Skeleton variant='line' width='100%' />
          <Skeleton variant='line' width='80%' />
        </div>
      ) : deals.length === 0 ? (
        <div className={styles.emptyState}>
          <EmptyState
            icon={<FileText size={64} />}
            title={t('dealSelector.noDealsYet')}
            primaryAction={
              showCreateButton && onCreateNew
                ? {
                    label: t('dealSelector.createFirstDeal'),
                    onClick: onCreateNew,
                    icon: <Plus />,
                    type: 'primary',
                  }
                : undefined
            }
            i18nNs='ma'
          />
        </div>
      ) : (
        <div className={styles.dealList}>{deals.map(renderDealItem)}</div>
      )}
    </div>
  );

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.selector}>
        <Dropdown
          droplist={dropdownContent}
          trigger='click'
          position='bl'
          onVisibleChange={(visible) => setIsDropdownVisible(visible)}
          disabled={isLoading}
        >
          <Button className={styles.selectorButton} icon={<Down />} loading={isLoading}>
            {activeDeal ? activeDeal.name : t('dealSelector.selectDeal')}
          </Button>
        </Dropdown>
        {activeDeal && (
          <span className={styles.activeIndicator}>
            <Check /> {t('dealSelector.active')}
          </span>
        )}
      </div>
    </div>
  );
}

export default DealSelector;
