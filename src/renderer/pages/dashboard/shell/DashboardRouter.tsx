/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardShell from './DashboardShell';
import AppLoader from '@renderer/components/layout/AppLoader';

const DashboardLanding = React.lazy(() => import('../DashboardLanding'));
const DailyBriefPage = React.lazy(() => import('../DailyBriefPage'));

const withRouteFallback = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<AppLoader />}>
    <Component />
  </Suspense>
);

const DashboardRouter: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const location = useLocation();

  // Generate breadcrumbs based on current route
  const breadcrumbs = React.useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments[0] !== 'dashboard') return [];

    const items = [{ key: 'home', label: t('shell.home'), path: '/dashboard' }];

    if (pathSegments.length > 1) {
      const routeKey = pathSegments[1];
      switch (routeKey) {
        case 'analytics':
          items.push({ key: 'analytics', label: t('analytics.title'), path: '/dashboard/analytics' });
          break;
        case 'charts':
          items.push({ key: 'charts', label: t('charts.title'), path: '/dashboard/charts' });
          break;
        case 'brief':
          items.push({ key: 'brief', label: t('shell.brief'), path: '/dashboard/brief' });
          break;
      }
    }

    return items;
  }, [location.pathname, t]);

  return (
    <DashboardShell breadcrumbs={breadcrumbs}>
      <Routes>
        <Route index element={withRouteFallback(DashboardLanding)} />
        <Route path='analytics' element={withRouteFallback(DashboardLanding)} />
        <Route path='charts' element={withRouteFallback(DashboardLanding)} />
        <Route path='brief' element={withRouteFallback(DailyBriefPage)} />
        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </DashboardShell>
  );
};

export default DashboardRouter;
