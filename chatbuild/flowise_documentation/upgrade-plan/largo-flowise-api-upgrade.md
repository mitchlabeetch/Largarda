# Largo Flowise API Upgrade Blueprint

## Purpose

This document defines how to rebuild the current drafted Flowise tenant into a production-grade Largo setup using the Flowise HTTP API, the local Largo documentation set, and the existing `flowise_kb/` seed assets.

It is the execution plan for upgrading the live Flowise instance at `https://filo.manuora.fr` from a small draft inventory into a structured Largo workspace with:

- a primary Largo entry flow
- specialized chatflows and agentflows
- a knowledge base and document ingestion pipeline
- persistent memory conventions
- callable tools aligned with Largo's M&A workflows
- a rollout order that can be automated from this repository

## Current State

### Live tenant inventory verified on 2026-04-19

`GET /api/v1/chatflows` currently returns three draft objects:

| Name              | ID                                     | Type        | Notes                   |
| ----------------- | -------------------------------------- | ----------- | ----------------------- |
| `Company_Look_Up` | `697004ac-f76a-4400-bb61-7afb42a65c39` | `AGENTFLOW` | Narrow utility draft    |
| `Largo`           | `2ab0be12-f65c-4c0e-8f4d-7dd36fa599e2` | `ASSISTANT` | Draft assistant object  |
| `Largo Cherche`   | `3a668c37-e508-4e72-8d6e-826f18efa00c` | `AGENTFLOW` | Research-oriented draft |

### Repo integration reality

The application currently integrates Flowise through:

- `POST /api/v1/prediction/:flowId`
- `GET /api/v1/chatflows`
- `GET /api/v1/chatflows/:flowId`

Important current limitations:

- the app is prediction/chatflow-centric and does not yet fully exploit assistant objects
- `/api/v2/agentflows` is declared in constants but not wired through the runtime path
- `FlowInput.context` and `FlowInput.documents` exist in shared types but are not currently serialized into outgoing Flowise requests
- Flowise session persistence is partially scaffolded in the database and bridge, but not yet completed end-to-end

## Source Of Truth

The Largo Flowise tenant should be generated from the following local sources.

| Source                                                                                          | Role in target design                                             |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/SOUL.md`                   | Core product posture and operational philosophy                   |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/IDENTITY.md`               | System persona, tone, user mode switching                         |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/USER.md`                   | Christophe profile, permissions, timezone, preferred channels     |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/WORKFLOWS.md`              | Functional workflow catalog for tools, sub-agents, and routines   |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/MEMORY.md`                 | Memory model, persistence layers, session and deal context rules  |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/API_REFERENCE.md`          | External API catalog for tools and integrations                   |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/FLOWISE_IMPLEMENTATION.md` | High-level Flowise-native target architecture                     |
| `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/flowise_kb/`               | Uploadable seed assets for prompts, tools, flows, memory, loaders |
| `.kiro/specs/ma-assistant-flowise-backend/tasks.md`                                             | Product requirements and flow-template roadmap                    |

## Target Tenant Shape

### 1. Primary Largo entrypoint

Create one primary entry flow for all end-user interactions:

- `Largo Core`
- type: primary chatflow or assistant-backed chatflow entrypoint
- responsibility:
  - receive user requests
  - apply persona and tone rules
  - load active deal context when available
  - route to tools or sub-agents
  - query Largo knowledge base
  - persist conversation and preference memory

This should supersede the current drafted `Largo` object for app-driven usage unless assistant support is expanded in the app first.

### 2. Specialized flows

Build specialized flows from `flowise_kb/agentflows/` and `WORKFLOWS.md`.

Recommended production inventory:

| Flow                         | Type                  | Source                                 | Responsibility                                         |
| ---------------------------- | --------------------- | -------------------------------------- | ------------------------------------------------------ |
| `Largo Core`                 | Chatflow              | `largo_main_agent.json` + persona docs | Main orchestration                                     |
| `Largo Research`             | Agentflow             | `research_agent.json`                  | Company research, market and web research              |
| `Largo Documents`            | Agentflow             | `document_agent.json`                  | Document generation, parsing, synthesis                |
| `Largo Meetings`             | Agentflow             | `meeting_agent.json`                   | Meeting prep and follow-up                             |
| `Largo Email`                | Agentflow             | `email_agent.json`                     | Email drafting and triage                              |
| `Largo Prospecting`          | Agentflow             | `prospect_agent.json`                  | Prospect enrichment and outreach prep                  |
| `Largo Due Diligence`        | Chatflow or Agentflow | `.kiro` task 13.2                      | Risk review, checklist, structured DD support          |
| `Largo Financial Extraction` | Chatflow or Agentflow | `.kiro` task 13.2                      | Financial metric extraction and normalization          |
| `Largo Company Intelligence` | Agentflow             | `.kiro` task 13.2                      | External company intelligence and MCP-backed retrieval |

### 3. Tool inventory

Start from the 11 seed tools in `flowise_kb/tools/`:

- `search_company`
- `get_valuation`
- `get_multiples`
- `web_search`
- `deep_research`
- `generate_document`
- `save_memory`
- `get_memory`
- `delegate_to_agent`
- `send_notification`
- `query_rag`

Then split them into two groups.

#### Group A: production-ready first-wave tools

These should exist in the initial rollout:

- `search_company`
- `web_search`
- `deep_research`
- `query_rag`
- `generate_document`
- `save_memory`
- `get_memory`

#### Group B: phase-two tools once service endpoints are stable

- `get_valuation`
- `get_multiples`
- `delegate_to_agent`
- `send_notification`

This keeps the first rollout aligned with the parts of Largo that already have strong documentation and avoids overpromising missing backend services.

### 4. Knowledge base

The Largo knowledge base should be split into at least three logical document stores.

| Store              | Contents                                                                                      | Usage                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `largo-core-kb`    | `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `WORKFLOWS.md`, `API_REFERENCE.md`          | Prompt grounding, operating rules, personality, routing |
| `largo-mna-kb`     | M&A methodology docs, due diligence references, valuation logic, deal playbooks               | DD and research flows                                   |
| `largo-product-kb` | `.kiro/specs/ma-assistant-flowise-backend/*`, implementation notes, app-side integration docs | Engineering and product support flows                   |

Do not dump everything into a single unstructured store. Separate stores improve retrieval quality and let each flow query only relevant corpora.

### 5. Memory model

Adopt a layered memory design that mirrors `MEMORY.md`.

| Layer                    | Flowise role                            | External role                                                  |
| ------------------------ | --------------------------------------- | -------------------------------------------------------------- |
| Short-term               | Buffer memory per session               | Recent turns and active reasoning context                      |
| Medium-term              | Conversation/session linkage            | Repo DB tables such as `ma_flowise_sessions` and deal entities |
| Long-term semantic       | Vector memory or vector store retrieval | Preferences, recurring client patterns, reusable DD context    |
| Durable business context | Not solely inside Flowise               | Deal, document, and analysis state stored in Largo app DB      |

Rule:

- user conversation memory can live in Flowise-supported memory components
- deal truth, document truth, and analysis truth must remain anchored in the Largo application database and be passed into Flowise as structured context

## Naming And Versioning

The tenant should be rebuilt with explicit production naming to distinguish new assets from drafts.

Recommended convention:

- `Largo Core v1`
- `Largo Research v1`
- `Largo Documents v1`
- `Largo Meetings v1`
- `Largo Email v1`
- `Largo Prospecting v1`
- `Largo Due Diligence v1`
- `Largo Financial Extraction v1`
- `Largo Company Intelligence v1`

Draft suffixes for work-in-progress assets:

- `Draft`
- `Staging`

Do not mutate the existing draft assets blindly. Prefer one of these strategies:

1. keep the current three objects as archival drafts
2. create the new production-named assets beside them
3. switch the app to the new IDs only after verification

## API-First Rollout Sequence

### Phase 1: inventory and export

Before changing the live tenant:

1. call `GET /api/v1/chatflows`
2. export or snapshot all existing live flow definitions
3. map old IDs to new target names
4. record a rollback table

### Phase 2: create shared building blocks

1. create or update tool definitions
2. create document stores
3. configure text splitters and embeddings
4. ingest source documents into the correct stores

### Phase 3: create flows

1. create `Largo Core v1`
2. create specialized flows
3. attach the correct tools per flow
4. attach the correct knowledge base store per flow
5. configure memory nodes

### Phase 4: validate behavior

For each new flow:

1. verify presence with `GET /api/v1/chatflows`
2. fetch full definition with `GET /api/v1/chatflows/:id`
3. execute smoke tests through `POST /api/v1/prediction/:flowId`
4. test both simple prompts and domain prompts
5. confirm retrieval behavior and tool invocation

### Phase 5: switch application bindings

Once validation passes:

1. bind the app to the new production flow IDs
2. update any local docs that reference old IDs
3. keep legacy draft flows inactive but available for rollback

## Flow-to-Source Mapping

### Largo Core

Should be synthesized from:

- `SOUL.md`
- `IDENTITY.md`
- `USER.md`
- `MEMORY.md`
- `prompts/SYSTEM_PROMPT.md`

### Largo Research

Should be grounded in:

- `WORKFLOWS.md`
- `API_REFERENCE.md`
- `tools/search_company.json`
- `tools/web_search.json`
- `tools/deep_research.json`
- M&A market and company research docs

### Largo Documents

Should be grounded in:

- `WORKFLOWS.md`
- document generation capabilities
- document parsing and upload configs

### Largo Due Diligence

Should be grounded in:

- `.kiro/specs/ma-assistant-flowise-backend/tasks.md`
- due diligence checklist templates
- risk frameworks
- document comparison logic

### Largo Financial Extraction

Should be grounded in:

- `.kiro/specs/ma-assistant-flowise-backend/tasks.md`
- financial extraction requirements
- document parsing rules
- metric normalization conventions

## App Gaps To Close In Parallel

The Flowise tenant can be upgraded immediately, but the Largo app should also be improved so it can exploit the new setup properly.

### High priority

1. serialize `context` and `documents` from `FlowInput` into outgoing Flowise prediction requests
2. finish `ma_flowise_sessions` persistence and bridge handlers
3. standardize streaming request payload expectations and verify whether the target Flowise version expects `stream` or `streaming`
4. add flow ID configuration per Largo capability instead of a single hard-coded flow binding

### Medium priority

1. support assistant objects if the Flowise tenant relies on them
2. support richer tool confirmation/resume semantics
3. support multiple knowledge-backed flows in the UI

## Execution Strategy

### Recommended rollout

#### Wave 1: make Largo useful and stable

Build:

- `Largo Core v1`
- `Largo Research v1`
- `Largo Documents v1`
- `largo-core-kb`
- `largo-mna-kb`

This wave should cover the highest-value Largo jobs:

- company lookup
- web and deep research
- document summarization
- document generation preparation
- persona-correct interaction with Christophe

#### Wave 2: add structured M&A workflows

Build:

- `Largo Due Diligence v1`
- `Largo Financial Extraction v1`
- `Largo Company Intelligence v1`

#### Wave 3: add communication and routines

Build:

- `Largo Meetings v1`
- `Largo Email v1`
- `Largo Prospecting v1`
- scheduled or externally triggered routines derived from `WORKFLOWS.md`

## Risks And Guardrails

### Risks

- the current live tenant objects are likely incomplete drafts, not safe production anchors
- the current app runtime only guarantees prediction-based invocation
- some seed JSONs in `flowise_kb/` are conceptual and may require schema normalization for the actual Flowise API version running on `filo.manuora.fr`
- if all Largo docs are ingested into one store without curation, retrieval quality will degrade

### Guardrails

- never overwrite the three live draft objects without a snapshot
- keep production flow names versioned
- rollout in waves, not in one massive import
- validate each flow through the same endpoints the app actually uses
- keep business truth in Largo DB, not only inside Flowise memory

## Concrete Next Steps

1. Write a repository script that can:
   - read local `flowise_kb/` assets
   - normalize them into the API payload shape expected by the live Flowise version
   - create or update tools, stores, and flows idempotently
2. Build a source manifest listing which local documents belong in each document store.
3. Define the first-wave flow IDs that the app should bind to after rollout.
4. Upgrade the app request payload so `dealContext` and selected document references reach Flowise.
5. Run the first API-driven rollout against a staging naming set such as `Largo Core v1 Draft`.

## Definition Of Done

The Flowise upgrade is complete when:

- a production-named Largo core flow exists and passes smoke tests
- specialized Largo research and document flows exist and are callable by API
- Largo source documents are ingested into curated document stores
- memory behavior is split between short-term Flowise memory and Largo-owned durable state
- the app can route requests to the new flow IDs with deal context attached
- the old drafted tenant objects are no longer the active runtime dependency
