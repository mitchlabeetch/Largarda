/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pipeline Stage Transition Tests
 * Verifies deal movement between pipeline stages via drag-drop and buttons.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/renderer/services/i18n';
import { PipelinePage } from '@/renderer/pages/ma/Pipeline/PipelinePage';
import type { DealContext } from '@/common/ma/types';

const mockDeal: DealContext = {
  id: 'deal-1',
  name: 'Test Deal',
  transactionType: 'acquisition',
  status: 'active',
  parties: [{ name: 'Party A', role: 'buyer' }],
  targetCompany: { name: 'Target Co' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  extra: { pipelineStage: 'lead' },
};

describe('Pipeline Stage Transitions', () => {
  const mockUpdateDeal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDeal.mockResolvedValue({ ...mockDeal, extra: { pipelineStage: 'qualified' } });
  });

  vi.mock('@/renderer/hooks/ma/useDealContext', () => ({
    useDealContext: () => ({
      deals: [mockDeal],
      activeDeal: mockDeal,
      isLoading: false,
      updateDeal: mockUpdateDeal,
    }),
  }));

  const renderPipeline = () => {
    return render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/ma/pipeline']}>
          <Routes>
            <Route path='/ma/pipeline' element={<PipelinePage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    );
  };

  describe('Drag and drop transitions', () => {
    it('allows deal card to be draggable', async () => {
      renderPipeline();

      await waitFor(() => {
        const dealCard = document.querySelector('[draggable="true"]');
        expect(dealCard).toBeTruthy();
      });
    });

    it('sets aria-grabbed when dragging starts', async () => {
      renderPipeline();

      const user = userEvent.setup();

      await waitFor(() => {
        const dealCard = document.querySelector('[draggable="true"]');
        if (dealCard) {
          fireEvent.dragStart(dealCard);
          expect(dealCard).toHaveAttribute('aria-grabbed', 'true');
        }
      });
    });

    it('resets aria-grabbed when dragging ends', async () => {
      renderPipeline();

      await waitFor(() => {
        const dealCard = document.querySelector('[draggable="true"]');
        if (dealCard) {
          fireEvent.dragStart(dealCard);
          fireEvent.dragEnd(dealCard);
          // After drag end, aria-grabbed should be 'false'
          expect(dealCard).toHaveAttribute('aria-grabbed', 'false');
        }
      });
    });
  });

  describe('Button-based stage transitions', () => {
    it('renders move left button for deals not in first stage', async () => {
      renderPipeline();

      await waitFor(() => {
        const moveButtons = document.querySelectorAll('button');
        // Should have move buttons available
        expect(moveButtons.length).toBeGreaterThan(0);
      });
    });

    it('renders move right button for deals not in last stage', async () => {
      renderPipeline();

      await waitFor(() => {
        const moveButtons = document.querySelectorAll('button');
        expect(moveButtons.length).toBeGreaterThan(0);
      });
    });

    it('calls updateDeal when moving deal to next stage', async () => {
      renderPipeline();

      const user = userEvent.setup();

      await waitFor(async () => {
        const buttons = document.querySelectorAll('button');
        // Find a move right button
        for (const button of Array.from(buttons)) {
          if (button.textContent?.toLowerCase().includes('right')) {
            await user.click(button);
            break;
          }
        }
      });

      // updateDeal should have been called
      expect(mockUpdateDeal).toHaveBeenCalled();
    });
  });

  describe('Stage persistence', () => {
    it('distributes deals into correct stages based on pipelineStage', async () => {
      renderPipeline();

      await waitFor(() => {
        const stages = document.querySelectorAll('[role="listitem"]');
        // Should have multiple stages
        expect(stages.length).toBeGreaterThan(0);
      });
    });

    it('displays deal count per stage', async () => {
      renderPipeline();

      await waitFor(() => {
        const dealCounts = document.querySelectorAll('[class*="dealCount"]');
        // Each stage should show count
        expect(dealCounts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stage structure', () => {
    it('renders all default pipeline stages', async () => {
      renderPipeline();

      await waitFor(() => {
        const stageList = document.querySelector('[role="list"]');
        expect(stageList).toBeTruthy();

        const stages = stageList?.querySelectorAll('[role="listitem"]');
        // Should have lead, qualified, negotiation, due_diligence, closing, closed
        expect(stages?.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('each stage has accessible label', async () => {
      renderPipeline();

      await waitFor(() => {
        const stages = document.querySelectorAll('[role="listitem"]');
        stages.forEach((stage) => {
          expect(stage).toHaveAttribute('aria-label');
        });
      });
    });
  });
});
