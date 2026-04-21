/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState } from './ErrorState';

const meta: Meta<typeof ErrorState> = {
  title: 'Base/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  argTypes: {
    error: {
      control: 'text',
    },
    showObservability: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const StringError: Story = {
  args: {
    error: 'Failed to load data. Please try again.',
    onRetry: () => {},
  },
};

export const ErrorObject: Story = {
  args: {
    error: new Error('Network request failed'),
    onRetry: () => {},
  },
};

export const WithObservability: Story = {
  args: {
    error: new Error('Database connection failed'),
    onRetry: () => {},
    observabilityUrl: 'https://observability.example.com/errors/123',
    showObservability: true,
  },
};

export const WithoutRetry: Story = {
  args: {
    error: 'Permission denied',
  },
};

export const ComplexError: Story = {
  args: {
    error: new Error('Failed to process document'),
    onRetry: () => {},
  },
};
