# 🗺️ Largo — Product Roadmap 2025–2027

> **Version:** 2.0 · **Last updated:** 2025-07 · **Status:** Active  
> **Current release:** v1.9.16 · **License:** Apache-2.0  
> **Maintainer:** Largo Engineering · largo@largo.fr

---

## Table of Contents

- [Vision & Mission](#-vision--mission)
- [Target Users](#-target-users)
- [Competitive Positioning](#-competitive-positioning)
- [Largo Philosophy](#-largo-philosophy--design-principles)
- [Current State](#-current-state--baseline)
- [Tech Stack Evolution](#-tech-stack-evolution)
- [Implementation Phases](#-implementation-phases)
  - [Phase 0 — Foundation Hardening](#phase-0--foundation-hardening-weeks-13)
  - [Phase 1 — Core M&A Intelligence](#phase-1--core-ma-intelligence-weeks-48)
  - [Phase 2 — Document Automation](#phase-2--document-automation-weeks-912)
  - [Phase 3 — Communication & CRM](#phase-3--communication--crm-weeks-1317)
  - [Phase 4 — Advanced Analytics](#phase-4--advanced-analytics-weeks-1822)
  - [Phase 5 — Enterprise & Compliance](#phase-5--enterprise--compliance-weeks-2327)
  - [Phase 6 — Production Launch](#phase-6--production-launch-weeks-2830)
- [Visual Timeline](#-visual-timeline)
- [Mobile Strategy](#-mobile-strategy)
- [Extension Ecosystem](#-extension-ecosystem)
- [Feature Improvements & Polish](#-feature-improvements--polish)
- [Success Metrics](#-success-metrics)
- [Risk Assessment](#-risk-assessment)
- [Appendix: Glossary of M&A Terms](#-appendix-glossary-of-french-ma-terms)

---

## 🔭 Vision & Mission

### Vision

**By 2027, Largo will be the indispensable AI co-pilot for every M&A professional in France and French-speaking markets** — a platform that transforms weeks of manual research, document preparation, and deal management into hours of focused, high-quality advisory work.

### Mission

Largo empowers _boutiques M&A_, private equity firms, and corporate development teams with an AI-native workspace that deeply understands French corporate law, financial regulation, and deal-making culture. We combine the power of frontier AI models (Anthropic Claude, OpenAI GPT, Google Gemini) with domain-specific M&A intelligence, automated document generation, and seamless communication tools — all running locally on the professional's machine with full data sovereignty.

### Core Beliefs

| Belief                                 | Implication                                                   |
| -------------------------------------- | ------------------------------------------------------------- |
| **Data sovereignty is non-negotiable** | Desktop-first architecture; SQLite local DB; no cloud lock-in |
| **French M&A has unique workflows**    | SIRENE/Pappers integration; NDA/teaser/IM templates in French |
| **AI augments, never replaces**        | Human-in-the-loop for every critical decision                 |
| **Speed-to-insight wins deals**        | Sub-second company lookups; real-time valuation estimates     |
| **Compliance is a feature**            | GDPR-native; audit trails; SOC2 controls from day one         |

---

## 👥 Target Users

### Primary Personas

| Persona                    | Role                             | Pain Points                                         | Largo Value                                         |
| -------------------------- | -------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| **Marie — Analyste M&A**   | Junior analyst at a _boutique_   | Spends 60% of time on data gathering and formatting | Automated company research, instant teasers and IMs |
| **Thomas — Associé**       | Partner at a mid-market advisory | Needs pipeline visibility, fast valuations          | M&A dashboard, valuation engine, deal tracker       |
| **Camille — PE Associate** | Private equity investment team   | Due diligence is manual and error-prone             | Structured DD checklists, document room integration |
| **Henri — Corporate Dev**  | Head of M&A at a CAC 40 group    | Coordinates across legal, tax, finance teams        | Team mode, multi-agent collaboration, compliance    |

### Secondary Personas

| Persona                           | Use Case                                    |
| --------------------------------- | ------------------------------------------- |
| **Notaires / Avocats d'affaires** | Transaction document review, NDA generation |
| **Expert-comptables**             | Valuation reports, financial analysis       |
| **Banquiers d'affaires**          | Pitch decks, deal origination research      |

### Market Sizing (France)

| Segment                       | Count               | Average Deal Size |
| ----------------------------- | ------------------- | ----------------- |
| Boutiques M&A                 | ~350 firms          | €5M–€200M         |
| PE / VC firms                 | ~280 active         | €10M–€500M        |
| Corporate dev teams (SBF 120) | ~120 teams          | €50M–€5B          |
| Big 4 Transaction Advisory    | 4 firms × 3–5 teams | €100M+            |
| Independent _mandataires_     | ~1,200 individuals  | €1M–€20M          |

---

## 🏁 Competitive Positioning

```
                        Domain Expertise (M&A)
                              ▲
                              │
                    Largo     │
                    ◉─────────┤
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
Generic ◄─┤     ChatGPT ○    │    ○ DealRoom     ├─► Specialized
AI Tools  │     Claude ○     │    ○ Datasite     │   M&A Software
          │     Copilot ○    │    ○ Midaxo       │
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              │     ○ Notion AI
                              │     ○ Jasper
                              ▼
                        General Purpose
```

**Largo's Moat:**

1. **French-first M&A intelligence** — SIRENE, Pappers, _Registre du Commerce_ integration
2. **Local-first architecture** — No sensitive deal data leaves the machine
3. **Multi-model flexibility** — Switch between Claude, GPT, Gemini per task
4. **Extensible via MCP** — Community-built servers for niche data sources
5. **Document automation** — Native Word/Excel/PowerPoint generation in French M&A formats
6. **Team collaboration** — Multi-agent mode for complex transactions

---

## 🌿 Largo Philosophy — Design Principles

Every feature in this roadmap is guided by four design principles inherited from the Mint Whisper theme:

| Principle          | French        | Meaning                                     | Application                                                        |
| ------------------ | ------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| 🫧 **Respiration** | _Respiration_ | Generous whitespace, unhurried interactions | Never overwhelm the user; progressive disclosure; clean dashboards |
| 🌿 **Fraîcheur**   | _Fraîcheur_   | Mint-green palette, fresh feeling           | Cool, calm UI for high-stakes M&A work; reduce decision fatigue    |
| ☕ **Chaleur**     | _Chaleur_     | Warm typography, approachable tone          | Cormorant Garamond headings; empathetic assistant voice; FR locale |
| 💎 **Raffinement** | _Raffinement_ | Polished details, professional finish       | Pixel-perfect documents; precise valuations; no rough edges        |

Throughout this roadmap, you'll see annotations like `[Raffinement]` linking features to these principles.

---

## 📊 Current State — Baseline

### What's Shipped (v1.9.16)

| Category      | Status      | Details                                                                        |
| ------------- | ----------- | ------------------------------------------------------------------------------ |
| 🎨 Branding   | ✅ Complete | AionUi → Largo rebranding, Mint Whisper theme (light + dark)                   |
| 🔤 Typography | ✅ Complete | Plus Jakarta Sans (body), Cormorant Garamond (headings), JetBrains Mono (code) |
| 🌐 i18n       | ✅ Complete | 9 languages (fr-FR primary), 19 modules, type-safe keys                        |
| 🤖 AI Models  | ✅ Complete | Anthropic, OpenAI, Google Gemini, AWS Bedrock, local models                    |
| 💬 Chat       | ✅ Complete | Multi-conversation, markdown rendering, code blocks, Mermaid diagrams          |
| 👥 Team Mode  | ✅ Complete | Multi-agent collaboration with channel-based communication                     |
| 🧩 Extensions | ✅ Complete | 14 resolver types, sandboxed execution, 23 preset assistants, 21 skills        |
| 📄 Documents  | ✅ Complete | Excel, PowerPoint, Word, PDF generation via OfficeCLI skills                   |
| 🔌 MCP        | ✅ Complete | Model Context Protocol integration, built-in MCP servers                       |
| ⏰ Cron       | ✅ Complete | Scheduled task system for automated workflows                                  |
| 🗄️ Database   | ✅ Complete | SQLite (better-sqlite3), WAL mode, 7+ tables                                   |
| 🌐 WebUI      | ✅ Complete | Express server with WebSocket, JWT auth, CSRF protection                       |
| 📱 Mobile     | 🟡 Skeleton | React Native/Expo app with bridge, WebSocket client, basic auth                |
| 🧪 Tests      | 🟡 Partial  | 420 test files (396 unit, 14 integration, 24 e2e)                              |
| 🚀 CI/CD      | 🔴 Missing  | No GitHub Actions workflows configured                                         |
| 📊 Analytics  | 🔴 Missing  | No telemetry or usage tracking                                                 |
| 🔐 Compliance | 🔴 Missing  | No SOC2 controls, limited audit trail                                          |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Largo Desktop                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Renderer │◄─┤  Preload   ├─►│  Main    │◄─┤  Worker Forks    │ │
│  │ (React)  │  │  (IPC)     │  │ Process  │  │  (node-pty, etc) │ │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────────┘ │
│       │                            │                                │
│       │                     ┌──────┴──────┐                        │
│       │                     │   SQLite    │                        │
│       │                     │  (WAL mode) │                        │
│       │                     └─────────────┘                        │
│       │                            │                                │
│       │              ┌─────────────┼─────────────┐                 │
│       │              │             │             │                  │
│       │         ┌────┴───┐  ┌─────┴────┐  ┌────┴───┐             │
│       │         │  MCP   │  │ Agents   │  │ Cron   │             │
│       │         │Servers │  │ (6 types)│  │ Tasks  │             │
│       │         └────────┘  └──────────┘  └────────┘             │
└───────┼─────────────────────────────────────────────────────────────┘
        │
   ┌────┴─────────────────┐
   │     WebUI Mode       │
   │  (Express + WS)      │
   └──────────────────────┘
        │
   ┌────┴─────────────────┐
   │   Mobile App         │
   │  (React Native/Expo) │
   └──────────────────────┘
```

### Tech Stack (Current)

| Layer             | Technology                                   | Version                  |
| ----------------- | -------------------------------------------- | ------------------------ |
| Runtime           | Electron                                     | 37                       |
| Node.js           | Node.js                                      | 22+                      |
| UI Framework      | React                                        | 19                       |
| Component Library | Arco Design                                  | `@arco-design/web-react` |
| Icons             | Icon Park                                    | `@icon-park/react`       |
| CSS               | UnoCSS + CSS Modules                         | —                        |
| Build             | electron-vite + Vite + esbuild               | 5 / 6                    |
| Package Manager   | Bun                                          | Latest                   |
| Database          | SQLite                                       | better-sqlite3           |
| AI SDKs           | Anthropic, OpenAI, Google GenAI, AWS Bedrock | Latest                   |
| Protocol          | MCP SDK                                      | Latest                   |
| i18n              | i18next                                      | 9 languages, 19 modules  |
| Testing           | Vitest 4 + Playwright                        | —                        |
| Linting           | oxlint + oxfmt                               | —                        |
| TypeScript        | TypeScript                                   | 5.8 (strict mode)        |
| Mobile            | React Native + Expo                          | —                        |

---

## 🔧 Tech Stack Evolution

### Proposed Improvements

Each improvement is tagged with its target phase and priority.

#### 1. Monorepo Migration `[Phase 0]` `P1`

| Aspect      | Current                      | Proposed                                                |
| ----------- | ---------------------------- | ------------------------------------------------------- |
| Structure   | Single package.json          | Turborepo with shared packages                          |
| Shared code | `src/common/` directory      | `packages/shared`, `packages/types`, `packages/ma-core` |
| Mobile      | Separate `mobile/` directory | `apps/mobile` workspace                                 |
| Build       | electron-vite                | Turborepo → electron-vite for desktop, Metro for mobile |

```
largo/
├── apps/
│   ├── desktop/          # Electron app (current src/)
│   ├── mobile/           # React Native app
│   └── webui/            # Standalone web deployment
├── packages/
│   ├── shared/           # Cross-platform utilities
│   ├── types/            # TypeScript type definitions
│   ├── ma-core/          # M&A business logic
│   ├── i18n/             # Internationalization
│   ├── ui/               # Shared UI components
│   └── mcp-servers/      # MCP server implementations
├── tools/
│   ├── eslint-config/    # Shared lint config
│   └── tsconfig/         # Shared TS config
└── turbo.json
```

**Acceptance Criteria:**

- [ ] All existing tests pass in monorepo structure
- [ ] Build time ≤ 120% of current (cache compensates)
- [ ] `bun run dev` works from root for any app
- [ ] Shared packages have 100% type coverage

#### 2. End-to-End Type Safety `[Phase 0]` `P1`

| Aspect     | Current                               | Proposed                                |
| ---------- | ------------------------------------- | --------------------------------------- |
| IPC        | Manual bridge types in `src/preload/` | Typed IPC with auto-generated contracts |
| DB queries | Raw SQL strings                       | Drizzle ORM with inferred types         |
| API calls  | Manual SDK wrappers                   | Typed API layer with Zod validation     |

**Implementation:**

- Introduce `zod` schemas for all IPC message types
- Generate TypeScript types from Zod schemas
- Validate all IPC messages at runtime in development mode
- Use Drizzle ORM for compile-time checked SQL

#### 3. State Management `[Phase 1]` `P2`

| Aspect       | Current                     | Proposed                                        |
| ------------ | --------------------------- | ----------------------------------------------- |
| Client state | React context + local state | Zustand stores with devtools                    |
| Server state | Custom hooks                | SWR (keep existing) + Zustand for derived state |
| Persistence  | Manual localStorage         | Zustand `persist` middleware → SQLite           |

**Stores to create:**

- `useConversationStore` — active conversation, message drafts
- `useDealStore` — M&A deal pipeline, company profiles
- `useSettingsStore` — user preferences (replace context)
- `useTeamStore` — team mode state, agent roster

#### 4. Database Evolution `[Phase 0–1]` `P1`

| Aspect     | Current                              | Proposed                                   |
| ---------- | ------------------------------------ | ------------------------------------------ |
| ORM        | Raw SQL in `schema.ts`               | Drizzle ORM                                |
| Migrations | Single `migrations.ts` (1,352 lines) | Drizzle Kit with versioned migration files |
| Schema     | Embedded in code                     | Declarative schema files per domain        |
| Types      | Manual type definitions              | Auto-inferred from Drizzle schema          |

**New tables (Phases 1–5):**

```
companies        — SIRENE/Pappers data cache
deals            — M&A deal pipeline
deal_stages      — Stage history per deal
contacts         — CRM contact records
documents        — Generated document metadata
valuations       — Valuation snapshots
watchlists       — Daily watch criteria
audit_log        — Compliance audit trail
permissions      — RBAC permission grants
```

#### 5. Testing Infrastructure `[Phase 0]` `P0`

| Aspect      | Current            | Proposed                                    |
| ----------- | ------------------ | ------------------------------------------- |
| Unit tests  | 396 (Vitest)       | Target: 600+ (80% coverage)                 |
| Integration | 14 tests           | Target: 50+ (all IPC bridges)               |
| E2E         | 24 (Playwright)    | Target: 80+ (critical user flows)           |
| Component   | None               | React Testing Library for all UI components |
| Visual      | None               | Playwright visual regression snapshots      |
| Performance | 1 benchmark script | Vitest bench for hot paths                  |

#### 6. CI/CD Pipeline `[Phase 0]` `P0`

**GitHub Actions Workflows:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:        # oxlint + oxfmt check
  typecheck:   # tsc --noEmit
  test-unit:   # vitest run
  test-e2e:    # playwright test
  build:       # electron-vite build
  i18n-check:  # check-i18n.js + i18n:types

# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build-mac:    # macOS arm64 + x64, code signing + notarization
  build-win:    # Windows x64, code signing
  build-linux:  # Linux x64 + arm64 (.deb, AppImage)
  publish:      # GitHub Releases + auto-update feed
```

#### 7. Observability `[Phase 1]` `P2`

| Tool              | Purpose                                              | Privacy                                       |
| ----------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Sentry**        | Error tracking, crash reports                        | Opt-in; PII stripped; self-hosted option      |
| **OpenTelemetry** | Performance traces (startup, query, AI call latency) | Local-only by default                         |
| **PostHog**       | Product analytics (feature usage, funnels)           | Opt-in; EU data residency; self-hosted option |

**Key Metrics to Track:**

- App startup time (target: < 3s cold, < 1s warm)
- AI response latency by provider
- Document generation time
- Database query p95 latency
- Extension load time
- Memory usage over time

#### 8. Performance Optimization `[Phase 1–6]` `P2`

| Optimization                         | Phase   | Expected Impact                  |
| ------------------------------------ | ------- | -------------------------------- |
| React Compiler (React 19)            | Phase 1 | 15–30% fewer re-renders          |
| Route-based code splitting           | Phase 0 | 40% smaller initial bundle       |
| Lazy loading for settings/team pages | Phase 0 | 200ms faster first paint         |
| SQLite query optimization (indexes)  | Phase 1 | 10x faster deal lookups          |
| Worker thread for AI streaming       | Phase 1 | No UI jank during long responses |
| Virtual scrolling for message lists  | Phase 2 | Smooth scroll at 10k+ messages   |
| WASM-based PDF rendering             | Phase 4 | 5x faster PDF generation         |

#### 9. Security Hardening `[Phase 0, 5]` `P0`

| Control            | Phase   | Description                                                          |
| ------------------ | ------- | -------------------------------------------------------------------- |
| CSP headers        | Phase 0 | Strict Content Security Policy for renderer                          |
| Electron fuses     | Phase 0 | Disable `nodeIntegration`, enable `contextIsolation` fuses           |
| Signed builds      | Phase 6 | macOS notarization, Windows Authenticode                             |
| Dependency audit   | Phase 0 | `bun audit` in CI, Dependabot alerts                                 |
| Secret scanning    | Phase 0 | GitHub secret scanning enabled                                       |
| Input sanitization | Phase 1 | Zod validation on all user inputs                                    |
| Encryption at rest | Phase 5 | SQLCipher for sensitive deal data                                    |
| API key vault      | Phase 1 | OS keychain integration (macOS Keychain, Windows Credential Manager) |

#### 10. Documentation `[Phase 0–6]` `P2`

| Deliverable                   | Phase   | Tool                  |
| ----------------------------- | ------- | --------------------- |
| Component library docs        | Phase 0 | Storybook 8           |
| API documentation             | Phase 1 | TypeDoc               |
| MCP server docs               | Phase 1 | Markdown + examples   |
| Extension SDK guide           | Phase 3 | Docusaurus site       |
| Architecture Decision Records | Ongoing | `docs/adr/` directory |
| Video tutorials               | Phase 6 | Loom / YouTube        |
| User manual (FR)              | Phase 6 | GitBook or Docusaurus |

---

## 🚀 Implementation Phases

### Phase 0 — Foundation Hardening (Weeks 1–3)

> **Theme:** _Establish the bedrock for everything that follows._  
> **Largo Philosophy:** `[Raffinement]` — No feature built on a shaky foundation can be polished.

#### 0.1 — CI/CD Pipeline Setup

| Item                                   | Priority | Effort | Dependencies | Acceptance Criteria                                           |
| -------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------------------- |
| Create `.github/workflows/ci.yml`      | P0       | 2d     | None         | ✅ Lint, typecheck, test, build pass on every PR              |
| Create `.github/workflows/release.yml` | P0       | 3d     | ci.yml       | ✅ Tagged push triggers multi-platform build + GitHub Release |
| Configure Dependabot                   | P0       | 0.5d   | None         | ✅ Weekly dependency update PRs                               |
| Add branch protection rules            | P0       | 0.5d   | ci.yml       | ✅ `main` requires passing CI + 1 review                      |
| Pre-commit hook alignment with CI      | P1       | 1d     | ci.yml       | ✅ `prek run` locally matches CI checks                       |

#### 0.2 — Test Coverage to 80%+

| Item                                        | Priority | Effort | Dependencies | Acceptance Criteria                                      |
| ------------------------------------------- | -------- | ------ | ------------ | -------------------------------------------------------- |
| Audit current coverage gaps                 | P0       | 1d     | None         | ✅ Coverage report generated per module                  |
| Add unit tests for `src/process/services/`  | P0       | 3d     | None         | ✅ Database, i18n, MCP services at 85%+                  |
| Add unit tests for `src/common/utils/`      | P0       | 2d     | None         | ✅ All utility functions tested                          |
| Add component tests (React Testing Library) | P1       | 3d     | None         | ✅ 30+ component tests for core UI                       |
| Add integration tests for IPC bridges       | P1       | 2d     | None         | ✅ All 3 bridges (model, officeWatch, pptPreview) tested |
| Expand e2e tests for critical flows         | P1       | 2d     | None         | ✅ Login → chat → document generation flow               |
| Configure Codecov in CI                     | P2       | 0.5d   | ci.yml       | ✅ Coverage badge on README, PR comments                 |

#### 0.3 — i18n Completeness Verification

| Item                                             | Priority | Effort | Dependencies | Acceptance Criteria                       |
| ------------------------------------------------ | -------- | ------ | ------------ | ----------------------------------------- |
| Run `check-i18n.js` for all 19 modules × 9 langs | P0       | 0.5d   | None         | ✅ Zero missing keys reported             |
| Add missing translations (fr-FR priority)        | P0       | 2d     | Audit        | ✅ fr-FR 100% complete across all modules |
| Machine-translate missing keys (non-FR)          | P2       | 1d     | Audit        | ✅ All languages at 95%+ coverage         |
| Add i18n completeness check to CI                | P1       | 0.5d   | ci.yml       | ✅ CI fails on missing fr-FR keys         |
| Add new module: `ma` (M&A terminology)           | P1       | 1d     | None         | ✅ M&A-specific i18n keys for Phases 1–2  |

#### 0.4 — Accessibility Audit (WCAG 2.1 AA)

| Item                                       | Priority | Effort | Dependencies | Acceptance Criteria                      |
| ------------------------------------------ | -------- | ------ | ------------ | ---------------------------------------- |
| Run axe-core audit on all pages            | P1       | 1d     | None         | ✅ Audit report with severity ratings    |
| Fix critical a11y violations               | P0       | 2d     | Audit        | ✅ Zero critical/serious violations      |
| Add keyboard navigation for chat           | P1       | 1d     | None         | ✅ Full chat flow navigable via keyboard |
| Add ARIA labels to custom components       | P1       | 1.5d   | None         | ✅ All Arco overrides have ARIA labels   |
| Add screen reader testing to e2e           | P2       | 1d     | Playwright   | ✅ VoiceOver/NVDA basic flow works       |
| Color contrast verification (Mint Whisper) | P1       | 0.5d   | None         | ✅ All text meets 4.5:1 contrast ratio   |

> `[Respiration]` — Accessibility ensures the calm, breathing UI is usable by everyone.

#### 0.5 — Security Baseline

| Item                                  | Priority | Effort | Dependencies | Acceptance Criteria                                            |
| ------------------------------------- | -------- | ------ | ------------ | -------------------------------------------------------------- |
| Implement CSP headers for renderer    | P0       | 1d     | None         | ✅ No inline scripts; strict CSP policy                        |
| Audit Electron security settings      | P0       | 1d     | None         | ✅ All Electron security checklist items pass                  |
| Enable Electron fuses                 | P0       | 0.5d   | None         | ✅ `nodeIntegration: false`, `contextIsolation: true` verified |
| Dependency vulnerability scan         | P0       | 0.5d   | CI           | ✅ Zero high/critical vulnerabilities                          |
| Add `.env.example` with documentation | P2       | 0.5d   | None         | ✅ All env vars documented                                     |
| API key storage audit                 | P1       | 1d     | None         | ✅ No plaintext API keys in SQLite                             |

#### 0.6 — Design Token Documentation

| Item                                         | Priority | Effort | Dependencies | Acceptance Criteria                                       |
| -------------------------------------------- | -------- | ------ | ------------ | --------------------------------------------------------- |
| Extract design tokens to JSON/TS file        | P2       | 1d     | None         | ✅ Single source of truth for colors, spacing, typography |
| Set up Storybook 8                           | P2       | 2d     | None         | ✅ `bun run storybook` launches component browser         |
| Document 20 core components in Storybook     | P2       | 3d     | Storybook    | ✅ Props, variants, usage examples for each               |
| Add Chromatic or Percy for visual regression | P3       | 1d     | Storybook    | ✅ Visual diff on PRs                                     |

#### 0.7 — Code Splitting & Bundle Optimization

| Item                                       | Priority | Effort | Dependencies | Acceptance Criteria                       |
| ------------------------------------------ | -------- | ------ | ------------ | ----------------------------------------- |
| Implement route-based code splitting       | P1       | 1d     | None         | ✅ Settings, Team, Cron pages lazy-loaded |
| Analyze bundle with `vite-bundle-analyzer` | P1       | 0.5d   | None         | ✅ Bundle report generated                |
| Tree-shake unused Arco components          | P2       | 1d     | Analysis     | ✅ 20%+ reduction in renderer bundle      |
| Optimize i18n loading (load per-module)    | P2       | 1d     | None         | ✅ Only active module translations loaded |

**Phase 0 Summary:**

| Metric                         | Target            |
| ------------------------------ | ----------------- |
| Test coverage                  | ≥ 80%             |
| i18n completeness (fr-FR)      | 100%              |
| WCAG violations (critical)     | 0                 |
| CI pipeline                    | Fully operational |
| Security audit findings (high) | 0                 |
| Bundle size reduction          | ≥ 15%             |

---

### Phase 1 — Core M&A Intelligence (Weeks 4–8)

> **Theme:** _Give Largo its M&A brain._  
> **Largo Philosophy:** `[Chaleur]` — Warm, knowledgeable assistance that speaks the language of French dealmakers.

#### 1.1 — SIRENE API MCP Server

| Item                                      | Priority | Effort | Dependencies     | Acceptance Criteria                                               |
| ----------------------------------------- | -------- | ------ | ---------------- | ----------------------------------------------------------------- |
| Design MCP server interface for SIRENE v3 | P0       | 1d     | MCP SDK          | ✅ OpenAPI spec for all endpoints                                 |
| Implement company search by SIREN/SIRET   | P0       | 2d     | Interface        | ✅ Search returns _raison sociale_, address, NAF code, _effectif_ |
| Implement establishment lookup            | P0       | 1d     | Search           | ✅ All _établissements_ for a given SIREN                         |
| Implement legal event history             | P1       | 1d     | Search           | ✅ _Modifications statutaires_, _immatriculation_, _radiation_    |
| Add rate limiting and caching (SQLite)    | P0       | 1d     | DB               | ✅ Respects INSEE rate limits; caches for 24h                     |
| Add i18n for error messages (fr-FR)       | P1       | 0.5d   | i18n `ma` module | ✅ All errors in French                                           |
| Write integration tests                   | P0       | 1d     | Server           | ✅ 15+ tests with mocked API responses                            |
| Document in `docs/mcp-servers/sirene.md`  | P2       | 0.5d   | Server           | ✅ Setup guide with API key instructions                          |

> The SIRENE (_Système d'Identification du Répertoire des Entreprises_) database is the authoritative source for French company registration data, maintained by INSEE.

#### 1.2 — Pappers API MCP Server

| Item                                     | Priority | Effort | Dependencies | Acceptance Criteria                                                                  |
| ---------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------------------------------------------ |
| Design MCP server interface for Pappers  | P0       | 1d     | MCP SDK      | ✅ OpenAPI spec covering company, financial, legal endpoints                         |
| Implement company profile retrieval      | P0       | 2d     | Interface    | ✅ Full profile: _dirigeants_, _bénéficiaires effectifs_, capital, _forme juridique_ |
| Implement financial data extraction      | P0       | 2d     | Interface    | ✅ _Bilan_, _compte de résultat_, ratios for last 5 years                            |
| Implement _actes et statuts_ retrieval   | P1       | 1d     | Interface    | ✅ Download _Kbis_, _statuts_, _PV d'AG_                                             |
| Implement _procédures collectives_ check | P0       | 1d     | Interface    | ✅ _Redressement judiciaire_, _liquidation_, _sauvegarde_ status                     |
| Implement _dirigeant_ network mapping    | P2       | 2d     | Company      | ✅ All companies linked to a given _dirigeant_                                       |
| Add caching layer with TTL               | P1       | 1d     | DB           | ✅ Financial data cached 7 days; company data 24h                                    |
| Write integration tests                  | P0       | 1d     | Server       | ✅ 20+ tests with mocked responses                                                   |

#### 1.3 — Enhanced Valuation Engine

| Item                                                   | Priority | Effort | Dependencies       | Acceptance Criteria                                          |
| ------------------------------------------------------ | -------- | ------ | ------------------ | ------------------------------------------------------------ |
| Design valuation data model                            | P0       | 1d     | DB                 | ✅ Schema for inputs, assumptions, outputs                   |
| Implement DCF (_Flux de trésorerie actualisés_)        | P0       | 3d     | Model              | ✅ 5-year projection with WACC calculation                   |
| Implement multiples valuation (_Comparables_)          | P0       | 2d     | Model              | ✅ EV/EBITDA, EV/Revenue, P/E with sector benchmarks         |
| Implement asset-based valuation (_Actif net réévalué_) | P1       | 2d     | Model              | ✅ ANR calculation from balance sheet                        |
| Implement _règle du pouce_ (rule of thumb)             | P2       | 1d     | Model              | ✅ Sector-specific multipliers (e.g., × CA for _pharmacies_) |
| Build valuation summary view (React)                   | P0       | 2d     | Engine             | ✅ Side-by-side comparison of methods with range             |
| Add sensitivity analysis                               | P1       | 1.5d   | DCF                | ✅ Tornado chart for WACC, growth rate, terminal value       |
| Export valuation to Excel template                     | P1       | 1d     | Engine + OfficeCLI | ✅ Formatted .xlsx with assumptions and calculations         |
| Write unit tests for each method                       | P0       | 2d     | Engine             | ✅ 30+ tests with known-answer test cases                    |

> `[Raffinement]` — Valuations must be precise, auditable, and beautifully formatted.

#### 1.4 — M&A Terminology Database

| Item                                      | Priority | Effort | Dependencies  | Acceptance Criteria                                              |
| ----------------------------------------- | -------- | ------ | ------------- | ---------------------------------------------------------------- |
| Curate French M&A glossary (300+ terms)   | P1       | 2d     | None          | ✅ JSON/SQLite with FR definition, EN translation, usage example |
| Integrate glossary into assistant context | P1       | 1d     | Glossary      | ✅ Assistants use correct French M&A terminology                 |
| Add glossary lookup tool (MCP)            | P2       | 1d     | Glossary      | ✅ User can ask "Qu'est-ce qu'un _earn-out_ ?"                   |
| Add hover tooltips in chat for M&A terms  | P3       | 2d     | Glossary + UI | ✅ Highlighted terms show definition on hover                    |

#### 1.5 — Company Profile Aggregator

| Item                                  | Priority | Effort | Dependencies     | Acceptance Criteria                                    |
| ------------------------------------- | -------- | ------ | ---------------- | ------------------------------------------------------ |
| Design unified company profile schema | P0       | 1d     | SIRENE + Pappers | ✅ TypeScript type combining both data sources         |
| Build merge logic (SIRENE + Pappers)  | P0       | 2d     | Schema           | ✅ Single profile with source attribution              |
| Create company profile card component | P1       | 2d     | Schema + UI      | ✅ Visual card with logo, key financials, _dirigeants_ |
| Add company comparison view           | P2       | 2d     | Card             | ✅ Side-by-side comparison of 2–4 companies            |
| Implement company search page         | P0       | 2d     | Aggregator       | ✅ Search by name, SIREN, sector, region               |

> `[Fraîcheur]` — Company profiles should feel fresh and alive, not like static database records.

#### 1.6 — Sector Intelligence Module

| Item                                             | Priority | Effort | Dependencies         | Acceptance Criteria                                       |
| ------------------------------------------------ | -------- | ------ | -------------------- | --------------------------------------------------------- |
| Define sector taxonomy (NAF codes → M&A sectors) | P1       | 1d     | None                 | ✅ Mapping of NAF rev.2 codes to 30 M&A sectors           |
| Build sector overview page                       | P2       | 2d     | Taxonomy             | ✅ Key metrics, recent transactions, multiples per sector |
| Integrate sector data into valuation             | P1       | 1d     | Valuation + Taxonomy | ✅ Auto-suggest sector multiples in valuation engine      |
| Add sector-specific prompt templates             | P2       | 1d     | Taxonomy             | ✅ Assistant adapts language to sector context            |

#### 1.7 — Observability Setup

| Item                                  | Priority | Effort | Dependencies | Acceptance Criteria                            |
| ------------------------------------- | -------- | ------ | ------------ | ---------------------------------------------- |
| Integrate Sentry SDK (opt-in)         | P1       | 1d     | None         | ✅ Crash reports with source maps              |
| Add OpenTelemetry for AI call tracing | P2       | 2d     | None         | ✅ Latency spans for each AI provider call     |
| Add PostHog analytics (opt-in)        | P3       | 1d     | None         | ✅ Feature usage tracking; user can disable    |
| Add performance monitoring dashboard  | P2       | 1d     | Sentry/OTel  | ✅ Startup time, memory, query latency visible |

**Phase 1 Summary:**

| Metric                       | Target                                 |
| ---------------------------- | -------------------------------------- |
| MCP servers operational      | 2 (SIRENE, Pappers)                    |
| Valuation methods            | 4 (DCF, multiples, ANR, rule of thumb) |
| M&A terms in glossary        | 300+                                   |
| Company profile completeness | SIRENE + Pappers merged                |
| New test count               | 65+                                    |

---

### Phase 2 — Document Automation (Weeks 9–12)

> **Theme:** _Turn hours of document preparation into minutes._  
> **Largo Philosophy:** `[Raffinement]` — Every document Largo generates must be indistinguishable from one crafted by a senior _banquier d'affaires_.

#### 2.1 — NDA Template Generator (_Accord de Confidentialité_)

| Item                                                         | Priority | Effort | Dependencies | Acceptance Criteria                          |
| ------------------------------------------------------------ | -------- | ------ | ------------ | -------------------------------------------- |
| Design NDA data model (parties, scope, duration)             | P0       | 1d     | None         | ✅ Zod schema for all NDA fields             |
| Create 3 NDA templates (unilateral, bilateral, _standstill_) | P0       | 2d     | Model        | ✅ Word templates with variable placeholders |
| Build NDA wizard UI (step-by-step form)                      | P0       | 2d     | Model + UI   | ✅ Guided form with French legal defaults    |
| AI-assisted clause customization                             | P1       | 1.5d   | Wizard + AI  | ✅ User can ask to modify specific clauses   |
| Add NDA to assistant preset toolbox                          | P1       | 0.5d   | Wizard       | ✅ "Génère un NDA pour..." triggers wizard   |
| Write tests for template rendering                           | P0       | 1d     | Templates    | ✅ All 3 templates render correctly          |

> `[Chaleur]` — Legal documents should feel approachable, not intimidating. The wizard guides users warmly through each decision.

#### 2.2 — Teaser / Blind Profile Generator (_Teaser / Profil Anonymisé_)

| Item                                    | Priority | Effort | Dependencies    | Acceptance Criteria                                                       |
| --------------------------------------- | -------- | ------ | --------------- | ------------------------------------------------------------------------- |
| Design teaser data model                | P0       | 1d     | Company Profile | ✅ Schema: sector, size, geography, key financials, investment highlights |
| Create teaser Word template (2–3 pages) | P0       | 2d     | Model           | ✅ Professional layout with Largo branding option                         |
| Build teaser generation flow            | P0       | 2d     | Model + AI      | ✅ AI drafts teaser from company profile data                             |
| Auto-anonymization engine               | P0       | 1.5d   | Company Profile | ✅ Replace company name, _dirigeants_, addresses with generic labels      |
| Create teaser PDF export                | P1       | 1d     | Word template   | ✅ High-quality PDF from Word template                                    |
| Add teaser to conversation flow         | P1       | 1d     | Generation      | ✅ "Crée un teaser pour [société]" works in chat                          |

#### 2.3 — Information Memorandum Builder (_Mémorandum d'Information_)

| Item                                          | Priority | Effort | Dependencies   | Acceptance Criteria                                      |
| --------------------------------------------- | -------- | ------ | -------------- | -------------------------------------------------------- |
| Design IM structure (12 standard sections)    | P0       | 1d     | None           | ✅ Schema covering all standard IM sections              |
| Create IM Word template (40–60 pages)         | P0       | 3d     | Structure      | ✅ Professional template with TOC, headers, page numbers |
| Build section-by-section AI drafting          | P0       | 3d     | Template + AI  | ✅ Each section drafted from company data + AI           |
| Integrate financial tables from Pappers       | P1       | 2d     | Pappers MCP    | ✅ Auto-populated financial summary tables               |
| Add chart generation (revenue, EBITDA trends) | P1       | 2d     | Financial data | ✅ Embedded charts in Word document                      |
| Review/edit workflow for each section         | P1       | 2d     | Draft          | ✅ User can review, edit, regenerate per section         |
| Export to Word + PDF                          | P0       | 1d     | Template       | ✅ Both formats available                                |

**Standard IM Sections:**

1. _Avertissement_ (Disclaimer)
2. _Résumé exécutif_ (Executive Summary)
3. _Présentation de la société_ (Company Overview)
4. _Historique_ (History)
5. _Produits et services_ (Products & Services)
6. _Marché et concurrence_ (Market & Competition)
7. _Organisation et ressources humaines_ (Organization & HR)
8. _Analyse financière_ (Financial Analysis)
9. _Actifs_ (Assets)
10. _Perspectives_ (Outlook)
11. _Modalités de la cession_ (Transaction Terms)
12. _Annexes_ (Appendices)

#### 2.4 — Valuation Report Generator (_Rapport de Valorisation_)

| Item                               | Priority | Effort | Dependencies      | Acceptance Criteria                              |
| ---------------------------------- | -------- | ------ | ----------------- | ------------------------------------------------ |
| Design report structure            | P0       | 1d     | Valuation Engine  | ✅ Schema with methodology, assumptions, results |
| Create report Word template        | P0       | 2d     | Structure         | ✅ Professional layout with tables, charts       |
| Integrate valuation engine outputs | P0       | 1.5d   | Template + Engine | ✅ All 4 methods with cross-reference            |
| Add sensitivity analysis charts    | P1       | 1d     | Sensitivity       | ✅ Tornado + scenario charts embedded            |
| Add football field chart           | P1       | 1d     | All methods       | ✅ Visual range comparison of all methods        |
| Export to Excel + Word + PDF       | P0       | 1d     | Template          | ✅ All three formats available                   |

#### 2.5 — LOI / Offer Letter Templates (_Lettre d'Intention_)

| Item                                          | Priority | Effort | Dependencies | Acceptance Criteria                                     |
| --------------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------------- |
| Design LOI data model                         | P1       | 1d     | None         | ✅ Zod schema: price, conditions, timeline, exclusivity |
| Create 2 LOI templates (binding, non-binding) | P1       | 1.5d   | Model        | ✅ French legal format with standard clauses            |
| Build LOI wizard UI                           | P1       | 1.5d   | Model        | ✅ Step-by-step form pre-filled from deal data          |
| AI clause suggestion engine                   | P2       | 1d     | Wizard       | ✅ Suggest clauses based on deal type and size          |

#### 2.6 — Due Diligence Checklist Generator

| Item                                         | Priority | Effort | Dependencies   | Acceptance Criteria                                        |
| -------------------------------------------- | -------- | ------ | -------------- | ---------------------------------------------------------- |
| Curate DD checklist templates (6 categories) | P1       | 2d     | None           | ✅ Financial, legal, tax, HR, IT, environmental checklists |
| Build checklist management UI                | P1       | 2d     | Templates      | ✅ Checkable items with status tracking                    |
| AI-powered checklist customization           | P2       | 1d     | Templates + AI | ✅ Add/remove items based on deal specifics                |
| Generate DD request list (Word)              | P1       | 1d     | Checklist      | ✅ Exportable document for target company                  |
| Progress tracking dashboard                  | P2       | 1.5d   | Checklist      | ✅ Visual completion percentage per category               |

**Phase 2 UI/UX Improvements:**

| Improvement            | Description                              | Philosophy                                          |
| ---------------------- | ---------------------------------------- | --------------------------------------------------- |
| Document preview pane  | Real-time preview of generated documents | `[Respiration]` — See the result before committing  |
| Template gallery       | Visual grid of available templates       | `[Fraîcheur]` — Fresh, browsable template selection |
| Version history        | Track revisions of generated documents   | `[Raffinement]` — Every iteration preserved         |
| Drag-and-drop sections | Reorder IM sections by dragging          | `[Respiration]` — Effortless reorganization         |

**Phase 2 Summary:**

| Metric                       | Target                                    |
| ---------------------------- | ----------------------------------------- |
| Document templates           | 12+ (NDA, teaser, IM, valuation, LOI, DD) |
| AI-assisted generation flows | 6                                         |
| Export formats               | Word, Excel, PDF                          |
| New tests                    | 40+                                       |

---

### Phase 3 — Communication & CRM (Weeks 13–17)

> **Theme:** _Connect Largo to the deal-maker's communication ecosystem._  
> **Largo Philosophy:** `[Chaleur]` — Communication is inherently warm; Largo should enhance human connection, not replace it.

#### 3.1 — WhatsApp Gateway (Baileys MCP)

| Item                                     | Priority | Effort | Dependencies | Acceptance Criteria                               |
| ---------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------- |
| Design WhatsApp MCP server using Baileys | P1       | 1d     | MCP SDK      | ✅ Interface for send/receive/list contacts       |
| Implement message sending (text, file)   | P1       | 2d     | Design       | ✅ Send text and PDF attachments                  |
| Implement message receiving (webhook)    | P1       | 2d     | Design       | ✅ Incoming messages routed to conversation       |
| Build WhatsApp contact picker UI         | P1       | 1d     | API          | ✅ Search and select contacts from WhatsApp       |
| Add "Share via WhatsApp" for documents   | P2       | 1d     | Send + Docs  | ✅ One-click share of generated PDFs              |
| Handle QR code authentication flow       | P0       | 1d     | Baileys      | ✅ Smooth QR scan setup in Largo                  |
| Add rate limiting and retry logic        | P1       | 1d     | API          | ✅ Respect WhatsApp rate limits; retry on failure |
| Write integration tests (mocked)         | P1       | 1d     | API          | ✅ 10+ tests for send/receive flows               |

#### 3.2 — Email Integration (IMAP/SMTP MCP)

| Item                                     | Priority | Effort | Dependencies | Acceptance Criteria                              |
| ---------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------ |
| Design email MCP server (IMAP + SMTP)    | P1       | 1d     | MCP SDK      | ✅ Interface for read/send/search/folders        |
| Implement email sending with attachments | P1       | 2d     | Design       | ✅ Send emails with generated documents attached |
| Implement inbox reading and search       | P2       | 2d     | Design       | ✅ Search by sender, subject, date range         |
| Build email compose UI in Largo          | P2       | 2d     | Send API     | ✅ Rich text editor with template support        |
| AI-assisted email drafting               | P2       | 1d     | Compose      | ✅ "Draft a follow-up email to..." works         |
| Email thread tracking per deal           | P3       | 1.5d   | Read + Deals | ✅ Emails linked to deal records                 |

#### 3.3 — Pipedrive CRM Sync

| Item                                       | Priority | Effort | Dependencies | Acceptance Criteria                                |
| ------------------------------------------ | -------- | ------ | ------------ | -------------------------------------------------- |
| Design Pipedrive MCP server                | P1       | 1d     | MCP SDK      | ✅ Interface for deals, contacts, activities       |
| Implement deal sync (bidirectional)        | P1       | 2d     | Design       | ✅ Largo deals ↔ Pipedrive deals sync              |
| Implement contact sync                     | P1       | 1.5d   | Design       | ✅ Largo contacts ↔ Pipedrive persons sync         |
| Implement activity logging                 | P2       | 1d     | Deal sync    | ✅ Largo actions create Pipedrive activities       |
| Build CRM connection setup wizard          | P1       | 1d     | API          | ✅ API key entry, test connection, initial sync    |
| Handle conflict resolution                 | P2       | 1.5d   | Sync         | ✅ Last-write-wins with manual conflict UI         |
| Add webhook listener for real-time updates | P2       | 1d     | Sync         | ✅ Pipedrive changes reflected in Largo within 30s |

#### 3.4 — Contact Management

| Item                                       | Priority | Effort | Dependencies  | Acceptance Criteria                                       |
| ------------------------------------------ | -------- | ------ | ------------- | --------------------------------------------------------- |
| Design contact data model                  | P0       | 1d     | DB            | ✅ Schema: name, company, role, phone, email, tags, notes |
| Build contact list view with search/filter | P0       | 2d     | Model         | ✅ Searchable, filterable contact directory               |
| Build contact detail view                  | P1       | 1.5d   | List          | ✅ Full profile with interaction history                  |
| Import contacts from CSV/vCard             | P1       | 1d     | Model         | ✅ Bulk import with duplicate detection                   |
| Link contacts to deals                     | P0       | 1d     | Model + Deals | ✅ Many-to-many relationship with roles                   |
| Contact activity timeline                  | P2       | 1.5d   | Detail        | ✅ Chronological view of all interactions                 |

> `[Respiration]` — The contact view should breathe, showing only what's relevant with progressive disclosure.

#### 3.5 — Deal Pipeline Tracker

| Item                            | Priority | Effort | Dependencies | Acceptance Criteria                                                                                |
| ------------------------------- | -------- | ------ | ------------ | -------------------------------------------------------------------------------------------------- |
| Design deal stages model        | P0       | 1d     | DB           | ✅ Configurable stages: _Origination_ → _Teaser_ → _NDA_ → _IM_ → _LOI_ → _DD_ → _SPA_ → _Closing_ |
| Build Kanban board view         | P0       | 3d     | Model        | ✅ Drag-and-drop deal cards across stages                                                          |
| Build deal detail view          | P0       | 2d     | Model        | ✅ Full deal record with linked documents, contacts, activities                                    |
| Add stage transition automation | P1       | 1.5d   | Kanban       | ✅ Auto-suggest next actions per stage                                                             |
| Deal timeline/history view      | P2       | 1.5d   | Detail       | ✅ Chronological record of all deal events                                                         |
| Pipeline value summary          | P1       | 1d     | Kanban       | ✅ Total deal value per stage                                                                      |

#### 3.6 — Meeting Prep Assistant

| Item                              | Priority | Effort | Dependencies                | Acceptance Criteria                                                        |
| --------------------------------- | -------- | ------ | --------------------------- | -------------------------------------------------------------------------- |
| Calendar integration (ICS/CalDAV) | P2       | 2d     | None                        | ✅ Read upcoming meetings from calendar                                    |
| Auto-generate meeting briefs      | P2       | 2d     | Calendar + Contacts + Deals | ✅ Brief includes attendee profiles, deal status, suggested talking points |
| Post-meeting note capture         | P2       | 1.5d   | Meetings                    | ✅ Structured note template with action items                              |
| Action item tracking              | P3       | 1d     | Notes                       | ✅ Action items linked to deals and contacts                               |

**Phase 3 Summary:**

| Metric                   | Target                         |
| ------------------------ | ------------------------------ |
| Communication channels   | 3 (WhatsApp, Email, CRM)       |
| Contact records capacity | 10,000+                        |
| Deal pipeline stages     | 8 configurable                 |
| New MCP servers          | 3 (WhatsApp, Email, Pipedrive) |
| New tests                | 50+                            |

---

### Phase 4 — Advanced Analytics (Weeks 18–22)

> **Theme:** _Transform raw data into strategic intelligence._  
> **Largo Philosophy:** `[Fraîcheur]` — Data should feel alive and current, never stale.

#### 4.1 — M&A Dashboard with KPIs

| Item                                 | Priority | Effort | Dependencies     | Acceptance Criteria                                     |
| ------------------------------------ | -------- | ------ | ---------------- | ------------------------------------------------------- |
| Design dashboard layout (responsive) | P0       | 1d     | None             | ✅ Wireframes approved; mobile-friendly                 |
| Implement deal funnel widget         | P0       | 2d     | Pipeline         | ✅ Visual funnel: deals per stage with conversion rates |
| Implement revenue forecast widget    | P1       | 1.5d   | Pipeline         | ✅ Projected fee income by close date                   |
| Implement activity heatmap           | P2       | 1d     | Contacts + Deals | ✅ Calendar heatmap of deal activity                    |
| Implement _mandats_ expiry tracker   | P1       | 1d     | Deals            | ✅ Upcoming _mandat_ expirations with alerts            |
| Add customizable widget layout       | P2       | 2d     | All widgets      | ✅ Drag-and-drop dashboard customization                |
| Add date range filters               | P1       | 1d     | Dashboard        | ✅ Filter all widgets by date range                     |

#### 4.2 — Deal Flow Analytics

| Item                            | Priority | Effort | Dependencies  | Acceptance Criteria                                          |
| ------------------------------- | -------- | ------ | ------------- | ------------------------------------------------------------ |
| Average time-per-stage analysis | P1       | 1.5d   | Pipeline      | ✅ Bar chart showing avg days per stage                      |
| Win/loss analysis by sector     | P1       | 1.5d   | Pipeline      | ✅ Success rate breakdown by NAF sector                      |
| Source attribution tracking     | P2       | 1d     | Pipeline      | ✅ Track deal origination source (referral, direct, network) |
| Seasonal trend analysis         | P3       | 1d     | Pipeline      | ✅ Monthly deal volume trends over time                      |
| Export analytics to PowerPoint  | P2       | 1.5d   | All analytics | ✅ One-click presentation export of dashboard                |

#### 4.3 — Comparable Transactions Database

| Item                                         | Priority | Effort | Dependencies | Acceptance Criteria                                          |
| -------------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------------------ |
| Design _comparables_ data model              | P0       | 1d     | DB           | ✅ Schema: date, buyer, target, sector, EV, EBITDA, multiple |
| Build manual transaction entry form          | P0       | 1.5d   | Model        | ✅ Quick-add form for new transactions                       |
| Implement search and filter                  | P0       | 1.5d   | Model        | ✅ Filter by sector, date, size, geography                   |
| AI-assisted transaction extraction from text | P2       | 2d     | Model + AI   | ✅ Paste news article → extract transaction details          |
| Integration with public M&A databases        | P3       | 3d     | Model        | ✅ Import from CFNEWS, MergerMarket (where permitted)        |
| Build _comparables_ table view               | P0       | 1.5d   | Search       | ✅ Sortable table with quartile statistics                   |
| Link _comparables_ to valuation engine       | P1       | 1d     | Valuation    | ✅ Auto-populate multiples from _comparables_ DB             |

#### 4.4 — Market Intelligence Feeds

| Item                             | Priority | Effort | Dependencies     | Acceptance Criteria                                        |
| -------------------------------- | -------- | ------ | ---------------- | ---------------------------------------------------------- |
| Design feed ingestion framework  | P1       | 1d     | None             | ✅ Plugin-based feed reader architecture                   |
| Implement RSS/Atom feed reader   | P1       | 1.5d   | Framework        | ✅ Subscribe to M&A news sources (CFNEWS, Les Echos, etc.) |
| AI-powered article summarization | P1       | 1.5d   | Feed reader + AI | ✅ Auto-summarize articles with relevance score            |
| Keyword-based alert system       | P1       | 1d     | Feed reader      | ✅ Alert on specific company names, sectors, keywords      |
| Feed management UI               | P2       | 1.5d   | Feeds            | ✅ Add/remove/configure feed sources                       |
| Integration with cron system     | P1       | 0.5d   | Feeds + Cron     | ✅ Scheduled feed checks (configurable interval)           |

#### 4.5 — M&A Daily Watch (_Veille Quotidienne_)

| Item                                            | Priority | Effort | Dependencies         | Acceptance Criteria                                       |
| ----------------------------------------------- | -------- | ------ | -------------------- | --------------------------------------------------------- |
| Design daily brief template                     | P0       | 1d     | Feeds                | ✅ Structured brief: top stories, new deals, sector moves |
| Implement automated brief generation (cron)     | P0       | 2d     | Template + Cron + AI | ✅ Daily brief generated at configurable time             |
| Build brief viewer page                         | P1       | 1.5d   | Brief                | ✅ Clean, readable daily brief with source links          |
| Add brief delivery (email, in-app notification) | P2       | 1d     | Brief + Email        | ✅ Brief sent via configured channel                      |
| Watchlist management (companies, sectors)       | P1       | 1d     | Feeds                | ✅ User manages watched entities                          |

> `[Respiration]` — The daily brief should be calm and digestible, not an overwhelming firehose.

#### 4.6 — Custom Reporting Engine

| Item                                        | Priority | Effort | Dependencies | Acceptance Criteria                                    |
| ------------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------------ |
| Design report builder interface             | P2       | 2d     | None         | ✅ Drag-and-drop report sections                       |
| Implement data source connectors            | P2       | 2d     | All data     | ✅ Pull from deals, contacts, _comparables_, analytics |
| Add chart builder (bar, line, pie, scatter) | P2       | 2d     | Data         | ✅ Interactive chart configuration                     |
| Export to Word, Excel, PowerPoint, PDF      | P1       | 1.5d   | Builder      | ✅ All four formats supported                          |
| Save and share report templates             | P3       | 1d     | Builder      | ✅ Template library for recurring reports              |

**Phase 4 Summary:**

| Metric                 | Target                    |
| ---------------------- | ------------------------- |
| Dashboard widgets      | 7+                        |
| Analytics views        | 5+                        |
| Feed sources supported | 10+                       |
| _Comparables_ capacity | 10,000+ transactions      |
| Report export formats  | 4 (Word, Excel, PPT, PDF) |
| New tests              | 45+                       |

---

### Phase 5 — Enterprise & Compliance (Weeks 23–27)

> **Theme:** _Make Largo enterprise-ready with security, compliance, and multi-user support._  
> **Largo Philosophy:** `[Raffinement]` — Enterprise features must be as polished as consumer ones.

#### 5.1 — Multi-User Support with RBAC

| Item                                   | Priority | Effort | Dependencies | Acceptance Criteria                                      |
| -------------------------------------- | -------- | ------ | ------------ | -------------------------------------------------------- |
| Design RBAC model (roles, permissions) | P0       | 1d     | DB           | ✅ Admin, Partner, Analyst, Read-Only roles              |
| Implement user management UI           | P0       | 2d     | Model        | ✅ Invite, activate, deactivate users                    |
| Implement permission enforcement       | P0       | 2d     | Model        | ✅ All API endpoints and UI elements respect permissions |
| Add team/department grouping           | P1       | 1.5d   | Users        | ✅ Group users by team with shared deal access           |
| Implement SSO (SAML 2.0 / OIDC)        | P2       | 3d     | Users        | ✅ Enterprise SSO provider integration                   |
| Add user activity dashboard            | P2       | 1.5d   | Users        | ✅ Admin can see who accessed what                       |

**Roles Matrix:**

| Permission         | Admin | Partner | Analyst  | Read-Only     |
| ------------------ | ----- | ------- | -------- | ------------- |
| Manage users       | ✅    | ❌      | ❌       | ❌            |
| Create deals       | ✅    | ✅      | ✅       | ❌            |
| Delete deals       | ✅    | ✅      | ❌       | ❌            |
| View all deals     | ✅    | ✅      | Own team | Assigned only |
| Generate documents | ✅    | ✅      | ✅       | ❌            |
| Manage settings    | ✅    | ❌      | ❌       | ❌            |
| View analytics     | ✅    | ✅      | ✅       | Own deals     |
| Export data        | ✅    | ✅      | ✅       | ❌            |

#### 5.2 — Audit Trail and Activity Logs

| Item                                | Priority | Effort | Dependencies | Acceptance Criteria                                         |
| ----------------------------------- | -------- | ------ | ------------ | ----------------------------------------------------------- |
| Design audit log schema             | P0       | 0.5d   | DB           | ✅ Schema: who, what, when, where, before/after values      |
| Implement write-ahead audit logging | P0       | 2d     | Schema       | ✅ All CRUD operations logged immutably                     |
| Build audit log viewer (admin)      | P0       | 1.5d   | Logging      | ✅ Searchable, filterable audit log with export             |
| Add data access logging             | P1       | 1d     | Logging      | ✅ Track who viewed which deal/document                     |
| Implement log retention policies    | P2       | 1d     | Logging      | ✅ Configurable retention (default: 7 years per French law) |
| Add compliance report generation    | P2       | 1.5d   | Logging      | ✅ Generate compliance report for auditors                  |

#### 5.3 — Virtual Data Room Integration

| Item                                  | Priority | Effort | Dependencies | Acceptance Criteria                            |
| ------------------------------------- | -------- | ------ | ------------ | ---------------------------------------------- |
| Design VDR folder structure template  | P1       | 1d     | DD Checklist | ✅ Standard M&A data room index                |
| Implement local VDR (folder-based)    | P1       | 2d     | Structure    | ✅ Structured folder with access tracking      |
| Build VDR browser UI                  | P1       | 2d     | Local VDR    | ✅ Tree view with drag-and-drop upload         |
| Add document watermarking             | P2       | 1.5d   | VDR          | ✅ Dynamic watermark with viewer name and date |
| Integrate with external VDR providers | P3       | 3d     | VDR          | ✅ API integration with Datasite, Intralinks   |
| Add Q&A module (buyer questions)      | P2       | 2d     | VDR          | ✅ Track and respond to buyer questions        |

#### 5.4 — Compliance Checking Module

| Item                                        | Priority | Effort | Dependencies | Acceptance Criteria                                   |
| ------------------------------------------- | -------- | ------ | ------------ | ----------------------------------------------------- |
| AML/KYC checklist builder                   | P1       | 2d     | Contacts     | ✅ Anti-money laundering checks per French regulation |
| _Autorité de la concurrence_ filing checker | P2       | 1.5d   | Deal data    | ✅ Auto-detect if merger notification required        |
| EU foreign subsidy regulation checker       | P3       | 1d     | Deal data    | ✅ Flag deals requiring FSR notification              |
| Sanctions screening (EU/UN lists)           | P1       | 2d     | Contacts     | ✅ Screen contacts against sanctions databases        |
| Compliance report generation                | P2       | 1d     | All checks   | ✅ Exportable compliance summary per deal             |

#### 5.5 — GDPR Data Handling Tools

| Item                                 | Priority | Effort | Dependencies | Acceptance Criteria                               |
| ------------------------------------ | -------- | ------ | ------------ | ------------------------------------------------- |
| Data inventory and mapping           | P0       | 1.5d   | DB           | ✅ Catalog of all personal data stored            |
| Right to erasure (_droit à l'oubli_) | P0       | 1.5d   | Inventory    | ✅ Delete all data for a given contact            |
| Data export (portability)            | P0       | 1d     | Inventory    | ✅ Export all data for a contact in JSON/CSV      |
| Consent management                   | P1       | 1.5d   | Contacts     | ✅ Track consent for each data processing purpose |
| Data retention automation            | P2       | 1d     | Inventory    | ✅ Auto-delete data past retention period         |
| Privacy impact assessment template   | P3       | 1d     | None         | ✅ PIA template for new feature assessments       |

#### 5.6 — Encryption & Data Protection

| Item                                       | Priority | Effort | Dependencies | Acceptance Criteria                                               |
| ------------------------------------------ | -------- | ------ | ------------ | ----------------------------------------------------------------- |
| SQLCipher integration for sensitive tables | P1       | 2d     | DB           | ✅ Deal and contact data encrypted at rest                        |
| OS keychain integration for API keys       | P0       | 1.5d   | None         | ✅ API keys stored in macOS Keychain / Windows Credential Manager |
| End-to-end encryption for team mode        | P2       | 3d     | Team         | ✅ Multi-agent messages encrypted in transit                      |
| Secure document storage                    | P1       | 1.5d   | VDR          | ✅ Generated documents encrypted at rest                          |

**Phase 5 Summary:**

| Metric              | Target                                       |
| ------------------- | -------------------------------------------- |
| RBAC roles          | 4 (Admin, Partner, Analyst, Read-Only)       |
| Audit log retention | 7 years (configurable)                       |
| GDPR tools          | 5 (erasure, export, consent, retention, PIA) |
| Compliance checks   | 4 (AML/KYC, competition, FSR, sanctions)     |
| New tests           | 50+                                          |

---

### Phase 6 — Production Launch (Weeks 28–30)

> **Theme:** _Ship it. Professionally._  
> **Largo Philosophy:** `[Raffinement]` — The launch must be as refined as the product itself.

#### 6.1 — Performance Optimization

| Item                                        | Priority | Effort | Dependencies | Acceptance Criteria                               |
| ------------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------- |
| Profile and optimize cold startup           | P0       | 2d     | None         | ✅ Cold start < 3s on M1 Mac                      |
| Optimize SQLite query performance           | P0       | 1.5d   | DB           | ✅ All queries < 50ms at 10k records              |
| Implement virtual scrolling for large lists | P1       | 1.5d   | None         | ✅ Smooth scroll with 50k+ messages               |
| Memory leak audit and fixes                 | P0       | 2d     | None         | ✅ Stable memory after 8h continuous use          |
| Optimize AI streaming performance           | P1       | 1d     | None         | ✅ No dropped frames during AI response streaming |
| Bundle size final optimization              | P1       | 1d     | None         | ✅ Renderer bundle < 2MB gzipped                  |

#### 6.2 — Security Pen Testing

| Item                              | Priority | Effort | Dependencies | Acceptance Criteria                     |
| --------------------------------- | -------- | ------ | ------------ | --------------------------------------- |
| Engage external pen test firm     | P0       | 1d     | —            | ✅ Pen test scheduled and scoped        |
| Electron-specific security review | P0       | 2d     | Phase 5      | ✅ All Electron attack vectors tested   |
| WebUI security review             | P0       | 1.5d   | Phase 5      | ✅ OWASP Top 10 verified                |
| Fix all critical/high findings    | P0       | 3d     | Pen test     | ✅ Zero critical/high issues remaining  |
| Remediation verification          | P0       | 1d     | Fixes        | ✅ Re-test confirms all fixes effective |

#### 6.3 — Load Testing (WebUI)

| Item                                   | Priority | Effort | Dependencies | Acceptance Criteria                                     |
| -------------------------------------- | -------- | ------ | ------------ | ------------------------------------------------------- |
| Design load test scenarios             | P1       | 0.5d   | None         | ✅ Scenarios for concurrent users, API calls, WebSocket |
| Implement load tests (k6 or Artillery) | P1       | 1.5d   | Scenarios    | ✅ Automated load test suite                            |
| Run baseline load test                 | P1       | 0.5d   | Tests        | ✅ Performance baseline established                     |
| Optimize bottlenecks                   | P1       | 2d     | Baseline     | ✅ 50 concurrent WebUI users supported                  |

#### 6.4 — Platform Distribution

| Item                                          | Priority | Effort | Dependencies | Acceptance Criteria                                   |
| --------------------------------------------- | -------- | ------ | ------------ | ----------------------------------------------------- |
| macOS code signing certificate                | P0       | 0.5d   | None         | ✅ Apple Developer certificate obtained               |
| macOS notarization pipeline                   | P0       | 1d     | Certificate  | ✅ Automated notarization in CI                       |
| Windows code signing certificate              | P0       | 0.5d   | None         | ✅ EV code signing certificate obtained               |
| Windows NSIS installer signing                | P0       | 1d     | Certificate  | ✅ Signed installer, no SmartScreen warning           |
| Linux packaging (AppImage, .deb, .rpm)        | P1       | 1.5d   | None         | ✅ All three formats built in CI                      |
| Auto-update infrastructure (Electron updater) | P0       | 2d     | All builds   | ✅ Seamless background updates with user notification |
| Update server (GitHub Releases or S3)         | P0       | 1d     | Auto-update  | ✅ Update feed served reliably                        |
| Homebrew cask formula                         | P2       | 0.5d   | macOS build  | ✅ `brew install --cask largo` works                  |

#### 6.5 — Documentation Finalization

| Item                               | Priority | Effort | Dependencies | Acceptance Criteria                            |
| ---------------------------------- | -------- | ------ | ------------ | ---------------------------------------------- |
| User manual (French)               | P0       | 3d     | All features | ✅ Complete guide covering all features        |
| Administrator guide                | P0       | 1.5d   | Enterprise   | ✅ Setup, configuration, user management guide |
| API documentation (TypeDoc)        | P1       | 1d     | Code         | ✅ Auto-generated from JSDoc comments          |
| Extension development guide        | P1       | 1.5d   | Extensions   | ✅ Step-by-step guide for extension authors    |
| Video tutorials (5 core workflows) | P2       | 3d     | User manual  | ✅ 5 tutorial videos covering key workflows    |
| Changelog and migration guide      | P0       | 0.5d   | All phases   | ✅ Clear upgrade path from v1.x                |

#### 6.6 — Beta Program

| Item                                     | Priority | Effort | Dependencies | Acceptance Criteria                          |
| ---------------------------------------- | -------- | ------ | ------------ | -------------------------------------------- |
| Beta tester recruitment (20–30 M&A pros) | P0       | 1d     | None         | ✅ Beta group assembled from target personas |
| Beta feedback collection system          | P0       | 1d     | None         | ✅ In-app feedback widget + survey           |
| Beta bug triage process                  | P0       | 0.5d   | Feedback     | ✅ SLA: critical bugs fixed in 24h           |
| Beta analytics dashboard                 | P1       | 1d     | PostHog      | ✅ Feature usage and error rates tracked     |
| Iterate on beta feedback (2 cycles)      | P0       | 4d     | Feedback     | ✅ Top 10 issues addressed per cycle         |

#### 6.7 — Production Release

| Item                          | Priority | Effort | Dependencies | Acceptance Criteria                            |
| ----------------------------- | -------- | ------ | ------------ | ---------------------------------------------- |
| Final QA pass (all platforms) | P0       | 2d     | All          | ✅ macOS, Windows, Linux, WebUI tested         |
| Release notes (FR + EN)       | P0       | 0.5d   | All          | ✅ Comprehensive release notes                 |
| Website launch page           | P1       | 2d     | None         | ✅ largo.fr product page live                  |
| Press kit preparation         | P2       | 1d     | None         | ✅ Screenshots, logos, description ready       |
| Launch announcement           | P1       | 0.5d   | All          | ✅ Published on LinkedIn, Twitter, ProductHunt |
| Post-launch monitoring (72h)  | P0       | 3d     | Launch       | ✅ Zero critical issues in first 72 hours      |

**Phase 6 Summary:**

| Metric                       | Target                       |
| ---------------------------- | ---------------------------- |
| Cold startup time            | < 3s                         |
| Security findings (critical) | 0                            |
| Platform support             | macOS, Windows, Linux, WebUI |
| Auto-update                  | Fully operational            |
| Beta feedback cycles         | 2+                           |
| Documentation pages          | 50+                          |

---

## 📅 Visual Timeline

```
2025
Week  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
      ├──────────┤
      │ PHASE 0  │
      │Foundation│
      │Hardening │
      ├──────────┼───────────────────┤
                 │     PHASE 1       │
                 │ Core M&A Intel    │
                 │ SIRENE · Pappers  │
                 │ Valuation Engine  │
                 ├───────────────────┼──────────────────┤
                                     │    PHASE 2       │
                                     │ Doc Automation   │
                                     │ NDA·Teaser·IM    │
                                     │ LOI·DD Checklist │
                                     ├──────────────────┼───────────────────────┤
                                                        │      PHASE 3         │
                                                        │ Communication & CRM  │
                                                        │ WhatsApp·Email·CRM   │
                                                        │ Pipeline Tracker     │
                                                        ├───────────────────────┼───────────────────────┤
                                                                                │      PHASE 4         │
                                                                                │ Advanced Analytics   │
                                                                                │ Dashboard·Feeds      │
                                                                                │ Comparables·Reports  │
                                                                                ├───────────────────────┤
                                                                                │      PHASE 5         │
                                                                                │ Enterprise/Compliance│
                                                                                │ RBAC·Audit·GDPR      │
                                                                                │ VDR·Encryption       │
                                                                                ├───────────────────────┼─────────┤
                                                                                                        │PHASE 6 │
                                                                                                        │Launch  │
                                                                                                        │Release │
                                                                                                        ├────────┤

Legend:
  ██ Phase 0: Foundation (Weeks 1–3)     ██ Phase 3: Communication (Weeks 13–17)
  ██ Phase 1: M&A Intel (Weeks 4–8)      ██ Phase 4: Analytics (Weeks 18–22)
  ██ Phase 2: Documents (Weeks 9–12)     ██ Phase 5: Enterprise (Weeks 23–27)
                                          ██ Phase 6: Launch (Weeks 28–30)
```

### Milestone Summary

| Milestone                     | Target Date | Key Deliverable                                          |
| ----------------------------- | ----------- | -------------------------------------------------------- |
| **M0: Foundation Complete**   | Week 3      | CI/CD operational, 80% test coverage, i18n verified      |
| **M1: M&A Alpha**             | Week 8      | SIRENE + Pappers MCP, valuation engine, company profiles |
| **M2: Document Automation**   | Week 12     | NDA, teaser, IM, valuation report generation             |
| **M3: Connected Workspace**   | Week 17     | WhatsApp, email, CRM integration, deal pipeline          |
| **M4: Intelligence Platform** | Week 22     | Dashboard, analytics, market feeds, daily watch          |
| **M5: Enterprise Ready**      | Week 27     | RBAC, audit trail, GDPR tools, data room                 |
| **M6: v2.0 GA Release**       | Week 30     | Signed builds, auto-update, documentation, launch        |

---

## 📱 Mobile Strategy

### Vision

The Largo mobile app (React Native/Expo) serves as a **companion** to the desktop experience — optimized for on-the-go deal monitoring, quick lookups, and communication, not full document generation.

### Maturation Roadmap

| Phase   | Feature                                     | Priority | Effort | Acceptance Criteria                            |
| ------- | ------------------------------------------- | -------- | ------ | ---------------------------------------------- |
| Phase 0 | Stabilize existing skeleton                 | P1       | 3d     | ✅ App builds and connects to desktop reliably |
| Phase 0 | Shared business logic via `packages/shared` | P1       | 2d     | ✅ Types and utils shared with desktop         |
| Phase 1 | Company lookup (SIRENE/Pappers)             | P0       | 3d     | ✅ Search and view company profiles on mobile  |
| Phase 1 | Push notifications for alerts               | P1       | 2d     | ✅ Receive M&A alerts on mobile                |
| Phase 2 | Document viewer (PDF/Word)                  | P1       | 2d     | ✅ View generated documents on mobile          |
| Phase 3 | Contact management                          | P1       | 3d     | ✅ View and edit contacts on mobile            |
| Phase 3 | Deal pipeline view                          | P1       | 2d     | ✅ View Kanban board on mobile                 |
| Phase 4 | Dashboard widgets (read-only)               | P2       | 2d     | ✅ Key KPIs on mobile home screen              |
| Phase 5 | Offline-first data sync                     | P2       | 4d     | ✅ Core data available without connection      |
| Phase 6 | App Store / Play Store submission           | P0       | 2d     | ✅ Published on both stores                    |

### Offline-First Architecture

```
┌─────────────────────────────────────┐
│           Mobile App                │
│  ┌──────────┐  ┌─────────────────┐ │
│  │  SQLite  │  │  Sync Engine    │ │
│  │  (local) │◄─┤  (background)   │ │
│  └──────────┘  └────────┬────────┘ │
│                          │          │
└──────────────────────────┼──────────┘
                           │ WebSocket / REST
                    ┌──────┴──────┐
                    │  Largo      │
                    │  Desktop /  │
                    │  WebUI      │
                    └─────────────┘
```

**Sync Strategy:**

- **Contacts & Deals:** Sync on connect, delta updates via WebSocket
- **Documents:** Download on demand, cache locally
- **Messages:** Sync last 100 per conversation, paginate on scroll
- **Settings:** Sync on connect, local-first for preferences

---

## 🧩 Extension Ecosystem

### Current State

Largo inherits AionUi's powerful extension system with 14 resolver types, sandboxed execution, and 23 built-in presets. The goal is to transform this into a thriving M&A-focused extension marketplace.

### Extension Marketplace Roadmap

| Phase   | Feature                       | Priority | Effort | Acceptance Criteria                                     |
| ------- | ----------------------------- | -------- | ------ | ------------------------------------------------------- |
| Phase 1 | Extension registry API        | P2       | 2d     | ✅ REST API for listing/searching extensions            |
| Phase 2 | In-app extension browser      | P1       | 3d     | ✅ Browse, install, update extensions from within Largo |
| Phase 3 | Extension publishing workflow | P2       | 2d     | ✅ Authors can submit extensions for review             |
| Phase 4 | Extension ratings and reviews | P3       | 2d     | ✅ Users can rate and review extensions                 |
| Phase 5 | Paid extensions support       | P3       | 3d     | ✅ Stripe integration for premium extensions            |
| Phase 6 | Extension analytics dashboard | P3       | 1.5d   | ✅ Authors see install counts, usage stats              |

### M&A Template Extensions (Priority)

| Extension         | Phase   | Description                                       |
| ----------------- | ------- | ------------------------------------------------- |
| `largo-sirene`    | Phase 1 | MCP server for INSEE SIRENE API                   |
| `largo-pappers`   | Phase 1 | MCP server for Pappers company data               |
| `largo-nda`       | Phase 2 | NDA template generator with French legal defaults |
| `largo-teaser`    | Phase 2 | Blind profile / teaser generator                  |
| `largo-im`        | Phase 2 | Information Memorandum builder                    |
| `largo-valuation` | Phase 1 | Multi-method valuation engine                     |
| `largo-whatsapp`  | Phase 3 | WhatsApp gateway via Baileys                      |
| `largo-pipedrive` | Phase 3 | Pipedrive CRM integration                         |
| `largo-veille`    | Phase 4 | Daily M&A watch / intelligence feeds              |
| `largo-dataroom`  | Phase 5 | Virtual data room management                      |

### Extension SDK Documentation

| Deliverable               | Phase   | Description                                              |
| ------------------------- | ------- | -------------------------------------------------------- |
| Extension authoring guide | Phase 2 | Step-by-step tutorial for creating extensions            |
| API reference (TypeDoc)   | Phase 2 | Auto-generated from extension interfaces                 |
| Example extensions (3+)   | Phase 2 | Starter templates for MCP server, skill, theme           |
| Extension testing guide   | Phase 3 | How to test extensions with Vitest                       |
| Security best practices   | Phase 3 | Sandbox constraints, permission model                    |
| Extension CLI tool        | Phase 4 | `largo-ext init`, `largo-ext build`, `largo-ext publish` |

### Community Contribution Guidelines

| Area             | Guideline                                               |
| ---------------- | ------------------------------------------------------- |
| Code of Conduct  | Contributor Covenant v2.1                               |
| License          | Extensions must be Apache-2.0 or MIT                    |
| Quality bar      | Minimum 70% test coverage, TypeScript strict mode       |
| i18n requirement | Must support fr-FR; other languages encouraged          |
| Review process   | All submissions reviewed within 5 business days         |
| Breaking changes | Semver required; deprecation period of 2 minor versions |

---

## ✨ Feature Improvements & Polish

### Per-Phase Polish Items

#### Phase 0 — Foundation Polish

| Area            | Improvement                              | Philosophy                                       |
| --------------- | ---------------------------------------- | ------------------------------------------------ |
| **UI/UX**       | Smooth page transition animations        | `[Respiration]` — Transitions should breathe     |
| **UI/UX**       | Loading skeleton screens for all pages   | `[Fraîcheur]` — Never show a blank page          |
| **Performance** | Preload critical assets in splash screen | `[Raffinement]` — Instant-feeling startup        |
| **DX**          | Hot module replacement reliability       | Developer productivity                           |
| **A11y**        | Focus management for modal dialogs       | `[Respiration]` — Keyboard users never feel lost |
| **i18n**        | Add number/date formatting per locale    | `[Chaleur]` — French date formats feel natural   |

#### Phase 1 — M&A Intelligence Polish

| Area            | Improvement                                    | Philosophy                                   |
| --------------- | ---------------------------------------------- | -------------------------------------------- |
| **UI/UX**       | Animated company profile cards                 | `[Fraîcheur]` — Data comes alive             |
| **UI/UX**       | Contextual tooltips for financial metrics      | `[Chaleur]` — Guide users through complexity |
| **Performance** | Background prefetch of frequent companies      | `[Raffinement]` — Anticipate user needs      |
| **DX**          | MCP server development hot-reload              | Developer productivity                       |
| **A11y**        | Screen reader announcements for search results | Inclusive design                             |
| **i18n**        | French number formatting (1 234 567,89 €)      | `[Chaleur]` — French conventions respected   |

#### Phase 2 — Document Polish

| Area            | Improvement                              | Philosophy                                      |
| --------------- | ---------------------------------------- | ----------------------------------------------- |
| **UI/UX**       | Live preview during document editing     | `[Respiration]` — See changes as you type       |
| **UI/UX**       | Template thumbnail previews              | `[Fraîcheur]` — Visual template browsing        |
| **Performance** | Incremental document rendering           | `[Raffinement]` — Render visible sections first |
| **DX**          | Template hot-reload during development   | Developer productivity                          |
| **A11y**        | Document structure navigation (headings) | Accessible document editing                     |
| **i18n**        | French legal clause library              | `[Chaleur]` — Authentic French legal language   |

#### Phase 3 — Communication Polish

| Area            | Improvement                          | Philosophy                                      |
| --------------- | ------------------------------------ | ----------------------------------------------- |
| **UI/UX**       | Unified notification center          | `[Respiration]` — One calm place for all alerts |
| **UI/UX**       | Contact avatar generation (initials) | `[Fraîcheur]` — Colorful, recognizable contacts |
| **Performance** | Message batching for WhatsApp        | `[Raffinement]` — Efficient communication       |
| **DX**          | CRM sync debug panel                 | Developer productivity                          |
| **A11y**        | Voice commands for quick actions     | Hands-free operation                            |
| **i18n**        | Email templates in all 9 languages   | Global reach                                    |

#### Phase 4 — Analytics Polish

| Area            | Improvement                              | Philosophy                                       |
| --------------- | ---------------------------------------- | ------------------------------------------------ |
| **UI/UX**       | Animated chart transitions               | `[Fraîcheur]` — Data visualizations that delight |
| **UI/UX**       | Dark mode chart optimization             | `[Respiration]` — Easy on the eyes in any mode   |
| **Performance** | Client-side data aggregation (WebWorker) | `[Raffinement]` — No UI jank during calculations |
| **DX**          | Chart component playground (Storybook)   | Developer productivity                           |
| **A11y**        | Chart data tables for screen readers     | Data accessibility                               |
| **i18n**        | Locale-aware chart axis formatting       | French conventions                               |

#### Phase 5 — Enterprise Polish

| Area            | Improvement                               | Philosophy                                      |
| --------------- | ----------------------------------------- | ----------------------------------------------- |
| **UI/UX**       | Admin dashboard with system health        | `[Raffinement]` — Enterprise-grade monitoring   |
| **UI/UX**       | Permission denied graceful handling       | `[Chaleur]` — Explain why, suggest alternatives |
| **Performance** | Pagination for audit logs (100k+ records) | Scale-ready                                     |
| **DX**          | RBAC testing utilities                    | Developer productivity                          |
| **A11y**        | Audit log export in accessible formats    | Compliance accessibility                        |
| **i18n**        | Legal compliance text in FR, EN           | Regulatory requirement                          |

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs) per Phase

#### Phase 0 — Foundation

| KPI                        | Target        | Measurement              |
| -------------------------- | ------------- | ------------------------ |
| Test coverage              | ≥ 80%         | Codecov report           |
| CI pass rate               | ≥ 95%         | GitHub Actions dashboard |
| Build time                 | ≤ 5 min       | CI pipeline timing       |
| i18n completeness (fr-FR)  | 100%          | `check-i18n.js` output   |
| WCAG violations (critical) | 0             | axe-core audit           |
| Bundle size (renderer)     | ≤ 3MB gzipped | `vite-bundle-analyzer`   |

#### Phase 1 — M&A Intelligence

| KPI                                     | Target               | Measurement          |
| --------------------------------------- | -------------------- | -------------------- |
| Company lookup latency (cached)         | < 200ms              | OpenTelemetry traces |
| Company lookup latency (API)            | < 2s                 | OpenTelemetry traces |
| Valuation calculation time              | < 500ms              | Benchmark test       |
| SIRENE API coverage                     | 100% of v3 endpoints | Integration tests    |
| Pappers API coverage                    | 80% of key endpoints | Integration tests    |
| User task completion (company research) | < 5 min              | User testing         |

#### Phase 2 — Document Automation

| KPI                             | Target               | Measurement       |
| ------------------------------- | -------------------- | ----------------- |
| NDA generation time             | < 30s                | Performance test  |
| Teaser generation time          | < 60s                | Performance test  |
| IM generation time              | < 5 min              | Performance test  |
| Document template accuracy      | ≥ 95%                | User review score |
| Export format fidelity          | 100% (no corruption) | Automated test    |
| User satisfaction (doc quality) | ≥ 4.0/5.0            | Beta survey       |

#### Phase 3 — Communication & CRM

| KPI                                 | Target  | Measurement            |
| ----------------------------------- | ------- | ---------------------- |
| WhatsApp message delivery rate      | ≥ 99%   | Integration monitoring |
| CRM sync latency                    | < 30s   | Sync timing            |
| Contact search latency              | < 100ms | Performance test       |
| Pipeline view load time             | < 1s    | Performance test       |
| Deal data consistency (Largo ↔ CRM) | 100%    | Reconciliation checks  |

#### Phase 4 — Advanced Analytics

| KPI                                 | Target  | Measurement         |
| ----------------------------------- | ------- | ------------------- |
| Dashboard load time                 | < 2s    | Performance test    |
| Feed processing time (100 articles) | < 60s   | Benchmark           |
| Daily brief generation time         | < 2 min | Cron job monitoring |
| _Comparables_ search latency        | < 500ms | Performance test    |
| Report export time                  | < 30s   | Performance test    |

#### Phase 5 — Enterprise & Compliance

| KPI                       | Target                  | Measurement      |
| ------------------------- | ----------------------- | ---------------- |
| RBAC enforcement coverage | 100% of endpoints       | Security audit   |
| Audit log write latency   | < 10ms overhead         | Performance test |
| GDPR erasure completion   | < 5s per contact        | Automated test   |
| Encryption overhead       | < 5% performance impact | Benchmark        |
| SSO login time            | < 3s                    | User testing     |

#### Phase 6 — Production Launch

| KPI                      | Target           | Measurement           |
| ------------------------ | ---------------- | --------------------- |
| Cold startup time        | < 3s             | Performance profiling |
| Auto-update success rate | ≥ 99%            | Update analytics      |
| Crash-free sessions      | ≥ 99.5%          | Sentry dashboard      |
| Beta NPS score           | ≥ 40             | Beta survey           |
| WebUI concurrent users   | ≥ 50             | Load test             |
| Documentation coverage   | 100% of features | Manual audit          |

### Quality Gates

Every phase must pass these gates before proceeding:

| Gate              | Criteria                                                |
| ----------------- | ------------------------------------------------------- |
| **Code Quality**  | Zero oxlint errors; zero TypeScript errors; oxfmt clean |
| **Test Coverage** | ≥ 80% for new code; no decrease in overall coverage     |
| **i18n**          | `check-i18n.js` passes; `bun run i18n:types` succeeds   |
| **Security**      | Zero high/critical vulnerabilities in dependencies      |
| **Performance**   | No regression > 10% on benchmarked operations           |
| **Accessibility** | Zero new critical a11y violations                       |
| **Documentation** | All new features documented; API docs generated         |
| **Review**        | All PRs reviewed by at least 1 maintainer               |

---

## ⚠️ Risk Assessment

### Technical Risks

| Risk                                | Probability | Impact   | Mitigation                                                                              |
| ----------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------- |
| **SIRENE API rate limits**          | High        | Medium   | Aggressive caching (24h TTL); batch requests; request queue with backoff                |
| **Pappers API cost escalation**     | Medium      | High     | Cache aggressively (7d financial data); offer BYO-key; negotiate volume pricing         |
| **Electron security vulnerability** | Medium      | Critical | Pin Electron version; monitor advisories; enable fuses; CSP headers                     |
| **SQLite performance at scale**     | Low         | High     | Indexes on hot paths; consider PostgreSQL for WebUI mode; benchmark at 100k records     |
| **AI model API breaking changes**   | Medium      | Medium   | Abstract behind provider interface; pin SDK versions; integration tests per provider    |
| **React 19 breaking changes**       | Low         | Medium   | Pin version; monitor React RFC; comprehensive component tests                           |
| **Extension sandbox escape**        | Low         | Critical | Security audit of sandbox; limit filesystem access; code review all built-in extensions |
| **Monorepo migration complexity**   | Medium      | Medium   | Incremental migration; keep fallback to single-package; migration guide                 |
| **WhatsApp (Baileys) instability**  | High        | Low      | Baileys is unofficial; have fallback to email-only; monitor for ToS changes             |
| **Cross-platform build failures**   | Medium      | Medium   | Test on all 3 platforms in CI; use electron-builder-action; matrix builds               |

### Market Risks

| Risk                                    | Probability | Impact | Mitigation                                                                |
| --------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------- |
| **Competitor launches AI M&A tool**     | High        | Medium | Focus on French-specific differentiators; move fast on Phases 1–2         |
| **French regulation changes (IA Act)**  | Medium      | Medium | Monitor EU AI Act implementation; maintain compliance documentation       |
| **AI model pricing increases**          | Medium      | High   | Multi-provider strategy; offer local model fallback (Ollama integration)  |
| **M&A market downturn reduces TAM**     | Low         | Medium | Expand to adjacent use cases (restructuring, _transmission d'entreprise_) |
| **Data source (Pappers) changes terms** | Low         | High   | Abstract behind MCP interface; maintain alternative data sources          |
| **User resistance to AI in M&A**        | Medium      | Medium | Emphasize human-in-the-loop; transparent AI; audit trail                  |

### Operational Risks

| Risk                          | Probability | Impact | Mitigation                                                            |
| ----------------------------- | ----------- | ------ | --------------------------------------------------------------------- |
| **Key developer departure**   | Medium      | High   | Document everything; pair programming; bus factor ≥ 2 per module      |
| **Scope creep in phases**     | High        | Medium | Strict phase gates; MVP per phase; defer P3 items aggressively        |
| **Beta feedback overwhelm**   | Medium      | Low    | Structured feedback categories; triage SLA; focus on P0 issues only   |
| **macOS notarization delays** | Low         | Medium | Submit early; maintain Apple Developer account; backup manual signing |

### Risk Monitoring

| Metric                         | Frequency             | Owner            | Escalation                               |
| ------------------------------ | --------------------- | ---------------- | ---------------------------------------- |
| Dependency vulnerability count | Daily (Dependabot)    | Engineering Lead | > 0 critical → immediate fix             |
| API rate limit usage           | Hourly (monitoring)   | Backend Lead     | > 80% → throttle + cache review          |
| Build failure rate             | Per PR (CI)           | All developers   | > 10% failure rate → root cause analysis |
| User-reported bugs             | Daily (GitHub Issues) | Product Lead     | > 5 critical bugs → patch release        |
| AI provider uptime             | Hourly (healthcheck)  | Infrastructure   | < 99% → failover to alternative provider |

---

## 🇫🇷 Appendix: Glossary of French M&A Terms

Terms used throughout this roadmap, preserved in French as they are standard in French M&A practice:

| French Term                           | English Equivalent               | Context in Largo             |
| ------------------------------------- | -------------------------------- | ---------------------------- |
| _Accord de Confidentialité_ / _NDA_   | Non-Disclosure Agreement         | Phase 2: Document Automation |
| _Actes et Statuts_                    | Legal filings and bylaws         | Phase 1: Pappers MCP         |
| _Actif Net Réévalué (ANR)_            | Revalued Net Asset Value         | Phase 1: Valuation Engine    |
| _Autorité de la concurrence_          | Competition Authority            | Phase 5: Compliance          |
| _Banquier d'affaires_                 | Investment banker                | Target persona               |
| _Bénéficiaires effectifs_             | Ultimate beneficial owners       | Phase 1: Pappers data        |
| _Bilan_                               | Balance sheet                    | Phase 1: Financial data      |
| _Boutique M&A_                        | M&A advisory boutique            | Primary target market        |
| _Cession_                             | Divestiture / Sale               | Core M&A workflow            |
| _Compte de résultat_                  | Income statement                 | Phase 1: Financial data      |
| _Dirigeant_                           | Company director/officer         | Phase 1: Company profiles    |
| _Droit à l'oubli_                     | Right to erasure (GDPR)          | Phase 5: GDPR tools          |
| _Earn-out_                            | Earn-out (contingent payment)    | Phase 2: LOI templates       |
| _Effectif_                            | Headcount                        | Phase 1: SIRENE data         |
| _Flux de trésorerie actualisés (DCF)_ | Discounted Cash Flow             | Phase 1: Valuation Engine    |
| _Forme juridique_                     | Legal form (SA, SAS, SARL, etc.) | Phase 1: Company data        |
| _Immatriculation_                     | Company registration             | Phase 1: SIRENE events       |
| _Kbis_                                | Official company extract         | Phase 1: Pappers data        |
| _Lettre d'Intention (LOI)_            | Letter of Intent                 | Phase 2: Document Automation |
| _Liquidation judiciaire_              | Court-ordered liquidation        | Phase 1: Pappers checks      |
| _Mandat_                              | Advisory mandate/engagement      | Phase 4: Dashboard           |
| _Mandataire_                          | Independent M&A advisor          | Target persona               |
| _Mémorandum d'Information (IM)_       | Information Memorandum           | Phase 2: Document Automation |
| _Procédures collectives_              | Insolvency proceedings           | Phase 1: Pappers data        |
| _PV d'AG_                             | General assembly minutes         | Phase 1: Pappers data        |
| _Radiation_                           | Company deregistration           | Phase 1: SIRENE events       |
| _Raison sociale_                      | Company legal name               | Phase 1: SIRENE data         |
| _Redressement judiciaire_             | Judicial reorganization          | Phase 1: Pappers checks      |
| _Registre du Commerce_                | Commercial Register (RCS)        | Phase 1: SIRENE data         |
| _Règle du pouce_                      | Rule of thumb (valuation)        | Phase 1: Valuation Engine    |
| _Sauvegarde_                          | Court-supervised safeguard       | Phase 1: Pappers checks      |
| _Teaser / Profil anonymisé_           | Blind profile / teaser           | Phase 2: Document Automation |
| _Transmission d'entreprise_           | Business transfer/succession     | Adjacent market opportunity  |
| _Veille quotidienne_                  | Daily market watch               | Phase 4: Market Intelligence |

---

## 📋 Version History

| Version | Date    | Author            | Changes                                          |
| ------- | ------- | ----------------- | ------------------------------------------------ |
| 2.0     | 2025-07 | Largo Engineering | Complete roadmap rewrite for AionUi convergence  |
| 1.0     | 2025-01 | Largo Engineering | Initial roadmap (Next.js + Flowise architecture) |

---

## 🤝 Contributing to the Roadmap

This roadmap is a living document. To propose changes:

1. Open an issue with the `roadmap` label
2. Reference the specific phase and item number (e.g., "Phase 2, Item 2.3")
3. Provide rationale for the change (user feedback, technical discovery, market shift)
4. Tag the relevant phase owner for review

For feature requests that don't fit existing phases, use the `feature-request` label and the team will evaluate placement during the next roadmap review (monthly).

---

> _"L'excellence n'est pas un acte, mais une habitude."_  
> — Aristote, souvent cité dans les _boutiques M&A_ françaises
>
> Largo embodies this philosophy: excellence through consistent, thoughtful iteration.
> Every phase, every feature, every line of code moves us closer to the
> definitive AI workspace for French M&A professionals.
