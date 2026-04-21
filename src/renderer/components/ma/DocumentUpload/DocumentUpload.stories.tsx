/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DocumentUpload } from './DocumentUpload';

const meta: Meta<typeof DocumentUpload> = {
  title: 'M&A/DocumentUpload',
  component: DocumentUpload,
  tags: ['autodocs'],
  argTypes: {
    multiple: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DocumentUpload>;

export const Default: Story = {
  args: {
    dealId: 'deal-123',
    multiple: true,
    onUploadComplete: () => {},
    onUploadError: () => {},
  },
};

export const SingleFile: Story = {
  args: {
    dealId: 'deal-123',
    multiple: false,
    onUploadComplete: () => {},
    onUploadError: () => {},
  },
};
