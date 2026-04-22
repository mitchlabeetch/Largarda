/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ChecklistGenerator } from '@process/services/ma/ChecklistGenerator';
import { DocumentGenerator } from '@process/services/ma/DocumentGenerator';
import type { FlowRunner, GenerateInput } from '@process/services/ma/DocumentGenerator';
import type { ChecklistGenerateInput } from '@process/services/ma/ChecklistGenerator';
import {
  parseProvenanceLabel,
  verifyProvenanceIntegrity,
  renderProvenanceLabel,
} from '@/common/ma/template/provenance';
import { GeneratedDocumentSchema } from '@/common/ma/template/review';

// ============================================================================
// Helpers
// ============================================================================

const mockRunner: FlowRunner = {
  run: async () => 'AI-generated document content',
};

// ============================================================================
// Tests
// ============================================================================

describe('Provenance Visibility', () => {
  // --------------------------------------------------------------------------
  // ChecklistGenerator provenance
  // --------------------------------------------------------------------------

  describe('ChecklistGenerator provenance', () => {
    const generator = new ChecklistGenerator();

    it('NDA: provenance label is present in generated content', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-p1',
        variables: { dealId: 'deal-p1', disclosingParty: 'A', receivingParty: 'B' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.document.content).toContain('largo-provenance:');
        expect(result.document.content).toContain('template: tpl.nda');
      }
    });

    it('LOI: provenance label is present in generated content', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.loi',
        dealId: 'deal-p2',
        variables: { dealId: 'deal-p2', buyerName: 'Buyer', targetName: 'Target' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.document.content).toContain('largo-provenance:');
        expect(result.document.content).toContain('template: tpl.loi');
      }
    });

    it('DD: provenance label is present in generated content', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.dd',
        dealId: 'deal-p3',
        variables: { dealId: 'deal-p3', dealName: 'Project X' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.document.content).toContain('largo-provenance:');
        expect(result.document.content).toContain('template: tpl.dd');
      }
    });

    it('provenance label is parseable from generated content', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-p4',
        variables: { dealId: 'deal-p4', disclosingParty: 'A', receivingParty: 'B' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = parseProvenanceLabel(result.document.content);
        expect(parsed).not.toBeNull();
        expect(parsed!.templateKey).toBe('tpl.nda');
        expect(parsed!.flowId).toBe('local');
        expect(parsed!.contentHash).toBeTruthy();
        expect(parsed!.durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('provenance content hash verifies integrity', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-p5',
        variables: { dealId: 'deal-p5', disclosingParty: 'A', receivingParty: 'B' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const isValid = verifyProvenanceIntegrity(result.document.content, result.document.provenance);
        expect(isValid).toBe(true);
      }
    });

    it('tampered content fails integrity check', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-p6',
        variables: { dealId: 'deal-p6', disclosingParty: 'A', receivingParty: 'B' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const tampered = result.document.content.replace('Disclosing Party', 'TAMPERED PARTY');
        const isValid = verifyProvenanceIntegrity(tampered, result.document.provenance);
        expect(isValid).toBe(false);
      }
    });

    it('provenance object on document matches parsed label', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.dd',
        dealId: 'deal-p7',
        variables: { dealId: 'deal-p7', dealName: 'Project Y' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = parseProvenanceLabel(result.document.content);
        expect(parsed).not.toBeNull();
        expect(parsed!.templateKey).toBe(result.document.provenance.templateKey);
        expect(parsed!.contentHash).toBe(result.document.provenance.contentHash);
        expect(parsed!.durationMs).toBe(result.document.provenance.durationMs);
      }
    });
  });

  // --------------------------------------------------------------------------
  // DocumentGenerator provenance
  // --------------------------------------------------------------------------

  describe('DocumentGenerator provenance', () => {
    const generator = new DocumentGenerator(mockRunner);

    it('provenance label is present in Flowise-generated content', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-dp1',
        variables: { dealId: 'deal-dp1', disclosingParty: 'A', receivingParty: 'B' },
      };

      const doc = await generator.generate(input);
      expect(doc.content).toContain('largo-provenance:');
      expect(doc.content).toContain('template: tpl.nda');
    });

    it('provenance label is parseable from Flowise-generated content', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-dp2',
        variables: { dealId: 'deal-dp2', disclosingParty: 'A', receivingParty: 'B' },
      };

      const doc = await generator.generate(input);
      const parsed = parseProvenanceLabel(doc.content);
      expect(parsed).not.toBeNull();
      expect(parsed!.templateKey).toBe('tpl.nda');
    });

    it('content hash verifies integrity for Flowise output', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-dp3',
        variables: { dealId: 'deal-dp3', disclosingParty: 'A', receivingParty: 'B' },
      };

      const doc = await generator.generate(input);
      expect(verifyProvenanceIntegrity(doc.content, doc.provenance)).toBe(true);
    });

    it('tampered Flowise output fails integrity check', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-dp4',
        variables: { dealId: 'deal-dp4', disclosingParty: 'A', receivingParty: 'B' },
      };

      const doc = await generator.generate(input);
      const tampered = doc.content.replace('AI-generated', 'tampered');
      expect(verifyProvenanceIntegrity(tampered, doc.provenance)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Provenance label rendering
  // --------------------------------------------------------------------------

  describe('renderProvenanceLabel', () => {
    it('contains all required fields', () => {
      const provenance = {
        templateKey: 'tpl.nda' as const,
        flowId: 'flow-abc',
        promptVersionId: '2026-04-20.0',
        startedAt: 1700000000000,
        completedAt: 1700000005000,
        durationMs: 5000,
        contentHash: 'abc123',
      };

      const label = renderProvenanceLabel(provenance);
      expect(label).toContain('template: tpl.nda');
      expect(label).toContain('flow-id: flow-abc');
      expect(label).toContain('prompt-version: 2026-04-20.0');
      expect(label).toContain('duration-ms: 5000');
      expect(label).toContain('content-sha256: abc123');
      expect(label).toContain('generated-at:');
    });
  });

  // --------------------------------------------------------------------------
  // GeneratedDocument schema validation
  // --------------------------------------------------------------------------

  describe('GeneratedDocument schema', () => {
    const generator = new ChecklistGenerator();

    it('produces documents that pass Zod schema validation', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-s1',
        variables: { dealId: 'deal-s1', disclosingParty: 'A', receivingParty: 'B' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = GeneratedDocumentSchema.safeParse(result.document);
        expect(parsed.success).toBe(true);
      }
    });

    it('LOI document passes Zod schema validation', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.loi',
        dealId: 'deal-s2',
        variables: { dealId: 'deal-s2', buyerName: 'B', targetName: 'T' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = GeneratedDocumentSchema.safeParse(result.document);
        expect(parsed.success).toBe(true);
      }
    });

    it('DD checklist passes Zod schema validation', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.dd',
        dealId: 'deal-s3',
        variables: { dealId: 'deal-s3', dealName: 'Project Z' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = GeneratedDocumentSchema.safeParse(result.document);
        expect(parsed.success).toBe(true);
      }
    });
  });
});
