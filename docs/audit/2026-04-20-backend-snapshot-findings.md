# Backend Snapshot — 2026-04-20

Factual audit of the self-hosted Largo backend stack, taken via GET-only
probes with temporary credentials that have since been rotated. Raw JSON
artefacts live under `docs/audit/backend-snapshot-2026-04-20/` (gitignored
— contains internal IDs and config hashes). This document is the
public-safe narrative derived from those artefacts.

## 1. Surface map

| Service           | URL                           | Coolify service                   | Status                 | Role                                |
| ----------------- | ----------------------------- | --------------------------------- | ---------------------- | ----------------------------------- |
| Flowise (Largo)   | `https://filo.manuora.fr`     | `Filo` (`flowise-with-databases`) | `running:healthy`      | Canonical AI orchestration backend  |
| Qdrant            | `https://qdrant.manuora.fr`   | _(co-located with Filo)_          | alive (v1.17.1)        | Vector store for Largo KB           |
| MetaMCP           | `https://mcp.manuora.fr`      | `metamcp`                         | `running:healthy`      | MCP tool federation bus — **empty** |
| Langflow          | `https://langflow.manuora.fr` | `Langflow`                        | `running:healthy`      | Standby orchestrator (unused today) |
| Browserless       | _down_                        | `browser` (`browserless`)         | **`exited`**           | Intended headless-browser worker    |
| RSSHub (`LarRSS`) | `https://larrss.manuora.fr`   | `LarRSS` app                      | **`exited:unhealthy`** | Intended RSS aggregator             |
| Infisical         | internal                      | `vault` (`infisical`)             | `running:healthy`      | Secret manager                      |
| n8n               | internal                      | `Automate`                        | `running:unhealthy`    | Workflow automation                 |
| open-webui        | internal                      | `Inference`                       | `exited`               | Local LLM fallback                  |
| pgAdmin           | internal                      | `Datadmin`                        | `running:healthy`      | Admin for the record-manager DB     |
| Jenkins           | internal                      | `Deploy`                          | `running:healthy`      | Build/CD pipeline                   |
| Glance            | internal                      | `Feed`                            | `exited`               | Feed aggregator dashboard           |

Coolify itself is at `https://admin.manuora.fr` (v4.0.0-beta.470), hosting
a single server (localhost, Traefik proxy) and one shared Postgres
database (`postgres`, `running:healthy`) used as the Flowise
record-manager backend. Four projects are defined: `micou.org on
manuora`, `manuora`, `Largo`, `Dever`.

A legacy `largo` application points at `https://largo.manuora.fr` and is
currently `exited:unhealthy` — this is the stale AnythingLLM deployment
and is not the Largo desktop/webui app (which is not yet published).

## 2. Flowise content

### 2.1 Chatflows (5 total)

All five flows are of type `ASSISTANT`:

- `Largo` — id `2ab0be12…` — the main production assistant (also
  listed under `/api/v1/assistants`).
- `Largo Core v1 Draft` — `deployed=false`
- `Largo DD v1 Draft` — `deployed=false`
- `Largo Documents v1 Draft` — `deployed=false`
- `Largo Research v1 Draft` — `deployed=false`

Only the `Largo` assistant is deployed. The four draft flows are
placeholders for the modular split but have **no exposed prediction
endpoint** yet.

### 2.2 Custom Tools, Variables, AgentFlows

- `/api/v1/tools` → `[]` — **zero custom tools defined.**
- `/api/v1/variables` → `[]` — **zero platform variables defined.**
- `/api/v2/agentflows` → HTML (UI-only in this build) — no AgentFlow v2
  is authored yet.

### 2.3 Credentials (13)

Provider breadth is broad, but scoping is inconsistent (most are named
`Mitch` rather than per-feature):

OpenAI ×2 (`Mitch`, `opencode-go`), Google Gemini (`gemini-largo`),
Groq (`groq-whisper`), ElevenLabs (`11labs-tts`), Tavily (`Mitch`),
SearchApi (`Mitch`), Exa (`Mitch`), GitHub (`Mitch`), HuggingFace
(`Mitch`), Supabase (`Mitch`), Brave Search (`Mitch`), Mistral (`Largo`),
Qdrant (`largo`), Postgres (`largo`).

**Gap.** None of the French-data providers (INSEE/SIRENE, Pappers,
data.gouv.fr) has a credential entry. Browserless and RSSHub have no
Flowise-side credential either.

### 2.4 Document Stores (4, Qdrant-backed)

| Name                                    | Qdrant collection        | Embedding                             |  Dim | Chunks | Record manager                 |
| --------------------------------------- | ------------------------ | ------------------------------------- | ---: | -----: | ------------------------------ |
| `Largo Knowledge Base Curated Final v2` | `LargoCurated20260419d`  | `mistralAIEmbeddings / mistral-embed` | 1024 |    281 | Postgres (`pg-record-manager`) |
| `Largo Knowledge Base Curated Final`    | `LargoCurated20260419c`  | `mistral-embed`                       | 1024 |    335 | Postgres                       |
| `Largo Knowledge Base Repaired`         | `LargoRepaired20260419b` | `mistral-embed`                       | 1024 |    336 | Postgres                       |
| `Largo Knowledge Base Repaired`         | `LargoRepaired20260419`  | `mistral-embed`                       | 1024 |      0 | Postgres                       |

Implications for Largo client:

- **Embedding contract is `mistral-embed`, dimension 1024.** Any
  Largo-side RAG ingestion worker (Wave 6.5) MUST emit 1024-dim vectors
  with Mistral embeddings; the `text-embedding-3-large` default we
  proposed earlier is wrong and must be revised.
- **Dedup uses a Postgres record-manager** (`pg-record-manager`), which
  Flowise uses to avoid re-upserting identical chunks on re-runs. This
  is good; Largo must not bypass it.
- **Collection naming convention** is `Largo{Purpose}{YYYYMMDD}{letter}`
  — a date-letter rotation used to rebuild corpora without destroying
  the previous one. We should codify this in the scaling plan.
- The Repaired store is split across two collections, one of which is
  empty (`LargoRepaired20260419`, 0 chunks). This is dead seed data — a
  sweep-and-retire task is warranted.

### 2.5 Known endpoints

`/api/v1/ping` returns `pong` (unauthenticated). Other authenticated
surfaces honour the Bearer token correctly: `/chatflows`, `/assistants`,
`/credentials`, `/tools`, `/variables`, `/document-store/store`.

Endpoints that currently reject the service key:

- `/api/v1/apikey` → 403 (reserved for admin session).
- `/api/v1/stats` → 412 (analytics not enabled).
- `/api/v2/agentflows` and `/api/v1/vector-store` → return the HTML
  shell (these are UI-only in the running build).

## 3. Qdrant state

- `GET /` → version `1.17.1` (unauthenticated).
- `GET /collections` → 401 (API key required, stored in Flowise under
  `largo/qdrantApi`).
- From the Flowise document-stores we know **four collections exist**,
  all 1024-dim with cosine distance (default). Direct inspection
  requires the Qdrant key which was not in scope of this audit.

## 4. MetaMCP state

- `/health` → `{ "status": "ok" }`.
- `/api/servers` and `/api/tools` → 404 (surface not at that path).
- No MCP servers are registered on MetaMCP yet. **The federation bus is
  up, but empty** — this is the right moment to design which MCP
  servers it will host before Largo features start consuming it.

## 5. Langflow state

- `/health` → `{ "status": "ok" }`.
- `/api/v1/flows/` → 403 (auth required).
- No flows authored; Langflow is on standby.

## 6. Coolify service inventory — already-provisioned platform assets

44 Coolify-managed services live on the shared server. The ones
relevant to Largo (beyond Filo / Langflow / metamcp / browser / vault
already named in § 1) are:

- `wassup` (`gowa`) — WhatsApp gateway (`running`) — Wave 5 delivery.
- `Calendrier` (`cal.com`) — calendar scheduling.
- `doli` (`dolibarr`) — ERP/CRM.
- `Pay` (`paymenter`), `Invoices` (`invoice-ninja`) — billing rails.
- `Bookmarks` (`karakeep`) — bookmark service.
- `Notes` (`affine`) — docs / knowledge.
- `Kanban` (`fizzy`) — board, overlaps with ROADMAP 3.4.
- `Dashboard` (`dashy`), `Homepage` (`homepage`) — landing surfaces.
- `Imgservice` (`imgcompress`) — image pipeline.
- `Containers` (`portainer`) — infra console.

Apps that explicitly name Largo:

- `largo` (`https://largo.manuora.fr`) — `exited:unhealthy`, the stale
  AnythingLLM instance.
- `LarRSS` (`https://larrss.manuora.fr`) — `exited:unhealthy`, the
  intended RSS aggregator. **Candidate to revive as RSSHub for the
  daily-brief pipeline.**

## 7. Gap ledger

| Area              | Observed                           | Required by roadmap                                                                                                                                               |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flowise flows     | 1 deployed + 4 drafts              | ≥ 12 feature-specific flows (one per `flowKey`)                                                                                                                   |
| Flowise tools     | 0                                  | ≥ 12 custom tools (SIRENE, Pappers, data.gouv.fr, Browserless, RSSHub, KB search, KB upsert, Email draft, Pipedrive, SIREN/SIRET lookup, Sector lookup, Calendar) |
| Flowise variables | 0                                  | A small set for shared config (e.g. default locale, default sector catalogue version)                                                                             |
| Credentials       | 13, mixed naming                   | All per-feature scoped; INSEE, Pappers, Browserless, RSSHub keys added                                                                                            |
| Document stores   | 4 (Curated v1/v2, Repaired ×2)     | Schema per scope: `deal/*`, `company/*`, `sector/*`, `news/*`, `glossary`, `global`                                                                               |
| Embedding model   | Mistral `mistral-embed` @ 1024 dim | Same (Largo client must match)                                                                                                                                    |
| Record manager    | Postgres OK                        | Same                                                                                                                                                              |
| Qdrant access     | Keyed, behind Flowise credential   | Direct client in Largo process (Wave 6.5) must read the key via Infisical                                                                                         |
| MetaMCP           | Up, empty                          | Federate SIRENE, Pappers, data.gouv.fr, Browserless, RSSHub, KB tools                                                                                             |
| Browserless       | Exited                             | Revive; expose 3 Flowise tools (`web.fetch`, `web.screenshot`, `web.scrape`) + direct process-side client                                                         |
| RSSHub / LarRSS   | Exited                             | Revive; expose `news.feed`, `news.search`; subscribe to a seed list; nightly upsert to Qdrant `news/*`                                                            |
| Infisical (vault) | Up                                 | Wire as the upstream for `FLOWISE_API_KEY`, `QDRANT_API_KEY`, `INSEE_API_KEY`, `PAPPERS_API_KEY`, per-env isolation                                               |
| Langflow          | Up, unused                         | Reserve for complex DAGs (`ma.briefs.daily`, `ma.comparables.search`) if they outgrow single Flowise chatflows                                                    |
| Observability     | None on server side                | Langfuse (self-host on Coolify) + OTel → Wave 1.1 collector                                                                                                       |

## 8. Recommended client-side adjustments

Derived from this audit and folded into the tasks.md updates in the same
PR:

1. **Embedding contract flip** — the Wave 6.5 RAG ingestion worker must
   emit `mistralAIEmbeddings / mistral-embed` @ 1024 dim (not
   `text-embedding-3-large`). Update `src/common/ma/constants.ts`
   accordingly when the worker lands.
2. **Canonical collection naming** — `largo/<scope>/<scope_id>-YYYYMMDD`
   with a rotation letter suffix when rebuilding. The Flowise ops plan
   already follows this pattern.
3. **Record-manager continuity** — `KnowledgeBaseService.reindexDeal`
   must pass the same `pg-record-manager` credential id so re-ingestion
   is idempotent.
4. **Secret lifecycle through Infisical** — every production secret
   (Flowise service key, Qdrant key, INSEE key, Pappers key) is
   retrieved at runtime from Infisical, not from `.env` files. ADR 0012
   (Wave 5.3) must be rewritten to point at Infisical instead of the OS
   keychain for _server-side_ secrets; the OS keychain remains the
   right place for _user_ secrets.
5. **Langfuse** — self-host on Coolify for LLM-call tracing; point
   Flowise's analytics hook at it and tag every span with `flowKey`,
   `promptVersionId`, `kbSourceId`.

Everything above is codified as work in the scaling plan
`docs/plans/2026-04-20-backend-scaling-plan.md` and as Wave 6.8 – 6.11
in `tasks.md`.
