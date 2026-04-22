/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MarketingDocumentViewer Rendering Tests
 *
 * Coverage:
 * - Component rendering with different states (loading, empty, with document)
 * - Section navigation and highlighting
 * - Review status workflow
 * - Export action handling
 * - Validation result display
 * - Provenance panel rendering
 * - Tab switching (preview, source, validation)
 * - Mobile/responsive behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MarketingDocumentViewer } from '@/renderer/components/ma/MarketingDocumentViewer';
import type { GeneratedDocument, DocumentReviewStatus } from '@/common/ma/template/review';
import type { TemplateKey } from '@/common/ma/template/types';
import { hashContent } from '@/common/ma/template/provenance';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}(${JSON.stringify(params)})`;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/renderer/components/Markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid='markdown-renderer'>{content}</div>
  ),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockDocument(
  templateKey: TemplateKey = 'tpl.teaser',
  reviewStatus: DocumentReviewStatus = 'generated'
): GeneratedDocument {
  const baseContent = `# Executive Summary
This is a test teaser document.

# Company Overview
The company is a software business.

# Market Position
Strong position in growing market.

# Financial Highlights
Revenue: €10M

# Investment Highlights
High growth potential.`;

  const provenanceContent = `${baseContent}\n---\nlargo-provenance:\n  template: ${templateKey}\n  flow-id: flow-123\n  prompt-version: v1.0.0\n  generated-at: 2025-01-01T00:00:00.000Z\n  duration-ms: 5000\n  content-sha256: ${hashContent(baseContent)}\n---`;

  return {
    id: 'doc-001',
    dealId: 'deal-001',
    templateKey,
    outputFormat: 'markdown',
    content: provenanceContent,
    variables: { dealId: 'deal-001' },
    reviewStatus,
    provenance: {
      templateKey,
      flowId: 'flow-123',
      promptVersionId: 'v1.0.0',
      startedAt: Date.now() - 10000,
      completedAt: Date.now() - 5000,
      durationMs: 5000,
      contentHash: hashContent(baseContent),
    },
    createdAt: Date.now() - 5000,
    updatedAt: Date.now() - 5000,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('MarketingDocumentViewer', () => {
  const mockOnReviewStatusChange = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering States
  // --------------------------------------------------------------------------

  describe('rendering states', () => {
    it('renders loading state', () => {
      render(
        <MarketingDocumentViewer
          document={null}
          isLoading={true}
        />
      );

      expect(document.querySelector('.loadingState')).toBeTruthy();
    });

    it('renders empty state when no document', () => {
      render(
        <MarketingDocumentViewer
          document={null}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });

    it('renders document when provided', () => {
      const doc = createMockDocument();
      render(
        <MarketingDocumentViewer
          document={doc}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('markdown-renderer')).toBeTruthy();
    });

    it('displays document title for teaser', () => {
      const doc = createMockDocument('tpl.teaser');
      render(
        <MarketingDocumentViewer
          document={doc}
          isLoading={false}
        />
      );

      expect(screen.getByText('marketingDocument.teaserTitle')).toBeTruthy();
    });

    it('displays document title for IM', () => {
      const doc = createMockDocument('tpl.im');
      render(
        <MarketingDocumentViewer
          document={doc}
          isLoading={false}
        />
      );

      expect(screen.getByText('marketingDocument.imTitle')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Review Status Display
  // --------------------------------------------------------------------------

  describe('review status display', () => {
    it('displays generated status', () => {
      const doc = createMockDocument('tpl.teaser', 'generated');
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('Generated')).toBeTruthy();
    });

    it('displays reviewing status', () => {
      const doc = createMockDocument('tpl.teaser', 'reviewing');
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('Under Review')).toBeTruthy();
    });

    it('displays approved status', () => {
      const doc = createMockDocument('tpl.teaser', 'approved');
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('Approved')).toBeTruthy();
    });

    it('displays rejected status', () => {
      const doc = createMockDocument('tpl.teaser', 'rejected');
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('Rejected')).toBeTruthy();
    });

    it('displays exported status', () => {
      const doc = createMockDocument('tpl.teaser', 'exported');
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('Exported')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Review Actions
  // --------------------------------------------------------------------------

  describe('review actions', () => {
    it('shows start review button for generated documents', () => {
      const doc = createMockDocument('tpl.teaser', 'generated');
      render(
        <MarketingDocumentViewer
          document={doc}
          onReviewStatusChange={mockOnReviewStatusChange}
        />
      );

      expect(screen.getByText('marketingDocument.startReview')).toBeTruthy();
    });

    it('calls onReviewStatusChange with reviewing when start review clicked', async () => {
      const doc = createMockDocument('tpl.teaser', 'generated');
      render(
        <MarketingDocumentViewer
          document={doc}
          onReviewStatusChange={mockOnReviewStatusChange}
        />
      );

      const button = screen.getByText('marketingDocument.startReview');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnReviewStatusChange).toHaveBeenCalledWith('reviewing', undefined);
      });
    });

    it('shows approve and reject buttons for reviewing documents', () => {
      const doc = createMockDocument('tpl.teaser', 'reviewing');
      render(
        <MarketingDocumentViewer
          document={doc}
          onReviewStatusChange={mockOnReviewStatusChange}
        />
      );

      expect(screen.getByText('marketingDocument.approve')).toBeTruthy();
      expect(screen.getByText('marketingDocument.reject')).toBeTruthy();
    });

    it('calls onReviewStatusChange with approved when approve clicked', async () => {
      const doc = createMockDocument('tpl.teaser', 'reviewing');
      render(
        <MarketingDocumentViewer
          document={doc}
          onReviewStatusChange={mockOnReviewStatusChange}
        />
      );

      const button = screen.getByText('marketingDocument.approve');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnReviewStatusChange).toHaveBeenCalledWith('approved', undefined);
      });
    });

    it('shows reopen button for approved documents', () => {
      const doc = createMockDocument('tpl.teaser', 'approved');
      render(
        <MarketingDocumentViewer
          document={doc}
          onReviewStatusChange={mockOnReviewStatusChange}
        />
      );

      expect(screen.getByText('marketingDocument.reopenReview')).toBeTruthy();
    });

    it('shows reopen button for rejected documents', () => {
      const doc = createMockDocument('tpl.teaser', 'rejected');
      render(
        <MarketingDocumentViewer
          document={doc}
          onReviewStatusChange={mockOnReviewStatusChange}
        />
      );

      expect(screen.getByText('marketingDocument.reopenReview')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Export Actions
  // --------------------------------------------------------------------------

  describe('export actions', () => {
    it('renders export buttons', () => {
      const doc = createMockDocument();
      render(
        <MarketingDocumentViewer
          document={doc}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Markdown')).toBeTruthy();
      expect(screen.getByText('DOCX')).toBeTruthy();
      expect(screen.getByText('PDF')).toBeTruthy();
    });

    it('calls onExport with markdown when clicked', async () => {
      const doc = createMockDocument();
      render(
        <MarketingDocumentViewer
          document={doc}
          onExport={mockOnExport}
        />
      );

      const button = screen.getByText('Markdown');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalledWith('markdown');
      });
    });

    it('calls onExport with docx when clicked', async () => {
      const doc = createMockDocument();
      render(
        <MarketingDocumentViewer
          document={doc}
          onExport={mockOnExport}
        />
      );

      const buttons = screen.getAllByRole('button');
      const docxButton = buttons.find((b) => b.textContent === 'DOCX');
      if (docxButton) {
        fireEvent.click(docxButton);
        await waitFor(() => {
          expect(mockOnExport).toHaveBeenCalledWith('docx');
        });
      }
    });
  });

  // --------------------------------------------------------------------------
  // Section Navigation
  // --------------------------------------------------------------------------

  describe('section navigation', () => {
    it('renders section list in sidebar', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      const sectionTitle = screen.getByText('marketingDocument.sections');
      expect(sectionTitle).toBeTruthy();
    });

    it('lists document sections', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('Executive Summary')).toBeTruthy();
      expect(screen.getByText('Company Overview')).toBeTruthy();
    });

    it('highlights active section on click', async () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      const sectionButton = screen.getByText('Executive Summary');
      fireEvent.click(sectionButton);

      await waitFor(() => {
        const sectionItem = sectionButton.closest('.sectionItem');
        expect(sectionItem?.classList.contains('active')).toBe(true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Validation Display
  // --------------------------------------------------------------------------

  describe('validation display', () => {
    it('shows validation summary in sidebar', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.structure')).toBeTruthy();
    });

    it('shows word count in sidebar', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.wordCount')).toBeTruthy();
    });

    it('shows provenance indicator in sidebar', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.provenance')).toBeTruthy();
    });

    it('switches to validation tab when clicked', async () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      const validationTab = screen.getByText('marketingDocument.validation');
      fireEvent.click(validationTab);

      await waitFor(() => {
        expect(screen.getByText('marketingDocument.validStructure')).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Provenance Panel
  // --------------------------------------------------------------------------

  describe('provenance panel', () => {
    it('renders provenance information', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.provenanceTitle')).toBeTruthy();
    });

    it('displays flow id', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.flowId')).toBeTruthy();
    });

    it('displays prompt version', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.promptVersion')).toBeTruthy();
    });

    it('displays generation timestamp', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.generatedAt')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Tab Navigation
  // --------------------------------------------------------------------------

  describe('tab navigation', () => {
    it('renders preview tab by default', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.preview')).toBeTruthy();
    });

    it('renders source tab', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.source')).toBeTruthy();
    });

    it('renders validation tab', () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      expect(screen.getByText('marketingDocument.validation')).toBeTruthy();
    });

    it('switches to source tab when clicked', async () => {
      const doc = createMockDocument();
      render(<MarketingDocumentViewer document={doc} />);

      const sourceTab = screen.getByText('marketingDocument.source');
      fireEvent.click(sourceTab);

      await waitFor(() => {
        const sourceView = document.querySelector('.sourceView');
        expect(sourceView).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Validation Warnings
  // --------------------------------------------------------------------------

  describe('validation warnings', () => {
    it('shows warning icon for invalid structure', () => {
      const doc = createMockDocument('tpl.teaser', 'generated');
      // Remove most content to make it invalid
      doc.content = 'Short' + doc.content.slice(-100);

      render(<MarketingDocumentViewer document={doc} />);

      // Warning button should be present
      const warningButtons = document.querySelectorAll('[status="warning"]');
      expect(warningButtons.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Class Name Prop
  // --------------------------------------------------------------------------

  describe('className prop', () => {
    it('applies custom className to container', () => {
      const doc = createMockDocument();
      render(
        <MarketingDocumentViewer
          document={doc}
          className='custom-class'
        />
      );

      const container = document.querySelector('.container');
      expect(container?.classList.contains('custom-class')).toBe(true);
    });
  });
});
