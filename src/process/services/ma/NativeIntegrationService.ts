/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Native Integration Service
 * Manages integrations that don't require OAuth (e.g., data.gouv.fr, SIRENE).
 */

import { getDatagouvClient } from '@process/services/data/datagouvClient';

export interface NativeIntegrationConfig {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'other';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface NativeIntegrationConnection {
  integrationId: string;
  status: 'connected' | 'error' | 'disconnected';
  lastError?: string;
  lastTested?: number;
}

/**
 * Native integration descriptors
 */
export const NATIVE_INTEGRATIONS: NativeIntegrationConfig[] = [
  {
    id: 'datagouv-fr',
    name: 'data.gouv.fr',
    description: 'French open data platform - access datasets, tabular data, and APIs',
    category: 'research',
    enabled: true,
  },
];

/**
 * Native Integration Service
 */
export class NativeIntegrationService {
  private connections: Map<string, NativeIntegrationConnection> = new Map();

  /**
   * Get all native integrations
   */
  getIntegrations(): NativeIntegrationConfig[] {
    return NATIVE_INTEGRATIONS;
  }

  /**
   * Get integration by ID
   */
  getIntegration(id: string): NativeIntegrationConfig | undefined {
    return NATIVE_INTEGRATIONS.find((i) => i.id === id);
  }

  /**
   * Test connection to datagouv.fr
   */
  async testDatagouvConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getDatagouvClient();
      const result = await client.testConnection();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get connection status for an integration
   */
  getConnectionStatus(integrationId: string): NativeIntegrationConnection | null {
    return this.connections.get(integrationId) ?? null;
  }

  /**
   * Update connection status
   */
  setConnectionStatus(integrationId: string, status: Omit<NativeIntegrationConnection, 'integrationId'>): void {
    this.connections.set(integrationId, {
      integrationId,
      ...status,
    });
  }

  /**
   * Clear datagouv cache
   */
  async clearDatagouvCache(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getDatagouvClient();
      await client.clearCache();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Singleton instance
let nativeIntegrationService: NativeIntegrationService | null = null;

export function getNativeIntegrationService(): NativeIntegrationService {
  if (!nativeIntegrationService) {
    nativeIntegrationService = new NativeIntegrationService();
  }
  return nativeIntegrationService;
}
