/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Flow catalogue — the registry that maps every Largo AI surface
 * (`flowKey`) to the Flowise flow that implements it, along with its
 * input shape, tool dependencies, KB scope, and prompt version.
 *
 * The renderer never addresses a Flowise flow id directly. Every AI
 * surface goes through `resolveFlowSpec(flowKey)`, which resolves the
 * flow id through this catalogue (possibly overridden at runtime by
 * Wave 6.4's user settings, e.g. for staging or a local Flowise).
 *
 * Status lifecycle.
 *
 * - `draft`    — spec exists, flow id is a placeholder (string starts
 *                with `draft_`); not safe to call; the bridge throws.
 * - `authored` — flow exists in Flowise but is not yet deployed; safe
 *                to call in dev, bridge warns in prod.
 * - `deployed` — flow is live on `filo.manuora.fr`.
 * - `deprecated` — flow still callable but a successor exists; the
 *                  bridge emits a telemetry breadcrumb.
 */
import type { KbCollectionScope } from '@/common/ma/constants';
import type { FlowKey } from './flowKey';

export type FlowStatus = 'draft' | 'authored' | 'deployed' | 'deprecated';

export type FlowKind = 'chatflow' | 'agentflow-v2';

/**
 * Provenance record that tracks which flow family and prompt version
 * were used for a given AI operation. This ensures every AI feature
 * knows exactly which flow family and prompt version it is using.
 *
 * This should be persisted alongside any results from flow execution
 * to enable observability, debugging, and prompt version rollbacks.
 */
export interface FlowProvenance {
  /** The stable feature key from the flow catalog. */
  flowKey: FlowKey;
  /** The Flowise flow UUID that was actually invoked. */
  flowId: string;
  /** The prompt version ID pinned for this execution. */
  promptVersionId: string;
  /** Human-readable description of the flow. */
  flowDescription: string;
  /** Timestamp when the flow spec was resolved (ms since epoch). */
  resolvedAt: number;
}

/**
 * A single entry in the flow catalogue. Entries are pure data; they
 * never contain secrets or environment-specific values. Runtime
 * overrides live in a separate `FlowRuntimeConfig` (Wave 6.4).
 */
export type FlowSpec = {
  /** Stable feature key; see `./flowKey.ts`. */
  key: FlowKey;
  /** Human-readable purpose of the flow. */
  description: string;
  /** Flowise flow kind. */
  kind: FlowKind;
  /**
   * Flowise flow id. For drafts, MUST start with `draft_`. For
   * authored/deployed flows, the 36-char Flowise UUID.
   */
  id: string;
  /**
   * Prompt version pinned by the client. Bumped whenever the underlying
   * Flowise flow is modified; Wave 6.6 persists these in
   * `ma_prompt_versions` and surfaces them in observability.
   */
  promptVersionId: string;
  /** Catalogue lifecycle status. */
  status: FlowStatus;
  /**
   * KB scopes this flow retrieves from. Empty array means the flow is
   * stateless (no KB lookup). The KB ingestion pipeline (Wave 6.5)
   * uses this to gate which Qdrant collections are prefetched.
   */
  kbScopes: readonly KbCollectionScope[];
  /**
   * Logical tool names (not Flowise Custom Tool JSON names) this flow
   * depends on. Used by the Wave 6.7 coverage audit and by the Wave
   * 10.1 MetaMCP generator.
   */
  tools: readonly string[];
  /**
   * Whether the flow streams via SSE (`true`, default for most flows)
   * or returns a single JSON body (`false`, used for short
   * deterministic flows e.g. KYC screens).
   */
  supportsStreaming: boolean;
};

/**
 * Flow catalogue, keyed by stable `flowKey`. Keep entries alphabetised
 * within each section and aligned with `docs/plans/2026-04-20-backend-scaling-plan.md` § 1.
 *
 * Placeholder ids (`draft_…`) will be replaced by real Flowise UUIDs
 * during Wave 6.3 (server bootstrap). The presence of a draft id must
 * not prevent tsc / vitest from passing — callers receive a
 * `FLOWISE_FLOW_ERROR` at runtime if they hit a draft flow in prod.
 */
export const FLOW_CATALOG: Readonly<Record<FlowKey, FlowSpec>> = {
  // --- Due diligence -----------------------------------------------------
  'ma.dd.analysis': {
    key: 'ma.dd.analysis',
    description: 'Risk-categorised due-diligence pass over a deal corpus.',
    kind: 'agentflow-v2',
    id: '96da0c29-c819-4d3a-8391-b8c571c3ba4e',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal'],
    tools: ['kb.search', 'kb.cite', 'company.profile', 'sirene.lookup', 'pappers.lookup'],
    supportsStreaming: true,
  },
  'ma.dd.risk.drill': {
    key: 'ma.dd.risk.drill',
    description: 'Drill-down chat into a specific risk finding.',
    kind: 'chatflow',
    id: '6beaebcf-d6ea-4f78-bc81-05dd19320db4',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal'],
    tools: ['kb.search', 'kb.cite'],
    supportsStreaming: true,
  },

  // --- Valuation ---------------------------------------------------------
  'ma.valuation.draft': {
    key: 'ma.valuation.draft',
    description: 'Valuation report drafting (DCF + comparables framework).',
    kind: 'agentflow-v2',
    id: '55dd0ae8-87d8-4fc2-a918-31d5cb85d19d',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal', 'sector'],
    tools: ['company.profile', 'pappers.financials', 'comparables.search', 'datagouv.tabular'],
    supportsStreaming: true,
  },

  // --- Documents ---------------------------------------------------------
  'ma.docs.nda.draft': {
    key: 'ma.docs.nda.draft',
    description: 'NDA draft from deal metadata.',
    kind: 'chatflow',
    id: '5b24938c-22f8-451f-80d6-fd78ad55833b',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal', 'global'],
    tools: ['kb.search', 'company.profile'],
    supportsStreaming: true,
  },
  'ma.docs.loi.draft': {
    key: 'ma.docs.loi.draft',
    description: 'Letter of Intent (LOI) draft.',
    kind: 'chatflow',
    id: '5a880026-a3c7-4fd6-af64-3008214b4979',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal', 'global'],
    tools: ['kb.search', 'company.profile'],
    supportsStreaming: true,
  },
  'ma.docs.im.draft': {
    key: 'ma.docs.im.draft',
    description: 'Information Memorandum (IM) builder.',
    kind: 'agentflow-v2',
    id: 'a4b60d73-e91e-43bb-bee0-82c8071a1bdd',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal'],
    tools: ['company.profile', 'pappers.financials', 'kb.search'],
    supportsStreaming: true,
  },
  'ma.docs.teaser.draft': {
    key: 'ma.docs.teaser.draft',
    description: 'Anonymised teaser.',
    kind: 'chatflow',
    id: '3d26ec31-1bf0-44a7-951e-78290afa14ed',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal'],
    tools: ['company.profile'],
    supportsStreaming: true,
  },

  // --- Outreach ----------------------------------------------------------
  'ma.emails.draft': {
    key: 'ma.emails.draft',
    description: 'Outbound email draft tailored to a contact + deal.',
    kind: 'chatflow',
    id: '77d94f4c-0748-41c9-9f1e-4064f7139ae6',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['deal'],
    tools: ['kb.search'],
    supportsStreaming: true,
  },

  // --- Daily brief -------------------------------------------------------
  'ma.briefs.daily': {
    key: 'ma.briefs.daily',
    description: 'Daily brief synthesiser (news + watchlists + deals).',
    kind: 'agentflow-v2',
    id: '7a907f12-ff9a-4581-82dc-d1626c9b499c',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['news', 'deal'],
    tools: ['news.feed', 'news.search', 'kb.search'],
    supportsStreaming: true,
  },

  // --- Company & palette --------------------------------------------------
  'ma.company.qa': {
    key: 'ma.company.qa',
    description: 'Company Q&A with SIRENE + Pappers + KB context.',
    kind: 'chatflow',
    id: 'fe653d0f-eaac-4364-b3a5-6cf735635912',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['company'],
    tools: ['sirene.lookup', 'pappers.lookup', 'kb.search'],
    supportsStreaming: true,
  },
  'ma.palette.search': {
    key: 'ma.palette.search',
    description: 'Command-palette semantic search across every scope.',
    kind: 'chatflow',
    id: 'df901ffb-c73b-4525-bbec-6ce6bfab35c2',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['global', 'deal', 'company', 'sector'],
    tools: ['kb.search'],
    supportsStreaming: false,
  },

  // --- Glossary & sector -------------------------------------------------
  'ma.glossary.explain': {
    key: 'ma.glossary.explain',
    description: 'Glossary term explainer grounded in the curated corpus.',
    kind: 'chatflow',
    id: '4c0693ad-c654-4fdd-8996-b2137b64e7a6',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['global'],
    tools: ['kb.search'],
    supportsStreaming: true,
  },
  'ma.sector.summary': {
    key: 'ma.sector.summary',
    description: 'Sector snapshot from data.gouv.fr + curated research.',
    kind: 'chatflow',
    id: 'e1929fdf-c132-40f7-b2ab-d14634a11f8c',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['sector'],
    tools: ['datagouv.search_datasets', 'datagouv.tabular'],
    supportsStreaming: true,
  },

  // --- KYC / compliance --------------------------------------------------
  'ma.kyc.screen': {
    key: 'ma.kyc.screen',
    description: 'KYC / sanctions screening for a company or contact.',
    kind: 'agentflow-v2',
    id: '9d3515c4-002e-4260-917b-dc44b7a76919',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['company'],
    tools: ['sanctions.search', 'kb.search'],
    supportsStreaming: false,
  },

  // --- Comparables -------------------------------------------------------
  'ma.comparables.search': {
    key: 'ma.comparables.search',
    description: 'Public comparables search by sector + size profile.',
    kind: 'agentflow-v2',
    id: '6ff97871-27c1-4361-a9a4-2a5a2d1cc39d',
    promptVersionId: '2026-04-20.0',
    status: 'authored',
    kbScopes: ['sector'],
    tools: ['pappers.search', 'datagouv.tabular', 'comparables.search'],
    supportsStreaming: true,
  },
};

/**
 * Resolve the flow specification for a given `flowKey`. Throws if the
 * key is not known — callers should funnel every lookup through this
 * function, never `FLOW_CATALOG[key]` directly, so the error surface
 * is consistent.
 */
export function resolveFlowSpec(key: FlowKey): FlowSpec {
  const spec = FLOW_CATALOG[key];
  if (!spec) {
    throw new Error(`No Flowise catalogue entry for flowKey "${key}".`);
  }
  return spec;
}

/**
 * True when a flow is callable against production (`authored` or
 * `deployed`). Drafts must not be invoked against `filo.manuora.fr`.
 */
export function isFlowCallableInProd(spec: FlowSpec): boolean {
  return spec.status === 'authored' || spec.status === 'deployed';
}
