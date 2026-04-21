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

## Wave 0 - Roadmap reset and audit scaffolding

### Goal

Establish an enriched, auditable plan that preserves former feature intent while
keeping the active lane grounded in current code.

### Status

Completed by this rewrite.

### Deliverables

- archive of the superseded plan
- enriched active roadmap
- retained later-wave feature memory
- auditor model, architecture contract, UX contract, and wave evidence model

### Auditor note expectation

Wave 0 can be closed once this file is accepted and future work references it.

## Wave 1 - Reachability, bridge truth, and durable active context

### Objective

Make the existing M&A product reachable, structurally honest, and durable before
deeper UX or feature expansion begins.

### Why this is active now

- pages exist but are stranded
- hooks express contracts the process bridge does not fully satisfy
- active deal is still stored as global process state
- DD runtime selection should stop relying on raw flow identifiers

### Batch 1A - Route and shell entry wiring

- Owner scope:
  - `src/renderer/components/layout/Router.tsx`
  - `src/renderer/pages/ma/**`
  - any new M&A entry or layout files created under `src/renderer/pages/ma/`
- Must not touch:
  - `src/common/adapter/ipcBridge.ts`
  - `src/process/bridge/maBridge.ts`
- Can run with:
  - Batch 1B
- Objective:
  - Register `/ma/*` routes for the already shipped M&A pages
  - Add a minimal but compliant M&A entry layout if necessary
  - Provide a stable default route for the M&A area
- Architecture requirements:
  - No fake shell state that will need to be thrown away in Wave 3
  - Keep router changes minimal and explicit
  - If a new layout file is introduced, make it a stable shell entry rather
    than a temporary wrapper
- UI/UX requirements:
  - Provide at least a meaningful empty or landing state
  - Respect landmark structure and page-title semantics
  - Do not introduce raw interactive HTML
- Deliverables:
  - route registration
  - M&A default entry
  - page access for Deal Context and Due Diligence
- Success criteria:
  - a user can navigate to routed M&A pages
  - stranded pages are no longer stranded
  - routing does not depend on temporary hacks
- Required tests:
  - route smoke tests for `/ma/*`
  - renderer test showing M&A default route resolves
- Auditor close-out:
  - verify route registration in code
  - verify page files are reachable through router
  - verify no temporary shell comments like "remove later" are carrying core
    navigation behavior

### Batch 1B - Shared IPC truth pass

- Owner scope:
  - `src/common/adapter/ipcBridge.ts`
  - `src/process/bridge/maBridge.ts`
  - `src/renderer/hooks/ma/useFlowiseReadiness.ts`
  - `src/renderer/hooks/ma/useDealContext.ts`
- Must not touch:
  - `src/renderer/components/layout/Router.tsx`
- Can run with:
  - Batch 1A
- Objective:
  - Register a process-side Flowise readiness provider
  - Expose clear-active-deal end to end
  - Remove contract drift between shared bridge definition, process providers,
    and renderer consumers
- Architecture requirements:
  - Every shared method added or changed must have a matching provider
  - Hooks should consume only real registered channels
  - Contract names should remain M&A-specific and not leak unrelated app semantics
- UI/UX requirements:
  - readiness state should be usable by the renderer without guesswork
  - clear-active behavior should support later shell UX without needing another
    contract rewrite
- Deliverables:
  - readiness provider
  - clear-active bridge method
  - contract alignment across shared, process, and renderer layers
- Success criteria:
  - `useFlowiseReadiness` no longer points at a dead contract
  - active deal clearing is explicitly bridged
  - no M&A hook references a missing bridge provider
- Required tests:
  - bridge tests for readiness and clear-active
  - hook tests for readiness and active-deal clearing behavior
- Auditor close-out:
  - compare shared bridge methods against process registrations
  - verify hook tests would fail if the provider disappeared

### Batch 1C - Durable active deal persistence

- Owner scope:
  - `src/process/services/ma/DealContextService.ts`
  - repositories or migrations only if needed for durable state
  - `src/common/ma/types.ts` only if state shape changes require it
- Depends on:
  - Batch 1B if the bridge contract changes
- Can run with:
  - none
- Objective:
  - Replace global active-deal storage with a durable mechanism
- Architecture requirements:
  - No `global` or process-memory-only persistence for core user context
  - Durable state must have a clear storage owner
  - Any migration or repository change must be explicit and tested
- UI/UX requirements:
  - Active deal should survive the app lifecycle in the way the product intends
  - Clear-active behavior should leave the UI in a coherent no-active-deal state
- Deliverables:
  - durable active-deal storage
  - service updates
  - bridge alignment if needed
- Success criteria:
  - `(global as any).__maActiveDealId` is gone
  - active deal survives where the product intends it to survive
  - clear-active behavior remains consistent after restart or service reload
- Required tests:
  - persistence tests for active deal
  - service tests for clear-active and restore-active flows
- Auditor close-out:
  - search owned scope for `__maActiveDealId`
  - verify tests cover restore and clear semantics

### Batch 1D - DD flow catalog runtime adoption

- Owner scope:
  - `src/process/services/ma/DueDiligenceService.ts`
  - `src/common/ma/flowise/**`
  - `src/common/ma/types.ts`
- Depends on:
  - Batch 1B if request contracts change
- Can run with:
  - none
- Objective:
  - Replace raw free-form runtime flow selection with catalog-backed flow keys
  - Capture enough provenance to know which flow and prompt version drove a DD run
- Architecture requirements:
  - Catalog must become runtime truth, not just doc or test truth
  - Invalid flow keys must fail clearly
  - Provenance shape must be persistable and inspectable
- UI/UX requirements:
  - Errors for invalid or unavailable flow choices should be explainable upstream
- Deliverables:
  - flow-key based runtime selection
  - provenance capture for DD runs
- Success criteria:
  - DD no longer trusts arbitrary free-form flow IDs for normal execution
  - flow selection failures are validated and test-covered
  - DD persistence carries flow or prompt provenance fields as intended
- Required tests:
  - DD tests for invalid flow key rejection
  - DD tests proving catalog metadata attaches to execution
- Auditor close-out:
  - search for free-form `flowId` usage in runtime DD execution
  - verify provenance is asserted by tests rather than comments

### Wave 1 close-out

Wave 1 is complete only when:

- `/ma/*` is reachable
- Flowise readiness is a real bridged provider
- active deal is durable and clearable
- DD flow selection is catalog-backed
- `docs/audit/` contains the wave note

## Wave 2 - Real document pipeline and honest DD handoff

### Objective

Replace upload and DD placeholder behavior with real renderer-to-process truth.

### Why this is active now

- upload flow still simulates progress
- upload provenance is weak
- DD renderer states do not fully represent backend truth

### Batch 2A - Process-side ingestion and progress contract

- Owner scope:
  - `src/process/bridge/maBridge.ts`
  - `src/process/services/ma/DocumentProcessor.ts`
  - `src/process/worker/ma/**`
  - document-related repositories if required
  - `src/common/adapter/ipcBridge.ts` only if event contracts change
- Can run with:
  - none
- Objective:
  - Define the real upload, process, progress, and failure contract
  - Persist truthful provenance or canonical source metadata
- Architecture requirements:
  - Progress must originate from process execution, not renderer timers
  - Success, partial failure, and failure states should be explicit
  - Provenance semantics must be documented in persistence and bridge code
- UI/UX requirements:
  - Contract should support future localized progress and error surfaces without
    another backend rewrite
- Deliverables:
  - bridge progress contract
  - source metadata persistence or canonical replacement
  - process-state transition coverage
- Success criteria:
  - process emits trustworthy progress and error states
  - document records no longer depend on `file.name` as fake provenance
  - renderer can subscribe to actual processing truth
- Required tests:
  - extend `tests/unit/process/services/ma/DocumentProcessor.test.ts`
  - bridge tests for progress, success, and failure events
  - repository tests for provenance persistence if fields change
- Auditor close-out:
  - search owned scope for fake timer-based progress
  - verify success, progress, and failure states are all represented

### Batch 2B - Renderer upload lifecycle rewrite

- Owner scope:
  - `src/renderer/components/ma/DocumentUpload/**`
  - `src/renderer/hooks/ma/useDocuments.ts`
  - `src/renderer/services/i18n/locales/*/ma.json`
- Depends on:
  - Batch 2A
- Can run with:
  - Batch 2C
- Objective:
  - Remove fake progress and weak provenance assumptions from upload UX
  - Fully localize validation, progress, empty, and error copy
- Architecture requirements:
  - Renderer must consume process contract rather than fabricate state
  - Hook should not insert fake source metadata into persisted records
- UI/UX requirements:
  - no emoji
  - keyboard-friendly upload affordance
  - clear empty, validation, loading, and failure states
- Deliverables:
  - rewritten upload state handling
  - localized copy
  - progress/error rendering bound to real process events
- Success criteria:
  - no `setTimeout`-driven fake upload progress remains
  - no document is created with `originalPath: file.name` as the sole source
  - upload state and backend state reconcile correctly
- Required tests:
  - component tests for validation and progress rendering
  - hook tests for lifecycle transitions
  - i18n type generation and locale validation
- Auditor close-out:
  - search owned scope for `setTimeout`
  - search owned scope for `originalPath: file.name`
  - search owned scope for hardcoded upload copy

### Batch 2C - Due diligence runtime UX hardening

- Owner scope:
  - `src/renderer/pages/ma/DueDiligence/**`
  - `src/renderer/hooks/ma/useDueDiligence.ts`
- Depends on:
  - Batch 2A
  - readiness support from Wave 1
- Can run with:
  - Batch 2B
- Objective:
  - Make DD loading, readiness, missing-document, and failure behavior honest
- Architecture requirements:
  - DD hook should honor readiness and document-state prerequisites
  - Renderer should not imply analysis is available before backend truth says so
- UI/UX requirements:
  - readiness-off state
  - no-documents state
  - processing state
  - failure state
  - success state
  - `aria-live` for progress or streaming output where appropriate
- Deliverables:
  - truthful DD page and hook behavior
  - localized user-facing states
- Success criteria:
  - DD does not proceed silently against missing prerequisites
  - user can distinguish readiness errors from data or analysis errors
  - renderer state maps to backend truth
- Required tests:
  - page tests for readiness-off, no-docs, loading, error, and success states
  - hook tests for lifecycle transitions
- Auditor close-out:
  - verify at least one unhappy path is covered
  - verify readiness and document prerequisites are visible to the user

### Batch 2D - Wave integration close-out

- Owner scope:
  - tests and audit docs only
- Depends on:
  - Batches 2A through 2C
- Can run with:
  - none
- Objective:
  - close the loop with route-to-upload-to-DD regression evidence
- Deliverables:
  - wave audit note
  - focused regression test additions
- Success criteria:
  - wave note explains remaining DD or upload risks if any
- Required tests:
  - route-to-hook or route-to-component regression coverage for the new upload
    and DD lifecycle

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

### Why this is active now

- current routed surfaces would be poor launch candidates even once reachable
- hardcoded copy, raw buttons, emoji, token drift, and formatting drift remain

### Batch 3A - Shared compliance foundations

- Owner scope:
  - `src/renderer/services/i18n/locales/*/ma.json`
  - any new shared formatter files
  - any new shared M&A status or empty-state helpers
- Can run with:
  - none
- Objective:
  - Create shared locale-aware formatters and move common M&A labels out of
    component-local maps
- Architecture requirements:
  - formatting helpers should be shared, testable, and renderer-safe
  - locale additions must be typed and validated
- UI/UX requirements:
  - formatters should cover dates, numbers, money, and identifiers needed now
  - shared labels should reduce repeated hardcoded strings across pages
- Deliverables:
  - shared format helpers
  - shared label or state helpers as needed
  - locale updates for already shipped screens
- Success criteria:
  - M&A UI no longer relies directly on browser-default date or number helpers
    where shared formatting is expected
  - shipped M&A screen copy is representable through locale files
- Required tests:
  - formatter unit tests
  - i18n type generation
  - i18n validation script
- Auditor close-out:
  - search M&A renderer scope for direct `toLocaleDateString()` and
    `toLocaleString()` usage that should have been replaced

### Batch 3B - Deal workspace compliance sweep

- Owner scope:
  - `src/renderer/components/ma/DealSelector/**`
  - `src/renderer/components/ma/DealForm/**`
  - `src/renderer/pages/ma/DealContext/**`
- Depends on:
  - Batch 3A
- Can run with:
  - Batch 3C
- Objective:
  - Fix AGENTS and design-system violations on the deal workspace surfaces
- Architecture requirements:
  - keep page logic readable and avoid another round of one-off helpers
- UI/UX requirements:
  - replace raw interactive HTML with Arco
  - remove emoji
  - localize all user copy
  - replace hardcoded semantic colors with tokens
  - remove `transition: all`
  - ensure actions have accessible names
- Deliverables:
  - compliant DealSelector
  - compliant DealForm
  - compliant DealContext page
- Success criteria:
  - no raw `<button>` remains in owned scope
  - no emoji remains in owned scope
  - no hardcoded user-facing copy remains in owned scope
  - no hardcoded semantic hex colors remain in owned scope
  - all critical actions are keyboard and screen-reader discoverable
- Required tests:
  - DOM tests for localized labels and accessible actions
  - DOM tests for tab or section behavior where present
- Auditor close-out:
  - search owned scope for `<button`
  - search owned scope for emoji literals
  - search owned scope for `transition: all`
  - search owned scope for hardcoded semantic hex colors

### Batch 3C - Upload and DD compliance sweep

- Owner scope:
  - `src/renderer/components/ma/DocumentUpload/**`
  - `src/renderer/components/ma/RiskScoreCard/**`
  - `src/renderer/pages/ma/DueDiligence/**`
- Depends on:
  - Batch 3A
- Can run with:
  - Batch 3B
- Objective:
  - Bring upload, risk, and DD surfaces into design-system and accessibility
    compliance
- Architecture requirements:
  - consolidate shared labels or formatter use instead of repeating maps
- UI/UX requirements:
  - replace emoji category or empty-state glyphs
  - localize category labels, severity labels, and helper copy
  - use semantic tokens for risk display
  - expose progress through accessible announcements where needed
  - remove `transition: all`
- Deliverables:
  - compliant DocumentUpload
  - compliant RiskScoreCard
  - compliant DueDiligence page
- Success criteria:
  - no hardcoded semantic text or color tokens remain in owned scope
  - progress and results are accessible
  - empty states follow shared or at least consistent M&A patterns
- Required tests:
  - DOM tests for risk-card empty, populated, and localized states
  - accessibility-focused DD tests for progress announcements
- Auditor close-out:
  - search owned scope for emoji
  - search owned scope for hardcoded category or severity labels
  - search owned scope for hardcoded semantic colors

### Batch 3D - Wave integration close-out

- Owner scope:
  - tests and audit docs only
- Depends on:
  - Batches 3A through 3C
- Objective:
  - prove the routed M&A surface now satisfies minimum AGENTS and UX rules
- Deliverables:
  - wave audit note
  - compliance evidence summary
- Required tests:
  - route and component tests touching the upgraded screens
  - global merge gate

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

### Why this is active now

- process-side services exist that the product surface does not clearly expose
- without a decision wave, the repo will keep accumulating half-exposed features
- route and hook progress from Waves 1 to 3 needs stronger regression coverage

### Batch 4A - Capability disposition and contract pass

- Owner scope:
  - `src/process/services/ma/CompanyEnrichmentService.ts`
  - `src/process/services/ma/ContactService.ts`
  - `src/process/services/ma/WatchlistService.ts`
  - `src/process/services/ma/NativeIntegrationService.ts`
  - `src/process/bridge/maBridge.ts`
  - `src/common/adapter/ipcBridge.ts`
  - `src/common/ma/types.ts`
- Can run with:
  - none
- Objective:
  - Decide for each existing process-side capability whether it is:
    - kept and surfaced now
    - intentionally deferred
    - removed if misleading and unused
- Architecture requirements:
  - no more ambiguous half-exposed service ownership
  - bridge contracts should exist only for capabilities the product intends to
    surface
- UI/UX requirements:
  - every kept capability needs a discoverability plan and later renderer owner
- Deliverables:
  - keep, defer, or remove decisions
  - bridge and type updates for kept capabilities
- Success criteria:
  - no major M&A process service remains in an undefined product state
  - every kept capability has a named renderer path or a concrete next-wave owner
- Required tests:
  - extend service and bridge tests for every kept active capability
- Auditor close-out:
  - include a keep/defer/remove table in the wave note

### Batch 4B - Renderer surfacing for kept capabilities

- Owner scope:
  - renderer files for any capabilities marked kept by Batch 4A
  - `src/renderer/services/i18n/locales/*/ma.json`
- Depends on:
  - Batch 4A
- Can run with:
  - Batch 4C once contracts stabilize
- Objective:
  - Expose kept capabilities through coherent M&A UI
- Architecture requirements:
  - new surfaces must fit the routed M&A shell, not become detached islands
- UI/UX requirements:
  - localized empty, loading, and error states
  - accessibility and token compliance from the start
- Deliverables:
  - renderer surfaces for kept contacts, watchlists, enrichment, or integration
    flows as decided in 4A
- Success criteria:
  - every kept capability is actually discoverable through UI
  - no kept feature remains process-only at wave end
- Required tests:
  - route, hook, and component tests for the new kept capabilities
  - i18n validation
- Auditor close-out:
  - verify discoverability from routed M&A entry points

### Batch 4C - Regression harness and audit close-out

- Owner scope:
  - `tests/unit/renderer/**`
  - `tests/unit/process/**`
  - `tests/e2e/**` if the repo already has suitable harnesses
  - `docs/audit/**`
- Depends on:
  - Batches 4A and 4B
- Can run with:
  - Batch 4B once final routes and hooks stabilize
- Objective:
  - Protect the active M&A surface area from regression
- Deliverables:
  - regression coverage for routes, active deal, readiness, upload, DD, and any
    kept capabilities from 4A
  - wave audit note
- Success criteria:
  - the active M&A surface is guarded by both process and renderer tests
  - the audit note makes the next starting state obvious
- Required tests:
  - global merge gate
  - targeted route, hook, and component tests for the active surface
- Auditor close-out:
  - verify the wave note references actual test execution and actual remaining risks

### Wave 4 close-out

Wave 4 is complete only when:

- active M&A capabilities are either surfaced or explicitly deferred
- the kept active surface has regression protection
- the audit note documents what remains parked

## 7. Parked expansion lane (preserved feature inventory with re-entry gates)

These waves preserve inherited feature scope from the superseded plan. They are
not deleted. They are explicitly parked until the active lane is complete
enough to support them safely.

## Wave 5 - Data-intelligence foundations

### Purpose

Add durable data-intelligence foundations for French company research and
enrichment.

### Why parked

Current launch blockers are still in routing, bridge truth, upload truth, and
UI compliance. Bringing in new data planes before the active lane closes would
multiply ambiguity.

### Re-entry prerequisites

- Waves 1 through 4 closed by audit note
- clear shell ownership for company and research surfaces
- explicit canonical-source policy for each data field family

### Candidate batches

#### 5A - M&A data spine schema and repositories

- Candidate scope:
  - schema and migrations
  - repositories for companies, contacts, watchlists, and cache tables
- Deliverables:
  - durable storage for company and market-intelligence entities
- Success criteria:
  - source-backed schema and repositories exist with tests
- Tests:
  - repository and migration tests

#### 5B - SIRENE and data.gouv.fr ingestion layer

- Candidate scope:
  - process services or MCP services for SIRENE and data.gouv.fr
- Deliverables:
  - live fetch or ingestion layer
  - cache or reconciliation logic
- Success criteria:
  - source-specific fields are testable and mergeable
- Tests:
  - service tests
  - source normalization tests

#### 5C - Pappers and enrichment convergence

- Candidate scope:
  - Pappers integration
  - company enrichment reconciliation
- Deliverables:
  - field-level merge policy
  - provenance-aware company profile
- Success criteria:
  - multi-source merge rules are explicit and covered
- Tests:
  - merge-rule tests

#### 5D - Contacts and watchlists maturation

- Candidate scope:
  - contact and watchlist renderer and process maturation
- Deliverables:
  - end-to-end CRUD
  - enrichment or refresh cron alignment
- Success criteria:
  - contacts and watchlists are no longer ambiguous partials
- Tests:
  - CRUD tests
  - scheduled-job tests as appropriate

### UI/UX guidance for Wave 5

- Company research surfaces should show source provenance clearly
- Stale or missing data should be explained explicitly
- Source disagreement should not be hidden
- Large company profiles should support structured scanning, not just long forms

## Wave 6 - M&A shell and analytical workbench surfaces

### Purpose

Expand the routed M&A shell into a coherent analytical workspace.

### Why parked

Wave 1 only needs minimal route entry; the richer shell should wait until active
deal, DD, and compliance foundations are stable.

### Re-entry prerequisites

- Waves 1 through 4 closed
- clear discoverability plan for every surface that enters the shell

### Candidate features preserved from the superseded roadmap

- `MaLayout`
- M&A top bar
- active-deal indicator
- breadcrumbs
- command palette
- M&A home page
- valuation workbench
- company profile aggregator UI
- sector overview or intelligence page

### Candidate batches

#### 6A - Stable M&A shell

- Deliverables:
  - layout, top bar, active-deal badge, breadcrumbs, shell landmarks
- Success criteria:
  - routed M&A pages feel like one product area
- Tests:
  - route and shell DOM tests

#### 6B - Command palette

- Deliverables:
  - jump surface for deals, companies, docs, analyses, glossary, and later reports
- Success criteria:
  - predictable keyboard navigation and search semantics
- Tests:
  - keyboard and search-result DOM tests

#### 6C - Valuation workbench page

- Deliverables:
  - page that turns existing valuation engine into user-facing workflows
- Success criteria:
  - valuation assumptions and outputs are inspectable and formatted correctly
- Tests:
  - page state tests
  - formatter tests

#### 6D - Company and sector analytical pages

- Deliverables:
  - company profile page
  - sector overview or intelligence page
- Success criteria:
  - sources, merge rules, and sector semantics are visible and actionable
- Tests:
  - route and component tests

### UI/UX guidance for Wave 6

- Shell should prioritize active context, navigation, and scanning
- Valuation should present assumptions, outputs, and caveats without visual
  overload
- Company research should distinguish canonical fields from source-specific
  evidence

## Wave 7 - Document automation and report generation

### Purpose

Turn the document and analysis layers into reusable drafting and export flows.

### Why parked

Current document and DD truth must close first. Otherwise generated outputs
would inherit weak provenance and unstable UX.

### Re-entry prerequisites

- Waves 1 through 4 closed
- document pipeline and DD truth stable
- clear template and export architecture

### Candidate features preserved from the superseded roadmap

- template registry
- report-generator core
- NDA generator
- LOI generator
- DD checklist generator
- teaser generator
- IM generator
- valuation report generator

### Candidate batches

#### 7A - Template registry and report core

- Deliverables:
  - stable generation architecture
  - template discovery model
- Success criteria:
  - document generators share one core rather than bespoke scattered pipelines
- Tests:
  - generator-core tests

#### 7B - Early legal or checklist outputs

- Deliverables:
  - NDA, LOI, and DD checklist generation
- Success criteria:
  - outputs are based on explicit inputs and provenance
- Tests:
  - template rendering tests

#### 7C - Marketing or deal-pack outputs

- Deliverables:
  - teaser and IM generation
- Success criteria:
  - output structure is consistent and reviewable
- Tests:
  - rendering tests

#### 7D - Valuation report output

- Deliverables:
  - valuation report generator
- Success criteria:
  - report references underlying valuation assumptions and results correctly
- Tests:
  - report-content tests

### UI/UX guidance for Wave 7

- Generated documents must expose provenance and source confidence
- Users should understand whether content is hand-entered, computed, or AI-assisted
- Review and export states should be explicit

## Wave 8 - CRM, pipeline, and communications

### Purpose

Evolve M&A collaboration around deals, contacts, and outbound communications.

### Why parked

The underlying M&A shell and data capabilities must be coherent before
expanding into communication-heavy workflows.

### Re-entry prerequisites

- Waves 1 through 6 closed
- contacts and watchlists clearly surfaced
- shell navigation stable

### Candidate features preserved from the superseded roadmap

- contacts experience
- Kanban deal pipeline
- WhatsApp integration
- email integration
- Pipedrive integration

### Candidate batches

#### 8A - Contacts and pipeline UI

- Deliverables:
  - contact surfaces
  - stage-aware deal pipeline or Kanban
- Success criteria:
  - pipeline state is clear and testable
- Tests:
  - route and interaction tests

#### 8B - Email and CRM integrations

- Deliverables:
  - email flows
  - Pipedrive bridge or integration
- Success criteria:
  - integration readiness and failure states are user-visible
- Tests:
  - service and bridge tests

#### 8C - Messaging integration

- Deliverables:
  - WhatsApp or similar messaging surface as approved
- Success criteria:
  - integration is behind explicit readiness and compliance expectations
- Tests:
  - service and error-path tests

### UI/UX guidance for Wave 8

- Communication history must not bury deal context
- Integration readiness must be visible before sending or syncing
- Pipeline drag or stage changes must remain keyboard and accessibility friendly

## Wave 9 - AI platform binding, RAG, and ops hardening

### Purpose

Finish the deeper AI platform work that sits beyond current DD runtime truth.

### Why parked

Wave 1 and Wave 2 close the immediate DD truth gap. This wave handles the
broader platformization work that should follow stable core behavior.

### Re-entry prerequisites

- Waves 1 through 4 closed
- DD catalog, readiness, and provenance stable
- decision on which AI-driven features enter the next product scope

### Candidate features preserved from the superseded roadmap

- Flowise runtime config and health surface
- Flowise production bootstrap alignment
- knowledge-base or RAG ingestion pipeline
- feature-to-chatflow catalog
- prompt versioning
- observability and span export
- `web.*` tool family
- `news.*` tool family
- secret hygiene and production config hardening

### Candidate batches

#### 9A - Runtime config and health surface

- Deliverables:
  - settings and runtime visibility for Flowise endpoint or readiness
- Success criteria:
  - production binding is not hidden in source
- Tests:
  - settings and readiness tests

#### 9B - Knowledge-base and ingestion plane

- Deliverables:
  - KB ingestion and retrieval architecture
- Success criteria:
  - ingestion provenance and source controls are explicit
- Tests:
  - ingestion and retrieval tests

#### 9C - Feature-to-flow registry and prompt versioning

- Deliverables:
  - catalog-backed mapping for AI features beyond DD
  - prompt-version capture
- Success criteria:
  - every AI feature knows which flow or prompt family it uses
- Tests:
  - registry tests
  - provenance tests

#### 9D - Observability, tools, and secret hygiene

- Deliverables:
  - observability integration
  - `web.*` and `news.*` families if retained
  - production-ready secret access plan
- Success criteria:
  - failures are debuggable and environment config is no longer ad hoc
- Tests:
  - error-path and config tests

### UI/UX guidance for Wave 9

- AI configuration should not feel like an internal admin panel unless that is
  explicitly the product choice
- Source provenance and readiness should be understandable by operators and
  by end users when it blocks them

## Wave 10 - Analytics, comparables, daily brief, and reporting

### Purpose

Add market-intelligence and analytics surfaces once the shell, data, and AI
planes are ready.

### Why parked

These are valuable but high-surface-area features. They should be built on a
stable foundation rather than on partial routes and placeholder state.

### Re-entry prerequisites

- Waves 5, 6, and 9 sufficiently advanced
- clear dashboard information architecture
- source and freshness rules for comparables and feeds

### Candidate features preserved from the superseded roadmap

- dashboard and widgets
- comparables DB
- market-intelligence feeds
- daily brief
- custom reporting engine

### Candidate batches

#### 10A - Dashboard shell

- Deliverables:
  - dashboard route and widget model
- Success criteria:
  - widgets have loading, empty, and error states
- Tests:
  - route and widget-state tests

#### 10B - Comparables and feeds

- Deliverables:
  - comparables surface
  - market or news feed ingestion
- Success criteria:
  - provenance and freshness visible
- Tests:
  - table and feed tests

#### 10C - Daily brief and reporting

- Deliverables:
  - daily brief page
  - custom reporting engine
- Success criteria:
  - summary outputs are navigable and traceable
- Tests:
  - report and brief rendering tests

### UI/UX guidance for Wave 10

- Analytics should emphasize scanability and source trust
- Widgets should be individually resilient
- Daily brief should be readable, not dashboard-shaped

## Wave 11 - Enterprise and compliance

### Purpose

Introduce organization-grade controls, auditability, encryption, and regulated
workflows after the product core is stable.

### Why parked

Security and compliance scope should not be layered on top of ambiguous feature
state or placeholder routing.

### Re-entry prerequisites

- core product routes and state are stable
- data spine exists
- threat model and retention expectations are documented

### Candidate features preserved from the superseded roadmap

- RBAC
- audit log
- encryption
- OS keychain integration
- GDPR tools
- VDR

### Candidate batches

#### 11A - RBAC and audit log

- Deliverables:
  - user roles
  - audit persistence and viewer
- Success criteria:
  - core actions are attributable and permissioned
- Tests:
  - permission and audit tests

#### 11B - Encryption and secret storage

- Deliverables:
  - at-rest protections
  - managed local secret storage
- Success criteria:
  - sensitive data handling is explicit
- Tests:
  - encryption and migration tests

#### 11C - GDPR and VDR

- Deliverables:
  - erasure, export, retention, and data-room workflows
- Success criteria:
  - regulated actions are explicit and reviewable
- Tests:
  - compliance workflow tests

### UI/UX guidance for Wave 11

- Destructive actions need two-step clarity
- Export and retention decisions should be transparent
- Compliance tools must explain blast radius before execution

## Wave 12 - Release program and launch hardening

### Purpose

Convert the matured product into a releasable program.

### Why parked

Release work before product truth closes tends to create documentation and CI
noise without reducing current execution risk.

### Re-entry prerequisites

- product scope for launch agreed
- critical active and selected parked waves completed
- release owner identified

### Candidate features preserved from the superseded roadmap

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
- production release

### Candidate batches

#### 12A - Performance and memory budget work

- Deliverables:
  - measured budgets and fixes
- Tests:
  - benchmark or profiling evidence

#### 12B - Documentation and extension surface

- Deliverables:
  - technical and user docs
  - extension documentation if still relevant
- Tests:
  - doc build or verification as appropriate

#### 12C - Polish, onboarding, and feedback

- Deliverables:
  - final first-run flow
  - feedback capture
  - UX polish sweep
- Tests:
  - end-to-end and a11y evidence

#### 12D - Security, release, and distribution

- Deliverables:
  - pen test follow-up
  - signing
  - updater
  - beta and release evidence
- Tests:
  - release checklist evidence

### UI/UX guidance for Wave 12

- onboarding must connect directly to real product value
- feedback should be supportive, not noisy
- release polishing should remove rough edges without masking structural issues

## Wave 13 - Post-launch platform enrichment

### Purpose

Evaluate infrastructure accelerators and platform attachments after baseline
launch is stable.

### Why parked

These are useful only after the local baseline is reliable and measurable.

### Re-entry prerequisites

- launch baseline stable
- rollback plan for each accelerator
- cost, performance, and operational benefit understood

### Candidate features preserved from the superseded roadmap

- MetaMCP federation
- Browserless backend
- RSSHub backend
- Infisical secret spine
- Langfuse observability

### Candidate batches

#### 13A - Tool federation and MetaMCP

- Success criteria:
  - federation can be toggled and audited
- Tests:
  - generator or compatibility tests

#### 13B - Alternative web and news backends

- Success criteria:
  - fallback remains available
- Tests:
  - backend contract tests

#### 13C - Secret spine and LLM observability

- Success criteria:
  - production-grade secret and tracing integrations are reversible and measurable
- Tests:
  - config and trace-surface tests

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
