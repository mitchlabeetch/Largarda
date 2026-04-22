/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Template Registry
 *
 * The registry that maps every Largo document template (`TemplateKey`) to
 * its specification: which Flowise flow generates it, what variables it
 * requires, and its lifecycle status.
 *
 * The renderer never addresses a Flowise flow directly for document
 * generation. Every generation request goes through
 * `resolveTemplateSpec(templateKey)`, which resolves the flow through this
 * registry.
 */

import type { TemplateKey, TemplateSpec, TemplateStatus } from './types';

// ============================================================================
// Template Catalogue
// ============================================================================

/**
 * Template catalogue, keyed by stable `TemplateKey`. Keep entries
 * alphabetised by key. Each entry's `flowKey` must correspond to a valid
 * entry in the Flowise catalogue (`../flowise/catalog.ts`).
 */
export const TEMPLATE_CATALOG: Readonly<Record<TemplateKey, TemplateSpec>> = {
  'tpl.dd': {
    key: 'tpl.dd',
    description: 'Due diligence report from deal corpus and risk analysis.',
    flowKey: 'ma.dd.analysis',
    outputFormat: 'markdown',
    status: 'authored',
    requiredVariables: {
      dealId: 'UUID of the deal',
      dealName: 'Human-readable deal name',
    },
    optionalVariables: {
      focusAreas: 'Comma-separated risk categories to emphasise',
      documentIds: 'Specific document IDs to include',
    },
  },

  'tpl.im': {
    key: 'tpl.im',
    description: 'Information Memorandum (IM) builder.',
    flowKey: 'ma.docs.im.draft',
    outputFormat: 'markdown',
    status: 'authored',
    requiredVariables: {
      dealId: 'UUID of the deal',
      targetName: 'Target company name',
    },
    optionalVariables: {
      sector: 'Target sector for context',
      financialYear: 'Fiscal year for financials section',
    },
  },

  'tpl.loi': {
    key: 'tpl.loi',
    description: 'Letter of Intent (LOI) draft.',
    flowKey: 'ma.docs.loi.draft',
    outputFormat: 'markdown',
    status: 'authored',
    requiredVariables: {
      dealId: 'UUID of the deal',
      buyerName: 'Buying party name',
      targetName: 'Target company name',
    },
    optionalVariables: {
      indicativePrice: 'Indicative offer price',
      exclusivityPeriod: 'Exclusivity window in days',
    },
  },

  'tpl.nda': {
    key: 'tpl.nda',
    description: 'Non-Disclosure Agreement (NDA) draft from deal metadata.',
    flowKey: 'ma.docs.nda.draft',
    outputFormat: 'markdown',
    status: 'authored',
    requiredVariables: {
      dealId: 'UUID of the deal',
      disclosingParty: 'Name of the disclosing party',
      receivingParty: 'Name of the receiving party',
    },
    optionalVariables: {
      jurisdiction: 'Governing law jurisdiction',
      durationMonths: 'Confidentiality period in months',
    },
  },

  'tpl.teaser': {
    key: 'tpl.teaser',
    description: 'Anonymised teaser document for outreach.',
    flowKey: 'ma.docs.teaser.draft',
    outputFormat: 'markdown',
    status: 'authored',
    requiredVariables: {
      dealId: 'UUID of the deal',
    },
    optionalVariables: {
      sector: 'Sector label for the teaser',
      revenueRange: 'Revenue range hint (anonymised)',
    },
  },

  'tpl.valuation': {
    key: 'tpl.valuation',
    description: 'Valuation report (DCF + comparables framework).',
    flowKey: 'ma.valuation.draft',
    outputFormat: 'markdown',
    status: 'authored',
    requiredVariables: {
      dealId: 'UUID of the deal',
      targetName: 'Target company name',
    },
    optionalVariables: {
      method: 'Valuation method: dcf, comparables, or both',
      fiscalYear: 'Base year for projections',
    },
  },
};

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Resolve the template specification for a given `TemplateKey`.
 * Throws if the key is not known — callers should funnel every lookup
 * through this function, never `TEMPLATE_CATALOG[key]` directly, so the
 * error surface is consistent.
 */
export function resolveTemplateSpec(key: TemplateKey): TemplateSpec {
  const spec = TEMPLATE_CATALOG[key];
  if (!spec) {
    throw new Error(`No template registry entry for templateKey "${key}".`);
  }
  return spec;
}

/**
 * True when a template is callable against production (`authored` or
 * `deployed`). Drafts must not be invoked in prod.
 */
export function isTemplateCallableInProd(spec: TemplateSpec): boolean {
  return spec.status === 'authored' || spec.status === 'deployed';
}

/**
 * Return all template specs matching a given status.
 */
export function getTemplatesByStatus(status: TemplateStatus): TemplateSpec[] {
  return Object.values(TEMPLATE_CATALOG).filter((spec) => spec.status === status);
}

/**
 * Validate that a variables map satisfies the template's required variables.
 * Returns an array of missing variable names (empty if all satisfied).
 */
export function validateTemplateVariables(key: TemplateKey, variables: Record<string, unknown>): string[] {
  const spec = resolveTemplateSpec(key);
  return Object.keys(spec.requiredVariables).filter((varName) => !(varName in variables));
}
