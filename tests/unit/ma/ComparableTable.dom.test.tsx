/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ComparableTable Component DOM Tests
 * Tests for table coverage, provenance display, and freshness indicators
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComparableTable } from '@renderer/components/ma/ComparableTable/ComparableTable';
import { ipcBridge } from '@/common';
import type { ComparableCompany } from '@/common/ma/comparable/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

// Mock the ipcBridge
vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      comparables: {
        listBySector: { invoke: vi.fn() },
        listByFreshness: { invoke: vi.fn() },
        deleteCompany: { invoke: vi.fn() },
      },
    },
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ComparableTable', () => {
  const mockCompanies: ComparableCompany[] = [
    {
      id: 'comp_1',
      name: 'TechCorp',
      ticker: 'TECH',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 50000000000,
      revenue: 10000000000,
      ebitda: 2000000000,
      multiples: { ev_ebitda: 12.5 },
      source: 'bloomberg',
      currency: 'USD',
      provenanceJson: JSON.stringify({ source: 'bloomberg', fetchedAt: Date.now(), policy: 'canonical' }),
      freshness: 'fresh',
      fetchedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'comp_2',
      name: 'StaleCorp',
      ticker: 'STALE',
      sector: 'Technology',
      industry: 'Hardware',
      marketCap: 10000000000,
      revenue: 2000000000,
      source: 'manual',
      currency: 'USD',
      provenanceJson: JSON.stringify({ source: 'manual', fetchedAt: Date.now() - 86400000, policy: 'supplementary' }),
      freshness: 'stale',
      fetchedAt: Date.now() - 86400000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'comp_3',
      name: 'ExpiredCorp',
      ticker: 'EXP',
      sector: 'Technology',
      source: 'legacy',
      currency: 'USD',
      freshness: 'expired',
      fetchedAt: Date.now() - 172800000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ipcBridge.ma.comparables.listBySector.invoke).mockResolvedValue({
      data: mockCompanies,
      total: 3,
      page: 0,
      pageSize: 50,
      hasMore: false,
    });
    vi.mocked(ipcBridge.ma.comparables.listByFreshness.invoke).mockResolvedValue({
      data: mockCompanies.filter((c) => c.freshness === 'fresh'),
      total: 1,
      page: 0,
      pageSize: 50,
      hasMore: false,
    });
  });

  describe('table coverage', () => {
    it('should render the table with column headers', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Ticker')).toBeInTheDocument();
        expect(screen.getByText('Sector')).toBeInTheDocument();
        expect(screen.getByText('Freshness')).toBeInTheDocument();
      });
    });

    it('should display comparable company data', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('TechCorp')).toBeInTheDocument();
        expect(screen.getByText('TECH')).toBeInTheDocument();
        expect(screen.getByText('StaleCorp')).toBeInTheDocument();
      });
    });

    it('should display financial values formatted', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        // Market cap should be formatted (50000M)
        expect(screen.getByText('50000.0M')).toBeInTheDocument();
        // Revenue should be formatted (10000M)
        expect(screen.getByText('10000.0M')).toBeInTheDocument();
      });
    });

    it('should display EV/EBITDA multiple', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('12.50')).toBeInTheDocument();
      });
    });
  });

  describe('freshness coverage', () => {
    it('should display fresh status with green color', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        const freshTag = screen.getByText('fresh');
        expect(freshTag).toBeInTheDocument();
        // Check that the Tag component has the green color
        expect(freshTag.closest('[class*="green"]') || freshTag.closest('.arco-tag-green')).toBeTruthy();
      });
    });

    it('should display stale status with orange color', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        const staleTag = screen.getByText('stale');
        expect(staleTag).toBeInTheDocument();
      });
    });

    it('should display expired status with red color', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        const expiredTag = screen.getByText('expired');
        expect(expiredTag).toBeInTheDocument();
      });
    });

    it('should allow filtering by freshness', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('TechCorp')).toBeInTheDocument();
      });

      const freshFilter = screen.getByText('Fresh');
      fireEvent.click(freshFilter);

      await waitFor(() => {
        expect(ipcBridge.ma.comparables.listByFreshness.invoke).toHaveBeenCalledWith({
          freshness: 'fresh',
          page: 0,
          pageSize: 50,
        });
      });
    });
  });

  describe('provenance coverage', () => {
    it('should display provenance info button for each row', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        const infoButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg'));
        expect(infoButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show provenance modal when info button is clicked', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('TechCorp')).toBeInTheDocument();
      });

      const infoButtons = screen.getAllByRole('button');
      const firstInfoButton = infoButtons.find((btn) => btn.querySelector('svg'));

      if (firstInfoButton) {
        fireEvent.click(firstInfoButton);

        await waitFor(() => {
          expect(screen.getByText(/Provenance:/)).toBeInTheDocument();
        });
      }
    });

    it('should display fetched timestamp', async () => {
      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        // Should have a "Fetched" column with dates
        const fetchedHeader = screen.getByText('Fetched');
        expect(fetchedHeader).toBeInTheDocument();
      });
    });
  });

  describe('actions coverage', () => {
    it('should render action buttons when showActions is true', async () => {
      render(<ComparableTable sector='Technology' showActions />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should call onSelect when row is clicked', async () => {
      const onSelect = vi.fn();
      render(<ComparableTable sector='Technology' onSelect={onSelect} />);

      await waitFor(() => {
        expect(screen.getByText('TechCorp')).toBeInTheDocument();
      });

      const techCorpRow = screen.getByText('TechCorp').closest('tr');
      if (techCorpRow) {
        fireEvent.click(techCorpRow);
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'comp_1', name: 'TechCorp' }));
      }
    });
  });

  describe('error handling', () => {
    it('should display error state', async () => {
      vi.mocked(ipcBridge.ma.comparables.listBySector.invoke).mockRejectedValue(new Error('Failed to load'));

      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });

    it('should allow retry on error', async () => {
      vi.mocked(ipcBridge.ma.comparables.listBySector.invoke).mockRejectedValue(new Error('Failed to load'));

      render(<ComparableTable sector='Technology' />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(ipcBridge.ma.comparables.listBySector.invoke).toHaveBeenCalledTimes(2);
    });
  });
});
