/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DealSelector } from './DealSelector';
import type { DealContext } from '@/common/ma/types';

const meta: Meta<typeof DealSelector> = {
  title: 'M&A/DealSelector',
  component: DealSelector,
  tags: ['autodocs'],
  argTypes: {
    isLoading: {
      control: 'boolean',
    },
    showCreateButton: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DealSelector>;

const mockDeals: DealContext[] = [
  {
    id: '1',
    name: 'TechCorp Acquisition',
    parties: [],
    transactionType: 'acquisition',
    targetCompany: {
      name: 'TechCorp Inc.',
      industry: 'Technology',
    },
    status: 'active',
    createdAt: new Date('2024-01-15').getTime(),
    updatedAt: new Date('2024-01-20').getTime(),
  },
  {
    id: '2',
    name: 'GreenEnergy Merger',
    parties: [],
    transactionType: 'merger',
    targetCompany: {
      name: 'GreenEnergy Ltd.',
      industry: 'Energy',
    },
    status: 'archived',
    createdAt: new Date('2023-11-01').getTime(),
    updatedAt: new Date('2023-12-15').getTime(),
  },
];

export const Default: Story = {
  args: {
    deals: mockDeals,
    activeDeal: mockDeals[0],
    isLoading: false,
    onSelect: () => {},
    onCreateNew: () => {},
    showCreateButton: true,
  },
};

export const Loading: Story = {
  args: {
    deals: [],
    activeDeal: null,
    isLoading: true,
    onSelect: () => {},
    onCreateNew: () => {},
    showCreateButton: true,
  },
};

export const Empty: Story = {
  args: {
    deals: [],
    activeDeal: null,
    isLoading: false,
    onSelect: () => {},
    onCreateNew: () => {},
    showCreateButton: true,
  },
};

export const WithoutCreateButton: Story = {
  args: {
    deals: mockDeals,
    activeDeal: mockDeals[0],
    isLoading: false,
    onSelect: () => {},
    showCreateButton: false,
  },
};
