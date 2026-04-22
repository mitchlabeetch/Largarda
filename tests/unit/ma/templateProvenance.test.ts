/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  hashContent,
  buildProvenance,
  renderProvenanceLabel,
  parseProvenanceLabel,
  stampProvenanceLabel,
  verifyProvenanceIntegrity,
} from '@/common/ma/template/provenance';
import type { GenerationProvenance } from '@/common/ma/template/review';

// ============================================================================
// Tests
// ============================================================================

describe('Provenance Labeling', () => {
  // --------------------------------------------------------------------------
  // hashContent
  // --------------------------------------------------------------------------

  describe('hashContent', () => {
    it('produces a 64-char hex SHA-256 hash', () => {
      const hash = hashContent('hello world');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces the same hash for the same content', () => {
      const a = hashContent('test content');
      const b = hashContent('test content');
      expect(a).toBe(b);
    });

    it('produces different hashes for different content', () => {
      const a = hashContent('content A');
      const b = hashContent('content B');
      expect(a).not.toBe(b);
    });

    it('handles empty string', () => {
      const hash = hashContent('');
      expect(hash).toHaveLength(64);
    });
  });

  // --------------------------------------------------------------------------
  // buildProvenance
  // --------------------------------------------------------------------------

  describe('buildProvenance', () => {
    it('builds a provenance stamp with all fields', () => {
      const startedAt = Date.now() - 1000;
      const provenance = buildProvenance('tpl.nda', 'flow-id-123', '2026-04-20.0', startedAt, 'NDA content here');

      expect(provenance.templateKey).toBe('tpl.nda');
      expect(provenance.flowId).toBe('flow-id-123');
      expect(provenance.promptVersionId).toBe('2026-04-20.0');
      expect(provenance.startedAt).toBe(startedAt);
      expect(provenance.completedAt).toBeGreaterThanOrEqual(startedAt);
      expect(provenance.durationMs).toBeGreaterThanOrEqual(0);
      expect(provenance.contentHash).toBe(hashContent('NDA content here'));
    });

    it('computes durationMs correctly', () => {
      const startedAt = Date.now() - 5000;
      const provenance = buildProvenance('tpl.loi', 'flow-id-456', '2026-04-20.0', startedAt, 'LOI content');

      expect(provenance.durationMs).toBe(provenance.completedAt - provenance.startedAt);
    });
  });

  // --------------------------------------------------------------------------
  // renderProvenanceLabel
  // --------------------------------------------------------------------------

  describe('renderProvenanceLabel', () => {
    it('renders a structured YAML-like label', () => {
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'flow-123',
        promptVersionId: '2026-04-20.0',
        startedAt: 1700000000000,
        completedAt: 1700000005000,
        durationMs: 5000,
        contentHash: 'abc123def456',
      };

      const label = renderProvenanceLabel(provenance);

      expect(label).toContain('largo-provenance:');
      expect(label).toContain('template: tpl.nda');
      expect(label).toContain('flow-id: flow-123');
      expect(label).toContain('prompt-version: 2026-04-20.0');
      expect(label).toContain('duration-ms: 5000');
      expect(label).toContain('content-sha256: abc123def456');
      expect(label).toContain('generated-at:');
    });

    it('starts and ends with --- delimiters', () => {
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f',
        promptVersionId: 'v1',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        contentHash: 'h',
      };

      const label = renderProvenanceLabel(provenance);
      expect(label.startsWith('---')).toBe(true);
      expect(label.endsWith('---')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // parseProvenanceLabel
  // --------------------------------------------------------------------------

  describe('parseProvenanceLabel', () => {
    it('round-trips through render and parse', () => {
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'flow-abc',
        promptVersionId: '2026-04-20.0',
        startedAt: Date.now() - 3000,
        completedAt: Date.now(),
        durationMs: 3000,
        contentHash: hashContent('test'),
      };

      const label = renderProvenanceLabel(provenance);
      const content = 'Document body\n' + label;
      const parsed = parseProvenanceLabel(content);

      expect(parsed).not.toBeNull();
      expect(parsed!.templateKey).toBe('tpl.nda');
      expect(parsed!.flowId).toBe('flow-abc');
      expect(parsed!.promptVersionId).toBe('2026-04-20.0');
      expect(parsed!.durationMs).toBe(3000);
      expect(parsed!.contentHash).toBe(provenance.contentHash);
    });

    it('returns null for content without a label', () => {
      const parsed = parseProvenanceLabel('Just some content without a label');
      expect(parsed).toBeNull();
    });

    it('returns null for malformed label', () => {
      const content = '---\nlargo-provenance:\n  broken: data\n---';
      const parsed = parseProvenanceLabel(content);
      expect(parsed).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // stampProvenanceLabel
  // --------------------------------------------------------------------------

  describe('stampProvenanceLabel', () => {
    it('appends a provenance label to content', () => {
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f',
        promptVersionId: 'v1',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        contentHash: 'h',
      };

      const result = stampProvenanceLabel('My document', provenance);
      expect(result).toContain('My document');
      expect(result).toContain('largo-provenance:');
    });

    it('replaces an existing provenance label', () => {
      const provenance1: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f1',
        promptVersionId: 'v1',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        contentHash: 'h1',
      };

      const provenance2: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f2',
        promptVersionId: 'v2',
        startedAt: 3000,
        completedAt: 4000,
        durationMs: 1000,
        contentHash: 'h2',
      };

      const stamped1 = stampProvenanceLabel('Content', provenance1);
      const stamped2 = stampProvenanceLabel(stamped1, provenance2);

      // Should only have one provenance label
      const matches = stamped2.match(/largo-provenance:/g);
      expect(matches).toHaveLength(1);

      // Should contain the new flow id
      expect(stamped2).toContain('flow-id: f2');
    });
  });

  // --------------------------------------------------------------------------
  // verifyProvenanceIntegrity
  // --------------------------------------------------------------------------

  describe('verifyProvenanceIntegrity', () => {
    it('returns true when content hash matches', () => {
      const content = 'Original content';
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f',
        promptVersionId: 'v1',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        contentHash: hashContent(content),
      };

      const stamped = stampProvenanceLabel(content, provenance);
      expect(verifyProvenanceIntegrity(stamped, provenance)).toBe(true);
    });

    it('returns false when content has been tampered with', () => {
      const content = 'Original content';
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f',
        promptVersionId: 'v1',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        contentHash: hashContent(content),
      };

      const stamped = stampProvenanceLabel(content, provenance);
      const tampered = stamped.replace('Original content', 'Tampered content');
      expect(verifyProvenanceIntegrity(tampered, provenance)).toBe(false);
    });

    it('returns false when provenance hash does not match content', () => {
      const content = 'Some content';
      const provenance: GenerationProvenance = {
        templateKey: 'tpl.nda',
        flowId: 'f',
        promptVersionId: 'v1',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        contentHash: 'wronghash',
      };

      const stamped = stampProvenanceLabel(content, provenance);
      expect(verifyProvenanceIntegrity(stamped, provenance)).toBe(false);
    });
  });
});
