/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { KB_COLLECTION_SCOPES } from '@/common/ma/constants';
import {
  FLOW_CATALOG,
  FlowKeySchema,
  KNOWN_FLOW_KEYS,
  isFlowCallableInProd,
  isFlowKey,
  resolveFlowSpec,
  type FlowKey,
  type FlowSpec,
} from '@/common/ma/flowise';

const SCOPE_SET = new Set<string>(KB_COLLECTION_SCOPES);
const KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

// Typed accessors — `Object.values` / `Object.entries` lose type fidelity
// on a `Readonly<Record<...>>`, so narrow at the boundary once.
const catalogSpecs = (): FlowSpec[] => Object.values(FLOW_CATALOG) as FlowSpec[];
const catalogEntries = (): [FlowKey, FlowSpec][] => Object.entries(FLOW_CATALOG) as [FlowKey, FlowSpec][];

describe('maFlowiseCatalog', () => {
  describe('KNOWN_FLOW_KEYS', () => {
    it('contains only non-empty, dot-separated camelCase keys', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        expect(key, `key "${key}" must match ${KEY_PATTERN}`).toMatch(KEY_PATTERN);
      }
    });

    it('has no duplicates', () => {
      const set = new Set<string>(KNOWN_FLOW_KEYS);
      expect(set.size).toBe(KNOWN_FLOW_KEYS.length);
    });

    it('Zod schema accepts every known key and rejects an unknown one', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        expect(FlowKeySchema.safeParse(key).success).toBe(true);
      }
      expect(FlowKeySchema.safeParse('ma.not.a.real.key').success).toBe(false);
      expect(FlowKeySchema.safeParse('').success).toBe(false);
      expect(FlowKeySchema.safeParse(42).success).toBe(false);
    });
  });

  describe('isFlowKey type guard', () => {
    it('is true for every known key', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        expect(isFlowKey(key)).toBe(true);
      }
    });

    it('is false for non-strings and unknown strings', () => {
      expect(isFlowKey(undefined)).toBe(false);
      expect(isFlowKey(null)).toBe(false);
      expect(isFlowKey(123)).toBe(false);
      expect(isFlowKey('totally.fake')).toBe(false);
    });
  });

  describe('FLOW_CATALOG', () => {
    it('has exactly one spec per known key', () => {
      const catalogKeys = Object.keys(FLOW_CATALOG) as FlowKey[];
      expect(new Set<string>(catalogKeys).size).toBe(catalogKeys.length);
      expect(new Set<string>(catalogKeys)).toEqual(new Set<string>(KNOWN_FLOW_KEYS));
    });

    it('spec.key matches the catalogue key', () => {
      for (const [key, spec] of catalogEntries()) {
        expect(spec.key).toBe(key);
      }
    });

    it('every spec has a non-empty description and a promptVersionId', () => {
      for (const spec of catalogSpecs()) {
        expect(spec.description.length).toBeGreaterThan(0);
        expect(spec.promptVersionId.length).toBeGreaterThan(0);
      }
    });

    it('draft ids are prefixed `draft_` and callable-in-prod ids are UUIDv4', () => {
      const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const spec of catalogSpecs()) {
        if (spec.status === 'draft') {
          expect(spec.id, `draft flow "${spec.key}" must have a draft_ id`).toMatch(/^draft_/);
          expect(isFlowCallableInProd(spec)).toBe(false);
        } else {
          expect(spec.id, `non-draft flow "${spec.key}" must be a UUIDv4`).toMatch(uuidV4);
          expect(isFlowCallableInProd(spec)).toBe(spec.status !== 'deprecated');
        }
      }
    });

    it('all 15 known flows are authored or deployed (no stranded drafts)', () => {
      const draftKeys = catalogSpecs()
        .filter((spec) => spec.status === 'draft')
        .map((spec) => spec.key);
      expect(draftKeys, `these flows are still draft: ${draftKeys.join(', ')}`).toEqual([]);
    });

    it('flow ids are unique across the catalogue', () => {
      const ids = catalogSpecs().map((spec) => spec.id);
      expect(new Set<string>(ids).size).toBe(ids.length);
    });

    it('kbScopes only contain known collection scopes', () => {
      for (const spec of catalogSpecs()) {
        for (const scope of spec.kbScopes) {
          expect(SCOPE_SET.has(scope), `unknown scope "${scope}" on flow "${spec.key}"`).toBe(true);
        }
      }
    });

    it('tools are dotted-lowercase logical names (no Flowise id leakage)', () => {
      const toolPattern = /^[a-z][a-z0-9]*\.[a-z][a-z0-9_]*$/;
      for (const spec of catalogSpecs()) {
        for (const tool of spec.tools) {
          expect(tool, `tool "${tool}" on flow "${spec.key}" must match ${toolPattern}`).toMatch(toolPattern);
        }
      }
    });

    it('resolveFlowSpec returns the same object for every known key', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        expect(resolveFlowSpec(key)).toBe(FLOW_CATALOG[key]);
      }
    });

    it('resolveFlowSpec throws for an unknown key', () => {
      expect(() => resolveFlowSpec('ma.not.real' as FlowKey)).toThrow(/No Flowise catalogue entry/);
    });
  });
});
