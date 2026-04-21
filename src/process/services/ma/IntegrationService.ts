/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Nango, type NangoAuthWebhookBody, type ProxyConfiguration } from '@nangohq/node';
import type { ApiPublicIntegration } from '@nangohq/types';
import type {
  CreateIntegrationSessionInput,
  IntegrationProxyRequest,
  IntegrationProxyResponse,
  IntegrationSessionResult,
  MaIntegrationCategory,
  MaIntegrationConnection,
  MaIntegrationDescriptor,
  MaIntegrationProvider,
} from '@/common/ma/types';
import {
  getIntegrationConnectionRepository,
  type IntegrationConnectionRepository,
} from '@process/services/database/repositories/ma/IntegrationConnectionRepository';

const DEFAULT_END_USER_ID = 'largo-local-user';
const DEFAULT_END_USER_NAME = 'Largo User';

function normalizeBaseUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function inferCategory(integration: ApiPublicIntegration): MaIntegrationCategory {
  const key = `${integration.provider} ${integration.unique_key} ${integration.display_name}`.toLowerCase();

  if (key.includes('drive') || key.includes('dropbox') || key.includes('box')) {
    return 'storage';
  }

  if (key.includes('hubspot') || key.includes('salesforce') || key.includes('pipedrive')) {
    return 'crm';
  }

  if (key.includes('slack') || key.includes('discord') || key.includes('teams')) {
    return 'communication';
  }

  if (key.includes('stripe') || key.includes('quickbooks') || key.includes('xero')) {
    return 'finance';
  }

  if (key.includes('notion') || key.includes('google') || key.includes('airtable')) {
    return 'productivity';
  }

  if (key.includes('data') || key.includes('research') || key.includes('dataset') || key.includes('api')) {
    return 'research';
  }

  return 'other';
}

function isAuthWebhookPayload(payload: unknown): payload is NangoAuthWebhookBody {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    candidate.type === 'auth' &&
    typeof candidate.providerConfigKey === 'string' &&
    typeof candidate.connectionId === 'string' &&
    typeof candidate.success === 'boolean'
  );
}

export class IntegrationService {
  private readonly repo: IntegrationConnectionRepository;
  private readonly secretKey?: string;
  private readonly host?: string;
  private readonly connectBaseUrl?: string;
  private readonly apiBaseUrl?: string;
  private readonly allowedIntegrations: Set<string> | null;
  private nangoClient: Nango | null = null;

  constructor(repo = getIntegrationConnectionRepository()) {
    this.repo = repo;
    this.secretKey = process.env.NANGO_SECRET_KEY;
    this.host = normalizeBaseUrl(process.env.NANGO_HOST);
    this.connectBaseUrl = normalizeBaseUrl(process.env.NANGO_CONNECT_BASE_URL);
    this.apiBaseUrl = normalizeBaseUrl(process.env.NANGO_API_BASE_URL) ?? this.host;

    const allowed = process.env.NANGO_MA_ALLOWED_INTEGRATIONS?.split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    this.allowedIntegrations = allowed && allowed.length > 0 ? new Set(allowed) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  private getClient(): Nango {
    if (!this.secretKey) {
      throw new Error('Nango is not configured. Set NANGO_SECRET_KEY to enable external integrations.');
    }

    this.nangoClient ??= new Nango({
      secretKey: this.secretKey,
      host: this.host,
    });

    return this.nangoClient;
  }

  private async listRemoteIntegrations(): Promise<ApiPublicIntegration[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const response = await this.getClient().listIntegrations();
    const integrations = response.configs ?? [];

    if (!this.allowedIntegrations) {
      return integrations;
    }

    return integrations.filter((integration) => this.allowedIntegrations?.has(integration.unique_key));
  }

  async listProviders(): Promise<MaIntegrationProvider[]> {
    const integrations = await this.listRemoteIntegrations();

    return integrations.map((integration) => ({
      id: integration.unique_key,
      providerConfigKey: integration.unique_key,
      title: integration.display_name || integration.unique_key,
      description: `Connect ${integration.display_name || integration.unique_key} with Largo's M&A workflows.`,
      category: inferCategory(integration),
      logoUrl: integration.logo,
      enabled: true,
    }));
  }

  async listConnections(): Promise<MaIntegrationConnection[]> {
    const result = await this.repo.list();
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to list integration connections');
    }

    return result.data ?? [];
  }

  async listDescriptors(): Promise<MaIntegrationDescriptor[]> {
    const [providers, connections] = await Promise.all([this.listProviders(), this.listConnections()]);
    const connectionMap = new Map(connections.map((connection) => [connection.providerId, connection]));

    return providers.map((provider) => ({
      provider,
      connection: connectionMap.get(provider.id) ?? null,
    }));
  }

  async createConnectSession(input: CreateIntegrationSessionInput): Promise<IntegrationSessionResult> {
    const provider = await this.getProviderById(input.providerId);
    const existing = await this.repo.getByProviderId(provider.id);

    await this.repo.upsert({
      providerId: provider.id,
      providerConfigKey: provider.providerConfigKey,
      connectionId: existing.data?.connectionId,
      status: 'connecting',
      displayName: existing.data?.displayName,
      metadata: existing.data?.metadata,
      lastError: undefined,
      connectedAt: existing.data?.connectedAt,
      lastSyncedAt: existing.data?.lastSyncedAt,
    });

    const session = await this.getClient().createConnectSession({
      allowed_integrations: [provider.providerConfigKey],
      end_user: {
        id: DEFAULT_END_USER_ID,
        display_name: DEFAULT_END_USER_NAME,
        tags: {
          providerId: provider.id,
        },
      },
      tags: {
        providerId: provider.id,
      },
    });

    return {
      providerId: provider.id,
      providerConfigKey: provider.providerConfigKey,
      connectionId: existing.data?.connectionId,
      sessionToken: session.data.token,
      connectLink: session.data.connect_link,
      expiresAt: session.data.expires_at,
      connectBaseUrl: this.connectBaseUrl,
      apiBaseUrl: this.apiBaseUrl,
      isReconnect: false,
    };
  }

  async createReconnectSession(input: CreateIntegrationSessionInput): Promise<IntegrationSessionResult> {
    const provider = await this.getProviderById(input.providerId);
    const existing = await this.repo.getByProviderId(provider.id);

    if (!existing.success || !existing.data?.connectionId) {
      throw new Error(`No saved connection found for ${provider.title}. Connect it first.`);
    }

    const integration = await this.getClient().getIntegration(
      { uniqueKey: provider.providerConfigKey },
      { include: ['credentials'] }
    );

    const session = await this.getClient().createReconnectSession({
      integration_id: integration.data.unique_key,
      connection_id: existing.data.connectionId,
      end_user: {
        id: DEFAULT_END_USER_ID,
        display_name: DEFAULT_END_USER_NAME,
        tags: {
          providerId: provider.id,
        },
      },
      tags: {
        providerId: provider.id,
      },
    });

    await this.repo.upsert({
      ...existing.data,
      status: 'connecting',
      lastError: undefined,
    });

    return {
      providerId: provider.id,
      providerConfigKey: provider.providerConfigKey,
      connectionId: existing.data.connectionId,
      sessionToken: session.data.token,
      connectLink: session.data.connect_link,
      expiresAt: session.data.expires_at,
      connectBaseUrl: this.connectBaseUrl,
      apiBaseUrl: this.apiBaseUrl,
      isReconnect: true,
    };
  }

  async disconnect(providerId: string): Promise<boolean> {
    const provider = await this.getProviderById(providerId);
    const existing = await this.repo.getByProviderId(provider.id);

    if (existing.data?.connectionId && this.isConfigured()) {
      try {
        await this.getClient().deleteConnection(provider.providerConfigKey, existing.data.connectionId);
      } catch (error) {
        console.warn('[IntegrationService] Failed to delete Nango connection, removing local state anyway:', error);
      }
    }

    const deleted = await this.repo.deleteByProviderId(provider.id);
    if (!deleted.success) {
      throw new Error(deleted.error ?? 'Failed to disconnect integration');
    }

    return deleted.data ?? false;
  }

  async proxyRequest(input: IntegrationProxyRequest): Promise<IntegrationProxyResponse> {
    const provider = await this.getProviderById(input.providerId);
    const connection = await this.repo.getByProviderId(provider.id);

    if (!connection.success || !connection.data?.connectionId) {
      throw new Error(`No active connection found for ${provider.title}.`);
    }

    const config: ProxyConfiguration = {
      providerConfigKey: provider.providerConfigKey,
      connectionId: connection.data.connectionId,
      endpoint: input.endpoint,
      method: input.method ?? 'GET',
      headers: input.headers,
      params: input.params,
      data: input.data,
      retries: input.retries ?? 0,
    };

    const response = await this.getClient().proxy(config);

    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string | string[] | undefined>,
    };
  }

  async buildFlowiseIntegrationContext(): Promise<Record<string, unknown>> {
    if (!this.isConfigured()) {
      return {};
    }

    const descriptors = await this.listDescriptors();
    const connected = descriptors.filter((descriptor) => descriptor.connection?.status === 'connected');

    return connected.reduce<Record<string, unknown>>((acc, descriptor) => {
      acc[descriptor.provider.id] = {
        title: descriptor.provider.title,
        providerConfigKey: descriptor.provider.providerConfigKey,
        connectionId: descriptor.connection?.connectionId,
        status: descriptor.connection?.status,
      };
      return acc;
    }, {});
  }

  async handleWebhook(rawBody: string, headers: Record<string, unknown>): Promise<NangoAuthWebhookBody | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const client = this.getClient();
    const isValid = client.verifyIncomingWebhookRequest(rawBody, headers);
    if (!isValid) {
      throw new Error('Invalid Nango webhook signature');
    }

    const payload = JSON.parse(rawBody) as unknown;
    if (!isAuthWebhookPayload(payload)) {
      return null;
    }

    const provider = await this.findProviderByConfigKey(payload.providerConfigKey);
    const existing = await this.repo.getByProviderId(provider.id);
    const now = Date.now();

    await this.repo.upsert({
      id: existing.data?.id,
      providerId: provider.id,
      providerConfigKey: payload.providerConfigKey,
      connectionId: payload.connectionId,
      status: payload.success ? 'connected' : 'reauth_required',
      displayName: provider.title,
      metadata: {
        provider: payload.provider,
        authMode: payload.authMode,
        operation: payload.operation,
        environment: payload.environment,
        endUser: payload.endUser,
      },
      lastError: payload.success ? undefined : 'error' in payload ? payload.error?.description : undefined,
      connectedAt: payload.success ? now : existing.data?.connectedAt,
      lastSyncedAt: now,
      createdAt: existing.data?.createdAt,
    });

    return payload;
  }

  private async getProviderById(providerId: string): Promise<MaIntegrationProvider> {
    const providers = await this.listProviders();
    const provider = providers.find((candidate) => candidate.id === providerId);

    if (!provider) {
      throw new Error(`Unknown integration provider: ${providerId}`);
    }

    return provider;
  }

  private async findProviderByConfigKey(providerConfigKey: string): Promise<MaIntegrationProvider> {
    const providers = await this.listProviders();
    const provider = providers.find((candidate) => candidate.providerConfigKey === providerConfigKey);

    if (!provider) {
      return {
        id: providerConfigKey,
        providerConfigKey,
        title: providerConfigKey,
        category: 'other',
        enabled: true,
      };
    }

    return provider;
  }
}

let integrationService: IntegrationService | null = null;

export function getIntegrationService(): IntegrationService {
  integrationService ??= new IntegrationService();
  return integrationService;
}
