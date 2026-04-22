/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CommandPalette, {
  type CommandPaletteItem,
  type CommandPaletteCategory,
} from '../../../../../src/renderer/components/ma/CommandPalette';
import * as React from 'react';

// Mock i18n at module level
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'commandPalette.placeholder': 'Search commands...',
        'commandPalette.noResults': 'No results found',
        'commandPalette.keyboardHint': 'Use arrow keys to navigate, Enter to select',
        'commandPalette.results': 'results',
      };
      return translations[key] || key;
    },
  }),
}));

describe('CommandPalette', () => {
  const mockCategories: CommandPaletteCategory[] = [
    {
      id: 'navigation',
      label: 'Navigation',
      items: [
        {
          id: 'nav-home',
          label: 'Home',
          description: 'Go to home page',
          action: vi.fn(),
          category: 'Navigation',
        },
        {
          id: 'nav-deal-context',
          label: 'Deal Context',
          description: 'View deal context',
          action: vi.fn(),
          category: 'Navigation',
        },
      ],
    },
    {
      id: 'actions',
      label: 'Actions',
      items: [
        {
          id: 'action-new-deal',
          label: 'New Deal',
          description: 'Create a new deal',
          action: vi.fn(),
          category: 'Actions',
        },
      ],
    },
  ];

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('open/close keyboard flow', () => {
    it('should open when isOpen is true', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('should call onClose when Escape key is pressed', async () => {
      const onClose = vi.fn();
      renderWithRouter(<CommandPalette isOpen={true} onClose={onClose} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should focus input when opened', async () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      await waitFor(() => {
        const input = document.querySelector('.arco-input') as HTMLInputElement;
        expect(input).toHaveFocus();
      });
    });
  });

  describe('result filtering', () => {
    it('should show all items when search query is empty', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      expect(screen.getByText('Home')).toBeVisible();
      expect(screen.getByText('Deal Context')).toBeVisible();
      expect(screen.getByText('New Deal')).toBeVisible();
    });

    it('should filter items by label', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Home' } });

      expect(screen.getByText('Home')).toBeVisible();
      expect(screen.queryByText('Deal Context')).not.toBeInTheDocument();
      expect(screen.queryByText('New Deal')).not.toBeInTheDocument();
    });

    it('should filter items by description', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'context' } });

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.getByText('Deal Context')).toBeVisible();
      expect(screen.queryByText('New Deal')).not.toBeInTheDocument();
    });

    it('should filter items by category', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Navigation' } });

      expect(screen.getByText('Home')).toBeVisible();
      expect(screen.getByText('Deal Context')).toBeVisible();
      expect(screen.queryByText('New Deal')).not.toBeInTheDocument();
    });

    it('should show empty state when no results match', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No results found')).toBeVisible();
    });

    it('should be case-insensitive when filtering', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'HOME' } });

      expect(screen.getByText('Home')).toBeVisible();
    });

    it('should reset active index when search query changes', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;

      // Navigate down
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Change search query
      fireEvent.change(input, { target: { value: 'New' } });

      // Active index should be reset to 0
      const firstItem = screen.getByText('New Deal').closest('button');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('navigation target assertions', () => {
    it('should call item action when Enter key is pressed on active item', async () => {
      const mockAction = vi.fn();
      const categoriesWithMockAction: CommandPaletteCategory[] = [
        {
          id: 'navigation',
          label: 'Navigation',
          items: [
            {
              id: 'nav-home',
              label: 'Home',
              description: 'Go to home page',
              action: mockAction,
            },
          ],
        },
      ];

      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={categoriesWithMockAction} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled();
      });
    });

    it('should call item action and close when item is clicked', async () => {
      const mockAction = vi.fn();
      const onClose = vi.fn();
      const categoriesWithMockAction: CommandPaletteCategory[] = [
        {
          id: 'navigation',
          label: 'Navigation',
          items: [
            {
              id: 'nav-home',
              label: 'Home',
              description: 'Go to home page',
              action: mockAction,
            },
          ],
        },
      ];

      renderWithRouter(<CommandPalette isOpen={true} onClose={onClose} categories={categoriesWithMockAction} />);

      const homeButton = screen.getByText('Home').closest('button');
      fireEvent.click(homeButton!);

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should navigate with ArrowDown key', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;

      // Initially first item should be active
      let firstItem = screen.getByText('Home').closest('button');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');

      // Press ArrowDown
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Second item should be active
      firstItem = screen.getByText('Home').closest('button');
      const secondItem = screen.getByText('Deal Context').closest('button');
      expect(firstItem).toHaveAttribute('aria-selected', 'false');
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate with ArrowUp key', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;

      // Navigate down first
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Navigate up
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const firstItem = screen.getByText('Home').closest('button');
      const secondItem = screen.getByText('Deal Context').closest('button');
      expect(firstItem).toHaveAttribute('aria-selected', 'false');
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should not go below 0 with ArrowUp', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;

      // Press ArrowUp when at index 0
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const firstItem = screen.getByText('Home').closest('button');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should not go beyond last item with ArrowDown', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const input = document.querySelector('.arco-input') as HTMLInputElement;

      // Navigate to last item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const lastItem = screen.getByText('New Deal').closest('button');
      expect(lastItem).toHaveAttribute('aria-selected', 'true');

      // Try to go beyond
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(lastItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should update active index on mouse hover', () => {
      renderWithRouter(<CommandPalette isOpen={true} onClose={vi.fn()} categories={mockCategories} />);

      const firstItem = screen.getByText('Home').closest('button');
      const secondItem = screen.getByText('Deal Context').closest('button');

      expect(firstItem).toHaveAttribute('aria-selected', 'true');

      fireEvent.mouseEnter(secondItem!);

      expect(firstItem).toHaveAttribute('aria-selected', 'false');
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });
  });
});
