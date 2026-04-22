/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type { MaDocument, DocumentStatus, DocumentFormat } from '@/common/ma/types';

const SUPPORTED_FORMATS = new Set<DocumentFormat>(['pdf', 'docx', 'xlsx', 'txt']);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export type UploadLifecycleStatus = 'validating' | 'uploading' | 'ingesting' | 'completed' | 'failed' | 'cancelled';

export interface UploadStateItem {
  progress: number;
  status: UploadLifecycleStatus;
  stage?: string;
  error?: string;
  errorKey?: string;
  errorContext?: Record<string, unknown>;
  documentId?: string;
  filename: string;
}

interface UseDocumentsOptions {
  /** Deal ID to fetch documents for */
  dealId: string;
  /** Whether to auto-refresh documents */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
}

interface UseDocumentsReturn {
  /** List of documents */
  documents: MaDocument[];
  /** Whether documents are being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refresh documents manually */
  refresh: () => void;
  /** Upload a new document */
  upload: (file: File) => Promise<MaDocument>;
  /** Cancel an in-flight upload / ingestion */
  cancelUpload: (uploadId: string) => Promise<void>;
  /** Delete a document */
  deleteDocument: (id: string) => Promise<void>;
  /** Update document status */
  updateStatus: (id: string, status: DocumentStatus, error?: string) => Promise<void>;
  /** Clear a single upload status entry */
  clearUploadStatus: (uploadId: string) => void;
  /** Processing status for uploads */
  uploadStatus: Map<string, UploadStateItem>;
}

const fetcher = (dealId: string) => ipcBridge.ma.document.listByDeal.invoke({ dealId });

function validateFile(
  file: File
): { valid: true } | { valid: false; errorKey: string; context?: Record<string, unknown> } {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_FORMATS.has(extension as DocumentFormat)) {
    return {
      valid: false,
      errorKey: 'documentUpload.errors.unsupportedFormat',
      context: { extension: extension || 'unknown' },
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      errorKey: 'documentUpload.errors.fileTooLarge',
      context: { size: (file.size / 1024 / 1024).toFixed(1), maxSize: '50' },
    };
  }
  return { valid: true };
}

export function useDocuments(options: UseDocumentsOptions): UseDocumentsReturn {
  const { dealId, autoRefresh = true, refreshInterval = 30000 } = options;

  const [uploadStatus, setUploadStatus] = useState<Map<string, UploadStateItem>>(new Map());
  const cleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const {
    data: documents = [],
    isLoading,
    error,
    mutate,
  } = useSWR<MaDocument[]>(dealId ? `ma.documents.${dealId}` : null, () => fetcher(dealId), {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    refreshInterval: autoRefresh ? refreshInterval : undefined,
  });

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const clearUploadStatus = useCallback((uploadId: string) => {
    setUploadStatus((prev) => {
      const next = new Map(prev);
      next.delete(uploadId);
      return next;
    });
    const timer = cleanupTimersRef.current.get(uploadId);
    if (timer) {
      clearTimeout(timer);
      cleanupTimersRef.current.delete(uploadId);
    }
  }, []);

  const scheduleCleanup = useCallback(
    (uploadId: string) => {
      const existing = cleanupTimersRef.current.get(uploadId);
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(() => {
        clearUploadStatus(uploadId);
      }, 5000);
      cleanupTimersRef.current.set(uploadId, timer);
    },
    [clearUploadStatus]
  );

  const upload = useCallback(
    async (file: File): Promise<MaDocument> => {
      const uploadId = `upload-${Date.now()}-${file.name}`;
      let unsubProgress: (() => void) | undefined;

      try {
        // 1. Validation
        setUploadStatus((prev) => {
          const next = new Map(prev);
          next.set(uploadId, { progress: 0, status: 'validating', filename: file.name });
          return next;
        });

        const validationResult = validateFile(file);
        if (!validationResult.valid) {
          const invalidResult = validationResult as {
            valid: false;
            errorKey: string;
            context?: Record<string, unknown>;
          };
          throw new Error(JSON.stringify({ key: invalidResult.errorKey, context: invalidResult.context ?? {} }));
        }

        // 2. Write file to disk
        setUploadStatus((prev) => {
          const next = new Map(prev);
          next.set(uploadId, { progress: 0, status: 'uploading', filename: file.name });
          return next;
        });

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const filePath = await ipcBridge.fs.createUploadFile.invoke({ fileName: file.name });
        await ipcBridge.fs.writeFile.invoke({ path: filePath, data: uint8Array });

        // 3. Create document record with ACTUAL path
        const extension = file.name.split('.').pop()?.toLowerCase() as DocumentFormat;
        const document = await ipcBridge.ma.document.create.invoke({
          dealId,
          filename: file.name,
          originalPath: filePath,
          format: extension,
          size: file.size,
        });

        // 4. Ingestion
        setUploadStatus((prev) => {
          const next = new Map(prev);
          next.set(uploadId, { progress: 0, status: 'ingesting', filename: file.name, documentId: document.id });
          return next;
        });

        // Subscribe to truthful progress BEFORE invoking ingest
        unsubProgress = ipcBridge.ma.document.progress.on((event) => {
          if (event.documentId !== document.id) return;

          setUploadStatus((prev) => {
            const next = new Map(prev);
            const current = next.get(uploadId);
            if (!current) return prev;

            const terminalStatus: UploadLifecycleStatus | undefined =
              event.stage === 'completed' || event.stage === 'failed' || event.stage === 'cancelled'
                ? event.stage
                : undefined;

            next.set(uploadId, {
              ...current,
              progress: event.progress,
              status: terminalStatus ?? 'ingesting',
              stage: event.stage,
              error: event.error,
            });
            return next;
          });
        });

        const result = await ipcBridge.ma.document.ingest.invoke({
          id: document.id,
          filePath,
        });

        // Ensure terminal success state
        setUploadStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(uploadId);
          if (current) {
            next.set(uploadId, { ...current, progress: 100, status: 'completed' });
          }
          return next;
        });

        mutate();
        scheduleCleanup(uploadId);
        return result;
      } catch (error) {
        let errorMessage = 'Upload failed';
        let errorKey: string | undefined;
        let errorContext: Record<string, unknown> | undefined;

        if (error instanceof Error) {
          errorMessage = error.message;
          // Try to parse JSON error from validateFile
          try {
            const parsed = JSON.parse(errorMessage);
            if (parsed.key && typeof parsed.key === 'string') {
              errorKey = parsed.key;
              errorContext = parsed.context;
            }
          } catch {
            // Not a JSON error, use raw message
          }
        }

        setUploadStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(uploadId);
          if (current) {
            next.set(uploadId, { ...current, status: 'failed', error: errorMessage, errorKey, errorContext });
          } else {
            next.set(uploadId, {
              progress: 0,
              status: 'failed',
              filename: file.name,
              error: errorMessage,
              errorKey,
              errorContext,
            });
          }
          return next;
        });

        scheduleCleanup(uploadId);
        throw error;
      } finally {
        unsubProgress?.();
      }
    },
    [dealId, mutate, scheduleCleanup]
  );

  const cancelUpload = useCallback(
    async (uploadId: string) => {
      const state = uploadStatus.get(uploadId);
      if (!state?.documentId) return;

      let cancelled = false;
      try {
        cancelled = await ipcBridge.ma.document.cancel.invoke({ id: state.documentId });
      } catch {
        // Cancel threw - don't mark as cancelled
        cancelled = false;
      }

      // Only mark cancelled if the process actually confirmed cancellation
      if (cancelled) {
        setUploadStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(uploadId);
          if (current) {
            next.set(uploadId, { ...current, status: 'cancelled' });
          }
          return next;
        });
        scheduleCleanup(uploadId);
      }
      // If cancelled is false, we keep the prior state and let the truthful terminal
      // progress from the process finalize the state naturally
    },
    [uploadStatus, scheduleCleanup]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<void> => {
      const previousDocuments = documents;

      mutate((currentDocs) => (currentDocs || []).filter((doc) => doc.id !== id), false);

      try {
        await ipcBridge.ma.document.delete.invoke({ id });
        mutate();
      } catch (error) {
        mutate(previousDocuments, false);
        throw error;
      }
    },
    [documents, mutate]
  );

  const updateStatus = useCallback(
    async (id: string, status: DocumentStatus, error?: string): Promise<void> => {
      try {
        await ipcBridge.ma.document.updateStatus.invoke({ id, status, error });
        mutate();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update status');
      }
    },
    [mutate]
  );

  return {
    documents,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error(String(error))) : null,
    refresh,
    upload,
    cancelUpload,
    deleteDocument,
    updateStatus,
    clearUploadStatus,
    uploadStatus,
  };
}

function isTerminalDocumentStatus(stage: string): boolean {
  return stage === 'completed' || stage === 'failed' || stage === 'cancelled';
}

export default useDocuments;
