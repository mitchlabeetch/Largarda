// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const translate = (key: string, options?: Record<string, unknown>) => {
  if (key === 'documentUpload.errors.unsupportedFormat') {
    return `Unsupported format: .${String(options?.extension ?? 'unknown')}. Supported formats: PDF, DOCX, XLSX, TXT`;
  }

  const translations: Record<string, string> = {
    'documentUpload.status.validating': 'Validating...',
    'documentUpload.status.uploading': 'Uploading...',
    'documentUpload.status.ingesting': 'Processing...',
    'documentUpload.status.uploaded': 'Uploaded',
    'documentUpload.status.failed': 'Failed',
    'documentUpload.status.cancelled': 'Cancelled',
    'documentUpload.stage.extracting': 'Extracting...',
    'documentUpload.tip': 'Supported formats: PDF, DOCX, XLSX, TXT (max 50MB)',
    'documentUpload.primaryText': 'Click or drag files to upload',
    'documentUpload.secondaryText': 'Support batch upload of multiple documents',
    'common.cancel': 'Cancel',
  };

  return translations[key] ?? key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
  }),
}));

const mockUpload = vi.fn();
const mockCancelUpload = vi.fn();
const mockClearUploadStatus = vi.fn();

vi.mock('@renderer/hooks/ma/useDocuments', () => ({
  useDocuments: () => ({
    upload: mockUpload,
    uploadStatus: new Map([
      [
        'upload-1',
        {
          progress: 42,
          status: 'ingesting',
          stage: 'extracting',
          documentId: 'doc-1',
          filename: 'active.pdf',
        },
      ],
      [
        'upload-2',
        {
          progress: 100,
          status: 'completed',
          documentId: 'doc-2',
          filename: 'done.pdf',
        },
      ],
      [
        'upload-3',
        {
          progress: 0,
          status: 'failed',
          filename: 'broken.exe',
          errorKey: 'documentUpload.errors.unsupportedFormat',
          errorContext: { extension: 'exe' },
        },
      ],
    ]),
    clearUploadStatus: mockClearUploadStatus,
    cancelUpload: mockCancelUpload,
  }),
}));

import { DocumentUpload } from '@renderer/components/ma/DocumentUpload/DocumentUpload';

describe('DocumentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses upload ids for cancel and clear actions', () => {
    render(<DocumentUpload dealId='deal-1' />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCancelUpload).toHaveBeenCalledWith('upload-1');

    const doneFileInfo = screen.getByText('done.pdf').closest('div');
    const doneUploadItem = doneFileInfo?.parentElement;
    expect(doneUploadItem).toBeTruthy();

    const removeButton = within(doneUploadItem as HTMLElement).getByRole('button');
    fireEvent.click(removeButton);
    expect(mockClearUploadStatus).toHaveBeenCalledWith('upload-2');
  });

  it('renders localized failed-upload copy from the stored error key', () => {
    render(<DocumentUpload dealId='deal-1' />);

    expect(screen.getByText(/Unsupported format: \.exe/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Click or drag files to upload' })).toBeInTheDocument();
  });
});
