/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MaShell from './MaShell';
import AppLoader from '@renderer/components/layout/AppLoader';

const MaLandingPage = React.lazy(() => import('../MaLanding'));
const DealContextPage = React.lazy(() => import('../DealContext'));
const DueDiligencePage = React.lazy(() => import('../DueDiligence'));
const CompanyEnrichmentPage = React.lazy(() => import('../CompanyEnrichment'));
const ValuationWorkbenchPage = React.lazy(() => import('../ValuationWorkbench/index.ts'));
const PipelinePage = React.lazy(() => import('../Pipeline'));

const withRouteFallback = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<AppLoader />}>
    <Component />
  </Suspense>
);

const RouteRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search, hash: location.hash }} replace />;
};

const MaShellRouter: React.FC = () => {
  const { t } = useTranslation('ma');
  const location = useLocation();

  // Generate breadcrumbs based on current route
  const breadcrumbs = React.useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments[0] !== 'ma') return [];

    const items = [{ key: 'home', label: t('shell.home'), path: '/ma' }];

    if (pathSegments.length > 1) {
      const routeKey = pathSegments[1];
      switch (routeKey) {
        case 'deal-context':
          items.push({ key: 'deal-context', label: t('dealContext.title'), path: '/ma/deal-context' });
          break;
        case 'due-diligence':
          items.push({ key: 'due-diligence', label: t('dueDiligence.title'), path: '/ma/due-diligence' });
          break;
        case 'company-enrichment':
          items.push({
            key: 'company-enrichment',
            label: t('companyEnrichment.title'),
            path: '/ma/company-enrichment',
          });
          break;
        case 'valuation':
          items.push({ key: 'valuation', label: t('valuation.title'), path: '/ma/valuation' });
          break;
        case 'deals':
        case 'documents':
          items.push({ key: 'deal-context', label: t('dealContext.title'), path: '/ma/deal-context' });
          break;
        case 'analyses':
        case 'risk-findings':
          items.push({ key: 'due-diligence', label: t('dueDiligence.title'), path: '/ma/due-diligence' });
          break;
        case 'pipeline':
          items.push({ key: 'pipeline', label: t('pipeline.title'), path: '/ma/pipeline' });
          break;
      }
    }

    return items;
  }, [location.pathname, t]);

  return (
    <MaShell breadcrumbs={breadcrumbs}>
      <Routes>
        <Route index element={withRouteFallback(MaLandingPage)} />
        <Route path='deal-context' element={withRouteFallback(DealContextPage)} />
        <Route path='due-diligence' element={withRouteFallback(DueDiligencePage)} />
        <Route path='company-enrichment' element={withRouteFallback(CompanyEnrichmentPage)} />
        <Route path='valuation' element={withRouteFallback(ValuationWorkbenchPage)} />
        <Route path='pipeline' element={withRouteFallback(PipelinePage)} />
        <Route path='deals/:dealId' element={<RouteRedirect to='/ma/deal-context' />} />
        <Route path='deals/:dealId/documents/:documentId' element={<RouteRedirect to='/ma/deal-context' />} />
        <Route path='deals/:dealId/analyses/:analysisId' element={<RouteRedirect to='/ma/due-diligence' />} />
        <Route
          path='deals/:dealId/analyses/:analysisId/findings/:findingId'
          element={<RouteRedirect to='/ma/due-diligence' />}
        />
        <Route path='documents' element={<RouteRedirect to='/ma/deal-context' />} />
        <Route path='documents/:documentId' element={<RouteRedirect to='/ma/deal-context' />} />
        <Route path='analyses/:analysisId' element={<RouteRedirect to='/ma/due-diligence' />} />
        <Route path='analyses/:analysisId/findings/:findingId' element={<RouteRedirect to='/ma/due-diligence' />} />
        <Route path='risk-findings' element={<RouteRedirect to='/ma/due-diligence' />} />
        <Route path='*' element={<Navigate to='/ma' replace />} />
      </Routes>
    </MaShell>
  );
};

export default MaShellRouter;
