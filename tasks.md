# Largo M&A Roadmap (Auditor Controlled, Enriched)

Supersedes the archived snapshot at
`docs/plans/archive/2026-04-21-tasks-superseded-audit-baseline.md`.

## 0. Purpose and reading guide

### 0.1 Purpose

This file is the active roadmap for the M&A surface in Largo. It has four jobs:

- Preserve the inherited product scope from the superseded roadmap so feature
  intent is not lost.
- Rebase execution on the current code tree, not on stale task checkboxes.
- Split work into conflict-safe batches that multiple synced agents can execute
  without stepping on one another.
- Make every wave auditable through explicit success criteria, test gates, and
  close-out artifacts.

### 0.2 Source of truth hierarchy

When this file conflicts with older task lists or assumptions, use this order:

1. Code under `src/**`
2. Tests under `tests/**`
3. Bridge contracts under `src/common/adapter/ipcBridge.ts`
4. Database schema and migrations under
   `src/process/services/database/{schema,migrations}.ts`
5. Current docs in `docs/**`
6. Archived plans, including the superseded `tasks.md`

### 0.3 How to read this roadmap

- Section 1 is the audited baseline: what is shipped, partial, placeholder, or
  flawed today.
- Section 2 is the auditor operating model: parallelism, ownership, zero-stub
  rules, and wave evidence.
- Section 3 is the non-negotiable architecture contract.
- Section 4 is the non-negotiable UI/UX and design-system contract.
- Section 5 captures the target user journeys that later waves must preserve.
- Section 6 is the active execution lane. These waves are eligible for
  immediate implementation.
- Section 7 preserves later-wave product scope from the superseded roadmap, but
  parks it behind explicit re-entry gates until the current launch blockers are
  closed.
- Section 8 defines cross-cutting quality gates, testing expectations, success
  metrics, and release evidence.

### 0.4 Vocabulary

- `verified-shipped`: present in code and no longer tracked here except as
  dependency context.
- `partial`: core code exists, but routing, persistence, UX, tests, or
  integration truth is incomplete.
- `placeholder`: visible code path exists but still relies on fake progress,
  temporary state, hardcoded scaffolding, or untrusted assumptions.
- `flawed`: reachable behavior exists but violates AGENTS, design-system,
  accessibility, i18n, or architecture rules.
- `parked`: inherited roadmap scope retained here for planning, but not active
  until its prerequisites are satisfied.
- `batch`: smallest conflict-safe execution unit for one synced agent or one PR.
- `wave`: a group of batches that must all close before the next stage starts.

## 1. Audited baseline as of 2026-04-21

### 1.1 Verified shipped foundations

| Area                                     | Location                                                                                                         | Status           | Notes                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| M&A database schema and migrations       | `src/process/services/database/{schema,migrations}.ts`                                                           | verified-shipped | Includes M&A tables for deals, documents, analyses, risk findings, Flowise sessions, and integrations        |
| M&A repositories                         | `src/process/services/database/repositories/ma/**`                                                               | verified-shipped | Deal, document, analysis, risk finding, Flowise session, and integration repositories exist                  |
| Shared M&A types and schemas             | `src/common/ma/types.ts`, `src/common/ma/constants.ts`                                                           | verified-shipped | Core domain types, Zod schemas, and shared constants exist                                                   |
| Flowise connection and agent manager     | `src/process/agent/flowise/**`                                                                                   | verified-shipped | SSE streaming, retries, and health-check logic exist                                                         |
| M&A process bridge                       | `src/process/bridge/maBridge.ts`                                                                                 | verified-shipped | Deals, documents, analyses, risk findings, Flowise sessions, integrations, and cron entry points are present |
| Document processing                      | `src/process/services/ma/DocumentProcessor.ts`, `src/process/worker/ma/**`                                       | verified-shipped | PDF, DOCX, XLSX, TXT extraction and chunking exist                                                           |
| Due diligence orchestration              | `src/process/services/ma/DueDiligenceService.ts`, `src/process/worker/ma/**`                                     | verified-shipped | Local heuristics, Flowise-driven analysis, scoring, and comparison logic exist                               |
| Deal context service and hook            | `src/process/services/ma/DealContextService.ts`, `src/renderer/hooks/ma/useDealContext.ts`                       | verified-shipped | Core deal CRUD and active deal semantics exist, but persistence is not yet trustworthy                       |
| Document upload component and hook       | `src/renderer/components/ma/DocumentUpload/**`, `src/renderer/hooks/ma/useDocuments.ts`                          | verified-shipped | Surface exists, but still contains placeholder behavior                                                      |
| Risk score card                          | `src/renderer/components/ma/RiskScoreCard/**`                                                                    | verified-shipped | Surface exists, but still contains design-system and i18n violations                                         |
| Due diligence page and hook              | `src/renderer/pages/ma/DueDiligence/**`, `src/renderer/hooks/ma/useDueDiligence.ts`                              | verified-shipped | Page exists on disk and is functional in isolation, but is not yet routed correctly                          |
| Company profile and sector logic         | `src/common/ma/company/**`, `src/common/ma/sector/**`                                                            | verified-shipped | Merge rules, taxonomy, and sector helpers exist                                                              |
| Valuation engine                         | `src/common/ma/valuation/**`                                                                                     | verified-shipped | DCF, multiples, ANR, sensitivity, and football-field logic exist                                             |
| Glossary scaffold                        | `src/common/ma/glossary/**`                                                                                      | partial          | Substantial scaffold exists, but the roadmap target is much richer than current coverage                     |
| M&A locale module                        | `src/renderer/services/i18n/locales/*/ma.json`                                                                   | verified-shipped | Nine locale files exist, but the shipped UI does not fully consume them                                      |
| Integration service                      | `src/process/services/ma/IntegrationService.ts`                                                                  | verified-shipped | Nango and integration proxy wiring exists                                                                    |
| Company enrichment and adjacent services | `src/process/services/ma/{CompanyEnrichmentService,ContactService,WatchlistService,NativeIntegrationService}.ts` | verified-shipped | Services exist process-side but are not consistently surfaced end to end                                     |
| M&A unit tests                           | `tests/unit/ma/**`, `tests/unit/process/services/ma/**`                                                          | verified-shipped | Good domain and process coverage exists for many core services                                               |

### 1.2 Verified remaining gaps

| ID  | Gap                                                                                                          | Evidence in code                                                                                                                                 | Status      |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| G1  | M&A pages are not reachable from the app router                                                              | `src/renderer/components/layout/Router.tsx` lacks `/ma/*` routes while M&A pages exist under `src/renderer/pages/ma/`                            | partial     |
| G2  | Flowise readiness contract exists in shared and renderer layers, but process-side provider wiring is missing | `src/common/adapter/ipcBridge.ts`, `src/renderer/hooks/ma/useFlowiseReadiness.ts`, missing matching provider in `src/process/bridge/maBridge.ts` | partial     |
| G3  | Active deal selection is not durable                                                                         | `src/process/services/ma/DealContextService.ts` uses global state                                                                                | placeholder |
| G4  | Active-deal clearing is not exposed as a complete first-class bridge path                                    | Hook and service intent exist, but bridge coverage is incomplete                                                                                 | partial     |
| G5  | DD runtime still allows raw flow identifiers where catalog-backed flow selection should govern               | Flow catalog exists under `src/common/ma/flowise/**`, but runtime adoption is incomplete                                                         | partial     |
| G6  | Upload flow still uses placeholder progress and weak provenance handling                                     | `src/renderer/components/ma/DocumentUpload/DocumentUpload.tsx`, `src/renderer/hooks/ma/useDocuments.ts`                                          | placeholder |
| G7  | Upload, processing, and DD state are not fully closed loop between renderer and process                      | Processor exists, but renderer truth still diverges from process truth                                                                           | partial     |
| G8  | Shipped M&A UI violates AGENTS and design-system rules                                                       | Raw buttons, emoji, hardcoded copy, hardcoded colors, `transition: all`, and token drift remain                                                  | flawed      |
| G9  | Locale-aware formatting is not centralized                                                                   | M&A pages still rely on browser-default formatting primitives                                                                                    | flawed      |
| G10 | Contacts, watchlists, enrichment, and some integrations are only partially surfaced                          | Services exist but renderer/bridge exposure is incomplete or ambiguous                                                                           | partial     |
| G11 | Renderer regression protection is weak                                                                       | Strong service tests exist, but route, component, and hook coverage is still thin                                                                | partial     |
| G12 | Flowise production binding is incomplete                                                                     | Runtime readiness, endpoint configuration, feature-to-flow mapping, and provenance are incomplete                                                | partial     |
| G13 | Rich later-wave product scope still exists only as inherited intent                                          | Old roadmap retained many product tracks not represented in the active lane                                                                      | parked      |

### 1.3 What the superseded roadmap got right and must not be lost

The superseded roadmap contained legitimate product scope that should remain
visible even though it must not distract from current launch blockers:

- A richer M&A shell with top bar, layout, active-deal indicator, breadcrumbs,
  and command palette.
- Data-intelligence ingestion from French sources such as SIRENE, data.gouv.fr,
  and Pappers.
- Valuation workbench and company/sector analytical surfaces.
- Document automation for NDA, LOI, DD checklist, teaser, IM, and valuation
  report generation.
- CRM and communications surfaces such as contacts, Kanban pipeline, email,
  WhatsApp, and Pipedrive.
- Flowise production binding, RAG or knowledge-base ingestion, prompt versioning,
  observability, and tool families like `web.*` and `news.*`.
- Dashboarding, comparables, daily brief, reporting, and later analytics views.
- Enterprise/compliance layers like RBAC, audit log, encryption, GDPR, and VDR.
- Release and post-launch tracks such as pen testing, performance budgets,
  signing, beta program, MetaMCP, Browserless, RSSHub, Infisical, and Langfuse.

This enriched roadmap keeps those items visible in Section 7, but parks them
behind explicit re-entry criteria so the immediate code truth remains clear.

### 1.4 What the previous task list got wrong

- It mixed genuinely shipped work with unchecked tasks, which made the active
  execution lane misleading.
- It treated some page files as unimplemented even though they existed on disk.
- It blurred the difference between source-backed gaps and future product scope.
- It carried rich design-system and architecture guidance, but it did not
  distinguish between immediate launch blockers and later platform evolution.
- It preserved important future intent, but it made it too easy to start
  speculative work before current launch gaps were closed.

### 1.5 Detailed UI/UX audit findings

#### 1.5.1 Palette and token drift

- `RiskScoreCard.tsx` hardcodes semantic hex values and uses emoji as category
  icons.
- Multiple M&A CSS modules rely on Arco token names or raw colors rather than
  semantic tokens used by the design system.
- Status colors for deal states do not consistently route through semantic
  success, warning, or neutral tokens.

#### 1.5.2 Typography and spacing drift

- M&A surfaces still use fixed pixel typography rather than a coherent scale.
- Serif or editorial headings expected by the design language are absent from
  the shipped M&A pages.
- Card spacing and radius values vary across components instead of following a
  shared rhythm.

#### 1.5.3 Internationalization gaps

- `DealSelector.tsx` hardcodes labels for statuses and empty states.
- `DealForm.tsx` hardcodes transaction and party-role labels.
- `DealContextPage.tsx` hardcodes titles, status labels, and toast copy.
- `DocumentUpload.tsx` hardcodes validation copy.
- `RiskScoreCard.tsx` hardcodes category labels, severity labels, empty-state
  copy, and score-label helpers.
- `DueDiligencePage.tsx` expects locale keys that are not fully represented in
  the current locale files.

#### 1.5.4 Accessibility gaps

- Raw buttons and icon-only controls in M&A pages do not consistently expose
  accessible names.
- DD progress is not exposed through an `aria-live` region.
- The styled upload dropzone does not provide a fully equivalent keyboard-first
  experience.
- No M&A shell exists yet to host skip links, structured landmarks, and
  predictable focus restoration.
- Focus-visible and reduced-motion behavior are not explicitly regression-tested
  on the M&A surface.

#### 1.5.5 Navigation and information architecture gaps

- No `/ma/*` route exists in the main router.
- No persistent active-deal indicator exists across M&A pages.
- No breadcrumbs exist for the deal-to-document-to-analysis-to-valuation path.
- No command palette or quick-jump surface exists for deals, companies,
  analyses, glossary, or reports.
- Existing pages are stranded rather than assembled into a coherent shell.

#### 1.5.6 Feedback, loading, and empty-state gaps

- Async states mostly use generic spin behavior rather than reusable skeleton,
  empty, or error primitives.
- Empty states rely on ad-hoc div markup and emoji.
- Toast messaging is inconsistent and not fully localized.
- First-run flows for zero deals, zero docs, or zero integrations are still
  underdesigned.

#### 1.5.7 Locale-aware formatting gaps

- Dates, numbers, and money are not consistently rendered through shared helpers.
- SIREN and SIRET display formatting is not standardized.
- Negative financial deltas and risk changes are not consistently encoded with
  semantic formatting rules.

#### 1.5.8 Motion and micro-interaction gaps

- M&A CSS still relies on `transition: all`.
- Reduced-motion accommodations are incomplete on the M&A surface.
- Hover, focus, and elevation language is inconsistent across cards and controls.

#### 1.5.9 Component inventory and regression gaps

- No stable story inventory exists for M&A components.
- DOM coverage is still much weaker than the process and domain test layers.
- Visual regression expectations are not documented for new M&A surfaces.

### 1.6 Detailed architecture and runtime audit findings

#### 1.6.1 Bridge truth gaps

- Shared IPC contracts and process providers are not fully symmetrical for M&A.
- Hooks can currently express intent the process bridge does not fully satisfy.

#### 1.6.2 Persistence gaps

- Active deal is not stored durably.
- Upload provenance is not persisted truthfully from the real ingestion path.

#### 1.6.3 Flowise runtime gaps

- The Flowise catalog exists but is not yet the source of runtime truth for DD.
- Readiness exists as concept and helper, but not as a fully wired contract.
- Feature-to-flow provenance, prompt versioning, and runtime observability are
  not closed loop yet.

#### 1.6.4 Surface-area ambiguity gaps

- Contacts, watchlists, enrichment, and native integration services exist
  process-side, but the product surface does not clearly say which are active,
  which are intentionally hidden, and which are future-only.

## 2. Auditor operating model

### 2.1 Execution philosophy

This roadmap uses a stricter model than the superseded plan:

- Keep current launch blockers in the active lane.
- Preserve later feature memory without allowing it to hijack current execution.
- Force every batch to prove both code truth and user-visible truth.
- Require every wave to end with an audit artifact, not just merged code.

### 2.2 Batch card contract

Every batch in Sections 6 and 7 must define:

- Objective
- Owner scope
- Files or directories explicitly not owned
- Dependencies
- Parallelism permissions
- Architecture requirements
- UI/UX requirements if renderer-facing
- Deliverables
- Success criteria
- Required tests
- Auditor close-out checks

### 2.3 Parallelism rules

- Two batches may run together only if their write scopes do not overlap.
- Shared serialization points require explicit ownership.
- Router, bridge contracts, shared locale files, and schema or migration files
  are always serialization points unless a wave says otherwise.
- A later wave may not start if its prerequisites are still open, even if an
  individual batch seems independently implementable.

### 2.4 Shared serialization points

Only one active batch at a time may own each of these:

- `src/renderer/components/layout/Router.tsx`
- `src/common/adapter/ipcBridge.ts`
- `src/process/bridge/maBridge.ts`
- `src/common/ma/types.ts`
- `src/process/services/database/{schema,migrations}.ts`
- `src/renderer/services/i18n/locales/*/ma.json`
- any future `MaLayout` or shared M&A shell entry once introduced

### 2.5 Zero-stub policy

The auditor rejects a batch if any of these remain in owned scope without an
explicit documented exception:

- Fake progress based only on `setTimeout`
- Persisting a source path as only `file.name`
- Global in-memory active-deal persistence
- Raw runtime `flowId` use where catalog-backed `flowKey` should govern
- Raw interactive HTML in renderer M&A surfaces
- Emoji used as functional UI icons
- Hardcoded user-facing copy outside locale files
- Hardcoded semantic colors in TSX or CSS modules
- New `transition: all`

### 2.6 Wave evidence contract

Every wave ends with a note under `docs/audit/` containing:

- Wave number and date
- Batches included
- Commands executed
- Tests added or extended
- Screens or routes touched
- Open risks and intentional deferrals
- Clear statement on whether the next wave is now unlocked

Suggested file pattern:
`docs/audit/2026-xx-xx-ma-wave-N.md`

### 2.7 Global merge gate

Every batch is incomplete until these are green:

- `bun run lint`
- `bun run format:check`
- `bunx tsc --noEmit`
- `bun run test`
- `bun run i18n:types` when renderer or locale files changed
- `node scripts/check-i18n.js` when renderer or locale files changed

Additional gates may be required by a wave.

### 2.8 PR evidence expectations

Every PR touching `src/renderer/` should include:

- Before and after screenshots for every affected screen or state
- Keyboard-navigation coverage notes
- Reduced-motion verification notes
- Dark-mode verification notes if visuals changed
- Locale verification notes if text or formatting changed
- Route or hook test references for any new behavior

### 2.9 Promotion rule from parked to active

A parked wave or feature may move into the active lane only when:

- All prerequisite active waves are closed by audit note
- There is a named owner batch structure
- The route, bridge, data, and UX entry points are known
- Success criteria and tests are defined
- The work will not invalidate current active batches by scope collision

## 3. Non-negotiable architecture requirements

### 3.1 Process boundary rules

- `src/process/**` must not depend on DOM or renderer APIs.
- `src/renderer/**` must not depend on Node.js or Electron main-process APIs
  directly.
- `src/process/worker/**` must not depend on Electron APIs.
- Cross-process calls must go through the preload and IPC bridge contracts.

### 3.2 Bridge symmetry rules

For every M&A action exposed to the renderer:

- A shared contract must exist under `src/common/adapter/ipcBridge.ts`
- A matching provider must exist in `src/process/bridge/maBridge.ts`
- The renderer hook or service must consume only those defined methods
- Tests should prove the contract is wired, not merely typed

### 3.3 File-structure and island rules

- Respect AGENTS and `docs/conventions/file-structure.md`
- Keep directories under the direct-child limit by splitting by responsibility
  when needed
- Prefer page directories and component directories that bundle private CSS,
  tests, and helpers rather than dumping unrelated files into one folder
- Shared M&A helpers should live under a clear shared location, not duplicated
  ad hoc across pages

### 3.4 Persistence and migration rules

- Durable user state belongs in storage, not on `global`
- New durable data must have schema and migration ownership clearly declared
- Repository updates and schema updates must land together if they are coupled
- Temporary compatibility fields must be documented and tested

### 3.5 Service, worker, and repository layering

- Extraction, ingestion, orchestration, and persistence concerns should remain
  separated
- Workers should own heavy document or analysis execution, not renderer hooks
- Renderer hooks should never fabricate process truth if a real worker or bridge
  state exists
- Repositories should not leak renderer-specific concepts

### 3.6 Shared type and schema discipline

- Shared domain shapes should live in `src/common/ma/**`
- Runtime validation and persistence translation must not diverge silently
- If a batch changes a shared type, it must identify every consumer layer
- Flowise feature selection should be modeled through shared catalog-backed
  shapes rather than ad-hoc strings

### 3.7 Flowise and AI runtime contract

Every AI-driven M&A feature must eventually satisfy all of the following:

- Explicit feature-to-flow mapping
- Catalog-backed flow metadata
- Readiness or health check before critical execution
- Prompt or chatflow provenance captured with output
- Error surfaces that explain whether the fault came from readiness, auth,
  missing docs, empty inputs, or model execution
- Test coverage for at least one unhappy path and one provenance assertion

### 3.8 Data-intelligence contract

Any French company or market-intelligence feature should define:

- Which source is canonical for which field
- Which fields are merged versus source-specific
- Freshness and cache policy
- How the data is persisted or intentionally not persisted
- Which view or workflow consumes the data
- Which tests prove source reconciliation

### 3.9 Config and secrets contract

- Endpoint or credential-bearing integrations must not rely on source edits for
  basic runtime configuration
- Secret access must have a clear precedence chain
- Local fallback, environment configuration, and production binding must be
  documented before a feature can be called production-bound

### 3.10 Observability contract

Critical M&A actions should eventually emit enough context to debug failures:

- route or feature identifier
- deal identifier when applicable
- flow or prompt provenance when AI-driven
- integration identifier when external services are involved
- failure class and user-visible recovery path

### 3.11 Testing architecture expectations

- Domain logic needs unit tests
- Bridge additions need bridge or integration-oriented tests
- Hooks need hook tests when they own stateful contract behavior
- Renderer pages and components need DOM tests for key states
- Accessibility-sensitive behavior needs explicit DOM assertions
- Locale-bearing changes need i18n validation and formatter tests

### 3.12 Definition of production-bound

An integration or feature is not "production-bound" until:

- Runtime config is not hardcoded in source
- Readiness or health semantics are surfaced
- Error states are user-visible
- At least one happy-path and one failure-path test exist
- Provenance or observability expectations are defined if the feature is AI or
  external-service driven

## 4. Non-negotiable UI/UX and design-system contract

### 4.1 Components and interactivity

- Use Arco components for interactive primitives
- Do not ship raw `<button>`, `<input>`, `<select>`, or equivalent interactive
  HTML in M&A screens unless there is a strong documented exception
- Use `@icon-park/react` for icons instead of emoji or ad-hoc glyphs

### 4.2 Tokens and colors

- Use semantic tokens or approved CSS variables
- Avoid raw semantic hex values in component logic or CSS modules
- Status, risk, and delta colors should map through semantic tokens and remain
  readable in both light and dark modes

### 4.3 Typography and spacing

- Follow the shared type scale instead of ad-hoc pixel sizes
- Use consistent heading hierarchy across the M&A shell
- Align spacing, padding, and radius values to shared rhythm and token rules

### 4.4 Shell and information architecture

The M&A surface should eventually offer:

- A clear entry route
- A stable shell with landmarks
- Persistent active-deal context
- Breadcrumbs where deep navigation exists
- Predictable page titles and empty-state recovery
- Clear separation between workbench pages, supporting reference pages, and
  future automation/reporting surfaces

### 4.5 Loading, empty, and error states

Every renderer-facing M&A surface must define:

- Loading state
- Empty state
- Error state
- No-data or not-ready state
- Recovery action when applicable

Async truth should come from the real process or hook contract, not placeholder
timers or optimistic guesses that never reconcile.

### 4.6 Locale-aware formatting

All user-facing dates, numbers, money, and source identifiers should use shared
formatting helpers. This includes:

- deal dates
- analysis timestamps
- money values and ranges
- percentages and deltas
- SIREN or SIRET style identifiers if those appear later

### 4.7 Internationalization

- All user-facing copy belongs in locale files
- Status labels, empty states, form options, category names, toasts, and helper
  strings must not be hardcoded in component files
- Locale-file additions must be validated through type generation and i18n checks

### 4.8 Accessibility

Every M&A screen should satisfy at minimum:

- explicit accessible names for all actions
- predictable focus order
- keyboard equivalence for drag/drop or hidden-upload affordances
- `aria-live` where progress or analysis output changes asynchronously
- visible focus styling
- reduced-motion-safe behavior
- semantic landmarks once the M&A shell exists

### 4.9 Responsive and window-size behavior

- M&A pages must not assume one desktop width
- Side panels, lists, and detail panes should degrade reasonably on smaller
  windows
- Large monitors should not expose awkward fixed-width dead zones without a
  design reason

### 4.10 Motion

- Do not use `transition: all`
- Motion should be optically intentional and property-specific
- Reduced-motion fallback is mandatory for animated or streaming-heavy surfaces

### 4.11 First-run and no-data UX

For zero-data scenarios, the UI must explain:

- what this area is for
- what action the user can take next
- whether an active deal, documents, or integrations are prerequisites
- whether a missing external dependency, like Flowise readiness, is blocking
  progress

### 4.12 Visual regression expectations

If a batch creates or significantly changes a reusable M&A renderer surface, it
should define one of:

- a component-story plan
- a DOM-state matrix
- a screenshot or visual-baseline plan

The exact tool may evolve later, but the expectation of visual evidence exists
now.

## 5. Reference user journeys

### 5.1 First-run onboarding

Ideal outcome:

- User reaches an M&A home or entry route
- User understands what a deal is and how to create one
- User sees what depends on active-deal selection
- User sees what needs documents or integrations

Current code truth:

- No coherent M&A shell or routed home exists yet
- Deal creation and selection exist, but entry flow is fragmented

Blocking items:

- router reachability
- shell or entry-route design
- empty-state and onboarding copy

Test notes:

- route smoke
- empty-state DOM tests
- localized CTA tests

### 5.2 Deal lifecycle

Ideal outcome:

- Create a deal
- Mark stages and status
- Keep one active deal visible across the M&A surface
- Archive, reactivate, or close confidently

Current code truth:

- core CRUD and status logic exist
- active deal is not yet durable or fully bridged

Blocking items:

- durable active deal persistence
- clear-active path
- routed shell context

Test notes:

- persistence tests
- hook tests
- route-context tests once shell exists

### 5.3 Company research to valuation to report

Ideal outcome:

- Research a company
- View merged profile and sector context
- Open a valuation workbench
- Export or draft a valuation report

Current code truth:

- company, sector, and valuation engines exist
- corresponding routed UI surfaces are not yet complete or mounted

Blocking items:

- data-intelligence foundation
- analytical UI surfaces
- report-generation architecture

Test notes:

- formatter and domain tests already exist for parts of this chain
- later waves will need route and report tests

### 5.4 Document upload to due diligence to risk output

Ideal outcome:

- Upload documents
- Observe real processing and extraction state
- Launch DD against trusted processed documents
- Review risk outputs and export or act on them

Current code truth:

- processor and DD service exist
- renderer upload and DD truth still contain placeholders and wiring gaps

Blocking items:

- real ingestion contract
- readiness wiring
- DD unhappy-path UX
- localized upload and result states

Test notes:

- process, hook, and renderer lifecycle tests are required

### 5.5 Daily brief

Ideal outcome:

- User receives concise daily M&A intelligence summaries
- Source provenance is visible
- User can jump from brief item to deal, company, or report context

Current code truth:

- this remains inherited product intent, not active shipped scope

Blocking items:

- market-intelligence feeds
- reporting engine
- shell navigation

### 5.6 Command palette

Ideal outcome:

- User can jump to deals, companies, docs, analyses, glossary, and later reports
- Search respects active-deal context where relevant

Current code truth:

- no command palette exists yet

Blocking items:

- routed shell
- search index or lookup contract
- later integration with knowledge or glossary layers

### 5.7 Team mode multiplied by M&A

Ideal outcome:

- Shared context preserves active deal, discussions, and AI provenance across
  sessions or collaborators where supported

Current code truth:

- team-adjacent concerns are not yet wired into the M&A shell or Flowise memory

Blocking items:

- shell architecture
- flow provenance
- future team-mode decisions

## 6. Active execution lane

These waves are eligible for immediate work. They reflect current code truth and
current launch blockers.

### 6.1 Current audited status

- Wave 0 is complete.
- Batch 1A is complete and auditor-corrected.
- Batch 1B is complete and auditor-corrected.
- The remaining active work starts at Batch 1C.
- No later wave should be promoted ahead of the active lane just because code
  already exists on disk. Reachability, truthfulness, and compliance still come
  first.

### 6.2 Remaining-roadmap async topology

Use these lanes to parallelize without collision:

- `contract-seed`: first batch in a wave that is allowed to touch shared
  serialization points, seed locale namespaces, or establish extension slots.
- `process-domain`: process services, repositories, workers, migrations, and
  domain truth.
- `renderer-surface`: page, component, and hook work inside wave-owned
  renderer islands.
- `shell-surface`: router, layout, navigation, breadcrumbs, home, and command
  entry.
- `ai-runtime`: Flowise, catalog, prompt, provenance, observability, and
  feature-to-flow mapping.
- `integration-surface`: external integrations, sync semantics, readiness, and
  failure UX.
- `audit-harness`: tests, evidence capture, and `docs/audit/**`.

### 6.3 Remaining-wave serialization law

The earlier Wave 1A and 1B audit exposed four rules that now apply to every
unfinished wave:

- Contract-seed batches may touch shared serialization points. Later batches in
  the same wave must consume those seeded contracts instead of widening scope.
- Route tests must render real routes. A test that only asserts string literals
  is not accepted as route coverage.
- Hook tests must execute hooks. A test that only inspects source text is not
  accepted as hook coverage.
- A batch owning `src/common/adapter/ipcBridge.ts`,
  `src/process/bridge/maBridge.ts`, router entry files, migrations, or locale
  files may not widen scope with unrelated additions.

### 6.4 Prompt packet contract

Every unfinished batch below is written to be copied into a synced coder agent.
Each packet must be treated as a hard write-scope contract.

Each batch packet includes:

- lane
- dependency and parallelism rule
- exact owned scope
- exact forbidden scope
- implementation contract
- required tests
- handoff artifact requirements
- abort and escalate triggers

If an agent needs to edit a forbidden shared file, it should stop and return a
delta request instead of silently widening scope.

## Wave 0 - Roadmap reset and audit scaffolding

### Goal

Establish an enriched, auditable plan that preserves former feature intent while
keeping the active lane grounded in current code.

### Status

Completed by the roadmap rewrites and accepted as the execution baseline.

### Deliverables

- archive of the superseded plan
- enriched active roadmap
- retained later-wave feature memory
- auditor model, architecture contract, UX contract, and wave evidence model

### Auditor note expectation

Wave 0 is closed. It should only be reopened if this roadmap loses feature
memory, execution discipline, or auditable structure.

## Wave 1 - Reachability, bridge truth, and durable active context

### Objective

Make the existing M&A product reachable, structurally honest, and durable before
deeper UX or feature expansion begins.

### Current status

- 1A complete: route entry is no longer stranded and the landing flow is
  keyboard-safe.
- 1B complete: readiness and clear-active bridge truth are no longer dead
  contracts.
- 1C pending: active deal still needs durable storage ownership.
- 1D pending: DD runtime still needs catalog-backed flow truth and full
  provenance.

### Async execution plan

- `1C` runs in `process-domain`.
- `1D` runs in `ai-runtime`.
- `1C` and `1D` may run in parallel only if neither batch edits
  `src/common/ma/types.ts`, migrations, or bridge contracts.
- If either batch needs a shared type or bridge change, serialize through a
  short contract note first, then merge one batch before the other starts.

### Batch 1A - Route and shell entry wiring

- Status:
  - completed and auditor-corrected
- Keep protected by regression:
  - `/ma`, `/ma/deal-context`, and `/ma/due-diligence` remain truly reachable
  - landing interactions remain keyboard accessible
  - route tests must keep rendering the real router

### Batch 1B - Shared IPC truth pass

- Status:
  - completed and auditor-corrected
- Keep protected by regression:
  - Flowise readiness remains process-backed
  - clear-active remains fully bridged
  - hook tests continue to execute real hook behavior instead of source-text
    inspection

### Batch 1C - Durable active deal persistence

- Lane:
  - `process-domain`
- Depends on:
  - completed Batch 1B
- Can run with:
  - Batch 1D if no shared type or bridge edits are needed
- Owns:
  - `src/process/services/ma/DealContextService.ts`
  - one new or existing repository under
    `src/process/services/database/repositories/ma/**` if required
  - migrations only if durable storage truly requires a schema addition
- Must not touch:
  - `src/renderer/**`
  - `src/common/adapter/ipcBridge.ts`
  - `src/process/bridge/maBridge.ts`
  - `src/common/ma/types.ts` unless a separate serialization note explicitly
    unlocks it
- Implementation contract:
  - Remove all process-global active-deal storage.
  - Pick one durable owner for active-deal state and make restore semantics
    explicit.
  - Keep clear-active behavior first-class and idempotent.
  - Restore behavior must not create a phantom active deal if the referenced
    deal no longer exists.
  - Service semantics must stay compatible with the already-corrected hook and
    bridge surface unless a contract note says otherwise.
- Success criteria:
  - `(global as any).__maActiveDealId` and equivalent memory-only state are gone
  - active deal survives restart or service recreation according to product
    intent
  - clear-active leaves durable storage empty and restores a no-active-deal
    state cleanly
  - delete, archive, and close flows do not leave corrupt active-deal pointers
- Required tests:
  - service tests for set-active, restore-active, clear-active, and missing-deal
    recovery
  - repository or migration tests if new persistence is introduced
  - focused regression proving the old global persistence path cannot silently
    return
- Handoff artifact:
  - list chosen storage owner
  - list restore order and fallback rules
  - list commands run
  - residual risks if schema work was avoided deliberately

#### Feed-ready agent prompt

```text
You own Wave 1 / Batch 1C: durable active deal persistence.

Goal:
- Replace process-global active-deal state with a durable restore/clear model.

Read first:
- src/process/services/ma/DealContextService.ts
- src/process/services/database/repositories/ma/**
- tests/unit/process/services/ma/**

Write only:
- src/process/services/ma/DealContextService.ts
- one repository or migration island if truly required

Do not edit:
- src/renderer/**
- src/common/adapter/ipcBridge.ts
- src/process/bridge/maBridge.ts
- src/common/ma/types.ts unless you stop and request serialization

Implementation requirements:
- remove every remaining global active-deal persistence path
- define one durable owner and one restore path
- keep clear-active idempotent
- handle deleted or archived deals explicitly
- do not add placeholder fallback logic or TODO comments as behavior

Tests required:
- restore-active happy path
- clear-active happy path
- stale-pointer recovery path
- persistence proof that would fail if global state came back

Return with:
- files changed
- storage owner chosen
- commands run
- remaining risks

Abort and escalate if:
- you need to change bridge contracts
- you need shared type changes
- you need a migration that collides with another active batch
```

### Batch 1D - DD flow catalog runtime adoption

- Lane:
  - `ai-runtime`
- Depends on:
  - completed Batch 1B
- Can run with:
  - Batch 1C if shared types and bridge files remain untouched
- Owns:
  - `src/process/services/ma/DueDiligenceService.ts`
  - `src/common/ma/flowise/**`
  - narrowly scoped provenance helpers under `src/common/ma/**` if a new file is
    enough
- Must not touch:
  - `src/renderer/**`
  - `src/common/adapter/ipcBridge.ts`
  - `src/process/bridge/maBridge.ts`
  - broad unrelated Flowise runtime code outside the DD selection path
- Implementation contract:
  - Make flow catalog metadata the runtime truth for DD.
  - Replace free-form `flowId` trust with validated `flowKey` selection for
    normal execution.
  - Capture enough provenance to know which flow family and prompt version
    produced each DD output.
  - Invalid or missing flow keys must fail clearly and testably.
  - Preserve current behavior only where it is intentionally needed for
    migration or backward compatibility, and document it.
- Success criteria:
  - DD no longer accepts arbitrary raw runtime flow IDs as the normal execution
    path
  - provenance is persistable and inspectable
  - tests prove catalog metadata participates in execution
- Required tests:
  - invalid flow-key rejection
  - execution path proving catalog resolution is used
  - provenance attachment test covering flow key and prompt version metadata
- Handoff artifact:
  - list runtime catalog fields now treated as truth
  - list any temporary compatibility branch and sunset expectation
  - commands run

#### Feed-ready agent prompt

```text
You own Wave 1 / Batch 1D: DD flow catalog runtime adoption.

Goal:
- Make the Flowise catalog the runtime truth for DD selection and provenance.

Read first:
- src/process/services/ma/DueDiligenceService.ts
- src/common/ma/flowise/**
- tests/unit/process/services/ma/**
- tests/unit/maFlowiseCatalog.test.ts

Write only:
- src/process/services/ma/DueDiligenceService.ts
- src/common/ma/flowise/**
- one small shared provenance helper file only if needed

Do not edit:
- src/renderer/**
- src/common/adapter/ipcBridge.ts
- src/process/bridge/maBridge.ts
- broad Flowise runtime plumbing outside DD selection

Implementation requirements:
- validate flow selection through catalog-backed keys
- reject invalid keys clearly
- attach flow and prompt provenance to DD outputs
- avoid free-form flowId trust in the normal path
- keep compatibility code minimal and explicit

Tests required:
- invalid key rejection
- catalog resolution path
- provenance persistence or attachment

Return with:
- files changed
- catalog fields used as runtime truth
- commands run
- compatibility notes if any

Abort and escalate if:
- you need renderer changes
- you need bridge contract changes
- you need to widen into generic Flowise config work that belongs to Wave 9
```

### Wave 1 close-out

Wave 1 is complete only when:

- `/ma/*` remains reachable
- Flowise readiness remains a real bridged provider
- active deal is durable and clearable
- DD flow selection is catalog-backed
- `docs/audit/` contains the wave note with regression references for 1A and 1B

## Wave 2 - Real document pipeline and honest DD handoff

### Objective

Replace upload and DD placeholder behavior with real renderer-to-process truth.

### Why this is active now

- upload flow still simulates progress
- upload provenance is weak
- DD renderer states do not fully represent backend truth

### Async execution plan

- `2A` is the contract-seed batch. It owns process truth, bridge progress, and
  provenance semantics. It must merge first.
- `2B` and `2C` may run in parallel after `2A` lands.
- `2D` is `audit-harness` and runs last.
- `2B` owns upload renderer islands.
- `2C` owns DD renderer islands.
- `2B` may not edit locale files after `2A`; if it needs new keys, it returns a
  locale delta request instead of colliding with `2C`.

### Batch 2A - Process-side ingestion and progress contract

- Lane:
  - `contract-seed`
- Owns:
  - `src/process/bridge/maBridge.ts`
  - `src/process/services/ma/DocumentProcessor.ts`
  - `src/process/worker/ma/**`
  - document repositories if provenance fields or state transitions change
  - `src/common/adapter/ipcBridge.ts` only for document event contracts
- Must not touch:
  - `src/renderer/**`
  - unrelated M&A bridge families
- Implementation contract:
  - progress must come from real process execution
  - success, partial failure, cancellation, and failure must be explicit
  - source metadata must be truthful or replaced with a clearly named canonical
    field
  - upload and processing states must be replayable by the renderer
- Success criteria:
  - renderer can subscribe to real progress and terminal states
  - stored provenance no longer depends on `file.name` as the only source path
  - processor and bridge semantics are stable enough for `2B` and `2C` to build
    on without reopening process truth
- Required tests:
  - document processor lifecycle tests
  - bridge tests for progress, success, and failure events
  - repository tests if persisted provenance shape changes

#### Feed-ready agent prompt

```text
You own Wave 2 / Batch 2A: process-side ingestion and progress contract.

Goal:
- turn upload and processing into a real process-backed state machine that the
  renderer can trust.

Read first:
- src/process/services/ma/DocumentProcessor.ts
- src/process/bridge/maBridge.ts
- src/process/worker/ma/**
- tests/unit/process/services/ma/DocumentProcessor.test.ts

Write only:
- process-side document and worker files
- document bridge contracts
- document repository fields if needed

Do not edit:
- src/renderer/**
- unrelated M&A bridge families

Implementation requirements:
- emit truthful progress from process work
- define terminal states explicitly
- persist canonical provenance or honest source metadata
- keep event semantics compatible and testable

Tests required:
- progress path
- success path
- failure path
- partial or cancellation path if supported

Return with:
- state machine summary
- bridge events added or changed
- fields added or renamed
- commands run

Abort and escalate if:
- renderer work seems required to fake success
- you need broad schema changes beyond document ownership
```

### Batch 2B - Renderer upload lifecycle rewrite

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 2A
- Can run with:
  - Batch 2C
- Owns:
  - `src/renderer/components/ma/DocumentUpload/**`
  - `src/renderer/hooks/ma/useDocuments.ts`
- Must not touch:
  - `src/process/**`
  - `src/common/adapter/ipcBridge.ts`
  - locale files after the seed contract is frozen
- Implementation contract:
  - consume the real process contract instead of fabricating progress
  - remove fake timers and weak provenance assumptions
  - support loading, validation, progress, success, partial failure, and full
    failure states
  - keep upload affordances keyboard-first and AGENTS compliant
  - route all user-facing copy through locale keys that already exist or through
    a returned locale delta request
- Success criteria:
  - no `setTimeout`-driven fake progress remains
  - no renderer-created fake provenance remains
  - upload hook and component reconcile with process truth cleanly
- Required tests:
  - DOM tests for validation, progress, success, and failure
  - hook tests for lifecycle transitions and cleanup behavior
  - i18n validation if locale keys were seeded earlier in the wave

#### Feed-ready agent prompt

```text
You own Wave 2 / Batch 2B: renderer upload lifecycle rewrite.

Goal:
- remove placeholder upload behavior and bind the upload UI to the real process
  contract from 2A.

Read first:
- src/renderer/components/ma/DocumentUpload/**
- src/renderer/hooks/ma/useDocuments.ts
- the merged 2A bridge contract

Write only:
- upload renderer files
- upload hook files

Do not edit:
- src/process/**
- src/common/adapter/ipcBridge.ts
- locale files unless the wave owner explicitly unlocked them

Implementation requirements:
- no fake timer progress
- no originalPath=file.name fallback persistence behavior
- clear loading, empty, validation, partial-failure, and failure states
- keyboard-safe upload affordance
- localized user-facing copy

Tests required:
- validation state
- progress state
- terminal error state
- hook cleanup and state transition coverage

Return with:
- files changed
- user-visible states implemented
- commands run
- any locale delta request that still remains

Abort and escalate if:
- 2A contract is insufficient
- you need to reopen process truth
- you need shared locale edits that collide with another batch
```

### Batch 2C - Due diligence runtime UX hardening

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 2A
  - Wave 1 readiness and catalog truth
- Can run with:
  - Batch 2B
- Owns:
  - `src/renderer/pages/ma/DueDiligence/**`
  - `src/renderer/hooks/ma/useDueDiligence.ts`
- Must not touch:
  - `src/process/**`
  - upload renderer files
  - locale files after the seed contract is frozen
- Implementation contract:
  - DD must represent readiness-off, no-docs, processing, failure, and success
    states truthfully
  - prerequisites must be visible, not inferred silently
  - progress or streaming output must use accessible announcements where needed
  - errors must distinguish readiness, data, and analysis faults
- Success criteria:
  - DD never looks available when prerequisites are missing
  - user can tell why DD is blocked or failed
  - renderer state maps to backend state without guesswork
- Required tests:
  - page tests for readiness-off, no-docs, loading, error, and success
  - hook tests for lifecycle transitions
  - `aria-live` assertions where async output changes

#### Feed-ready agent prompt

```text
You own Wave 2 / Batch 2C: due diligence runtime UX hardening.

Goal:
- make the DD page honest about readiness, prerequisites, progress, and
  failure.

Read first:
- src/renderer/pages/ma/DueDiligence/**
- src/renderer/hooks/ma/useDueDiligence.ts
- the merged 2A contract and Wave 1 readiness/catalog behavior

Write only:
- DD renderer files
- DD hook files

Do not edit:
- src/process/**
- upload renderer files
- locale files unless explicitly unlocked

Implementation requirements:
- expose blocked-by-readiness state
- expose blocked-by-no-documents state
- expose processing and failure states distinctly
- use accessible announcements for async changes
- keep all copy localized

Tests required:
- readiness-off
- no-docs
- loading or processing
- failure
- success

Return with:
- files changed
- states covered
- commands run
- any follow-up risk for Wave 3 compliance sweep

Abort and escalate if:
- the 2A contract cannot support truthful DD state
- you need to reopen bridge or process files
```

### Batch 2D - Wave integration close-out

- Lane:
  - `audit-harness`
- Depends on:
  - Batches 2A through 2C
- Owns:
  - `tests/unit/renderer/**`
  - `tests/unit/process/**`
  - `docs/audit/**`
- Must not touch:
  - product source outside regression fixes approved by the auditor
- Implementation contract:
  - prove route-to-upload-to-DD truth with focused regression coverage
  - write the wave note with commands, risks, and unlock statement
- Required tests:
  - route-to-component or route-to-hook regression for upload to DD flow
  - at least one unhappy path and one happy path

#### Feed-ready agent prompt

```text
You own Wave 2 / Batch 2D: integration close-out and audit note.

Goal:
- lock the route-to-upload-to-DD behavior behind regression tests and produce
  the audit artifact.

Read first:
- all merged Wave 2 batches
- docs/audit existing notes if any

Write only:
- regression tests
- docs/audit/**

Do not edit:
- source files unless a failing test proves a tiny regression fix is required

Implementation requirements:
- add the smallest high-value regression harness
- reference actual commands run
- record remaining risk honestly

Return with:
- audit note path
- commands run
- tests added
- explicit statement whether Wave 3 is unlocked
```

### Wave 2 close-out

Wave 2 is complete only when:

- upload processing is real
- DD consumes real document state
- upload and DD states are localized
- route or component tests protect the happy path and at least one unhappy path
- `docs/audit/` contains the wave note

## Wave 3 - Design-system, i18n, accessibility, and locale compliance

### Objective

Bring the shipped M&A renderer surface into compliance with AGENTS, design
system, accessibility, and formatting rules.

### Async execution plan

- `3A` is the contract-seed batch. It owns locale namespaces, shared formatters,
  and any shared label helpers. It must land first.
- `3B` and `3C` may run in parallel after `3A`.
- `3B` owns deal workspace renderer islands.
- `3C` owns upload, risk, and DD renderer islands.
- `3D` runs last as `audit-harness`.
- `3B` and `3C` must not touch locale files. If `3A` missed keys, they return a
  locale delta instead of colliding.

### Batch 3A - Shared compliance foundations

- Lane:
  - `contract-seed`
- Owns:
  - `src/renderer/services/i18n/locales/*/ma.json`
  - any new shared formatter files
  - any new shared M&A label, state, or token helper files
- Must not touch:
  - page-specific renderer islands outside shared helpers
- Implementation contract:
  - seed all locale namespaces needed by `3B` and `3C`
  - create shared locale-aware formatters for dates, numbers, money, and visible
    identifiers already in the shipped surface
  - move reusable label maps and empty-state labels into shared helpers
- Success criteria:
  - later batches can consume seeded locale keys without editing locale files
  - shipped M&A surfaces have a shared formatter path instead of browser-default
    formatting shortcuts
- Required tests:
  - formatter unit tests
  - i18n type generation
  - i18n validation script

#### Feed-ready agent prompt

```text
You own Wave 3 / Batch 3A: shared compliance foundations.

Goal:
- seed locale keys and shared formatters so later compliance batches can work in
  parallel without touching shared locale files.

Read first:
- src/renderer/services/i18n/locales/*/ma.json
- current M&A pages and components that still hardcode labels or formatting

Write only:
- locale files
- shared formatter or label helper files

Do not edit:
- deal workspace page logic
- upload/DD page logic

Implementation requirements:
- add shared formatters for dates, numbers, money, and identifiers now visible
- seed all keys needed by the deal, upload, risk, and DD surfaces
- move reusable label maps out of component files where practical

Tests required:
- formatter tests
- i18n:types
- check-i18n

Return with:
- keys seeded
- helper files added
- commands run
- list of later batches that can now proceed without locale collisions
```

### Batch 3B - Deal workspace compliance sweep

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 3A
- Can run with:
  - Batch 3C
- Owns:
  - `src/renderer/components/ma/DealSelector/**`
  - `src/renderer/components/ma/DealForm/**`
  - `src/renderer/pages/ma/DealContext/**`
- Must not touch:
  - locale files
  - upload, risk, or DD renderer islands
- Implementation contract:
  - replace raw interactive HTML with Arco
  - remove emoji and hardcoded semantic colors
  - consume seeded locale keys
  - use shared formatters where visible dates, numbers, or money appear
  - remove `transition: all`
  - make critical actions discoverable by keyboard and screen readers
- Required tests:
  - DOM tests for accessible actions and localized labels
  - focus or tab behavior tests where the page owns section switching

#### Feed-ready agent prompt

```text
You own Wave 3 / Batch 3B: deal workspace compliance sweep.

Goal:
- bring DealSelector, DealForm, and DealContext into AGENTS, token, i18n, and
  a11y compliance.

Read first:
- the merged 3A helpers and locale keys
- src/renderer/components/ma/DealSelector/**
- src/renderer/components/ma/DealForm/**
- src/renderer/pages/ma/DealContext/**

Write only:
- deal workspace renderer files

Do not edit:
- locale files
- upload/risk/DD files
- process or bridge code

Implementation requirements:
- no raw interactive HTML
- no emoji
- no hardcoded copy
- no hardcoded semantic colors
- no transition: all
- use shared formatters and shared labels

Tests required:
- accessible action coverage
- localized text coverage
- section or tab behavior if present

Return with:
- files changed
- violations removed
- commands run
- remaining gaps, if any
```

### Batch 3C - Upload and DD compliance sweep

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 3A
- Can run with:
  - Batch 3B
- Owns:
  - `src/renderer/components/ma/DocumentUpload/**`
  - `src/renderer/components/ma/RiskScoreCard/**`
  - `src/renderer/pages/ma/DueDiligence/**`
- Must not touch:
  - locale files
  - deal workspace renderer islands
- Implementation contract:
  - remove emoji category or empty-state glyphs
  - replace semantic colors with tokens
  - localize category, severity, helper, and empty-state copy
  - remove `transition: all`
  - ensure progress and async changes remain accessible
- Required tests:
  - risk-card empty and populated localized tests
  - DD accessibility tests for async output
  - upload empty or validation state tests if compliance changes affect them

#### Feed-ready agent prompt

```text
You own Wave 3 / Batch 3C: upload and DD compliance sweep.

Goal:
- make DocumentUpload, RiskScoreCard, and DueDiligence fully compliant with the
  design system, i18n, and accessibility rules seeded by 3A.

Read first:
- merged 3A helpers
- src/renderer/components/ma/DocumentUpload/**
- src/renderer/components/ma/RiskScoreCard/**
- src/renderer/pages/ma/DueDiligence/**

Write only:
- upload, risk, and DD renderer files

Do not edit:
- locale files
- deal workspace files
- process or bridge files

Implementation requirements:
- remove emoji
- remove hardcoded semantic colors
- consume shared formatters and labels
- keep async states accessible
- keep copy localized

Tests required:
- risk-card localized states
- DD async accessibility coverage
- any upload state affected by the compliance rewrite

Return with:
- files changed
- violations removed
- commands run
- any follow-up deltas for shared helpers
```

### Batch 3D - Wave integration close-out

- Lane:
  - `audit-harness`
- Depends on:
  - Batches 3A through 3C
- Owns:
  - `tests/unit/renderer/**`
  - `docs/audit/**`
- Implementation contract:
  - prove the routed M&A surface now meets minimum AGENTS and UX rules
  - capture grep or search evidence for removed violation classes
- Required tests:
  - route and component tests touching the upgraded screens
  - global merge gate

#### Feed-ready agent prompt

```text
You own Wave 3 / Batch 3D: compliance close-out and audit note.

Goal:
- verify that the upgraded M&A renderer surface now satisfies the minimum
  interaction, localization, formatting, and a11y rules.

Write only:
- regression tests
- docs/audit/**

Return with:
- audit note path
- searches or grep evidence used
- commands run
- statement whether Wave 4 is unlocked
```

### Wave 3 close-out

Wave 3 is complete only when:

- routed M&A renderer surfaces follow AGENTS interaction rules
- shipped M&A copy is localized
- locale-aware formatters are in use
- accessibility-sensitive behavior is regression-tested
- `docs/audit/` contains the wave note

## Wave 4 - Surface hidden capabilities and lock regression coverage

### Objective

Resolve the ambiguity around existing process-side capabilities and add durable
regression protection for the active M&A surface.

### Async execution plan

- `4A` is the contract-seed and decision batch. It owns keep, defer, or remove
  decisions and the shared bridge or type contract for kept capabilities.
- `4B` cannot start until `4A` lands.
- `4C` starts after `4B` stabilizes and owns the regression harness and audit
  note.

### Batch 4A - Capability disposition and contract pass

- Lane:
  - `contract-seed`
- Owns:
  - `src/process/services/ma/CompanyEnrichmentService.ts`
  - `src/process/services/ma/ContactService.ts`
  - `src/process/services/ma/WatchlistService.ts`
  - `src/process/services/ma/NativeIntegrationService.ts`
  - `src/process/bridge/maBridge.ts`
  - `src/common/adapter/ipcBridge.ts`
  - `src/common/ma/types.ts`
- Must not touch:
  - renderer surfaces except for naming the future owner path in the note
- Implementation contract:
  - classify each capability as keep now, defer intentionally, or remove
  - remove ambiguous half-exposed bridge surface
  - if a capability is kept, define the renderer entry path and test owner
  - if a capability is deferred, record why and what re-entry wave owns it
- Required tests:
  - service and bridge tests for every kept active capability
  - explicit keep/defer/remove table in the audit note

#### Feed-ready agent prompt

```text
You own Wave 4 / Batch 4A: capability disposition and contract pass.

Goal:
- stop the process-side M&A services from living in an ambiguous half-exposed
  state.

Read first:
- CompanyEnrichmentService.ts
- ContactService.ts
- WatchlistService.ts
- NativeIntegrationService.ts
- current M&A bridge contracts

Write only:
- the owned process services
- maBridge.ts
- ipcBridge.ts
- shared M&A types if truly needed

Do not edit:
- renderer surfaces

Implementation requirements:
- classify each capability: keep now, defer, or remove
- align bridge contracts to the keep set only
- leave a concrete renderer-owner path for each kept feature

Tests required:
- kept capability service tests
- bridge tests for kept capabilities

Return with:
- keep/defer/remove table
- files changed
- commands run
- explicit handoff to 4B
```

### Batch 4B - Renderer surfacing for kept capabilities

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 4A
- Owns:
  - renderer files for capabilities marked kept by 4A
  - locale keys only if 4A explicitly seeded them
- Must not touch:
  - process service classification again
- Implementation contract:
  - surface kept capabilities through the routed M&A area
  - use localized empty, loading, and error states
  - keep accessibility and token compliance from the start
  - make discoverability explicit from M&A entry points rather than hidden deep
    links
- Required tests:
  - route, hook, and component tests for every kept surfaced capability

#### Feed-ready agent prompt

```text
You own Wave 4 / Batch 4B: renderer surfacing for kept capabilities.

Goal:
- make every capability that 4A marked kept discoverable and usable from the
  routed M&A area.

Read first:
- the merged 4A keep/defer/remove table
- seeded contracts and any seeded locale keys

Write only:
- renderer files for kept capabilities

Do not edit:
- process service classification
- bridge contracts unless a failing contract bug is proven and approved

Implementation requirements:
- coherent entry points
- localized empty/loading/error states
- AGENTS-compliant interactions
- no process-only kept features left hidden

Tests required:
- discoverability from routed entry points
- key state coverage for each kept capability

Return with:
- files changed
- kept capabilities surfaced
- commands run
- any remaining intentionally deferred work
```

### Batch 4C - Regression harness and audit close-out

- Lane:
  - `audit-harness`
- Depends on:
  - Batches 4A and 4B
- Owns:
  - `tests/unit/renderer/**`
  - `tests/unit/process/**`
  - `tests/e2e/**` if suitable harness exists already
  - `docs/audit/**`
- Implementation contract:
  - lock the active M&A core behind process and renderer regression coverage
  - make the next starting state obvious for Wave 5
- Required tests:
  - routes, active-deal truth, readiness, upload, DD, and kept capability
    coverage
  - global merge gate

#### Feed-ready agent prompt

```text
You own Wave 4 / Batch 4C: regression harness and close-out.

Goal:
- protect the active M&A core and record exactly what is still parked.

Write only:
- tests
- docs/audit/**

Return with:
- audit note path
- regression areas covered
- commands run
- explicit statement that Waves 1 to 4 are or are not fully closed
```

### Wave 4 close-out

Wave 4 is complete only when:

- active M&A capabilities are either surfaced or explicitly deferred
- the kept active surface has regression protection
- the audit note documents what remains parked

## 7. Parked expansion lane (preserved feature inventory with re-entry gates)

These waves preserve inherited feature scope from the superseded roadmap. They
are not deleted. They are explicitly parked until the active lane is complete
enough to support them safely.

### 7.1 Curated promotion order after the active lane

Use this order to maximize reuse and minimize scope collisions:

1. Wave 5 first, because it establishes the durable data spine.
2. Wave 6 and Wave 9 next, because shell/workbench and AI platform binding can
   advance in parallel once Wave 5 foundations and Waves 1 to 4 close.
3. Wave 7 and Wave 8 after Wave 6, because document generation and CRM
   discoverability depend on the shell and surfaced capabilities.
4. Wave 10 after Waves 5, 6, and 9, because analytics and daily brief need
   data, shell routes, and AI/feed provenance.
5. Wave 11 after the product surface and data spine are stable enough to secure.
6. Wave 12 once launch scope is explicitly frozen.
7. Wave 13 only after launch metrics exist.

### 7.2 Parked-wave batch law

For parked waves, the `A` batch is normally the contract-seed batch. It owns any
shared serialization point the later batches need.

Later parked-wave batches should follow this rule:

- consume the seed batch contract
- stay inside their owned island
- return a contract delta request if the seed is insufficient
- do not reopen router, bridge, migration, or locale ownership casually

## Wave 5 - Data-intelligence foundations

### Purpose

Add durable data-intelligence foundations for French company research and
enrichment.

### Re-entry prerequisites

- Waves 1 through 4 closed by audit note
- clear shell ownership for company and research surfaces
- explicit canonical-source policy for each data field family

### No-loss scope checklist

- durable company entity storage
- contact and watchlist durable storage
- cache tables for fetched intelligence
- SIRENE ingestion
- data.gouv.fr ingestion
- Pappers integration
- provenance-aware company merges
- contact and watchlist maturation
- stale-data and source-disagreement UX preserved for future surfaces

### Async execution plan

- `5A` is the contract-seed batch. It owns schema, migrations, repositories, and
  source canonicality primitives.
- `5B` and `5C` may run in parallel after `5A`.
- `5D` starts after `5A` and may run in parallel with `5B` and `5C` if it does
  not need migration changes.

### Batch 5A - M&A data spine schema and repositories

- Lane:
  - `contract-seed`
- Owns:
  - `src/process/services/database/{schema,migrations}.ts`
  - repositories for companies, contacts, watchlists, and intelligence caches
  - shared persistence types if required
- Must not touch:
  - renderer surfaces
  - source-specific ingestion logic beyond minimal contracts
- Implementation contract:
  - define durable storage for company, contact, watchlist, source cache, and
    provenance-bearing merge results
  - make canonical-source policy explicit at the schema or repository layer
  - seed write APIs that later ingestion batches can use without reopening schema
- Required tests:
  - migration tests
  - repository CRUD tests
  - persistence tests for provenance and freshness metadata

#### Feed-ready agent prompt

```text
You own Wave 5 / Batch 5A: M&A data spine schema and repositories.

Goal:
- create the durable storage and repository contract for company intelligence,
  contacts, watchlists, and source caches.

Write only:
- schema and migrations
- relevant repositories
- narrow shared persistence types if needed

Do not edit:
- renderer surfaces
- source-specific ingestion behavior beyond contract hooks

Required outcomes:
- canonical-source policy is explicit
- provenance and freshness fields are durable
- later ingestion batches can build without reopening schema casually

Tests:
- migration tests
- repository tests
- provenance/freshness persistence tests
```

### Batch 5B - SIRENE and data.gouv.fr ingestion layer

- Lane:
  - `process-domain`
- Depends on:
  - Batch 5A
- Can run with:
  - Batch 5C
  - Batch 5D if no schema change is needed
- Owns:
  - source services, normalization helpers, and cache reconciliation for SIRENE
    and data.gouv.fr
- Must not touch:
  - migrations
  - renderer surfaces
- Implementation contract:
  - fetch, normalize, cache, and merge source payloads into the 5A data spine
  - preserve source-specific evidence and freshness
  - make mismatch and stale semantics explicit
- Required tests:
  - normalization tests
  - service tests for fetch, cache, stale refresh, and merge behavior

#### Feed-ready agent prompt

```text
You own Wave 5 / Batch 5B: SIRENE and data.gouv.fr ingestion.

Goal:
- ingest and normalize French company data into the data spine without hiding
  source evidence.

Write only:
- source services
- normalization helpers
- cache reconciliation code

Do not edit:
- schema or migrations
- renderer files

Tests:
- normalization coverage
- fetch/cache coverage
- merge and stale-data coverage
```

### Batch 5C - Pappers and enrichment convergence

- Lane:
  - `process-domain`
- Depends on:
  - Batch 5A
- Can run with:
  - Batch 5B
  - Batch 5D if no shared repository change is needed
- Owns:
  - Pappers integration and multi-source enrichment convergence
- Must not touch:
  - migrations
  - renderer surfaces
- Implementation contract:
  - define field-level merge rules between Pappers and other sources
  - keep source-specific evidence inspectable
  - make disagreements and precedence transparent
- Required tests:
  - merge-rule tests
  - source disagreement tests

#### Feed-ready agent prompt

```text
You own Wave 5 / Batch 5C: Pappers and enrichment convergence.

Goal:
- add Pappers-backed enrichment and explicit merge rules without obscuring
  provenance.

Write only:
- Pappers integration files
- merge and enrichment helpers

Do not edit:
- schema or migrations
- renderer files

Tests:
- merge precedence
- disagreement handling
- provenance retention
```

### Batch 5D - Contacts and watchlists maturation

- Lane:
  - `renderer-surface` plus `integration-surface`
- Depends on:
  - Batch 5A
  - Wave 4 keep/defer decisions
- Can run with:
  - Batch 5B
  - Batch 5C
- Owns:
  - contact and watchlist process and renderer maturation inside the scope marked
    kept by Wave 4
- Must not touch:
  - migrations after 5A unless reopened intentionally
- Implementation contract:
  - finish CRUD and refresh semantics for contacts and watchlists
  - align scheduled refresh behavior with explicit user-visible state
  - avoid zombie features or hidden partial flows
- Required tests:
  - CRUD tests
  - refresh or scheduled-job tests where retained
  - route or component tests for surfaced flows

#### Feed-ready agent prompt

```text
You own Wave 5 / Batch 5D: contacts and watchlists maturation.

Goal:
- finish the kept contact and watchlist feature set into explicit end-to-end
  workflows.

Write only:
- contact and watchlist owned files

Do not edit:
- migrations unless the wave owner explicitly reopens them

Tests:
- CRUD coverage
- refresh/schedule coverage where applicable
- renderer discoverability coverage
```

## Wave 6 - M&A shell and analytical workbench surfaces

### Purpose

Expand the routed M&A shell into a coherent analytical workspace.

### Re-entry prerequisites

- Waves 1 through 5 closed
- clear discoverability plan for every surface that enters the shell

### No-loss scope checklist

- `MaLayout`
- M&A top bar
- active-deal indicator
- breadcrumbs
- command palette
- M&A home page
- valuation workbench
- company profile aggregator UI
- sector overview or intelligence page
- shell landmarks, skip navigation, and responsive behavior

### Async execution plan

- `6A` is the contract-seed and shell batch. It owns router entry, shared shell
  slots, breadcrumbs, and shell locale namespaces.
- `6B`, `6C`, and `6D` may run in parallel after `6A`.
- `6B` owns command palette and quick-jump behavior.
- `6C` owns valuation workbench.
- `6D` owns company and sector analytical pages.

### Batch 6A - Stable M&A shell

- Lane:
  - `shell-surface`
- Owns:
  - router entry for expanded M&A shell
  - new `MaLayout` or equivalent shell files
  - shell landmarks, breadcrumbs, top bar, active-deal indicator, home route
  - shell locale namespaces
- Must not touch:
  - valuation or research feature logic beyond slot contracts
- Implementation contract:
  - create the stable shell that later surfaces plug into
  - own breadcrumbs, active-deal indicator, top-level route map, and layout
    slots
  - make shell discoverability and responsive degradation explicit
- Required tests:
  - route and shell DOM tests
  - keyboard and landmark tests

#### Feed-ready agent prompt

```text
You own Wave 6 / Batch 6A: stable M&A shell.

Goal:
- turn the routed M&A area into one coherent shell with home, top bar,
  active-deal indicator, breadcrumbs, and extension slots.

Write only:
- router and shell files
- shell locale namespaces

Do not edit:
- valuation internals
- company research internals
- command palette search logic

Tests:
- shell route coverage
- landmark and keyboard coverage
- active-deal indicator behavior
```

### Batch 6B - Command palette

- Lane:
  - `shell-surface`
- Depends on:
  - Batch 6A
- Can run with:
  - Batch 6C
  - Batch 6D
- Owns:
  - command palette UI, lookup indexing, and keyboard interaction under shell
    extension slots seeded by 6A
- Must not touch:
  - router entry
  - shell layout scaffolding
- Implementation contract:
  - quick jump to deals, companies, docs, analyses, glossary, and future reports
  - respect active-deal context where relevant
  - keep keyboard behavior predictable and accessible
- Required tests:
  - keyboard invocation tests
  - search-result and navigation-result tests

#### Feed-ready agent prompt

```text
You own Wave 6 / Batch 6B: command palette.

Goal:
- add a keyboard-first jump surface for the M&A shell seeded by 6A.

Write only:
- command palette files
- shell extension slots owned by 6B

Do not edit:
- router entry
- shell scaffolding from 6A

Tests:
- open/close keyboard flow
- result filtering
- navigation target assertions
```

### Batch 6C - Valuation workbench page

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 6A
- Can run with:
  - Batch 6B
  - Batch 6D
- Owns:
  - valuation route, page, and workbench UI using existing valuation engines
- Must not touch:
  - shell router scaffolding outside seeded slots
  - company research pages
- Implementation contract:
  - expose assumptions, outputs, caveats, and formatting clearly
  - keep computed vs hand-entered values distinguishable
  - preserve room for later report generation without creating separate shadow
    logic
- Required tests:
  - page state tests
  - formatter tests
  - assumptions-to-output rendering tests

#### Feed-ready agent prompt

```text
You own Wave 6 / Batch 6C: valuation workbench.

Goal:
- turn the existing valuation engine into a user-facing analytical workbench.

Write only:
- valuation route and page files

Do not edit:
- shell scaffolding
- company or sector pages

Tests:
- assumptions rendering
- output rendering
- caveat or empty-state coverage
```

### Batch 6D - Company and sector analytical pages

- Lane:
  - `renderer-surface`
- Depends on:
  - Batch 6A
  - Wave 5 data spine
- Can run with:
  - Batch 6B
  - Batch 6C
- Owns:
  - company profile route and page
  - sector overview or intelligence route and page
- Must not touch:
  - shell scaffolding outside seeded slots
  - valuation page logic
- Implementation contract:
  - show canonical fields, source-specific evidence, freshness, and disagreement
  - keep structured scanning easy for large profiles
  - distinguish company profile data from sector intelligence views
- Required tests:
  - route tests
  - source/freshness/disagreement rendering tests

#### Feed-ready agent prompt

```text
You own Wave 6 / Batch 6D: company and sector analytical pages.

Goal:
- surface the Wave 5 data spine through research-friendly company and sector
  pages.

Write only:
- company page files
- sector page files

Do not edit:
- shell scaffolding
- valuation page

Tests:
- route coverage
- provenance/freshness rendering
- disagreement or missing-data coverage
```

## Wave 7 - Document automation and report generation

### Purpose

Turn the document and analysis layers into reusable drafting and export flows.

### Re-entry prerequisites

- Waves 1 through 6 closed
- document pipeline and DD truth stable
- clear template and export architecture

### No-loss scope checklist

- template registry
- report-generator core
- NDA generator
- LOI generator
- DD checklist generator
- teaser generator
- IM generator
- valuation report generator
- provenance-aware review and export states

### Async execution plan

- `7A` is the contract-seed batch. It owns template registry, generator core,
  export architecture, and seeded review-state conventions.
- `7B`, `7C`, and `7D` may run in parallel after `7A`.

### Batch 7A - Template registry and report core

- Lane:
  - `contract-seed`
- Owns:
  - generation core
  - template registry
  - export and review state contracts
- Must not touch:
  - specific document template content beyond seeded contracts
- Implementation contract:
  - one shared generation core, not scattered bespoke pipelines
  - provenance tags for hand-entered, computed, and AI-assisted content
  - explicit review-before-export model
- Required tests:
  - generator-core tests
  - template registry tests

#### Feed-ready agent prompt

```text
You own Wave 7 / Batch 7A: template registry and report core.

Goal:
- create one reusable document-generation backbone for later NDA, LOI, DD,
  teaser, IM, and valuation outputs.

Write only:
- generation core files
- template registry files
- review/export contract files

Tests:
- generator-core coverage
- registry lookup coverage
- provenance labeling coverage
```

### Batch 7B - Early legal or checklist outputs

- Lane:
  - `renderer-surface` plus `process-domain`
- Depends on:
  - Batch 7A
- Can run with:
  - Batch 7C
  - Batch 7D
- Owns:
  - NDA, LOI, and DD checklist generation built on 7A
- Implementation contract:
  - explicit inputs
  - provenance-aware output sections
  - reviewable drafts before export
- Required tests:
  - template rendering tests
  - required-input validation tests

#### Feed-ready agent prompt

```text
You own Wave 7 / Batch 7B: NDA, LOI, and DD checklist generation.

Goal:
- build early legal and checklist outputs on the shared generation core from 7A.

Tests:
- template rendering
- input validation
- provenance visibility
```

### Batch 7C - Marketing or deal-pack outputs

- Lane:
  - `renderer-surface` plus `process-domain`
- Depends on:
  - Batch 7A
- Can run with:
  - Batch 7B
  - Batch 7D
- Owns:
  - teaser and IM generation
- Implementation contract:
  - structure must be consistent, inspectable, and reviewable
  - output should distinguish computed and narrative sections
- Required tests:
  - rendering tests
  - structure-consistency tests

#### Feed-ready agent prompt

```text
You own Wave 7 / Batch 7C: teaser and IM generation.

Goal:
- create marketing and deal-pack outputs on the 7A generation core with
  reviewable structure and provenance.

Tests:
- rendering coverage
- structure consistency coverage
```

### Batch 7D - Valuation report output

- Lane:
  - `renderer-surface` plus `process-domain`
- Depends on:
  - Batch 7A
  - Wave 6C valuation workbench
- Can run with:
  - Batch 7B
  - Batch 7C
- Owns:
  - valuation report generation
- Implementation contract:
  - report must reference underlying valuation assumptions and results faithfully
  - caveats and assumption ranges must stay visible
- Required tests:
  - report-content tests
  - assumption-linkage tests

#### Feed-ready agent prompt

```text
You own Wave 7 / Batch 7D: valuation report generation.

Goal:
- generate valuation reports that faithfully reflect the valuation workbench
  assumptions, outputs, and caveats.

Tests:
- report content coverage
- assumption linkage coverage
- missing-assumption error coverage
```

## Wave 8 - CRM, pipeline, and communications

### Purpose

Evolve M&A collaboration around deals, contacts, and outbound communications.

### Re-entry prerequisites

- Waves 1 through 6 closed
- contacts and watchlists clearly surfaced
- shell navigation stable

### No-loss scope checklist

- contacts experience
- stage-aware deal pipeline
- email integration
- Pipedrive integration
- WhatsApp or approved messaging integration
- readiness and compliance-aware send/sync semantics

### Async execution plan

- `8A` is the contract-seed batch for contacts and pipeline UX.
- `8B` and `8C` may run in parallel after `8A` if they stay inside their
  integration islands.

### Batch 8A - Contacts and pipeline UI

- Lane:
  - `shell-surface` plus `renderer-surface`
- Owns:
  - contact surfaces
  - stage-aware pipeline or Kanban flows
  - pipeline state semantics for later integrations
- Must not touch:
  - external integration bridges outside seeded hooks
- Required tests:
  - route tests
  - interaction tests
  - stage-transition tests

#### Feed-ready agent prompt

```text
You own Wave 8 / Batch 8A: contacts and pipeline UI.

Goal:
- create coherent contact and deal-pipeline surfaces that later integrations can
  attach to without rewriting the core UX.

Tests:
- route coverage
- stage transition coverage
- keyboard and accessibility coverage for pipeline interactions
```

### Batch 8B - Email and CRM integrations

- Lane:
  - `integration-surface`
- Depends on:
  - Batch 8A
- Can run with:
  - Batch 8C
- Owns:
  - email flows
  - Pipedrive bridge or integration
- Required tests:
  - service tests
  - bridge tests
  - readiness and error-path tests

#### Feed-ready agent prompt

```text
You own Wave 8 / Batch 8B: email and CRM integrations.

Goal:
- add email and CRM sync flows with clear readiness, failure, and retry
  semantics.

Tests:
- service coverage
- bridge coverage
- readiness and failure-state coverage
```

### Batch 8C - Messaging integration

- Lane:
  - `integration-surface`
- Depends on:
  - Batch 8A
- Can run with:
  - Batch 8B
- Owns:
  - WhatsApp or other approved messaging integration
- Required tests:
  - service and error-path tests
  - compliance gating tests if message sending has policy restrictions

#### Feed-ready agent prompt

```text
You own Wave 8 / Batch 8C: messaging integration.

Goal:
- add the approved messaging surface behind explicit readiness, policy, and
  failure semantics.

Tests:
- service coverage
- failure coverage
- policy/readiness coverage
```

## Wave 9 - AI platform binding, RAG, and ops hardening

### Purpose

Finish the deeper AI platform work that sits beyond current DD runtime truth.

### Re-entry prerequisites

- Waves 1 through 6 closed
- DD catalog, readiness, and provenance stable
- decision on which AI-driven features enter the next product scope

### No-loss scope checklist

- Flowise runtime config and health surface
- Flowise production bootstrap alignment
- knowledge-base or RAG ingestion
- feature-to-chatflow catalog
- prompt versioning
- observability and span export
- `web.*` tool family if retained
- `news.*` tool family if retained
- secret hygiene and production config hardening

### Async execution plan

- `9A` is the contract-seed batch for runtime config and readiness surfaces.
- `9B` and `9C` may run in parallel after `9A`.
- `9D` runs last because it cross-cuts observability, tools, and secrets.

### Batch 9A - Runtime config and health surface

- Lane:
  - `contract-seed`
- Owns:
  - settings and runtime visibility for Flowise endpoint, auth, and readiness
  - config precedence documentation in code
- Required tests:
  - settings tests
  - readiness tests
  - config precedence tests

#### Feed-ready agent prompt

```text
You own Wave 9 / Batch 9A: runtime config and health surface.

Goal:
- make Flowise production binding visible, configurable, and testable instead
  of hidden in source assumptions.

Tests:
- settings coverage
- readiness coverage
- config precedence coverage
```

### Batch 9B - Knowledge-base and ingestion plane

- Lane:
  - `ai-runtime`
- Depends on:
  - Batch 9A
- Can run with:
  - Batch 9C
- Owns:
  - KB ingestion, retrieval, provenance, and source controls
- Required tests:
  - ingestion tests
  - retrieval tests
  - provenance and freshness tests

#### Feed-ready agent prompt

```text
You own Wave 9 / Batch 9B: knowledge-base and ingestion plane.

Goal:
- build a provenance-aware ingestion and retrieval layer for knowledge-backed AI
  features.

Tests:
- ingestion coverage
- retrieval coverage
- provenance/freshness coverage
```

### Batch 9C - Feature-to-flow registry and prompt versioning

- Lane:
  - `ai-runtime`
- Depends on:
  - Batch 9A
- Can run with:
  - Batch 9B
- Owns:
  - catalog-backed mapping for AI features beyond DD
  - prompt-version capture and persistence
- Required tests:
  - registry tests
  - provenance tests

#### Feed-ready agent prompt

```text
You own Wave 9 / Batch 9C: feature-to-flow registry and prompt versioning.

Goal:
- ensure every AI feature knows exactly which flow family and prompt version it
  is using.

Tests:
- registry coverage
- prompt-version coverage
- provenance persistence coverage
```

### Batch 9D - Observability, tools, and secret hygiene

- Lane:
  - `ai-runtime` plus `integration-surface`
- Depends on:
  - Batches 9A through 9C
- Owns:
  - observability integration
  - retained `web.*` and `news.*` tool families
  - production-ready secret access plan
- Required tests:
  - error-path tests
  - config tests
  - observability surface tests

#### Feed-ready agent prompt

```text
You own Wave 9 / Batch 9D: observability, retained tools, and secret hygiene.

Goal:
- make AI failures debuggable and secrets/config handling explicit and
  production-safe.

Tests:
- error-path coverage
- config coverage
- observability surface coverage
```

## Wave 10 - Analytics, comparables, daily brief, and reporting

### Purpose

Add market-intelligence and analytics surfaces once the shell, data, and AI
planes are ready.

### Re-entry prerequisites

- Waves 5, 6, and 9 sufficiently advanced
- clear dashboard information architecture
- source and freshness rules for comparables and feeds

### No-loss scope checklist

- dashboard and widgets
- comparables DB
- market-intelligence feeds
- daily brief
- custom reporting engine
- source-aware scanability and per-widget resilience

### Async execution plan

- `10A` is the contract-seed batch for the dashboard shell, widget contract, and
  routed analytics entry.
- `10B` and `10C` may run in parallel after `10A`.

### Batch 10A - Dashboard shell

- Lane:
  - `shell-surface`
- Owns:
  - dashboard route
  - widget container contract
  - analytics shell locale and layout slots
- Required tests:
  - route tests
  - widget loading, empty, and error tests

#### Feed-ready agent prompt

```text
You own Wave 10 / Batch 10A: dashboard shell.

Goal:
- create the routed dashboard shell and widget contract for later analytics
  batches.

Tests:
- dashboard route coverage
- widget state coverage
```

### Batch 10B - Comparables and feeds

- Lane:
  - `renderer-surface` plus `process-domain`
- Depends on:
  - Batch 10A
- Can run with:
  - Batch 10C
- Owns:
  - comparables surface
  - market or news feed ingestion and display
- Required tests:
  - table and feed tests
  - freshness and provenance tests

#### Feed-ready agent prompt

```text
You own Wave 10 / Batch 10B: comparables and feeds.

Goal:
- surface comparables and market feeds with visible provenance and freshness.

Tests:
- comparables table coverage
- feed item coverage
- freshness/provenance coverage
```

### Batch 10C - Daily brief and reporting

- Lane:
  - `renderer-surface` plus `process-domain`
- Depends on:
  - Batch 10A
- Can run with:
  - Batch 10B
- Owns:
  - daily brief page
  - custom reporting engine
- Required tests:
  - brief rendering tests
  - report generation or rendering tests

#### Feed-ready agent prompt

```text
You own Wave 10 / Batch 10C: daily brief and reporting.

Goal:
- produce navigable, traceable daily brief and reporting surfaces that do not
  bury provenance.

Tests:
- brief coverage
- report coverage
- navigation or drill-down coverage
```

## Wave 11 - Enterprise and compliance

### Purpose

Introduce organization-grade controls, auditability, encryption, and regulated
workflows after the product core is stable.

### Re-entry prerequisites

- core product routes and state are stable
- data spine exists
- threat model and retention expectations are documented

### No-loss scope checklist

- RBAC
- audit log
- encryption
- OS keychain integration
- GDPR tools
- VDR
- blast-radius clarity for destructive compliance actions

### Async execution plan

- `11A` runs first and seeds permission and audit semantics.
- `11B` follows and owns encryption and secret storage.
- `11C` follows after `11A` and `11B` stabilize.

### Batch 11A - RBAC and audit log

- Lane:
  - `contract-seed`
- Owns:
  - user roles
  - audit persistence
  - audit viewer contracts
- Required tests:
  - permission tests
  - audit log tests

#### Feed-ready agent prompt

```text
You own Wave 11 / Batch 11A: RBAC and audit log.

Goal:
- make core actions attributable and permissioned before deeper compliance work
  lands.

Tests:
- permission coverage
- audit persistence coverage
- audit viewer coverage
```

### Batch 11B - Encryption and secret storage

- Lane:
  - `process-domain`
- Depends on:
  - Batch 11A
- Owns:
  - at-rest protections
  - managed local secret storage
- Required tests:
  - encryption tests
  - migration tests
  - key storage tests

#### Feed-ready agent prompt

```text
You own Wave 11 / Batch 11B: encryption and secret storage.

Goal:
- make sensitive data handling explicit, encrypted, and operationally supported.

Tests:
- encryption coverage
- migration coverage
- secret storage coverage
```

### Batch 11C - GDPR and VDR

- Lane:
  - `renderer-surface` plus `process-domain`
- Depends on:
  - Batches 11A and 11B
- Owns:
  - erasure, export, retention, and data-room workflows
- Required tests:
  - compliance workflow tests
  - destructive action safety tests

#### Feed-ready agent prompt

```text
You own Wave 11 / Batch 11C: GDPR and VDR workflows.

Goal:
- add explicit, reviewable regulated workflows for export, erasure, retention,
  and data-room handling.

Tests:
- compliance workflow coverage
- destructive-action safety coverage
```

## Wave 12 - Release program and launch hardening

### Purpose

Convert the matured product into a releasable program.

### Re-entry prerequisites

- product scope for launch agreed
- critical active and selected parked waves completed
- release owner identified

### No-loss scope checklist

- performance budgets
- docs and extension SDK work
- polish sweep
- onboarding flow completion
- feedback widget
- security pen test
- load testing
- platform signing
- auto-update
- beta program
- production release evidence

### Async execution plan

- `12A` and `12B` may run in parallel once launch scope is frozen.
- `12C` starts after shell and core product flows are stable enough for final
  polish.
- `12D` runs last because it packages security, distribution, and release proof.

### Batch 12A - Performance and memory budget work

- Lane:
  - `audit-harness` plus `process-domain`
- Required tests or evidence:
  - benchmark or profiling evidence

#### Feed-ready agent prompt

```text
You own Wave 12 / Batch 12A: performance and memory budgets.

Goal:
- define and meet measured performance and memory budgets for the launch scope.

Evidence:
- benchmarks or profiling results
- fixes tied to measured hotspots
```

### Batch 12B - Documentation and extension surface

- Lane:
  - `audit-harness`
- Required tests or evidence:
  - doc build or verification as appropriate

#### Feed-ready agent prompt

```text
You own Wave 12 / Batch 12B: documentation and extension surface.

Goal:
- provide the technical and user documentation needed for the frozen launch
  scope, plus extension documentation if still in scope.

Evidence:
- doc verification or build results
```

### Batch 12C - Polish, onboarding, and feedback

- Lane:
  - `renderer-surface`
- Required tests or evidence:
  - end-to-end and accessibility evidence

#### Feed-ready agent prompt

```text
You own Wave 12 / Batch 12C: polish, onboarding, and feedback.

Goal:
- finish first-run onboarding, supportive feedback capture, and the final polish
  sweep without masking structural issues.

Evidence:
- end-to-end coverage
- accessibility verification
- screenshots of first-run and feedback flows
```

### Batch 12D - Security, release, and distribution

- Lane:
  - `audit-harness` plus `integration-surface`
- Required tests or evidence:
  - release checklist evidence
  - pen-test follow-up evidence

#### Feed-ready agent prompt

```text
You own Wave 12 / Batch 12D: security, release, and distribution.

Goal:
- complete signing, updater, beta, and release evidence with security follow-up
  closed or explicitly accepted.

Evidence:
- release checklist
- signing/updater proof
- pen-test follow-up proof
```

## Wave 13 - Post-launch platform enrichment

### Purpose

Evaluate infrastructure accelerators and platform attachments after baseline
launch is stable.

### Re-entry prerequisites

- launch baseline stable
- rollback plan for each accelerator
- cost, performance, and operational benefit understood

### No-loss scope checklist

- MetaMCP federation
- Browserless backend
- RSSHub backend
- Infisical secret spine
- Langfuse observability
- reversibility and measurement for every accelerator

### Async execution plan

- `13A` and `13B` may run in parallel if they do not reopen the same config
  layer.
- `13C` follows once retained secret and observability choices are clear.

### Batch 13A - Tool federation and MetaMCP

- Lane:
  - `integration-surface`
- Required tests or evidence:
  - compatibility or generator tests
  - toggle and rollback proof

#### Feed-ready agent prompt

```text
You own Wave 13 / Batch 13A: tool federation and MetaMCP.

Goal:
- add federation only if it is measurable, toggleable, and auditable.

Evidence:
- compatibility coverage
- toggle and rollback proof
```

### Batch 13B - Alternative web and news backends

- Lane:
  - `integration-surface`
- Required tests or evidence:
  - backend contract tests
  - fallback proof

#### Feed-ready agent prompt

```text
You own Wave 13 / Batch 13B: alternative web and news backends.

Goal:
- add alternative web/news backends without losing a safe fallback path.

Evidence:
- backend contract coverage
- fallback and disable proof
```

### Batch 13C - Secret spine and LLM observability

- Lane:
  - `ai-runtime`
- Required tests or evidence:
  - config and trace-surface tests
  - reversibility proof

#### Feed-ready agent prompt

```text
You own Wave 13 / Batch 13C: secret spine and LLM observability.

Goal:
- add post-launch secret and tracing accelerators only if they remain reversible
  and operationally measurable.

Evidence:
- config coverage
- trace-surface coverage
- rollback proof
```

## 8. Cross-cutting gates, testing matrix, and success metrics

### 8.1 Global command gate

Unless a wave explicitly narrows the requirement, batches touching code should
finish with:

- `bun run lint`
- `bun run format:check`
- `bunx tsc --noEmit`
- `bun run test`
- `bun run i18n:types` when renderer or locale files changed
- `node scripts/check-i18n.js` when renderer or locale files changed

### 8.2 Testing matrix by artifact type

| Artifact type                                   | Minimum test expectation                                             |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| Domain logic in `src/common/ma/**`              | Unit tests                                                           |
| Process service in `src/process/services/ma/**` | Unit tests and failure-path coverage                                 |
| Worker orchestration                            | Unit or integration-style tests around lifecycle and error paths     |
| Shared IPC contract change                      | Bridge/provider tests                                                |
| Hook owning stateful contract behavior          | Hook tests                                                           |
| Routed page                                     | Route smoke and key-state DOM tests                                  |
| Renderer component with important state         | DOM tests for loading, empty, error, and happy states                |
| Accessibility-sensitive async UI                | DOM assertions for accessible names, focus, and `aria-live` behavior |
| Locale or formatter changes                     | Formatter tests, i18n type generation, i18n validation               |
| New reusable visual primitive                   | Story, DOM matrix, or explicit visual baseline plan                  |

### 8.3 Design regression gate

Any PR touching M&A renderer code should explicitly confirm:

- no raw interactive HTML added
- no emoji used as functional icons
- no hardcoded semantic colors added
- no hardcoded copy outside locale files added
- no `transition: all` added
- reduced-motion behavior considered where motion changed

### 8.4 Wave metrics

| Wave | Success bar                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------- |
| 0    | Enriched roadmap accepted and used as execution reference                                         |
| 1    | `/ma/*` reachable, readiness bridged, active deal durable, DD flow catalog-backed                 |
| 2    | Upload truth real, DD truth honest, localized upload and DD lifecycle states                      |
| 3    | Routed M&A UI compliant with AGENTS, i18n, accessibility, and formatter expectations              |
| 4    | Hidden capabilities explicitly surfaced or deferred, active surface protected by regression tests |
| 5    | Company and data-intelligence spine explicit, source merge rules tested                           |
| 6    | Stable M&A shell and analytical workbench routes                                                  |
| 7    | Template or report generation architecture proven                                                 |
| 8    | CRM and communication flows integrated with readiness and error semantics                         |
| 9    | Broader AI platform binding, provenance, and ops hardening stabilized                             |
| 10   | Analytics and daily-brief surfaces trustworthy and source-aware                                   |
| 11   | Enterprise and compliance flows explicit and testable                                             |
| 12   | Release baseline documented, tested, and operationally ready                                      |
| 13   | Optional accelerators measurable, reversible, and documented                                      |

### 8.5 Auditor checklist template

Use this checklist at the end of every batch and wave:

- Is the feature reachable from the router or intentionally hidden with a reason?
- Does renderer behavior match a real bridge or service path?
- Did we remove placeholders instead of polishing them?
- Are all user-facing strings localized?
- Are locale-aware formatters used for visible dates, numbers, and money?
- Did we avoid raw interactive HTML, emoji icons, and hardcoded semantic colors?
- Did we add tests that would fail if this exact regression returned?
- Did we record intentional deferrals and residual risk in `docs/audit/`?

## 9. Risk register

- The current tree already contains meaningful M&A surface area, but not enough
  route and renderer protection yet. Regressions are likely if Waves 1 to 4 are
  skipped or compressed.
- Flowise production intent is larger than current DD truth. Expanding AI
  surface before provenance and readiness close will multiply debt.
- Company enrichment, contacts, watchlists, and integrations can become zombie
  scope unless Wave 4 explicitly decides their fate.
- The design-system and accessibility debt is not cosmetic. If ignored, it will
  increase rework across every later renderer wave.
- Parked waves contain legitimate product scope. If later teams treat them as
  deleted rather than parked, product memory will be lost again.

## 10. Mapping from superseded roadmap to this roadmap

| Superseded intent                                | New home                |
| ------------------------------------------------ | ----------------------- |
| Reality snapshot and shipped-vs-open audit       | Sections 1 and 9        |
| Scaling model and pass discipline                | Section 2               |
| Design-system contract                           | Section 4               |
| UX flows                                         | Section 5               |
| Immediate M&A launch blockers                    | Section 6, Waves 1 to 4 |
| Data intelligence and company enrichment roadmap | Section 7, Wave 5       |
| M&A shell, valuation, company, sector pages      | Section 7, Wave 6       |
| Document automation and report generation        | Section 7, Wave 7       |
| CRM and communications                           | Section 7, Wave 8       |
| Flowise production binding, RAG, tools, secrets  | Section 7, Wave 9       |
| Analytics, comparables, daily brief              | Section 7, Wave 10      |
| Enterprise and compliance                        | Section 7, Wave 11      |
| Production launch program                        | Section 7, Wave 12      |
| Post-launch platform enrichment                  | Section 7, Wave 13      |

## 11. Definition of done for retiring this roadmap

This roadmap can be retired only when:

- Waves 1 through 4 are closed by audit notes
- the active M&A core is reachable, durable, localized, and accessibility-compliant
- upload and DD placeholder behavior are gone
- major process-side M&A capabilities are either surfaced or intentionally
  deferred with documentation
- the active surface has regression protection
- any future scope that remains is tracked in a successor roadmap with the same
  auditor discipline
