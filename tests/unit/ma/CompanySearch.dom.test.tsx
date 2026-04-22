/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CompanySearch Component Tests
 * Tests for discoverability and key state coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompanySearch } from '@renderer/components/ma/CompanySearch/CompanySearch';
import { ipcBridge } from '@/common';

// Mock the ipcBridge
vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      companyEnrichment: {
        searchByName: {
          invoke: vi.fn(),
        },
        enrichBySiren: {
          invoke: vi.fn(),
        },
      },
    },
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'companyEnrichment.search.placeholder': 'Search by company name...',
        'companyEnrichment.search.button': 'Search',
        'companyEnrichment.search.searching': 'Searching...',
        'companyEnrichment.search.noResults': 'No companies found',
        'companyEnrichment.search.resultsCount': `${params?.count ?? 0} results found`,
        'companyEnrichment.empty.title': 'No Company Selected',
        'companyEnrichment.empty.description': 'Search for a company by name or enter a SIREN number.',
        'companyEnrichment.actions.enrich': 'Enrich Data',
        'companyEnrichment.error.searchFailed': 'Search failed',
        'companyEnrichment.messages.enrichSuccess': 'Company enriched successfully',
      };
      return translations[key] || key;
    },
  }),
}));

describe('CompanySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverability', () => {
    it('should render search input', () => {
      render(<CompanySearch />);

      expect(screen.getByPlaceholderText('Search by company name...')).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<CompanySearch />);

      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should show empty state initially', () => {
      render(<CompanySearch />);

      expect(screen.getByText('No Company Selected')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should trigger search on button click', async () => {
      const mockInvoke = vi.fn().mockResolvedValue([{ siren: '123456789', name: 'Test Company' }]);
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockImplementation(mockInvoke);

      render(<CompanySearch />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'Test' } });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith({ query: 'Test', limit: 10 });
      });
    });

    it('should trigger search on Enter key', async () => {
      const mockInvoke = vi.fn().mockResolvedValue([]);
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockImplementation(mockInvoke);

      render(<CompanySearch />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith({ query: 'Test', limit: 10 });
      });
    });

    it('should display search results', async () => {
      const mockResults = [
        { siren: '123456789', name: 'Test Company 1', legalForm: 'SAS' },
        { siren: '987654321', name: 'Test Company 2', legalForm: 'SA' },
      ];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue(mockResults);

      render(<CompanySearch />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'Test' } });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        expect(screen.getByText('Test Company 2')).toBeInTheDocument();
      });
    });

    it('should show no results state', async () => {
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue([]);

      render(<CompanySearch />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'NonExistent' } });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('No companies found')).toBeInTheDocument();
      });
    });
  });

  describe('enrichment functionality', () => {
    it('should show enrich button when showEnrichButton is true', async () => {
      const mockResults = [{ siren: '123456789', name: 'Test Company' }];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue(mockResults);

      render(<CompanySearch showEnrichButton />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'Test' } });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Enrich Data')).toBeInTheDocument();
      });
    });

    it('should trigger enrichment on enrich button click', async () => {
      const mockResults = [{ siren: '123456789', name: 'Test Company' }];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue(mockResults);

      const mockEnrich = vi.fn().mockResolvedValue({
        id: 'comp-1',
        siren: '123456789',
        name: 'Test Company',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      vi.mocked(ipcBridge.ma.companyEnrichment.enrichBySiren.invoke).mockImplementation(mockEnrich);

      render(<CompanySearch showEnrichButton />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'Test' } });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      await waitFor(() => {
        const enrichButton = screen.getByText('Enrich Data');
        fireEvent.click(enrichButton);
      });

      await waitFor(() => {
        expect(mockEnrich).toHaveBeenCalledWith({ siren: '123456789' });
      });
    });
  });

  describe('callbacks', () => {
    it('should call onSelect when a company is selected', async () => {
      const onSelect = vi.fn();
      const mockResults = [{ siren: '123456789', name: 'Test Company' }];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue(mockResults);

      render(<CompanySearch onSelect={onSelect} />);

      const input = screen.getByPlaceholderText('Search by company name...');
      fireEvent.change(input, { target: { value: 'Test' } });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      await waitFor(() => {
        const companyItem = screen.getByText('Test Company');
        fireEvent.click(companyItem);
      });

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          siren: '123456789',
          name: 'Test Company',
        })
      );
    });
  });
});
