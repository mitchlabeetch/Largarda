/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import CommandPalette, { type CommandPaletteItem, type CommandPaletteCategory } from './CommandPalette';
import { Home, FolderOpen, Analysis, Search, Plus, Setting, Keyboard } from '@icon-park/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ShellExtensionSlotsProps {
  onCommandPaletteOpen?: () => void;
}

const ShellExtensionSlots: React.FC<ShellExtensionSlotsProps> = ({ onCommandPaletteOpen }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('ma');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Command palette categories
  const commandPaletteCategories: CommandPaletteCategory[] = React.useMemo(
    () => [
      {
        id: 'navigation',
        label: t('commandPalette.categories.navigation'),
        items: [
          {
            id: 'nav-home',
            label: t('commandPalette.commands.home'),
            description: t('commandPalette.commands.homeDesc'),
            icon: <Home />,
            category: t('commandPalette.categories.navigation'),
            action: () => navigate('/ma'),
          },
          {
            id: 'nav-deal-context',
            label: t('commandPalette.commands.dealContext'),
            description: t('commandPalette.commands.dealContextDesc'),
            icon: <FolderOpen />,
            category: t('commandPalette.categories.navigation'),
            action: () => navigate('/ma/deal-context'),
          },
          {
            id: 'nav-due-diligence',
            label: t('commandPalette.commands.dueDiligence'),
            description: t('commandPalette.commands.dueDiligenceDesc'),
            icon: <Analysis />,
            category: t('commandPalette.categories.navigation'),
            action: () => navigate('/ma/due-diligence'),
          },
          {
            id: 'nav-company-enrichment',
            label: t('commandPalette.commands.companyEnrichment'),
            description: t('commandPalette.commands.companyEnrichmentDesc'),
            icon: <Search />,
            category: t('commandPalette.categories.navigation'),
            action: () => navigate('/ma/company-enrichment'),
          },
        ],
      },
      {
        id: 'actions',
        label: t('commandPalette.categories.actions'),
        items: [
          {
            id: 'action-new-deal',
            label: t('commandPalette.commands.newDeal'),
            description: t('commandPalette.commands.newDealDesc'),
            icon: <Plus />,
            category: t('commandPalette.categories.actions'),
            action: () => navigate('/ma/deal-context'),
          },
        ],
      },
      {
        id: 'settings',
        label: t('commandPalette.categories.settings'),
        items: [
          {
            id: 'settings-keyboard',
            label: t('commandPalette.commands.keyboardShortcuts'),
            description: t('commandPalette.commands.keyboardShortcutsDesc'),
            icon: <Setting />,
            category: t('commandPalette.categories.settings'),
            action: () => {
              // Open keyboard shortcuts modal (to be implemented)
            },
          },
        ],
      },
    ],
    [navigate, t]
  );

  // Handle keyboard shortcut to open command palette
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        onCommandPaletteOpen?.();
      }
    },
    [onCommandPaletteOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleCloseCommandPalette = () => {
    setIsCommandPaletteOpen(false);
  };

  return (
    <>
      {/* Top-right extension slot 1: Command palette trigger button */}
      <div className='extension-slot' data-slot='top-right-1'>
        <button
          type='button'
          onClick={() => setIsCommandPaletteOpen(true)}
          className='command-palette-trigger'
          aria-label={t('commandPalette.open')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-2)',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-fill-1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Keyboard style={{ fontSize: '18px' }} />
        </button>
      </div>

      {/* Top-right extension slot 2: Reserved for future use */}
      <div className='extension-slot' data-slot='top-right-2' />

      {/* Sidebar extension slots */}
      <div className='extension-slot' data-slot='sidebar-top' />
      <div className='extension-slot' data-slot='sidebar-bottom' />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        categories={commandPaletteCategories}
      />
    </>
  );
};

export default ShellExtensionSlots;
