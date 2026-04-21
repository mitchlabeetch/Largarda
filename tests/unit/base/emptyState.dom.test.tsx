/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/renderer/components/base/EmptyState';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: { defaultValue: string }) => defaultValue?.defaultValue || key,
  }),
}));

describe('EmptyState Component', () => {
  it('renders with title and description', () => {
    render(<EmptyState title='No documents' description='Upload your first document to get started' />);

    expect(screen.getByText('No documents')).toBeInTheDocument();
    expect(screen.getByText('Upload your first document to get started')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState icon={<div data-testid='custom-icon'>📄</div>} title='No documents' />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders primary action button', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title='No documents'
        primaryAction={{
          label: 'Upload',
          onClick: handleClick,
        }}
      />
    );

    const button = screen.getByText('Upload');
    expect(button).toBeInTheDocument();
  });

  it('calls primary action onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        title='No documents'
        primaryAction={{
          label: 'Upload',
          onClick: handleClick,
        }}
      />
    );

    const button = screen.getByText('Upload');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button', () => {
    render(
      <EmptyState
        title='No documents'
        primaryAction={{
          label: 'Upload',
          onClick: vi.fn(),
        }}
        secondaryAction={{
          label: 'Learn More',
          onClick: vi.fn(),
        }}
      />
    );

    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState title='No documents' className='custom-class' />);

    expect(container.querySelector('.empty-state')).toHaveClass('custom-class');
  });

  it('renders without description', () => {
    render(<EmptyState title='No documents' />);

    expect(screen.getByText('No documents')).toBeInTheDocument();
  });
});
