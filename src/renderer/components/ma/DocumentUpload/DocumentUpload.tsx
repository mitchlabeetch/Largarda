/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useRef } from 'react';
import { Upload, Progress, Button } from '@arco-design/web-react';
import { Upload as UploadIcon, Close, FileText } from '@icon-park/react';
import { ipcBridge } from '@/common';
import type { DocumentFormat } from '@/common/ma/types';
import styles from './DocumentUpload.module.css';

const SUPPORTED_FORMATS: DocumentFormat[] = ['pdf', 'docx', 'xlsx', 'txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

interface UploadProgress {
  uid: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function DocumentUpload({
  dealId,
  onUploadComplete,
  onUploadError,
  multiple = true,
  className,
}: DocumentUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase() as DocumentFormat | undefined;

    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported format: .${extension || 'unknown'}. Supported formats: PDF, DOCX, XLSX, TXT`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: 50MB`,
      };
    }

    return { valid: true };
  }, []);

  const handleUpload = useCallback(
    async (file: File): Promise<{ id: string; filename: string }> => {
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const extension = file.name.split('.').pop()?.toLowerCase() as DocumentFormat;
      const uid = `${Date.now()}-${file.name}`;

      // Initialize progress
      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.set(uid, {
          uid,
          filename: file.name,
          progress: 0,
          status: 'uploading',
        });
        return next;
      });

      try {
        // Create document record
        const document = await ipcBridge.ma.document.create.invoke({
          dealId,
          filename: file.name,
          originalPath: file.name, // Will be updated with actual path after processing
          format: extension,
          size: file.size,
        });

        // Simulate progress for large files
        // In real implementation, this would be driven by IPC events
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setUploadProgress((prev) => {
            const next = new Map(prev);
            const current = next.get(uid);
            if (current) {
              next.set(uid, { ...current, progress });
            }
            return next;
          });
        }

        // Update status to success
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(uid, {
            uid,
            filename: file.name,
            progress: 100,
            status: 'success',
          });
          return next;
        });

        return { id: document.id, filename: file.name };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(uid, {
            uid,
            filename: file.name,
            progress: 0,
            status: 'error',
            error: errorMessage,
          });
          return next;
        });

        throw error;
      }
    },
    [dealId, validateFile]
  );

  const handleRequest = useCallback(
    async (options: {
      onProgress: (percent: number) => void;
      onSuccess: () => void;
      onError: (error: Error) => void;
    }) => {
      const { onProgress, onSuccess, onError } = options;
      const file = (options as unknown as { file: File }).file;

      try {
        const result = await handleUpload(file);
        onSuccess();
        onUploadComplete?.([result]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        onError(new Error(errorMessage));
        onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    [handleUpload, onUploadComplete, onUploadError]
  );

  const handleRemove = useCallback((uid: string) => {
    setUploadProgress((prev) => {
      const next = new Map(prev);
      next.delete(uid);
      return next;
    });
  }, []);

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

  const renderUploadList = useCallback(() => {
    const items = Array.from(uploadProgress.values());
    if (items.length === 0) return null;

    return (
      <div className={styles.uploadList}>
        {items.map((item) => (
          <div key={item.uid} className={styles.uploadItem}>
            <div className={styles.fileInfo}>
              <FileText className={styles.fileIcon} />
              <span className={styles.fileName}>{item.filename}</span>
              {item.status === 'error' && <span className={styles.errorText}>{item.error}</span>}
            </div>
            <div className={styles.progressSection}>
              {item.status === 'uploading' && (
                <Progress percent={item.progress} size='small' className={styles.progress} />
              )}
              {item.status === 'success' && <span className={styles.successText}>Uploaded</span>}
              {item.status === 'error' && <span className={styles.errorText}>Failed</span>}
              <Button
                type='text'
                size='mini'
                icon={<Close />}
                onClick={() => handleRemove(item.uid)}
                className={styles.removeButton}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }, [uploadProgress, handleRemove]);

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
        tip={<div className={styles.tip}>Supported formats: PDF, DOCX, XLSX, TXT (max 50MB)</div>}
      >
        <div className={styles.dropzone}>
          <div className={styles.dropzoneContent}>
            <UploadIcon className={styles.uploadIcon} />
            <div className={styles.dropzoneText}>
              <span className={styles.primaryText}>Click or drag files to upload</span>
              <span className={styles.secondaryText}>Support batch upload of multiple documents</span>
            </div>
          </div>
        </div>
      </Upload>
      {renderUploadList()}
    </div>
  );
}

export default DocumentUpload;
