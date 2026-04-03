/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Electron preload script.
 *
 * Exposes:
 *   - electronConfig: runtime config (serverUrl, getPathForFile)
 *   - electronAPI: IPC bridge for @office-ai/platform communication
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';

const BRIDGE_EVENT_KEY = 'office-ai-bridge-adapter';

// Server URL is passed from the main process via --server-url= arg.
// In development, fall back to a default local WebSocket URL.
const serverUrl =
  process.argv.find((a: string) => a.startsWith('--server-url='))?.split('=')[1] || 'ws://localhost:3000';

contextBridge.exposeInMainWorld('electronConfig', {
  serverUrl,
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
});

// IPC bridge for @office-ai/platform (used by browser.ts adapter)
contextBridge.exposeInMainWorld('electronAPI', {
  emit(name: string, data: unknown) {
    return ipcRenderer.invoke(BRIDGE_EVENT_KEY, JSON.stringify({ name, data }));
  },
  on(callback: (event: { value: string }) => void) {
    ipcRenderer.on(BRIDGE_EVENT_KEY, (_event, value: string) => {
      callback({ value });
    });
  },
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
});
