/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SafeStorage } from 'electron';

describe('credentialCrypto', () => {
  let safeStorageMock: {
    isEncryptionAvailable: ReturnType<typeof vi.fn>;
    encryptString: ReturnType<typeof vi.fn>;
    decryptString: ReturnType<typeof vi.fn>;
    getSelectedStorageBackend: ReturnType<typeof vi.fn>;
    setUsePlainTextEncryption: ReturnType<typeof vi.fn>;
  };

  const mockSafeStorageAvailable = (available: boolean) => {
    safeStorageMock.isEncryptionAvailable.mockReturnValue(available);
  };

  const mockEncryptString = (fn: (plainText: string) => Buffer) => {
    safeStorageMock.encryptString.mockImplementation(fn);
  };

  const mockDecryptString = (fn: (encrypted: Buffer) => string) => {
    safeStorageMock.decryptString.mockImplementation(fn);
  };

  beforeEach(() => {
    safeStorageMock = {
      isEncryptionAvailable: vi.fn(),
      encryptString: vi.fn(),
      decryptString: vi.fn(),
      getSelectedStorageBackend: vi.fn().mockReturnValue('gnome_libsecret'),
      setUsePlainTextEncryption: vi.fn(),
    };

    vi.doMock('electron', () => ({
      safeStorage: safeStorageMock,
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('isEncryptionAvailable', () => {
    it('returns true when safeStorage reports available', async () => {
      mockSafeStorageAvailable(true);
      const { isEncryptionAvailable } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptionAvailable()).toBe(true);
    });

    it('returns false when safeStorage reports unavailable', async () => {
      mockSafeStorageAvailable(false);
      const { isEncryptionAvailable } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptionAvailable()).toBe(false);
    });

    it('returns false when safeStorage throws', async () => {
      safeStorageMock.isEncryptionAvailable.mockImplementation(() => {
        throw new Error('not ready');
      });
      const { isEncryptionAvailable } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptionAvailable()).toBe(false);
    });
  });

  describe('getEncryptionBackend', () => {
    it('returns keychain on darwin', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockSafeStorageAvailable(true);
      const { getEncryptionBackend } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(getEncryptionBackend()).toBe('keychain');
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns dpapi on win32', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockSafeStorageAvailable(true);
      const { getEncryptionBackend } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(getEncryptionBackend()).toBe('dpapi');
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns linux backend on linux', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockSafeStorageAvailable(true);
      safeStorageMock.getSelectedStorageBackend.mockReturnValue('gnome_libsecret');
      const { getEncryptionBackend } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(getEncryptionBackend()).toBe('gnome_libsecret');
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

  });

  describe('encryptString', () => {
    it('uses safeStorage when available', async () => {
      mockSafeStorageAvailable(true);
      mockEncryptString((plainText: string) => Buffer.from(`enc:${plainText}`, 'utf-8'));

      const { encryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = encryptString('my-secret');

      expect(result).toMatch(/^ss:/);
      expect(safeStorageMock.encryptString).toHaveBeenCalledWith('my-secret');
    });

    it('falls back to base64 when safeStorage is unavailable', async () => {
      mockSafeStorageAvailable(false);

      const { encryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = encryptString('my-secret');

      expect(result).toMatch(/^b64:/);
      expect(safeStorageMock.encryptString).not.toHaveBeenCalled();
    });

    it('falls back to base64 when safeStorage throws', async () => {
      mockSafeStorageAvailable(true);
      safeStorageMock.encryptString.mockImplementation(() => {
        throw new Error('encryption failed');
      });

      const { encryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = encryptString('my-secret');

      expect(result).toMatch(/^b64:/);
    });

    it('falls back to plain on base64 failure', async () => {
      mockSafeStorageAvailable(false);
      const { encryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = encryptString('');
      expect(result).toBe('');
    });

    it('returns empty string for empty input', async () => {
      const { encryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(encryptString('')).toBe('');
    });
  });

  describe('decryptString', () => {
    it('decrypts safeStorage prefixed values', async () => {
      mockSafeStorageAvailable(true);
      const encrypted = Buffer.from('encrypted-data');
      mockDecryptString((buf: Buffer) => {
        expect(buf.toString()).toBe('encrypted-data');
        return 'decrypted-secret';
      });

      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = decryptString(`ss:${encrypted.toString('base64')}`);

      expect(result).toBe('decrypted-secret');
    });

    it('returns empty string when safeStorage unavailable for ss: prefix', async () => {
      mockSafeStorageAvailable(false);

      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = decryptString('ss:abc123');

      expect(result).toBe('');
    });

    it('decrypts base64 prefixed values', async () => {
      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = decryptString(`b64:${Buffer.from('hello-world', 'utf-8').toString('base64')}`);
      expect(result).toBe('hello-world');
    });

    it('returns original for plain: prefix', async () => {
      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = decryptString('plain:hello-world');
      expect(result).toBe('hello-world');
    });

    it('handles legacy enc: prefix', async () => {
      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = decryptString(`enc:${Buffer.from('legacy-data', 'utf-8').toString('base64')}`);
      expect(result).toBe('legacy-data');
    });

    it('returns legacy unencoded value as-is with warning', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = decryptString('no-prefix-value');
      expect(result).toBe('no-prefix-value');
      consoleWarnSpy.mockRestore();
    });

    it('returns empty string for empty input', async () => {
      const { decryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(decryptString('')).toBe('');
    });
  });

  describe('isEncryptedValue', () => {
    it('returns true for ss: prefix', async () => {
      const { isEncryptedValue } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptedValue('ss:abc')).toBe(true);
    });

    it('returns true for b64: prefix', async () => {
      const { isEncryptedValue } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptedValue('b64:abc')).toBe(true);
    });

    it('returns true for enc: prefix', async () => {
      const { isEncryptedValue } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptedValue('enc:abc')).toBe(true);
    });

    it('returns false for plain: prefix', async () => {
      const { isEncryptedValue } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptedValue('plain:abc')).toBe(false);
    });

    it('returns false for no prefix', async () => {
      const { isEncryptedValue } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isEncryptedValue('no-prefix')).toBe(false);
    });
  });

  describe('isSafeStorageEncrypted', () => {
    it('returns true only for ss: prefix', async () => {
      const { isSafeStorageEncrypted } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(isSafeStorageEncrypted('ss:abc')).toBe(true);
      expect(isSafeStorageEncrypted('b64:abc')).toBe(false);
      expect(isSafeStorageEncrypted('plain:abc')).toBe(false);
    });
  });

  describe('reEncryptString', () => {
    it('returns same value if already safeStorage encrypted', async () => {
      mockSafeStorageAvailable(true);
      const { reEncryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const value = 'ss:encrypted';
      expect(reEncryptString(value)).toBe(value);
    });

    it('returns same value if safeStorage unavailable', async () => {
      mockSafeStorageAvailable(false);
      const { reEncryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const value = 'b64:abc';
      expect(reEncryptString(value)).toBe(value);
    });

    it('re-encrypts b64 to ss when safeStorage available', async () => {
      mockSafeStorageAvailable(true);
      mockEncryptString((plainText: string) => Buffer.from(`enc:${plainText}`, 'utf-8'));

      const { reEncryptString } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const b64Value = `b64:${Buffer.from('my-secret', 'utf-8').toString('base64')}`;
      const result = reEncryptString(b64Value);

      expect(result).toMatch(/^ss:/);
    });
  });

  describe('encryptCredentials', () => {
    it('encrypts sensitive fields', async () => {
      mockSafeStorageAvailable(false);
      const { encryptCredentials } = await import('../../../../src/process/channels/utils/credentialCrypto');

      const credentials = {
        token: 't1',
        apiKey: 'k1',
        secret: 's1',
        password: 'p1',
        privateKey: 'pk1',
        accessToken: 'at1',
        refreshToken: 'rt1',
        name: 'public-name',
      };

      const result = encryptCredentials(credentials);
      expect(result!.token).toMatch(/^(b64:|ss:)/);
      expect(result!.apiKey).toMatch(/^(b64:|ss:)/);
      expect(result!.secret).toMatch(/^(b64:|ss:)/);
      expect(result!.password).toMatch(/^(b64:|ss:)/);
      expect(result!.privateKey).toMatch(/^(b64:|ss:)/);
      expect(result!.accessToken).toMatch(/^(b64:|ss:)/);
      expect(result!.refreshToken).toMatch(/^(b64:|ss:)/);
      expect(result!.name).toBe('public-name');
    });

    it('returns undefined for undefined input', async () => {
      const { encryptCredentials } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(encryptCredentials(undefined)).toBeUndefined();
    });

    it('ignores empty strings', async () => {
      mockSafeStorageAvailable(false);
      const { encryptCredentials } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = encryptCredentials({ token: '', name: 'test' });
      expect(result!.token).toBe('');
      expect(result!.name).toBe('test');
    });
  });

  describe('decryptCredentials', () => {
    it('decrypts sensitive fields', async () => {
      const { decryptCredentials } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const b64Token = `b64:${Buffer.from('my-token', 'utf-8').toString('base64')}`;

      const credentials = {
        token: b64Token,
        name: 'public-name',
      };

      const result = decryptCredentials(credentials);
      expect(result!.token).toBe('my-token');
      expect(result!.name).toBe('public-name');
    });

    it('returns undefined for undefined input', async () => {
      const { decryptCredentials } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(decryptCredentials(undefined)).toBeUndefined();
    });
  });

  describe('migrateCredentialsEncryption', () => {
    it('migrates base64 credentials to safeStorage when available', async () => {
      mockSafeStorageAvailable(true);
      mockEncryptString((plainText: string) => Buffer.from(`enc:${plainText}`, 'utf-8'));

      const { migrateCredentialsEncryption } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const b64Token = `b64:${Buffer.from('my-token', 'utf-8').toString('base64')}`;

      const result = migrateCredentialsEncryption({ token: b64Token, name: 'test' });
      expect(result!.token).toMatch(/^ss:/);
      expect(result!.name).toBe('test');
    });

    it('skips already safeStorage encrypted fields', async () => {
      mockSafeStorageAvailable(true);
      const { migrateCredentialsEncryption } = await import('../../../../src/process/channels/utils/credentialCrypto');
      const result = migrateCredentialsEncryption({ token: 'ss:encrypted', name: 'test' });
      expect(result!.token).toBe('ss:encrypted');
    });

    it('returns undefined for undefined input', async () => {
      const { migrateCredentialsEncryption } = await import('../../../../src/process/channels/utils/credentialCrypto');
      expect(migrateCredentialsEncryption(undefined)).toBeUndefined();
    });
  });
});
