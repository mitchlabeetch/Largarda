/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  encryptString,
  decryptString,
  reEncryptString,
  isEncryptionAvailable,
  getEncryptionBackend,
  isSafeStorageEncrypted,
} from '@process/channels/utils/credentialCrypto';

export interface SecretEntry {
  key: string;
  value: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SecretStorageStatus {
  available: boolean;
  backend: string;
  entryCount: number;
}

export class SecretStorage {
  private secrets: Map<string, SecretEntry> = new Map();
  private metadata: Map<string, Record<string, unknown>> = new Map();

  getStatus(): SecretStorageStatus {
    return {
      available: isEncryptionAvailable(),
      backend: getEncryptionBackend(),
      entryCount: this.secrets.size,
    };
  }

  set(key: string, value: string, metadata?: Record<string, unknown>): void {
    const now = Date.now();
    const encrypted = encryptString(value);

    this.secrets.set(key, {
      key,
      value: encrypted,
      metadata,
      createdAt: this.secrets.has(key) ? this.secrets.get(key)!.createdAt : now,
      updatedAt: now,
    });

    if (metadata) {
      this.metadata.set(key, metadata);
    }
  }

  get(key: string): string | null {
    const entry = this.secrets.get(key);
    if (!entry) return null;

    return decryptString(entry.value);
  }

  getEntry(key: string): SecretEntry | null {
    const entry = this.secrets.get(key);
    if (!entry) return null;

    return {
      ...entry,
      value: decryptString(entry.value),
    };
  }

  has(key: string): boolean {
    return this.secrets.has(key);
  }

  delete(key: string): boolean {
    this.metadata.delete(key);
    return this.secrets.delete(key);
  }

  listKeys(): string[] {
    return Array.from(this.secrets.keys());
  }

  migrateEntry(key: string): boolean {
    const entry = this.secrets.get(key);
    if (!entry) return false;

    if (isSafeStorageEncrypted(entry.value)) {
      return false;
    }

    const decrypted = decryptString(entry.value);
    if (!decrypted) return false;

    const reEncrypted = reEncryptString(entry.value);
    entry.value = reEncrypted;
    entry.updatedAt = Date.now();

    return true;
  }

  migrateAll(): { migrated: number; skipped: number; failed: number } {
    const result = { migrated: 0, skipped: 0, failed: 0 };

    for (const [key, entry] of this.secrets) {
      if (isSafeStorageEncrypted(entry.value)) {
        result.skipped++;
        continue;
      }

      const decrypted = decryptString(entry.value);
      if (!decrypted) {
        result.failed++;
        continue;
      }

      entry.value = encryptString(decrypted);
      entry.updatedAt = Date.now();
      result.migrated++;
    }

    return result;
  }

  clear(): void {
    this.secrets.clear();
    this.metadata.clear();
  }

  exportForBackup(): Array<{
    key: string;
    metadata: Record<string, unknown> | undefined;
    createdAt: number;
    updatedAt: number;
  }> {
    return Array.from(this.secrets.values()).map((entry) => ({
      key: entry.key,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
  }
}

export const globalSecretStorage = new SecretStorage();
