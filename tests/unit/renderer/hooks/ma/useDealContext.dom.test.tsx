/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DealContext } from '@/common/ma/types';

const bridgeMocks = vi.hoisted(() => ({
  clearActiveInvoke: vi.fn(),
  getActiveInvoke: vi.fn(),
  listInvoke: vi.fn(),
  createInvoke: vi.fn(),
  updateInvoke: vi.fn(),
  deleteInvoke: vi.fn(),
  setActiveInvoke: vi.fn(),
  archiveInvoke: vi.fn(),
  closeInvoke: vi.fn(),
  reactivateInvoke: vi.fn(),
  getContextForAIInvoke: vi.fn(),
  validateInvoke: vi.fn(),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      deal: {
        create: { invoke: bridgeMocks.createInvoke },
        get: { invoke: vi.fn() },
        update: { invoke: bridgeMocks.updateInvoke },
        delete: { invoke: bridgeMocks.deleteInvoke },
        list: { invoke: bridgeMocks.listInvoke },
        setActive: { invoke: bridgeMocks.setActiveInvoke },
        getActive: { invoke: bridgeMocks.getActiveInvoke },
        clearActive: { invoke: bridgeMocks.clearActiveInvoke },
        archive: { invoke: bridgeMocks.archiveInvoke },
        close: { invoke: bridgeMocks.closeInvoke },
        reactivate: { invoke: bridgeMocks.reactivateInvoke },
        getContextForAI: { invoke: bridgeMocks.getContextForAIInvoke },
        validate: { invoke: bridgeMocks.validateInvoke },
      },
    },
  },
}));

import { useDealContext } from '@renderer/hooks/ma/useDealContext';

const activeDeal: DealContext = {
  id: 'deal-1',
  name: 'Acme Acquisition',
  parties: [{ name: 'Acme Buyer', role: 'buyer' }],
  transactionType: 'acquisition',
  targetCompany: {
    name: 'TargetCo',
    jurisdiction: 'FR',
  },
  status: 'active',
  createdAt: 1,
  updatedAt: 1,
};

function createWrapper() {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>;
  };
}

describe('useDealContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let currentActiveDeal: DealContext | null = activeDeal;

    bridgeMocks.listInvoke.mockImplementation(async () => [activeDeal]);
    bridgeMocks.getActiveInvoke.mockImplementation(async () => currentActiveDeal);
    bridgeMocks.clearActiveInvoke.mockImplementation(async () => {
      currentActiveDeal = null;
    });
  });

  it('clears the active deal through the IPC bridge and local state', async () => {
    const { result } = renderHook(() => useDealContext({ autoRefresh: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.activeDeal?.id).toBe('deal-1');
    });

    await act(async () => {
      await result.current.clearActiveDeal();
    });

    expect(bridgeMocks.clearActiveInvoke).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.activeDeal).toBeNull();
    });
  });
});
