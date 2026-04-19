/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type { MaDocument, DocumentStatus } from '@/common/ma/types';

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
  /** Delete a document */
  deleteDocument: (id: string) => Promise<void>;
  /** Update document status */
  updateStatus: (id: string, status: DocumentStatus, error?: string) => Promise<void>;
  /** Processing status for uploads */
  uploadStatus: Map<string, { progress: number; status: 'uploading' | 'processing' | 'completed' | 'error'; error?: string }>;
}

const fetcher = (dealId: string) => ipcBridge.ma.document.listByDeal.invoke({ dealId });

export function useDocuments(options: UseDocumentsOptions): UseDocumentsReturn {
  const { dealId, autoRefresh = true, refreshInterval = 30000 } = options;

  const [uploadStatus, setUploadStatus] = useState<
    Map<string, { progress: number; status: 'uploading' | 'processing' | 'completed' | 'error'; error?: string }>
  >(new Map());

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

  const upload = useCallback(
    async (file: File): Promise<MaDocument> => {
      const uploadId = `upload-${Date.now()}-${file.name}`;
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (!extension) {
        throw new Error('Unable to determine file format');
      }

      // Set initial upload status
      setUploadStatus((prev) => {
        const next = new Map(prev);
        next.set(uploadId, { progress: 0, status: 'uploading' });
        return next;
      });

      try {
        // Create document record
        const document = await ipcBridge.ma.document.create.invoke({
          dealId,
          filename: file.name,
          originalPath: file.name,
          format: extension as MaDocument['format'],
          size: file.size,
        });

        // Update progress
        setUploadStatus((prev) => {
          const next = new Map(prev);
          next.set(uploadId, { progress: 50, status: 'processing' });
          return next;
        });

        // Update document status to processing
        await ipcBridge.ma.document.updateStatus.invoke({
          id: document.id,
          status: 'processing',
        });

        // Update progress to complete
        setUploadStatus((prev) => {
          const next = new Map(prev);
          next.set(uploadId, { progress: 100, status: 'completed' });
          return next;
        });

        // Refresh document list
        mutate();

        return document;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setUploadStatus((prev) => {
          const next = new Map(prev);
          next.set(uploadId, { progress: 0, status: 'error', error: errorMessage });
          return next;
        });

        throw error;
      } finally {
        // Clear upload status after a delay
        setTimeout(() => {
          setUploadStatus((prev) => {
            const next = new Map(prev);
            next.delete(uploadId);
            return next;
          });
        }, 3000);
      }
    },
    [dealId, mutate]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update: remove from local state immediately
      const previousDocuments = documents;

      mutate(
        (currentDocs) => (currentDocs || []).filter((doc) => doc.id !== id),
        false
      );

      try {
        await ipcBridge.ma.document.delete.invoke({ id });
        mutate(); // Revalidate with server
      } catch (error) {
        // Revert on error
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
        mutate(); // Refresh to get updated status
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
    deleteDocument,
    updateStatus,
    uploadStatus,
  };
}

export default useDocuments;