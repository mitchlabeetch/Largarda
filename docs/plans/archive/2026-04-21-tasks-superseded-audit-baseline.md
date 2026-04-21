# Largo — Implementation Plan (Completer-Ready)

> **Purpose.** Carry Largo from its current post-Pass-3 state to a production launch.
> Every remaining unit of work is sized for a single Completer pass, scoped to a
> directory island that does not conflict with its siblings, and annotated with
> the acceptance gates the next agent must pass before opening a PR.
>
> **How to read this file.**
>
> 1. `§ 0 — Reality Snapshot` is the authoritative confrontation of `tasks.md`
>    vs the current code tree as of 2026-04-20. Earlier pass-files (1–3) remain
>    historical records; this file supersedes the prior 19-task list.
> 2. `§ 1 — Scaling Model` documents the parallel-track invariants so two or
>    three Completer agents can run concurrent worktrees without stepping on
>    each other.
> 3. `§ 2 — Waves` is the delivery backbone. Each Wave groups tasks that can
>    be run in parallel. **Finish a wave before starting the next one unless
>    the per-task `Runs With` line explicitly permits it.**
> 4. `§ 3 — Cross-Cutting Gates` collects the quality bars the whole repo must
>    sustain; each task ends with a subset of these.
> 5. `§ 4 — Production Deploy` is the release train. It runs once, after every
>    wave merges.
>
> **Vocabulary.**
> `Scope` = files an agent is allowed to create or edit.
> `Depends on` = merged PRs required before the task can start.
> `Runs with` = sibling tasks in the same wave that touch disjoint scopes.
> `Philosophy` = tag from ROADMAP § Largo Philosophy (`[Respiration]`,
> `[Fraîcheur]`, `[Chaleur]`, `[Raffinement]`).

---

## § 0 — Reality Snapshot (2026-04-20)

### 0.1 What actually exists (verified against the tree)

| Area                                                            | Location                                                                                                                                  | Status     | Notes                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| M&A database schema + migrations                                | `src/process/services/database/{schema,migrations}.ts`                                                                                    | ✅ shipped | `ma_deals`, `ma_documents`, `ma_analyses`, `ma_risk_findings`, `ma_flowise_sessions`, `ma_integration_connections`        |
| Deal / Document / Analysis / Flowise / Integration repositories | `src/process/services/database/repositories/ma/`                                                                                          | ✅ shipped | 6 files, covered by `tests/unit/ma/repositories.test.ts`                                                                  |
| Shared M&A types + Zod schemas                                  | `src/common/ma/types.ts` (+ `constants.ts`)                                                                                               | ✅ shipped | 1 054 / 198 lines; includes `DealContext`, `RiskFinding`, `FinancialMetrics`, `FlowInput`, `FlowResult`, `MaIntegration*` |
| Flowise connection + agent manager                              | `src/process/agent/flowise/{FloWiseConnection,FloWiseAgentManager}.ts`                                                                    | ✅ shipped | SSE streaming, retry/backoff, health check                                                                                |
| maBridge (IPC)                                                  | `src/process/bridge/maBridge.ts`                                                                                                          | ✅ shipped | Deals, documents, analyses, risk findings, Flowise sessions, integrations                                                 |
| Document processor + worker                                     | `src/process/services/ma/DocumentProcessor.ts` + `src/process/worker/ma/Document*`                                                        | ✅ shipped | pdf-parse, mammoth, xlsx, chunking                                                                                        |
| Due-diligence orchestration + worker                            | `src/process/services/ma/DueDiligenceService.ts` + `src/process/worker/ma/Analysis*`                                                      | ✅ shipped | 1 279 LoC, 4 analysis types, streaming via Flowise                                                                        |
| Document upload UI + hook                                       | `src/renderer/components/ma/DocumentUpload/` + `hooks/ma/useDocuments.ts`                                                                 | ✅ shipped |                                                                                                                           |
| Deal context service + selector + page + hook                   | `src/process/services/ma/DealContextService.ts`, `src/renderer/{components/ma/DealSelector,pages/ma/DealContext,hooks/ma/useDealContext}` | ✅ shipped |                                                                                                                           |
| Risk score card                                                 | `src/renderer/components/ma/RiskScoreCard/`                                                                                               | ✅ shipped |                                                                                                                           |
| Due-diligence page + hook                                       | `src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx` + `hooks/ma/useDueDiligence.ts`                                                 | ✅ shipped | **Page exists on disk even though the prior task list marked it open.** Not yet reachable from the router.                |
| Integration service (Nango)                                     | `src/process/services/ma/IntegrationService.ts`                                                                                           | ✅ shipped | Webhook handling, proxy, descriptors                                                                                      |
| Valuation engine (Phase 1 § 1.3)                                | `src/common/ma/valuation/`                                                                                                                | ✅ shipped | DCF, multiples, ANR, rule-of-thumb, sensitivity, football field, 40 tests                                                 |
| Company profile + sector resolver                               | `src/common/ma/company/` + `src/common/ma/sector/`                                                                                        | ✅ shipped | SIRENE/Pappers merge rules; 31-sector NAF taxonomy; `resolveProfileSector`                                                |
| Glossary                                                        | `src/common/ma/glossary/`                                                                                                                 | 🟡 partial | 80 bilingual entries; ROADMAP target is 300+                                                                              |
| i18n `ma` module (9 locales)                                    | `src/renderer/services/i18n/locales/*/ma.json`                                                                                            | ✅ shipped | Valuation, sectors, company, deal stages, glossary scaffold, 31 sector ids                                                |
| CI pipeline                                                     | `.github/workflows/{ci,docker,security}.yml`                                                                                              | ✅ shipped | Lint, typecheck, i18n, test+coverage, webui build, docker smoke, Gitleaks, Semgrep, `bun audit`                           |
| Dependabot                                                      | `.github/dependabot.yml`                                                                                                                  | ✅ shipped | npm + github-actions + docker                                                                                             |
| ADRs                                                            | `docs/adr/0001 … 0006`                                                                                                                    | ✅ shipped | ADR process, valuation placement, CI, merge rules, sector taxonomy, security CI                                           |
| Flowise prod bootstrap plan                                     | `docs/plans/2026-04-19-flowise-prod-bootstrap.md`                                                                                         | 📄 plan    | Implementation lives under `chatbuild/flowise_automation/` — out of the renderer tree; tracked in Wave 6                  |

### 0.2 What the previous `tasks.md` got wrong

- **Task 2 (shared types + Flowise connection)** — subtasks 2.1/2.2/2.3 were
  marked `[ ]` while the parent was `[x]`; the types, Zod schemas, Flowise
  HTTP/SSE client, and its unit coverage are all present.
- **Task 9.5 (DueDiligencePage)** — was `[ ]`; the file already exists and
  renders `RiskScoreCard` + `useDueDiligence`. What is actually missing is
  router wiring and i18n strings.
- **Tasks 9.6, 10.3, 12.4, 13.5, 14.5** were authored as "write tests" without
  the preceding services existing. They are re-scoped under the owning
  services below so every service lands with its tests in the same pass.

### 0.3 UI/UX Audit — findings (2026-04-20)

A directed walkthrough of every shipped M&A component and page against
`docs/DESIGN_SYSTEM.md` (Mint Whisper), `docs/ACCESSIBILITY.md` (WCAG 2.1 AA),
and the ROADMAP philosophy tags surfaced the following design debt. Each item
below is owned by a Wave-0 / Wave-N task — the full remediation plan is in
§ 1.4 (Design-System Contract) and Wave 0 (Mint Whisper Parity Sweep).

#### A. Palette & token drift (severity: **high**)

- `src/renderer/components/ma/RiskScoreCard/RiskScoreCard.tsx` hardcodes Arco
  hexes and **emojis** for every risk category:
  `#165DFF`/💰 (financial), `#722ED1`/⚖️ (legal), `#0FC6C2`/⚙️ (operational),
  `#F53F3F`/📋 (regulatory), `#FF7D00`/🏆 (reputational), plus a separate
  `SEVERITY_CONFIG` with `#00B42A` / `#F53F3F` / `#722ED1` / `#FF7D00`.
  This violates the single-mint dominant-hue rule of Mint Whisper, bypasses
  dark-mode inversion, and the emojis bypass the `@icon-park/react` mandate
  (AGENTS.md, DESIGN_SYSTEM.md § 10).
- Every M&A CSS Module uses the Arco token namespace
  (`--color-bg-1`, `--color-text-1`, `--color-border`, `rgb(var(--arcoblue-*))`,
  `rgb(var(--primary-6))`) instead of the Mint Whisper semantic namespace
  (`--bg-1`, `--text-primary`, `--border-base`, `--primary`, `--aou-*`).
  Files touched: `DealContextPage.module.css`, `DueDiligencePage.module.css`,
  `RiskScoreCard.module.css`, `DocumentUpload.module.css`,
  `DealSelector.module.css`, `DealForm.module.css`.
- Status colour maps (`.active { rgb(var(--green-1)) }`,
  `.archived { rgb(var(--orange-1)) }`, `.closed { rgb(var(--gray-1)) }`) hit
  Arco scales directly — should go through `--success`, `--warning`,
  `--text-secondary` or an explicit `--deal-status-*` token.

#### B. Typography & spacing drift (severity: **medium**)

- Every M&A surface uses numeric pixel sizes (`font-size: 20px / 18px / 16px`)
  instead of the rem-based type scale in DESIGN_SYSTEM.md § 2.
- No use of `var(--font-serif)` (Cormorant Garamond) on H1–H3 — the
  Mint-Whisper editorial identity is absent from every shipped M&A page.
- Card internal paddings are 12 px / 16 px mixed; the **Respiration** rule
  mandates ≥ 16 px padding and ≥ 24 px section gaps.
- Border radii are 4 / 6 / 8 px across the M&A tree; the spec mandates 12 px
  (inputs / buttons), 16 px (cards / modals), 9999 px (avatars / pills).

#### C. Internationalisation (severity: **high**)

- `DealSelector.tsx` hardcodes `statusLabels = { active: 'Active', … }`,
  `'Select a deal'`, `'No deals yet'`, `'Create First Deal'`.
- `DealForm.tsx` hardcodes `TRANSACTION_TYPES` and `PARTY_ROLES` label arrays.
- `DealContextPage.tsx` hardcodes `statusLabels`, `Message.success('Deal
updated successfully')`, `Message.error('Failed to save deal')`, and the
  page title.
- `DocumentUpload.tsx` hardcodes `'Unsupported format'`, `'File too large'`,
  `'Supported formats: PDF, DOCX, XLSX, TXT'`, `'Maximum size: 50MB'`.
- `RiskScoreCard.tsx` hardcodes every `CATEGORY_CONFIG.label` and
  `CATEGORY_CONFIG.description`, plus `SEVERITY_CONFIG.label`,
  `getScoreLabel`, and `'Low / Medium / High / Critical'`.
- Only `DueDiligencePage.tsx` uses `useTranslation` — and it references
  `ma.dueDiligence.*` keys that do not yet exist in `ma.json` (verified by
  the absence of matches in the locale files).

#### D. Accessibility (severity: **high**)

- Icon-only buttons in `DealContextPage` (`More`, `Edit`, `Close`) have no
  `aria-label`; Popconfirm actions do not expose an accessible description.
- `DueDiligencePage` streams analysis progress without an `aria-live="polite"`
  region; screen readers do not announce percentage updates.
- Document drag-and-drop in `DocumentUpload` has no keyboard entry point —
  the Arco `Upload` inner button is reachable, but the styled dropzone is
  a div and steals focus on drag.
- No "Skip to main content" link on the M&A layout (once it exists).
- Focus-visible not explicitly tested on any M&A surface.
- `prefers-reduced-motion` not honoured by the `transition: all 0.2s` rules
  in M&A CSS Modules (the global override in `layout.css` applies only to
  chat-history / settings-sider classes).

#### E. Navigation & information architecture (severity: **high**)

- No `/ma/*` route is registered in
  `src/renderer/components/layout/Router.tsx`. `DealContextPage`,
  `DueDiligencePage` are unreachable.
- No top-level M&A layout with a persistent **active-deal indicator**.
  Users switching between DD, Valuation, Docs cannot tell at a glance which
  deal is active.
- No breadcrumbs for the Deal → Document → Analysis → Valuation path.
- No command palette (`Cmd/Ctrl+K`) for jumping across deals, companies,
  glossary terms, and analyses.
- `DealContextPage` fixes the deal list at 320 px even on 4K displays
  (no `max-w` breakpoint; no `dvh` fallback on mobile).

#### F. Feedback, loading, empty states (severity: **medium**)

- Every async surface uses `<Spin />`. The `bg-animate` skeleton keyframe
  defined in `uno.config.ts` is never applied.
- Empty states for `DealContextPage` / `DueDiligencePage` use ad-hoc div
  markup with an emoji icon. No shared `EmptyState` component that consumes
  the Mint Whisper tokens.
- Toasts use Arco defaults (no directional gradient per
  DESIGN_SYSTEM.md § 10 — "Messages: Directional gradients per semantic type"
  — only half-applied in `arco-override.css`).
- No onboarding experience for a first-run user with zero deals / zero
  documents / zero integrations.
- No telemetry-free in-app feedback widget (ROADMAP Phase 6 § 6.6 depends
  on this, and PostHog is opt-in only in Wave 7 of this plan).

#### G. Data formatting (severity: **medium**)

- No locale-aware currency / number / date helper. M&A practitioners expect
  `1 234,56 €` (EUR, French grouping), `20 avril 2026`, `SAS`, `€25 M`
  short-forms. `DealContextPage` relies on `Date.toLocaleString()` with the
  browser default, not the user's Largo locale.
- SIREN / SIRET values will need `NNN NNN NNN` and `NNNNN NNNNN NNNN` visual
  grouping in every form and read-only display.
- Negative financial deltas are not consistently coloured using
  `--danger` / `--success`; plain black text is used in the DD findings list.

#### H. Motion & micro-interactions (severity: **low**, but high-philosophy)

- No use of the DESIGN_SYSTEM.md § 7 transition tokens (`cubic-bezier(0.2,
0.8, 0.2, 1)` for theme switches, 0.25 s fades for sidebar labels). All
  M&A CSS uses `transition: all 0.2s` which forbids the compositor from
  optimising specific properties and ignores reduced-motion.
- No hover elevation on cards; no subtle mint-tinted borders on hover
  per "Raffinement".

#### I. Component inventory & visual regression (severity: **medium**)

- No Storybook; ROADMAP § 0.6 P2 still unshipped.
- No `@testing-library/react` DOM tests for M&A components — only service
  unit tests exist under `tests/unit/ma/`.
- No visual-regression harness (Playwright `toHaveScreenshot` or Chromatic).

#### J. Flowise production-binding gap (severity: **high**)

The self-hosted Flowise at `https://filo.manuora.fr` is the canonical
backend; Largo must bind to it end-to-end for every AI-driven feature.
Audit results:

- `src/common/ma/constants.ts` ships `FLOWISE_DEFAULT_CONFIG.baseUrl =
'http://localhost:3000'`. **There is zero reference to `filo.manuora.fr`
  anywhere in `src/`.** Nothing reads `FLOWISE_BASE_URL` / `FLOWISE_API_KEY`
  from the environment; the client is always constructed with the localhost
  default unless a caller manually threads overrides.
- `FloWiseConnection` covers the `prediction`, `chatflows`,
  `vectorUpsert`, `documentStore`, and `agentflowV2` endpoints (see
  `FLOWISE_ENDPOINTS` in `src/common/ma/constants.ts`), but **only
  `prediction` and `chatflows` are actually called.** `vectorUpsert` and
  `documentStore` are dead endpoint constants — no ingestion pipeline
  uses them.
- `DueDiligenceService.ts` is currently the **only** M&A service that
  actually calls Flowise; every other planned AI feature (NDA / LOI / IM /
  valuation report drafting, daily brief, email drafts, command-palette
  semantic search, glossary lookups, company Q&A, financial extraction)
  still has to be wired.
- There is no **feature → chatflow** registry. The `flowId` is a free-form
  string threaded through `DueDiligenceRequest.options.flowId`. No
  enumeration of "which renderer feature uses which chatflow" exists in
  source.
- No **prompt / chatflow version pinning** layer. A chatflow edit on the
  Flowise UI instantly affects every Largo user; no rollback story.
- No runtime **health / readiness** surface in the app: the renderer can't
  tell whether `filo.manuora.fr` is reachable before a user triggers an AI
  action. `FloWiseConnection.healthCheck()` exists but is unused.
- No **observability binding**: Flowise calls are not tagged with the
  Sentry/OTel scope introduced in Wave 1.1; failures do not carry
  `flowId` / `dealId` / `featureId` breadcrumbs.
- No **Settings UI** for endpoint / API key configuration. A new install
  has no way to point Largo at `filo.manuora.fr` without editing source.
- `chatbuild/flowise_automation/` (the prod bootstrap scripts) and
  `docs/plans/2026-04-19-flowise-prod-bootstrap.md` describe the server
  side but **the Electron/WebUI side of the binding is undone**.
- Team mode sessions do not share a `sessionKey` convention with Flowise
  memory, so conversation continuity across agents is not guaranteed.

#### K. French data-intelligence harness gap (severity: **high**)

At present Largo has the _types_ for French company data but **zero** live
fetching or persistence:

- No **`data.gouv.fr` MCP server.** `src/process/services/mcpServices/`
  contains only AI-provider agents (Claude, Gemini, Qwen, …) plus
  `McpProtocol`, `McpService`, `McpOAuthService`. There is no handler for
  the Main / Metrics / Tabular / Dataservices APIs documented in the
  **`datagouv-apis` skill** (`~/.agents/skills/datagouv-apis`). The only
  matches in the repo are gitignored entries and cached chatbuild JSON
  snapshots.
- No **SIRENE MCP server.** `src/process/services/mcpServices/sirene/`
  does not exist; Wave 1.2 owns its creation but currently nothing fetches
  INSEE data.
- No **Pappers MCP server.** Same situation; Wave 2.1 owns it.
- No **`ma_companies` table.** The database has `ma_deals`,
  `ma_documents`, `ma_analyses`, `ma_risk_findings`, `ma_flowise_sessions`,
  `ma_integration_connections` (v26 + v27) and stops there. The
  `CompanyInfo` / `CompanyProfile` / `CompanyProfileSources` types in
  `src/common/ma/company/types.ts` are pure data contracts with no
  persistence.
- No **`ma_contacts` table.** Contacts were planned for Wave 5.1 but no
  schema exists yet; the Kanban in Wave 5 assumes the table.
- No **`ma_watchlists` table.** Daily-brief watchlist criteria (ROADMAP
  § 4.4) have nowhere to live.
- No **auto-enrichment cron.** The `cron_jobs` table (v9) is generic but
  no job templates for "refresh company profile every 24 h" or "poll
  SIRENE changes" are registered.
- `IntegrationService.inferCategory` knows about `pipedrive`, `hubspot`,
  `salesforce` keywords but has **no data.gouv.fr provider** registered
  with Nango, and no native HTTP-only fallback for the Main / Metrics /
  Tabular / Dataservices APIs (they are free public APIs — Nango is not
  the right channel).
- The `datagouv-apis` skill (available in `.agents/skills/`) is not
  exposed to Cascade completions targeting renderer code, so agents have
  no awareness of the API surface they should be wrapping.

#### L. RAG / KB pipeline + chatflow registry gap (severity: **high**)

- No **embeddings table** (`ma_documents_chunks`, `ma_embeddings`).
  Documents land in `ma_documents` with only `content` and `metadata`
  columns; chunking, embedding, and vector persistence are undone.
- No **KB sources registry** (`ma_kb_sources`) — no way to track which
  deal's corpus has been ingested into which Flowise document store, nor
  to invalidate and rebuild a corpus after document edits.
- No **chatflow registry** (`ma_chatflow_registry`, `ma_prompt_versions`)
  and no feature-to-flow manifest under `src/common/ma/flowise/catalog.ts`.
- No **ingestion worker.** `src/process/worker/ma/` has
  `DocumentWorker.ts` + `AnalysisWorker.ts` but no embedding / vector-store
  ingest worker.
- `chatbuild/flowise_automation/output/largo_local_kb.json` +
  `largo_local_kb_repaired.json` are local seed data for the shared KB but
  there is no code path that consumes them into a curated Flowise document
  store on bootstrap.

#### M. Self-hosted platform inventory at 2026-04-20 (severity: **context**)

Factual state of the `manuora.fr` Coolify platform, as captured by the
GET-only audit whose JSON artefacts live under
`docs/audit/backend-snapshot-2026-04-20/` (gitignored) and whose
narrative lives in `docs/audit/2026-04-20-backend-snapshot-findings.md`.
The scaling plan is at `docs/plans/2026-04-20-backend-scaling-plan.md`.

- **Flowise at `filo.manuora.fr` is live** (`/api/v1/ping` → `pong`,
  Coolify service `Filo` = `running:healthy`, stack
  `flowise-with-databases`). Content today: **1 deployed assistant**
  (`Largo`), 4 non-deployed `* v1 Draft` chatflows, **0 custom tools**,
  **0 platform variables**, 4 Qdrant-backed document stores.
- **Qdrant at `qdrant.manuora.fr`** runs v1.17.1 and is reachable; the
  collections endpoint requires the API key stored in Flowise under the
  `largo/qdrantApi` credential. From the Flowise side we know there are
  **four collections** (`LargoCurated20260419c/d`,
  `LargoRepaired20260419/b`) totalling ~950 chunks, all indexed with
  **Mistral `mistral-embed`, dimension 1024**.
- **Embedding contract correction.** The earlier plan assumed
  `text-embedding-3-large`; the live stores prove the contract is
  Mistral at 1024 dim. Wave 6.5 must emit matching vectors or reingest
  the existing chunks. Until then, the default in
  `src/common/ma/constants.ts` and in `docs/ma/rag-ingestion.md` is
  **`mistralAIEmbeddings / mistral-embed` @ 1024**.
- **Record manager** is Postgres (`pg-record-manager`) — dedup is built
  in; `KnowledgeBaseService.reindexDeal` must not bypass it.
- **13 Flowise credentials** today: OpenAI ×2, Gemini, Groq,
  ElevenLabs, Tavily, SearchApi, Exa, GitHub, HuggingFace, Supabase,
  Brave, Mistral, Qdrant, Postgres. Naming is inconsistent (most named
  `Mitch`) and no INSEE / Pappers / Browserless / RSSHub entries exist.
  Wave 6.11 renames and re-scopes per
  `<provider>.<purpose>`.
- **MetaMCP at `mcp.manuora.fr`** is `running:healthy` but empty —
  `/api/servers` and `/api/tools` return 404 against the probed paths.
  It is ready to federate Largo's MCP servers; Wave 6.8 owns this.
- **Langflow at `langflow.manuora.fr`** is `running:healthy` but no
  flows are authored; it is on standby for complex DAG orchestration
  (a potential host for `ma.briefs.daily` and `ma.comparables.search`
  if those outgrow single Flowise chatflows).
- **Browserless** (Coolify service `browser`, type `browserless`) is
  **`exited`** — no headless browsing harness is currently available.
  Wave 6.9 revives it and exposes `web.fetch`, `web.screenshot`,
  `web.scrape`.
- **RSSHub / LarRSS** (Coolify app `LarRSS` at `larrss.manuora.fr`)
  is **`exited:unhealthy`**. Wave 6.10 revives it (as RSSHub) and feeds
  a new `news/global` Qdrant collection nightly for the daily-brief
  pipeline.
- **Infisical at Coolify service `vault`** is `running:healthy` and is
  the intended secret spine. Today no Largo component reads from it;
  Wave 6.11 wires it.
- **n8n** (`Automate`, `running:unhealthy`) and **Jenkins** (`Deploy`,
  `running:healthy`) are available as workflow + CD adapters; no
  current dependency but useful for periodic Flowise flow-sync
  (Jenkins job pushing `chatbuild/flowise_automation/flows/*.json` on
  repo merge).
- **Legacy**. The Coolify app `largo` at `https://largo.manuora.fr`
  (type `anythingllm`, `exited:unhealthy`) is a stale pre-Largo
  AnythingLLM deployment and should be decommissioned once Wave 6
  lands.

### 0.4 What is genuinely open

Grouped so the dependency graph in § 2 is obvious:

1. **Phase 1 carry-over.** Sentry/OTel observability scaffolds, SIRENE MCP
   server, Pappers MCP server, glossary growth to 300+, fr-FR reference
   locale flip, Drizzle dual-run, source-map upload in CI.
2. **Due-diligence finish line.** Router wiring, i18n keys for the DD page,
   `FinancialExtractionService`, financial table UI + export.
3. **Phase 2 — document automation.** NDA / teaser / IM / valuation-report /
   LOI / DD-checklist generators, report generator service, template registry.
4. **Phase 3 — communication & CRM.** WhatsApp MCP (Baileys), Email MCP
   (IMAP/SMTP), Pipedrive MCP, contacts, Kanban deal pipeline, meeting prep.
5. **Phase 4 — analytics.** Dashboard, deal-flow analytics, comparables DB,
   market-intel feeds, daily brief, custom reporting engine.
6. **Phase 5 — enterprise & compliance.** RBAC, audit log, VDR, compliance
   checks (AML/KYC, _autorité de la concurrence_, sanctions), GDPR tools,
   SQLCipher, OS keychain, E2E encryption for team mode.
7. **Phase 6 — production launch.** Perf budgets, pen test, signing,
   auto-update, platform distribution, beta, docs, launch.

---

## § 1 — Scaling Model (2–3 concurrent Completer sessions) & Design-System Contract

### 1.1 Parallelism rules

Each Completer runs in its own `git worktree` on a branch named
`track/completer/<domain>-<short-slug>`.

**Scope isolation contract — never violate these even for a one-liner:**

- `src/common/ma/` — pure cross-process logic. Safe to co-edit **only** across
  disjoint subfolders (`valuation/`, `company/`, `glossary/`, `sector/`,
  `financials/`, `reports/`, `compliance/`, `templates/`, `pipeline/`,
  `analytics/`, `observability/`, `security/`).
- `src/process/services/mcpServices/<name>/` — each MCP server is a leaf
  directory. Two agents can run in parallel iff `<name>` differs.
- `src/process/services/ma/<SpecificService>.ts` — one agent per file.
- `src/process/worker/ma/<SpecificWorker>.ts` — one agent per file.
- `src/process/bridge/` — **serialized**. Any bridge edit must go through a
  dedicated wiring task at the _end_ of the wave so the maBridge history stays
  reviewable.
- `src/renderer/pages/ma/<Page>/` + `src/renderer/components/ma/<Cmp>/` +
  `src/renderer/hooks/ma/<hook>.ts` — one agent per `<Page>`/`<Cmp>`/`<hook>`.
- `src/renderer/services/i18n/locales/*/ma.json` — **serialized per wave**:
  agents append keys by editing **only** the subtree they own. A final
  `i18n:types` regen task closes each wave.
- `.github/workflows/*.yml` + `docs/adr/*` — append-only within a wave; no
  two agents may edit the same file concurrently.
- `tests/unit/ma/<topic>.test.ts` — co-located with the owning subfolder; one
  file per topic.

### 1.2 Per-pass checklist (Definition of Done for every task below)

An agent may not mark a task complete without all of:

1. `oxlint src/common/ma src/process/services/ma src/process/services/mcpServices tests/unit/ma` — 0 warnings, 0 errors.
2. `oxfmt --check` clean on every touched file.
3. `bunx tsc --noEmit` — 0 new errors in touched paths (pre-existing repo-wide errors are logged, not introduced).
4. `node scripts/generate-i18n-types.js` — regenerated if any `*.json` locale changed, committed as part of the PR.
5. `node scripts/check-i18n.js` — reports "translations are complete" for every locale.
6. `bunx vitest run <the test files the task added or touched>` — green locally; CI exercises the full suite.
7. Coverage for new production code ≥ 80 % (`bunx vitest run --coverage <files>`). Report pasted into the PR body.
8. One ADR appended under `docs/adr/` if the task introduces a new module, IPC channel, schema table, external dependency, or security control.
9. A `pass-file-N.md` handoff in the worktree root describing ground state, shipped scope, gate results, next follow-ups, open risks, files changed. `N` = next free integer.
10. `CHANGELOG.md` gains an entry under `Unreleased — Added (Completer pass N)`.

Any task that fails step 1–5 is **not ready to merge**. Steps 6–7 are
waivable only if the task is documentation-only and the PR description says
so explicitly.

### 1.3 Pass-file contract

Use the structure already established by passes 1–3:

- **Branch / Parent of work / Date / Scope** header
- **Ground state at start**
- **What this pass ships** — grouped sections, one per concern
- **Gate results** — table of exactly the checklist above
- **What the next Completer should do** — pointer into this file's open tasks
- **Open risks and knowns**
- **Files added or touched**

### 1.4 Design-System Contract (Mint Whisper) — non-negotiable for every page/component

Every Completer pass that ships renderer code **must** satisfy all of these
gates. A PR that fails any one is not mergeable. The contract is derived
from `docs/DESIGN_SYSTEM.md`, `docs/ACCESSIBILITY.md`, and the ROADMAP's
Largo Philosophy tags.

#### 1.4.1 Tokens — palette, typography, spacing, radius

- **Colours — use Mint Whisper, never Arco directly.** Every background,
  text, border, and semantic colour must come from one of the following
  sources, in priority order:
  1. UnoCSS utilities (`bg-base`, `bg-1..10`, `bg-hover`, `bg-active`,
     `text-t-primary`, `text-t-secondary`, `border-b-base`, `border-b-light`,
     `bg-primary`, `bg-success`, `bg-warning`, `bg-danger`, `bg-brand`,
     `bg-brand-light`, `bg-aou-1..10`).
  2. The CSS variables documented in DESIGN_SYSTEM.md § 3 (`--bg-*`,
     `--text-*`, `--border-*`, `--primary`, `--success`, `--warning`,
     `--danger`, `--aou-*`, `--message-user-bg`, `--message-tips-bg`).
  3. Arco tokens (`--color-bg-*`, `--color-text-*`, `--color-primary-*`)
     **only** when extending an Arco component inside an `:global()` block
     in a CSS Module, and only when no Mint Whisper token exists.
  4. **Never** hardcode hex values. **Never** ship emoji as semantic icons.
- **Typography.** H1–H3 use `--font-serif` (Cormorant Garamond). Body uses
  `--font-sans` (Plus Jakarta Sans). Code / tabular numbers use
  `--font-mono` (JetBrains Mono). Always declare the type scale via rem,
  not pixels.
- **Spacing.** Card inner padding ≥ 16 px (`p-4`). Section gap ≥ 24 px
  (`gap-6`). List-item vertical spacing ≥ 12 px (`py-3`). Icon ↔ text gap
  8 px. Page margins 24 px or 32 px. This is non-negotiable — it is the
  _Respiration_ rule.
- **Radius.** 12 px default (`--radius-md`) for inputs/buttons/chips.
  16 px (`--radius-lg`) for cards and modals. 20–24 px for hero sections.
  9999 px only for avatars and circular icon buttons.
- **Shadows.** Mint Whisper favours flat depth through background layering
  (`bg-base` → `bg-1` → `bg-2`). If a shadow is required, use the three
  opacity-graded RGBAs documented in DESIGN_SYSTEM.md § 6.

#### 1.4.2 Iconography & imagery

- Every icon must come from `@icon-park/react`. No inline SVG, no emoji,
  no text glyphs as icons, no image files for semantic iconography. If an
  appropriate Icon Park glyph does not exist, a PR-scoped ADR must document
  the exception before adding an SVG under `src/renderer/assets/`.
- Icon size must come from a shared scale: 14 px (inline), 16 px (button),
  20 px (card header), 24 px (dialog header), 48 px (empty state).
- Icons in clickable contexts must either have a visible label or an
  `aria-label` i18n key.

#### 1.4.3 Internationalisation

- No user-facing string in any renderer file. Every label, placeholder,
  toast message, button caption, tooltip, ARIA label, and empty-state copy
  must come from an `i18n` key. Keys live under `ma.*` or the appropriate
  module namespace.
- Every new component that surfaces user text ships with keys in **fr-FR
  and en-US** at minimum. The other 7 locales get the en-US stub until
  Wave 9's translation review pass (see ROADMAP § 5 polish).
- All pluralisation goes through ICU `{{count}}` placeholders — no
  `count + ' item' + (count > 1 ? 's' : '')` patterns.
- `node scripts/check-i18n.js` must report completeness on every PR.

#### 1.4.4 Locale-aware formatting

- Every numeric, currency, percentage, date, time, or SIREN/SIRET render
  must pass through a shared helper under
  `src/common/utils/format/{currency,number,date,siren,siret}.ts` (created
  in Wave 0.2). Helpers read the active i18n locale from the runtime.
- Default currency is **EUR**, default grouping is French (`1 234,56 €`),
  default date format `D MMMM YYYY`. Helpers accept an optional override.

#### 1.4.5 Accessibility (WCAG 2.1 AA)

- Every interactive element is keyboard-reachable in the visual tab order.
- Every icon-only button has an `aria-label` backed by an i18n key.
- Every dialog has a visible title, first-focus target, and Escape-to-close.
- Every streaming / live-updating region (DD progress, chat messages,
  import progress) uses the correct `role` + `aria-live` + `aria-atomic`
  pattern documented in ACCESSIBILITY.md.
- Every CSS animation and transition honours `@media (prefers-reduced-motion: reduce)`.
- All text/background pairings verified ≥ 4.5 : 1 (normal), ≥ 3 : 1 (large
  / UI components) via axe-core.
- Focus rings use `:focus-visible` and inherit the base ring from
  `base.css`. Never suppress without an equivalent indicator.

#### 1.4.6 Dark-mode parity

- Every surface rendered in light mode must render correctly under
  `[data-theme='dark']`. The AOU 10-step scale is luminance-inverted; never
  assume brightness direction. Use the Mint Whisper semantic tokens — they
  handle inversion automatically.
- Every hardcoded RGB / RGBA is forbidden. Alpha compositing must use
  `color-mix(in srgb, var(--token) X%, transparent)` or the documented
  `--fill-*` tokens.

#### 1.4.7 Responsive & window-size budget

- Minimum width: 360 px (`--app-min-width`). Designs must not regress below.
- Desktop breakpoints: 900 px (tablet fallback), 1280 px (standard laptop),
  1440 px (wide dashboard), 1920 px (4K). Every new dashboard / Kanban /
  table must publish an explicit layout decision for ≥ 1440 px width in
  its PR description.
- WebUI mode must be touch-friendly on tablets — 44 × 44 px minimum tap
  targets on `max-width: 900px`.

#### 1.4.8 Loading, empty, error states

- Use the shared `<Skeleton />` component (created in Wave 0.3 — UnoCSS
  `animate-pulse` or `bg-animate`) for all list / table / card
  placeholders. `<Spin />` is reserved for inline button and modal
  actions.
- Use the shared `<EmptyState />` component (created in Wave 0.3) for every
  empty list / no-result / first-run surface, with icon (Icon Park),
  serif title, body copy, and a primary CTA slot.
- Errors surface through the shared `<ErrorState />` component which ties
  into the observability scaffold (Wave 1.1) and offers a one-click
  copy-stack-trace affordance.

#### 1.4.9 Toasts, modals, popovers

- All toasts use `Message.{info,success,warning,error}` with i18n keys and
  inherit the directional-gradient override in `arco-override.css` (to be
  completed in Wave 0.1). Duration defaults: info 3 s, success 3 s,
  warning 5 s, error persistent until dismissed.
- All modals use the Mint Whisper override (16 px radius, 8 % shadow,
  first-focus on primary CTA, Escape closes, `aria-modal="true"`).
- Popovers must honour the container boundary — no overflow onto the
  titlebar or the sidebar during scroll.

#### 1.4.10 Motion

- Transitions are scoped to the exact properties, never `transition: all`.
- Timing: 0.2 s for hover, 0.25 s for sidebar label fades, 0.3 s for
  section expand/collapse, 0.26 s + `cubic-bezier(0.2, 0.8, 0.2, 1)` for
  theme switches and page-level crossfades.
- Every animation has a reduced-motion fallback.

#### 1.4.11 Component inventory & visual regression

- Every new component under `src/renderer/components/ma/` ships with:
  - A Storybook 8 story file (Wave 0.3 installs Storybook) — `*.stories.tsx`
    co-located in the component folder.
  - A React Testing Library DOM test under
    `tests/unit/ma/<component>.dom.test.tsx`.
  - A Playwright visual-regression snapshot for the representative state
    under `tests/e2e/specs/visual/ma-<component>.spec.ts`.
- Regression threshold: ≤ 0.1 % pixel diff. Larger diffs require explicit
  reviewer approval of the new baseline.

#### 1.4.12 Information architecture — M&A shell

> See § 1.4.13 and § 1.4.14 below for AI/Flowise and data-intelligence
> contracts that apply to every feature using the shell.

- The M&A surface is a **single `MaLayout` shell** with a persistent
  left sidebar (Home / Deal Context / Due Diligence / Valuation /
  Company Profile / Documents / Analytics / Reports / Settings), a
  persistent top bar with the active-deal indicator + quick switcher +
  breadcrumbs, and a main content area.
- The active deal is visible on every M&A page at all times. Switching
  deals never loses unsaved input (prompt-to-save dialog).
- `Cmd/Ctrl+K` opens a command palette that searches deals, companies,
  documents, glossary entries, analyses, and settings. `?` opens a
  keyboard-shortcut help modal.

#### 1.4.13 AI / Flowise Contract (enforced for every AI-driven feature)

Every feature in Largo that produces, summarises, transforms, or streams
AI output **must** bind to the self-hosted Flowise at
`https://filo.manuora.fr` through a single registry, never by an ad-hoc
`flowId` string. The contract:

- **Single runtime configuration source.** A new
  `src/common/flowise/config.ts` (Wave 6.4) exposes a typed `FlowiseRuntimeConfig`:
  - `baseUrl` — default `https://filo.manuora.fr`, overridable via the
    `FLOWISE_BASE_URL` environment variable **and** the user-facing
    Settings page.
  - `apiKey` — stored in OS keychain (Wave 8.2) or `FLOWISE_API_KEY` env,
    never in source.
  - `timeout`, `retryAttempts`, `retryBaseDelay`, `retryMaxDelay` — tuned
    per environment.
  - `observabilityScope` — optional OTel/Sentry scope for breadcrumb
    tagging.
    Every `FloWiseConnection` construction site must go through
    `getFlowiseRuntimeConfig()` — direct `createFloWiseConnection({ baseUrl:
... })` calls with a hardcoded URL are forbidden.
- **Feature → chatflow registry.** A new `src/common/flowise/catalog.ts`
  (Wave 6.6) enumerates every Largo AI feature and maps it to a stable
  `flowKey`, documented in `docs/flowise/catalog.md`. Example keys:
  `ma.dd.analysis`, `ma.valuation.draft`, `ma.docs.nda.draft`,
  `ma.docs.im.draft`, `ma.emails.draft`, `ma.briefs.daily`,
  `ma.company.qa`, `ma.palette.search`, `ma.glossary.explain`.
  The `flowKey` is resolved at runtime through
  `ma_chatflow_registry` (Wave 6.6) which stores `(flowKey, flowId,
promptVersionId, status)` so an operator can swap the Flowise flow id
  behind a feature without a code change.
- **Prompt / chatflow version pinning.** The `ma_prompt_versions` table
  (Wave 6.6) pins each `flowKey` to an immutable prompt-version hash. A
  rollback is a single row update and is audited.
- **Streaming discipline.** Every renderer AI surface consumes SSE via the
  shared `useFlowiseStream(flowKey, input)` hook (Wave 6.4) which wraps
  `FloWiseAgentManager`. Hooks expose `{ state, tokens, artifacts, error,
cancel }` — pages never talk directly to `ipcBridge.ma.flowise`.
- **Fallback behaviour.** When `healthCheck()` fails or the chatflow
  returns a 5xx, the surface renders the shared `<ErrorState />`
  (Wave 0.3) with (a) a one-click **Retry**, (b) a **Switch to offline
  mode** affordance that calls the local provider (e.g. Claude/Gemini via
  the existing AionUi agent stack), and (c) a breadcrumb to observability.
- **Observability.** Every Flowise call tags its Sentry/OTel span with
  `flowKey`, `flowId`, `promptVersionId`, `dealId?`, `documentId?`,
  `sessionId?`. Errors carry the Flowise error code
  (`FLOWISE_CONNECTION_FAILED`, `FLOWISE_FLOW_ERROR`, `RATE_LIMIT_EXCEEDED`).
- **Health surface.** A renderer status indicator in the `TopBar`
  (Wave 2.3) shows Flowise reachability (green / amber / red) with a
  click-through to Settings → Flowise. Polled every 60 s; manual refresh
  on click.
- **No hardcoded prompts.** Prompt content lives in the Flowise UI or in
  versioned exports under `chatbuild/flowise_automation/flows/`. Largo
  never ships an AI prompt string in source.
- **Team mode continuity.** The `ma_flowise_sessions.session_key` column
  is the canonical Flowise conversational memory key for a `(deal, agent,
team_channel)` triple so delegated runs resume the same memory.

#### 1.4.14 Data-intelligence contract (French open data + enrichment)

Every feature that surfaces company / sector / market information must:

- Source data through a **named MCP server or HTTP-API client** registered
  under `src/process/services/mcpServices/<name>/` or
  `src/process/services/data/<name>/` — never inline fetch calls in
  services or the renderer.
- Persist normalised results in the canonical tables introduced by
  Wave 1.5 (`ma_companies`, `ma_contacts`, `ma_watchlists`,
  `ma_datagouv_cache`, `ma_kb_sources`, `ma_documents_chunks`) rather
  than re-fetching on every render.
- Always quote **slugs, UUIDs, and URLs returned by the API** — never
  invent dataset IDs (per the `datagouv-apis` skill). Every record stored
  in `ma_datagouv_cache` keeps the upstream `next_page` / `resource_uuid`
  so the auto-enrichment cron can refresh without re-searching.
- Respect upstream rate-limits via the shared `RateLimiter` in
  `src/common/rateLimit/` (to be added in Wave 1.5.2). Public APIs get
  1 req/s; authenticated endpoints get the documented ceiling.
- Tag every company profile with a `sources: CompanyProfileSources` map
  (already typed in `src/common/ma/company/types.ts`) so the UI can
  surface **field-level attribution** ("SIRENE • 2026-04-20", "Pappers •
  2026-04-18", "data.gouv.fr/dataset/…").
- Fall back gracefully when a source is unavailable: the renderer still
  shows the best-known data with a "stale" chip rather than a blank
  state.

---

## § 2 — UX Flows (reference user journeys)

Every wave must preserve or refine these flows. Journeys are anchors for
Playwright smoke tests and the Wave-N pass-file's _flows validated_ note.

### 2.0.1 First-run onboarding (`[Chaleur]`)

1. Fresh install → login → empty `MaHome`.
2. Guided welcome card offers three CTAs: `Create my first deal` /
   `Import from Pipedrive` / `Explore demo deal`.
3. Demo deal (optional) seeds one fake deal + three redacted documents so
   the user can explore every feature without their own data.
4. Settings wizard captures default locale, currency, tax jurisdiction,
   observability opt-in, model-routing preferences.
5. First DD analysis triggers an inline coach-marks walkthrough of the
   analysis types and risk categories.

### 2.0.2 Deal lifecycle — 8-stage Kanban

- `Origination` → `Teaser` → `NDA` → `IM` → `LOI` → `DD` → `SPA` → `Closing`.
- Each stage exposes suggested next actions (generate NDA, run DD, export
  IM). Stage changes record `ma_deal_stage_events` (Wave 5.1) for audit.

### 2.0.3 Company research → valuation → report

1. Company Profile search → SIRENE/Pappers merge card.
2. One-click `Évaluer` → Valuation workbench pre-filled with Pappers
   financials and suggested sector multiples.
3. Football-field + sensitivity generated live.
4. `Générer le rapport` renders Word/Excel/PDF using the valuation-report
   template.

### 2.0.4 Document upload → DD analysis → risk score → export

1. Drag-and-drop into Documents tab on the active deal.
2. Document Worker chunks + extracts in the background; live progress via
   IPC.
3. DD page — choose analysis types (DD / risk / financial / comparison).
4. Streaming Flowise analysis with live risk-category progress.
5. Final risk-score card with drill-down findings; one-click export to
   PDF / DOCX.

### 2.0.5 Daily brief (`[Fraîcheur]`)

1. Cron fires at user-configured time.
2. Feeds ingested → AI-summarised → watchlist matches flagged.
3. Brief rendered in `/ma/briefs/today` with calm, digestible typography
   (serif headings, generous whitespace). Optional email / in-app toast.

### 2.0.6 Command palette (`Cmd/Ctrl+K`)

Fuzzy search across deals, companies (by name / SIREN / SIRET), documents,
glossary terms, analyses, reports, settings, and commands. Every result
exposes a keyboard shortcut. Escape closes. Shipped in Wave 2.3.

### 2.0.7 Team mode × M&A

Team channels inherit the active-deal context. Analyst can delegate a DD
run to a specialist agent; results surface in the deal's DD history. This
reuses the existing team infrastructure; new scope is limited to the
binding surface (Wave 5 / Wave 8.1 for permissions).

---

## § 3 — Waves

### Wave 0 — Mint Whisper Parity Sweep (parallelism: 3 agents)

**Goal.** Pay down the UI/UX debt surfaced in § 0.3 **before** any new
M&A feature ships. This wave contains **no new functionality** — only
token migration, i18n extraction, and the introduction of the shared
design primitives that every subsequent wave will consume. Running this
wave first guarantees that the router wiring in Wave 2.3, the new pages
in Wave 3, and every downstream template, dashboard, and compliance
surface inherit a clean Mint Whisper baseline.

#### 0.1 Token migration + Arco-override polish (`[Raffinement]`)

- **Scope.** Rewrite every CSS Module under `src/renderer/components/ma/`
  and `src/renderer/pages/ma/` to use the Mint Whisper semantic tokens
  enumerated in § 1.4.1. Extend `src/renderer/styles/arco-override.css` to
  complete the toast directional-gradient override (`.arco-message-*`),
  the Modal 16 px radius, and any still-missing Arco → Mint Whisper
  overrides surfaced by the migration.
- **Specifically.**
  - `DealContextPage.module.css`: replace `var(--color-bg-*)`,
    `var(--color-text-*)`, `var(--color-border-*)`, `rgb(var(--arcoblue-*))`,
    `rgb(var(--green-*))`, `rgb(var(--orange-*))`, `rgb(var(--gray-*))`.
  - `DueDiligencePage.module.css`: same migration plus replace
    `rgb(var(--primary-6))` / `var(--color-primary-light-1)` with
    `--primary` / `--aou-1`.
  - `RiskScoreCard.tsx` (the _only_ file in this wave that edits
    TypeScript): replace the hardcoded hex-based `CATEGORY_CONFIG` and
    `SEVERITY_CONFIG` maps with a module-level Mint Whisper palette
    (severity = `--success` / `--warning` / `--danger` / `--aou-8`; risk
    categories = `--aou-4` / `--aou-5` / `--aou-6` / `--aou-7` / `--aou-8`
    so every category stays inside the mint family — "never more than two
    mint shades in the same component" is relaxed here because categories
    are mutually exclusive). Replace every emoji with an Icon Park glyph
    (`ChartHistogram` financial, `Balance` legal, `Setting` operational,
    `DocSearch` regulatory, `Trophy` reputational).
  - `DealSelector.module.css`, `DealForm.module.css`,
    `DocumentUpload.module.css`: same Arco-token scrub.
  - Bump every card / modal radius to `--radius-lg` (16 px); buttons /
    inputs / chips to `--radius-md` (12 px).
- **Testing.**
  - Add a new `tests/unit/styles/tokenLint.test.ts` that reads every
    `src/renderer/**/*.module.css` under M&A paths and fails if a forbidden
    token (`--color-bg-\d`, `--color-text-\d`, `rgb\(var\(--arcoblue`,
    `rgb\(var\(--green-\d`, hardcoded `#[0-9a-f]{3,8}`) appears.
  - Extend `tests/unit/ma/riskScoreCard.dom.test.tsx` (new) asserting no
    `textContent` contains any emoji code point (Unicode category regex).
  - Run `prefers-reduced-motion` Playwright smoke on the DD page.
- **Success criteria.** Zero forbidden tokens; zero emoji in M&A
  components; `tokenLint` green. Dark mode screenshot parity verified for
  every M&A surface.
- **Depends on.** —
- **Runs with.** 0.2 and 0.3.

#### 0.2 i18n extraction sweep + locale-aware formatting helpers (`[Chaleur]`)

- **Scope.**
  - Add keys for every hardcoded string found in § 0.3 C under
    `ma.deal.*`, `ma.document.*`, `ma.dueDiligence.*`, `ma.risk.*` across
    `locales/en-US/ma.json` and `locales/fr-FR/ma.json`. Mirror stubs in
    the other 7 locales (Wave 1.3 re-machine-translates them).
  - Refactor `DealSelector.tsx`, `DealForm.tsx`, `DealContextPage.tsx`,
    `DocumentUpload.tsx`, `RiskScoreCard.tsx` to call `useTranslation` and
    resolve every label, placeholder, description, toast message,
    `aria-label`, and `statusLabels` / `CATEGORY_CONFIG` / `SEVERITY_CONFIG`
    entry through i18n keys.
  - Create `src/common/utils/format/` with `currency.ts`, `number.ts`,
    `date.ts`, `siren.ts`, `siret.ts`. Each helper takes an ISO locale
    argument and falls back to `fr-FR` if missing. Defaults: EUR currency,
    French grouping, `D MMMM YYYY` date, SIREN `NNN NNN NNN`, SIRET
    `NNNNN NNNNN NNNN`.
  - Add a `useLargoFormat()` renderer hook that pulls the active i18n
    locale and returns memoised formatters.
- **Testing.** `tests/unit/common/format.test.ts` (≥ 25 cases across
  boundary values, zero, negative, very large, French vs. English
  rendering, invalid SIREN/SIRET). DOM tests for every refactored M&A
  surface assert that a mounted `fr-FR` i18n provider renders French
  labels, not English ones.
- **Success criteria.** Zero hardcoded user-facing strings in
  `src/renderer/components/ma/` and `src/renderer/pages/ma/`. `check-i18n`
  green. `useLargoFormat` consumed by at least the existing M&A pages (no
  pixel diff with prior rendering under the default locale).
- **Depends on.** —
- **Runs with.** 0.1 and 0.3.

#### 0.3 Shared design primitives: Skeleton / EmptyState / ErrorState / Storybook (`[Respiration]`)

- **Scope.**
  - `src/renderer/components/base/Skeleton/` — three variants (line,
    circle, card) using the `bg-animate` keyframe and `animate-pulse`
    Tailwind class. Honours `prefers-reduced-motion`.
  - `src/renderer/components/base/EmptyState/` — props: `icon` (Icon Park
    component), `title` (i18n key), `description` (i18n key), `primaryAction`,
    `secondaryAction`. Serif title (`font-serif`), generous padding.
  - `src/renderer/components/base/ErrorState/` — renders an error card with
    copy-stack-trace, retry action, and an optional link to the
    observability dashboard (feature-flagged).
  - Install Storybook 8 + `@storybook/react-vite`. Add `bun run storybook`
    to `package.json`. First stories: `Skeleton`, `EmptyState`,
    `ErrorState`, `DealSelector` (post-0.1 / 0.2 refactor), `RiskScoreCard`
    (post-0.1 refactor), `DocumentUpload`.
  - Add a Playwright visual-regression baseline under
    `tests/e2e/specs/visual/` for each Storybook story using
    `@storybook/test-runner`.
- **Testing.** DOM tests under `tests/unit/base/*.dom.test.tsx`. Storybook
  `test-runner` invoked in CI on the build artefact.
- **Success criteria.** Every M&A page swaps one `<Spin />` or ad-hoc
  empty-state div for the new primitives in this same pass (to prove
  adoption). ROADMAP § 0.6 (Storybook) flipped from open to done.
- **Depends on.** —
- **Runs with.** 0.1 and 0.2.

#### 0.4 Wave-0 wiring close-out (serialized)

- Regen `i18n-keys.d.ts`. Append a `Added (Completer pass W0)` block to
  `CHANGELOG.md`. Author `docs/adr/0007-design-system-contract.md`
  documenting § 1.4 and § 2 as enforced contracts.
- Publish a one-page visual diff under `docs/pr/` for reviewers.

---

### Wave 1 — Phase 1 carry-over (parallelism: 3 agents)

**Goal.** Close out every follow-up listed in `pass-file-3.md`. These are
disjoint in the file tree, small enough to land in one pass each, and unlock
Wave 2's UI work and the SIRENE/Pappers integration that Phase 2 templates
depend on.

#### 1.1 Observability scaffold (`[Raffinement]`)

- **Scope.** Create `src/common/observability/` (init module, opt-in flag,
  no-op default). Add `src/process/observability/init.ts` (main-process
  bootstrap using `@sentry/electron`) and
  `src/renderer/services/observability/init.ts` (renderer bootstrap). Wire a
  single opt-in toggle through settings via a new `observability` key in
  `src/common/config/`. Add a `tests/unit/observability.test.ts`. Do not
  touch `maBridge` in this pass; expose the settings toggle through the
  existing settings surface.
- **Testing.**
  - Unit: default is no-op, `init()` is idempotent, toggling off clears
    scopes, PII scrubber removes `email`, `siren`, `siret`, names.
  - Integration (manual): `SENTRY_DSN=<test>` env triggers emission; without
    it no network call is made (use `nock` or a fake transport).
- **Success criteria.**
  - Every process has a single `initObservability()` entry point.
  - Zero traffic to Sentry in the default user profile.
  - `docs/adr/0007-observability-scaffold.md` documents the opt-in design,
    PII rules, and why PostHog is deferred to Wave 4.
- **Depends on.** —
- **Runs with.** 1.2 and 1.3 (disjoint file trees).

#### 1.2 SIRENE MCP server (`[Chaleur]`)

- **Scope.** `src/process/services/mcpServices/sirene/` (server entry point,
  HTTP client with INSEE auth, SQLite-cached lookups with 24 h TTL, rate
  limiter, error classes with fr-FR-ready keys), plus `tests/unit/ma/sireneMcp.test.ts`
  (≥ 15 integration-flavoured tests with `msw` or `undici` mocks).
- **Testing.**
  - Company search by SIREN / SIRET returns `raisonSociale`, address, NAF,
    `effectif`.
  - Establishment lookup, legal-event history.
  - Rate-limit handling (429 → exponential backoff, respects
    `X-RateLimit-Reset`).
  - 24 h cache hit, stale-cache fallback on API outage.
  - All error messages carry `ma.mcp.sirene.errors.*` i18n keys (fr-FR
    and en-US only in this pass).
- **Success criteria.** Docs at `docs/mcp-servers/sirene.md`. ADR 0008
  documenting endpoint selection and cache strategy. No hard-coded API key;
  read from OS keychain placeholder or env (Wave 5 moves keys to keychain).
- **Depends on.** —
- **Runs with.** 1.1 and 1.3.

#### 1.3 fr-FR reference-locale flip + glossary growth to 130 (`[Chaleur]`)

- **Scope.** Two coupled but file-disjoint edits:
  - Flip the i18n reference from `en-US` to `fr-FR` in
    `src/common/config/i18n-config.json` **after** running a completeness
    audit across all 19 modules; machine-translate any fr-FR gap uncovered.
  - Grow `src/common/ma/glossary/entries.ts` from 80 → 130 with Phase-3 /
    Phase-5 terms (sell-side auction, GDPR, AML/KYC cards, sanctions
    screening, VDR sub-terms, MAC clause, earn-out variants, _bon de
    souscription_, _pacte d'actionnaires_).
- **Testing.** `tests/unit/ma/glossary.test.ts` asserts ≥ 130 entries,
  integrity of `relatedIds`, every new entry has `termFr`, `termEn`, both
  definitions. `node scripts/check-i18n.js` must report "translations are
  complete" across every locale with fr-FR as reference.
- **Success criteria.** Reference flip lands without a single missing-key
  warning. ADR 0009 documents the flip and the review workflow that
  replaces English review.
- **Depends on.** —
- **Runs with.** 1.1 and 1.2.

#### 1.4 Wave-1 wiring close-out (serialized, must run LAST in the wave)

- **Scope.** Regenerate `src/renderer/services/i18n/i18n-keys.d.ts`. Append
  the `Added (Completer pass W1)` block to `CHANGELOG.md`. Open one
  consolidated PR description that references the three worktrees merged in
  this wave.
- **Depends on.** 1.1, 1.2, 1.3 merged.
- **Runs with.** — (solo).

**Wave 1 — UI/UX spec.** Observability opt-in surfaces as a toggle in the
existing `SystemSettings` page (Wave 1.1) with fr-FR/en-US copy, a
privacy disclaimer in serif H3, and an "Apprendre plus" link to
`docs/SECURITY.md#observability`. SIRENE error states (Wave 1.2) always
render through the shared `<ErrorState />` from Wave 0.3 with an i18n
`aria-live="assertive"` message. No new UI is introduced by 1.3 — but
the fr-FR reference flip is user-visible: every module must be
screenshot-diffed against the pre-flip baseline.

---

### Wave 1.5 — Data Intelligence Foundations (parallelism: 3 agents)

**Goal.** Ship the persistent data spine that every French-data-intensive
feature downstream will consume — companies, contacts, watchlists,
data.gouv.fr catalogue access, and the RAG/KB chunks + embeddings tables
that Wave 6's Flowise binding will upsert into. Running this wave right
after Wave 1 (observability + SIRENE + fr-FR flip) unblocks Wave 2's
Pappers work, Wave 3's Company/Valuation/Sector UI, Wave 5's Kanban
(contacts), Wave 6's RAG pipeline, and Wave 7's daily-brief.

All three tracks are file-disjoint and worktree-safe.

#### 1.5.1 Schema + repositories for M&A data spine (`[Raffinement]`)

- **Scope.** One migration, three repositories, deterministic Zod
  contracts in `src/common/ma/*`.
  - Add `migration_v28` under `src/process/services/database/migrations.ts`
    creating: - `ma_companies` — `(id, siren, siret, name, legal_form,
naf_code, sector_id, jurisdiction, headquarters_address,
registered_at, employee_count, revenue, sources_json,
last_enriched_at, created_at, updated_at)` with indexes on `siren`,
    `siret`, `sector_id`, `jurisdiction`. - `ma_contacts` — `(id, company_id?, deal_id?, full_name, role,
email, phone, linkedin_url, notes, created_at, updated_at)` with
    indexes on `company_id`, `deal_id`, `email`. - `ma_watchlists` — `(id, owner_user_id, name, criteria_json,
cadence, enabled, created_at, updated_at)` + a companion
    `ma_watchlist_hits` `(id, watchlist_id, payload_json, matched_at,
seen_at)` for cron output. - `ma_datagouv_cache` — `(id, api_surface, key_json, payload_json,
fetched_at, ttl_ms, source_url)` where `api_surface` is one of
    `main`, `metrics`, `tabular`, `dataservices`. - `ma_kb_sources` — `(id, scope, scope_id, flowise_document_store_id,
embedding_model, chunk_count, last_ingested_at, status,
error_text)` where `scope` is `deal | company | glossary | sector |
global`. - `ma_documents_chunks` — `(id, document_id, deal_id, chunk_index,
text, token_count, flowise_chunk_id, metadata_json, created_at)`
    with indexes on `document_id`, `deal_id`. - `ma_chatflow_registry` — `(flow_key, flow_id, prompt_version_id,
status, description, updated_at)`. - `ma_prompt_versions` — `(id, flow_key, hash, payload_json,
created_at, created_by)`.
  - Down-migrations drop each table in reverse dependency order and are
    covered by the existing migration integration test.
  - Add repositories under
    `src/process/services/database/repositories/ma/` named
    `CompanyRepository.ts`, `ContactRepository.ts`,
    `WatchlistRepository.ts`, `DatagouvCacheRepository.ts`,
    `KbSourceRepository.ts`, `DocumentChunkRepository.ts`,
    `ChatflowRegistryRepository.ts`, `PromptVersionRepository.ts`. Each
    exports a singleton getter (`getXxxRepository()`), deterministic
    `IQueryResult<T>` returns, and Zod-parsed row mappers.
  - Zod contracts land in `src/common/ma/company/schema.ts`,
    `src/common/ma/contact/schema.ts`, `src/common/ma/watchlist/schema.ts`,
    `src/common/ma/kb/schema.ts`, `src/common/ma/flowise/schema.ts`.
- **Testing.**
  - `tests/unit/ma/schema.migrationV28.test.ts` — applies the migration
    against an in-memory DB and asserts every table + index exists.
  - `tests/unit/ma/companyRepository.test.ts`, `contactRepository.test.ts`,
    `watchlistRepository.test.ts`, `kbSourceRepository.test.ts`,
    `documentChunkRepository.test.ts`, `chatflowRegistryRepository.test.ts`
    — cover insert / update / upsert / list / query-by-index / cascading
    delete paths. Minimum 25 cases per repository.
- **Success criteria.** Migration applies cleanly on a fresh DB and on an
  existing v27 DB; all repositories ≥ 80 % coverage; Zod schemas consumed
  from the renderer via `@/common/ma/*` without breaking the process
  boundary.
- **Depends on.** Wave 1.
- **Runs with.** 1.5.2 and 1.5.3.

#### 1.5.2 data.gouv.fr MCP server + HTTP client (`[Chaleur]`)

- **Scope.** Implement the first native French open-data harness inside
  Largo, guided by the `datagouv-apis` skill.
  - `src/process/services/mcpServices/datagouv/` with a server entry,
    tool handlers, and a typed HTTP client.
  - Tool surface (at minimum):
    - `datagouv.search_datasets({ q, filters, sort, page_size })` →
      `GET /api/1/datasets/`.
    - `datagouv.get_dataset({ id_or_slug })` → `GET /api/1/datasets/{id}/`.
    - `datagouv.list_dataset_resources({ id_or_slug })` with slug→UUID
      resolution.
    - `datagouv.query_tabular({ rid, filters, order_by, page_size })` →
      Tabular API (`GET /api/tabular/.../resource/{rid}/data/`).
    - `datagouv.metrics({ model, filters })` → Metrics API.
    - `datagouv.search_dataservices({ q, filters })` and
      `datagouv.get_dataservice({ id })` → Dataservices (the
      ex-api.gouv.fr catalogue).
  - Client in `src/process/services/data/datagouvClient.ts` responsible
    for pagination (`next_page` follow), rate-limiting (1 req/s default),
    retry-with-backoff, and writing to `ma_datagouv_cache` with a 24 h TTL
    (overridable per surface).
  - Register the provider in Settings → Integrations as a **native** (not
    Nango-backed) integration; expose connect / test-connection UI.
  - Add an OpenAPI spec under
    `docs/integrations/datagouv.openapi.yaml` for documentation parity.
  - Extend `IntegrationService.inferCategory` with a `research` bucket
    for open-data providers and surface data.gouv.fr + any dataservices
    the user chooses to pin.
- **Testing.**
  - `tests/unit/data/datagouvClient.test.ts` with nock-style HTTP
    fixtures; cover: happy-path search, pagination follow, Tabular row
    filtering, Metrics model enumeration, dataservice resolution,
    rate-limit retry, cache hit / miss / stale, error codes.
  - `tests/e2e/specs/mcpDatagouv.spec.ts` — smoke against a disposable
    mock server (not the live API). Real API smoke runs weekly in a
    scheduled CI job guarded by opt-in.
- **Success criteria.** Tool invocations return typed payloads, respect
  pagination and rate limits, and populate `ma_datagouv_cache`.
- **Depends on.** 1.5.1 (for the cache table).
- **Runs with.** 1.5.1 and 1.5.3.

#### 1.5.3 Contacts + Watchlists CRUD + auto-enrichment cron (`[Chaleur]`)

- **Scope.**
  - `src/process/services/ma/ContactService.ts` and
    `WatchlistService.ts` wrapping the 1.5.1 repositories; IPC exposure
    through `src/process/bridge/maBridge.ts` under `ma.contact.*` and
    `ma.watchlist.*`.
  - `src/process/services/ma/CompanyEnrichmentService.ts` — orchestrates
    SIRENE (Wave 1.2) + Pappers (Wave 2.1) + data.gouv.fr enrichers
    against `ma_companies`, writing field-level attribution into
    `sources_json` and coalescing through the existing
    `common/ma/company/merge.ts`. For this wave, **only SIRENE** is live
    (Wave 1.2 already merged); Pappers wires through Wave 2.1 without
    touching this service.
  - Register three cron templates in the existing `cron_jobs` table:
    - `ma.enrichment.companies-daily` — walks every active deal's
      `ma_companies` rows older than 24 h and refreshes them.
    - `ma.watchlists.evaluate` — runs each enabled watchlist's criteria
      against the latest enrichment pass; hits persist into
      `ma_watchlist_hits` and optionally emit a toast / email.
    - `ma.datagouv.housekeeping` — expires stale
      `ma_datagouv_cache` rows based on `ttl_ms`.
  - Minimal renderer surfaces (full UI polish lives in Wave 3 and 5):
    - `src/renderer/pages/ma/Contacts/ContactsPage.tsx` (list + detail
      drawer, Arco Table, `useLargoFormat` where relevant).
    - `src/renderer/pages/ma/Watchlists/WatchlistsPage.tsx` (list +
      criteria editor + last-hit feed).
    - Register both under the `MaLayout` sidebar created by Wave 2.3.
- **Testing.**
  - `tests/unit/ma/contactService.test.ts`,
    `watchlistService.test.ts`, `companyEnrichmentService.test.ts` —
    each ≥ 20 cases, covering happy path + SIRENE failure + merge
    priority rules + attribution stamping.
  - `tests/unit/cron/maEnrichmentJob.test.ts` — triggers the cron in a
    synchronous harness and asserts the expected rows are persisted.
  - DOM tests for the two pages; axe-core snapshot.
- **Success criteria.** A user can create / edit / delete contacts and
  watchlists; cron-driven enrichment runs without errors against the
  SIRENE test creds; `ma_companies` carries field-level attribution.
- **Depends on.** 1.5.1 (schema), 1.5.2 (datagouv client for enrichment
  extras), Wave 1.2 (SIRENE MCP), Wave 2.3 for layout slot (deferrable
  — pages can ship behind a temporary route until 2.3 lands).
- **Runs with.** 1.5.1 and 1.5.2.

#### 1.5.4 Wave-1.5 wiring close-out (serialized)

- Regen `i18n-keys.d.ts`. CHANGELOG entry. Publish
  `docs/pr/wave-1.5-data-intel.md` with the schema diagram + the
  three new cron jobs' expected cadences. Extend
  `docs/tech/architecture.md` to document the new data spine.

---

### Wave 2 — Phase 1.1–1.2 completion + DD finish line (parallelism: 3 agents)

**Goal.** Make the due-diligence surface first-class citizens of the app and
land the Pappers server so the valuation UI in Wave 3 can consume real data.

#### 2.1 Pappers MCP server (`[Chaleur]`)

- **Scope.** `src/process/services/mcpServices/pappers/` mirroring the SIRENE
  layout; share the SQLite cache backend via a small
  `src/process/services/mcpServices/_shared/cache.ts` file created in this
  pass (if absent — check first; if Wave 1 created it, reuse). Tests live in
  `tests/unit/ma/pappersMcp.test.ts` (≥ 20 tests). Cover company profile
  (dirigeants, bénéficiaires effectifs, capital, forme juridique), 5-year
  financial series, _actes et statuts_ download, _procédures collectives_
  check, _dirigeant_ network. ≥ 35 combined tests across SIRENE + Pappers per
  ROADMAP § 1.2.
- **Success criteria.** `docs/mcp-servers/pappers.md`. ADR 0010. Financial
  cache TTL = 7 days, company data = 24 h. No regression on Wave 1 shared
  cache.
- **Depends on.** Wave 1 (shared cache, SIRENE template).
- **Runs with.** 2.2 and 2.3.

#### 2.2 FinancialExtractionService + FinancialTable (`[Raffinement]`)

- **Scope.**
  - `src/process/services/ma/FinancialExtractionService.ts` — extracts
    revenue, EBITDA, net income, assets, liabilities; normalises currencies;
    organises multi-year; exports to CSV and `.xlsx` via the existing
    OfficeCLI skill plumbing.
  - `src/renderer/components/ma/FinancialTable/` — Arco-based table with
    year-over-year comparison, inline editing, export button.
  - `src/renderer/hooks/ma/useFinancials.ts` — state + IPC.
  - `tests/unit/ma/financialExtraction.test.ts` (≥ 25 tests: accuracy on a
    known-good Pappers JSON fixture; normalisation edge cases; CSV/XLSX
    format).
- **Success criteria.** Runs via the document worker without blocking the UI.
  Service is reusable by the upcoming report generator.
- **Depends on.** Wave 1; Pappers not strictly required — service works on
  any `FinancialMetrics` input.
- **Runs with.** 2.1 and 2.3.

#### 2.3 M&A shell: MaLayout + TopBar + Router + CommandPalette + MaHome (`[Respiration]`)

- **Scope.**
  - `src/renderer/pages/ma/MaLayout.tsx` — the single shell documented in
    § 1.4.12: left sidebar (sections listed there), top bar with active-deal
    indicator + deal quick-switcher + breadcrumbs + Cmd/Ctrl+K launcher,
    main outlet. Serif section headings, 24 px page margins, mobile drawer
    under 900 px.
  - `src/renderer/components/ma/TopBar/` — active-deal chip (Icon Park
    `Briefcase`), breadcrumb trail, deal-switcher popover reusing
    `DealSelector`, command-palette launcher button (`Cmd/Ctrl+K` hint).
  - `src/renderer/components/ma/CommandPalette/` — full-screen overlay
    (`[Respiration]`), fuzzy search across deals / companies / documents /
    glossary / analyses / settings, keyboard navigation with arrow keys +
    Enter, Escape to close, `role="dialog"` + `aria-modal="true"`,
    `aria-activedescendant` for the current result.
  - `src/renderer/components/ma/KeyboardHelp/` — `?`-triggered modal listing
    every registered shortcut, grouped by domain. Uses the shared shortcut
    registry introduced in this task (`src/renderer/services/shortcuts/`).
  - `src/renderer/pages/ma/MaHome.tsx` — 3-column dashboard: active deal
    summary (Valuation range, risk score, next suggested action), recent
    documents list, recent analyses list. Uses `<Skeleton />` on first
    render and `<EmptyState />` for first-run users with the onboarding
    CTAs from § 2.0.1.
  - `src/renderer/pages/ma/index.ts` exposing the layout and child pages.
  - Register `/ma/*` routes in `src/renderer/components/layout/Router.tsx`
    (the _only_ serialised file in this wave). Routes: `/ma`,
    `/ma/home`, `/ma/deals`, `/ma/deals/:id`, `/ma/documents`,
    `/ma/documents/:id`, `/ma/due-diligence`, `/ma/due-diligence/:dealId`.
    Every route is `React.lazy` wrapped in `withRouteFallback`.
  - Register the M&A section in the app-level navigation (the existing
    `Sider` under `src/renderer/components/layout/Sider/`) as a top-level
    entry beneath "Conversation".
  - Add the full `ma.dueDiligence.*` key set discovered while wiring the
    DD page (including ARIA live-region announcements).
  - Extend the shortcut registry so `Cmd/Ctrl+K` opens the palette,
    `G → D` goes to Due Diligence, `G → V` Valuation, `G → P` Profile.
- **Testing.**
  - Route-level Playwright smoke under `tests/e2e/specs/ma.spec.ts`:
    navigate to each `/ma/*` path, confirm no console errors, confirm
    sidebar translation keys resolve, confirm the active-deal chip
    renders on every page.
  - Command-palette DOM test (`tests/unit/ma/commandPalette.dom.test.tsx`)
    covering keyboard nav, fuzzy match ordering, and Escape dismissal.
  - Accessibility: axe-core run via `@axe-core/playwright` against every
    new route; zero critical/serious violations.
  - Visual-regression snapshot of `MaHome` (empty, one-deal, multi-deal).
- **Success criteria.** Every existing and future M&A surface is reachable
  through the shell. Deal switching is always one click away. Keyboard
  shortcuts documented and help modal reachable via `?`. No direct
  imports of pages from outside `pages/ma/`.
- **Depends on.** Wave 0 (primitives, tokens, i18n sweep) and Wave 1.3
  (fr-FR flip).
- **Runs with.** 2.1 and 2.2. **Do not co-schedule with any other task that
  edits `Router.tsx` or the `Sider` directory.**

#### 2.4 Wave-2 wiring close-out

- Regen `i18n-keys.d.ts`, bump CHANGELOG, one PR referencing the three
  worktrees. Publish a short `docs/pr/wave-2-ux.md` screenshot tour of the
  new M&A shell.

**Wave 2 — UI/UX spec.**

- 2.1 Pappers surfaces errors through `<ErrorState />` with rate-limit
  retry guidance in fr-FR; no new UI beyond the Settings integration row.
- 2.2 `<FinancialTable />` uses JetBrains Mono for numeric columns,
  right-aligned currency, `useLargoFormat().currency()` throughout;
  negative values in `--danger`. Inline edit uses Arco `Input` with the
  default Mint Whisper focus ring. Keyboard: `Tab` between cells, `Enter`
  commits, `Esc` cancels. Export buttons disabled-until-valid.
- 2.3 see detailed scope above.

---

### Wave 3 — Phase 1.3/1.5/1.6 UI surface (parallelism: 3 agents)

**Goal.** Turn the headless `common/ma/{valuation,company,sector}` modules
into first-class user surfaces. Pappers + SIRENE are now available.

#### 3.1 Valuation workbench page (`[Raffinement]`)

- **Scope.** `src/renderer/pages/ma/Valuation/`, `components/ma/ValuationForm/`,
  `components/ma/ValuationFootballField/`, `components/ma/ValuationSensitivity/`,
  `hooks/ma/useValuation.ts`. No `common/ma/valuation/` edits — reuse the pure
  engine. Add an Excel export wired to the existing `xlsx` skill.
- **Testing.** DOM tests under `tests/unit/ma/valuationWorkbench.dom.test.tsx`
  covering form → engine → render paths for DCF, multiples, ANR, rule-of-thumb;
  snapshot of the football field chart.
- **Success criteria.** Sensitivity tornado matches engine output byte-for-byte;
  Excel export reproduces assumptions + discounted cash flows; page reachable
  from the `MaLayout` sidebar added in 2.3.
- **Depends on.** Wave 2 (MaLayout, router wiring).
- **Runs with.** 3.2 and 3.3.

#### 3.2 Company profile aggregator UI (`[Fraîcheur]`)

- **Scope.** `src/renderer/pages/ma/CompanyProfile/`,
  `components/ma/CompanyCard/`, `components/ma/CompanyComparison/`,
  `hooks/ma/useCompanyProfile.ts`. Uses SIRENE + Pappers MCP servers via the
  existing IntegrationService proxy pattern.
- **Testing.** `tests/unit/ma/companyProfile.ui.dom.test.tsx` covering merge
  rendering, comparison view (2–4 companies), search by name/SIREN/sector.
- **Success criteria.** Profile card reaches visual parity with the mockups
  (see `docs/design/`). Source attribution per field is visible on hover.
- **Depends on.** Wave 2 (MaLayout, Pappers MCP).
- **Runs with.** 3.1 and 3.3.

#### 3.3 Sector overview + intel page (`[Fraîcheur]`)

- **Scope.** `src/renderer/pages/ma/Sector/` consuming
  `common/ma/sector/catalogue.ts`, with per-sector card showing key metrics,
  recent transactions (stubbed — filled in Wave 4.3), multiples drawn from
  `common/ma/valuation/ruleOfThumb.ts` when a rule exists.
- **Testing.** `tests/unit/ma/sectorPage.dom.test.tsx`. Regression on
  i18n coverage of all 31 sectors.
- **Success criteria.** Sector suggestions auto-surface in the valuation
  workbench (3.1) via a shared `resolveProfileSector` hook.
- **Depends on.** Wave 2.
- **Runs with.** 3.1 and 3.2.

#### 3.4 Wave-3 wiring close-out (serialized)

- Regen `i18n-keys.d.ts`. CHANGELOG. Publish `docs/pr/wave-3-ux.md`.

**Wave 3 — UI/UX spec.**

- 3.1 Valuation workbench: split-pane (inputs left / live outputs right)
  on ≥ 1280 px; stacked on < 900 px. Tornado chart uses the AOU mint scale
  exclusively (no secondary hue). Football-field uses `bg-aou-3` for
  method ranges + `bg-aou-7` for the overall envelope. Every numeric
  input is decimal-grouped via `useLargoFormat().number()`, with unit
  badges (`%`, `x`, `€M`) as inline suffixes.
- 3.2 Company profile card: hero uses serif H1 with Mint Whisper brand
  underline (1 px `--aou-6`). Field-level source attribution rendered as
  `<Tag />` chips with tooltip on hover and `aria-describedby` on focus.
  Side-by-side comparison honours the 1440 px breakpoint (max 4 columns,
  horizontal scroll with sticky first column below that).
- 3.3 Sector page: 31-card grid (responsive: 1/2/3/4 columns). Each card
  picks a **single** mint shade from the AOU scale as its accent — the
  scale index is derived from a hash of the sector id so the same sector
  always gets the same accent, guaranteeing visual memorability without
  breaking the single-hue discipline.

---

### Wave 4 — Phase 2 document automation (parallelism: 3 agents across scopes)

**Goal.** Ship every document generator Largo needs for the deal lifecycle.
All templates live under `src/common/ma/templates/<kind>/` (pure), all
generators under `src/process/services/ma/reports/<Kind>Generator.ts`,
every UI under `src/renderer/pages/ma/<Kind>/`. This guarantees three agents
can run 4.1 + 4.2 + 4.3 simultaneously without conflict.

#### 4.0 Template registry + ReportGenerator core (gating task)

- **Scope.** `src/common/ma/templates/index.ts` (Zod-validated registry),
  `src/process/services/ma/reports/ReportGenerator.ts` (renders HTML,
  PDF via `puppeteer-core` reuse, DOCX via `docx`, XLSX via `xlsx`).
  Tests at `tests/unit/ma/reportGenerator.test.ts` (≥ 20 tests per ROADMAP
  § 12.4).
- **Success criteria.** Any later template can be added by dropping a file
  under `templates/<kind>/` and registering it; the generator stays agnostic.
- **Depends on.** Wave 3.
- **Runs with.** — (solo; blocks 4.1/4.2/4.3).

#### 4.1 NDA + LOI + DD-checklist generators (`[Chaleur]`)

- **Scope.** `templates/nda/`, `templates/loi/`, `templates/dueDiligence/`,
  corresponding UIs under `pages/ma/{NdaWizard,LoiWizard,DdChecklist}/`.
- **Success criteria.** 3 NDA variants (unilateral, bilateral, standstill),
  2 LOI variants (binding, non-binding), 6 DD categories
  (financial, legal, tax, HR, IT, environmental). All strings in
  fr-FR + en-US.
- **Depends on.** 4.0.
- **Runs with.** 4.2 and 4.3.

#### 4.2 Teaser + IM generators (`[Raffinement]`)

- **Scope.** `templates/teaser/` (anonymisation engine lives under
  `src/common/ma/templates/_shared/anonymise.ts`), `templates/im/` (12
  standard sections), `pages/ma/{TeaserGenerator,ImBuilder}/`.
- **Success criteria.** IM sections are independently re-generatable; teaser
  anonymisation replaces every occurrence of the target name, dirigeants,
  and addresses (test against a curated fixture).
- **Depends on.** 4.0.
- **Runs with.** 4.1 and 4.3.

#### 4.3 Valuation report generator (`[Raffinement]`)

- **Scope.** `templates/valuationReport/`, `pages/ma/ValuationReport/`. Uses
  `common/ma/valuation` outputs and the football-field / sensitivity
  components (3.1). Exports to Word + Excel + PDF.
- **Depends on.** 4.0, 3.1.
- **Runs with.** 4.1 and 4.2.

#### 4.4 Wave-4 wiring close-out (serialized)

- Regen i18n types; append CHANGELOG; `docs/pr/wave-4-ux.md` with
  before/after document screenshots and the final template gallery shot.

**Wave 4 — UI/UX spec.**

- Document preview pane is always on the right (≥ 1280 px) or toggled via
  a bottom sheet (< 900 px). Real-time preview uses a 300 ms debounce
  so typing does not jank.
- Template gallery: 4-column grid on wide, 2-column on tablet, 1 on
  mobile. Each template card uses a serif title and a 3-line description.
  Hover raises the card via `background-color` transition only (no
  transform), respecting reduced-motion.
- Wizard UIs (NDA, LOI, DD) share a common `<WizardShell />` with a
  horizontal stepper (reusing `aionui-steps` override), keyboard
  navigation (`←`/`→` between steps), and Save-as-draft on every step.
- IM builder exposes drag-and-drop section reordering with
  `aria-grabbed` / `aria-dropeffect` fallbacks for screen readers and a
  keyboard-only reorder mode (`Alt+↑`/`Alt+↓`).
- Report export modal shows format chips (Word / Excel / PDF) with the
  Mint Whisper brand-light background on selection.
- Every anonymisation output is previewed with the redacted spans
  highlighted in `bg-aou-2` + a "N redactions" badge in the header.

---

### Wave 5 — Phase 3 communication & CRM (parallelism: 3 agents)

**Goal.** Connect Largo to the dealmaker's communication ecosystem.

#### 5.1 Contacts + Kanban deal pipeline (`[Respiration]`)

- **Scope.** `src/common/ma/pipeline/{stages,types}.ts`,
  `src/process/services/database/repositories/ma/ContactRepository.ts`,
  `src/process/services/ma/PipelineService.ts`, `pages/ma/Contacts/`,
  `pages/ma/Pipeline/`, hooks under `hooks/ma/`. Adds two new tables
  (`ma_contacts`, `ma_deal_stage_events`) via a new migration file —
  migration must be append-only to `migrations.ts`.
- **Success criteria.** 8 configurable stages (Origination → Closing).
  Pipeline-value summary widget. Stage transition automation suggests next
  actions per stage. Kanban drag-and-drop verified in Playwright.
- **Depends on.** Wave 4.
- **Runs with.** 5.2 and 5.3.

#### 5.2 WhatsApp MCP (Baileys) (`[Chaleur]`)

- **Scope.** `src/process/services/mcpServices/whatsapp/` (Baileys client,
  QR auth flow, rate limiter, webhook dispatch). UI under
  `pages/ma/Communications/Whatsapp*` plus a "Share via WhatsApp" action in
  the reports UI. Tests under `tests/unit/ma/whatsappMcp.test.ts` (mocked
  Baileys).
- **Depends on.** Wave 4 (for "share document" hook).
- **Runs with.** 5.1 and 5.3.

#### 5.3 Email MCP (IMAP/SMTP) + Pipedrive MCP (`[Chaleur]`)

- **Scope.** `src/process/services/mcpServices/email/`,
  `src/process/services/mcpServices/pipedrive/`, compose UI under
  `pages/ma/Communications/EmailCompose/`, Pipedrive connect wizard under
  `pages/ma/Settings/PipedriveConnect/`. Reuse IntegrationService (Nango)
  for Pipedrive OAuth.
- **Depends on.** Wave 4.
- **Runs with.** 5.1 and 5.2.

#### 5.4 Wave-5 wiring close-out (serialized)

- Regen i18n types; CHANGELOG; `docs/pr/wave-5-ux.md`.

**Wave 5 — UI/UX spec.**

- 5.1 Kanban: 8 columns with sticky headers and a "pipeline value"
  footer. Cards show deal name (serif), target (sans), stage age
  (`useLargoFormat().relativeTime()`), and a severity dot reusing
  `--success`/`--warning`/`--danger` for "on-track / at-risk / stalled".
  Drag-and-drop is pointer-driven but must provide a keyboard fallback
  (`Space` to pick up, arrows to move, `Space` to drop) per WCAG 2.1.5.
  Horizontal scroll with snap points on < 1440 px widths.
- 5.2 WhatsApp QR auth uses a centred card with the official WhatsApp
  brand-safe colouring (only for the QR affordance), surrounded by Mint
  Whisper chrome. Pairing success triggers a `<Toast>` with the directional
  gradient override.
- 5.3 Email compose uses Arco `RichTextEditor`; template picker lives in
  a popover with search. Pipedrive connect wizard uses Mint Whisper
  buttons, never Pipedrive green.
- Contacts page honours the Respiration rule — 24 px row height minimum,
  48 px avatar, 16 px inter-field padding.

---

### Wave 6 — Flowise production binding + RAG/KB pipeline + Ops hardening (parallelism: 3 agents across 7 tasks)

**Goal.** Make `https://filo.manuora.fr` the canonical AI backend for
**every** Largo feature end-to-end: server bootstrap, client runtime
config, chatflow registry, per-feature catalogue, RAG/KB ingestion
pipeline, prompt versioning, and the remaining operational hardening
(Drizzle dual-run, source-maps in CI). By the end of this wave Wave 7's
dashboard, daily brief, and analytics surfaces can assume a reachable,
versioned, observably-tagged Flowise.

**Tracks.**

- Track A — client/runtime/catalogue (6.4 + 6.5 + 6.6): tight sequencing.
- Track B — server/ops (6.1 + 6.2 + 6.3): runs in parallel with track A.
- Track C — end-to-end wiring audit (6.7): runs last, consumes A + B.

**Hosted-platform accelerators are deferred to Wave 10 (post-launch).**
The Coolify platform at `manuora.fr` already hosts MetaMCP, Browserless,
RSSHub, Infisical, and Langfuse — but none is required to ship Largo.
Every capability they enable has a first-class Largo-native fallback
that Wave 6 implements (in-process Playwright, `rss-parser`, direct
Largo-process MCP clients, OS keychain + `.env`, OTel → Sentry). The
hosted services are layered on top as opportunistic enhancements in
Wave 10.

See `docs/audit/2026-04-20-backend-snapshot-findings.md` for the audit
that surfaced the accelerators and
`docs/plans/2026-04-20-backend-scaling-plan.md` for the full target
architecture (tool catalogue, Qdrant topology, secret lifecycle,
observability). The scaling plan is written so each hosted service is
an accelerator, not a prerequisite.

#### 6.1 Drizzle dual-run (`[Raffinement]`)

- **Scope.** Introduce `drizzle-orm` + `drizzle-kit` behind a
  `LARGO_DRIZZLE=1` feature flag. Port the M&A repositories' **read**
  paths only (including the new Wave 1.5 repositories). Keep raw-SQL
  writes untouched. ADR 0011 documents the strategy. Tests under
  `tests/unit/ma/drizzleDualRun.test.ts`.
- **Depends on.** Wave 1 (observability), Wave 1.5 (new repositories).
- **Runs with.** 6.2 and 6.3.

#### 6.2 Source-map upload + web-vitals + Flowise span export in CI

- **Scope.** Extend `.github/workflows/ci.yml` with:
  - A Sentry source-map upload step gated on secrets.
  - A Lighthouse-CI run on the WebUI build artefact (perf, a11y,
    best-practices budgets).
  - A Flowise-span export smoke that asserts OTel spans for a sample
    `ma.dd.analysis` run carry `flowKey` and `promptVersionId`
    attributes (consumes 6.4 + 6.6).
    Update ADR 0003 in place.
- **Depends on.** Wave 1 (observability init), 6.4, 6.6.
- **Runs with.** 6.1 and 6.3.

#### 6.3 Flowise production bootstrap (server-side, `chatbuild/flowise_automation/`)

- **Scope.** Execute tasks 1–8 of
  `docs/plans/2026-04-19-flowise-prod-bootstrap.md` against
  `https://filo.manuora.fr`. Worktree-isolated from the Electron tree;
  runs in parallel with the client tracks.
- **Adds to the plan (beyond what the prod-bootstrap doc already covers).**
  - Export the canonical **chatflow catalogue** into
    `chatbuild/flowise_automation/flows/*.json` (one flow per
    `flowKey` from 6.6). Script-based import on bootstrap, diff on
    reconcile.
  - Seed `chatbuild/flowise_automation/output/largo_local_kb.json` into
    the curated document store and expose its id in
    `chatbuild/flowise_automation/config/prod-config.template.json`.
  - Configure the document store with the embedding model chosen in 6.5
    (OpenAI `text-embedding-3-large` unless the user pins another in
    Settings).
  - Add a **reverse-proxy note** pinning TLS to the `filo.manuora.fr`
    certificate and documenting the API key rotation process.
- **Status (2026-04-20).** Repo artefacts are complete:
  - `src/common/ma/flowise/` (catalogue, flowKey, index)
  - `chatbuild/flowise_automation/flows/*.json` (15 flow envelopes)
  - `docs/integrations/*.openapi.yaml` (12 tool specs)
  - `chatbuild/flowise_automation/credentials-rename.json` (13 renames)
  - `chatbuild/flowise_automation/collections-retirement.md` (KB plan)
  - `chatbuild/flowise_automation/Sync-LargoFlowise.ps1` (dry-run + apply)
    Server execution (credential renames, flow imports, collection retirement)
    remains pending — the operator will run `Sync-LargoFlowise.ps1 -Apply` with a
    fresh service key in a dedicated session.
- **Success criteria.** End-to-end smoke tests green on
  `filo.manuora.fr`; drift detection and backup cron jobs scheduled;
  runbook published in `chatbuild/flowise_automation/README.md`.
- **Depends on.** —
- **Runs with.** 6.1, 6.2, 6.4.

#### 6.4 Flowise runtime config + health surface + streaming hook (`[Raffinement]`)

- **Scope.** Remove every localhost default from the Electron + WebUI
  tree and replace it with a single, typed, env-driven runtime config.
  - `src/common/flowise/config.ts` — exports
    `FlowiseRuntimeConfig`, `DEFAULT_FLOWISE_CONFIG = { baseUrl:
'https://filo.manuora.fr', ... }`, and
    `getFlowiseRuntimeConfig()` that reads (in priority): 1. Renderer-persisted user setting (via `ipcBridge.settings`). 2. `FLOWISE_BASE_URL` / `FLOWISE_API_KEY` env. 3. `DEFAULT_FLOWISE_CONFIG`.
  - Rewire `createFloWiseConnection` call sites in `DueDiligenceService`,
    `FloWiseAgentManager`, and any other touch point to consume
    `getFlowiseRuntimeConfig()`.
  - Update `src/common/ma/constants.ts` — `FLOWISE_DEFAULT_CONFIG.baseUrl`
    becomes `'https://filo.manuora.fr'`. Keep the shape; callers must
    **still** go through `getFlowiseRuntimeConfig()` (lint rule enforces).
  - `src/renderer/pages/settings/FlowiseSettings.tsx` — UI to override
    base URL / API key at runtime; test-connection button calling
    `healthCheck()`; a "use default" reset; fr-FR / en-US copy via i18n.
    Registered in the existing Settings navigation.
  - `src/renderer/hooks/useFlowiseStream.ts` — the single streaming hook
    every page must consume. Signature:
    `useFlowiseStream(flowKey: FlowKey, input: FlowInput, opts?)`.
    Returns `{ state, tokens, artifacts, metadata, error, cancel,
retry }`. Internally resolves `flowKey` via the catalogue (6.6),
    calls `ipcBridge.ma.flowise.stream`, and honours reduced-motion.
  - `src/renderer/components/ma/FlowiseStatus/FlowiseStatus.tsx` — the
    green/amber/red health dot rendered in the `TopBar` (Wave 2.3); polls
    every 60 s, click-through to `FlowiseSettings`, full i18n + axe-core
    compliant.
  - Add an Oxlint rule (or a `tests/unit/lint/noLocalhostFlowise.test.ts`)
    that fails the build if `'http://localhost:3000'`,
    `'localhost:3000'`, or a `createFloWiseConnection({ baseUrl: ... })`
    literal appears outside `src/common/flowise/config.ts`.
- **Testing.**
  - `tests/unit/flowise/runtimeConfig.test.ts` — resolution order, env
    override, invalid URL rejection.
  - `tests/unit/renderer/useFlowiseStream.test.tsx` — token accumulation,
    cancel, retry, error path.
  - `tests/e2e/specs/flowiseHealth.spec.ts` — health surface green
    against a mocked server.
- **Success criteria.** `filo.manuora.fr` is the default; operators can
  override without recompilation; the lint gate is green; the Settings UI
  lets a user swap endpoints and confirm reachability in < 5 seconds.
- **Depends on.** Wave 1 (observability), Wave 2.3 (TopBar slot; the
  status component can land before the slot exists and be mounted by 2.3).
- **Runs with.** 6.1 and 6.3; precedes 6.5 and 6.6.

#### 6.5 RAG / KB ingestion pipeline (`[Raffinement]`)

- **Scope.** Close the gap identified in § 0.3 L.
  - `src/process/worker/ma/IngestionWorker.ts` + `IngestionWorkerTask.ts`
    — consumes `ma_documents` rows flagged for ingestion; produces
    `ma_documents_chunks` rows with token counts and Flowise vector-store
    ids; updates `ma_kb_sources` progress.
  - `src/process/services/ma/KnowledgeBaseService.ts` — public API for
    `ingestDocument(documentId)`, `reindexDeal(dealId)`,
    `purgeDealKb(dealId)`, `listKbSources(scope, scopeId)`. Talks to
    Flowise `/api/v1/document-store` and `/api/v1/vector/upsert`
    endpoints (already declared in `FLOWISE_ENDPOINTS` but previously
    unused).
  - Chunking strategy documented in
    `docs/ma/rag-ingestion.md`: 800-token windows, 120-token overlap,
    semantic boundary preference, per-format normaliser (PDF / DOCX /
    XLSX / TXT). Reuse `DocumentProcessor.ts` for extraction.
  - Embedding model defaulted to OpenAI `text-embedding-3-large`,
    overridable per KB source through the Settings UI.
  - `src/renderer/pages/ma/Documents/KbStatusPanel.tsx` — per-deal RAG
    status (chunk count, last-ingest time, rebuild button) with progress
    toast feedback using `<Skeleton />` + `<EmptyState />`.
  - Extend `ipcBridge.ma.kb.*` with `ingest`, `reindex`, `status`, `purge`.
  - Wire the Flowise `DueDiligenceService` and all future AI features
    through the same KB: every chatflow call includes
    `overrideConfig.vars.kbSourceId` so the Flowise flow retrieves from
    the correct document store.
- **Testing.**
  - `tests/unit/ma/ingestionWorker.test.ts` — chunk boundary,
    re-ingestion idempotency, failure recovery. ≥ 25 cases.
  - `tests/unit/ma/knowledgeBaseService.test.ts` — service orchestration
    with a mocked Flowise client.
  - `tests/e2e/specs/ragPipeline.spec.ts` — upload → ingest → query
    round-trip against a disposable Flowise host.
- **Success criteria.** Any document uploaded to a deal appears,
  chunked and indexed, in the matching Flowise document store within
  60 s of upload; DD analyses now retrieve from the corpus and can cite
  source chunks.
- **Depends on.** 6.4, Wave 1.5 (`ma_documents_chunks`, `ma_kb_sources`),
  6.3 (a reachable document-store configured on the server).
- **Runs with.** 6.6.

#### 6.6 Feature-to-chatflow catalogue + prompt versioning (`[Respiration]`)

- **Scope.** Materialise the registry contract from § 1.4.13.
  - `src/common/flowise/catalog.ts` — enumerates every `flowKey` with
    its human label (i18n key), input shape (Zod), and expected output
    shape. Initial keys at minimum: `ma.dd.analysis`, `ma.dd.risk.drill`,
    `ma.valuation.draft`, `ma.docs.nda.draft`, `ma.docs.im.draft`,
    `ma.docs.loi.draft`, `ma.emails.draft`, `ma.briefs.daily`,
    `ma.company.qa`, `ma.palette.search`, `ma.glossary.explain`,
    `ma.sector.summary`. Each ships with fr-FR / en-US labels.
  - `src/process/services/ma/ChatflowRegistryService.ts` — CRUD over
    `ma_chatflow_registry`; resolves a `flowKey` to `(flowId,
promptVersionId)` at runtime with a 60 s in-memory cache.
  - `src/process/services/ma/PromptVersionService.ts` — records
    prompt-version hashes pulled from Flowise via its chatflow export
    endpoint; emits events on change so downstream features can audit.
  - `src/renderer/pages/settings/ChatflowCatalogSettings.tsx` — admin UI
    to view / override the `flowKey → flowId` mapping, pin a
    prompt-version, or roll back. Guarded by the RBAC role introduced in
    Wave 8.1 (for now, feature-flagged behind
    `LARGO_SHOW_CHATFLOW_ADMIN=1`).
  - `docs/flowise/catalog.md` — human-readable catalogue with
    screenshots and rollback procedures.
- **Testing.**
  - `tests/unit/flowise/catalog.test.ts` — completeness (every declared
    `flowKey` resolves), Zod input/output validation on each.
  - `tests/unit/ma/chatflowRegistryService.test.ts` — caching, miss
    fallback, observability attribute propagation.
- **Success criteria.** Every feature call goes through a `flowKey`;
  operators can flip a chatflow id without a code change; every rollback
  is auditable.
- **Depends on.** 6.4, 6.3, Wave 1.5 (`ma_chatflow_registry`,
  `ma_prompt_versions`).
- **Runs with.** 6.5.

#### 6.7 End-to-end Flowise wiring audit (`[Raffinement]`, serialized)

- **Scope.** The Completer who runs this task is an auditor. They:
  - Enumerate every AI touchpoint in the renderer (DD, valuation,
    company Q&A, email draft, NDA/LOI/IM wizards, daily brief, command
    palette semantic search, glossary, sector summary) and ensure each
    one binds to a `flowKey` through `useFlowiseStream`.
  - Remove any remaining direct `ipcBridge.ma.flowise.*` call sites from
    the renderer; they should all go through the shared hook.
  - Confirm observability breadcrumbs carry `flowKey`,
    `promptVersionId`, and `kbSourceId` on every call.
  - Run the end-to-end Playwright smoke
    `tests/e2e/specs/flowiseCoverage.spec.ts`: load every AI surface,
    trigger the minimal interaction, assert a Flowise call with the
    expected `flowKey` was observed (intercepted by the mocked bridge).
  - Publish `docs/pr/wave-6-flowise-wiring.md` with the full coverage
    matrix.
- **Success criteria.** Coverage matrix is 100 %; `filo.manuora.fr` is
  reachable from the smoke harness; operators can observe every call
  carrying its `flowKey` in Sentry/OTel.
- **Depends on.** 6.4, 6.5, 6.6. The audit verifies the in-process
  fallbacks are covered; Wave 10 will re-run the same audit against
  any hosted accelerators adopted post-launch.
- **Runs with.** — (solo).

> **Wave 6.8 – 6.11 (hosted-platform accelerators) were relocated to
> Wave 10** so Wave 6 stays scoped to what is strictly required for
> launch. Their specs live unchanged (MetaMCP federation,
> Browserless `web.*`, RSSHub news pipeline, Infisical secret spine)
> in Wave 10 below, and can be picked up one-per-sprint once Largo is
> in production.

<!-- Wave 6.8 – 6.11 were moved to Wave 10 (post-launch enrichment) on 2026-04-20.
     The in-scope Wave 6 critical path ends at 6.7.

#### 6.8 (moved to Wave 10) MetaMCP federation of Largo tools *(optional, `[Raffinement]`)*

> **Status: optional enhancement.** The required path is the
> Largo-process MCP clients (`src/process/services/mcpServices/<tool>/`,
> Waves 1.2, 1.5.2, 2.1) invoked directly by Flowise Custom Tools. This
> task only adds value when Largo's tool surface must be federated to
> *other* MCP clients (a partner's agent, a Zed / Cursor session). Skip
> if that need does not materialise.

- **Scope (when adopted).** Turn the already-`running:healthy` MetaMCP
  instance at `https://mcp.manuora.fr` into the federation bus for every
  Largo tool documented in
  `docs/plans/2026-04-20-backend-scaling-plan.md` § 2.
  - Author an OpenAPI spec per tool under
    `docs/integrations/<tool>.openapi.yaml` (`sirene`, `pappers`,
    `datagouv`, `browserless`, `rsshub`, `kb`, `sanctions`, `comparables`,
    `email`, `pipedrive`, `calendar`, `watchlist`). **These specs are
    worth authoring even if MetaMCP is never adopted** — they are the
    single source of truth for the Flowise Custom Tool JSONs and for the
    Largo-process clients.
  - Add `scripts/generate-flowise-tools.ts` — reads the specs and emits
    Flowise Custom Tool JSON into
    `chatbuild/flowise_automation/tools/<tool>.json`. This script is
    **required regardless** of MetaMCP adoption; it is what keeps
    Flowise tool definitions honest.
  - Add `scripts/generate-metamcp-servers.ts` — optional generator,
    only wired when MetaMCP federation is adopted.
  - Implement the Largo-process shim at
    `src/process/services/mcpServices/metamcp/MetaMcpClient.ts`:
    discovers `mcp.manuora.fr` on boot, resolves tools by stable name,
    and offers a `callTool(name, args)` helper. Feature-flagged behind
    `LARGO_METAMCP=1`; when disabled, all callers fall back to the
    per-tool Largo-process clients already in the repo.
  - Register MetaMCP as a **native** integration under
    `Settings → Integrations → Tool federation` with connect /
    test-connection UI (only visible when the feature flag is on).
- **Fallback path (when not adopted).** Flowise Custom Tools call the
  Largo-process clients directly via their local HTTP surface
  (bridge-exposed by Wave 2.3's `ipcBridge.ma.mcp.*`). No federation,
  no external consumers — but Largo works end-to-end.
- **Testing.**
  - `tests/unit/mcp/openapiGenerators.test.ts` — round-trips each tool
    through the Flowise generator and asserts a stable, byte-equal
    output. MetaMCP generator covered only when the flag is on.
  - `tests/e2e/specs/metamcpFederation.spec.ts` — optional spec, skipped
    by default; runs in the nightly when `LARGO_METAMCP=1`.
- **Success criteria.** Every tool in the catalogue is defined once as
  an OpenAPI spec; the Flowise generator output is reproducible;
  MetaMCP federation is reachable from an external MCP client iff the
  flag is enabled.
- **Depends on.** 6.3 (server-side), 6.4 (runtime config), 6.6
  (catalogue).
- **Runs with.** 6.9 — 6.11 (when adopted).

#### 6.9 `web.*` tool family *(required; Browserless is one of two backends, `[Chaleur]`)*

> **Status: the `web.*` tool family is required** for the daily brief,
> company Q&A, and valuation drafting. **The backend choice is not.**
> Ship one of the two backends below — pick Browserless if the Coolify
> service is adopted, otherwise ship the in-process Playwright fallback.
> The public API (`web.fetch`, `web.screenshot`, `web.scrape`) and the
> `ma_web_cache` table are identical across backends.

- **Common scope (ships in both paths).**
  - OpenAPI spec `docs/integrations/web.openapi.yaml` declaring:
    - `web.fetch({ url, wait_for?, timeout?, headers? })` → `{ html,
      status, final_url, content_type, fetched_at }`.
    - `web.screenshot({ url, selector?, full_page?, viewport?,
      output: 'png' | 'jpeg' })` → `{ image_base64, width, height,
      captured_at }`.
    - `web.scrape({ url, schema })` — Readability-based extraction with
      optional JSON-schema guidance.
  - `src/process/services/web/WebFetchService.ts` is the single
    consumer-facing API; it picks a backend based on
    `LARGO_WEB_BACKEND=browserless|playwright` (default: `playwright`).
  - New `ma_web_cache` table (migration v29: `id`, `url_hash`,
    `payload_json`, `fetched_at`, `ttl_ms`).
  - Shared `RateLimiter` (Wave 1.5.2); default 1 req/s/origin.
  - Flowise Custom Tool JSONs generated by 6.8's script; registered in
    the curated tool set.
  - Renderer integration points: `ma.briefs.daily` pre-flight,
    `ma.company.qa` fallback, valuation report draft scraping.
- **Backend A — Browserless (optional, accelerated path).**
  - Bring the Coolify service `browser` (type `browserless`, currently
    `exited`) back to `running:healthy`; attach a health-check probe;
    document env (`MAX_CONCURRENT_SESSIONS`, `TOKEN`) in
    `chatbuild/flowise_automation/services/browserless.md`.
  - `src/process/services/web/backends/BrowserlessBackend.ts` — HTTP
    client against `browserless.manuora.fr`, token in Infisical (or
    env as fallback).
  - Success bar: Coolify health green for 72 h; p95 `web.fetch` ≤ 8 s;
    p95 `web.screenshot` ≤ 12 s.
- **Backend B — in-process Playwright (required fallback).**
  - `src/process/services/web/backends/PlaywrightBackend.ts` — spawns
    a long-lived Chromium worker process under
    `src/process/worker/web/PlaywrightWorker.ts`. Adds the `playwright`
    and `@mozilla/readability` dependencies.
  - No external service required; works on a cold install.
  - Success bar: p95 `web.fetch` ≤ 12 s; p95 `web.screenshot` ≤ 18 s;
    Chromium bundle adds ≤ 180 MB to installer (documented in
    `docs/perf/installer-budget.md`).
- **Testing.**
  - `tests/unit/web/webFetchService.test.ts` — backend-agnostic cases
    (timeout, rate-limit, cache hit / miss / stale, schema clamp).
  - `tests/unit/web/playwrightBackend.test.ts` and
    `tests/unit/web/browserlessBackend.test.ts` — backend-specific.
  - `tests/e2e/specs/webFetch.spec.ts` — parameterised over both
    backends.
- **Depends on.** 6.4 (runtime config), 6.8 (tool generator) for the
  Flowise Custom Tool publication; 6.3 only when Backend A is chosen.
- **Runs with.** 6.10 and 6.11.

#### 6.10 `news.*` tool family + news ingest pipeline *(required; RSSHub is one of two backends, `[Fraîcheur]`)*

> **Status: the `news.*` tool family and the nightly ingest are
> required** for Wave 7's daily brief and watchlists. **The backend
> choice is not.** Ship one of the two backends below.

- **Common scope.**
  - OpenAPI spec `docs/integrations/news.openapi.yaml` declaring:
    - `news.feed({ feed_id, since?, limit? })` → `{ items[] }`.
    - `news.search({ q, since?, limit?, language?, feed_ids? })` —
      semantic search over the `news/global` Qdrant collection with
      citations.
  - `src/process/services/news/NewsService.ts` is the single public
    API; backend picked via `LARGO_NEWS_BACKEND=rsshub|in-process`
    (default: `in-process`).
  - Seed feed catalogue under `chatbuild/news/feeds.yaml` (French M&A
    press: Les Échos, Le Figaro, Capital Finance, CFnews, L'AGEFI
    Hebdo, La Tribune, etc.). Same file feeds either backend.
  - Nightly cron `ma.news.ingest` that walks every feed, normalises
    via Readability + the Largo chunker (800 / 120), upserts into
    Qdrant `largo_news_YYYYMMDD` with `source_url`, `published_at`,
    `language`, `entity_ids[]` payload, and evaluates each new entry
    against active watchlists (Wave 1.5.3 `ma.watchlists.evaluate`).
  - Renderer: `NewsFeed` widget in the Wave 7 dashboard consuming
    `news.search`.
- **Backend A — RSSHub (optional, accelerated path).**
  - Revive the Coolify app `LarRSS` as a proper **RSSHub** deployment
    at `rsshub.manuora.fr` (rename from `larrss.manuora.fr`);
    configure the shared Postgres as its cache backend.
  - `src/process/services/news/backends/RssHubBackend.ts` — thin
    client that queries RSSHub endpoints (one per feed) with the
    shared rate-limiter.
  - Success bar: `rsshub.manuora.fr` green; nightly ingest finishes
    under 10 min on 40 feeds.
- **Backend B — in-process `rss-parser` (required fallback).**
  - `src/process/services/news/backends/InProcessBackend.ts` — uses
    the `rss-parser` + `fast-xml-parser` npm packages (already compatible
    with the Electron main process) to fetch feeds directly. Uses the
    `WebFetchService` from 6.9 for HTTP, which gives it caching,
    rate-limiting, and — importantly — headless rendering when a feed
    is behind JS.
  - Works entirely inside the Largo process; no external service.
  - Success bar: p95 nightly ingest ≤ 15 min on 40 feeds.
- **Testing.**
  - `tests/unit/news/newsService.test.ts` — backend-agnostic cases
    (feed parsing, dedup, watchlist hit propagation, citation shape).
  - `tests/unit/news/rssHubBackend.test.ts` and
    `tests/unit/news/inProcessBackend.test.ts` — backend-specific.
  - `tests/unit/cron/maNewsIngestJob.test.ts` — full ingest on fixture
    feeds, Qdrant-shaped payload assertion.
- **Depends on.** 6.5 (RAG ingestion, embedding contract), 6.8 (tool
  generator), 6.9 (`WebFetchService` for Backend B), Wave 1.5.3
  (watchlist evaluation).
- **Runs with.** 6.9 and 6.11.

#### 6.11 Secret hygiene (*required*); Infisical as an optional spine (`[Raffinement]`)

> **Status: secret hygiene is required** (credential renaming,
> repo-scan gate, audit-key rotation). **Infisical adoption is not
> required.** If Infisical is adopted, it is the preferred server-side
> spine; otherwise, `.env` + Coolify env vars (server-side) and the OS
> keychain from Wave 8.2 (user-side) are the baseline.

- **Required baseline (always ships).**
  - Rename every Flowise credential to `<provider>.<purpose>` — audit
    § 4 of the scaling plan lists the target names (`openai.chatflow`,
    `openai.embedding`, `mistral.embedding`, `qdrant.flowise`,
    `insee.sirene`, etc.). The current homogeneous `Mitch` naming goes
    away.
  - Introduce `src/common/config/secrets.ts` — single typed accessor
    (`getSecret(name: KnownSecret)`) with an explicit precedence:
    Infisical (if enabled) → OS keychain (user-scoped) →
    `process.env` → throw.
  - Add a repo-scan gate: `scripts/scan-secrets.ts` runs in CI and
    fails on any match for known secret shapes
    (`sk-[A-Za-z0-9]+`, `SG\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`,
    JWT-shaped tokens, etc.). Merged into `bun run lint:ci`.
  - Rotate the 2026-04-20 audit artefacts on day 1: Flowise service
    key (`Z…xazM`), Coolify PAT (`2|J…d0`), and any other token shared
    during the audit.
  - Author ADR 0014 at `docs/adr/0014-secret-management.md` covering
    the full lifecycle (server-side spine + user-side keychain +
    rotation + emergency revocation). Extend ADR 0012 (OS keychain)
    with a cross-reference.
- **Optional enhancement — Infisical adoption.**
  - Provision three Infisical namespaces: `/largo/dev`,
    `/largo/staging`, `/largo/prod`.
  - Add `src/process/services/security/InfisicalClient.ts` behind the
    `LARGO_INFISICAL=1` flag; `getSecret()` reads from it first when
    enabled.
  - Coolify env-var migration: every `_KEY` / `_SECRET` on `Filo`,
    `metamcp`, `browser`, `LarRSS` services becomes an Infisical
    reference.
  - Jenkins rotation job
    `chatbuild/jenkins/rotate-secrets.Jenkinsfile` PATCHes the Flowise
    credential + restarts dependent services on rotation.
- **Testing.**
  - `tests/unit/config/secrets.test.ts` — precedence, missing-secret
    throws, Infisical path only exercised with flag on.
  - `tests/unit/ci/scanSecrets.test.ts` — positive + negative fixtures.
  - A manual `docs/runbooks/secret-rotation.md` walk-through is
    required in the PR description.
- **Success criteria.** Repo scan is clean; Flowise credentials are
  renamed; audit artefacts rotated; ADR 0014 merged. If Infisical is
  enabled, every production secret flows through it and nothing reads
  `.env` at runtime.
- **Depends on.** 6.3 (admin access to Flowise).
- **Runs with.** 6.8, 6.9, 6.10.

-->

**Secret hygiene — the required baseline portion of the former 6.11 — stays in Wave 6.11 as a lean task:**

#### 6.11 Secret hygiene (`[Raffinement]`)

- **Scope.**
  - Rename every Flowise credential to `<provider>.<purpose>` per
    `docs/plans/2026-04-20-backend-scaling-plan.md` § 4
    (`openai.chatflow`, `openai.embedding`, `mistral.embedding`,
    `qdrant.flowise`, `insee.sirene`, …). Retire the homogeneous
    `Mitch` naming.
  - Introduce `src/common/config/secrets.ts` — single typed accessor
    `getSecret(name: KnownSecret)` with precedence: OS keychain
    (user-scoped) → `process.env` → throw. Wave 10.4 later prepends
    Infisical when adopted.
  - Add the repo-scan gate `scripts/scan-secrets.ts` to CI
    (`bun run lint:ci`); fails on known secret shapes (`sk-…`,
    `SG.…`, JWT-shaped tokens, etc.).
  - Rotate the 2026-04-20 audit artefacts on day 1: Flowise service
    key, Coolify PAT, any other token shared during the audit.
  - Author ADR 0014 at `docs/adr/0014-secret-management.md` covering
    the lifecycle (server-side baseline + user-side keychain +
    rotation + emergency revocation). Extend ADR 0012 with a
    cross-reference.
- **Testing.**
  - `tests/unit/maSecretsAccessor.test.ts` — precedence,
    missing-secret throws.
  - `tests/unit/maScanSecrets.test.ts` — positive + negative fixtures.
- **Success criteria.** Repo scan CI gate green; Flowise credentials
  renamed; audit artefacts rotated; ADR 0014 merged.
- **Depends on.** 6.3 (admin access to Flowise).
- **Runs with.** 6.1 – 6.7.

---

### Wave 7 — Phase 4 analytics (parallelism: 3 agents)

#### 7.1 Dashboard + widgets (`[Fraîcheur]`)

- **Scope.** `pages/ma/Dashboard/`, widgets under
  `components/ma/widgets/{DealFunnel,RevenueForecast,ActivityHeatmap,MandatsExpiry}/`.
  Customisable widget layout persisted through a new
  `renderer/services/dashboard/layout.ts`.
- **Depends on.** Wave 5 (pipeline data).
- **Runs with.** 7.2 and 7.3.

#### 7.2 Comparables DB + market-intel feeds

- **Scope.** `common/ma/comparables/{types,repository}.ts`,
  `process/services/ma/feeds/{FeedService,RssReader,AlertEngine}.ts`, UI
  under `pages/ma/Comparables/` and `pages/ma/Feeds/`.
- **Runs with.** 7.1 and 7.3.

#### 7.3 Daily brief + custom reporting engine

- **Scope.** Cron-driven daily brief (`process/services/ma/briefs/`),
  report builder under `pages/ma/Reports/`.
- **Runs with.** 7.1 and 7.2.

#### 7.4 Wave-7 wiring close-out (serialized)

- Regen i18n types; CHANGELOG; `docs/pr/wave-7-ux.md`.

**Wave 7 — UI/UX spec.**

- 7.1 Dashboard grid uses a 12-column layout (`grid-cols-12`) with
  widget spans declared in `layout.ts`. Each widget ships with light +
  dark snapshots, a loading skeleton, an empty state, and an error state.
- Charts use Recharts (or ECharts) with Mint-Whisper-themed axes
  (`--border-base`), grid lines (`--bg-3`), primary series (`--aou-6`),
  secondary series (`--aou-8`), danger series (`--danger`). Tooltips
  inherit the Arco popover override.
- 7.2 Comparables table: virtualised row renderer (TanStack Virtual);
  sortable columns with `aria-sort`; filter chips row above the table
  with a "Clear all" affordance.
- 7.3 Daily brief page uses serif H1, 640 px reading column, inline
  citations, no ads, no "hot" red — strictly the Fraîcheur palette.
  Brief viewer respects `prefers-reduced-motion` (no auto-scroll).

---

### Wave 8 — Phase 5 enterprise & compliance (parallelism: 3 agents)

#### 8.1 RBAC + audit log (`[Raffinement]`)

- **Scope.** `src/process/services/security/{AccessControlService,AuditLogger}.ts`,
  new migration (`ma_users`, `ma_permissions`, `ma_audit_log`), admin UI
  under `pages/ma/Admin/{Users,AuditLog}/`. Roles: Admin, Partner, Analyst,
  Read-Only. Audit coverage on every CRUD op across M&A repositories.
- **Depends on.** Waves 5, 7.
- **Runs with.** 8.2 and 8.3.

#### 8.2 Encryption + OS keychain (`[Raffinement]`)

- **Scope.** `src/process/services/security/EncryptionService.ts`
  (AES-256-GCM at rest, per-document key), SQLCipher integration for
  sensitive tables, OS keychain (keytar or native) for API keys.
  Migration path: unencrypted → encrypted via background job with progress
  events.
- **Runs with.** 8.1 and 8.3.

#### 8.3 GDPR + compliance checks

- **Scope.** `src/process/services/compliance/` with erasure, portability,
  consent, retention, and PIA tools. AML/KYC, _autorité de la concurrence_,
  sanctions-screening MCP integrations. VDR module
  (`pages/ma/VirtualDataRoom/`) with watermarking.
- **Runs with.** 8.1 and 8.2.

#### 8.4 Wave-8 wiring close-out (serialized)

- Regen i18n types; CHANGELOG; `docs/pr/wave-8-ux.md`.

**Wave 8 — UI/UX spec.**

- Admin surfaces isolate destructive actions (delete user, purge audit
  log) behind a two-step confirmation with a typed-phrase input.
- Audit log viewer uses JetBrains Mono for IDs, a resizable time column
  (defaults to ISO 8601 + locale date), and an export button honouring
  the 7-year retention default.
- Encryption progress dialog uses `<Skeleton variant="line" />` until the
  first byte lands, then switches to a determinate progress bar. Cancel
  surfaces an "unrecoverable — confirm?" dialog.
- VDR browser: tree view with lazy children, watermark preview overlay
  in the preview pane, Q&A thread rail on the right.
- GDPR tools: every destructive action (right to erasure) shows the
  cascading delete surface (affected contacts, deals, documents) **before**
  confirmation, with counts and a downloadable JSON preview.

---

### Wave 9 — Production launch (parallelism: 2 agents)

#### 9.1 Performance budgets + memory audit

- Vitest bench on hot paths (startup, SQLite p95, AI streaming).
- Fix anything above budget in a follow-up sub-pass.
- **Runs with.** 9.2.

#### 9.2 Docs + extensions SDK

- TypeDoc, user manual (FR), admin guide, extension-dev guide.
- **Runs with.** 9.1.

#### 9.3 Visual polish sweep + onboarding flow + feedback widget (`[Raffinement]`)

- **Scope.**
  - Implement the first-run onboarding flow from § 2.0.1.
  - Ship the in-app feedback widget (tied to the observability scaffold;
    data stored locally, opt-in upload).
  - Run an axe-core sweep on every `/ma/*` route and every settings page;
    fix all critical / serious / moderate violations.
  - Run Lighthouse on the WebUI build and remediate to ≥ 95 on a11y,
    best-practices, and SEO; ≥ 90 on performance.
  - Final motion/timing audit: every `transition: all` is eliminated;
    every animation has a reduced-motion fallback.
- **Runs with.** 9.1 and 9.2.

---

### Wave 10 — Post-launch platform enrichment (parallelism: 2 agents, opportunistic)

**Goal.** Once Largo is in production on its in-process baseline, layer
the `manuora.fr` Coolify accelerators on top. Each task here is
**optional**: adopt in any order, one per sprint, with the corresponding
Largo-native fallback remaining available as a kill-switch. Run the
same Wave 6.7 coverage audit against whichever accelerator has landed.

Prerequisite. Wave 9 (production launch) must be green; every task in
this wave must preserve binary compatibility with the in-process
baseline so the user can toggle the accelerator off at any time.

#### 10.1 MetaMCP federation of Largo tools (`[Raffinement]`)

- **Scope.** Turn the already-`running:healthy` MetaMCP instance at
  `https://mcp.manuora.fr` into the federation bus for every Largo
  tool documented in
  `docs/plans/2026-04-20-backend-scaling-plan.md` § 2.
  - Author an OpenAPI spec per tool under
    `docs/integrations/<tool>.openapi.yaml` (`sirene`, `pappers`,
    `datagouv`, `browserless`, `rsshub`, `kb`, `sanctions`,
    `comparables`, `email`, `pipedrive`, `calendar`, `watchlist`).
    These specs become the single source of truth for the Flowise
    Custom Tool JSONs and for the Largo-process clients — author them
    even if MetaMCP is never adopted.
  - Add `scripts/generate-flowise-tools.ts` — reads the specs and
    emits Flowise Custom Tool JSON into
    `chatbuild/flowise_automation/tools/<tool>.json`, wired by Wave
    6.3's reconcile step.
  - Add `scripts/generate-metamcp-servers.ts` — same input, different
    output: one MetaMCP server config per tool, posted to
    `mcp.manuora.fr` via its admin API.
  - Implement the Largo-process shim at
    `src/process/services/mcpServices/metamcp/MetaMcpClient.ts`,
    feature-flagged behind `LARGO_METAMCP=1`; when disabled, all
    callers fall back to the per-tool Largo-process clients.
  - Register MetaMCP as a **native** integration under
    `Settings → Integrations → Tool federation` (flag-gated).
- **Fallback.** Flowise Custom Tools call the Largo-process clients
  directly via their local HTTP surface (bridge-exposed by Wave 2.3's
  `ipcBridge.ma.mcp.*`).
- **Testing.**
  - `tests/unit/maOpenapiGenerators.test.ts` — round-trips each tool
    through the Flowise generator and asserts a stable, byte-equal
    output.
  - `tests/e2e/specs/metamcpFederation.spec.ts` — optional spec,
    runs in the nightly when `LARGO_METAMCP=1`.
- **Success criteria.** Every tool in the catalogue is defined once
  as an OpenAPI spec; Flowise generator output is reproducible;
  MetaMCP federation is reachable from an external MCP client iff the
  flag is enabled.
- **Depends on.** Wave 9, Wave 6.3, 6.4, 6.6.

#### 10.2 Browserless backend for the `web.*` tools (`[Chaleur]`)

- **Scope.** Swap the in-process Playwright backend for the Coolify
  `browser` (Browserless) service to reclaim installer size and shift
  rendering cost off the user's laptop.
  - Revive the Coolify service `browser` (`exited` today) and attach
    a health-check probe; document env
    (`MAX_CONCURRENT_SESSIONS`, `TOKEN`) in
    `chatbuild/flowise_automation/services/browserless.md`.
  - `src/process/services/web/backends/BrowserlessBackend.ts` —
    implements the same `WebBackend` contract as the Playwright
    backend (Wave 6.9); selected via `LARGO_WEB_BACKEND=browserless`.
  - Token in Infisical (10.4) when adopted; otherwise `.env`.
- **Fallback.** The in-process Playwright backend from Wave 6.9
  remains the default; switching back is a single env-var flip.
- **Success bar.** Browserless health green 72 h; p95 `web.fetch`
  ≤ 8 s, p95 `web.screenshot` ≤ 12 s.
- **Depends on.** Wave 6.9 (backend contract), Wave 9.

#### 10.3 RSSHub backend for the `news.*` tools (`[Fraîcheur]`)

- **Scope.** Swap the in-process `rss-parser` backend for the Coolify
  RSSHub service at `rsshub.manuora.fr` (renamed from the legacy
  `larrss.manuora.fr`).
  - Template swap: replace the `larrss` image with
    `diygod/rsshub:latest`; configure the shared Postgres as cache.
  - `src/process/services/news/backends/RssHubBackend.ts` —
    implements the same `NewsBackend` contract as the in-process
    backend (Wave 6.10); selected via `LARGO_NEWS_BACKEND=rsshub`.
- **Fallback.** The in-process backend from Wave 6.10 remains the
  default; switching back is a single env-var flip.
- **Success bar.** RSSHub green; nightly `ma.news.ingest` under
  10 min on 40 feeds (vs ≤ 15 min for the in-process baseline).
- **Depends on.** Wave 6.10 (backend contract), Wave 9.

#### 10.4 Infisical as the server-side secret spine (`[Raffinement]`)

- **Scope.** Prepend Infisical to the `getSecret()` precedence chain
  established in Wave 6.11.
  - Provision three Infisical namespaces: `/largo/dev`,
    `/largo/staging`, `/largo/prod`. Coolify environments bind to
    one each.
  - Add `src/process/services/security/InfisicalClient.ts`
    flag-gated behind `LARGO_INFISICAL=1`; `getSecret()` reads from
    it first when enabled (contract already extended in 6.11).
  - Coolify env-var migration: every `_KEY` / `_SECRET` on `Filo`,
    `metamcp`, `browser`, `LarRSS`, `Automate`, `Inference` services
    becomes an Infisical reference.
  - Jenkins rotation job
    `chatbuild/jenkins/rotate-secrets.Jenkinsfile` PATCHes the
    Flowise credential + restarts dependent services on rotation.
- **Fallback.** OS keychain + `.env` remains the default precedence.
- **Success criteria.** If `LARGO_INFISICAL=1`, every production
  secret flows through Infisical and nothing reads `.env` at runtime;
  rotation runbook exercised quarterly.
- **Depends on.** Wave 6.11 (secret-accessor contract), Wave 9.

#### 10.5 Langfuse-backed LLM observability (`[Raffinement]`)

- **Scope.** Self-host Langfuse on Coolify and wire Flowise's
  analytics hook to it; extend the OTel collector (Wave 1.1) to fan
  out LLM spans to Langfuse with `flowKey`, `promptVersionId`, and
  `kbSourceId` attributes.
- **Fallback.** OTel → Sentry alone remains sufficient.
- **Success criteria.** ≥ 95 % of Flowise calls appear in Langfuse
  with the three required attributes populated.
- **Depends on.** Wave 1.1, Wave 6.7 (coverage audit).

---

## § 4 — Cross-Cutting Gates

Any wave closure must, in addition to § 1.2 and § 1.4, verify:

- `bun run lint`, `bun run format:check`, `bunx tsc --noEmit` — green.
- `node scripts/check-i18n.js` — no missing keys after the reference-locale flip.
- `bunx vitest run --coverage` — coverage ≥ 80 % across `src/common/ma/**`,
  `src/process/services/ma/**`, `src/process/worker/ma/**`,
  `src/process/bridge/maBridge.ts`, and all files added by the wave.
- `bunx vitest run tests/unit/styles/tokenLint.test.ts` — zero forbidden
  tokens in any renderer CSS Module (see § 1.4.1 and Wave 0.1).
- `bunx playwright test` on the newly added specs, including
  `@axe-core/playwright` runs on every new route (zero critical/serious
  violations).
- `bun run storybook:test` — every new component has at least one story
  and its visual-regression baseline is up to date (see § 1.4.11).
- `prek run --from-ref origin/main --to-ref HEAD` — green.
- Dependabot and Semgrep workflows stayed green on every PR in the wave.

### § 4.1 Design-System Regression Gate (per-PR)

Each PR that touches `src/renderer/` must include in its description:

1. A before/after screenshot pair for every visually affected surface.
2. The selected Largo Philosophy tag (`[Respiration]` / `[Fraîcheur]` /
   `[Chaleur]` / `[Raffinement]`) with a one-sentence justification.
3. Keyboard-navigation coverage statement (list the keys tested).
4. Reduced-motion verification statement.
5. Dark-mode verification (screenshot or explicit note that no visual
   surface changed).
6. For new interactive components: the Storybook story ID and the
   Playwright visual-regression baseline path.

---

## § 5 — Production Deploy (runs after Wave 9)

This is the release train. Each item is a single coherent pass.

### 5.1 Security pen test (`[Raffinement]`)

External engagement; scope covers the Electron app, WebUI server, and every
MCP server merged through Wave 8. Fix all critical/high findings; verify
with a re-test. ADR records the findings summary.

### 5.2 Load test (WebUI)

k6 or Artillery suite targeting 50 concurrent WebUI users. Baseline
published under `docs/perf/webui-load-baseline.md`. Optimise until the
baseline meets ROADMAP § 6.3 target.

### 5.3 Platform signing + auto-update

- macOS notarisation (Apple Developer cert), Windows EV code-signing,
  Linux `.AppImage`/`.deb`/`.rpm`.
- Electron updater wired to GitHub Releases feed.
- Homebrew cask.
- ADR 0012 captures the signing key management model.

### 5.4 Documentation finalisation

- TypeDoc output committed to `docs/api/`.
- French user manual (`docs/manual/fr/`).
- Administrator guide (`docs/admin/`).
- Video tutorials (5 core workflows), changelog with migration guide.

### 5.5 Beta program (2 cycles)

- 20–30 M&A professionals, in-app feedback widget, 24 h SLA on critical
  bugs. Ship top-10-issues fixes per cycle. PostHog analytics (opt-in)
  gauges feature usage.

### 5.6 Production release (`[Raffinement]`)

- Final QA pass across macOS, Windows, Linux, WebUI.
- Release notes (FR + EN), website launch page on `largo.fr`, press kit.
- Launch announcement.
- 72 h post-launch monitoring; zero critical issues tolerated.

---

## § 6 — Success Metrics (bar at each Wave boundary)

| Wave             | Metric                                                                                                                                                                                                                                 | Target          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 0                | Zero forbidden tokens, zero emoji, i18n + format sweep green                                                                                                                                                                           | ✅ all three    |
| 1                | Sentry/OTel opt-in, SIRENE green on live creds, fr-FR ref flip                                                                                                                                                                         | ✅ all three    |
| 1.5              | `ma_companies` + `ma_contacts` + `ma_watchlists` + `ma_datagouv_cache` + KB schema tables live; data.gouv.fr MCP green                                                                                                                 | ✅ all five     |
| 2                | Pappers green, DD page reachable, Financial CSV/XLSX export                                                                                                                                                                            | ✅ all three    |
| 3                | Valuation/Company/Sector pages reachable, sector i18n covered                                                                                                                                                                          | ✅ all three    |
| 4                | 12+ document templates, 6 AI-assisted flows, 3 export formats                                                                                                                                                                          | ✅              |
| 5                | 3 new MCPs (WhatsApp, Email, Pipedrive), 8-stage Kanban                                                                                                                                                                                | ✅              |
| 6                | Drizzle reads behind flag, SM upload in CI, Flowise prod on `filo.manuora.fr`, RAG ingest ≤ 60 s, 100 % `flowKey` coverage, `web.*` + `news.*` tools green via in-process baseline, secret-scan CI gate green, audit artefacts rotated | ✅ all eight    |
| 7                | 7+ dashboard widgets, 5+ analytics views, 10+ feeds                                                                                                                                                                                    | ✅              |
| 8                | 4 RBAC roles, 7-year audit retention, 5 GDPR tools                                                                                                                                                                                     | ✅              |
| 9                | Cold start < 3 s, renderer bundle < 2 MB gzipped                                                                                                                                                                                       | ✅              |
| Deploy           | Zero critical pen-test findings, signed builds, 72 h stable                                                                                                                                                                            | ✅              |
| 10 (post-launch) | MetaMCP federation, Browserless backend, RSSHub backend, Infisical spine, Langfuse observability                                                                                                                                       | 🎯 zero-to-five |

---

## § 7 — Risk Register (live)

- **Glossary curation quality.** Machine translations from passes 1–3 in
  `zh-CN`, `zh-TW`, `ja-JP`, `ko-KR`, `tr-TR`, `ru-RU`, `uk-UA` have never
  been reviewed by native M&A practitioners. Wave 5's Phase-3 launch
  pre-requires at least a spot-check; track under Phase 5 polish.
- **MCP supply-chain.** Baileys (WhatsApp) is unofficial; we accept the
  ToS risk and document it in the pen-test scope.
- **Drizzle migration surface.** Write paths stay on raw SQL until Wave 9
  polish so the read-path flag can be flipped without data-loss risk.
- **Pre-existing repo-wide `tsc` errors** (`src/server.ts`, `uno.config.ts`)
  from unbuilt `node_modules` must stay tracked separately; Completer
  passes never introduce new ones but do not fix them unless the task
  explicitly owns that scope.
- **Router wiring is a serialization point.** Only Wave 2.3, 3.4, 4.4,
  5.4, 7.4, 8.4 touch the top-level router file; every other page task
  must register itself through the layout's child-route contract without
  editing the router entry.

---

## § 8 — Historical pointers

- Pass 1 (`pass-file-1.md`): valuation engine + CI + ADR process + `ma`
  i18n module bootstrap.
- Pass 2 (`pass-file-2.md`): company profile merge + sector taxonomy +
  glossary to 80 entries + glossary i18n scaffold + ADRs 0004/0005.
- Pass 3 (`pass-file-3.md`): full native-script `ma.json` in 7 non-FR/EN
  locales + 31-entry sector i18n + sector i18n contract test + security CI
  (Gitleaks, Semgrep, Dependabot, `bun audit`) + ADR 0006.
- ROADMAP philosophy tags (`[Respiration]`, `[Fraîcheur]`, `[Chaleur]`,
  `[Raffinement]`) are **contractual** — every new page or service must
  pick one in its PR description and justify the alignment.
