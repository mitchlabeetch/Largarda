/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import SendBox from '@/renderer/components/chat/sendbox';
import { Alert, Button, Message, Tag } from '@arco-design/web-react';
import { Close, Info } from '@icon-park/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emitter } from '@/renderer/utils/emitter';

import ChatLayout from '../components/ChatLayout';
import GroupChatTimeline from './GroupChatTimeline';
import { useGroupChatInfo } from './hooks/useGroupChatInfo';
import { useGroupChatMessages } from './hooks/useGroupChatMessages';
import type { GroupChatViewProps } from './types';

const GroupChatView: React.FC<GroupChatViewProps> = ({ conversation }) => {
  const { t } = useTranslation();
  const { messages, isLoading: messagesLoading } = useGroupChatMessages(conversation.id);
  const { info, error: infoError, retry: retryInfo, refresh: refreshInfo } = useGroupChatInfo(conversation.id);
  const [sendBoxContent, setSendBoxContent] = useState('');
  const [sending, setSending] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const extra = conversation.extra as {
    groupChatName?: string;
    teammateConfig?: { avatar?: string };
  };

  const dispatcherName = info?.dispatcherName || extra.groupChatName || conversation.name;
  const dispatcherAvatar = extra.teammateConfig?.avatar;

  const activeChildCount = useMemo(() => {
    if (!info?.children) return 0;
    return info.children.filter((c) => c.status === 'running' || c.status === 'pending').length;
  }, [info?.children]);

  const pendingCount = info?.pendingNotificationCount ?? 0;
  const showBanner = pendingCount > 0 && !bannerDismissed;

  // F-2.5: Cancel child task handler
  const handleCancelChild = useCallback(
    async (childTaskId: string) => {
      try {
        const result = await ipcBridge.dispatch.cancelChildTask.invoke({
          conversationId: conversation.id,
          childSessionId: childTaskId,
        });
        if (!result || !result.success) {
          Message.error(t('dispatch.childTask.cancelFailed'));
        } else {
          refreshInfo();
        }
      } catch (err) {
        console.error('[GroupChatView] cancel failed:', err);
        Message.error(t('dispatch.childTask.cancelFailed'));
      }
    },
    [conversation.id, refreshInfo, t]
  );

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim()) return;
      setSending(true);
      setBannerDismissed(true);

      try {
        await ipcBridge.conversation.sendMessage.invoke({
          input: message,
          msg_id: uuid(),
          conversation_id: conversation.id,
        });
        emitter.emit('chat.history.refresh');
        // Refresh info to update pending count after send
        refreshInfo();
      } finally {
        setSending(false);
      }
    },
    [conversation.id, refreshInfo]
  );

  const headerExtra = useMemo(() => {
    if (activeChildCount === 0) return undefined;
    return <Tag color='arcoblue'>{t('dispatch.header.taskCount', { count: activeChildCount })}</Tag>;
  }, [activeChildCount, t]);

  // CF-3: Error state for group chat info fetch failure
  if (infoError) {
    return (
      <ChatLayout
        workspaceEnabled={false}
        agentName={conversation.name}
        sider={null}
        conversationId={conversation.id}
        title={conversation.name}
      >
        <div className='flex-center flex-1 flex-col gap-12px'>
          <Alert type='error' content={t('dispatch.error.groupChatLoadFailed')} style={{ maxWidth: '400px' }} />
          <Button type='primary' onClick={retryInfo}>
            {t('dispatch.error.retry')}
          </Button>
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout
      workspaceEnabled={false}
      agentName={dispatcherName}
      agentLogo={dispatcherAvatar}
      agentLogoIsEmoji={Boolean(dispatcherAvatar)}
      headerExtra={headerExtra}
      sider={null}
      conversationId={conversation.id}
      title={conversation.name}
    >
      <div className='flex-1 flex flex-col min-h-0'>
        {showBanner && (
          <div
            className='mx-16px mt-8px px-16px py-12px rd-8px flex items-center justify-between'
            style={{
              backgroundColor: 'rgba(var(--primary-6), 0.08)',
              border: '1px solid rgba(var(--primary-6), 0.2)',
            }}
          >
            <div className='flex items-center gap-8px text-14px text-t-primary'>
              <Info theme='outline' size='16' fill='rgb(var(--primary-6))' />
              <span>{t('dispatch.notification.pendingTasks', { count: pendingCount })}</span>
            </div>
            <Button
              type='text'
              size='mini'
              icon={<Close theme='outline' size='14' />}
              onClick={() => setBannerDismissed(true)}
            />
          </div>
        )}

        <GroupChatTimeline
          messages={messages}
          isLoading={messagesLoading}
          dispatcherName={dispatcherName}
          dispatcherAvatar={dispatcherAvatar}
          onCancelChild={handleCancelChild}
          conversationId={conversation.id}
        />

        <div className='max-w-800px w-full mx-auto mb-16px px-20px'>
          <SendBox
            value={sendBoxContent}
            onChange={setSendBoxContent}
            loading={sending}
            placeholder={t('dispatch.timeline.sendPlaceholder', { name: dispatcherName })}
            onSend={handleSend}
            defaultMultiLine={true}
            lockMultiLine={true}
            className='z-10'
          />
        </div>
      </div>
    </ChatLayout>
  );
};

export default GroupChatView;
