/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ChecklistGenerator Service
 *
 * Generates structured documents (NDA, LOI, DD checklist) using local
 * renderers from the template registry. Unlike `DocumentGenerator` which
 * calls Flowise, this generator produces deterministic output locally
 * and stamps it with provenance metadata.
 *
 * Use this generator when:
 * - A local renderer exists in `RENDERER_MAP` for the template key.
 * - Deterministic, repeatable output is required (e.g. checklists).
 * - No AI orchestration is needed.
 *
 * Fall through to `DocumentGenerator` (Flowise path) for templates
 * without a local renderer.
 */

import { createHash } from 'crypto';
import type { TemplateKey } from '@/common/ma/template/types';
import type { GeneratedDocument, DocumentReviewStatus } from '@/common/ma/template/review';
import { resolveTemplateSpec, validateTemplateVariables } from '@/common/ma/template/registry';
import { resolveRenderer } from '@/common/ma/template/renderers';
import { buildProvenance, stampProvenanceLabel } from '@/common/ma/template/provenance';

// ============================================================================
// Types
// ============================================================================

/**
 * Input to the checklist generator.
 */
export type ChecklistGenerateInput = {
  /** Template key identifying which document to generate. */
  templateKey: TemplateKey;
  /** Deal id this generation belongs to. */
  dealId: string;
  /** Variables to fill the template. */
  variables: Record<string, unknown>;
};

/**
 * Result of a checklist generation attempt.
 */
export type ChecklistGenerateResult =
  | { ok: true; document: GeneratedDocument }
  | { ok: false; error: string; missingKeys?: string[] };

// ============================================================================
// ChecklistGenerator Class
// ============================================================================

export class ChecklistGenerator {
  /**
   * Generate a document using a local renderer.
   *
   * @param input - Generation input (template key, deal id, variables).
   * @returns A `ChecklistGenerateResult` — either a `GeneratedDocument`
   *   envelope or an error description.
   */
  generate(input: ChecklistGenerateInput): ChecklistGenerateResult {
    try {
      // 1. Resolve template spec
      const spec = resolveTemplateSpec(input.templateKey);

      // 2. Validate required variables
      const missing = validateTemplateVariables(input.templateKey, input.variables);
      if (missing.length > 0) {
        return { ok: false, error: `Missing required variables: ${missing.join(', ')}`, missingKeys: missing };
      }

      // 3. Resolve local renderer
      const renderer = resolveRenderer(input.templateKey);
      if (!renderer) {
        return {
          ok: false,
          error: `No local renderer for templateKey "${input.templateKey}". Use DocumentGenerator instead.`,
        };
      }

      // 4. Render content
      const startedAt = Date.now();
      const rawContent = renderer(input.variables);

      // 5. Build provenance (local renderer uses "local" as flow id)
      const provenance = buildProvenance(input.templateKey, 'local', spec.flowKey, startedAt, rawContent);

      // 6. Stamp provenance label
      const stampedContent = stampProvenanceLabel(rawContent, provenance);

      // 7. Build envelope
      const now = Date.now();
      const document: GeneratedDocument = {
        id: this.generateId(),
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

      return { ok: true, document };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }

  /**
   * Generate a unique document id.
   */
  private generateId(): string {
    const hash = createHash('md5').update(`clg_${Date.now()}_${Math.random()}`).digest('hex');
    return `clg_${hash.substring(0, 16)}`;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let checklistInstance: ChecklistGenerator | null = null;

/**
 * Get the process-level ChecklistGenerator singleton.
 */
export function getChecklistGenerator(): ChecklistGenerator {
  if (!checklistInstance) {
    checklistInstance = new ChecklistGenerator();
  }
  return checklistInstance;
}
