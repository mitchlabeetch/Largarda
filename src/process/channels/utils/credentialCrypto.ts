/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeStorage } from 'electron';

/**
 * Encryption method prefixes for stored values.
 * Used to identify which encryption method was used.
 */
const ENCRYPTION_PREFIXES = {
  SAFE_STORAGE: 'ss:',
  BASE64: 'b64:',
  PLAIN: 'plain:',
  LEGACY_ENC: 'enc:',
} as const;

/**
 * Credential storage utilities
 * Uses Electron's safeStorage API when available for OS-level encryption,
 * falling back to Base64 encoding for compatibility.
 *
 * safeStorage integration:
 * - macOS: Uses Keychain
 * - Windows: Uses Data Protection API (DPAPI)
 * - Linux: Uses secret service (libsecret) or kwallet
 */

/**
 * Check if OS-level encryption is available via Electron's safeStorage.
 * Returns true when the OS keychain/credential manager is accessible.
 */
export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Get the encryption backend name (for diagnostics and logging).
 * Returns the active storage backend on Linux, or 'platform' on macOS/Windows.
 */
export function getEncryptionBackend(): string {
  try {
    if (process.platform === 'linux') {
      return safeStorage.getSelectedStorageBackend();
    }
    return process.platform === 'darwin' ? 'keychain' : process.platform === 'win32' ? 'dpapi' : 'platform';
  } catch {
    return 'unavailable';
  }
}

/**
 * Encrypt a string value for storage.
 * Uses OS-level encryption (safeStorage) when available, otherwise falls back
 * to Base64 encoding for backward compatibility.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string with prefix indicating the method used
 */
export function encryptString(plaintext: string): string {
  if (!plaintext) return '';

  // Try OS-level encryption first
  if (isEncryptionAvailable()) {
    try {
      const encrypted = safeStorage.encryptString(plaintext);
      // Convert Buffer to base64 for storage compatibility
      return `${ENCRYPTION_PREFIXES.SAFE_STORAGE}${encrypted.toString('base64')}`;
    } catch (error) {
      console.error('[CredentialStorage] safeStorage encryption failed:', error);
      // Fall through to base64 fallback
    }
  }

  // Fallback to base64 encoding
  try {
    const encoded = Buffer.from(plaintext, 'utf-8').toString('base64');
    return `${ENCRYPTION_PREFIXES.BASE64}${encoded}`;
  } catch (error) {
    console.error('[CredentialStorage] Base64 encoding failed:', error);
    // Last resort: plain storage with prefix
    return `${ENCRYPTION_PREFIXES.PLAIN}${plaintext}`;
  }
}

/**
 * Decrypt a previously encrypted string.
 * Handles multiple formats for backward compatibility:
 * - ss: (safeStorage encrypted, base64-encoded buffer)
 * - b64: (base64 encoded)
 * - plain: (plaintext with prefix)
 * - enc: (legacy format)
 * - no prefix: (legacy unencoded)
 *
 * @param encoded - The encoded string with prefix
 * @returns The decrypted plaintext
 */
export function decryptString(encoded: string): string {
  if (!encoded) return '';

  // Handle safeStorage encrypted (ss: prefix)
  if (encoded.startsWith(ENCRYPTION_PREFIXES.SAFE_STORAGE)) {
    if (!isEncryptionAvailable()) {
      console.error('[CredentialStorage] Cannot decrypt safeStorage value: OS encryption unavailable');
      return '';
    }
    try {
      const encryptedBuffer = Buffer.from(encoded.slice(ENCRYPTION_PREFIXES.SAFE_STORAGE.length), 'base64');
      return safeStorage.decryptString(encryptedBuffer);
    } catch (error) {
      console.error('[CredentialStorage] safeStorage decryption failed:', error);
      return '';
    }
  }

  // Handle plain: prefix
  if (encoded.startsWith(ENCRYPTION_PREFIXES.PLAIN)) {
    return encoded.slice(ENCRYPTION_PREFIXES.PLAIN.length);
  }

  // Handle b64: prefix (base64 encoded)
  if (encoded.startsWith(ENCRYPTION_PREFIXES.BASE64)) {
    try {
      return Buffer.from(encoded.slice(ENCRYPTION_PREFIXES.BASE64.length), 'base64').toString('utf-8');
    } catch (error) {
      console.error('[CredentialStorage] Base64 decoding failed:', error);
      return '';
    }
  }

  // Handle enc: prefix (legacy format)
  if (encoded.startsWith(ENCRYPTION_PREFIXES.LEGACY_ENC)) {
    console.warn('[CredentialStorage] Found legacy enc: format, attempting base64 decode');
    try {
      return Buffer.from(encoded.slice(ENCRYPTION_PREFIXES.LEGACY_ENC.length), 'base64').toString('utf-8');
    } catch {
      console.error('[CredentialStorage] Cannot decode legacy enc: format');
      return '';
    }
  }

  // Legacy: no prefix means it was stored before encoding was added
  // Return as-is for backward compatibility
  console.warn('[CredentialStorage] Found legacy unencoded value, returning as-is');
  return encoded;
}

/**
 * Check if a value is encrypted (vs plaintext).
 * Returns false for legacy unencoded values.
 */
export function isEncryptedValue(value: string): boolean {
  if (!value) return false;
  return (
    value.startsWith(ENCRYPTION_PREFIXES.SAFE_STORAGE) ||
    value.startsWith(ENCRYPTION_PREFIXES.BASE64) ||
    value.startsWith(ENCRYPTION_PREFIXES.LEGACY_ENC)
  );
}

/**
 * Check if a value uses OS-level encryption (safeStorage).
 */
export function isSafeStorageEncrypted(value: string): boolean {
  if (!value) return false;
  return value.startsWith(ENCRYPTION_PREFIXES.SAFE_STORAGE);
}

/**
 * Re-encrypt a value using the best available encryption method.
 * Useful for migrating from legacy/base64 to safeStorage encryption.
 *
 * @param encoded - The previously encrypted value
 * @returns The re-encrypted value with current best method
 */
export function reEncryptString(encoded: string): string {
  if (!encoded) return '';

  // Already using best encryption
  if (isSafeStorageEncrypted(encoded) || !isEncryptionAvailable()) {
    return encoded;
  }

  const plaintext = decryptString(encoded);
  if (!plaintext) return encoded;

  return encryptString(plaintext);
}

/**
 * Encrypt sensitive fields in a credentials object.
 * Encrypts: token, apiKey, secret, password, privateKey
 *
 * @param credentials - The credentials object to encrypt
 * @returns A new object with sensitive fields encrypted
 */
export function encryptCredentials(
  credentials: Record<string, string | number | boolean | undefined> | undefined
): Record<string, string | number | boolean | undefined> | undefined {
  if (!credentials) return undefined;

  const SENSITIVE_FIELDS = ['token', 'apiKey', 'secret', 'password', 'privateKey', 'accessToken', 'refreshToken'];

  const result: Record<string, string | number | boolean | undefined> = { ...credentials };

  for (const field of SENSITIVE_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value) {
      result[field] = encryptString(value);
    }
  }

  return result;
}

/**
 * Decrypt sensitive fields in a credentials object.
 * Decrypts: token, apiKey, secret, password, privateKey
 *
 * @param credentials - The credentials object to decrypt
 * @returns A new object with sensitive fields decrypted
 */
export function decryptCredentials(
  credentials: Record<string, string | number | boolean | undefined> | undefined
): Record<string, string | number | boolean | undefined> | undefined {
  if (!credentials) return undefined;

  const SENSITIVE_FIELDS = ['token', 'apiKey', 'secret', 'password', 'privateKey', 'accessToken', 'refreshToken'];

  const result: Record<string, string | number | boolean | undefined> = { ...credentials };

  for (const field of SENSITIVE_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value) {
      result[field] = decryptString(value);
    }
  }

  return result;
}

/**
 * Re-encrypt all sensitive fields in credentials using the best available method.
 * Useful for migrating credentials to stronger encryption.
 *
 * @param credentials - The credentials object to migrate
 * @returns A new object with sensitive fields re-encrypted
 */
export function migrateCredentialsEncryption(
  credentials: Record<string, string | number | boolean | undefined> | undefined
): Record<string, string | number | boolean | undefined> | undefined {
  if (!credentials) return undefined;

  const SENSITIVE_FIELDS = ['token', 'apiKey', 'secret', 'password', 'privateKey', 'accessToken', 'refreshToken'];

  const result: Record<string, string | number | boolean | undefined> = { ...credentials };
  let migrated = false;

  for (const field of SENSITIVE_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value && !isSafeStorageEncrypted(value)) {
      const decrypted = decryptString(value);
      if (decrypted) {
        result[field] = encryptString(decrypted);
        migrated = true;
      }
    }
  }

  if (migrated) {
    console.log('[CredentialStorage] Migrated credentials to safeStorage encryption');
  }

  return result;
}
