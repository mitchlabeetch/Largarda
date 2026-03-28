/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Card, Modal, Spin, Tag } from '@arco-design/web-react';
import { CheckOne, CloseOne, Forbid, Loading, People } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChildTaskDetail } from './hooks/useChildTaskDetail';
import type { ChildTaskCardProps } from './types';
import styles from './ChildTaskCard.module.css';

/** Map messageType to a card status for styling */
const getCardStatus = (messageType: string): 'started' | 'running' | 'completed' | 'failed' | 'cancelled' => {
  switch (messageType) {
    case 'task_started':
      return 'started';
    case 'task_progress':
      return 'running';
    case 'task_completed':
      return 'completed';
    case 'task_failed':
      return 'failed';
    case 'task_cancelled':
      return 'cancelled';
    default:
      return 'started';
  }
};

const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'started':
      return <Loading theme='outline' size='14' />;
    case 'running':
      return <Spin size={14} />;
    case 'completed':
      return <CheckOne theme='outline' size='14' fill='rgb(var(--success-6))' />;
    case 'failed':
      return <CloseOne theme='outline' size='14' fill='rgb(var(--danger-6))' />;
    case 'cancelled':
      return <Forbid theme='outline' size='14' fill='var(--color-text-3)' />;
    default:
      return <Loading theme='outline' size='14' />;
  }
};

const getTagColor = (status: string): string => {
  switch (status) {
    case 'started':
    case 'running':
      return 'arcoblue';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'cancelled':
      return 'gray';
    default:
      return 'arcoblue';
  }
};

const ChildTaskCard: React.FC<ChildTaskCardProps> = ({ message, onCancel }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { loadTranscript, getTranscript, isTranscriptLoading } = useChildTaskDetail();

  const status = getCardStatus(message.messageType);
  const statusText =
    status === 'cancelled'
      ? t('dispatch.timeline.taskCancelled')
      : t(`dispatch.timeline.task${status.charAt(0).toUpperCase()}${status.slice(1)}`);

  const canCancel = (status === 'started' || status === 'running') && Boolean(onCancel);

  const handleCancel = useCallback(() => {
    if (!message.childTaskId || !onCancel) return;
    const title = message.displayName || message.content || 'task';
    Modal.confirm({
      title: t('dispatch.childTask.cancelConfirmTitle'),
      content: t('dispatch.childTask.cancelConfirmContent', { title }),
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        setCancelling(true);
        try {
          await onCancel(message.childTaskId!);
        } finally {
          setCancelling(false);
        }
      },
    });
  }, [message.childTaskId, message.displayName, message.content, onCancel, t]);

  const handleToggleExpand = useCallback(() => {
    if (!expanded && message.childTaskId) {
      loadTranscript(message.childTaskId);
    }
    setExpanded((prev) => !prev);
  }, [expanded, message.childTaskId, loadTranscript]);

  const transcript = message.childTaskId ? getTranscript(message.childTaskId) : undefined;
  const transcriptLoading = message.childTaskId ? isTranscriptLoading(message.childTaskId) : false;

  // CF-2: Display progressSummary separately from content (title)
  const progressText = message.progressSummary || '';

  const cardClassName = classNames(styles.card, {
    [styles.cardStarted]: status === 'started',
    [styles.cardRunning]: status === 'running',
    [styles.cardCompleted]: status === 'completed',
    [styles.cardFailed]: status === 'failed',
    [styles.cardCancelled]: status === 'cancelled',
  });

  return (
    <Card bordered hoverable className={cardClassName} style={{ borderRadius: '8px' }}>
      <div className='flex items-center justify-between gap-8px'>
        <div className='flex items-center gap-8px min-w-0 flex-1'>
          {message.avatar ? (
            <span className='text-18px leading-none flex-shrink-0'>{message.avatar}</span>
          ) : (
            <People theme='outline' size='20' className='flex-shrink-0' />
          )}
          <span className='font-medium truncate'>{message.displayName}</span>
          {message.content && (
            <>
              <span className='text-t-secondary'>-</span>
              <span className='truncate text-t-secondary'>{message.content}</span>
            </>
          )}
        </div>
        <div className='flex items-center gap-4px flex-shrink-0'>
          {canCancel && (
            <Button
              type='text'
              size='mini'
              status='danger'
              loading={cancelling}
              icon={<CloseOne theme='outline' size='14' />}
              onClick={handleCancel}
            >
              {cancelling ? t('dispatch.childTask.cancelling') : t('dispatch.childTask.cancel')}
            </Button>
          )}
          <Tag color={getTagColor(status)}>
            <span className='flex items-center gap-4px'>
              {getStatusIcon(status)}
              {statusText}
            </span>
          </Tag>
        </div>
      </div>

      {/* CF-2: Show progressSummary separately when running */}
      {status === 'running' && progressText && <div className='mt-8px text-13px text-t-secondary'>{progressText}</div>}

      <div className='mt-8px flex justify-end'>
        <Button type='text' size='mini' onClick={handleToggleExpand}>
          {expanded ? t('dispatch.timeline.hideDetails') : t('dispatch.timeline.viewDetails')}
        </Button>
      </div>

      {expanded && (
        <div
          className='mt-8px rd-4px p-8px overflow-y-auto'
          style={{ maxHeight: '400px', backgroundColor: 'var(--color-fill-1)' }}
        >
          {transcriptLoading && (
            <div className='flex-center py-16px'>
              <Spin />
            </div>
          )}
          {!transcriptLoading && transcript && transcript.length > 0 && (
            <div className='flex flex-col gap-4px'>
              {transcript.map((msg, index) => (
                <div key={index} className='text-13px'>
                  <span className='font-medium text-t-secondary'>[{msg.role}]</span>{' '}
                  <span className='text-t-primary whitespace-pre-wrap'>{msg.content}</span>
                </div>
              ))}
            </div>
          )}
          {!transcriptLoading && (!transcript || transcript.length === 0) && (
            <div className='text-13px text-t-secondary text-center py-8px'>{t('dispatch.timeline.noTranscript')}</div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ChildTaskCard;
