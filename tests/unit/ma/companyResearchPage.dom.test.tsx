/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CompanyResearchPage } from '../../../src/renderer/pages/ma/CompanyResearch/CompanyResearchPage';

// ============================================================================
// Mock react-i18next
// ============================================================================

const translations: Record<string, string> = {
  'ma.companyResearch.title': 'Company Research',
  'ma.companyResearch.loading': 'Loading company data...',
  'ma.companyResearch.empty.noCompany':
    'No company data available. Provide a company ID or SIREN to view company research.',
  'ma.companyResearch.actions.refresh': 'Refresh',
  'ma.companyResearch.actions.retry': 'Retry',
  'ma.companyResearch.profile.title': 'Company Profile',
  'ma.companyResearch.profile.unknown': 'Unknown',
  'ma.companyResearch.profile.sector': 'Sector',
  'ma.companyResearch.profile.jurisdiction': 'Jurisdiction',
  'ma.companyResearch.profile.headquarters': 'Headquarters',
  'ma.companyResearch.profile.registeredAt': 'Registered',
  'ma.companyResearch.profile.revenue': 'Revenue',
  'ma.companyResearch.provenance.title': 'Data Provenance',
  'ma.companyResearch.provenance.empty': 'No provenance information available',
  'ma.companyResearch.provenance.enrichedAt': 'Enriched',
  'ma.companyResearch.provenance.source': 'Source',
  'ma.companyResearch.provenance.version': 'Version',
  'ma.companyResearch.provenance.policy': 'Policy',
  'ma.companyResearch.provenance.sources': 'Data Sources',
  'ma.companyResearch.freshness.fresh': 'Fresh',
  'ma.companyResearch.freshness.stale': 'Stale',
  'ma.companyResearch.freshness.expired': 'Expired',
  'ma.companyResearch.freshness.unknown': 'Unknown',
  'ma.company.siren': 'SIREN',
  'ma.company.siret': 'SIRET',
  'ma.company.legalForm': 'Legal form',
  'ma.company.nafCode': 'NAF code',
  'ma.company.workforce': 'Workforce',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] || key,
    i18n: { language: 'en' },
  }),
}));

// ============================================================================
// Mock useCompanyEnrichment hook
// ============================================================================

const mockUseCompanyEnrichment = vi.fn(() => ({
  searchResults: [],
  isSearching: false,
  isEnriching: false,
  error: null,
  searchByName: vi.fn(),
  enrichBySiren: vi.fn(),
  enrichCompany: vi.fn(),
  batchEnrich: vi.fn(),
  clear: vi.fn(),
  enrichedCompany: null,
  batchResults: new Map(),
  batchProgress: null,
}));

vi.mock('../../../src/renderer/hooks/ma/useCompanyEnrichment', () => ({
  useCompanyEnrichment: () => mockUseCompanyEnrichment(),
}));

// ============================================================================
// Tests
// ============================================================================

describe('CompanyResearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Coverage', () => {
    it('renders empty state when no company data is available', () => {
      render(<CompanyResearchPage />);
      expect(screen.getByText('No company data available')).toBeInTheDocument();
    });

    it('renders loading state when enriching', () => {
      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        isEnriching: true,
        enrichedCompany: null,
      });
      render(<CompanyResearchPage />);
      expect(screen.getByText('Loading company data...')).toBeInTheDocument();
    });

    it('renders error state when enrichment fails', () => {
      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        error: 'Failed to load company data' as any,
        enrichedCompany: null,
      });
      render(<CompanyResearchPage />);
      expect(screen.getByText('Failed to load company data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Provenance/Freshness Rendering', () => {
    it('displays freshness status when company has freshness data', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        freshness: 'fresh' as const,
        lastEnrichedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });

    it('displays provenance information when company has provenance data', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        provenanceJson: JSON.stringify({
          source: 'SIRENE',
          fetchedAt: Date.now(),
          policy: 'canonical',
        }),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('Data Provenance')).toBeInTheDocument();
      expect(screen.getByText('SIRENE')).toBeInTheDocument();
    });

    it('displays empty provenance state when no provenance data exists', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('No provenance information available')).toBeInTheDocument();
    });
  });

  describe('Missing Data Coverage', () => {
    it('handles missing optional company fields gracefully', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('Company Profile')).toBeInTheDocument();
      expect(screen.getByText('SIREN')).toBeInTheDocument();
    });

    it('displays unknown label for missing legal form', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        legalForm: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Disagreement Coverage', () => {
    it('displays source tags when sourcesJson contains multiple sources', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        sourcesJson: JSON.stringify(['SIRENE', 'Pappers', 'BODACC']),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('Data Sources')).toBeInTheDocument();
    });

    it('displays canonical policy with appropriate styling', () => {
      const mockCompany = {
        id: '1',
        siren: '123456789',
        name: 'Test Company',
        provenanceJson: JSON.stringify({
          source: 'SIRENE',
          fetchedAt: Date.now(),
          policy: 'canonical',
        }),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockUseCompanyEnrichment.mockReturnValue({
        ...mockUseCompanyEnrichment(),
        enrichedCompany: mockCompany as any,
      });

      render(<CompanyResearchPage />);
      expect(screen.getByText('canonical')).toBeInTheDocument();
    });
  });
});
