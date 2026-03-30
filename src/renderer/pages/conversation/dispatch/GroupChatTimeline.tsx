/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import MarkdownView from '@renderer/components/Markdown';
import { iconColors } from '@/renderer/styles/colors';
import { copyText } from '@/renderer/utils/ui/clipboard';
import { stripThinkTags, hasThinkTags } from '@renderer/utils/chat/thinkTagFilter';
import { Message, Spin, Tooltip } from '@arco-design/web-react';
import { Copy, Down, People } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useAutoScroll } from '../Messages/useAutoScroll';
import ChildTaskCard from './ChildTaskCard';
import ProgressCard, { parseProgressBlock } from './components/ProgressCard';
import type { GroupChatTimelineMessage, GroupChatTimelineProps } from './types';

const isTaskMessage = (messageType: string): boolean => {
  return (
    messageType === 'task_started' ||
    messageType === 'task_progress' ||
    messageType === 'task_completed' ||
    messageType === 'task_failed' ||
    messageType === 'task_cancelled'
  );
};

/** Filter think tags from content string */
const filterThinkTags = (content: string): string => {
  if (hasThinkTags(content)) {
    return stripThinkTags(content);
  }
  return content;
};

/** Copy button, same pattern as MessageText */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const { t } = useTranslation();

  const handleCopy = useCallback(() => {
    copyText(text).catch(() => {
      Message.error(t('common.copyFailed'));
    });
  }, [text, t]);

  return (
    <Tooltip content={t('common.copy', { defaultValue: 'Copy' })}>
      <div
        className='p-4px rd-4px cursor-pointer hover:bg-3 transition-colors opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
        onClick={handleCopy}
        style={{ lineHeight: 0 }}
      >
        <Copy theme='outline' size='16' fill={iconColors.secondary} />
      </div>
    </Tooltip>
  );
};

/** User message bubble — same style as MessageText (right-aligned, bg-aou-2, copy button) */
const UserMessageBubble: React.FC<{ content: string }> = React.memo(({ content }) => {
  const filtered = filterThinkTags(content);

  return (
    <div className='flex justify-end m-t-10px max-w-full md:max-w-780px mx-auto px-8px'>
      <div className='min-w-0 flex flex-col items-end group'>
        <div
          className='min-w-0 bg-aou-2 p-8px [&>p:first-child]:mt-0px [&>p:last-child]:mb-0px md:max-w-780px'
          style={{ borderRadius: '8px 0 8px 8px' }}
        >
          <MarkdownView codeStyle={{ marginTop: 4, marginBlock: 4 }}>{filtered}</MarkdownView>
        </div>
        <div className='h-32px flex items-center mt-4px justify-end'>
          <CopyButton text={filtered} />
        </div>
      </div>
    </div>
  );
});

/** Agent message bubble — left-aligned with avatar, name, copy button, think tag stripping */
const AgentMessageBubble: React.FC<{
  content: string;
  displayName: string;
  avatar?: string;
  dispatcherAvatar?: string;
}> = React.memo(({ content, displayName, avatar, dispatcherAvatar }) => {
  const resolvedAvatar = avatar || dispatcherAvatar;
  const progressData = content ? parseProgressBlock(content) : null;
  const filtered = filterThinkTags(content);

  return (
    <div className='flex items-start gap-8px m-t-10px max-w-full md:max-w-780px mx-auto px-8px'>
      <div className='flex-shrink-0 w-28px h-28px flex-center mt-2px'>
        {resolvedAvatar && (resolvedAvatar.startsWith('/') || resolvedAvatar.startsWith('http') || resolvedAvatar.startsWith('data:')) ? (
          <img src={resolvedAvatar} alt={displayName} className='w-24px h-24px object-contain' />
        ) : resolvedAvatar ? (
          <span className='text-24px leading-none'>{resolvedAvatar}</span>
        ) : (
          <People theme='outline' size='24' className='text-t-secondary' />
        )}
      </div>
      <div className='min-w-0 flex-1 flex flex-col items-start group'>
        <span className='text-12px text-t-secondary mb-2px'>{displayName}</span>
        <div className='min-w-0 w-full [&>p:first-child]:mt-0px [&>p:last-child]:mb-0px'>
          {progressData ? (
            <ProgressCard data={progressData} />
          ) : (
            <MarkdownView codeStyle={{ marginTop: 4, marginBlock: 4 }}>{filtered}</MarkdownView>
          )}
        </div>
        <div className='h-32px flex items-center mt-4px justify-start'>
          <CopyButton text={filtered} />
        </div>
      </div>
    </div>
  );
});

const GroupChatTimeline: React.FC<GroupChatTimelineProps> = ({
  messages,
  isLoading,
  dispatcherName,
  dispatcherAvatar,
  onCancelChild,
  conversationId,
  onViewDetail,
  selectedChildTaskId,
  onSaveTeammate,
  savedTeammateNames,
}) => {
  const { t } = useTranslation();

  const sortedMessages = useMemo(() => [...messages].toSorted((a, b) => a.timestamp - b.timestamp), [messages]);

  // Adapt GroupChatTimelineMessage[] → TMessage-compatible for useAutoScroll
  // The hook only checks last message's position to force scroll on user send
  const scrollMessages = useMemo(
    () =>
      sortedMessages.map((m) => ({
        position: m.sourceRole === 'user' ? ('right' as const) : ('left' as const),
      })),
    [sortedMessages],
  );

  const {
    virtuosoRef,
    handleScroll,
    handleAtBottomStateChange,
    handleFollowOutput,
    showScrollButton,
    scrollToBottom,
    hideScrollButton,
  } = useAutoScroll({
    // Cast is safe — hook only reads .position and .length
    messages: scrollMessages as Parameters<typeof useAutoScroll>[0]['messages'],
    itemCount: sortedMessages.length,
  });

  const handleScrollButtonClick = useCallback(() => {
    hideScrollButton();
    scrollToBottom('smooth');
  }, [hideScrollButton, scrollToBottom]);

  if (isLoading) {
    return (
      <div className='flex-center flex-1'>
        <Spin />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className='flex-center flex-1 flex-col gap-12px'>
        {dispatcherAvatar &&
        (dispatcherAvatar.startsWith('/') ||
          dispatcherAvatar.startsWith('http') ||
          dispatcherAvatar.startsWith('data:')) ? (
          <img src={dispatcherAvatar} alt={dispatcherName} className='w-48px h-48px object-contain' />
        ) : dispatcherAvatar ? (
          <span className='text-48px leading-none'>{dispatcherAvatar}</span>
        ) : (
          <People theme='outline' size='48' className='text-t-secondary' />
        )}
        <span className='text-16px font-medium text-t-primary'>{dispatcherName}</span>
        <span className='text-14px text-t-secondary'>
          {t('dispatch.timeline.emptyState', { name: dispatcherName })}
        </span>
      </div>
    );
  }

  const renderItem = (_index: number, message: GroupChatTimelineMessage) => {
    // System messages: center-aligned
    if (message.messageType === 'system') {
      return (
        <div className='flex justify-center m-t-10px max-w-full md:max-w-780px mx-auto px-8px'>
          <span className='text-12px text-t-secondary'>{message.content}</span>
        </div>
      );
    }

    // Task status cards
    if (isTaskMessage(message.messageType)) {
      return (
        <div className='m-t-10px max-w-full md:max-w-780px mx-auto px-8px'>
          <ChildTaskCard
            message={message}
            onCancel={onCancelChild}
            conversationId={conversationId}
            onViewDetail={onViewDetail}
            isSelected={selectedChildTaskId === message.childTaskId}
            onSave={onSaveTeammate}
            isSaved={message.displayName ? savedTeammateNames?.has(message.displayName) : false}
          />
        </div>
      );
    }

    // User messages: right-aligned bubble (reuses single chat pattern)
    if (message.sourceRole === 'user') {
      return <UserMessageBubble content={message.content} />;
    }

    // Agent messages: left-aligned with avatar (reuses single chat pattern)
    return (
      <AgentMessageBubble
        content={message.content}
        displayName={message.displayName}
        avatar={message.avatar}
        dispatcherAvatar={dispatcherAvatar}
      />
    );
  };

  return (
    <div className='relative flex-1 h-full'>
      <Virtuoso
        ref={virtuosoRef}
        className='flex-1 h-full pb-10px box-border'
        data={sortedMessages}
        initialTopMostItemIndex={sortedMessages.length - 1}
        atBottomThreshold={100}
        increaseViewportBy={200}
        itemContent={renderItem}
        followOutput={handleFollowOutput}
        onScroll={handleScroll}
        atBottomStateChange={handleAtBottomStateChange}
        components={{
          Header: () => <div className='h-10px' />,
          Footer: () => <div className='h-20px' />,
        }}
      />

      {showScrollButton && (
        <>
          <div className='absolute bottom-0 left-0 right-0 h-100px pointer-events-none' />
          <div className='absolute bottom-20px left-50% transform -translate-x-50% z-100'>
            <div
              className={classNames(
                'flex items-center justify-center w-40px h-40px rd-full bg-base shadow-lg',
                'cursor-pointer hover:bg-1 transition-all hover:scale-110 border-1 border-solid border-3',
              )}
              onClick={handleScrollButtonClick}
              title={t('messages.scrollToBottom')}
              style={{ lineHeight: 0 }}
            >
              <Down theme='filled' size='20' fill={iconColors.secondary} style={{ display: 'block' }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupChatTimeline;
