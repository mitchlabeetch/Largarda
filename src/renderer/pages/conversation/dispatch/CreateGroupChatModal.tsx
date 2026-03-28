/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { Button, Input, Message, Modal, Tooltip } from '@arco-design/web-react';
import { FolderOpen } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { emitter } from '@/renderer/utils/emitter';
import { iconColors } from '@/renderer/styles/colors';

import type { GroupChatCreationModalProps } from './types';

const CreateGroupChatModal: React.FC<GroupChatCreationModalProps> = ({ visible, onClose, onCreated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [loading, setLoading] = useState(false);

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
      } else {
        Message.error(response.msg || t('dispatch.create.error'));
      }
    } catch (err) {
      console.error('[CreateGroupChatModal] invoke error:', err);
      Message.error(t('dispatch.create.error'));
    } finally {
      setLoading(false);
    }
  }, [name, workspace, navigate, onCreated, t]);

  const handleCancel = useCallback(() => {
    setName('');
    setWorkspace('');
    onClose();
  }, [onClose]);

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
    </Modal>
  );
};

export default CreateGroupChatModal;
