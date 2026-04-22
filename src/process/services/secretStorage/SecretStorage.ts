/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  encryptString,
  decryptString,
  reEncryptString,
  isEncryptionAvailable,
  getEncryptionBackend,
  isSafeStorageEncrypted,
} from '@process/channels/utils/credentialCrypto';
import { getDataPath } from '@process/utils';

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

interface PersistedSecretStorage {
  version: number;
  entries: SecretEntry[];
}

export class SecretStorage {
  private readonly storageFilePath: string;
  private secrets: Map<string, SecretEntry> = new Map();
  private metadata: Map<string, Record<string, unknown>> = new Map();

  constructor(storageFilePath = path.join(getDataPath(), 'secret-storage.json')) {
    this.storageFilePath = storageFilePath;
    this.loadFromDisk();
  }

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

    this.persistToDisk();
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
    const deleted = this.secrets.delete(key);
    if (deleted) {
      this.persistToDisk();
    }
    return deleted;
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
    this.persistToDisk();

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

    if (result.migrated > 0) {
      this.persistToDisk();
    }

    return result;
  }

  clear(): void {
    this.secrets.clear();
    this.metadata.clear();
    this.persistToDisk();
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

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storageFilePath)) {
        return;
      }

      const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
      if (!raw.trim()) {
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      const entries = this.normalizeEntries(parsed);
      for (const entry of entries) {
        this.secrets.set(entry.key, entry);
        if (entry.metadata) {
          this.metadata.set(entry.key, entry.metadata);
        }
      }
    } catch {
      this.backupCorruptStore();
      this.secrets.clear();
      this.metadata.clear();
    }
  }

  private normalizeEntries(payload: unknown): SecretEntry[] {
    if (Array.isArray(payload)) {
      return payload.filter((entry): entry is SecretEntry => this.isPersistedEntry(entry));
    }

    if (payload && typeof payload === 'object') {
      const record = payload as { entries?: unknown; secrets?: unknown };

      if (Array.isArray(record.entries)) {
        return record.entries.filter((entry): entry is SecretEntry => this.isPersistedEntry(entry));
      }

      if (record.secrets && typeof record.secrets === 'object') {
        return Object.values(record.secrets).filter((entry): entry is SecretEntry => this.isPersistedEntry(entry));
      }
    }

    return [];
  }

  private isPersistedEntry(entry: unknown): entry is SecretEntry {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const candidate = entry as Partial<SecretEntry>;
    return (
      typeof candidate.key === 'string' &&
      typeof candidate.value === 'string' &&
      typeof candidate.createdAt === 'number' &&
      typeof candidate.updatedAt === 'number'
    );
  }

  private persistToDisk(): void {
    const payload: PersistedSecretStorage = {
      version: 1,
      entries: Array.from(this.secrets.values()),
    };

    fs.mkdirSync(path.dirname(this.storageFilePath), { recursive: true });
    fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  private backupCorruptStore(): void {
    if (!fs.existsSync(this.storageFilePath)) {
      return;
    }

    try {
      const corruptPath = `${this.storageFilePath}.corrupt.${Date.now()}`;
      fs.renameSync(this.storageFilePath, corruptPath);
    } catch {
      // Ignore corruption backup failures and continue with a clean store.
    }
  }
}

export const globalSecretStorage = new SecretStorage();
