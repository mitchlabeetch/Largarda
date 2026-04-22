/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Template Registry Types
 *
 * Stable identifiers and spec shapes for the document-generation backbone.
 * Every document type that Largo can generate (NDA, LOI, DD report, teaser,
 * IM, valuation) is described by a `TemplateSpec` entry in the registry.
 *
 * Invariants:
 * - A `TemplateKey` is the **only** identifier downstream code uses to
 *   address a template. The concrete Flowise flow id lives in the
 *   `flowKey` field and is resolved at runtime.
 * - Adding a template requires a new row in `TEMPLATE_CATALOG` and a new
 *   entry in `KNOWN_TEMPLATE_KEYS`; the registry test enforces this.
 * - Renaming a key is a breaking change.
 */

import { z } from 'zod';

// ============================================================================
// Template Key
// ============================================================================

export const KNOWN_TEMPLATE_KEYS = ['tpl.nda', 'tpl.loi', 'tpl.dd', 'tpl.teaser', 'tpl.im', 'tpl.valuation'] as const;

export type TemplateKey = (typeof KNOWN_TEMPLATE_KEYS)[number];

export const TemplateKeySchema = z.enum(KNOWN_TEMPLATE_KEYS);

/**
 * Type guard for runtime validation of dynamic input (e.g. IPC payloads).
 */
export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === 'string' && (KNOWN_TEMPLATE_KEYS as readonly string[]).includes(value);
}

// ============================================================================
// Template Spec
// ============================================================================

/**
 * Lifecycle status of a template entry.
 * Mirrors `FlowStatus` from the Flowise catalogue.
 */
export type TemplateStatus = 'draft' | 'authored' | 'deployed' | 'deprecated';

/**
 * Output format the template produces. Each template declares the format
 * its Flowise flow emits; the generator uses this to pick the right
 * exporter.
 */
export type TemplateOutputFormat = 'markdown' | 'docx' | 'pdf' | 'html';

/**
 * A single entry in the template catalogue. Entries are pure data; they
 * never contain secrets or environment-specific values.
 */
export type TemplateSpec = {
  /** Stable template key; see `KNOWN_TEMPLATE_KEYS`. */
  key: TemplateKey;
  /** Human-readable purpose of the template. */
  description: string;
  /** Corresponding Flowise flow key that implements generation. */
  flowKey: string;
  /** Output format the Flowise flow emits. */
  outputFormat: TemplateOutputFormat;
  /** Catalogue lifecycle status. */
  status: TemplateStatus;
  /**
   * Template variables that the caller must supply.
   * Each key is a variable name; the value is a brief description.
   */
  requiredVariables: Readonly<Record<string, string>>;
  /**
   * Optional variables the template accepts but does not require.
   */
  optionalVariables: Readonly<Record<string, string>>;
};

// Zod Schemas

export const TemplateStatusSchema = z.enum(['draft', 'authored', 'deployed', 'deprecated']);
export const TemplateOutputFormatSchema = z.enum(['markdown', 'docx', 'pdf', 'html']);

export const TemplateSpecSchema = z.object({
  key: TemplateKeySchema,
  description: z.string().min(1),
  flowKey: z.string().min(1),
  outputFormat: TemplateOutputFormatSchema,
  status: TemplateStatusSchema,
  requiredVariables: z.record(z.string(), z.string()),
  optionalVariables: z.record(z.string(), z.string()),
});
