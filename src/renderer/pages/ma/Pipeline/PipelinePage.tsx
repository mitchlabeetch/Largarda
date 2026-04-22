/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PipelinePage Component
 * Deal pipeline interface with drag-drop stage management.
 * Supports keyboard navigation for accessibility.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tag, Dropdown, Message, Modal, Input } from '@arco-design/web-react';
import { Plus, More, Edit, Delete, ArrowRight, ArrowLeft } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useDealContext } from '@/renderer/hooks/ma/useDealContext';
import { EmptyState } from '@/renderer/components/base';
import type { DealContext, DealStatus } from '@/common/ma/types';
import styles from './PipelinePage.module.css';

interface PipelineStage {
  id: string;
  name: string;
  deals: DealContext[];
  color: string;
}

interface DragState {
  dealId: string | null;
  sourceStageId: string | null;
}

interface FocusState {
  stageIndex: number;
  dealIndex: number;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'lead', name: 'lead', deals: [], color: 'blue' },
  { id: 'qualified', name: 'qualified', deals: [], color: 'cyan' },
  { id: 'negotiation', name: 'negotiation', deals: [], color: 'orange' },
  { id: 'due_diligence', name: 'dueDiligence', deals: [], color: 'purple' },
  { id: 'closing', name: 'closing', deals: [], color: 'magenta' },
  { id: 'closed', name: 'closed', deals: [], color: 'green' },
];

export function PipelinePage() {
  const { t } = useTranslation('ma');
  const { deals, isLoading, updateDeal } = useDealContext();
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [dragState, setDragState] = useState<DragState>({ dealId: null, sourceStageId: null });
  const [focusState, setFocusState] = useState<FocusState>({ stageIndex: 0, dealIndex: -1 });
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dealRefs = useRef<(HTMLButtonElement | null)[][]>([]);

  // Distribute deals into stages based on their status/extra.pipelineStage
  useEffect(() => {
    const stageMap = new Map(DEFAULT_STAGES.map((s) => [s.id, { ...s, deals: [] as DealContext[] }]));

    deals.forEach((deal) => {
      const stageId = (deal.extra?.pipelineStage as string) || deal.status;
      const stage = stageMap.get(stageId) || stageMap.get('lead');
      if (stage) {
        stage.deals.push(deal);
      }
    });

    setStages(Array.from(stageMap.values()));
  }, [deals]);

  const handleDragStart = useCallback((dealId: string, stageId: string) => {
    setDragState({ dealId, sourceStageId: stageId });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({ dealId: null, sourceStageId: null });
  }, []);

  const handleDrop = useCallback(
    async (targetStageId: string) => {
      const { dealId, sourceStageId } = dragState;
      if (!dealId || sourceStageId === targetStageId) return;

      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;

      // Update deal with new pipeline stage
      const updated = await updateDeal(dealId, {
        extra: { ...deal.extra, pipelineStage: targetStageId },
      });

      if (updated) {
        Message.success(t('pipeline.dealMoved', { stage: t(`pipeline.stages.${targetStageId}`) }));
      }

      setDragState({ dealId: null, sourceStageId: null });
    },
    [dragState, deals, updateDeal, t]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { stageIndex, dealIndex } = focusState;
      const maxStageIndex = stages.length - 1;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          if (stageIndex < maxStageIndex) {
            const newStageIndex = stageIndex + 1;
            const newDealIndex = Math.min(dealIndex, stages[newStageIndex].deals.length - 1);
            setFocusState({ stageIndex: newStageIndex, dealIndex: newDealIndex });
            dealRefs.current[newStageIndex]?.[Math.max(0, newDealIndex)]?.focus();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (stageIndex > 0) {
            const newStageIndex = stageIndex - 1;
            const newDealIndex = Math.min(dealIndex, stages[newStageIndex].deals.length - 1);
            setFocusState({ stageIndex: newStageIndex, dealIndex: newDealIndex });
            dealRefs.current[newStageIndex]?.[Math.max(0, newDealIndex)]?.focus();
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (dealIndex < stages[stageIndex].deals.length - 1) {
            const newDealIndex = dealIndex + 1;
            setFocusState({ stageIndex, dealIndex: newDealIndex });
            dealRefs.current[stageIndex]?.[newDealIndex]?.focus();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (dealIndex > 0) {
            const newDealIndex = dealIndex - 1;
            setFocusState({ stageIndex, dealIndex: newDealIndex });
            dealRefs.current[stageIndex]?.[newDealIndex]?.focus();
          }
          break;
        case 'Enter':
        case ' ':
          if (dealIndex >= 0) {
            event.preventDefault();
            // Select/open deal
            const deal = stages[stageIndex].deals[dealIndex];
            if (deal) {
              // Navigate to deal detail (would need router)
              console.log('Open deal:', deal.id);
            }
          }
          break;
      }
    },
    [focusState, stages]
  );

  const handleDealFocus = useCallback((stageIdx: number, dealIdx: number) => {
    setFocusState({ stageIndex: stageIdx, dealIndex: dealIdx });
  }, []);

  const handleMoveDeal = useCallback(
    async (deal: DealContext, direction: 'left' | 'right') => {
      const currentStageIndex = stages.findIndex((s) => s.deals.some((d) => d.id === deal.id));
      const newStageIndex = direction === 'left' ? currentStageIndex - 1 : currentStageIndex + 1;

      if (newStageIndex < 0 || newStageIndex >= stages.length) return;

      const targetStageId = stages[newStageIndex].id;
      const updated = await updateDeal(deal.id, {
        extra: { ...deal.extra, pipelineStage: targetStageId },
      });

      if (updated) {
        Message.success(t('pipeline.dealMoved', { stage: t(`pipeline.stages.${targetStageId}`) }));
      }
    },
    [stages, updateDeal, t]
  );

  const totalDeals = useMemo(() => deals.length, [deals]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      onKeyDown={handleKeyDown}
      role='application'
      aria-label={t('pipeline.aria.pipelineBoard')}
    >
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t('pipeline.title')}</h1>
          <span className={styles.count}>{t('pipeline.count', { count: totalDeals })}</span>
        </div>
        <div className={styles.headerRight}>
          <Button type='primary' icon={<Plus />} onClick={() => setIsAddStageModalOpen(true)}>
            {t('pipeline.addStage')}
          </Button>
        </div>
      </header>

      {/* Pipeline Board */}
      <main className={styles.board} role='list' aria-label={t('pipeline.aria.stageList')}>
        {stages.map((stage, stageIdx) => (
          <div
            key={stage.id}
            ref={(el) => {
              stageRefs.current[stageIdx] = el;
            }}
            className={styles.stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage.id)}
            role='listitem'
            aria-label={t(`pipeline.stages.${stage.name}`)}
          >
            {/* Stage Header */}
            <div className={styles.stageHeader}>
              <Tag color={stage.color} className={styles.stageTag}>
                {t(`pipeline.stages.${stage.name}`)}
              </Tag>
              <span className={styles.dealCount}>{stage.deals.length}</span>
              <Dropdown
                droplist={
                  <div className={styles.stageMenu}>
                    <Button type='text' size='small' icon={<Edit />}>
                      {t('pipeline.editStage')}
                    </Button>
                    <Button type='text' size='small' status='danger' icon={<Delete />}>
                      {t('pipeline.deleteStage')}
                    </Button>
                  </div>
                }
                trigger='click'
                position='br'
              >
                <Button type='text' size='small' icon={<More />} aria-label={t('pipeline.stageOptions')} />
              </Dropdown>
            </div>

            {/* Stage Content */}
            <div className={styles.stageContent}>
              {stage.deals.length === 0 ? (
                <div className={styles.emptyStage}>
                  <EmptyState
                    title={t('pipeline.emptyStage.title')}
                    description={t('pipeline.emptyStage.description')}
                  />
                </div>
              ) : (
                stage.deals.map((deal, dealIdx) => (
                  <button
                    key={deal.id}
                    ref={(el) => {
                      if (!dealRefs.current[stageIdx]) dealRefs.current[stageIdx] = [];
                      dealRefs.current[stageIdx][dealIdx] = el;
                    }}
                    className={`${styles.dealCard} ${
                      focusState.stageIndex === stageIdx && focusState.dealIndex === dealIdx
                        ? styles.dealCardFocused
                        : ''
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(deal.id, stage.id)}
                    onDragEnd={handleDragEnd}
                    onFocus={() => handleDealFocus(stageIdx, dealIdx)}
                    aria-grabbed={dragState.dealId === deal.id}
                    role='button'
                    aria-label={t('pipeline.dealCardAria', {
                      name: deal.name,
                      stage: t(`pipeline.stages.${stage.name}`),
                    })}
                  >
                    <div className={styles.dealHeader}>
                      <span className={styles.dealName}>{deal.name}</span>
                      <Dropdown
                        droplist={
                          <div className={styles.dealMenu}>
                            {stageIdx > 0 && (
                              <Button
                                type='text'
                                size='small'
                                icon={<ArrowLeft />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveDeal(deal, 'left');
                                }}
                              >
                                {t('pipeline.moveLeft')}
                              </Button>
                            )}
                            {stageIdx < stages.length - 1 && (
                              <Button
                                type='text'
                                size='small'
                                icon={<ArrowRight />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveDeal(deal, 'right');
                                }}
                              >
                                {t('pipeline.moveRight')}
                              </Button>
                            )}
                            <Button type='text' size='small' icon={<Edit />}>
                              {t('common.edit')}
                            </Button>
                          </div>
                        }
                        trigger='click'
                        position='br'
                      >
                        <span
                          className={styles.dealMenuTrigger}
                          onClick={(e) => e.stopPropagation()}
                          role='button'
                          aria-label={t('pipeline.dealOptions')}
                        >
                          <More />
                        </span>
                      </Dropdown>
                    </div>
                    <div className={styles.dealMeta}>
                      <Tag size='small'>{deal.transactionType}</Tag>
                      <span className={styles.targetCompany}>{deal.targetCompany.name}</span>
                    </div>
                    <div className={styles.dealParties}>
                      {deal.parties.slice(0, 2).map((party) => (
                        <span key={party.name} className={styles.partyTag}>
                          {party.name}
                        </span>
                      ))}
                      {deal.parties.length > 2 && <span className={styles.partyMore}>+{deal.parties.length - 2}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </main>

      {/* Keyboard Navigation Instructions */}
      <footer className={styles.keyboardHints} role='contentinfo'>
        <span>{t('pipeline.keyboardHint')}</span>
      </footer>

      {/* Add Stage Modal */}
      <Modal
        title={t('pipeline.addStageTitle')}
        visible={isAddStageModalOpen}
        onOk={() => {
          if (newStageName.trim()) {
            // Add stage logic would go here
            setNewStageName('');
            setIsAddStageModalOpen(false);
          }
        }}
        onCancel={() => {
          setNewStageName('');
          setIsAddStageModalOpen(false);
        }}
      >
        <Input placeholder={t('pipeline.stageNamePlaceholder')} value={newStageName} onChange={setNewStageName} />
      </Modal>
    </div>
  );
}

export default PipelinePage;
