/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Renderer Discoverability Tests
 * Tests that contact and watchlist features are discoverable from the renderer.
 */

import { describe, it, expect } from 'vitest';

describe('Renderer Discoverability', () => {
  describe('Contact Features', () => {
    it('should expose contact IPC bridge in common adapter', () => {
      // This test verifies that the IPC bridge definitions exist
      // In a real test, we would import and check the actual bridge
      const ipcBridge = require('@/common/adapter/ipcBridge').ipcBridge;

      expect(ipcBridge).toBeDefined();
      expect(ipcBridge.ma).toBeDefined();
      expect(ipcBridge.ma.contact).toBeDefined();
    });

    it('should expose all contact operations', () => {
      const ipcBridge = require('@/common/adapter/ipcBridge').ipcBridge;

      const contactOps = ipcBridge.ma.contact;

      expect(contactOps.create).toBeDefined();
      expect(contactOps.get).toBeDefined();
      expect(contactOps.update).toBeDefined();
      expect(contactOps.delete).toBeDefined();
      expect(contactOps.listByCompany).toBeDefined();
      expect(contactOps.listByDeal).toBeDefined();
      expect(contactOps.deleteByCompany).toBeDefined();
      expect(contactOps.deleteByDeal).toBeDefined();
    });

    it('should expose contact renderer hook', () => {
      // This test verifies that the renderer hook exists
      const useContacts = require('@/renderer/hooks/ma/useContacts').useContacts;

      expect(useContacts).toBeDefined();
      expect(typeof useContacts).toBe('function');
    });

    it('should expose contact UI components', () => {
      // This test verifies that the UI components exist
      const ContactList = require('@/renderer/components/ma/ContactList').ContactList;

      expect(ContactList).toBeDefined();
      expect(typeof ContactList).toBe('function');
    });
  });

  describe('Watchlist Features', () => {
    it('should expose watchlist IPC bridge in common adapter', () => {
      const ipcBridge = require('@/common/adapter/ipcBridge').ipcBridge;

      expect(ipcBridge).toBeDefined();
      expect(ipcBridge.ma).toBeDefined();
      expect(ipcBridge.ma.watchlist).toBeDefined();
    });

    it('should expose all watchlist operations', () => {
      const ipcBridge = require('@/common/adapter/ipcBridge').ipcBridge;

      const watchlistOps = ipcBridge.ma.watchlist;

      // CRUD operations
      expect(watchlistOps.create).toBeDefined();
      expect(watchlistOps.get).toBeDefined();
      expect(watchlistOps.update).toBeDefined();
      expect(watchlistOps.delete).toBeDefined();
      expect(watchlistOps.listByUser).toBeDefined();
      expect(watchlistOps.listEnabled).toBeDefined();

      // Hit operations
      expect(watchlistOps.createHit).toBeDefined();
      expect(watchlistOps.getHit).toBeDefined();
      expect(watchlistOps.updateHit).toBeDefined();
      expect(watchlistOps.listHits).toBeDefined();
      expect(watchlistOps.listUnseenHits).toBeDefined();
      expect(watchlistOps.markAllHitsSeen).toBeDefined();
      expect(watchlistOps.deleteHits).toBeDefined();

      // Refresh/schedule operations
      expect(watchlistOps.refresh).toBeDefined();
      expect(watchlistOps.startAllRefreshes).toBeDefined();
      expect(watchlistOps.stopAllRefreshes).toBeDefined();
    });

    it('should expose watchlist renderer hook', () => {
      const useWatchlists = require('@/renderer/hooks/ma/useWatchlists').useWatchlists;

      expect(useWatchlists).toBeDefined();
      expect(typeof useWatchlists).toBe('function');
    });

    it('should expose watchlist UI components', () => {
      const WatchlistList = require('@/renderer/components/ma/WatchlistList').WatchlistList;

      expect(WatchlistList).toBeDefined();
      expect(typeof WatchlistList).toBe('function');
    });
  });

  describe('Schema Types', () => {
    it('should expose contact schema types', () => {
      const contactSchema = require('@/common/ma/contact/schema');

      expect(contactSchema.Contact).toBeDefined();
      expect(contactSchema.CreateContactInput).toBeDefined();
      expect(contactSchema.UpdateContactInput).toBeDefined();
      expect(contactSchema.ContactSchema).toBeDefined();
    });

    it('should expose watchlist schema types', () => {
      const watchlistSchema = require('@/common/ma/watchlist/schema');

      expect(watchlistSchema.Watchlist).toBeDefined();
      expect(watchlistSchema.CreateWatchlistInput).toBeDefined();
      expect(watchlistSchema.UpdateWatchlistInput).toBeDefined();
      expect(watchlistSchema.WatchlistHit).toBeDefined();
      expect(watchlistSchema.CreateWatchlistHitInput).toBeDefined();
      expect(watchlistSchema.UpdateWatchlistHitInput).toBeDefined();
      expect(watchlistSchema.WatchlistSchema).toBeDefined();
    });
  });

  describe('Service Layer', () => {
    it('should expose ContactService from process services', () => {
      const { ContactService, getContactService } = require('@process/services/ma');

      expect(ContactService).toBeDefined();
      expect(getContactService).toBeDefined();
      expect(typeof getContactService).toBe('function');
    });

    it('should expose WatchlistService from process services', () => {
      const { WatchlistService, getWatchlistService } = require('@process/services/ma');

      expect(WatchlistService).toBeDefined();
      expect(getWatchlistService).toBeDefined();
      expect(typeof getWatchlistService).toBe('function');
    });
  });
});
