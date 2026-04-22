/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SecretStorage', () => {
  let safeStorageMock: {
    isEncryptionAvailable: ReturnType<typeof vi.fn>;
    encryptString: ReturnType<typeof vi.fn>;
    decryptString: ReturnType<typeof vi.fn>;
    getSelectedStorageBackend: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    safeStorageMock = {
      isEncryptionAvailable: vi.fn().mockReturnValue(true),
      encryptString: vi.fn((plainText: string) => Buffer.from(`enc:${plainText}`, 'utf-8')),
      decryptString: vi.fn((encrypted: Buffer) => {
        const str = encrypted.toString('utf-8');
        return str.startsWith('enc:') ? str.slice(4) : str;
      }),
      getSelectedStorageBackend: vi.fn().mockReturnValue('gnome_libsecret'),
    };

    vi.doMock('electron', () => ({
      safeStorage: safeStorageMock,
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('basic operations', () => {
    it('stores and retrieves secrets', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();

      storage.set('my-key', 'my-secret-value');
      const value = storage.get('my-key');

      expect(value).toBe('my-secret-value');
    });

    it('returns null for non-existent key', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();
      expect(storage.get('non-existent')).toBeNull();
    });

    it('has returns true for existing key', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();
      storage.set('exists', 'value');
      expect(storage.has('exists')).toBe(true);
    });

    it('deletes existing key', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();
      storage.set('to-delete', 'value');
      expect(storage.delete('to-delete')).toBe(true);
      expect(storage.has('to-delete')).toBe(false);
    });

    it('lists all stored keys', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();

      storage.set('key1', 'v1');
      storage.set('key2', 'v2');

      const keys = storage.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('metadata', () => {
    it('stores with metadata', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();
      const metadata = { service: 'test-service', userId: '123' };

      storage.set('key-with-meta', 'value', metadata);
      const entry = storage.getEntry('key-with-meta');

      expect(entry?.metadata).toEqual(metadata);
    });
  });

  describe('status', () => {
    it('reports storage status correctly', async () => {
      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();
      const status = storage.getStatus();
      expect(status.available).toBe(true);
      expect(status.entryCount).toBe(0);
    });
  });

  describe('migration', () => {
    it('migrates all eligible entries', async () => {
      safeStorageMock.isEncryptionAvailable.mockReturnValue(true);

      const { SecretStorage } = await import('../../../../../src/process/services/secretStorage/SecretStorage');
      const storage = new SecretStorage();

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const result = storage.migrateAll();

      expect(result.migrated + result.skipped + result.failed).toBe(2);
    });
  });
});
