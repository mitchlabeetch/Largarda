/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import {
  type IMaIntegrationConnectionRow,
  type MaIntegrationConnection,
  integrationConnectionToRow,
  rowToIntegrationConnection,
} from '@/common/ma/types';
import { getDatabase } from '@process/services/database';
import type { IQueryResult } from '@process/services/database/types';

type UpsertIntegrationConnectionInput = Omit<MaIntegrationConnection, 'createdAt' | 'updatedAt' | 'id'> & {
  id?: string;
  createdAt?: number;
};

/**
 * Repository for external integration connection state.
 */
export class IntegrationConnectionRepository {
  async list(): Promise<IQueryResult<MaIntegrationConnection[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const rows = driver
        .prepare('SELECT * FROM ma_integration_connections ORDER BY provider_id ASC')
        .all() as IMaIntegrationConnectionRow[];

      return {
        success: true,
        data: rows.map(rowToIntegrationConnection),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  async getByProviderId(providerId: string): Promise<IQueryResult<MaIntegrationConnection | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const row = driver.prepare('SELECT * FROM ma_integration_connections WHERE provider_id = ?').get(providerId) as
        | IMaIntegrationConnectionRow
        | undefined;

      return {
        success: true,
        data: row ? rowToIntegrationConnection(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  async getByProviderConfigKey(providerConfigKey: string): Promise<IQueryResult<MaIntegrationConnection | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const row = driver
        .prepare('SELECT * FROM ma_integration_connections WHERE provider_config_key = ?')
        .get(providerConfigKey) as IMaIntegrationConnectionRow | undefined;

      return {
        success: true,
        data: row ? rowToIntegrationConnection(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  async upsert(input: UpsertIntegrationConnectionInput): Promise<IQueryResult<MaIntegrationConnection>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.getByProviderId(input.providerId);
      const now = Date.now();
      const connection: MaIntegrationConnection = {
        id: existing.data?.id ?? input.id ?? crypto.randomUUID(),
        providerId: input.providerId,
        providerConfigKey: input.providerConfigKey,
        connectionId: input.connectionId,
        status: input.status,
        displayName: input.displayName,
        metadata: input.metadata,
        lastError: input.lastError,
        connectedAt: input.connectedAt,
        lastSyncedAt: input.lastSyncedAt,
        createdAt: existing.data?.createdAt ?? input.createdAt ?? now,
        updatedAt: now,
      };

      const row = integrationConnectionToRow(connection);
      driver
        .prepare(
          `INSERT INTO ma_integration_connections (
             id, provider_id, provider_config_key, connection_id, status, display_name,
             metadata, last_error, connected_at, last_synced_at, created_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(provider_id) DO UPDATE SET
             provider_config_key = excluded.provider_config_key,
             connection_id = excluded.connection_id,
             status = excluded.status,
             display_name = excluded.display_name,
             metadata = excluded.metadata,
             last_error = excluded.last_error,
             connected_at = excluded.connected_at,
             last_synced_at = excluded.last_synced_at,
             updated_at = excluded.updated_at`
        )
        .run(
          row.id,
          row.provider_id,
          row.provider_config_key,
          row.connection_id,
          row.status,
          row.display_name,
          row.metadata,
          row.last_error,
          row.connected_at,
          row.last_synced_at,
          row.created_at,
          row.updated_at
        );

      return { success: true, data: connection };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  async deleteByProviderId(providerId: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();
      const result = driver.prepare('DELETE FROM ma_integration_connections WHERE provider_id = ?').run(providerId);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }
}

let integrationConnectionRepository: IntegrationConnectionRepository | null = null;

export function getIntegrationConnectionRepository(): IntegrationConnectionRepository {
  integrationConnectionRepository ??= new IntegrationConnectionRepository();
  return integrationConnectionRepository;
}
