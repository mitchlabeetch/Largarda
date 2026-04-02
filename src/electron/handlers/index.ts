/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { initDialogBridge } from './dialog';
import { initShellBridge } from './shell';
import { initUpdateBridge, createAutoUpdateStatusBroadcast } from './update';
import { initWindowControlsBridge, registerWindowMaximizeListeners } from './windowControls';

export {
  initDialogBridge,
  initShellBridge,
  initUpdateBridge,
  createAutoUpdateStatusBroadcast,
  initWindowControlsBridge,
  registerWindowMaximizeListeners,
};

/**
 * Register all Electron-only IPC handlers.
 * These handlers require Electron APIs (dialog, shell, window controls, auto-update)
 * and are skipped in standalone/WebUI mode.
 */
export function registerElectronHandlers(): void {
  initDialogBridge();
  initShellBridge();
  initWindowControlsBridge();
  initUpdateBridge();
}
