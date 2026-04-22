/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MarketFeedTable Component
 * Displays a table of market feed items with provenance and freshness indicators.
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Tooltip, Modal, Message } from '@arco-design/web-react';
import { Edit, Delete, Info } from '@icon-park/react';
import { useMarketFeeds } from '@/renderer/hooks/ma/useMarketFeeds';
import type { FeedItem } from '@/common/ma/marketFeed/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';
import './MarketFeedTable.module.css';


export interface MarketFeedTableProps {
  /** Feed type to filter by */
  feedType?: string;
  /** Whether to show actions column */
  showActions?: boolean;
  /** Callback when a feed item is selected */
  onSelect?: (item: FeedItem) => void;
  /** Callback when a feed item is updated */
  onUpdate?: (item: FeedItem) => void;
  /** Callback when a feed item is deleted */
  onDelete?: (itemId: string) => void;
}

/**
 * Get color for freshness status tag
 */
function getFreshnessColor(freshness: FreshnessStatus | undefined): string {
  switch (freshness) {
    case 'fresh':
      return 'green';
    case 'stale':
      return 'orange';
    case 'expired':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Format timestamp to readable date
 */
function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleString();
}

/**
 * Parse provenance JSON for display
 */
function parseProvenance(provenanceJson: string | undefined): {
  source: string;
  fetchedAt: number | undefined;
  policy: string;
} {
  if (!provenanceJson) {
    return { source: 'Unknown', fetchedAt: undefined, policy: 'unknown' };
  }
  try {
    const parsed = JSON.parse(provenanceJson) as {
      source: string;
      fetchedAt: number;
      policy: string;
    };
    return {
      source: parsed.source || 'Unknown',
      fetchedAt: parsed.fetchedAt,
      policy: parsed.policy || 'unknown',
    };
  } catch {
    return { source: 'Unknown', fetchedAt: undefined, policy: 'unknown' };
  }
}

/**
 * Get color for change value
 */
function getChangeColor(change: number | undefined): string {
  if (change === undefined) return 'gray';
  return change >= 0 ? 'green' : 'red';
}

/**
 * Format change value with sign
 */
function formatChange(change: number | undefined): string {
  if (change === undefined) return '-';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

/**
 * Format change percentage with sign
 */
function formatChangePercent(changePercent: number | undefined): string {
  if (changePercent === undefined) return '-';
  const sign = changePercent >= 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(2)}%`;
}

export function MarketFeedTable({ feedType, showActions = true, onSelect, onUpdate, onDelete }: MarketFeedTableProps) {
  const { items, paginatedItems, isLoading, error, listItemsByType, listItemsByFreshness, deleteItem, clearError } =
    useMarketFeeds();

  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [selectedFreshness, setSelectedFreshness] = useState<FreshnessStatus | undefined>();

  useEffect(() => {
    if (feedType) {
      listItemsByType(feedType as import('@/common/ma/marketFeed/schema').FeedItemType, page, pageSize);
    }
  }, [feedType, page, pageSize, listItemsByType]);

  useEffect(() => {
    if (selectedFreshness) {
      listItemsByFreshness(selectedFreshness, page, pageSize);
    }
  }, [selectedFreshness, page, pageSize, listItemsByFreshness]);

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Feed Item',
      content: 'Are you sure you want to delete this feed item?',
      onOk: async () => {
        const deleted = await deleteItem(id);
        if (deleted) {
          Message.success('Feed item deleted successfully');
          onDelete?.(id);
        }
      },
    });
  };

  const handleShowProvenance = (item: FeedItem) => {
    const provenance = parseProvenance(item.provenanceJson);
    Modal.info({
      title: `Provenance: ${item.name}`,
      content: (
        <div className='provenance-info'>
          <p>
            <strong>Symbol:</strong> {item.symbol}
          </p>
          <p>
            <strong>Type:</strong> {item.type}
          </p>
          <p>
            <strong>Source:</strong> {provenance.source}
          </p>
          <p>
            <strong>Data Source:</strong> {item.source}
          </p>
          <p>
            <strong>Fetched At:</strong> {formatTimestamp(provenance.fetchedAt)}
          </p>
          <p>
            <strong>Policy:</strong> {provenance.policy}
          </p>
          <p>
            <strong>Freshness:</strong>{' '}
            <Tag color={getFreshnessColor(item.freshness)}>{item.freshness || 'unknown'}</Tag>
          </p>
          {item.exchange && (
            <p>
              <strong>Exchange:</strong> {item.exchange}
            </p>
          )}
          {item.ttlMs && (
            <p>
              <strong>TTL:</strong> {Math.round(item.ttlMs / 1000)}s
            </p>
          )}
        </div>
      ),
    });
  };

  if (error) {
    return (
      <div className='market-feed-table-error'>
        <p>{error}</p>
        <Button onClick={clearError}>Retry</Button>
      </div>
    );
  }

  return (
    <div className='market-feed-table'>
      <div className='table-toolbar'>
        <Space>
          <span>Filter by freshness:</span>
          <Tag
            color={selectedFreshness === 'fresh' ? 'green' : undefined}
            className='cursor-pointer'
            onClick={() => setSelectedFreshness(selectedFreshness === 'fresh' ? undefined : 'fresh')}
          >
            Fresh
          </Tag>
          <Tag
            color={selectedFreshness === 'stale' ? 'orange' : undefined}
            className='cursor-pointer'
            onClick={() => setSelectedFreshness(selectedFreshness === 'stale' ? undefined : 'stale')}
          >
            Stale
          </Tag>
          <Tag
            color={selectedFreshness === 'expired' ? 'red' : undefined}
            className='cursor-pointer'
            onClick={() => setSelectedFreshness(selectedFreshness === 'expired' ? undefined : 'expired')}
          >
            Expired
          </Tag>
        </Space>
      </div>

      <Table
        data={items}
        loading={isLoading}
        pagination={{
          current: page + 1,
          pageSize,
          total: paginatedItems?.total ?? 0,
          onChange: (newPage) => setPage(newPage - 1),
          sizeCanChange: false,
        }}
        border={false}
        size='small'
        rowKey='id'
        columns={[
          { title: 'Symbol', dataIndex: 'symbol', width: 100 },
          { title: 'Name', dataIndex: 'name', width: 200 },
          { title: 'Type', dataIndex: 'type', width: 120 },
          {
            title: 'Value',
            width: 120,
            render: (_col: unknown, record: FeedItem) => (
              <span className='font-mono'>
                {record.value.toFixed(2)} {record.currency || record.unit || ''}
              </span>
            ),
          },
          {
            title: 'Change',
            width: 100,
            render: (_col: unknown, record: FeedItem) => (
              <Tag color={getChangeColor(record.change)}>{formatChange(record.change)}</Tag>
            ),
          },
          {
            title: '% Change',
            width: 100,
            render: (_col: unknown, record: FeedItem) => (
              <Tag color={getChangeColor(record.changePercent)}>{formatChangePercent(record.changePercent)}</Tag>
            ),
          },
          {
            title: 'Freshness',
            dataIndex: 'freshness',
            width: 100,
            render: (_col: unknown, record: FeedItem) => (
              <Tag color={getFreshnessColor(record.freshness)}>{record.freshness || 'unknown'}</Tag>
            ),
          },
          {
            title: 'Provenance',
            width: 80,
            render: (_col: unknown, record: FeedItem) => {
              const provenance = parseProvenance(record.provenanceJson);
              return (
                <Tooltip content={`Source: ${provenance.source}`}>
                  <Button
                    type='text'
                    size='small'
                    icon={<Info />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowProvenance(record);
                    }}
                  />
                </Tooltip>
              );
            },
          },
          {
            title: 'Fetched',
            dataIndex: 'fetchedAt',
            width: 150,
            render: (_col: unknown, record: FeedItem) => new Date(record.fetchedAt).toLocaleString(),
          },
          { title: 'Source', dataIndex: 'source', width: 120 },
          ...(showActions
            ? [
                {
                  title: 'Actions',
                  width: 120,
                  render: (_col: unknown, record: FeedItem) => (
                    <Space>
                      <Button
                        type='text'
                        size='small'
                        icon={<Edit />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate?.(record);
                        }}
                      />
                      <Button
                        type='text'
                        size='small'
                        status='danger'
                        icon={<Delete />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(record.id);
                        }}
                      />
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
        onRow={(record) => ({
          onClick: () => onSelect?.(record),
          className: 'cursor-pointer',
        })}
      />
    </div>
  );
}
