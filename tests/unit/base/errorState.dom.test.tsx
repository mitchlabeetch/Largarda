/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/renderer/components/base/ErrorState';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: { defaultValue: string }) => defaultValue?.defaultValue || key,
  }),
}));

describe('ErrorState Component', () => {
  it('renders with string error', () => {
    render(<ErrorState error='Something went wrong' />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with Error object', () => {
    const error = new Error('Network failed');
    render(<ErrorState error={error} />);

    expect(screen.getByText('Network failed')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    render(<ErrorState error='Something went wrong' onRetry={vi.fn()} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(<ErrorState error='Something went wrong' onRetry={handleRetry} />);

    const button = screen.getByText('Retry');
    await user.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders observability link when showObservability is true', () => {
    render(
      <ErrorState
        error='Something went wrong'
        observabilityUrl='https://example.com/observability'
        showObservability={true}
      />
    );

    expect(screen.getByText('View in Observability')).toBeInTheDocument();
  });

  it('does not render observability link when showObservability is false', () => {
    render(
      <ErrorState
        error='Something went wrong'
        observabilityUrl='https://example.com/observability'
        showObservability={false}
      />
    );

    expect(screen.queryByText('View in Observability')).not.toBeInTheDocument();
  });

  it('renders stack trace when error is Error object', () => {
    const error = new Error('Test error');
    render(<ErrorState error={error} />);

    expect(screen.getByText('Stack Trace')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it('does not render stack trace when error is string', () => {
    render(<ErrorState error='String error' />);

    expect(screen.queryByText('Stack Trace')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorState error='Something went wrong' className='custom-class' />);

    expect(container.querySelector('.error-state')).toHaveClass('custom-class');
  });
});
