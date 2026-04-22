/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Provenance Labeling Utilities
 *
 * Functions for stamping generated documents with honest provenance
 * metadata: who generated it, when, from which template, and a content
 * hash for tamper detection.
 *
 * Provenance labels are embedded in the `GenerationProvenance` field of
 * every `GeneratedDocument` and are also rendered as a machine-readable
 * footer in the exported content.
 */

import { createHash } from 'crypto';
import type { TemplateKey } from './types';
import type { GenerationProvenance } from './review';

// ============================================================================
// Content Hashing
// ============================================================================

/**
 * Compute a SHA-256 hash of the generated content.
 * Returns the hex-encoded digest.
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// ============================================================================
// Provenance Stamp Builder
// ============================================================================

/**
 * Build a `GenerationProvenance` stamp from generation parameters.
 *
 * @param templateKey - The template key used.
 * @param flowId - The Flowise flow id that was called.
 * @param promptVersionId - The prompt version id.
 * @param startedAt - Epoch millis when generation started.
 * @param content - The generated content (will be hashed).
 */
export function buildProvenance(
  templateKey: TemplateKey,
  flowId: string,
  promptVersionId: string,
  startedAt: number,
  content: string
): GenerationProvenance {
  const completedAt = Date.now();
  return {
    templateKey,
    flowId,
    promptVersionId,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    contentHash: hashContent(content),
  };
}

// ============================================================================
// Provenance Label Rendering
// ============================================================================

/**
 * Render a machine-readable provenance footer for embedding in the
 * exported document content. The footer is a structured comment block
 * that downstream consumers can parse.
 */
export function renderProvenanceLabel(provenance: GenerationProvenance): string {
  const lines = [
    '---',
    'largo-provenance:',
    `  template: ${provenance.templateKey}`,
    `  flow-id: ${provenance.flowId}`,
    `  prompt-version: ${provenance.promptVersionId}`,
    `  generated-at: ${new Date(provenance.completedAt).toISOString()}`,
    `  duration-ms: ${provenance.durationMs}`,
    `  content-sha256: ${provenance.contentHash}`,
    '---',
  ];
  return lines.join('\n');
}

/**
 * Parse a provenance label from a document content string.
 * Returns `null` if no valid label is found.
 */
export function parseProvenanceLabel(content: string): GenerationProvenance | null {
  const match = content.match(
    /---\nlargo-provenance:\n\s+template: (.+)\n\s+flow-id: (.+)\n\s+prompt-version: (.+)\n\s+generated-at: (.+)\n\s+duration-ms: (\d+)\n\s+content-sha256: (.+)\n---/
  );
  if (!match) return null;

  const [, templateKey, flowId, promptVersionId, generatedAtIso, durationMs, contentHash] = match;
  const completedAt = new Date(generatedAtIso).getTime();

  if (Number.isNaN(completedAt)) return null;

  return {
    templateKey: templateKey as TemplateKey,
    flowId,
    promptVersionId,
    startedAt: completedAt - Number(durationMs),
    completedAt,
    durationMs: Number(durationMs),
    contentHash,
  };
}

/**
 * Append a provenance label to document content.
 * If the content already ends with a provenance label, replace it.
 */
export function stampProvenanceLabel(content: string, provenance: GenerationProvenance): string {
  const label = renderProvenanceLabel(provenance);
  // Strip any existing provenance label at the end
  const stripped = content.replace(/\n---\nlargo-provenance:\n[\s\S]*?\n---$/, '');
  return stripped + '\n' + label;
}

/**
 * Verify that a document's content matches its provenance hash.
 * Returns `true` if the content hash is valid.
 */
export function verifyProvenanceIntegrity(content: string, provenance: GenerationProvenance): boolean {
  // Extract content without the provenance label for hashing
  const stripped = content.replace(/\n---\nlargo-provenance:\n[\s\S]*?\n---$/, '');
  return hashContent(stripped) === provenance.contentHash;
}
