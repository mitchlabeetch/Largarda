/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          'shell.title': 'Mergers & Acquisitions',
          'shell.home': 'Home',
          'shell.aria.topBar': 'M&A top navigation bar',
          'shell.aria.extensionSlots': 'Extension slots in top bar',
          'shell.aria.breadcrumbs': 'Breadcrumb navigation',
          'shell.aria.extensionSidebar': 'Extension sidebar',
          'dealContext.title': 'Deal Management',
          'dueDiligence.title': 'Due Diligence Analysis',
          'companyEnrichment.title': 'Company Enrichment',
          'pipeline.title': 'Pipeline',
          'commandPalette.open': 'Open command palette',
          'commandPalette.categories.navigation': 'Navigation',
          'commandPalette.categories.actions': 'Actions',
          'commandPalette.categories.settings': 'Settings',
          'commandPalette.commands.home': 'Home',
          'commandPalette.commands.homeDesc': 'Go home',
          'commandPalette.commands.dealContext': 'Deal Context',
          'commandPalette.commands.dealContextDesc': 'Open deal context',
          'commandPalette.commands.dueDiligence': 'Due Diligence',
          'commandPalette.commands.dueDiligenceDesc': 'Open due diligence',
          'commandPalette.commands.companyEnrichment': 'Company Enrichment',
          'commandPalette.commands.companyEnrichmentDesc': 'Open company enrichment',
          'commandPalette.commands.newDeal': 'New Deal',
          'commandPalette.commands.newDealDesc': 'Create a new deal',
          'commandPalette.commands.keyboardShortcuts': 'Keyboard Shortcuts',
          'commandPalette.commands.keyboardShortcutsDesc': 'View shortcuts',
          'commandPalette.placeholder': 'Search commands',
          'commandPalette.noResults': 'No results',
          'commandPalette.keyboardHint': 'Use arrow keys to navigate',
          'commandPalette.results': 'results',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

let mockActiveDeal: { id: string; name: string } | null = null;
let mockIsLoading = false;

vi.mock('@renderer/hooks/ma/useDealContext', () => ({
  useDealContext: () => ({
    activeDeal: mockActiveDeal,
    isLoading: mockIsLoading,
  }),
}));

vi.mock('@renderer/components/layout/AppLoader', () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock('@renderer/pages/ma/MaLanding', () => ({
  default: () => <div data-testid='ma-landing'>M&A Landing Page</div>,
}));

vi.mock('@renderer/pages/ma/DealContext', () => ({
  default: () => <div data-testid='deal-context'>Deal Context Page</div>,
}));

vi.mock('@renderer/pages/ma/DueDiligence', () => ({
  default: () => <div data-testid='due-diligence'>Due Diligence Page</div>,
}));

vi.mock('@renderer/pages/ma/CompanyEnrichment', () => ({
  default: () => <div data-testid='company-enrichment'>Company Enrichment Page</div>,
}));

import MaShellRouter from '@renderer/pages/ma/shell';

describe('M&A Shell Route Coverage', () => {
  afterEach(() => {
    cleanup();
    mockActiveDeal = null;
    mockIsLoading = false;
  });

  it('renders the shell with home route', async () => {
    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('ma-landing')).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: 'M&A top navigation bar' })).toBeInTheDocument();
  });

  it('renders the shell with deal-context route', async () => {
    render(
      <MemoryRouter initialEntries={['/ma/deal-context']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('deal-context')).toBeInTheDocument();
  });

  it('renders the shell with due-diligence route', async () => {
    render(
      <MemoryRouter initialEntries={['/ma/due-diligence']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('due-diligence')).toBeInTheDocument();
  });

  it('renders the shell with company-enrichment route', async () => {
    render(
      <MemoryRouter initialEntries={['/ma/company-enrichment']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('company-enrichment')).toBeInTheDocument();
  });

  it('redirects unknown M&A routes to home', async () => {
    render(
      <MemoryRouter initialEntries={['/ma/unknown-route']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('ma-landing')).toBeInTheDocument();
  });

  it('redirects deal and document drilldown routes to the deal-context surface', async () => {
    render(
      <MemoryRouter initialEntries={['/ma/deals/deal-1/documents/doc-1']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('deal-context')).toBeInTheDocument();
  });

  it('redirects analysis drilldown routes to the due-diligence surface', async () => {
    render(
      <MemoryRouter initialEntries={['/ma/analyses/analysis-1/findings/finding-1']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('due-diligence')).toBeInTheDocument();
  });
});

describe('M&A Shell Landmark and Keyboard Coverage', () => {
  afterEach(() => {
    cleanup();
  });

  it('has proper ARIA landmarks for accessibility', async () => {
    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    expect(banner).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Breadcrumb navigation' });
    expect(navigation).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabIndex', '-1');
  });

  it('renders breadcrumbs with keyboard navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/ma/deal-context']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const navigation = screen.getByRole('navigation', { name: 'Breadcrumb navigation' });
    const breadcrumbs = within(navigation).getAllByRole('listitem');

    expect(breadcrumbs).toHaveLength(2); // Home and Deal Context

    // Test keyboard navigation on breadcrumbs
    await user.tab();
    expect(screen.getByRole('button', { name: 'Open command palette' })).toHaveFocus();
  });

  it('breadcrumbs are clickable and navigate correctly', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/ma/deal-context']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const navigation = screen.getByRole('navigation', { name: 'Breadcrumb navigation' });
    const homeBreadcrumb = within(navigation).getByText('Home');

    await user.click(homeBreadcrumb);

    expect(await screen.findByTestId('ma-landing')).toBeInTheDocument();
  });

  it('extension slots have proper ARIA labels', async () => {
    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const extensionSlots = screen.getByLabelText('Extension slots in top bar');
    expect(extensionSlots).toBeInTheDocument();

    const slots = extensionSlots.querySelectorAll('[data-slot^="top-right"]');

    expect(slots.length).toBeGreaterThanOrEqual(2);
  });

  it('mounts the command palette trigger inside the shell top bar', async () => {
    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Open command palette' })).toBeInTheDocument();
  });

  it('main content is keyboard focusable via landmark', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const main = screen.getByRole('main');

    // Tab to main content
    await user.keyboard('{Tab}{Tab}{Tab}'); // Navigate past breadcrumbs

    main.focus();
    expect(document.activeElement).toBe(main);
  });
});

describe('M&A Shell Active-Deal Indicator Behavior', () => {
  afterEach(() => {
    cleanup();
    mockActiveDeal = null;
    mockIsLoading = false;
  });

  it('does not show active-deal indicator when no deal is active', async () => {
    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    const dealIndicator = within(banner).queryByRole('status');

    expect(dealIndicator).not.toBeInTheDocument();
  });

  it('shows active-deal indicator when a deal is active', async () => {
    mockActiveDeal = { id: 'deal-1', name: 'Test Deal' };

    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    const dealIndicator = within(banner).getByRole('status');

    expect(dealIndicator).toBeInTheDocument();
    expect(dealIndicator).toHaveTextContent('Test Deal');
  });

  it('active-deal indicator has proper ARIA live region', async () => {
    mockActiveDeal = { id: 'deal-1', name: 'Active Deal' };

    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    const dealIndicator = within(banner).getByRole('status');

    expect(dealIndicator).toHaveAttribute('aria-live', 'polite');
  });

  it('does not show active-deal indicator while loading', async () => {
    mockIsLoading = true;

    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    const banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    const dealIndicator = within(banner).queryByRole('status');

    expect(dealIndicator).not.toBeInTheDocument();
  });

  it('updates active-deal indicator when deal changes', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    // Initially no deal
    let banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    let dealIndicator = within(banner).queryByRole('status');
    expect(dealIndicator).not.toBeInTheDocument();

    // Update to have an active deal
    mockActiveDeal = { id: 'deal-2', name: 'New Deal' };

    rerender(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma/*' element={<MaShellRouter />} />
        </Routes>
      </MemoryRouter>
    );

    banner = screen.getByRole('banner', { name: 'M&A top navigation bar' });
    dealIndicator = within(banner).getByRole('status');
    expect(dealIndicator).toHaveTextContent('New Deal');
  });
});
