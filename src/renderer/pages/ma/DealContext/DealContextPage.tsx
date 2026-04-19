/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Dropdown, Menu, Modal, Message, Popconfirm } from '@arco-design/web-react';
import { IconClose, IconEdit, IconRefresh } from '@arco-design/web-react/icon';
import { Plus, More, Edit, FolderOpen, Close, Refresh } from '@icon-park/react';
import { DealSelector, DealForm } from '@/renderer/components/ma/DealSelector';
import { useDealContext } from '@/renderer/hooks/ma/useDealContext';
import { useDocuments } from '@/renderer/hooks/ma/useDocuments';
import type { DealContext, DealStatus, CreateDealInput } from '@/common/ma/types';
import styles from './DealContextPage.module.css';

type FilterStatus = 'all' | DealStatus;

const statusLabels: Record<DealStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  closed: 'Closed',
};

export function DealContextPage() {
  const {
    deals,
    activeDeal,
    isLoading,
    createDeal,
    updateDeal,
    deleteDeal,
    setActiveDeal,
    archiveDeal,
    closeDeal,
    reactivateDeal,
    validateInput,
    refresh,
  } = useDealContext();

  const [selectedDeal, setSelectedDeal] = useState<DealContext | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealContext | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get documents for selected deal
  const { documents } = useDocuments({
    dealId: selectedDeal?.id ?? '',
    autoRefresh: !!selectedDeal,
  });

  // Filter deals by status
  const filteredDeals = useMemo(() => {
    if (filterStatus === 'all') return deals;
    return deals.filter((deal) => deal.status === filterStatus);
  }, [deals, filterStatus]);

  const handleSelectDeal = useCallback(
    (deal: DealContext) => {
      setSelectedDeal(deal);
      setActiveDeal(deal.id);
    },
    [setActiveDeal]
  );

  const handleCreateNew = useCallback(() => {
    setEditingDeal(null);
    setIsFormVisible(true);
  }, []);

  const handleEdit = useCallback((deal: DealContext) => {
    setEditingDeal(deal);
    setIsFormVisible(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateDealInput) => {
      setIsSubmitting(true);
      try {
        if (editingDeal) {
          await updateDeal(editingDeal.id, data);
          Message.success('Deal updated successfully');
        } else {
          const newDeal = await createDeal(data);
          Message.success('Deal created successfully');
          setSelectedDeal(newDeal);
        }
        setIsFormVisible(false);
        setEditingDeal(null);
      } catch (error) {
        Message.error(error instanceof Error ? error.message : 'Failed to save deal');
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingDeal, createDeal, updateDeal]
  );

  const handleArchive = useCallback(
    async (deal: DealContext) => {
      try {
        await archiveDeal(deal.id);
        Message.success('Deal archived');
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : 'Failed to archive deal');
      }
    },
    [archiveDeal, selectedDeal]
  );

  const handleClose = useCallback(
    async (deal: DealContext) => {
      try {
        await closeDeal(deal.id);
        Message.success('Deal closed');
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : 'Failed to close deal');
      }
    },
    [closeDeal, selectedDeal]
  );

  const handleReactivate = useCallback(
    async (deal: DealContext) => {
      try {
        await reactivateDeal(deal.id);
        Message.success('Deal reactivated');
      } catch (error) {
        Message.error(error instanceof Error ? error.message : 'Failed to reactivate deal');
      }
    },
    [reactivateDeal]
  );

  const handleDelete = useCallback(
    async (deal: DealContext) => {
      try {
        await deleteDeal(deal.id);
        Message.success('Deal deleted');
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : 'Failed to delete deal');
      }
    },
    [deleteDeal, selectedDeal]
  );

  const getDealActions = useCallback(
    (deal: DealContext) => {
      const items = [
        {
          key: 'edit',
          icon: <IconEdit />,
          onClick: () => handleEdit(deal),
        },
      ];

      if (deal.status === 'active') {
        items.push({
          key: 'archive',
          icon: <File />,
          onClick: () => handleArchive(deal),
        });
        items.push({
          key: 'close',
          icon: <IconClose />,
          onClick: () => handleClose(deal),
        });
      } else if (deal.status === 'archived' || deal.status === 'closed') {
        items.push({
          key: 'reactivate',
          icon: <IconRefresh />,
          onClick: () => handleReactivate(deal),
        });
      }

      items.push({
        key: 'delete',
        icon: <IconClose />,
        onClick: () => {
          Modal.confirm({
            title: 'Delete Deal',
            content: `Are you sure you want to delete "${deal.name}"? This action cannot be undone.`,
            okText: 'Delete',
            okButtonProps: { status: 'danger' },
            onOk: () => handleDelete(deal),
          });
        },
      });

      return items;
    },
    [handleEdit, handleArchive, handleClose, handleReactivate, handleDelete]
  );

  const renderDealCard = useCallback(
    (deal: DealContext) => {
      const isActive = activeDeal?.id === deal.id;

      return (
        <div
          key={deal.id}
          className={`${styles.dealCard} ${isActive ? styles.active : ''}`}
          onClick={() => handleSelectDeal(deal)}
        >
          <div className={styles.dealCardHeader}>
            <span className={styles.dealCardName}>{deal.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`${styles.dealCardStatus} ${styles[deal.status]}`}>
                {statusLabels[deal.status]}
              </span>
              <Dropdown
                droplist={<Menu>{getDealActions(deal).map((item) => (
                  <Menu.Item key={item.key} onClick={item.onClick}>
                    {item.icon} {item.key.charAt(0).toUpperCase() + item.key.slice(1)}
                  </Menu.Item>
                ))}</Menu>}
                trigger="click"
              >
                <Button type="text" size="small" icon={<More />} />
              </Dropdown>
            </div>
          </div>
          <div className={styles.dealCardMeta}>{deal.transactionType}</div>
          <div className={styles.dealCardCompany}>{deal.targetCompany.name}</div>
        </div>
      );
    },
    [activeDeal, handleSelectDeal, getDealActions]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Deal Management</h1>
        <div className={styles.actions}>
          <Button icon={<Refresh />} onClick={refresh}>
            Refresh
          </Button>
          <Button type="primary" icon={<Plus />} onClick={handleCreateNew}>
            New Deal
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.dealList}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Deals ({filteredDeals.length})</span>
          </div>

          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${filterStatus === 'all' ? styles.active : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`${styles.filterTab} ${filterStatus === 'active' ? styles.active : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </button>
            <button
              className={`${styles.filterTab} ${filterStatus === 'archived' ? styles.active : ''}`}
              onClick={() => setFilterStatus('archived')}
            >
              Archived
            </button>
            <button
              className={`${styles.filterTab} ${filterStatus === 'closed' ? styles.active : ''}`}
              onClick={() => setFilterStatus('closed')}
            >
              Closed
            </button>
          </div>

          {filteredDeals.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📁</div>
              <div className={styles.emptyTitle}>No deals found</div>
              <div className={styles.emptyText}>
                {filterStatus === 'all'
                  ? 'Create your first deal to get started'
                  : `No ${filterStatus} deals`}
              </div>
              {filterStatus === 'all' && (
                <Button type="primary" icon={<Plus />} onClick={handleCreateNew}>
                  Create Deal
                </Button>
              )}
            </div>
          ) : (
            filteredDeals.map(renderDealCard)
          )}
        </div>

        <div className={styles.detailPanel}>
          {selectedDeal ? (
            <>
              <div className={styles.detailHeader}>
                <h2 className={styles.detailTitle}>{selectedDeal.name}</h2>
                <div className={styles.detailActions}>
                  <Button icon={<Edit />} onClick={() => handleEdit(selectedDeal)}>
                    Edit
                  </Button>
                  {selectedDeal.status === 'active' && (
                    <Popconfirm
                      title="Archive this deal?"
                      content="Archived deals can be reactivated later."
                      onOk={() => handleArchive(selectedDeal)}
                    >
                      <Button>Archive</Button>
                    </Popconfirm>
                  )}
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>Transaction Details</div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={styles.detailValue}>{selectedDeal.transactionType}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue}>{statusLabels[selectedDeal.status]}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Created</span>
                  <span className={styles.detailValue}>
                    {new Date(selectedDeal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Updated</span>
                  <span className={styles.detailValue}>
                    {new Date(selectedDeal.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>Target Company</div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Name</span>
                  <span className={styles.detailValue}>{selectedDeal.targetCompany.name}</span>
                </div>
                {selectedDeal.targetCompany.industry && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Industry</span>
                    <span className={styles.detailValue}>{selectedDeal.targetCompany.industry}</span>
                  </div>
                )}
                {selectedDeal.targetCompany.jurisdiction && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Jurisdiction</span>
                    <span className={styles.detailValue}>{selectedDeal.targetCompany.jurisdiction}</span>
                  </div>
                )}
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>Parties</div>
                <div className={styles.partyList}>
                  {selectedDeal.parties.map((party, index) => (
                    <div key={index} className={styles.partyItem}>
                      <span className={styles.partyName}>{party.name}</span>
                      <span className={styles.partyRole}>{party.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {documents.length > 0 && (
                <div className={styles.documentSection}>
                  <div className={styles.detailSectionTitle}>Associated Documents ({documents.length})</div>
                  <div className={styles.documentList}>
                    {documents.map((doc) => (
                      <div key={doc.id} className={styles.documentItem}>
                        <span className={styles.documentIcon}>📄</span>
                        <span className={styles.documentName}>{doc.filename}</span>
                        <span className={styles.documentMeta}>{doc.format.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👈</div>
              <div className={styles.emptyTitle}>Select a deal</div>
              <div className={styles.emptyText}>
                Choose a deal from the list to view details
              </div>
            </div>
          )}
        </div>
      </div>

      <DealForm
        visible={isFormVisible}
        deal={editingDeal}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setIsFormVisible(false);
          setEditingDeal(null);
        }}
        validateInput={validateInput}
        loading={isSubmitting}
      />
    </div>
  );
}

export default DealContextPage;