/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { FileText, Plus } from '@icon-park/react';

const meta: Meta<typeof EmptyState> = {
  title: 'Base/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    i18nNs: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <FileText size={64} />,
    title: 'No documents yet',
    description: 'Upload your first document to get started',
  },
};

export const WithActions: Story = {
  args: {
    icon: <FileText size={64} />,
    title: 'No documents yet',
    description: 'Upload your first document to get started',
    primaryAction: {
      label: 'Upload Document',
      onClick: () => {},
      icon: <Plus />,
      type: 'primary',
    },
    secondaryAction: {
      label: 'Learn More',
      onClick: () => {},
      type: 'default',
    },
  },
};

export const Minimal: Story = {
  args: {
    title: 'No data',
  },
};

export const CustomNamespace: Story = {
  args: {
    icon: <FileText size={64} />,
    title: 'ma.emptyState.noDeals',
    description: 'ma.emptyState.createFirstDeal',
    i18nNs: 'ma',
  },
};
