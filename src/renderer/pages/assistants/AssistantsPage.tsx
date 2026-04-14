/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empty, Input, Typography } from '@arco-design/web-react';
import { Search } from '@icon-park/react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgentTabBar from './components/AgentTabBar';
import AssistantCard from './components/AssistantCard';
import { useAssistantsPageData } from './hooks/useAssistantsPageData';

const AssistantsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { filteredItems, activeTab, setActiveTab, tabCounts } = useAssistantsPageData();

  const displayedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredItems;
    return filteredItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [filteredItems, searchQuery]);

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-24px pt-20px pb-12px gap-16px'>
        <Typography.Title heading={5} className='!mb-0 shrink-0'>
          {t('common.assistants.title')}
        </Typography.Title>
        <Input
          prefix={<Search theme='outline' size='16' />}
          placeholder={t('common.assistants.searchPlaceholder')}
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
          allowClear
          className='max-w-240px'
        />
      </div>

      {/* Tab bar */}
      <div className='px-24px border-b border-solid border-border-1'>
        <AgentTabBar activeTab={activeTab} onTabChange={setActiveTab} tabCounts={tabCounts} />
      </div>

      {/* Card grid */}
      <div className='flex-1 overflow-y-auto px-24px py-16px'>
        {displayedItems.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <Empty description={t('common.assistants.empty')} />
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-16px lg:grid-cols-3'>
            {displayedItems.map((item) => (
              <AssistantCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantsPage;
