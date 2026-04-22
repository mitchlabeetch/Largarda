/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import React from 'react';
import { Breadcrumb, Space, Typography } from '@arco-design/web-react';
import { Home, FolderOpen, Analysis, Search, Folder, Data } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDealContext } from '@/renderer/hooks/ma/useDealContext';
import ShellExtensionSlots from '@renderer/components/ma/ShellExtensionSlots';
import styles from './MaShell.module.css';

const { Text } = Typography;

interface BreadcrumbItem {
  key: string;
  label: string;
  path: string;
}

interface MaShellProps {
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

const MaShell: React.FC<MaShellProps> = ({ breadcrumbs, children }) => {
  const { t } = useTranslation('ma');
  const navigate = useNavigate();
  const { activeDeal, isLoading: dealLoading } = useDealContext();

  const handleBreadcrumbClick = (path: string) => {
    navigate(path);
  };

  const getRouteIcon = (key: string) => {
    switch (key) {
      case 'home':
        return <Home />;
      case 'deal-context':
        return <FolderOpen />;
      case 'due-diligence':
        return <Analysis />;
      case 'company-enrichment':
        return <Search />;
      case 'pipeline':
        return <Data />;
      default:
        return <Folder />;
    }
  };

  return (
    <div className={styles.shell}>
      {/* Top Bar */}
      <header className={styles.topBar} role='banner' aria-label={t('shell.aria.topBar')}>
        <div className={styles.topBarLeft}>
          <Space size='medium'>
            <Text className={styles.shellTitle}>{t('shell.title')}</Text>
            {activeDeal && !dealLoading && (
              <div className={styles.activeDealIndicator} role='status' aria-live='polite'>
                <Folder size={16} />
                <Text className={styles.activeDealText}>{activeDeal.name}</Text>
              </div>
            )}
          </Space>
        </div>
        <div className={styles.topBarRight}>
          <div className={styles.extensionSlots} aria-label={t('shell.aria.extensionSlots')}>
            <ShellExtensionSlots />
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label={t('shell.aria.breadcrumbs')}>
        <Breadcrumb>
          {breadcrumbs.map((item, index) => (
            <Breadcrumb.Item
              key={item.key}
              onClick={() => handleBreadcrumbClick(item.path)}
              className={index === breadcrumbs.length - 1 ? styles.breadcrumbActive : ''}
            >
              <Space size='mini'>
                {getRouteIcon(item.key)}
                <Text>{item.label}</Text>
              </Space>
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContent} role='main' tabIndex={-1}>
        {children}
      </main>

      {/* Extension slots for sidebar/footer */}
      <div className={styles.extensionSidebar} aria-label={t('shell.aria.extensionSidebar')}>
        <div className={styles.extensionSlot} data-slot='sidebar-top' />
        <div className={styles.extensionSlot} data-slot='sidebar-bottom' />
      </div>
    </div>
  );
};

export default MaShell;
