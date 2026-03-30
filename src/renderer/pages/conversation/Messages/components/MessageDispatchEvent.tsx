/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IMessageDispatchEvent } from '@/common/chat/chatLib';
import { ipcBridge } from '@/common';
import { useConversationContextSafe } from '@/renderer/hooks/context/ConversationContext';
import { Button, Card, Modal, Spin, Tag } from '@arco-design/web-react';
import { CheckOne, CloseOne, Forbid, Loading, People } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CardStatus = 'started' | 'running' | 'completed' | 'failed' | 'cancelled';

const getCardStatus = (messageType: string): CardStatus => {
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

const getStatusIcon = (status: CardStatus): React.ReactNode => {
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
  }
};

const getTagColor = (status: CardStatus): string => {
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
  }
};

const isTaskEvent = (messageType: string): boolean =>
  messageType.startsWith('task_');

const MessageDispatchEvent: React.FC<{ message: IMessageDispatchEvent }> = ({ message }) => {
  const { t } = useTranslation();
  const conversationContext = useConversationContextSafe();
  const [cancelling, setCancelling] = useState(false);
  const { content } = message;

  // Non-task events (text, system) render as simple text
  if (!isTaskEvent(content.messageType)) {
    if (content.messageType === 'system') {
      return <div className='text-12px text-t-secondary text-center py-4px'>{content.content}</div>;
    }
    return null;
  }

  const status = getCardStatus(content.messageType);
  const statusText =
    status === 'cancelled'
      ? t('dispatch.timeline.taskCancelled')
      : t(`dispatch.timeline.task${status.charAt(0).toUpperCase()}${status.slice(1)}`);

  const canCancel = (status === 'started' || status === 'running') && Boolean(content.childTaskId);

  const handleCancel = useCallback(() => {
    if (!content.childTaskId || !conversationContext?.conversationId) return;
    const title = content.displayName || content.content || 'task';
    Modal.confirm({
      title: t('dispatch.childTask.cancelConfirmTitle'),
      content: t('dispatch.childTask.cancelConfirmContent', { title }),
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        setCancelling(true);
        try {
          await ipcBridge.dispatch.cancelChildTask.invoke({
            conversationId: conversationContext.conversationId,
            childSessionId: content.childTaskId!,
          });
        } finally {
          setCancelling(false);
        }
      },
    });
  }, [content.childTaskId, content.displayName, content.content, conversationContext?.conversationId, t]);

  const progressText = content.progressSummary || '';

  return (
    <Card
      bordered
      hoverable
      style={{
        borderRadius: '8px',
        borderLeft: `3px solid var(--color-${getTagColor(status) === 'arcoblue' ? 'primary' : getTagColor(status)}-6, var(--color-border-2))`,
      }}
    >
      <div className='flex items-center justify-between gap-8px'>
        <div className='flex items-center gap-8px min-w-0 flex-1'>
          {content.avatar ? (
            <span className='text-18px leading-none flex-shrink-0'>{content.avatar}</span>
          ) : (
            <People theme='outline' size='20' className='flex-shrink-0' />
          )}
          <span className='font-medium truncate'>{content.displayName}</span>
          {content.content && (
            <>
              <span className='text-t-secondary'>-</span>
              <span className='truncate text-t-secondary'>{content.content}</span>
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

      {status === 'running' && progressText && <div className='mt-8px text-13px text-t-secondary'>{progressText}</div>}
    </Card>
  );
};

export default React.memo(MessageDispatchEvent);
