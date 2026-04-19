/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { Dropdown, Button, Empty, Spin } from '@arco-design/web-react';
import { IconDown, IconAdd, IconCheck } from '@icon-park/react';
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

const statusLabels: Record<DealStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  closed: 'Closed',
};

export function DealSelector({
  deals,
  activeDeal,
  isLoading = false,
  onSelect,
  onCreateNew,
  showCreateButton = true,
  className,
}: DealSelectorProps) {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

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
        <div
          key={deal.id}
          className={`${styles.dealItem} ${isActive ? styles.active : ''}`}
          onClick={() => handleSelect(deal)}
        >
          <div className={styles.dealInfo}>
            <span className={styles.dealName}>
              {isActive && <IconCheck className={styles.activeIndicator} />}
              {deal.name}
            </span>
            <span className={styles.dealMeta}>
              {deal.transactionType} • {deal.targetCompany.name}
            </span>
          </div>
          <span className={`${styles.dealStatus} ${styles[deal.status]}`}>
            {statusLabels[deal.status]}
          </span>
        </div>
      );
    },
    [activeDeal, handleSelect]
  );

  const dropdownContent = (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.emptyState}>
          <Spin />
        </div>
      ) : deals.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty
            icon={<div className={styles.emptyIcon}>📁</div>}
            description={
              <span className={styles.emptyText}>No deals yet</span>
            }
          />
          {showCreateButton && onCreateNew && (
            <Button type="primary" size="small" icon={<IconAdd />} onClick={onCreateNew}>
              Create First Deal
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.dealList}>
          {deals.map(renderDealItem)}
        </div>
      )}
    </div>
  );

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.selector}>
        <Dropdown
          dropdown={() => dropdownContent}
          trigger="click"
          position="bl"
          onVisibleChange={(visible) => setIsDropdownVisible(visible)}
          disabled={isLoading}
        >
          <Button
            className={styles.selectorButton}
            icon={<IconDown />}
            iconPosition="end"
            loading={isLoading}
          >
            {activeDeal ? activeDeal.name : 'Select a deal'}
          </Button>
        </Dropdown>
        {activeDeal && (
          <span className={styles.activeIndicator}>
            <IconCheck /> Active
          </span>
        )}
      </div>
    </div>
  );
}

export default DealSelector;