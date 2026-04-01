/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthType,
  clearCachedCredentialFile,
  Config,
  getOauthInfoWithCache,
  loginWithOauth,
  Storage,
} from '@office-ai/aioncli-core';
import type { WsRouter } from '../router/WsRouter';
import * as fs from 'node:fs';

/**
 * Register auth endpoint handlers on the WsRouter.
 * Replaces initAuthBridge() from src/process/bridge/authBridge.ts.
 */
export function registerAuthHandlers(router: WsRouter): void {
  router.handle('google.auth.status', async ({ proxy }) => {
    try {
      const credsPath = Storage.getOAuthCredsPath();
      if (!fs.existsSync(credsPath)) {
        // Return early when credential file is missing to avoid noisy ENOENT logs
        return { success: false };
      }

      // First try to get user info from cache
      const info = await getOauthInfoWithCache(proxy);

      if (info) return { success: true, data: { account: info.email } };

      // If cache retrieval failed, check if credential file exists
      try {
        const credsContent = fs.readFileSync(credsPath, 'utf-8');
        const creds = JSON.parse(credsContent);
        if (creds.refresh_token) {
          return { success: true, data: { account: 'Logged in (refresh needed)' } };
        }
      } catch (fsError) {
        console.debug('[Auth] Error checking credentials file:', fsError);
      }

      return { success: false };
    } catch (e) {
      return { success: false, msg: (e as Error).message || String(e) };
    }
  });

  router.handle('google.auth.login', async ({ proxy }) => {
    try {
      const config = new Config({
        proxy,
        sessionId: '',
        targetDir: '',
        debugMode: false,
        cwd: '',
        model: '',
      });

      // Add timeout to prevent hanging if user doesn't complete login
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Login timed out after 2 minutes')), 2 * 60 * 1000);
      });

      const client = await Promise.race([loginWithOauth(AuthType.LOGIN_WITH_GOOGLE, config), timeoutPromise]);

      if (client) {
        try {
          // Brief delay to ensure credential file is written
          await new Promise((resolve) => setTimeout(resolve, 500));

          const oauthInfo = await getOauthInfoWithCache(proxy);
          if (oauthInfo && oauthInfo.email) {
            return { success: true, data: { account: oauthInfo.email } };
          }

          console.warn('[Auth] Login completed but no credentials found');
          return {
            success: false,
            msg: 'Login completed but credentials were not saved. Please try again.',
          };
        } catch (error) {
          console.error('[Auth] Failed to verify credentials after login:', error);
          return {
            success: false,
            msg: `Login verification failed: ${(error as Error).message || String(error)}`,
          };
        }
      }

      return { success: false, msg: 'Login failed: No client returned' };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, msg: (error as Error).message || String(error) };
    }
  });

  router.handle('google.auth.logout', async () => {
    return await clearCachedCredentialFile();
  });
}
