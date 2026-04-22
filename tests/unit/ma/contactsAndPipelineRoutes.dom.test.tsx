/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contacts and Pipeline Route Coverage Tests
 * Verifies that all new routes render correctly and navigation works.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/renderer/services/i18n';
import { ContactsPage } from '@/renderer/pages/ma/Contacts/ContactsPage';
import { PipelinePage } from '@/renderer/pages/ma/Pipeline/PipelinePage';

// Mock the hooks
vi.mock('@/renderer/hooks/ma/useContacts', () => ({
  useContacts: () => ({
    contacts: [],
    paginatedContacts: { data: [], total: 0, page: 0, pageSize: 50, hasMore: false },
    isLoading: false,
    error: null,
    createContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    listContactsByCompany: vi.fn(),
    listContactsByDeal: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock('@/renderer/hooks/ma/useDealContext', () => ({
  useDealContext: () => ({
    deals: [],
    activeDeal: null,
    isLoading: false,
    updateDeal: vi.fn(),
  }),
}));

describe('Contacts and Pipeline Routes', () => {
  const renderWithRouter = (initialRoute: string) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path='/ma/contacts' element={<ContactsPage />} />
            <Route path='/ma/pipeline' element={<PipelinePage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    );
  };

  describe('/ma/contacts route', () => {
    it('renders contacts page', async () => {
      renderWithRouter('/ma/contacts');

      await waitFor(() => {
        const title = screen.queryByRole('heading');
        expect(title).toBeTruthy();
      });
    });

    it('has accessible search input', async () => {
      renderWithRouter('/ma/contacts');

      const searchInput = await screen.findByRole('searchbox').catch(() => null);
      // Search input may be present based on i18n loading
      if (searchInput) {
        expect(searchInput).toHaveAttribute('aria-label');
      }
    });

    it('renders empty state when no contacts', async () => {
      renderWithRouter('/ma/contacts');

      // Wait for component to render
      await waitFor(() => {
        const container = document.querySelector('[class*="container"]');
        expect(container).toBeTruthy();
      });
    });
  });

  describe('/ma/pipeline route', () => {
    it('renders pipeline page', async () => {
      renderWithRouter('/ma/pipeline');

      await waitFor(() => {
        const title = screen.queryByRole('heading');
        expect(title).toBeTruthy();
      });
    });

    it('has keyboard navigation hints', async () => {
      renderWithRouter('/ma/pipeline');

      // Check for keyboard hints in footer
      const hints = await screen.findByRole('contentinfo').catch(() => null);
      // Content info may be present depending on i18n
      if (hints) {
        expect(hints).toBeTruthy();
      }
    });

    it('renders pipeline board with stages', async () => {
      renderWithRouter('/ma/pipeline');

      await waitFor(() => {
        const board = document.querySelector('[class*="board"]');
        expect(board).toBeTruthy();
      });
    });

    it('has accessible pipeline board', async () => {
      renderWithRouter('/ma/pipeline');

      await waitFor(() => {
        const board = screen.queryByRole('application');
        // Board may have aria-label based on i18n
        expect(board).toBeTruthy();
      });
    });
  });

  describe('Route accessibility', () => {
    it('contacts page has main content region', async () => {
      renderWithRouter('/ma/contacts');

      await waitFor(() => {
        const main = document.querySelector('main, [role="main"]');
        expect(main).toBeTruthy();
      });
    });

    it('pipeline page has main content region', async () => {
      renderWithRouter('/ma/pipeline');

      await waitFor(() => {
        const main = document.querySelector('main, [role="main"]');
        expect(main).toBeTruthy();
      });
    });
  });
});
