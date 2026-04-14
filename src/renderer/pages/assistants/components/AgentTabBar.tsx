/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tabs } from '@arco-design/web-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentTab } from '../types';

type AgentTabBarProps = {
  activeTab: AgentTab;
  onTabChange: (tab: AgentTab) => void;
  tabCounts: Record<Exclude<AgentTab, 'all'> | 'all', number>;
};

const AgentTabBar: React.FC<AgentTabBarProps> = ({ activeTab, onTabChange, tabCounts }) => {
  const { t } = useTranslation();

  const tabs: { key: AgentTab; labelKey: string }[] = [
    { key: 'all', labelKey: 'assistants.tab.all' },
    { key: 'assistant', labelKey: 'assistants.tab.assistant' },
    { key: 'local', labelKey: 'assistants.tab.local' },
    { key: 'remote', labelKey: 'assistants.tab.remote' },
  ];

  return (
    <Tabs activeTab={activeTab} onChange={(key) => onTabChange(key as AgentTab)} className='mb-0'>
      {tabs.map(({ key, labelKey }) => (
        <Tabs.TabPane
          key={key}
          title={
            <span>
              {t(labelKey)}
              {tabCounts[key] > 0 && <span className='ml-4px text-text-3 text-12px'>({tabCounts[key]})</span>}
            </span>
          }
        />
      ))}
    </Tabs>
  );
};

export default AgentTabBar;
