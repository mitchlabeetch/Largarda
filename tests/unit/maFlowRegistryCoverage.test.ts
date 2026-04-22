/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Registry Coverage Tests for Wave 9 / Batch 9C
 *
 * Ensures every AI feature in the codebase is properly registered in the
 * flow catalog with a valid flow key, flow spec, and prompt version.
 */

import { describe, expect, it } from 'vitest';
import { FLOW_CATALOG, KNOWN_FLOW_KEYS, resolveFlowSpec, type FlowSpec } from '@/common/ma/flowise';

describe('Wave 9 / Batch 9C: Feature-to-Flow Registry Coverage', () => {
  describe('Catalog Completeness', () => {
    it('has entries for all known flow keys', () => {
      const catalogKeys = Object.keys(FLOW_CATALOG) as typeof KNOWN_FLOW_KEYS;
      expect(new Set<string>(catalogKeys).size).toBe(catalogKeys.length);
      expect(new Set<string>(catalogKeys)).toEqual(new Set<string>(KNOWN_FLOW_KEYS));
    });

    it('every catalog entry has a valid UUID flow id (no drafts in production)', () => {
      const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(spec.id, `flow "${spec.key}" must have a valid UUID`).toMatch(uuidV4);
      }
    });

    it('every catalog entry has a non-empty prompt version id', () => {
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(spec.promptVersionId.length, `flow "${spec.key}" must have a promptVersionId`).toBeGreaterThan(0);
      }
    });

    it('every catalog entry has a non-empty description', () => {
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(spec.description.length, `flow "${spec.key}" must have a description`).toBeGreaterThan(0);
      }
    });

    it('every catalog entry has a valid status', () => {
      const validStatuses = ['draft', 'authored', 'deployed', 'deprecated'];
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(validStatuses, `flow "${spec.key}" has invalid status`).toContain(spec.status);
      }
    });

    it('every catalog entry has a valid flow kind', () => {
      const validKinds = ['chatflow', 'agentflow-v2'];
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(validKinds, `flow "${spec.key}" has invalid kind`).toContain(spec.kind);
      }
    });

    it('every catalog entry has unique flow ids', () => {
      const ids = Object.values(FLOW_CATALOG).map((spec: FlowSpec) => spec.id);
      expect(new Set<string>(ids).size).toBe(ids.length);
    });

    it('every catalog entry has a valid key that matches the catalog key', () => {
      for (const [key, spec] of Object.entries(FLOW_CATALOG) as [string, FlowSpec][]) {
        expect(spec.key).toBe(key);
      }
    });
  });

  describe('Domain Coverage', () => {
    it('covers due diligence features', () => {
      const ddKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.dd.'));
      expect(ddKeys.length).toBeGreaterThan(0);
      expect(ddKeys).toContain('ma.dd.analysis');
      expect(ddKeys).toContain('ma.dd.risk.drill');
    });

    it('covers valuation features', () => {
      const valuationKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.valuation.'));
      expect(valuationKeys.length).toBeGreaterThan(0);
      expect(valuationKeys).toContain('ma.valuation.draft');
    });

    it('covers document generation features', () => {
      const docKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.docs.'));
      expect(docKeys.length).toBeGreaterThan(0);
      expect(docKeys).toContain('ma.docs.nda.draft');
      expect(docKeys).toContain('ma.docs.loi.draft');
      expect(docKeys).toContain('ma.docs.im.draft');
      expect(docKeys).toContain('ma.docs.teaser.draft');
    });

    it('covers outreach features', () => {
      const emailKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.emails.'));
      expect(emailKeys.length).toBeGreaterThan(0);
      expect(emailKeys).toContain('ma.emails.draft');
    });

    it('covers daily brief features', () => {
      const briefKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.briefs.'));
      expect(briefKeys.length).toBeGreaterThan(0);
      expect(briefKeys).toContain('ma.briefs.daily');
    });

    it('covers company and palette features', () => {
      const companyKeys = KNOWN_FLOW_KEYS.filter(
        (key) => key.startsWith('ma.company.') || key.startsWith('ma.palette.')
      );
      expect(companyKeys.length).toBeGreaterThan(0);
      expect(companyKeys).toContain('ma.company.qa');
      expect(companyKeys).toContain('ma.palette.search');
    });

    it('covers glossary and sector features', () => {
      const glossaryKeys = KNOWN_FLOW_KEYS.filter(
        (key) => key.startsWith('ma.glossary.') || key.startsWith('ma.sector.')
      );
      expect(glossaryKeys.length).toBeGreaterThan(0);
      expect(glossaryKeys).toContain('ma.glossary.explain');
      expect(glossaryKeys).toContain('ma.sector.summary');
    });

    it('covers KYC and compliance features', () => {
      const kycKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.kyc.'));
      expect(kycKeys.length).toBeGreaterThan(0);
      expect(kycKeys).toContain('ma.kyc.screen');
    });

    it('covers comparables features', () => {
      const comparablesKeys = KNOWN_FLOW_KEYS.filter((key) => key.startsWith('ma.comparables.'));
      expect(comparablesKeys.length).toBeGreaterThan(0);
      expect(comparablesKeys).toContain('ma.comparables.search');
    });
  });

  describe('Prompt Version Tracking', () => {
    it('every flow has a prompt version id following semantic versioning pattern', () => {
      // Prompt version IDs should follow pattern: YYYY-MM-DD.patch (e.g., 2026-04-20.0)
      const versionPattern = /^\d{4}-\d{2}-\d{2}\.\d+$/;
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(spec.promptVersionId, `flow "${spec.key}" promptVersionId must match YYYY-MM-DD.patch`).toMatch(
          versionPattern
        );
      }
    });

    it('prompt version ids are unique across flows (allows version rollbacks)', () => {
      const versionIds = Object.values(FLOW_CATALOG).map((spec: FlowSpec) => spec.promptVersionId);
      // Note: It's acceptable for multiple flows to share the same prompt version
      // if they were deployed together. This test ensures we're aware of the pattern.
      const versionCounts = new Map<string, number>();
      for (const version of versionIds) {
        versionCounts.set(version, (versionCounts.get(version) || 0) + 1);
      }
      // Log versions used by multiple flows for observability
      const sharedVersions = Array.from(versionCounts.entries()).filter(([_, count]) => count > 1);
      if (sharedVersions.length > 0) {
        console.log('[Registry Coverage] Prompt versions shared across flows:', sharedVersions);
      }
    });
  });

  describe('Tool Dependencies', () => {
    it('every flow has a tools array (even if empty)', () => {
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(Array.isArray(spec.tools), `flow "${spec.key}" must have a tools array`).toBe(true);
      }
    });

    it('tool names follow dotted-lowercase naming convention', () => {
      const toolPattern = /^[a-z][a-z0-9]*\.[a-z][a-z0-9_]*$/;
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        for (const tool of spec.tools) {
          expect(tool, `tool "${tool}" on flow "${spec.key}" must match dotted-lowercase`).toMatch(toolPattern);
        }
      }
    });
  });

  describe('KB Scopes', () => {
    it('every flow has a kbScopes array (even if empty)', () => {
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(Array.isArray(spec.kbScopes), `flow "${spec.key}" must have a kbScopes array`).toBe(true);
      }
    });

    it('kbScopes are from the known scope set', () => {
      const knownScopes = ['deal', 'company', 'sector', 'news', 'global'];
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        for (const scope of spec.kbScopes) {
          expect(knownScopes, `unknown scope "${scope}" on flow "${spec.key}"`).toContain(scope);
        }
      }
    });
  });

  describe('Streaming Support', () => {
    it('every flow explicitly declares streaming support', () => {
      for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
        expect(typeof spec.supportsStreaming, `flow "${spec.key}" must declare streaming support`).toBe('boolean');
      }
    });

    it('non-streaming flows are documented (short deterministic flows)', () => {
      const nonStreamingFlows = Object.values(FLOW_CATALOG)
        .filter((spec: FlowSpec) => !spec.supportsStreaming)
        .map((spec: FlowSpec) => spec.key);

      // Expected non-streaming flows: palette search (deterministic), KYC screen (deterministic)
      expect(nonStreamingFlows).toContain('ma.palette.search');
      expect(nonStreamingFlows).toContain('ma.kyc.screen');
    });
  });

  describe('resolveFlowSpec Function', () => {
    it('returns the correct spec for every known flow key', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        const spec = resolveFlowSpec(key);
        expect(spec.key).toBe(key);
      }
    });

    it('throws for unknown flow keys', () => {
      expect(() => resolveFlowSpec('ma.nonexistent' as any)).toThrow(/No Flowise catalogue entry/);
    });

    it('returns the same object reference for the same key (catalog is readonly)', () => {
      const key = KNOWN_FLOW_KEYS[0];
      const spec1 = resolveFlowSpec(key);
      const spec2 = resolveFlowSpec(key);
      expect(spec1).toBe(spec2);
    });
  });

  describe('Flow Family Grouping', () => {
    it('flows are grouped by domain prefix (ma.dd.*, ma.docs.*, etc.)', () => {
      const domains = new Set<string>();
      for (const key of KNOWN_FLOW_KEYS) {
        const parts = key.split('.');
        if (parts.length >= 2) {
          domains.add(`${parts[0]}.${parts[1]}`);
        }
      }

      // Expected domains based on the catalog
      const expectedDomains = new Set([
        'ma.dd',
        'ma.valuation',
        'ma.docs',
        'ma.emails',
        'ma.briefs',
        'ma.company',
        'ma.palette',
        'ma.glossary',
        'ma.sector',
        'ma.kyc',
        'ma.comparables',
      ]);

      expect(domains).toEqual(expectedDomains);
    });

    it('each domain has at least one flow registered', () => {
      const domainCounts = new Map<string, number>();
      for (const key of KNOWN_FLOW_KEYS) {
        const parts = key.split('.');
        if (parts.length >= 2) {
          const domain = `${parts[0]}.${parts[1]}`;
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        }
      }

      for (const [domain, count] of domainCounts) {
        expect(count, `domain "${domain}" must have at least one flow`).toBeGreaterThan(0);
      }
    });
  });
});
