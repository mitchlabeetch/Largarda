/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import i18nConfig from '../../src/common/config/i18n-config.json';
import { describe, expect, it } from 'vitest';

const LOCALES_DIR = path.resolve(__dirname, '../../src/renderer/services/i18n/locales');
const REFERENCE_LANG = i18nConfig.referenceLanguage;
const SUPPORTED_LANGUAGES = i18nConfig.supportedLanguages;

/** Recursively collect all translation keys from a JSON object */
function getAllKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];
  if (typeof obj !== 'object' || obj === null) return keys;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** Load and parse a locale JSON file */
function loadLocaleJson(lang: string, module: string): Record<string, unknown> | null {
  const filePath = path.join(LOCALES_DIR, lang, `${module}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

describe('Dispatch i18n Tests', () => {
  // I18N-001: dispatch module listed in i18n-config.json
  it('I18N-001: dispatch module is registered in i18n-config.json modules', () => {
    expect(i18nConfig.modules).toContain('dispatch');
  });

  // I18N-002: dispatch.json exists for all supported languages
  it('I18N-002: dispatch.json exists for every supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const filePath = path.join(LOCALES_DIR, lang, 'dispatch.json');
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  // I18N-003: dispatch.json is valid JSON for all languages
  it('I18N-003: dispatch.json is valid JSON in every locale', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const filePath = path.join(LOCALES_DIR, lang, 'dispatch.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  // I18N-004: Reference locale has expected top-level sections
  it('I18N-004: en-US dispatch.json has sidebar, create, header, timeline, notification sections', () => {
    const content = loadLocaleJson(REFERENCE_LANG, 'dispatch');
    expect(content).not.toBeNull();

    const topKeys = Object.keys(content!);
    expect(topKeys).toContain('sidebar');
    expect(topKeys).toContain('create');
    expect(topKeys).toContain('header');
    expect(topKeys).toContain('timeline');
    expect(topKeys).toContain('notification');
  });

  // I18N-005: No double-nesting (dispatch.dispatch.*)
  it('I18N-005: no language has a redundant "dispatch" wrapper key', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const content = loadLocaleJson(lang, 'dispatch');
      if (!content) continue;

      const keys = Object.keys(content);
      expect(keys.length === 1 && keys[0] === 'dispatch').toBe(false);
    }
  });

  // I18N-006: All reference keys present in each non-reference language
  it('I18N-006: every non-reference language covers all dispatch reference keys', () => {
    const referenceContent = loadLocaleJson(REFERENCE_LANG, 'dispatch');
    expect(referenceContent).not.toBeNull();
    const referenceKeys = getAllKeys(referenceContent!);

    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === REFERENCE_LANG) continue;

      const langContent = loadLocaleJson(lang, 'dispatch');
      expect(langContent).not.toBeNull();
      const langKeys = getAllKeys(langContent!);

      for (const key of referenceKeys) {
        expect(langKeys).toContain(key);
      }
    }
  });

  // I18N-007: No extra keys in non-reference languages that reference does not have
  it('I18N-007: non-reference languages have no orphan dispatch keys', () => {
    const referenceContent = loadLocaleJson(REFERENCE_LANG, 'dispatch');
    expect(referenceContent).not.toBeNull();
    const referenceKeys = new Set(getAllKeys(referenceContent!));

    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === REFERENCE_LANG) continue;

      const langContent = loadLocaleJson(lang, 'dispatch');
      if (!langContent) continue;
      const langKeys = getAllKeys(langContent);

      for (const key of langKeys) {
        expect(referenceKeys.has(key)).toBe(true);
      }
    }
  });

  // I18N-008: Interpolation placeholders are consistent across languages
  it('I18N-008: interpolation placeholders match between reference and other languages', () => {
    const referenceContent = loadLocaleJson(REFERENCE_LANG, 'dispatch');
    expect(referenceContent).not.toBeNull();

    /** Extract {{placeholders}} from a value */
    const extractPlaceholders = (value: string): string[] => {
      const matches = value.match(/\{\{(\w+)\}\}/g);
      return matches ? matches.toSorted() : [];
    };

    /** Recursively get key-value leaf entries */
    const getLeafEntries = (obj: unknown, prefix = ''): [string, string][] => {
      const entries: [string, string][] = [];
      if (typeof obj !== 'object' || obj === null) return entries;
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          entries.push([fullKey, value]);
        } else if (typeof value === 'object' && value !== null) {
          entries.push(...getLeafEntries(value, fullKey));
        }
      }
      return entries;
    };

    const referenceEntries = getLeafEntries(referenceContent!);
    const referencePlaceholders = new Map<string, string[]>();
    for (const [key, value] of referenceEntries) {
      referencePlaceholders.set(key, extractPlaceholders(value));
    }

    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === REFERENCE_LANG) continue;

      const langContent = loadLocaleJson(lang, 'dispatch');
      if (!langContent) continue;
      const langEntries = getLeafEntries(langContent);

      for (const [key, value] of langEntries) {
        const refPlaceholders = referencePlaceholders.get(key);
        if (!refPlaceholders) continue;

        const langPlaceholders = extractPlaceholders(value);
        expect(langPlaceholders).toEqual(refPlaceholders);
      }
    }
  });

  // I18N-009: index.ts in each locale imports and exports dispatch module
  it('I18N-009: locale index.ts files import and re-export dispatch module', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const indexFile = path.join(LOCALES_DIR, lang, 'index.ts');
      expect(fs.existsSync(indexFile)).toBe(true);

      const content = fs.readFileSync(indexFile, 'utf-8');
      expect(content).toContain("from './dispatch.json'");

      const exportBlock = content.match(/export default \{([\s\S]*?)\}/);
      expect(exportBlock).not.toBeNull();
      expect(exportBlock![1]).toContain('dispatch');
    }
  });
});
