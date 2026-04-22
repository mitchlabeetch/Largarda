/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DocumentGenerator Service
 *
 * Reusable document-generation backbone for Largo M&A outputs (NDA, LOI,
 * DD report, teaser, IM, valuation). Orchestrates template lookup,
 * variable validation, Flowise invocation, provenance stamping, and
 * review-state initialisation.
 *
 * Pure logic is separated from IO: the generator receives a `FlowRunner`
 * interface so it can be tested without a live Flowise backend.
 */

import { createHash } from 'crypto';
import type { TemplateKey } from '@/common/ma/template/types';
import type { GeneratedDocument, DocumentReviewStatus } from '@/common/ma/template/review';
import {
  resolveTemplateSpec,
  validateTemplateVariables,
  isTemplateCallableInProd,
} from '@/common/ma/template/registry';
import { buildProvenance, stampProvenanceLabel } from '@/common/ma/template/provenance';
import { resolveFlowSpec } from '@/common/ma/flowise/catalog';

// ============================================================================
// Types
// ============================================================================

/**
 * Abstraction over Flowise invocation. Injected so the generator
 * can be tested without a live backend.
 */
export type FlowRunner = {
  /**
   * Run a Flowise flow and return the text output.
   * @param flowId - The Flowise flow UUID.
   * @param question - The prompt/question to send.
   * @param overrideConfig - Optional override config for the flow.
   */
  run(flowId: string, question: string, overrideConfig?: Record<string, unknown>): Promise<string>;
};

/**
 * Input to the generator.
 */
export type GenerateInput = {
  /** Template key identifying which document to generate. */
  templateKey: TemplateKey;
  /** Deal id this generation belongs to. */
  dealId: string;
  /** Variables to fill the template. */
  variables: Record<string, unknown>;
  /** Optional override config forwarded to the Flowise flow. */
  overrideConfig?: Record<string, unknown>;
};

/**
 * Progress event emitted during generation.
 */
export type GenerationProgress = {
  /** Unique id for this generation run. */
  generationId: string;
  /** Current stage. */
  stage: 'validating' | 'generating' | 'stamping' | 'complete' | 'error';
  /** Progress 0-100. */
  progress: number;
  /** Human-readable message. */
  message?: string;
};

/**
 * Cooperative cancellation signal (mirrors DocumentProcessor pattern).
 */
export type GeneratorCancelSignal = {
  cancelled: boolean;
};

/** Thrown when generation is aborted via `GeneratorCancelSignal`. */
export class GenerationCancelledError extends Error {
  constructor(message = 'Document generation cancelled') {
    super(message);
    this.name = 'GenerationCancelledError';
  }
}

/** Thrown when required variables are missing. */
export class MissingVariablesError extends Error {
  constructor(
    public readonly missingKeys: string[],
    message?: string
  ) {
    super(message ?? `Missing required variables: ${missingKeys.join(', ')}`);
    this.name = 'MissingVariablesError';
  }
}

/** Thrown when a template is not callable in the current environment. */
export class TemplateNotCallableError extends Error {
  constructor(templateKey: TemplateKey, status: string) {
    super(`Template "${templateKey}" is not callable (status: ${status})`);
    this.name = 'TemplateNotCallableError';
  }
}

// ============================================================================
// DocumentGenerator Class
// ============================================================================

/**
 * DocumentGenerator orchestrates the generation pipeline:
 *   1. Resolve template spec from registry
 *   2. Validate required variables
 *   3. Check template is callable
 *   4. Invoke Flowise flow via injected `FlowRunner`
 *   5. Stamp provenance label
 *   6. Build `GeneratedDocument` envelope
 */
export class DocumentGenerator {
  private progressCallback?: (progress: GenerationProgress) => void;

  constructor(
    private readonly flowRunner: FlowRunner,
    progressCallback?: (progress: GenerationProgress) => void
  ) {
    this.progressCallback = progressCallback;
  }

  /**
   * Generate a document from a template.
   *
   * @param input - Generation input (template key, deal id, variables).
   * @param cancelSignal - Optional cooperative cancellation.
   * @returns A `GeneratedDocument` envelope.
   */
  async generate(input: GenerateInput, cancelSignal?: GeneratorCancelSignal): Promise<GeneratedDocument> {
    const generationId = this.generateId();
    const startedAt = Date.now();

    const throwIfCancelled = () => {
      if (cancelSignal?.cancelled) throw new GenerationCancelledError();
    };

    try {
      // Stage 1: Validate
      throwIfCancelled();
      this.reportProgress(generationId, 'validating', 10, 'Validating template and variables');

      const spec = resolveTemplateSpec(input.templateKey);

      const missing = validateTemplateVariables(input.templateKey, input.variables);
      if (missing.length > 0) {
        throw new MissingVariablesError(missing);
      }

      if (!isTemplateCallableInProd(spec)) {
        throw new TemplateNotCallableError(input.templateKey, spec.status);
      }

      // Stage 2: Generate via Flowise
      throwIfCancelled();
      this.reportProgress(generationId, 'generating', 30, 'Invoking Flowise flow');

      const flowSpec = resolveFlowSpec(spec.flowKey as Parameters<typeof resolveFlowSpec>[0]);
      const question = this.buildQuestion(input.variables);
      const rawContent = await this.flowRunner.run(flowSpec.id, question, input.overrideConfig);

      // Stage 3: Stamp provenance
      throwIfCancelled();
      this.reportProgress(generationId, 'stamping', 80, 'Stamping provenance label');

      const provenance = buildProvenance(
        input.templateKey,
        flowSpec.id,
        flowSpec.promptVersionId,
        startedAt,
        rawContent
      );

      const stampedContent = stampProvenanceLabel(rawContent, provenance);

      // Stage 4: Complete
      throwIfCancelled();
      this.reportProgress(generationId, 'complete', 100, 'Generation complete');

      const now = Date.now();
      return {
        id: generationId,
        dealId: input.dealId,
        templateKey: input.templateKey,
        outputFormat: spec.outputFormat,
        content: stampedContent,
        variables: input.variables,
        reviewStatus: 'generated' as DocumentReviewStatus,
        provenance,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: unknown) {
      if (error instanceof GenerationCancelledError) {
        this.reportProgress(generationId, 'error', 0, error.message);
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.reportProgress(generationId, 'error', 0, message);
      throw error;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Build a question string from template variables.
   * Serialises the variables as a JSON block for the Flowise flow.
   */
  private buildQuestion(variables: Record<string, unknown>): string {
    return JSON.stringify(variables);
  }

  /**
   * Generate a unique document generation id.
   */
  private generateId(): string {
    const hash = createHash('md5').update(`gen_${Date.now()}_${Math.random()}`).digest('hex');
    return `gen_${hash.substring(0, 16)}`;
  }

  /**
   * Report generation progress.
   */
  private reportProgress(
    generationId: string,
    stage: GenerationProgress['stage'],
    progress: number,
    message?: string
  ): void {
    this.progressCallback?.({ generationId, stage, progress, message });
  }
}

// ============================================================================
// Singleton (lazy, for main-process use)
// ============================================================================

let generatorInstance: DocumentGenerator | null = null;

/**
 * Get the process-level DocumentGenerator singleton.
 * Must be initialised with a `FlowRunner` via `initDocumentGenerator`
 * before first use.
 */
export function getDocumentGenerator(): DocumentGenerator {
  if (!generatorInstance) {
    throw new Error('DocumentGenerator not initialised. Call initDocumentGenerator() first.');
  }
  return generatorInstance;
}

/**
 * Initialise the process-level DocumentGenerator with a FlowRunner.
 */
export function initDocumentGenerator(flowRunner: FlowRunner): DocumentGenerator {
  generatorInstance = new DocumentGenerator(flowRunner);
  return generatorInstance;
}
