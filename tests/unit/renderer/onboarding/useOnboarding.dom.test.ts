/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOnboarding } from '@renderer/pages/onboarding/hooks/useOnboarding';

const mockStorage: Record<string, boolean | number | undefined> = {};

vi.mock('@/common/config/storage', () => ({
  ConfigStorage: {
    get: vi.fn(async (key: string) => mockStorage[key]),
    set: vi.fn(async (key: string, value: boolean | number) => {
      mockStorage[key] = value;
    }),
  },
}));

describe('useOnboarding', () => {
  beforeEach(() => {
    // Clear storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  it('should show onboarding when not completed', async () => {
    mockStorage['onboarding.completed'] = undefined;

    const { result } = renderHook(() => useOnboarding());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.showOnboarding).toBe(true);
  });

  it('should not show onboarding when already completed', async () => {
    mockStorage['onboarding.completed'] = true;

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.showOnboarding).toBe(false);
  });

  it('should complete onboarding and hide modal', async () => {
    mockStorage['onboarding.completed'] = false;

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.showOnboarding).toBe(true);

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.showOnboarding).toBe(false);
    expect(mockStorage['onboarding.completed']).toBe(true);
    expect(mockStorage['onboarding.lastStep']).toBe(4);
  });

  it('should skip onboarding and hide modal', async () => {
    mockStorage['onboarding.completed'] = false;

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.skipOnboarding();
    });

    expect(result.current.showOnboarding).toBe(false);
    expect(mockStorage['onboarding.completed']).toBe(true);
  });

  it('should reset onboarding state', async () => {
    mockStorage['onboarding.completed'] = true;

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.showOnboarding).toBe(false);

    await act(async () => {
      await result.current.resetOnboarding();
    });

    expect(result.current.showOnboarding).toBe(true);
    expect(mockStorage['onboarding.completed']).toBe(false);
    expect(mockStorage['onboarding.lastStep']).toBe(0);
  });

  it('should default to showing onboarding on storage error', async () => {
    // Simulate error by making get throw
    const { ConfigStorage } = await import('@/common/config/storage');
    vi.mocked(ConfigStorage.get).mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.showOnboarding).toBe(true);
  });
});
