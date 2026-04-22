/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingModal from '@renderer/pages/onboarding/components/OnboardingModal';
import React from 'react';

// Hoisted mock setup
const { mockConfigStorage } = vi.hoisted(() => ({
  mockConfigStorage: {
    set: vi.fn(),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'onboarding.title': 'Welcome to AionUi',
        'onboarding.step1.title': 'Welcome!',
        'onboarding.step1.description': 'AionUi is your local AI assistant.',
        'onboarding.step2.title': 'Choose Your Agent',
        'onboarding.step2.description': 'Connect to different AI agents.',
        'onboarding.step3.title': 'Start Chatting',
        'onboarding.step3.description': 'Upload files or start typing.',
        'onboarding.step4.title': "You're All Set!",
        'onboarding.step4.description': 'Enjoy your AI-powered workflow!',
        'onboarding.next': 'Next',
        'onboarding.finish': 'Get Started',
        'onboarding.skip': 'Skip Tour',
        'onboarding.stepLabel': 'Onboarding step {{step}}',
        'onboarding.progressLabel': 'Onboarding progress',
        'onboarding.stepCounter': 'Step {{current}} of {{total}}',
        'onboarding.nextAriaLabel': 'Go to next step',
        'onboarding.finishAriaLabel': 'Complete onboarding and start using AionUi',
        'onboarding.skipAriaLabel': 'Skip the onboarding tour',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          result = result.replace(`{{${paramKey}}}`, String(value));
        });
      }
      return result;
    },
  }),
}));

// Mock ConfigStorage
vi.mock('@/common/config/storage', () => ({
  ConfigStorage: mockConfigStorage,
}));

// Mock ModalWrapper
vi.mock('@renderer/components/base/ModalWrapper', () => ({
  default: ({
    children,
    visible,
    title,
  }: {
    children: React.ReactNode;
    visible: boolean;
    title?: React.ReactNode;
  }) => {
    if (!visible) return null;
    return (
      <div data-testid="modal-wrapper" role="dialog" aria-modal="true">
        {title && <h2 data-testid="modal-title">{title}</h2>}
        {children}
      </div>
    );
  },
}));

// Mock Arco Design Steps
vi.mock('@arco-design/web-react', () => ({
  Button: ({
    children,
    onClick,
    type,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} data-type={type} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Steps: Object.assign(
    ({
      children,
      current,
    }: {
      children: React.ReactNode;
      current?: number;
    }) => (
      <div data-testid="steps" data-current={current}>
        {children}
      </div>
    ),
    {
      Step: ({
        title,
        className,
      }: {
        title?: string;
        className?: string;
      }) => (
        <div data-testid="step" className={className} data-title={title}>
          {title}
        </div>
      ),
    }
  ),
}));

// Mock icon-park
vi.mock('@icon-park/react', () => ({
  Right: () => <span data-testid="right-icon">→</span>,
  Success: () => <span data-testid="success-icon">✓</span>,
}));

describe('OnboardingModal', () => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when visible', () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByTestId('modal-wrapper')).toBeDefined();
    expect(screen.getByTestId('modal-title').textContent).toBe('Welcome to AionUi');
    expect(screen.getByTestId('steps')).toBeDefined();
    expect(screen.getAllByTestId('step').length).toBe(4);
  });

  it('should not render when not visible', () => {
    render(<OnboardingModal visible={false} onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.queryByTestId('modal-wrapper')).toBeNull();
  });

  it('should display first step content by default', () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getAllByText('Welcome!')[0]).toBeDefined();
    expect(screen.getByText('AionUi is your local AI assistant.')).toBeDefined();
  });

  it('should advance to next step when Next is clicked', () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    const nextButton = screen.getByRole('button', { name: 'Go to next step' });
    fireEvent.click(nextButton);

    expect(screen.getAllByText('Choose Your Agent')[0]).toBeDefined();
    expect(screen.getByText('Connect to different AI agents.')).toBeDefined();
  });

  it('should call onComplete when Finish is clicked on last step', async () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    // Advance to last step
    const nextButton = screen.getByRole('button', { name: 'Go to next step' });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Now we should see the finish button
    expect(screen.getAllByText("You're All Set!")[0]).toBeDefined();

    const finishButton = screen.getByRole('button', { name: 'Complete onboarding and start using AionUi' });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });

    // Should persist completion state
    await waitFor(() => {
      expect(mockConfigStorage.set).toHaveBeenCalledWith('onboarding.completed', true);
    });
  });

  it('should call onSkip when Skip is clicked', async () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    const skipButton = screen.getAllByRole('button', { name: 'Skip the onboarding tour' })[0];
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(onSkip).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockConfigStorage.set).toHaveBeenCalledWith('onboarding.completed', true);
    });
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    const modal = screen.getByTestId('modal-wrapper');
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
  });

  it('should persist step progress to ConfigStorage', async () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    const nextButton = screen.getAllByRole('button', { name: 'Go to next step' })[0];
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockConfigStorage.set).toHaveBeenCalledWith('onboarding.lastStep', 1);
    });
  });

  it('should show correct step counter', () => {
    render(<OnboardingModal visible={true} onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByText('Step 1 of 4')).toBeDefined();
  });
});

