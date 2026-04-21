/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowiseReadiness } from '@/common/ma/types';

const bridgeMocks = vi.hoisted(() => ({
  getReadinessInvoke: vi.fn(),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      flowise: {
        getReadiness: { invoke: bridgeMocks.getReadinessInvoke },
      },
    },
  },
}));

import { useFlowiseReadiness } from '@renderer/hooks/ma/useFlowiseReadiness';

function createWrapper() {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>;
  };
}

describe('useFlowiseReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports ready when ping, auth, and api key state are all valid', async () => {
    const readySnapshot: FlowiseReadiness = {
      baseUrl: 'https://filo.example.test',
      hasApiKey: true,
      apiKeySource: 'env',
      pingOk: true,
      authOk: true,
      flowCount: 3,
      checkedAt: Date.now(),
    };
    bridgeMocks.getReadinessInvoke.mockResolvedValue(readySnapshot);

    const { result } = renderHook(() => useFlowiseReadiness({ refreshInterval: 0, revalidateOnFocus: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.readiness).toEqual(readySnapshot);
    expect(bridgeMocks.getReadinessInvoke).toHaveBeenCalledTimes(1);
  });

  it('re-probes through refresh and updates the readiness snapshot', async () => {
    let currentSnapshot: FlowiseReadiness = {
      baseUrl: 'https://filo.example.test',
      hasApiKey: true,
      apiKeySource: 'env',
      pingOk: true,
      authOk: true,
      flowCount: 3,
      checkedAt: Date.now(),
    };
    bridgeMocks.getReadinessInvoke.mockImplementation(async () => currentSnapshot);

    const { result } = renderHook(() => useFlowiseReadiness({ refreshInterval: 0, revalidateOnFocus: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    currentSnapshot = {
      ...currentSnapshot,
      authOk: false,
      error: 'auth 401',
      checkedAt: Date.now() + 1,
    };

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    expect(result.current.readiness?.authOk).toBe(false);
    expect(bridgeMocks.getReadinessInvoke).toHaveBeenCalledTimes(2);
  });
});
