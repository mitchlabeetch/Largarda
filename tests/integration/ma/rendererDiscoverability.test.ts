/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Renderer Discoverability Tests
 * Locks in the Wave 4 removal path for contacts/watchlists so renderer code
 * cannot regress back to calling dead IPC handlers.
 */

import { describe, it, expect } from 'vitest';

describe('Renderer Discoverability', () => {
  it('does not expose contact or watchlist IPC bridges in the common adapter', async () => {
    const { ipcBridge } = await import('@/common');

    expect(ipcBridge).toBeDefined();
    expect(ipcBridge.ma).toBeDefined();
    expect(ipcBridge.ma.contact).toBeUndefined();
    expect(ipcBridge.ma.watchlist).toBeUndefined();
  });

  it('does not ship removed contact and watchlist renderer hooks', async () => {
    await expect(import('@/renderer/hooks/ma/useContacts')).rejects.toThrow();
    await expect(import('@/renderer/hooks/ma/useWatchlists')).rejects.toThrow();
  });

  it('keeps contact and watchlist schemas process-side only', async () => {
    const contactSchema = await import('@/common/ma/contact/schema');
    const watchlistSchema = await import('@/common/ma/watchlist/schema');

    expect(contactSchema.ContactSchema).toBeDefined();
    expect(watchlistSchema.WatchlistSchema).toBeDefined();
  });
});
