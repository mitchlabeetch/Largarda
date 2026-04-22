/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useRef } from 'react';
import { Upload, Progress, Button, Spin } from '@arco-design/web-react';
import { Upload as UploadIcon, Close, FileText } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useDocuments } from '@/renderer/hooks/ma/useDocuments';
import type { UploadStateItem } from '@/renderer/hooks/ma/useDocuments';
import type { DocumentFormat } from '@/common/ma/types';
import styles from './DocumentUpload.module.css';

const SUPPORTED_FORMATS: DocumentFormat[] = ['pdf', 'docx', 'xlsx', 'txt'];

interface DocumentUploadProps {
  /** Deal ID to associate documents with */
  dealId: string;
  /** Callback when documents are uploaded successfully */
  onUploadComplete?: (documents: Array<{ id: string; filename: string }>) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
  /** Whether to allow multiple file selection */
  multiple?: boolean;
  /** Custom class name */
  className?: string;
}

function getStatusLabel(t: (key: string, options?: Record<string, unknown>) => string, item: UploadStateItem): string {
  switch (item.status) {
    case 'validating':
      return t('documentUpload.status.validating' as string);
    case 'uploading':
      return t('documentUpload.status.uploading' as string);
    case 'ingesting':
      return item.stage
        ? t(`documentUpload.stage.${item.stage}` as string, { defaultValue: item.stage })
        : t('documentUpload.status.ingesting' as string);
    case 'completed':
      return t('documentUpload.status.uploaded');
    case 'failed':
      return t('documentUpload.status.failed');
    case 'cancelled':
      return t('documentUpload.status.cancelled' as string);
    default:
      return item.status;
  }
}

export function DocumentUpload({
  dealId,
  onUploadComplete,
  onUploadError,
  multiple = true,
  className,
}: DocumentUploadProps) {
  const { t } = useTranslation('ma');
  const [isDragging, setIsDragging] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);

  const { upload, uploadStatus, clearUploadStatus, cancelUpload } = useDocuments({
    dealId,
    autoRefresh: false,
  });

  const handleRequest = useCallback(
    async (options: {
      onProgress: (percent: number) => void;
      onSuccess: () => void;
      onError: (error: Error) => void;
      file: File;
    }) => {
      const { onSuccess, onError, file } = options;

      try {
        const result = await upload(file);
        onSuccess();
        onUploadComplete?.([{ id: result.id, filename: result.filename }]);
      } catch (error) {
        let errorMessage = t('documentUpload.errors.uploadFailed');
        if (error instanceof Error) {
          try {
            const parsed = JSON.parse(error.message) as {
              key?: string;
              context?: Record<string, unknown>;
            };
            if (parsed.key) {
              errorMessage = t(parsed.key as string, parsed.context ?? {});
            } else {
              errorMessage = error.message;
            }
          } catch {
            errorMessage = error.message;
          }
        }
        onError(new Error(errorMessage));
        onUploadError?.(new Error(errorMessage));
      }
    },
    [upload, onUploadComplete, onUploadError, t]
  );

  const handleRemove = useCallback(
    (uploadId: string) => {
      clearUploadStatus(uploadId);
    },
    [clearUploadStatus]
  );

  const handleCancel = useCallback(
    async (uploadId: string) => {
      await cancelUpload(uploadId);
    },
    [cancelUpload]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const triggerFileInput = useCallback(() => {
    const input = uploadRef.current?.querySelector('input[type="file"]') as HTMLElement | null;
    input?.click();
  }, []);

  const handleDropzoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerFileInput();
      }
    },
    [triggerFileInput]
  );

  const renderUploadList = useCallback(() => {
    const entries = Array.from(uploadStatus.entries());
    if (entries.length === 0) return null;

    return (
      <div className={styles.uploadList}>
        {entries.map(([uploadId, item]) => {
          const isTerminal = item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled';
          const isActive = !isTerminal;

          return (
            <div key={uploadId} className={styles.uploadItem}>
              <div className={styles.fileInfo}>
                <FileText className={styles.fileIcon} />
                <span className={styles.fileName}>{item.filename}</span>
                {item.status === 'failed' && (item.errorKey || item.error) && (
                  <span
                    className={styles.errorText}
                    title={item.errorKey ? t(item.errorKey, item.errorContext ?? {}) : item.error}
                  >
                    {item.errorKey ? t(item.errorKey, item.errorContext ?? {}) : item.error}
                  </span>
                )}
              </div>
              <div className={styles.progressSection}>
                {isActive && item.status === 'ingesting' && (
                  <Progress percent={item.progress} size='small' className={styles.progress} />
                )}
                {isActive && item.status !== 'ingesting' && <Spin size={14} />}
                <span
                  className={
                    item.status === 'completed'
                      ? styles.successText
                      : item.status === 'failed' || item.status === 'cancelled'
                        ? styles.errorText
                        : styles.statusText
                  }
                >
                  {getStatusLabel(t, item)}
                </span>
                {item.status === 'ingesting' && (
                  <Button
                    type='text'
                    size='mini'
                    onClick={() => handleCancel(uploadId)}
                    className={styles.cancelButton}
                  >
                    {t('common.cancel' as string)}
                  </Button>
                )}
                {isTerminal && (
                  <Button
                    type='text'
                    size='mini'
                    icon={<Close />}
                    onClick={() => handleRemove(uploadId)}
                    className={styles.removeButton}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [uploadStatus, handleRemove, handleCancel, t]);

  return (
    <div
      ref={uploadRef}
      className={`${styles.container} ${className || ''} ${isDragging ? styles.dragging : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Upload
        drag
        multiple={multiple}
        accept={SUPPORTED_FORMATS.map((f) => `.${f}`).join(',')}
        limit={10}
        customRequest={handleRequest}
        autoUpload={true}
        showUploadList={false}
        tip={<div className={styles.tip}>{t('documentUpload.tip')}</div>}
      >
        <div
          className={styles.dropzone}
          tabIndex={0}
          role='button'
          aria-label={t('documentUpload.primaryText')}
          onKeyDown={handleDropzoneKeyDown}
        >
          <div className={styles.dropzoneContent}>
            <UploadIcon className={styles.uploadIcon} />
            <div className={styles.dropzoneText}>
              <span className={styles.primaryText}>{t('documentUpload.primaryText')}</span>
              <span className={styles.secondaryText}>{t('documentUpload.secondaryText')}</span>
            </div>
          </div>
        </div>
      </Upload>
      {renderUploadList()}
    </div>
  );
}

export default DocumentUpload;
