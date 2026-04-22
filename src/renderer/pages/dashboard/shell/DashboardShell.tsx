/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import React from 'react';
import { Breadcrumb, Space, Typography } from '@arco-design/web-react';
import { Dashboard, Analysis, Pie } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardShell.module.css';

const { Text } = Typography;

interface BreadcrumbItem {
  key: string;
  label: string;
  path: string;
}

interface DashboardShellProps {
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ breadcrumbs, children }) => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  const handleBreadcrumbClick = (path: string) => {
    navigate(path);
  };

  const getRouteIcon = (key: string) => {
    switch (key) {
      case 'home':
        return <Dashboard />;
      case 'analytics':
        return <Analysis />;
      case 'charts':
        return <Pie />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={styles.shell}>
      {/* Top Bar */}
      <header className={styles.topBar} role='banner' aria-label={t('shell.aria.topBar')}>
        <div className={styles.topBarLeft}>
          <Space size='medium'>
            <Text className={styles.shellTitle}>{t('shell.title')}</Text>
          </Space>
        </div>
        <div className={styles.topBarRight}>
          {/* Extension slots for future use */}
          <div className={styles.extensionSlots} aria-label={t('shell.aria.extensionSlots')}>
            {/* Extension slot 1 */}
            <div className={styles.extensionSlot} data-slot='top-right-1' />
            {/* Extension slot 2 */}
            <div className={styles.extensionSlot} data-slot='top-right-2' />
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

export default DashboardShell;
