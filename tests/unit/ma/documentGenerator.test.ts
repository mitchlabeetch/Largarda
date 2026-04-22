/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DocumentGenerator,
  GenerationCancelledError,
  MissingVariablesError,
  initDocumentGenerator,
  getDocumentGenerator,
} from '@process/services/ma/DocumentGenerator';
import type { FlowRunner, GenerateInput, GenerationProgress } from '@process/services/ma/DocumentGenerator';

// ============================================================================
// Mock FlowRunner
// ============================================================================

function createMockRunner(response = 'Generated document content'): FlowRunner {
  return {
    run: vi.fn().mockResolvedValue(response),
  };
}

function createFailingRunner(error: Error): FlowRunner {
  return {
    run: vi.fn().mockRejectedValue(error),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('DocumentGenerator', () => {
  let generator: DocumentGenerator;
  let mockRunner: FlowRunner;
  let progressEvents: GenerationProgress[];

  beforeEach(() => {
    mockRunner = createMockRunner();
    progressEvents = [];
    generator = new DocumentGenerator(mockRunner, (p: GenerationProgress) => progressEvents.push(p));
  });

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  describe('generate (happy path)', () => {
    it('generates an NDA document with all required variables', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-001',
        variables: {
          dealId: 'deal-001',
          disclosingParty: 'Acme Corp',
          receivingParty: 'Beta LLC',
        },
      };

      const result = await generator.generate(input);

      expect(result.id).toMatch(/^gen_/);
      expect(result.dealId).toBe('deal-001');
      expect(result.templateKey).toBe('tpl.nda');
      expect(result.outputFormat).toBe('markdown');
      expect(result.content).toContain('Generated document content');
      expect(result.reviewStatus).toBe('generated');
      expect(result.provenance.templateKey).toBe('tpl.nda');
      expect(result.provenance.contentHash).toBeTruthy();
      expect(result.provenance.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.createdAt).toBeGreaterThan(0);
      expect(result.updatedAt).toBeGreaterThan(0);
    });

    it('generates an LOI document', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.loi',
        dealId: 'deal-002',
        variables: {
          dealId: 'deal-002',
          buyerName: 'Alpha Inc',
          targetName: 'Target SA',
        },
      };

      const result = await generator.generate(input);
      expect(result.templateKey).toBe('tpl.loi');
      expect(result.provenance.templateKey).toBe('tpl.loi');
    });

    it('generates a valuation report', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.valuation',
        dealId: 'deal-003',
        variables: {
          dealId: 'deal-003',
          targetName: 'Gamma SARL',
        },
      };

      const result = await generator.generate(input);
      expect(result.templateKey).toBe('tpl.valuation');
    });

    it('generates a DD report', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.dd',
        dealId: 'deal-004',
        variables: {
          dealId: 'deal-004',
          dealName: 'Project Delta',
        },
      };

      const result = await generator.generate(input);
      expect(result.templateKey).toBe('tpl.dd');
    });

    it('generates a teaser', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.teaser',
        dealId: 'deal-005',
        variables: {
          dealId: 'deal-005',
        },
      };

      const result = await generator.generate(input);
      expect(result.templateKey).toBe('tpl.teaser');
    });

    it('generates an IM', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.im',
        dealId: 'deal-006',
        variables: {
          dealId: 'deal-006',
          targetName: 'Epsilon SAS',
        },
      };

      const result = await generator.generate(input);
      expect(result.templateKey).toBe('tpl.im');
    });

    it('stamps provenance label into content', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-007',
        variables: {
          dealId: 'deal-007',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      const result = await generator.generate(input);
      expect(result.content).toContain('largo-provenance:');
      expect(result.content).toContain('template: tpl.nda');
      expect(result.content).toContain('content-sha256:');
    });

    it('passes optional variables and overrideConfig to the flow runner', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-008',
        variables: {
          dealId: 'deal-008',
          disclosingParty: 'A',
          receivingParty: 'B',
          jurisdiction: 'France',
        },
        overrideConfig: { temperature: 0.7 },
      };

      await generator.generate(input);

      expect(mockRunner.run).toHaveBeenCalledOnce();
      const [flowId, _question, overrideConfig] = mockRunner.run.mock.calls[0] as [
        string,
        string,
        Record<string, unknown> | undefined,
      ];
      expect(flowId).toBeTruthy();
      expect(overrideConfig).toEqual({ temperature: 0.7 });
    });
  });

  // --------------------------------------------------------------------------
  // Progress reporting
  // --------------------------------------------------------------------------

  describe('progress reporting', () => {
    it('emits progress events at each stage', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-009',
        variables: {
          dealId: 'deal-009',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      await generator.generate(input);

      const stages = progressEvents.map((e) => e.stage);
      expect(stages).toContain('validating');
      expect(stages).toContain('generating');
      expect(stages).toContain('stamping');
      expect(stages).toContain('complete');
    });

    it('reports monotonically non-decreasing progress', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-010',
        variables: {
          dealId: 'deal-010',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      await generator.generate(input);

      const progresses = progressEvents.map((e) => e.progress);
      for (let i = 1; i < progresses.length; i++) {
        expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1]);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Error cases
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('throws MissingVariablesError when required variables are missing', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-err',
        variables: {},
      };

      await expect(generator.generate(input)).rejects.toThrow(MissingVariablesError);
      await expect(generator.generate(input)).rejects.toThrow(/disclosingParty/);
    });

    it('includes all missing keys in MissingVariablesError', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-err',
        variables: {},
      };

      try {
        await generator.generate(input);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MissingVariablesError);
        const missing = (error as MissingVariablesError).missingKeys;
        expect(missing).toContain('dealId');
        expect(missing).toContain('disclosingParty');
        expect(missing).toContain('receivingParty');
      }
    });

    it('throws and reports error when Flowise runner fails', async () => {
      const failingRunner = createFailingRunner(new Error('Flowise timeout'));
      const gen = new DocumentGenerator(failingRunner, (p: GenerationProgress) => progressEvents.push(p));

      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-err',
        variables: {
          dealId: 'deal-err',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      await expect(gen.generate(input)).rejects.toThrow('Flowise timeout');

      const errorEvents = progressEvents.filter((e) => e.stage === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('throws GenerationCancelledError when cancel signal is set', async () => {
      const cancelSignal = { cancelled: false };
      const slowRunner: FlowRunner = {
        run: vi.fn().mockImplementation(async () => {
          cancelSignal.cancelled = true;
          return 'content';
        }),
      };
      const gen = new DocumentGenerator(slowRunner, (p: GenerationProgress) => progressEvents.push(p));

      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-cancel',
        variables: {
          dealId: 'deal-cancel',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      // Cancel before generation starts
      cancelSignal.cancelled = true;
      await expect(gen.generate(input, cancelSignal)).rejects.toThrow(GenerationCancelledError);
    });
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe('singleton', () => {
    it('throws if getDocumentGenerator is called before init', () => {
      // Reset singleton by importing fresh — but since module state persists,
      // we test the error path by checking the function throws when not initialised.
      // The singleton is shared across tests, so we just verify the shape.
      expect(() => getDocumentGenerator()).toThrow(/not initialised/i);
    });

    it('initialises and returns the generator', () => {
      const runner = createMockRunner();
      const gen = initDocumentGenerator(runner);
      expect(gen).toBeInstanceOf(DocumentGenerator);
    });
  });
});
