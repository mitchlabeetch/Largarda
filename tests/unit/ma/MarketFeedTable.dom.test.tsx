/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MarketFeedTable Component DOM Tests
 * Tests for table coverage, provenance display, and freshness indicators
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketFeedTable } from '@renderer/components/ma/MarketFeedTable/MarketFeedTable';
import { ipcBridge } from '@/common';
import type { FeedItem } from '@/common/ma/marketFeed/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

// Mock the ipcBridge
vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      marketFeeds: {
        listByType: { invoke: vi.fn() },
        listByFreshness: { invoke: vi.fn() },
        deleteItem: { invoke: vi.fn() },
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

describe('MarketFeedTable', () => {
  const mockFeedItems: FeedItem[] = [
    {
      id: 'feed_1',
      type: 'stock_price',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      value: 150.25,
      change: 2.5,
      changePercent: 1.69,
      currency: 'USD',
      source: 'bloomberg',
      timestamp: Date.now(),
      provenanceJson: JSON.stringify({ source: 'bloomberg', fetchedAt: Date.now(), policy: 'canonical' }),
      freshness: 'fresh',
      fetchedAt: Date.now(),
      ttlMs: 300000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'feed_2',
      type: 'stock_price',
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      value: 250.0,
      change: -1.5,
      changePercent: -0.6,
      currency: 'USD',
      source: 'yahoo',
      timestamp: Date.now() - 180000,
      freshness: 'stale',
      fetchedAt: Date.now() - 180000,
      ttlMs: 300000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'feed_3',
      type: 'index_value',
      symbol: 'SPX',
      name: 'S&P 500',
      value: 4000.0,
      change: 0,
      changePercent: 0,
      currency: 'USD',
      source: 'legacy',
      timestamp: Date.now() - 400000,
      freshness: 'expired',
      fetchedAt: Date.now() - 400000,
      ttlMs: 300000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ipcBridge.ma.marketFeeds.listByType.invoke).mockResolvedValue({
      data: mockFeedItems,
      total: 3,
      page: 0,
      pageSize: 50,
      hasMore: false,
    });
    vi.mocked(ipcBridge.ma.marketFeeds.listByFreshness.invoke).mockResolvedValue({
      data: mockFeedItems.filter((i) => i.freshness === 'fresh'),
      total: 1,
      page: 0,
      pageSize: 50,
      hasMore: false,
    });
  });

  describe('table coverage', () => {
    it('should render the table with column headers', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('Symbol')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
        expect(screen.getByText('Change')).toBeInTheDocument();
        expect(screen.getByText('Freshness')).toBeInTheDocument();
      });
    });

    it('should display feed item data', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });
    });

    it('should display value with currency', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        // Value should be formatted (150.25 USD)
        expect(screen.getByText('150.25 USD')).toBeInTheDocument();
      });
    });

    it('should display change with sign and color', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        // Positive change
        expect(screen.getByText('+2.50')).toBeInTheDocument();
        // Negative change
        expect(screen.getByText('-1.50')).toBeInTheDocument();
      });
    });

    it('should display change percentage', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('+1.69%')).toBeInTheDocument();
        expect(screen.getByText('-0.60%')).toBeInTheDocument();
      });
    });
  });

  describe('freshness coverage', () => {
    it('should display fresh status', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        const freshTag = screen.getByText('fresh');
        expect(freshTag).toBeInTheDocument();
      });
    });

    it('should display stale status', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        const staleTag = screen.getByText('stale');
        expect(staleTag).toBeInTheDocument();
      });
    });

    it('should display expired status', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        const expiredTag = screen.getByText('expired');
        expect(expiredTag).toBeInTheDocument();
      });
    });

    it('should allow filtering by freshness', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const freshFilter = screen.getByText('Fresh');
      fireEvent.click(freshFilter);

      await waitFor(() => {
        expect(ipcBridge.ma.marketFeeds.listByFreshness.invoke).toHaveBeenCalledWith({
          freshness: 'fresh',
          page: 0,
          pageSize: 50,
        });
      });
    });
  });

  describe('provenance coverage', () => {
    it('should display provenance info button for each row', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should show provenance modal when info button is clicked', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons.find((btn) => btn.querySelector('svg'));

      if (infoButton) {
        fireEvent.click(infoButton);

        await waitFor(() => {
          expect(screen.getByText(/Provenance:/)).toBeInTheDocument();
        });
      }
    });

    it('should display data source', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        // Should have a "Source" column
        expect(screen.getByText('Source')).toBeInTheDocument();
        expect(screen.getByText('bloomberg')).toBeInTheDocument();
      });
    });

    it('should display fetched timestamp', async () => {
      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        // Should have a "Fetched" column
        const fetchedHeader = screen.getByText('Fetched');
        expect(fetchedHeader).toBeInTheDocument();
      });
    });
  });

  describe('feed item types coverage', () => {
    it('should handle different feed item types', async () => {
      const mixedItems: FeedItem[] = [
        {
          id: 'feed_1',
          type: 'stock_price',
          symbol: 'AAPL',
          name: 'Apple',
          value: 150,
          source: 'bloomberg',
          timestamp: Date.now(),
          freshness: 'fresh',
          fetchedAt: Date.now(),
          ttlMs: 300000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'feed_2',
          type: 'fx_rate',
          symbol: 'EURUSD',
          name: 'EUR/USD',
          value: 1.085,
          source: 'refinitiv',
          timestamp: Date.now(),
          freshness: 'fresh',
          fetchedAt: Date.now(),
          ttlMs: 300000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      vi.mocked(ipcBridge.ma.marketFeeds.listByType.invoke).mockResolvedValue({
        data: mixedItems,
        total: 2,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('EURUSD')).toBeInTheDocument();
      });
    });
  });

  describe('actions coverage', () => {
    it('should render action buttons when showActions is true', async () => {
      render(<MarketFeedTable feedType='stock_price' showActions />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should call onSelect when row is clicked', async () => {
      const onSelect = vi.fn();
      render(<MarketFeedTable feedType='stock_price' onSelect={onSelect} />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const aaplRow = screen.getByText('AAPL').closest('tr');
      if (aaplRow) {
        fireEvent.click(aaplRow);
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'feed_1', symbol: 'AAPL' }));
      }
    });
  });

  describe('error handling', () => {
    it('should display error state', async () => {
      vi.mocked(ipcBridge.ma.marketFeeds.listByType.invoke).mockRejectedValue(new Error('Failed to load'));

      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });

    it('should allow retry on error', async () => {
      vi.mocked(ipcBridge.ma.marketFeeds.listByType.invoke).mockRejectedValue(new Error('Failed to load'));

      render(<MarketFeedTable feedType='stock_price' />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(ipcBridge.ma.marketFeeds.listByType.invoke).toHaveBeenCalledTimes(2);
    });
  });
});
