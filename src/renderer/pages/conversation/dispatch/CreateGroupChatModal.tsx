/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/config/storage';
import type { IProvider } from '@/common/config/storage';
import type { AcpBackendConfig } from '@/common/types/acpTypes';
import { Button, Collapse, Input, Message, Modal, Select, Tooltip, Typography } from '@arco-design/web-react';
import { FolderOpen } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { emitter } from '@/renderer/utils/emitter';
import { iconColors } from '@/renderer/styles/colors';

import type { GroupChatCreationModalProps } from './types';

const CreateGroupChatModal: React.FC<GroupChatCreationModalProps> = ({ visible, onClose, onCreated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [loading, setLoading] = useState(false);
  const [leaderAgentId, setLeaderAgentId] = useState<string | undefined>();
  const [selectedModel, setSelectedModel] = useState<{ providerId: string; useModel: string } | undefined>();
  const [seedMessage, setSeedMessage] = useState('');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Leader Agent list
  const [customAgents, setCustomAgents] = useState<AcpBackendConfig[]>([]);
  useEffect(() => {
    void ConfigStorage.get('acp.customAgents')
      .then((agents) => {
        setCustomAgents((agents || []).filter((a) => a.enabled !== false));
      })
      .catch(() => setCustomAgents([]));
  }, []);

  // Model list
  const { data: modelConfig } = useSWR<IProvider[]>('model.config', () => ipcBridge.mode.getModelConfig.invoke());
  const enabledProviders = useMemo(() => (modelConfig || []).filter((p) => p.enabled !== false), [modelConfig]);

  const handleBrowseWorkspace = useCallback(async () => {
    try {
      const files = await ipcBridge.dialog.showOpen.invoke({ properties: ['openDirectory'] });
      const selected = files?.[0];
      if (selected) {
        setWorkspace(selected);
      }
    } catch (err) {
      console.error('[CreateGroupChatModal] directory picker error:', err);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ipcBridge.dispatch.createGroupChat.invoke({
        name: name.trim() || undefined,
        workspace: workspace || undefined,
        leaderAgentId,
        modelOverride: selectedModel,
        seedMessages: seedMessage.trim() || undefined,
      });
      if (response.success && response.data?.conversationId) {
        const conversationId = response.data.conversationId;
        emitter.emit('chat.history.refresh');
        Promise.resolve(navigate(`/conversation/${conversationId}`)).catch((error) => {
          console.error('Navigation failed:', error);
        });
        onCreated(conversationId);
        setName('');
        setWorkspace('');
        setLeaderAgentId(undefined);
        setSelectedModel(undefined);
        setSeedMessage('');
        setAdvancedExpanded(false);
      } else {
        Message.error(response.msg || t('dispatch.create.error'));
      }
    } catch (err) {
      console.error('[CreateGroupChatModal] invoke error:', err);
      Message.error(t('dispatch.create.error'));
    } finally {
      setLoading(false);
    }
  }, [name, workspace, leaderAgentId, selectedModel, seedMessage, navigate, onCreated, t]);

  const handleCancel = useCallback(() => {
    setName('');
    setWorkspace('');
    setLeaderAgentId(undefined);
    setSelectedModel(undefined);
    setSeedMessage('');
    setAdvancedExpanded(false);
    onClose();
  }, [onClose]);

  /** Encode model selection as "providerId::modelName" for Select value */
  const modelSelectValue = selectedModel ? `${selectedModel.providerId}::${selectedModel.useModel}` : undefined;
  const handleModelChange = useCallback((value: string | undefined) => {
    if (!value) {
      setSelectedModel(undefined);
      return;
    }
    const sepIdx = value.indexOf('::');
    if (sepIdx === -1) return;
    setSelectedModel({
      providerId: value.slice(0, sepIdx),
      useModel: value.slice(sepIdx + 2),
    });
  }, []);

  return (
    <Modal
      title={t('dispatch.create.title')}
      visible={visible}
      onOk={() => {
        void handleCreate();
      }}
      onCancel={handleCancel}
      okText={t('dispatch.create.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={loading}
      style={{ borderRadius: '12px' }}
      alignCenter
      getPopupContainer={() => document.body}
    >
      {/* Name */}
      <div className='py-8px'>
        <div className='text-14px mb-8px text-t-secondary'>{t('dispatch.create.titleLabel')}</div>
        <Input
          autoFocus
          value={name}
          onChange={setName}
          onPressEnter={() => {
            void handleCreate();
          }}
          placeholder={t('dispatch.create.titlePlaceholder')}
          allowClear
        />
      </div>

      {/* Leader Agent Selector */}
      <div className='py-8px'>
        <div className='text-14px mb-8px text-t-secondary'>{t('dispatch.create.leaderAgentLabel')}</div>
        <Select
          value={leaderAgentId}
          onChange={setLeaderAgentId}
          placeholder={t('dispatch.create.leaderAgentPlaceholder')}
          allowClear
          showSearch
        >
          {customAgents.map((agent) => (
            <Select.Option key={agent.id} value={agent.id}>
              <span className='flex items-center gap-6px'>
                {agent.avatar && <span className='text-16px leading-none'>{agent.avatar}</span>}
                <span>{agent.name}</span>
              </span>
            </Select.Option>
          ))}
        </Select>
      </div>

      {/* Model Selector */}
      <div className='py-8px'>
        <Tooltip content={t('dispatch.create.modelTooltip')} position='top'>
          <div className='text-14px mb-8px text-t-secondary'>{t('dispatch.create.modelLabel')}</div>
        </Tooltip>
        <Select
          value={modelSelectValue}
          onChange={handleModelChange}
          placeholder={t('dispatch.create.modelPlaceholder')}
          allowClear
          showSearch
        >
          {enabledProviders.map((provider) => {
            const enabledModels = (provider.model || []).filter((m) => provider.modelEnabled?.[m] !== false);
            if (enabledModels.length === 0) return null;
            return (
              <Select.OptGroup key={provider.id} label={provider.name}>
                {enabledModels.map((model) => {
                  const health = provider.modelHealth?.[model];
                  const healthDot =
                    health?.status === 'healthy'
                      ? 'rgb(var(--success-6))'
                      : health?.status === 'unhealthy'
                        ? 'rgb(var(--danger-6))'
                        : 'var(--color-text-4)';
                  return (
                    <Select.Option key={`${provider.id}::${model}`} value={`${provider.id}::${model}`}>
                      <span className='flex items-center gap-6px'>
                        <span
                          className='inline-block w-6px h-6px rd-full flex-shrink-0'
                          style={{ backgroundColor: healthDot }}
                        />
                        <span>{model}</span>
                      </span>
                    </Select.Option>
                  );
                })}
              </Select.OptGroup>
            );
          })}
        </Select>
      </div>

      {/* Workspace */}
      <div className='py-8px'>
        <div className='text-14px mb-8px text-t-secondary'>{t('dispatch.create.workspaceLabel')}</div>
        <div className='flex items-center gap-8px'>
          <Tooltip content={workspace || t('dispatch.create.workspacePlaceholder')} position='top'>
            <Input
              readOnly
              value={workspace}
              placeholder={t('dispatch.create.workspacePlaceholder')}
              className='flex-1'
              onClick={() => {
                void handleBrowseWorkspace();
              }}
            />
          </Tooltip>
          <Button
            type='secondary'
            icon={<FolderOpen theme='outline' size='16' fill={iconColors.primary} />}
            onClick={() => {
              void handleBrowseWorkspace();
            }}
          >
            {t('dispatch.create.workspaceBrowse')}
          </Button>
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapse
        activeKey={advancedExpanded ? ['advanced'] : []}
        onChange={(keys) => setAdvancedExpanded(Array.isArray(keys) ? keys.includes('advanced') : keys === 'advanced')}
        bordered={false}
        style={{ marginTop: '4px' }}
      >
        <Collapse.Item name='advanced' header={t('dispatch.create.advancedSettings')}>
          <div className='py-4px'>
            <div className='text-14px mb-8px text-t-secondary'>{t('dispatch.create.seedMessageLabel')}</div>
            <Input.TextArea
              value={seedMessage}
              onChange={setSeedMessage}
              placeholder={t('dispatch.create.seedMessagePlaceholder')}
              maxLength={2000}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
            <Typography.Text type='secondary' className='text-12px mt-4px block'>
              {t('dispatch.create.seedMessageHint')}
            </Typography.Text>
          </div>
        </Collapse.Item>
      </Collapse>
    </Modal>
  );
};

export default CreateGroupChatModal;
