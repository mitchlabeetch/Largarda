/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ComparableTable Component
 * Displays a table of comparable companies with provenance and freshness indicators.
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Tooltip, Modal, Message } from '@arco-design/web-react';
import { Edit, Delete, Refresh, Info } from '@icon-park/react';
import { useComparables } from '@/renderer/hooks/ma/useComparables';
import type { ComparableCompany } from '@/common/ma/comparable/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';
import './ComparableTable.module.css';


export interface ComparableTableProps {
  /** Sector to filter comparables by */
  sector?: string;
  /** Deal ID to filter comparable sets by */
  dealId?: string;
  /** Whether to show actions column */
  showActions?: boolean;
  /** Callback when a comparable is selected */
  onSelect?: (company: ComparableCompany) => void;
  /** Callback when a comparable is updated */
  onUpdate?: (company: ComparableCompany) => void;
  /** Callback when a comparable is deleted */
  onDelete?: (companyId: string) => void;
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

export function ComparableTable({
  sector,
  dealId,
  showActions = true,
  onSelect,
  onUpdate,
  onDelete,
}: ComparableTableProps) {
  const {
    companies,
    paginatedCompanies,
    isLoading,
    error,
    listCompaniesBySector,
    listCompaniesByFreshness,
    deleteCompany,
    clearError,
  } = useComparables();

  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [selectedFreshness, setSelectedFreshness] = useState<FreshnessStatus | undefined>();

  useEffect(() => {
    if (sector) {
      listCompaniesBySector(sector, page, pageSize);
    }
  }, [sector, page, pageSize, listCompaniesBySector]);

  useEffect(() => {
    if (selectedFreshness) {
      listCompaniesByFreshness(selectedFreshness, page, pageSize);
    }
  }, [selectedFreshness, page, pageSize, listCompaniesByFreshness]);

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Comparable',
      content: 'Are you sure you want to delete this comparable company?',
      onOk: async () => {
        const deleted = await deleteCompany(id);
        if (deleted) {
          Message.success('Comparable deleted successfully');
          onDelete?.(id);
        }
      },
    });
  };

  const handleShowProvenance = (company: ComparableCompany) => {
    const provenance = parseProvenance(company.provenanceJson);
    Modal.info({
      title: `Provenance: ${company.name}`,
      content: (
        <div className='provenance-info'>
          <p>
            <strong>Source:</strong> {provenance.source}
          </p>
          <p>
            <strong>Fetched At:</strong> {formatTimestamp(provenance.fetchedAt)}
          </p>
          <p>
            <strong>Policy:</strong> {provenance.policy}
          </p>
          <p>
            <strong>Freshness:</strong>{' '}
            <Tag color={getFreshnessColor(company.freshness)}>{company.freshness || 'unknown'}</Tag>
          </p>
          <p>
            <strong>Data Currency:</strong> {company.currency}
          </p>
          {company.source && (
            <p>
              <strong>Data Provider:</strong> {company.source}
            </p>
          )}
        </div>
      ),
    });
  };

  if (error) {
    return (
      <div className='comparable-table-error'>
        <p>{error}</p>
        <Button onClick={clearError}>Retry</Button>
      </div>
    );
  }

  return (
    <div className='comparable-table'>
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
        data={companies}
        loading={isLoading}
        pagination={{
          current: page + 1,
          pageSize,
          total: paginatedCompanies?.total ?? 0,
          onChange: (newPage) => setPage(newPage - 1),
          sizeCanChange: false,
        }}
        border={false}
        size='small'
        rowKey='id'
        columns={[
          { title: 'Name', dataIndex: 'name', width: 200 },
          { title: 'Ticker', dataIndex: 'ticker', width: 100 },
          { title: 'Sector', dataIndex: 'sector', width: 150 },
          { title: 'Industry', dataIndex: 'industry', width: 150 },
          {
            title: 'Market Cap',
            width: 120,
            render: (_col: unknown, record: ComparableCompany) =>
              record.marketCap ? `${(record.marketCap / 1e6).toFixed(1)}M` : '-',
          },
          {
            title: 'Revenue',
            width: 120,
            render: (_col: unknown, record: ComparableCompany) =>
              record.revenue ? `${(record.revenue / 1e6).toFixed(1)}M` : '-',
          },
          {
            title: 'EV/EBITDA',
            width: 100,
            render: (_col: unknown, record: ComparableCompany) => record.multiples?.ev_ebitda?.toFixed(2) || '-',
          },
          {
            title: 'Freshness',
            dataIndex: 'freshness',
            width: 100,
            render: (_col: unknown, record: ComparableCompany) => (
              <Tag color={getFreshnessColor(record.freshness)}>{record.freshness || 'unknown'}</Tag>
            ),
          },
          {
            title: 'Provenance',
            width: 80,
            render: (_col: unknown, record: ComparableCompany) => {
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
            render: (_col: unknown, record: ComparableCompany) =>
              record.fetchedAt ? new Date(record.fetchedAt).toLocaleDateString() : 'Unknown',
          },
          ...(showActions
            ? [
                {
                  title: 'Actions',
                  width: 120,
                  render: (_col: unknown, record: ComparableCompany) => (
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
