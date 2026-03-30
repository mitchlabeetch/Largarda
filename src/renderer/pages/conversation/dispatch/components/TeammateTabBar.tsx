/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tag, Tooltip } from '@arco-design/web-react';
import { Close, People, Plus } from '@icon-park/react';
import classNames from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { TeammateTabBarProps } from '../types';

const tabStatusColor: Record<string, string> = {
  working: 'bg-blue-6',
  idle: 'bg-gray-6',
  error: 'bg-red-6',
  released: 'bg-gray-4',
};

/**
 * Unified member tab bar (Slack-like).
 * First tab = admin/leader (with badge), then team members, then [+] button.
 */
const TeammateTabBar: React.FC<TeammateTabBarProps> = ({ tabs, activeTabKey, onTabChange, onTabClose, onAddMemberClick }) => {
  const { t } = useTranslation();

  return (
    <div className='flex items-center px-12px border-b border-bd-primary flex-shrink-0'>
      <div className='flex items-center gap-0 flex-1 overflow-x-auto'>
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className={classNames(
              'flex items-center gap-6px px-12px py-8px cursor-pointer text-13px',
              'border-b-2 transition-colors relative',
              tab.key === activeTabKey
                ? 'border-primary-6 text-primary-6 font-medium'
                : 'border-transparent text-t-secondary hover:text-t-primary',
            )}
            onClick={() => onTabChange(tab.key)}
          >
            {/* Avatar: image URL (svg/png/data:) or emoji text */}
            <div className='flex-shrink-0 w-20px h-20px rd-full flex-center bg-fill-2 text-12px overflow-hidden'>
              {tab.avatar && (tab.avatar.startsWith('/') || tab.avatar.startsWith('http') || tab.avatar.startsWith('data:')) ? (
                <img src={tab.avatar} alt={tab.label} className='w-full h-full object-contain' />
              ) : tab.avatar ? (
                <span className='leading-none'>{tab.avatar}</span>
              ) : (
                <People size='12' />
              )}
            </div>
            {/* Name */}
            <span className='truncate max-w-100px'>{tab.label}</span>
            {/* Admin badge */}
            {tab.memberType === 'admin' && (
              <Tag size='small' color='arcoblue' className='scale-85 origin-left'>
                {t('dispatch.tabs.admin')}
              </Tag>
            )}
            {/* Status dot */}
            {tab.memberType !== 'admin' && (
              <span className={classNames('w-6px h-6px rd-full flex-shrink-0', tabStatusColor[tab.status])} />
            )}
            {/* Unread red dot */}
            {tab.hasUnread && tab.key !== activeTabKey && (
              <span className='absolute top-4px right-4px w-6px h-6px rd-full bg-red-6' />
            )}
            {/* Close button for closable tabs */}
            {tab.closable && (
              <Close
                size='12'
                className='ml-2px hover:text-t-primary flex-shrink-0'
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.key);
                }}
              />
            )}
          </div>
        ))}
        {/* [+] Add member button */}
        {onAddMemberClick && (
          <Tooltip content={t('dispatch.memberBar.addMember')}>
            <div
              className='flex-shrink-0 w-28px h-28px rd-full flex-center cursor-pointer text-t-secondary hover:text-t-primary hover:bg-fill-2 transition-colors ml-4px'
              onClick={onAddMemberClick}
            >
              <Plus size='14' />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default TeammateTabBar;
