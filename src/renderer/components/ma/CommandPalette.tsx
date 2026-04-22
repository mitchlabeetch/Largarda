/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Input, Modal } from '@arco-design/web-react';
import { Search, Keyboard } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import styles from './CommandPalette.module.css';

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteCategory {
  id: string;
  label: string;
  items: CommandPaletteItem[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CommandPaletteCategory[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, categories }) => {
  const { t } = useTranslation('ma');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [filteredItems, setFilteredItems] = useState<CommandPaletteItem[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      const allItems = categories.flatMap((cat) => cat.items);
      setFilteredItems(allItems);
      setActiveIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = categories
      .flatMap((cat) => cat.items)
      .filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      );
    setFilteredItems(filtered);
    setActiveIndex(0);
  }, [searchQuery, categories]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const inputElement = document.querySelector('.arco-input') as HTMLInputElement;
        inputElement?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    const activeElement = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (activeElement && listRef.current) {
      activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[activeIndex]) {
            filteredItems[activeIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredItems, activeIndex, onClose]
  );

  const handleItemClick = (item: CommandPaletteItem) => {
    item.action();
    onClose();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Group filtered items by category
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CommandPaletteItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <Modal
      visible={isOpen}
      onCancel={onClose}
      footer={null}
      closeIcon={null}
      focusLock
      maskClosable
      className={styles.modal}
      afterOpen={() => {
        setTimeout(() => {
          const inputElement = document.querySelector('.arco-input') as HTMLInputElement;
          inputElement?.focus();
        }, 0);
      }}
    >
      <div className={styles.commandPalette}>
        {/* Search Input */}
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <Input
            placeholder={t('commandPalette.placeholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className={styles.searchInput}
            size='large'
          />
          <Keyboard className={styles.keyboardIcon} />
          <span className={styles.keyboardHint}>ESC</span>
        </div>

        {/* Results List */}
        <div className={styles.resultsContainer} ref={listRef} role='listbox'>
          {filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <Search className={styles.emptyIcon} />
              <p className={styles.emptyText}>{t('commandPalette.noResults')}</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className={styles.category}>
                <div className={styles.categoryLabel}>{category}</div>
                {items.map((item) => {
                  const globalIndex = filteredItems.indexOf(item);
                  return (
                    <Button
                      key={item.id}
                      type='text'
                      role='option'
                      aria-selected={globalIndex === activeIndex}
                      className={`${styles.item} ${globalIndex === activeIndex ? styles.itemActive : ''}`}
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      long
                    >
                      {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                      <div className={styles.itemContent}>
                        <span className={styles.itemLabel}>{item.label}</span>
                        {item.description && <span className={styles.itemDescription}>{item.description}</span>}
                      </div>
                      {item.shortcut && <span className={styles.itemShortcut}>{item.shortcut}</span>}
                    </Button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerHint}>
            <Keyboard className={styles.footerIcon} />
            <span className={styles.footerText}>{t('commandPalette.keyboardHint')}</span>
          </div>
          <div className={styles.footerCount}>
            {filteredItems.length} {t('commandPalette.results')}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CommandPalette;
