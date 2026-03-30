/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '@office-ai/platform';
import { initAllBridges } from '../bridge';
import { SqliteChannelRepository } from '@process/services/database/SqliteChannelRepository';
import { SqliteConversationRepository } from '@process/services/database/SqliteConversationRepository';
import { ConversationServiceImpl } from '@process/services/ConversationServiceImpl';
import { cronService } from '@process/services/cron/cronServiceSingleton';
import { workerTaskManager, agentFactory } from '@process/task/workerTaskManagerSingleton';
import { getDatabase } from '@process/services/database';
import { initGroupRoomBridge } from '@process/bridge/groupRoomBridge';

logger.config({ print: true });

const repo = new SqliteConversationRepository();
const conversationServiceImpl = new ConversationServiceImpl(repo);
const channelRepo = new SqliteChannelRepository();

// 初始化所有IPC桥接
initAllBridges({
  conversationService: conversationServiceImpl,
  conversationRepo: repo,
  workerTaskManager,
  channelRepo,
});

// Initialize cron service (load jobs from database and start timers)
void cronService.init().catch((error) => {
  console.error('[initBridge] Failed to initialize CronService:', error);
});

/**
 * Initialize GroupRoom bridge — requires ISqliteDriver, resolved from the async db singleton.
 * Exported so that initializeProcess() can `await` this BEFORE creating the window,
 * guaranteeing the provider is registered when the renderer calls it.
 */
export const groupRoomBridgeReady: Promise<void> = getDatabase()
  .then((db) => initGroupRoomBridge(db.getDriver(), conversationServiceImpl, agentFactory))
  .then(() => console.log('[initBridge] GroupRoomBridge initialized'))
  .catch((error) => {
    console.error('[initBridge] Failed to initialize GroupRoomBridge:', error);
  });
