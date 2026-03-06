/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PreviewMetadata } from '@/renderer/pages/conversation/preview/context/PreviewContext';
import { Button, Input, Modal, Popover, Tooltip } from '@arco-design/web-react';
import { Tv } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { detectReachableStarOfficeUrl, STAR_OFFICE_URL_KEY } from '@/renderer/utils/starOffice';
import { iconColors } from '@/renderer/theme/colors';

const MONITOR_URL_STORAGE_KEY = 'aionui.openclaw.monitorUrl';
const DEFAULT_MONITOR_URL = 'http://127.0.0.1:19000';

interface OpenClawMonitorButtonProps {
  onOpenUrl: (url: string, metadata?: PreviewMetadata) => void;
}

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type DetectState = 'checking' | 'ready' | 'not_found' | 'error';

const OpenClawMonitorButton: React.FC<OpenClawMonitorButtonProps> = ({ onOpenUrl }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectState, setDetectState] = useState<DetectState>('checking');
  const [detectError, setDetectError] = useState('');
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem(MONITOR_URL_STORAGE_KEY)?.trim() || DEFAULT_MONITOR_URL;
    } catch {
      return DEFAULT_MONITOR_URL;
    }
  });

  const runDetect = useCallback(async (options?: { force?: boolean; silent?: boolean; timeoutMs?: number }) => {
    setDetectState('checking');
    setDetectError('');
    if (!options?.silent) setDetecting(true);
    try {
      let found: string | null = null;
      let hasDetectError = false;
      const mainDetectResult = await ipcBridge.application.detectStarOfficeUrl.invoke({
        preferredUrl: url,
        force: options?.force,
        timeoutMs: options?.timeoutMs ?? 1000,
      });
      if (mainDetectResult.success) {
        found = mainDetectResult.data?.url || null;
      } else if (mainDetectResult.msg) {
        hasDetectError = true;
        setDetectError(mainDetectResult.msg);
      }
      if (!found) {
        found = await detectReachableStarOfficeUrl(url, {
          force: options?.force,
          timeoutMs: options?.timeoutMs,
        });
      }
      setDetectedUrl(found);
      if (found) {
        setUrl(found);
        setDetectState('ready');
        try {
          localStorage.setItem(MONITOR_URL_STORAGE_KEY, found);
          localStorage.setItem(STAR_OFFICE_URL_KEY, found);
        } catch {
          // ignore persistence error
        }
      } else {
        setDetectState(hasDetectError ? 'error' : 'not_found');
      }
      return found;
    } finally {
      if (!options?.silent) setDetecting(false);
    }
  }, [url]);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleId = idleWindow.requestIdleCallback(() => {
        void runDetect({ silent: true });
      }, { timeout: 700 });
      return () => {
        if (typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(() => {
      void runDetect({ silent: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [runDetect]);

  const handleConfirm = useCallback(() => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;

    try {
      const parsed = new URL(normalized);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return;
      }
      try {
        localStorage.setItem(MONITOR_URL_STORAGE_KEY, normalized);
        localStorage.setItem(STAR_OFFICE_URL_KEY, normalized);
      } catch {
        // ignore persistence error
      }
      onOpenUrl(normalized, {
        title: t('conversation.preview.openclawMonitorTitle', { defaultValue: 'OpenClaw Live Monitor' }),
      });
      setVisible(false);
    } catch {
      // keep modal open for correction
    }
  }, [onOpenUrl, t, url]);

  const tooltipText = useMemo(() => {
    if (detectState === 'ready' && detectedUrl) {
      return t('conversation.preview.openclawMonitorDetected', {
        defaultValue: 'Open live monitor (detected at {{url}})',
        url: detectedUrl,
      });
    }
    if (detectState === 'checking') {
      return t('conversation.preview.openclawMonitorDetecting', { defaultValue: 'Detecting local monitor service...' });
    }
    if (detectState === 'error') {
      return t('conversation.preview.openclawMonitorDetectFailed', { defaultValue: 'Monitor detection failed, click to configure manually' });
    }
    if (detectState === 'not_found') {
      return t('conversation.preview.openclawMonitorNotInstalled', { defaultValue: 'No local monitor detected, click to install/connect' });
    }
    return t('conversation.preview.openclawMonitor', { defaultValue: 'Open live monitor' });
  }, [detectState, detectedUrl, t]);

  const statusBadgeColor = useMemo(() => {
    if (detectState === 'ready') return 'rgb(var(--success-6))';
    if (detectState === 'error') return 'rgb(var(--danger-6))';
    if (detectState === 'checking') return 'rgb(var(--arcoblue-6))';
    return 'rgb(var(--gray-4))';
  }, [detectState]);

  const statusText = useMemo(() => {
    if (detectState === 'ready') {
      return t('conversation.preview.openclawMonitorReady', {
        defaultValue: 'Connected: {{url}}',
        url: detectedUrl,
      });
    }
    if (detectState === 'checking') {
      return t('conversation.preview.openclawMonitorChecking', { defaultValue: 'Checking local Star Office service...' });
    }
    if (detectState === 'error') {
      return t('conversation.preview.openclawMonitorError', { defaultValue: 'Detection failed. You can still input URL manually.' });
    }
    return t('conversation.preview.openclawMonitorMissing', { defaultValue: 'Star Office is not detected on this machine.' });
  }, [detectState, detectedUrl, t]);

  const handlePrimaryClick = useCallback(() => {
    if (detectState === 'ready' && detectedUrl) {
      onOpenUrl(detectedUrl, {
        title: t('conversation.preview.openclawMonitorTitle', { defaultValue: 'OpenClaw Live Monitor' }),
      });
      return;
    }
    setVisible(true);
  }, [detectState, detectedUrl, onOpenUrl, t]);

  const handleOpenInstallGuide = useCallback(() => {
    void ipcBridge.shell.openExternal.invoke('https://github.com/ringhyacinth/Star-Office-UI');
  }, []);

  const iconFill = useMemo(() => {
    if (detectState === 'ready') return iconColors.primary;
    return iconColors.disabled;
  }, [detectState]);

  const buttonNode = (
    <Button
      type='text'
      size='small'
      className='cron-job-manager-button chat-header-cron-pill !h-auto !w-auto !min-w-0 !px-0 !py-0'
      loading={detecting}
      onClick={handlePrimaryClick}
      aria-label={t('conversation.preview.openclawMonitor', { defaultValue: 'Open live monitor' })}
    >
      <span className='inline-flex items-center gap-2px rounded-full px-8px py-2px bg-2'>
        <Tv theme='outline' size={16} fill={iconFill} />
        <span className='ml-4px w-8px h-8px rounded-full' style={{ backgroundColor: statusBadgeColor }} />
      </span>
    </Button>
  );

  return (
    <>
      {detectState === 'ready' ? (
        <Tooltip content={tooltipText}>{buttonNode}</Tooltip>
      ) : (
        <Popover
          trigger='hover'
          position='bottom'
          content={
            <div className='flex flex-col gap-8px p-4px max-w-260px'>
              <div className='text-13px text-t-secondary'>{statusText}</div>
              {detectError ? <div className='text-11px text-[rgb(var(--danger-6))]'>{detectError}</div> : null}
              <div className='flex items-center gap-8px flex-wrap'>
                <Button size='mini' type='primary' loading={detecting} onClick={() => void runDetect({ force: true, timeoutMs: 450 })}>
                  {t('conversation.preview.openclawMonitorDetect', { defaultValue: 'Auto detect local Star Office' })}
                </Button>
                <Button size='mini' type='outline' onClick={handleOpenInstallGuide}>
                  {t('conversation.preview.openclawMonitorInstall', { defaultValue: 'Install Star Office' })}
                </Button>
              </div>
            </div>
          }
        >
          {buttonNode}
        </Popover>
      )}

      <Modal title={t('conversation.preview.openclawMonitor', { defaultValue: 'Open live monitor' })} visible={visible} onOk={handleConfirm} onCancel={() => setVisible(false)} okText={t('common.confirm')} cancelText={t('common.cancel')}>
        <div className='text-12px mb-8px text-t-primary'>{statusText}</div>
        {detectError ? <div className='text-11px mb-8px text-[rgb(var(--danger-6))]'>{detectError}</div> : null}
        <div className='text-12px text-t-secondary mb-8px'>{t('conversation.preview.openclawMonitorHint', { defaultValue: 'Input monitor URL, e.g. http://127.0.0.1:19000' })}</div>
        <Input value={url} onChange={setUrl} placeholder='http://127.0.0.1:19000' />
        <div className='mt-8px flex items-center gap-8px flex-wrap'>
          <Button size='mini' type='outline' loading={detecting} onClick={() => void runDetect({ force: true, timeoutMs: 360 })}>
            {t('conversation.preview.openclawMonitorDetect', { defaultValue: 'Auto detect local Star Office' })}
          </Button>
          <Button size='mini' type='text' onClick={handleOpenInstallGuide}>
            {t('conversation.preview.openclawMonitorInstall', { defaultValue: 'Install Star Office' })}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default OpenClawMonitorButton;
