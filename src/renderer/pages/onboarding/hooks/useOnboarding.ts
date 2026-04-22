/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigStorage } from '@/common/config/storage';
import { useCallback, useEffect, useState } from 'react';

export interface UseOnboardingReturn {
  /** Whether the onboarding modal should be shown */
  showOnboarding: boolean;
  /** Whether the onboarding state is still loading */
  isLoading: boolean;
  /** Mark onboarding as completed */
  completeOnboarding: () => Promise<void>;
  /** Skip onboarding (marks as completed) */
  skipOnboarding: () => Promise<void>;
  /** Reset onboarding state (for testing) */
  resetOnboarding: () => Promise<void>;
}

/**
 * Hook for managing first-run onboarding state.
 * Tracks whether the user has completed the onboarding tutorial.
 */
export function useOnboarding(): UseOnboardingReturn {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkOnboardingStatus = async () => {
      try {
        const completed = await ConfigStorage.get('onboarding.completed');
        if (mounted) {
          // Show onboarding if not completed (undefined or false)
          setShowOnboarding(completed !== true);
        }
      } catch (error) {
        console.error('[useOnboarding] Failed to check onboarding status:', error);
        // Default to showing onboarding on error
        if (mounted) {
          setShowOnboarding(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void checkOnboardingStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await ConfigStorage.set('onboarding.completed', true);
      await ConfigStorage.set('onboarding.lastStep', 4);
      setShowOnboarding(false);
    } catch (error) {
      console.error('[useOnboarding] Failed to complete onboarding:', error);
    }
  }, []);

  const skipOnboarding = useCallback(async () => {
    try {
      await ConfigStorage.set('onboarding.completed', true);
      setShowOnboarding(false);
    } catch (error) {
      console.error('[useOnboarding] Failed to skip onboarding:', error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await ConfigStorage.set('onboarding.completed', false);
      await ConfigStorage.set('onboarding.lastStep', 0);
      setShowOnboarding(true);
    } catch (error) {
      console.error('[useOnboarding] Failed to reset onboarding:', error);
    }
  }, []);

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
}
