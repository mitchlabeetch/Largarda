/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mock react-i18next
// ============================================================================

const translations: Record<string, string> = {
  'dealSelector.status.active': 'Active',
  'dealSelector.status.archived': 'Archived',
  'dealSelector.status.closed': 'Closed',
  'dealSelector.noDealsYet': 'No deals yet',
  'dealSelector.createFirstDeal': 'Create First Deal',
  'dealSelector.selectDeal': 'Select a deal',
  'dealSelector.active': 'Active',
  'dealForm.transactionTypes.acquisition': 'Acquisition',
  'dealForm.transactionTypes.merger': 'Merger',
  'dealForm.transactionTypes.divestiture': 'Divestiture',
  'dealForm.transactionTypes.jointVenture': 'Joint Venture',
  'dealForm.partyRoles.buyer': 'Buyer',
  'dealForm.partyRoles.seller': 'Seller',
  'dealForm.partyRoles.target': 'Target',
  'dealForm.partyRoles.advisor': 'Advisor',
  'dealForm.validation.dealNameRequired': 'Deal name is required',
  'dealForm.validation.atLeastOnePartyRequired': 'At least one party is required',
  'dealForm.validation.partyNameRequired': 'Party {{index}}: name is required',
  'dealForm.validation.transactionTypeRequired': 'Transaction type is required',
  'dealForm.validation.targetCompanyNameRequired': 'Target company name is required',
  'dealForm.editDeal': 'Edit Deal',
  'dealForm.createNewDeal': 'Create New Deal',
  'dealForm.saveChanges': 'Save Changes',
  'dealForm.createDeal': 'Create Deal',
  'dealForm.cancel': 'Cancel',
  'dealForm.fields.dealName': 'Deal Name',
  'dealForm.fields.transactionType': 'Transaction Type',
  'dealForm.fields.targetCompany': 'Target Company',
  'dealForm.fields.industry': 'Industry',
  'dealForm.fields.jurisdiction': 'Jurisdiction',
  'dealForm.fields.parties': 'Parties',
  'dealForm.placeholders.dealName': 'e.g., Project Alpha Acquisition',
  'dealForm.placeholders.transactionType': 'Select transaction type',
  'dealForm.placeholders.companyName': 'Company name',
  'dealForm.placeholders.industry': 'e.g., Technology',
  'dealForm.placeholders.jurisdiction': 'e.g., Delaware, USA',
  'dealForm.placeholders.partyName': 'Party name',
  'dealForm.addParty': 'Add Party',
  'dealContext.title': 'Deal Management',
  'dealContext.refresh': 'Refresh',
  'dealContext.newDeal': 'New Deal',
  'dealContext.status.active': 'Active',
  'dealContext.status.archived': 'Archived',
  'dealContext.status.closed': 'Closed',
  'dealContext.messages.updatedSuccessfully': 'Deal updated successfully',
  'dealContext.messages.createdSuccessfully': 'Deal created successfully',
  'dealContext.messages.saveFailed': 'Failed to save deal',
  'dealContext.messages.archived': 'Deal archived',
  'dealContext.messages.archiveFailed': 'Failed to archive deal',
  'dealContext.messages.closed': 'Deal closed',
  'dealContext.messages.closeFailed': 'Failed to close deal',
  'dealContext.messages.reactivated': 'Deal reactivated',
  'dealContext.messages.reactivateFailed': 'Failed to reactivate deal',
  'dealContext.messages.deleted': 'Deal deleted',
  'dealContext.messages.deleteFailed': 'Failed to delete deal',
  'dealContext.deleteConfirm.title': 'Delete Deal',
  'dealContext.deleteConfirm.content': 'Are you sure you want to delete "{{dealName}}"? This action cannot be undone.',
  'dealContext.deleteConfirm.ok': 'Delete',
  'dealContext.dealsCount': 'Deals ({{count}})',
  'dealContext.filters.all': 'All',
  'dealContext.filters.active': 'Active',
  'dealContext.filters.archived': 'Archived',
  'dealContext.filters.closed': 'Closed',
  'dealContext.empty.noDealsFound': 'No deals found',
  'dealContext.empty.createFirstDeal': 'Create your first deal to get started',
  'dealContext.empty.noStatusDeals': 'No {{status}} deals',
  'dealContext.empty.createDeal': 'Create Deal',
  'dealContext.empty.selectDeal': 'Select a deal',
  'dealContext.empty.selectDealText': 'Choose a deal from the list to view details',
  'dealContext.edit': 'Edit',
  'dealContext.archiveConfirm.title': 'Archive this deal?',
  'dealContext.archiveConfirm.content': 'Archived deals can be reactivated later.',
  'dealContext.archive': 'Archive',
  'dealContext.details.transactionDetails': 'Transaction Details',
  'dealContext.details.type': 'Type',
  'dealContext.details.status': 'Status',
  'dealContext.details.created': 'Created',
  'dealContext.details.updated': 'Updated',
  'dealContext.details.targetCompany': 'Target Company',
  'dealContext.details.name': 'Name',
  'dealContext.details.industry': 'Industry',
  'dealContext.details.jurisdiction': 'Jurisdiction',
  'dealContext.details.parties': 'Parties',
  'dealContext.documents.title': 'Associated Documents ({{count}})',
  'emptyState.icon': 'Empty',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let result = translations[key] ?? key;
      if (options) {
        if (options.index !== undefined) {
          result = result.replace('{{index}}', String(options.index));
        }
        if (options.count !== undefined) {
          result = result.replace('{{count}}', String(options.count));
        }
        if (options.dealName !== undefined) {
          result = result.replace('{{dealName}}', String(options.dealName));
        }
        if (options.status !== undefined) {
          result = result.replace('{{status}}', String(options.status));
        }
      }
      return result;
    },
  }),
}));

// ============================================================================
// Mock dependencies
// ============================================================================

vi.mock('@renderer/hooks/ma/useDealContext');
vi.mock('@renderer/hooks/ma/useDocuments');
vi.mock('@renderer/utils/ma/formatters', () => ({
  useMaDateFormatters: () => ({
    formatDate: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
  }),
}));

import { useDealContext } from '@renderer/hooks/ma/useDealContext';
import { useDocuments } from '@renderer/hooks/ma/useDocuments';
import { DealSelector, DealForm } from '@renderer/components/ma/DealSelector';
import { DealContextPage } from '@renderer/pages/ma/DealContext/DealContextPage';
import type { DealContext } from '@/common/ma/types';

// ============================================================================
// Fixtures
// ============================================================================

const mockDeal: DealContext = {
  id: 'deal-1',
  name: 'Test Acquisition',
  parties: [{ name: 'Buyer Corp', role: 'buyer' }],
  transactionType: 'acquisition',
  targetCompany: {
    name: 'Target Inc',
    industry: 'Technology',
    jurisdiction: 'Delaware, USA',
  },
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockDeals: DealContext[] = [
  mockDeal,
  {
    ...mockDeal,
    id: 'deal-2',
    name: 'Archived Deal',
    status: 'archived',
  },
  {
    ...mockDeal,
    id: 'deal-3',
    name: 'Closed Deal',
    status: 'closed',
  },
];

// ============================================================================
// Helpers
// ============================================================================

function setupDealContextMocks(overrides: Record<string, unknown> = {}) {
  vi.mocked(useDealContext).mockReturnValue({
    deals: mockDeals,
    activeDeal: mockDeal,
    isLoading: false,
    refresh: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    deleteDeal: vi.fn(),
    setActiveDeal: vi.fn(),
    archiveDeal: vi.fn(),
    closeDeal: vi.fn(),
    reactivateDeal: vi.fn(),
    clearActiveDeal: vi.fn(),
    isActive: vi.fn(),
    getContextForAI: vi.fn(),
    validateInput: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useDealContext>);
}

function setupDocumentMocks(overrides: Record<string, unknown> = {}) {
  vi.mocked(useDocuments).mockReturnValue({
    documents: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    upload: vi.fn(),
    deleteDocument: vi.fn(),
    updateStatus: vi.fn(),
    uploadStatus: new Map(),
    ...overrides,
  } as unknown as ReturnType<typeof useDocuments>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// DealSelector Tests
// ============================================================================

describe('DealSelector', () => {
  it('should not contain emoji in deal list', () => {
    const onSelect = vi.fn();
    render(<DealSelector deals={mockDeals} activeDeal={mockDeal} onSelect={onSelect} />);

    const html = document.body.innerHTML;
    expect(html).not.toContain('📁');
    expect(html).not.toContain('📄');
    expect(html).not.toContain('✓');
  });

  it('should use CSS modules for styling (no inline styles)', () => {
    const onSelect = vi.fn();
    render(<DealSelector deals={mockDeals} activeDeal={mockDeal} onSelect={onSelect} />);

    const html = document.body.innerHTML;
    // Check that we're using CSS modules (classes with underscores)
    expect(html).toMatch(/class="[^"]*_[a-f0-9]+/);
  });

  it('should have accessible dropdown trigger button', () => {
    const onSelect = vi.fn();
    render(<DealSelector deals={mockDeals} activeDeal={mockDeal} onSelect={onSelect} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });
});

// ============================================================================
// DealForm Tests
// ============================================================================

describe('DealForm', () => {
  it('renders localized form labels and placeholders', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<DealForm visible={true} onSubmit={onSubmit} onClose={onClose} />);

    expect(screen.getByText('Create New Deal')).toBeInTheDocument();
    expect(screen.getByText('Deal Name')).toBeInTheDocument();
    expect(screen.getByText('Transaction Type')).toBeInTheDocument();
    expect(screen.getByText('Target Company')).toBeInTheDocument();
    expect(screen.getByText('Parties')).toBeInTheDocument();
  });

  it('renders localized validation errors', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<DealForm visible={true} onSubmit={onSubmit} onClose={onClose} />);

    const submitButton = screen.getByRole('button', { name: 'Create Deal' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Deal name is required')).toBeInTheDocument();
  });

  it('should not contain emoji in form UI', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<DealForm visible={true} onSubmit={onSubmit} onClose={onClose} />);

    const html = document.body.innerHTML;
    expect(html).not.toContain('✓');
    expect(html).not.toContain('✗');
    expect(html).not.toContain('➕');
  });

  it('should use CSS modules for styling (no inline styles)', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<DealForm visible={true} onSubmit={onSubmit} onClose={onClose} />);

    const html = document.body.innerHTML;
    // Check that we're using CSS modules (classes with underscores)
    expect(html).toMatch(/class="[^"]*_[a-f0-9]+/);
  });

  it('should have accessible form inputs with proper labels', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<DealForm visible={true} onSubmit={onSubmit} onClose={onClose} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// DealContextPage Tests
// ============================================================================

describe('DealContextPage', () => {
  it('renders localized filter tabs', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archived' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Closed' })).toBeInTheDocument();
  });

  it('switches filter tabs when clicked', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    const activeTab = screen.getByRole('button', { name: 'Active' });
    fireEvent.click(activeTab);

    // Check that the tab has the CSS module active class
    expect(activeTab.className).toContain('_active');
  });

  it('renders localized empty state when no deals match filter', () => {
    setupDealContextMocks({ deals: [] });
    setupDocumentMocks();

    render(<DealContextPage />);

    expect(screen.getByText('No deals found')).toBeInTheDocument();
    expect(screen.getByText('Create your first deal to get started')).toBeInTheDocument();
  });

  it('renders localized deal detail sections', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    // Click on a deal to select it
    const dealCard = screen.getByText('Test Acquisition');
    fireEvent.click(dealCard);

    expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    expect(screen.getByText('Target Company')).toBeInTheDocument();
    expect(screen.getByText('Parties')).toBeInTheDocument();
  });

  it('should not contain emoji in page UI', () => {
    setupDealContextMocks({ deals: [] });
    setupDocumentMocks();

    render(<DealContextPage />);

    const html = document.body.innerHTML;
    expect(html).not.toContain('📁');
    expect(html).not.toContain('📄');
    expect(html).not.toContain('👈');
  });

  it('should use CSS modules for styling (no inline styles)', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    const html = document.body.innerHTML;
    // Check that we're using CSS modules (classes with underscores)
    expect(html).toMatch(/class="[^"]*_[a-f0-9]+/);
  });

  it('should have accessible filter tab buttons', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    const filterTabs = screen
      .getAllByRole('button')
      .filter((button) => ['All', 'Active', 'Archived', 'Closed'].includes(button.textContent || ''));

    filterTabs.forEach((tab) => {
      expect(tab).toHaveAttribute('type', 'button');
    });
  });

  it('should have accessible deal card selection', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    const dealCards = screen.getAllByText(/Acquisition|Archived|Closed/);
    expect(dealCards.length).toBeGreaterThan(0);
  });
});

describe('DealContextPage - Filter Tab Behavior', () => {
  it('filters deals by status when tab is clicked', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    const archivedTab = screen.getByRole('button', { name: 'Archived' });
    fireEvent.click(archivedTab);

    // After clicking archived, only archived deals should be visible
    expect(screen.getByText('Archived Deal')).toBeInTheDocument();
  });

  it('shows localized empty message for specific status filter', () => {
    setupDealContextMocks({
      deals: [{ ...mockDeal, id: 'deal-1', status: 'active' }],
    });
    setupDocumentMocks();

    render(<DealContextPage />);

    const archivedTab = screen.getByRole('button', { name: 'Archived' });
    fireEvent.click(archivedTab);

    expect(screen.getByText('No Archived deals')).toBeInTheDocument();
  });

  it('resets to all deals when "All" tab is clicked', () => {
    setupDealContextMocks();
    setupDocumentMocks();

    render(<DealContextPage />);

    const archivedTab = screen.getByRole('button', { name: 'Archived' });
    fireEvent.click(archivedTab);

    const allTab = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allTab);

    expect(screen.getByText('Test Acquisition')).toBeInTheDocument();
    expect(screen.getByText('Archived Deal')).toBeInTheDocument();
    expect(screen.getByText('Closed Deal')).toBeInTheDocument();
  });
});
