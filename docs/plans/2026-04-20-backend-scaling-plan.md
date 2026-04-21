# Backend Scaling Plan — filo.manuora.fr (2026-04-20)

> Companion to `docs/audit/2026-04-20-backend-snapshot-findings.md` and
> `tasks.md` § Wave 6. This plan describes how the Flowise + Qdrant +
> MetaMCP + Coolify stack will evolve from today's 1-assistant / 0-tools
> baseline into the production backend every Largo frontend feature can
> depend on.

## 0. Guiding principles

1. **One registry, many features.** Every Largo AI surface resolves to a
   stable `flowKey`; the Flowise flow id is opaque and rotatable.
2. **Mistral-embed @ 1024-dim is the canonical vector contract.** It
   matches the live KB; diverging would strand the 950+ chunks already
   ingested.
3. **Tools live in Flowise _and_ in Largo.** Flowise hosts the
   chat-time tool invocation; Largo-process hosts the same tool as a
   callable MCP client so team-mode delegations and cron jobs can reuse
   them without going through a chatflow. Both paths ultimately hit the
   same upstream (SIRENE, Pappers, Browserless, etc.).
4. **Hosted services are accelerators, not prerequisites.** MetaMCP,
   Browserless, RSSHub, Infisical, Langfuse all already run on the
   `manuora.fr` Coolify platform — but Largo must not _require_ any of
   them. Every capability they enable has a first-class Largo-native
   fallback (in-process Playwright, `rss-parser`, direct Largo-process
   MCP clients, OS keychain + `.env`, OTel → Sentry). The scaling plan
   layers hosted services on top as optional accelerators.
5. **MetaMCP is the federation bus _if adopted_.** When exposing Largo
   tools to other MCP clients (a partner's agent, a VS Code / Zed
   session) matters, MetaMCP is the single bus. When it does not, the
   per-tool Largo-process clients suffice; no behaviour is lost.
6. **Secrets through Infisical _when adopted_, with a typed baseline
   accessor regardless.** `getSecret()` is the only entry point and its
   precedence is Infisical → OS keychain → `process.env` → throw. No
   production secret is authored by hand into `.env` files, Coolify
   service env vars, or Flowise credentials.
7. **Observability through Langfuse _when adopted_.** Flowise traces
   feed Langfuse; Largo process + renderer spans feed the Wave 1.1 OTel
   collector; both correlate via `flowKey` + `sessionId`. Without
   Langfuse, the OTel collector alone carries the story.

## 1. Chatflow catalogue (the feature → flow contract)

The four draft assistants currently in Flowise (`Largo Core / DD /
Documents / Research`) are deprecated in favour of a flat
feature-keyed catalogue. Each entry below is a single **Flowise
AgentFlow v2** (or a classic Chatflow where SSE streaming suffices) and
is checked into `chatbuild/flowise_automation/flows/<flowKey>.json`.

| `flowKey`               | Kind         | Purpose                                                | Primary tools                                                                     | KB scope                        |
| ----------------------- | ------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------- |
| `ma.dd.analysis`        | AgentFlow v2 | Risk-categorised due-diligence pass over a deal corpus | `kb.search`, `kb.cite`, `company.profile`, `sirene.lookup`, `pappers.lookup`      | `deal/<id>`                     |
| `ma.dd.risk.drill`      | Chatflow     | Drill-down chat into a specific risk finding           | `kb.search`, `kb.cite`                                                            | `deal/<id>`                     |
| `ma.valuation.draft`    | AgentFlow v2 | Valuation report drafting (DCF + comps framework)      | `company.profile`, `pappers.financials`, `comparables.search`, `datagouv.tabular` | `deal/<id>`, `sector/<id>`      |
| `ma.docs.nda.draft`     | Chatflow     | NDA draft from deal metadata                           | `kb.search` (templates), `company.profile`                                        | `deal/<id>`, `global/templates` |
| `ma.docs.loi.draft`     | Chatflow     | LOI draft                                              | same                                                                              | same                            |
| `ma.docs.im.draft`      | AgentFlow v2 | Information Memorandum builder                         | `company.profile`, `pappers.financials`, `kb.search`                              | `deal/<id>`                     |
| `ma.docs.teaser.draft`  | Chatflow     | Anonymised teaser                                      | `company.profile`                                                                 | `deal/<id>`                     |
| `ma.emails.draft`       | Chatflow     | Outbound email draft                                   | `kb.search`, contact context                                                      | `deal/<id>`                     |
| `ma.briefs.daily`       | AgentFlow v2 | Daily brief synthesiser                                | `news.feed`, `news.search`, `kb.search`                                           | `news/global`, `deal/<id>`      |
| `ma.company.qa`         | Chatflow     | Company Q&A                                            | `sirene.lookup`, `pappers.lookup`, `kb.search`                                    | `company/<siren>`               |
| `ma.palette.search`     | Chatflow     | Command palette semantic search                        | `kb.search` across all scopes                                                     | `global` + user scopes          |
| `ma.glossary.explain`   | Chatflow     | Glossary term explainer                                | `kb.search`                                                                       | `global/glossary`               |
| `ma.sector.summary`     | Chatflow     | Sector snapshot                                        | `datagouv.search_datasets`, `datagouv.tabular`                                    | `sector/<naf>`                  |
| `ma.kyc.screen`         | AgentFlow v2 | KYC / sanctions screening                              | `sanctions.search`, `kb.search` (registre beneficial owners)                      | `company/<siren>`               |
| `ma.comparables.search` | AgentFlow v2 | Public comparables search                              | `pappers.search`, `datagouv.tabular`, `comparables.search`                        | `sector/<naf>`                  |

Sequencing to stand up the catalogue:

- **Day 1 — deprecate drafts.** Rename the four `* v1 Draft` flows to
  `ARCHIVED *` and mark them `deployed=false`. The `Largo` assistant
  stays live as an umbrella fallback until the flat catalogue ships.
- **Day 2-4 — scaffold 15 flows.** Create one empty AgentFlow v2 or
  Chatflow per row, with a standard input shape (`question`,
  `overrideConfig.vars.{kbSourceId,dealId?,companySiren?,locale}`) and
  a standard output shape (`text`, `artifacts.citations[]`,
  `artifacts.findings?`). Export each to
  `chatbuild/flowise_automation/flows/<flowKey>.json`.
- **Day 5 — seed `ma.company.qa`, `ma.dd.analysis`, `ma.briefs.daily`.**
  These three are the most demonstrable.
- **Day 6+ — iterative filling** as the relevant Largo wave reaches its
  UI-ready state.

## 2. Tool catalogue (Flowise Custom Tools + MetaMCP federation)

Every row is (a) defined once as a Flowise Custom Tool, (b) re-exposed
on MetaMCP for external consumers, (c) backed by a Largo-process MCP
client so cron jobs / team agents can call it directly.

| Tool name                         | Upstream                                | Flowise tool   | MetaMCP server | Largo client                                          |
| --------------------------------- | --------------------------------------- | -------------- | -------------- | ----------------------------------------------------- |
| `sirene.lookup`                   | INSEE SIRENE API                        | ✅ (Wave 6.9)  | ✅             | `src/process/services/mcpServices/sirene/` (Wave 1.2) |
| `sirene.search`                   | INSEE                                   | ✅             | ✅             | same                                                  |
| `pappers.lookup`                  | Pappers API                             | ✅             | ✅             | `mcpServices/pappers/` (Wave 2.1)                     |
| `pappers.search`                  | Pappers                                 | ✅             | ✅             | same                                                  |
| `pappers.financials`              | Pappers                                 | ✅             | ✅             | same                                                  |
| `datagouv.search_datasets`        | data.gouv.fr Main API                   | ✅             | ✅             | `mcpServices/datagouv/` (Wave 1.5.2)                  |
| `datagouv.get_dataset`            | data.gouv.fr                            | ✅             | ✅             | same                                                  |
| `datagouv.tabular`                | Tabular API                             | ✅             | ✅             | same                                                  |
| `datagouv.metrics`                | Metrics API                             | ✅             | ✅             | same                                                  |
| `datagouv.search_dataservices`    | Dataservices                            | ✅             | ✅             | same                                                  |
| `web.fetch`                       | Browserless                             | ✅ (Wave 6.9)  | ✅             | `mcpServices/browserless/` (new in 6.9)               |
| `web.screenshot`                  | Browserless                             | ✅             | ✅             | same                                                  |
| `web.scrape` (structured extract) | Browserless + Readability               | ✅             | ✅             | same                                                  |
| `news.feed`                       | RSSHub                                  | ✅ (Wave 6.10) | ✅             | `mcpServices/rsshub/` (new in 6.10)                   |
| `news.search`                     | RSSHub + local Qdrant collection        | ✅             | ✅             | same                                                  |
| `kb.search`                       | Qdrant directly (via Flowise retriever) | ✅             | ✅             | `KnowledgeBaseService` (Wave 6.5)                     |
| `kb.upsert`                       | Qdrant                                  | ✅             | ✅             | same                                                  |
| `kb.purge`                        | Qdrant + Postgres record-manager        | ✅             | ✅             | same                                                  |
| `comparables.search`              | Curated Qdrant collection + Pappers     | ✅             | ✅             | Wave 7.2                                              |
| `sanctions.search`                | OFAC / EU / FR registre PPE             | ✅ (Wave 8.3)  | ✅             | Wave 8.3                                              |
| `email.send`                      | SMTP via Infisical-rotated creds        | ✅ (Wave 5.3)  | ✅             | existing EmailService (Wave 5)                        |
| `pipedrive.upsert`                | Nango / Pipedrive                       | ✅             | ✅             | IntegrationService (existing)                         |

## 3. Document-store & Qdrant topology

Canonical mapping of Largo `kb_source.scope` → Qdrant collection name.
All collections use `vector_size: 1024`, `distance: Cosine`,
`on_disk_payload: true`, and carry the metadata indexes listed below.

| Scope              | Collection name pattern          | Purpose                                          | Metadata indexes                                      | Retention                    |
| ------------------ | -------------------------------- | ------------------------------------------------ | ----------------------------------------------------- | ---------------------------- |
| `global/glossary`  | `largo_glossary_YYYYMMDD`        | Curated Largo glossary (current 300-term target) | `term_id`, `locale`, `philosophy_tag`                 | Rebuild on glossary change   |
| `global/templates` | `largo_templates_YYYYMMDD`       | NDA/LOI/IM/teaser/email templates                | `template_id`, `locale`, `category`                   | Rebuild on template change   |
| `deal/<id>`        | `largo_deal_<id>_YYYYMMDD`       | One collection per deal                          | `document_id`, `deal_id`, `section`, `uploaded_at`    | 24 months after deal closure |
| `company/<siren>`  | `largo_company_<siren>_YYYYMMDD` | Per-company enrichment corpus                    | `siren`, `source`, `fetched_at`                       | Rolling 12 months            |
| `sector/<naf>`     | `largo_sector_<naf>_YYYYMMDD`    | Sector research                                  | `naf_code`, `document_id`, `source`                   | Rolling 24 months            |
| `news/global`      | `largo_news_YYYYMMDD`            | Daily-brief news corpus                          | `feed_id`, `published_at`, `language`, `entity_ids[]` | Sliding 90 days              |
| `watchlist/<id>`   | `largo_watchlist_<id>_YYYYMMDD`  | Watchlist-driven enrichment corpus               | `watchlist_id`, `hit_id`, `matched_at`                | Sliding 180 days             |

All collections are created by `chatbuild/flowise_automation` with a
shared `vectorStore:qdrant` + `embeddings:mistralAIEmbeddings` +
`recordManager:postgresRecordManager` triplet, inheriting the existing
`pg-record-manager` Postgres for dedup.

**Migration from current corpus.**

- Keep `LargoCurated20260419d` (281 chunks) as the initial
  `largo_glossary_20260419` — relabel via Flowise rename.
- Retire `LargoCurated20260419c` (duplicate, 335 chunks) and the empty
  `LargoRepaired20260419` via `kb.purge` once the new topology is
  verified.
- Freeze `LargoRepaired20260419b` (336 chunks) as a
  `global/legacy-docs` read-only collection for six months.

## 4. Credentials & secret lifecycle

### 4.1 Inventory today

13 Flowise credentials exist (see findings § 2.3). They are named
inconsistently and not scoped per environment.

### 4.2 Target scheme

All secrets live in **Infisical** (Coolify `vault` service) and are
pulled at deploy-time into Flowise credentials / Coolify env vars. No
Largo client, Coolify service, or human reads a plaintext secret from
disk.

- **Namespaces.** `/largo/prod`, `/largo/staging`, `/largo/dev`, each
  scoped to a Coolify environment.
- **Naming.** `<provider>.<purpose>` e.g. `openai.chatflow`,
  `openai.embedding`, `mistral.embedding`, `qdrant.flowise`,
  `qdrant.client`, `insee.sirene`, `pappers.main`, `browserless.api`,
  `rsshub.admin`, `sentry.dsn.server`, `sentry.dsn.renderer`,
  `langfuse.public`, `langfuse.secret`, `supabase.largo`,
  `pg.recordmanager`, `smtp.largo`.
- **Flowise credentials** are renamed to match this scheme and
  reconnected. The temporary service-key used for the 2026-04-20 audit
  is rotated the same day.
- **Rotation cadence.** 90 days for OpenAI / Mistral / Groq, 30 days
  for Qdrant, 180 days for SMTP / Supabase, ad-hoc on breach.
- **Rotation automation.** Infisical → Coolify auto-deploy hook; a
  small Jenkins job bumps the Flowise credential via the Flowise
  `/api/v1/credentials/{id}` PATCH when a secret rotates.

### 4.3 Client-side

- **Server-side secrets** (Flowise service key, Qdrant key, etc.) are
  Infisical-backed and never reach the Largo desktop / WebUI.
- **Per-user secrets** (a user's own OpenAI key entered in Settings,
  their Pipedrive token) remain in the OS keychain (Wave 8.2) — the
  split is: Infisical for server identities, keychain for user
  identities.

## 5. Observability stack

- **Langfuse** self-hosted on Coolify (one-click template) — Flowise
  supports Langfuse out of the box via the `LANGFUSE_*` env variables
  set through Infisical.
- **OTel collector** from Wave 1.1 receives Largo process + renderer
  spans; exports to Sentry (errors) + Langfuse (LLM calls) + Axiom
  (logs). A single `trace_id` correlates renderer click → IPC call →
  Flowise call → Qdrant retrieval → upstream MCP tool.
- **Sentinel** is already enabled on Coolify (localhost,
  `is_sentinel_enabled: true`) — this gives us per-service metrics;
  configure the `server_disk_usage_notification_threshold: 80` alert
  to flow into the Largo team channel.

## 6. Roll-out sequencing

- **Immediate (this PR).** Document the snapshot (this doc +
  findings), update `tasks.md` with Wave 6 sub-tasks 6.8 – 6.11, rotate
  the audit service key.
- **Wave 6 (next workable sprint).** Client runtime config + catalogue
  - RAG + MetaMCP + Browserless + RSSHub + Infisical, in the
    dependency order below:

```
6.4 (runtime config)
     ├─ 6.6 (catalogue + prompt versioning)
     ├─ 6.5 (RAG ingestion) ── 6.8 (MetaMCP federation)
     │                           ├─ 6.9 (Browserless revive + web.* tools)
     │                           ├─ 6.10 (RSSHub revive + news.* tools)
     │                           └─ 6.11 (Infisical wiring + secret rotation)
     └─ 6.7 (end-to-end audit, runs last)
6.1 Drizzle dual-run, 6.2 CI, 6.3 server bootstrap run in parallel.
```

- **Wave 7.** Feeds the `news/global` Qdrant collection nightly via
  Wave 6.10's RSSHub tool; daily brief agent (`ma.briefs.daily`)
  retrieves from it.
- **Wave 8.** KYC / sanctions tool; encryption + OS keychain for
  user-side secrets; GDPR erasure also purges per-deal Qdrant
  collections.

## 7. Risks & mitigations

- **Mistral-embed cost at scale.** 1024-dim is cheap but call-metered.
  Mitigation: record manager + 1024-dim `vector_quantization: Scalar`
  at the Qdrant layer, and batch embeddings (already enabled, batch
  size 512 in the current stores).
- **Flowise self-host availability.** Single Coolify host; outages
  stall Largo's AI. Mitigation: `useFlowiseStream` already falls back
  to the local AionUi agents (Claude/Gemini). Wave 6.4 exposes this in
  Settings and the TopBar health dot.
- **MetaMCP federation drift.** A tool defined twice (once in Flowise,
  once in MetaMCP) risks behaviour drift. Mitigation: one OpenAPI spec
  per tool under `docs/integrations/<tool>.openapi.yaml` — both the
  Flowise Custom Tool JSON and the MetaMCP server definition are
  generated from it (Wave 6.8 adds the codegen script).
- **Secret sprawl in Infisical.** Mitigation: strict
  `<provider>.<purpose>` naming, per-environment scoping, monthly
  review Jenkins job that flags unused paths.
- **KB collection rebuilds storm.** Repeatedly rebuilding a deal's
  corpus (e.g. after a doc upload) must not churn Qdrant. Mitigation:
  Postgres record-manager is reused; only new/changed chunks are
  upserted.

## 8. Success criteria

By the end of Wave 6:

1. `filo.manuora.fr` resolves every Largo AI feature through a named
   `flowKey`; zero renderer code addresses a Flowise flow id directly.
2. 15 chatflows deployed (not draft); 20+ Flowise Custom Tools wired.
3. Qdrant topology follows the 8 scopes; old collections retired or
   relabelled; 950+ existing chunks retained under the new names.
4. MetaMCP federates the 12 cross-tool surface names; a non-Largo MCP
   client (e.g. a Zed session) can call `sirene.lookup` end-to-end
   through `mcp.manuora.fr`.
5. Browserless + RSSHub services are `running:healthy`; `web.fetch`
   and `news.feed` respond to a test prompt.
6. Infisical owns every production secret; the Flowise credentials are
   renamed per the new scheme; the 2026-04-20 audit key is rotated.
7. Langfuse receives ≥ 95 % of Flowise calls with `flowKey` and
   `promptVersionId` attributes populated.
