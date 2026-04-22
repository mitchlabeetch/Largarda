/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Review & Export Contract Types
 *
 * Defines the shape of a generated document as it moves through the
 * review → approve → export pipeline. Every document produced by the
 * `DocumentGenerator` is wrapped in a `GeneratedDocument` envelope that
 * carries provenance, review state, and export metadata.
 */

import { z } from 'zod';
import type { TemplateKey, TemplateOutputFormat } from './types';

// ============================================================================
// Generation Result
// ============================================================================

/**
 * Lifecycle status of a generated document.
 *
 * State machine:
 *   generated ──► reviewing ──► approved ──► exported   (terminal, success)
 *                     │              │
 *                     └──────────────┴──► rejected        (terminal, failure)
 */
export type DocumentReviewStatus = 'generated' | 'reviewing' | 'approved' | 'rejected' | 'exported';

/**
 * Provenance stamp attached to every generated document.
 * Records who generated it, when, from which template, and which
 * Flowise run produced the content.
 */
export type GenerationProvenance = {
  /** Template key used to generate the document. */
  templateKey: TemplateKey;
  /** Flowise flow id that was called. */
  flowId: string;
  /** Flowise prompt version id. */
  promptVersionId: string;
  /** Epoch millis when generation started. */
  startedAt: number;
  /** Epoch millis when generation completed. */
  completedAt: number;
  /** Duration in ms. */
  durationMs: number;
  /** Hash of the generated content (SHA-256, hex). */
  contentHash: string;
};

/**
 * The envelope wrapping a generated document. Carries the content,
 * provenance, and review state through the pipeline.
 */
export type GeneratedDocument = {
  /** Unique id for this generation output. */
  id: string;
  /** Deal id this document belongs to. */
  dealId: string;
  /** Template key that was used. */
  templateKey: TemplateKey;
  /** Output format of the content. */
  outputFormat: TemplateOutputFormat;
  /** The generated content (markdown, HTML, etc.). */
  content: string;
  /** Variables that were supplied to the generator. */
  variables: Record<string, unknown>;
  /** Review lifecycle status. */
  reviewStatus: DocumentReviewStatus;
  /** Provenance stamp. */
  provenance: GenerationProvenance;
  /** Reviewer comments (populated during review). */
  reviewComments?: string;
  /** Export metadata (populated on export). */
  exportMeta?: ExportMetadata;
  /** Epoch millis when the document was generated. */
  createdAt: number;
  /** Epoch millis when the document was last updated. */
  updatedAt: number;
};

/**
 * Metadata recorded when a document is exported to a file.
 */
export type ExportMetadata = {
  /** Absolute path the document was exported to. */
  filePath: string;
  /** File format of the export. */
  format: TemplateOutputFormat;
  /** Size of the exported file in bytes. */
  sizeBytes: number;
  /** Epoch millis when the export occurred. */
  exportedAt: number;
};

// ============================================================================
// Zod Schemas
// ============================================================================

export const DocumentReviewStatusSchema = z.enum(['generated', 'reviewing', 'approved', 'rejected', 'exported']);

export const GenerationProvenanceSchema = z.object({
  templateKey: z.string().min(1),
  flowId: z.string().min(1),
  promptVersionId: z.string().min(1),
  startedAt: z.number().int().positive(),
  completedAt: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  contentHash: z.string().min(1),
});

export const ExportMetadataSchema = z.object({
  filePath: z.string().min(1),
  format: z.enum(['markdown', 'docx', 'pdf', 'html']),
  sizeBytes: z.number().int().nonnegative(),
  exportedAt: z.number().int().positive(),
});

export const GeneratedDocumentSchema = z.object({
  id: z.string().min(1),
  dealId: z.string().min(1),
  templateKey: z.string().min(1),
  outputFormat: z.enum(['markdown', 'docx', 'pdf', 'html']),
  content: z.string().min(1),
  variables: z.record(z.unknown()),
  reviewStatus: DocumentReviewStatusSchema,
  provenance: GenerationProvenanceSchema,
  reviewComments: z.string().optional(),
  exportMeta: ExportMetadataSchema.optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// ============================================================================
// Terminal Status Check
// ============================================================================

export const DOCUMENT_REVIEW_TERMINAL_STATUSES = ['approved', 'rejected', 'exported'] as const;
export type DocumentReviewTerminalStatus = (typeof DOCUMENT_REVIEW_TERMINAL_STATUSES)[number];

/**
 * True when the review lifecycle has reached a terminal state.
 */
export function isTerminalReviewStatus(status: DocumentReviewStatus): boolean {
  return (DOCUMENT_REVIEW_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Validate that a status transition is legal.
 * Returns `true` if the transition is allowed, `false` otherwise.
 */
export function isValidReviewTransition(from: DocumentReviewStatus, to: DocumentReviewStatus): boolean {
  const ALLOWED_TRANSITIONS: Record<DocumentReviewStatus, DocumentReviewStatus[]> = {
    generated: ['reviewing', 'rejected'],
    reviewing: ['approved', 'rejected'],
    approved: ['exported', 'reviewing'],
    rejected: ['reviewing'],
    exported: [],
  };
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
