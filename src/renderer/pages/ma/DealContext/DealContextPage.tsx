/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Dropdown, Menu, Modal, Message, Popconfirm } from '@arco-design/web-react';
import { IconClose, IconEdit, IconRefresh } from '@arco-design/web-react/icon';
import { Plus, More, Edit, FolderOpen, Close, Refresh, Folder, FileText, Left } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { DealSelector, DealForm } from '@/renderer/components/ma/DealSelector';
import { useDealContext } from '@/renderer/hooks/ma/useDealContext';
import { useDocuments } from '@/renderer/hooks/ma/useDocuments';
import { useMaDateFormatters } from '@/renderer/utils/ma/formatters';
import type { DealContext, DealStatus, CreateDealInput, DealParty } from '@/common/ma/types';
import styles from './DealContextPage.module.css';

type FilterStatus = 'all' | DealStatus;

export function DealContextPage() {
  const { t } = useTranslation('ma');
  const { formatDate } = useMaDateFormatters();

  const statusLabels: Record<DealStatus, string> = {
    active: t('dealContext.status.active'),
    archived: t('dealContext.status.archived'),
    closed: t('dealContext.status.closed'),
  };

  const transactionTypeLabels: Record<DealContext['transactionType'], string> = {
    acquisition: t('dealForm.transactionTypes.acquisition'),
    merger: t('dealForm.transactionTypes.merger'),
    divestiture: t('dealForm.transactionTypes.divestiture'),
    joint_venture: t('dealForm.transactionTypes.jointVenture'),
  };

  const partyRoleLabels: Record<DealParty['role'], string> = {
    buyer: t('dealForm.partyRoles.buyer'),
    seller: t('dealForm.partyRoles.seller'),
    target: t('dealForm.partyRoles.target'),
    advisor: t('dealForm.partyRoles.advisor'),
  };

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
          Message.success(t('dealContext.messages.updatedSuccessfully'));
        } else {
          const newDeal = await createDeal(data);
          Message.success(t('dealContext.messages.createdSuccessfully'));
          setSelectedDeal(newDeal);
        }
        setIsFormVisible(false);
        setEditingDeal(null);
      } catch (error) {
        Message.error(error instanceof Error ? error.message : t('dealContext.messages.saveFailed'));
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
        Message.success(t('dealContext.messages.archived'));
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : t('dealContext.messages.archiveFailed'));
      }
    },
    [archiveDeal, selectedDeal]
  );

  const handleClose = useCallback(
    async (deal: DealContext) => {
      try {
        await closeDeal(deal.id);
        Message.success(t('dealContext.messages.closed'));
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : t('dealContext.messages.closeFailed'));
      }
    },
    [closeDeal, selectedDeal]
  );

  const handleReactivate = useCallback(
    async (deal: DealContext) => {
      try {
        await reactivateDeal(deal.id);
        Message.success(t('dealContext.messages.reactivated'));
      } catch (error) {
        Message.error(error instanceof Error ? error.message : t('dealContext.messages.reactivateFailed'));
      }
    },
    [reactivateDeal]
  );

  const handleDelete = useCallback(
    async (deal: DealContext) => {
      try {
        await deleteDeal(deal.id);
        Message.success(t('dealContext.messages.deleted'));
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : t('dealContext.messages.deleteFailed'));
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
          label: t('dealContext.edit'),
          onClick: () => handleEdit(deal),
        },
      ];

      if (deal.status === 'active') {
        items.push({
          key: 'archive',
          icon: <Folder />,
          label: t('dealContext.archive'),
          onClick: () => handleArchive(deal),
        });
        items.push({
          key: 'close',
          icon: <IconClose />,
          label: t('dealContext.status.closed'),
          onClick: () => handleClose(deal),
        });
      } else if (deal.status === 'archived' || deal.status === 'closed') {
        items.push({
          key: 'reactivate',
          icon: <IconRefresh />,
          label: t('dealContext.messages.reactivated'),
          onClick: () => handleReactivate(deal),
        });
      }

      items.push({
        key: 'delete',
        icon: <IconClose />,
        label: t('dealContext.deleteConfirm.ok'),
        onClick: () => {
          Modal.confirm({
            title: t('dealContext.deleteConfirm.title'),
            content: t('dealContext.deleteConfirm.content', { dealName: deal.name }),
            okText: t('dealContext.deleteConfirm.ok'),
            okButtonProps: { status: 'danger' },
            onOk: () => handleDelete(deal),
          });
        },
      });

      return items;
    },
    [handleEdit, handleArchive, handleClose, handleReactivate, handleDelete, t]
  );

  const renderDealCard = useCallback(
    (deal: DealContext) => {
      const isActive = activeDeal?.id === deal.id;

      return (
        <div key={deal.id} className={`${styles.dealCard} ${isActive ? styles.active : ''}`}>
          <div className={styles.dealCardHeader}>
            <Button
              type='text'
              className={styles.dealCardButton}
              onClick={() => handleSelectDeal(deal)}
              aria-pressed={isActive}
              long
            >
              <div className={styles.dealCardText}>
                <span className={styles.dealCardName}>{deal.name}</span>
                <span className={styles.dealCardMeta}>{transactionTypeLabels[deal.transactionType]}</span>
                <span className={styles.dealCardCompany}>{deal.targetCompany.name}</span>
              </div>
            </Button>
            <div className={styles.dealCardHeaderActions}>
              <span className={`${styles.dealCardStatus} ${styles[deal.status]}`}>{statusLabels[deal.status]}</span>
              <Dropdown
                droplist={
                  <Menu>
                    {getDealActions(deal).map((item) => (
                      <Menu.Item key={item.key} onClick={item.onClick}>
                        {item.icon} {item.label}
                      </Menu.Item>
                    ))}
                  </Menu>
                }
                trigger='click'
              >
                <Button type='text' size='small' icon={<More />} aria-label={t('dealContext.edit')} />
              </Dropdown>
            </div>
          </div>
        </div>
      );
    },
    [activeDeal, getDealActions, handleSelectDeal, statusLabels, t, transactionTypeLabels]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('dealContext.title')}</h1>
        <div className={styles.actions}>
          <Button icon={<Refresh />} onClick={refresh}>
            {t('dealContext.refresh')}
          </Button>
          <Button type='primary' icon={<Plus />} onClick={handleCreateNew}>
            {t('dealContext.newDeal')}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.dealList}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>{t('dealContext.dealsCount', { count: filteredDeals.length })}</span>
          </div>

          <div className={styles.filterTabs}>
            <Button
              className={`${styles.filterTab} ${filterStatus === 'all' ? styles.active : ''}`}
              type='text'
              onClick={() => setFilterStatus('all')}
            >
              {t('dealContext.filters.all')}
            </Button>
            <Button
              className={`${styles.filterTab} ${filterStatus === 'active' ? styles.active : ''}`}
              type='text'
              onClick={() => setFilterStatus('active')}
            >
              {t('dealContext.filters.active')}
            </Button>
            <Button
              className={`${styles.filterTab} ${filterStatus === 'archived' ? styles.active : ''}`}
              type='text'
              onClick={() => setFilterStatus('archived')}
            >
              {t('dealContext.filters.archived')}
            </Button>
            <Button
              className={`${styles.filterTab} ${filterStatus === 'closed' ? styles.active : ''}`}
              type='text'
              onClick={() => setFilterStatus('closed')}
            >
              {t('dealContext.filters.closed')}
            </Button>
          </div>

          {filteredDeals.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Folder size={48} />
              </div>
              <div className={styles.emptyTitle}>{t('dealContext.empty.noDealsFound')}</div>
              <div className={styles.emptyText}>
                {filterStatus === 'all'
                  ? t('dealContext.empty.createFirstDeal')
                  : t('dealContext.empty.noStatusDeals', { status: t(`dealContext.status.${filterStatus}`) })}
              </div>
              {filterStatus === 'all' && (
                <Button type='primary' icon={<Plus />} onClick={handleCreateNew}>
                  {t('dealContext.empty.createDeal')}
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
                    {t('dealContext.edit')}
                  </Button>
                  {selectedDeal.status === 'active' && (
                    <Popconfirm
                      title={t('dealContext.archiveConfirm.title')}
                      content={t('dealContext.archiveConfirm.content')}
                      onOk={() => handleArchive(selectedDeal)}
                    >
                      <Button>{t('dealContext.archive')}</Button>
                    </Popconfirm>
                  )}
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>{t('dealContext.details.transactionDetails')}</div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('dealContext.details.type')}</span>
                  <span className={styles.detailValue}>{transactionTypeLabels[selectedDeal.transactionType]}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('dealContext.details.status')}</span>
                  <span className={styles.detailValue}>{statusLabels[selectedDeal.status]}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('dealContext.details.created')}</span>
                  <span className={styles.detailValue}>{formatDate(selectedDeal.createdAt)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('dealContext.details.updated')}</span>
                  <span className={styles.detailValue}>{formatDate(selectedDeal.updatedAt)}</span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>{t('dealContext.details.targetCompany')}</div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('dealContext.details.name')}</span>
                  <span className={styles.detailValue}>{selectedDeal.targetCompany.name}</span>
                </div>
                {selectedDeal.targetCompany.industry && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('dealContext.details.industry')}</span>
                    <span className={styles.detailValue}>{selectedDeal.targetCompany.industry}</span>
                  </div>
                )}
                {selectedDeal.targetCompany.jurisdiction && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('dealContext.details.jurisdiction')}</span>
                    <span className={styles.detailValue}>{selectedDeal.targetCompany.jurisdiction}</span>
                  </div>
                )}
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>{t('dealContext.details.parties')}</div>
                <div className={styles.partyList}>
                  {selectedDeal.parties.map((party, index) => (
                    <div key={index} className={styles.partyItem}>
                      <span className={styles.partyName}>{party.name}</span>
                      <span className={styles.partyRole}>{partyRoleLabels[party.role]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {documents.length > 0 && (
                <div className={styles.documentSection}>
                  <div className={styles.detailSectionTitle}>
                    {t('dealContext.documents.title', { count: documents.length })}
                  </div>
                  <div className={styles.documentList}>
                    {documents.map((doc) => (
                      <div key={doc.id} className={styles.documentItem}>
                        <span className={styles.documentIcon}>
                          <FileText size={20} />
                        </span>
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
              <div className={styles.emptyIcon}>
                <Left size={48} />
              </div>
              <div className={styles.emptyTitle}>{t('dealContext.empty.selectDeal')}</div>
              <div className={styles.emptyText}>{t('dealContext.empty.selectDealText')}</div>
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
