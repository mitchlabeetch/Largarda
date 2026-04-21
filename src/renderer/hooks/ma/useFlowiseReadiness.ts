/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useFlowiseReadiness
 *
 * Subscribes to the Flowise readiness snapshot served by the main process
 * (`ma.flowise.getReadiness`). Lets AI surfaces disable themselves
 * gracefully when the API key is missing or Flowise is unreachable,
 * without forcing every caller to re-probe.
 *
 * Backed by SWR so multiple components share one probe per polling window.
 */

import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type { FlowiseReadiness } from '@/common/ma/types';

type UseFlowiseReadinessOptions = {
  /** Refresh cadence in ms. 0 disables polling. Defaults to 60_000. */
  refreshInterval?: number;
  /** Whether to revalidate when the window regains focus. Defaults to true. */
  revalidateOnFocus?: boolean;
};

type UseFlowiseReadinessReturn = {
  /** Latest readiness snapshot. `undefined` while the first probe is in flight. */
  readiness: FlowiseReadiness | undefined;
  /** True while the first probe is in flight. */
  isLoading: boolean;
  /** True when pingOk, hasApiKey, and authOk are all true. */
  isReady: boolean;
  /** SWR error surface (IPC/network failures). */
  error: Error | undefined;
  /** Force a re-probe (bypasses the polling cadence). */
  refresh: () => Promise<FlowiseReadiness | undefined>;
};

const SWR_KEY = 'ma.flowise.readiness';

const fetcher = (): Promise<FlowiseReadiness> => ipcBridge.ma.flowise.getReadiness.invoke();

export function useFlowiseReadiness(options: UseFlowiseReadinessOptions = {}): UseFlowiseReadinessReturn {
  const { refreshInterval = 60_000, revalidateOnFocus = true } = options;

  const { data, isLoading, error, mutate } = useSWR<FlowiseReadiness>(SWR_KEY, fetcher, {
    refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
    revalidateOnFocus,
    dedupingInterval: 5000,
  });

  const isReady = Boolean(data && data.pingOk && data.hasApiKey && data.authOk === true);

  return {
    readiness: data,
    isLoading,
    isReady,
    error: error as Error | undefined,
    refresh: () => mutate(),
  };
}
