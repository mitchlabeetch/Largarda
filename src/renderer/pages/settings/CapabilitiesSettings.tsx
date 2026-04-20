/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CapabilitiesSettings - Combined page for Skills Hub, MCP/Tools, and integrations.
 */

import { Alert, Button, Card, Empty, Message, Space, Spin, Tabs, Tag, Typography } from '@arco-design/web-react';
import { CheckOne, LinkCloud, Refresh, RefreshOne, Unlink } from '@icon-park/react';
import Nango from '@nangohq/frontend';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ipcBridge } from '@/common';
import type { IntegrationSessionResult, MaIntegrationDescriptor, MaIntegrationStatus } from '@/common/ma/types';
import ToolsModalContent from '@/renderer/components/settings/SettingsModal/contents/ToolsModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import SkillsHubSettings from './SkillsHubSettings';

type CapabilitiesTab = 'skills' | 'tools' | 'integrations';

const isCapabilitiesTab = (value: string | null): value is CapabilitiesTab =>
  value === 'skills' || value === 'tools' || value === 'integrations';

const STATUS_COLORS: Record<MaIntegrationStatus, string> = {
  not_connected: 'gray',
  connecting: 'arcoblue',
  connected: 'green',
  reauth_required: 'orange',
  error: 'red',
  disabled: 'gray',
};

type IntegrationConnectEvent = {
  type: string;
};

const CapabilitiesSettings: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationDescriptors, setIntegrationDescriptors] = useState<MaIntegrationDescriptor[]>([]);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CapabilitiesTab>(() => {
    const tabParam = searchParams.get('tab');
    return isCapabilitiesTab(tabParam) ? tabParam : 'skills';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (isCapabilitiesTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (activeTab === 'integrations') {
      void loadIntegrations();
    }
  }, [activeTab]);

  const handleTabChange = (key: string) => {
    if (isCapabilitiesTab(key)) {
      setActiveTab(key);
      const next = new URLSearchParams(searchParams);
      next.set('tab', key);
      setSearchParams(next, { replace: true });
    }
  };

  const loadIntegrations = async () => {
    setIntegrationsLoading(true);
    try {
      const descriptors = await ipcBridge.ma.integration.listDescriptors.invoke();
      setIntegrationDescriptors(descriptors);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      Message.error(
        reason
          ? t('settings.integrations.loadFailedWithReason', {
              defaultValue: 'Failed to load integrations: {{reason}}',
              reason,
            })
          : t('settings.integrations.loadFailed', { defaultValue: 'Failed to load integrations' })
      );
    } finally {
      setIntegrationsLoading(false);
    }
  };

  const openIntegrationSession = (session: IntegrationSessionResult) => {
    new Nango({
      connectSessionToken: session.sessionToken,
      host: session.connectBaseUrl,
    }).openConnectUI({
      sessionToken: session.sessionToken,
      baseURL: session.connectBaseUrl,
      apiURL: session.apiBaseUrl,
      onEvent: (event: IntegrationConnectEvent) => {
        if (event.type === 'connect') {
          Message.success(
            t('settings.integrations.connectSuccess', { defaultValue: 'Integration connected successfully' })
          );
          setPendingProviderId(null);
          void loadIntegrations();
        }

        if (event.type === 'error') {
          Message.error(
            t('settings.integrations.connectFailed', { defaultValue: 'Failed to complete the integration connection' })
          );
          setPendingProviderId(null);
          void loadIntegrations();
        }

        if (event.type === 'close') {
          setPendingProviderId(null);
        }
      },
    });
  };

  const handleConnect = async (providerId: string, reconnect = false) => {
    setPendingProviderId(providerId);

    try {
      const session = reconnect
        ? await ipcBridge.ma.integration.createReconnectSession.invoke({ providerId })
        : await ipcBridge.ma.integration.createConnectSession.invoke({ providerId });

      Message.info(
        reconnect
          ? t('settings.integrations.reconnectStarted', { defaultValue: 'Reconnect flow opened' })
          : t('settings.integrations.connectStarted', { defaultValue: 'Connect flow opened' })
      );

      openIntegrationSession(session);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      Message.error(
        reason
          ? t('settings.integrations.connectFailedWithReason', {
              defaultValue: 'Unable to open the integration flow: {{reason}}',
              reason,
            })
          : t('settings.integrations.connectFailed', { defaultValue: 'Failed to complete the integration connection' })
      );
      setPendingProviderId(null);
      void loadIntegrations();
    }
  };

  const handleDisconnect = async (providerId: string) => {
    setPendingProviderId(providerId);
    try {
      await ipcBridge.ma.integration.disconnect.invoke({ providerId });
      Message.success(t('settings.integrations.disconnectSuccess', { defaultValue: 'Integration disconnected' }));
      await loadIntegrations();
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      Message.error(
        reason
          ? t('settings.integrations.disconnectFailedWithReason', {
              defaultValue: 'Failed to disconnect integration: {{reason}}',
              reason,
            })
          : t('settings.integrations.disconnectFailed', { defaultValue: 'Failed to disconnect integration' })
      );
    } finally {
      setPendingProviderId(null);
    }
  };

  const renderIntegrations = () => {
    if (integrationsLoading) {
      return (
        <div className='flex items-center justify-center py-40px'>
          <Spin size={28} />
        </div>
      );
    }

    if (integrationDescriptors.length === 0) {
      return (
        <div className='py-24px'>
          <Alert
            type='info'
            showIcon
            content={t('settings.integrations.emptyHint', {
              defaultValue:
                'No integrations are currently available. Configure Nango in the desktop environment to enable external connections.',
            })}
          />
          <div className='mt-20px flex justify-center'>
            <Empty description={t('settings.integrations.empty', { defaultValue: 'No integrations available yet' })} />
          </div>
        </div>
      );
    }

    return (
      <div className='grid gap-16px pt-16px md:grid-cols-2'>
        {integrationDescriptors.map(({ provider, connection }) => {
          const status = connection?.status ?? 'not_connected';
          const isBusy = pendingProviderId === provider.id;
          const isConnected = status === 'connected';
          const needsReconnect = status === 'reauth_required' || status === 'error';

          return (
            <Card
              key={provider.id}
              title={
                <div className='flex items-center justify-between gap-12px'>
                  <Space size='small'>
                    <LinkCloud theme='outline' size='18' />
                    <Typography.Text bold>{provider.title}</Typography.Text>
                  </Space>
                  <Tag color={STATUS_COLORS[status]}>
                    {t(`settings.integrations.status.${status}`, {
                      defaultValue: status.replace(/_/g, ' '),
                    })}
                  </Tag>
                </div>
              }
              bordered
              className='h-full'
            >
              <Space direction='vertical' size='medium' className='w-full'>
                <Typography.Paragraph className='!mb-0 text-t-secondary'>
                  {provider.description ??
                    t('settings.integrations.defaultDescription', {
                      defaultValue: 'Connect this provider so Flowise-powered M&A workflows can access external data.',
                    })}
                </Typography.Paragraph>

                <Space wrap size='small'>
                  <Tag>{provider.category}</Tag>
                  {connection?.connectionId ? (
                    <Tag icon={<CheckOne theme='filled' size='12' />}>
                      {t('settings.integrations.connected', { defaultValue: 'Connected' })}
                    </Tag>
                  ) : null}
                </Space>

                {connection?.connectionId ? (
                  <Typography.Text type='secondary'>
                    {t('settings.integrations.connectionId', { defaultValue: 'Connection ID' })}:{' '}
                    {connection.connectionId}
                  </Typography.Text>
                ) : null}

                {connection?.lastError ? (
                  <Alert
                    type='warning'
                    showIcon
                    content={`${t('settings.integrations.lastError', { defaultValue: 'Last error' })}: ${connection.lastError}`}
                  />
                ) : null}

                <Space wrap>
                  {!isConnected ? (
                    <Button
                      type='primary'
                      icon={
                        needsReconnect ? (
                          <RefreshOne theme='outline' size='14' />
                        ) : (
                          <LinkCloud theme='outline' size='14' />
                        )
                      }
                      loading={isBusy}
                      onClick={() => void handleConnect(provider.id, needsReconnect)}
                    >
                      {needsReconnect
                        ? t('settings.integrations.reconnect', { defaultValue: 'Reconnect' })
                        : t('settings.integrations.connect', { defaultValue: 'Connect' })}
                    </Button>
                  ) : (
                    <Button
                      type='primary'
                      status='danger'
                      icon={<Unlink theme='outline' size='14' />}
                      loading={isBusy}
                      onClick={() => void handleDisconnect(provider.id)}
                    >
                      {t('settings.integrations.disconnect', { defaultValue: 'Disconnect' })}
                    </Button>
                  )}

                  <Button
                    icon={<Refresh theme='outline' size='14' />}
                    disabled={integrationsLoading}
                    onClick={() => void loadIntegrations()}
                  >
                    {t('settings.integrations.refresh', { defaultValue: 'Refresh' })}
                  </Button>
                </Space>
              </Space>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <Tabs
        activeTab={activeTab}
        onChange={handleTabChange}
        type='line'
        className='flex flex-col flex-1 min-h-0 [&>.arco-tabs-content]:pt-0'
      >
        <Tabs.TabPane key='skills' title={t('settings.capabilitiesTab.skills', { defaultValue: 'Skills' })}>
          <SkillsHubSettings withWrapper={false} />
        </Tabs.TabPane>
        <Tabs.TabPane key='tools' title={t('settings.capabilitiesTab.tools', { defaultValue: 'MCP & Voice' })}>
          <ToolsModalContent />
        </Tabs.TabPane>
        <Tabs.TabPane
          key='integrations'
          title={t('settings.capabilitiesTab.integrations', { defaultValue: 'Integrations' })}
        >
          <div className='pt-8px'>
            <Alert
              type='info'
              showIcon
              content={t('settings.integrations.description', {
                defaultValue:
                  'Connect external systems through Nango so Largo can bring CRM, storage, and other third-party context into M&A workflows.',
              })}
            />
            {renderIntegrations()}
          </div>
        </Tabs.TabPane>
      </Tabs>
    </SettingsPageWrapper>
  );
};

export default CapabilitiesSettings;
