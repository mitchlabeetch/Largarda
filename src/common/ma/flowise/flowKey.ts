/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Stable feature keys that address a single Flowise flow / agent.
 *
 * The `flowKey` is the **only** identifier the renderer and the bridge are
 * allowed to use when asking the process to run an AI flow. The concrete
 * Flowise flow id is opaque and rotatable, and lives in the catalogue
 * (`./catalog.ts`), which may be overridden at runtime (Wave 6.4) so the
 * same build can target production, staging, or a local Flowise without
 * code changes.
 *
 * Invariants.
 *
 * - Keys are `camelCase` dot-separated (`ma.dd.analysis`), grouping keys
 *   by domain (`ma.dd.*`, `ma.docs.*`, `ma.briefs.*`, ...).
 * - A new key requires a new row in `FLOW_CATALOG`; the catalogue test
 *   (`tests/unit/maFlowiseCatalog.test.ts`) will fail otherwise.
 * - Renaming a key is a breaking change; add a new key + redirect the
 *   old one for one release cycle, then remove.
 */
import { z } from 'zod';

export const KNOWN_FLOW_KEYS = [
  // Due diligence
  'ma.dd.analysis',
  'ma.dd.risk.drill',
  // Valuation
  'ma.valuation.draft',
  // Document generation
  'ma.docs.nda.draft',
  'ma.docs.loi.draft',
  'ma.docs.im.draft',
  'ma.docs.teaser.draft',
  // Outreach
  'ma.emails.draft',
  // Daily brief
  'ma.briefs.daily',
  // Company Q&A and palette search
  'ma.company.qa',
  'ma.palette.search',
  // Glossary
  'ma.glossary.explain',
  // Sector research
  'ma.sector.summary',
  // KYC / compliance
  'ma.kyc.screen',
  // Comparables search
  'ma.comparables.search',
] as const;

export type FlowKey = (typeof KNOWN_FLOW_KEYS)[number];

export const FlowKeySchema = z.enum(KNOWN_FLOW_KEYS);

/**
 * Type guard for runtime validation of dynamic input (e.g. IPC payloads,
 * settings migrations).
 */
export function isFlowKey(value: unknown): value is FlowKey {
  return typeof value === 'string' && (KNOWN_FLOW_KEYS as readonly string[]).includes(value);
}
