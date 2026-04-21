/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Base/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'circle', 'card'],
    },
    width: {
      control: 'text',
    },
    height: {
      control: 'text',
    },
    lines: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Line: Story = {
  args: {
    variant: 'line',
    width: '100%',
    height: '16px',
  },
};

export const LineMultiple: Story = {
  args: {
    variant: 'line',
    lines: 3,
  },
};

export const Circle: Story = {
  args: {
    variant: 'circle',
    width: '40px',
    height: '40px',
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
    width: '100%',
    height: '120px',
  },
};

export const CustomSize: Story = {
  args: {
    variant: 'line',
    width: '200px',
    height: '24px',
  },
};
