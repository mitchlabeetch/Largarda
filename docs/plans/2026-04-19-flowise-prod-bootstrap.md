# Flowise Production Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current partially prepared Flowise setup into a zero-touch, production-ready backend bootstrap that can stand up a fresh instance, configure all required resources, wire Largo flows, verify health, and be rerun safely.

**Architecture:** Keep the existing [Update-LargoFlowise.ps1](C:/Users/tanag/Desktop/Largo/Largarda/chatbuild/flowise_automation/Update-LargoFlowise.ps1) as the content-sync layer, then add a bootstrap layer for first-run resource creation, an infrastructure layer for Flowise and dependent services, and a verification layer for smoke tests and drift checks. Separate declarative config from imperative PowerShell so reruns are idempotent and environment changes do not require code edits.

**Tech Stack:** PowerShell, Flowise HTTP API, Docker Compose, PostgreSQL, reverse proxy/TLS, health checks, JSON config, optional Pester for script tests.

---

### Task 1: Freeze the Production Contract

**Files:**

- Create: `chatbuild/flowise_automation/config/prod-config.template.json`
- Create: `chatbuild/flowise_automation/config/service-matrix.md`
- Modify: `chatbuild/flowise_automation/Update-LargoFlowise.ps1`
- Reference: `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/ARCHITECTURE.md`
- Reference: `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/.env.example`

**Steps:**

1. Define the exact prod resources the automation owns: Flowise base URL, workspace, main assistant, child flows, document store, credential names, vector store provider, memory provider, external tool endpoints.
2. Move hardcoded assumptions out of the script, especially the current main assistant id and preferred resource names.
3. Add a config contract that supports both bootstrap-from-empty and reconcile-existing modes.
4. Add validation that fails early if required config values are missing or inconsistent.

**Acceptance criteria:**

- No production-only IDs remain hardcoded in the script.
- A single config file can describe the entire target Flowise environment.

**Verification:**

- Run: `powershell -File chatbuild/flowise_automation/Update-LargoFlowise.ps1 -BaseUrl https://example -ApiKey test`
- Expected: fast config validation failure before any remote mutation when config is incomplete.

### Task 2: Split Sync Logic from Bootstrap Logic

**Files:**

- Create: `chatbuild/flowise_automation/lib/FlowiseApi.psm1`
- Create: `chatbuild/flowise_automation/lib/FlowiseBootstrap.psm1`
- Create: `chatbuild/flowise_automation/Bootstrap-FlowiseProd.ps1`
- Modify: `chatbuild/flowise_automation/Update-LargoFlowise.ps1`

**Steps:**

1. Extract shared HTTP helpers, JSON upload helpers, resource lookup helpers, and flow patch helpers into modules.
2. Keep `Update-LargoFlowise.ps1` focused on content reconciliation: KB build, assistant prompt updates, child-flow wiring.
3. Implement `Bootstrap-FlowiseProd.ps1` for first-run creation of missing primitives before the reconcile step.
4. Make both scripts idempotent and safe to rerun.

**Acceptance criteria:**

- First-run creation and recurring reconciliation are separate entry points.
- Reconcile logic can run after bootstrap without duplicating resources.

**Verification:**

- Run bootstrap against a test Flowise instance with missing resources.
- Run reconcile immediately after.
- Expected: second run reports update or no-op, never duplicate creation.

### Task 3: Automate Fresh Flowise Resource Creation

**Files:**

- Modify: `chatbuild/flowise_automation/lib/FlowiseBootstrap.psm1`
- Create: `chatbuild/flowise_automation/manifests/assistants.json`
- Create: `chatbuild/flowise_automation/manifests/document-stores.json`
- Create: `chatbuild/flowise_automation/manifests/tool-routing.json`

**Steps:**

1. Create or locate the main Largo assistant by stable name, not by fixed id.
2. Create or locate the curated document store by manifest.
3. Create or locate the `Company_Look_Up` flow and any other required child flow primitives.
4. Add manifest-driven creation rules for chatflows, visibility, deployment state, workspace binding, and child tool labels.

**Acceptance criteria:**

- A blank Flowise database can be brought to the required Largo topology.
- Resource identity is name- or manifest-based, not hand-maintained in code.

**Verification:**

- Run bootstrap on an empty environment.
- Expected: all required chatflows and document stores exist and can be resolved by the reconcile script.

### Task 4: Automate Credentials and Provider Preflight

**Files:**

- Create: `chatbuild/flowise_automation/manifests/credentials.json`
- Create: `chatbuild/flowise_automation/Test-FlowiseProdCredentials.ps1`
- Modify: `chatbuild/flowise_automation/lib/FlowiseBootstrap.psm1`

**Steps:**

1. Decide which credentials are created in Flowise versus injected through external services.
2. Add preflight checks for all required providers: chat model, embeddings, vector store, search, French business APIs, notifications.
3. If Flowise supports credential creation via API for the selected resource types, implement it.
4. If some credentials cannot be created safely by API, codify a preflight verifier that blocks deployment until they exist and match expected names.

**Acceptance criteria:**

- No manual guessing remains around provider names or credential presence.
- Prod promotion fails fast when credentials are absent or misnamed.

**Verification:**

- Run credential preflight with one missing credential.
- Expected: exact missing credential and owning manifest entry are reported.

### Task 5: Automate Infrastructure Deployment

**Files:**

- Create: `chatbuild/flowise_automation/deploy/docker-compose.prod.yml`
- Create: `chatbuild/flowise_automation/deploy/.env.prod.template`
- Create: `chatbuild/flowise_automation/deploy/nginx.flowise.conf`
- Create: `chatbuild/flowise_automation/Deploy-FlowiseProd.ps1`
- Reference: `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/DEPLOYMENT.md`

**Steps:**

1. Standardize the production runtime for Flowise itself: Flowise, PostgreSQL, reverse proxy, persistent volumes, restart policy, logs, and health checks.
2. Choose and codify the production vector store and memory strategy.
3. Add TLS and host-level reverse proxy configuration.
4. Add environment templates for all service secrets and runtime settings.

**Acceptance criteria:**

- A new host can be provisioned from repo artifacts without manual YAML assembly.
- Flowise uses production-grade persistence instead of ad hoc local defaults.

**Verification:**

- Run deploy script on a disposable host or VM.
- Expected: containers healthy, TLS reachable, Flowise API healthy.

### Task 6: Productionize External Tool Backends

**Files:**

- Create: `chatbuild/flowise_automation/deploy/services/mna-research.docker-compose.yml`
- Create: `chatbuild/flowise_automation/deploy/services/pptx-generator.docker-compose.yml`
- Create: `chatbuild/flowise_automation/deploy/services/document-parser.docker-compose.yml`
- Create: `chatbuild/flowise_automation/deploy/services/whatsapp-gateway.docker-compose.yml`
- Create: `chatbuild/flowise_automation/Test-FlowiseExternalBackends.ps1`
- Reference: `chatbuild/architecture_repos/largobase-main/largo_v2_knowledge_base/ARCHITECTURE.md`

**Steps:**

1. Decide which external services are mandatory for production day one.
2. Add deployable definitions and health endpoints for each mandatory backend.
3. Wire those stable service URLs into Flowise manifests and credential preflight.
4. Add a compatibility matrix documenting what fails open versus fails closed if a backend is unavailable.

**Acceptance criteria:**

- Every Flowise tool referenced by Largo has a deployed, health-checked backend or a documented disabled state.
- There is no silent dependency on a developer laptop or sidecar process.

**Verification:**

- Run external-backend test script after deploy.
- Expected: each required backend returns healthy and matches configured endpoint.

### Task 7: Add Operational Jobs, Backup, and Drift Control

**Files:**

- Create: `chatbuild/flowise_automation/Cron-FlowiseProdSync.ps1`
- Create: `chatbuild/flowise_automation/Cron-FlowiseBackup.ps1`
- Create: `chatbuild/flowise_automation/Cron-FlowiseHealth.ps1`
- Create: `chatbuild/flowise_automation/Test-FlowiseDrift.ps1`

**Steps:**

1. Schedule periodic reconcile runs for KB and flow manifests.
2. Add backup jobs for Flowise database and any local vector store state.
3. Add drift detection for flow topology, delegated tools, document store status, and missing loaders.
4. Add alerting hooks for failed reconcile, unhealthy services, or drift findings.

**Acceptance criteria:**

- Production stays aligned with repo-defined manifests over time.
- Backup and restore are explicit operating procedures, not tribal knowledge.

**Verification:**

- Intentionally change one managed property in a test environment.
- Expected: drift test reports it; reconcile restores it.

### Task 8: Add End-to-End Smoke Tests and Release Gates

**Files:**

- Create: `chatbuild/flowise_automation/tests/smoke/main-assistant.predict.json`
- Create: `chatbuild/flowise_automation/tests/smoke/company-lookup.predict.json`
- Create: `chatbuild/flowise_automation/Test-FlowiseProdSmoke.ps1`
- Create: `chatbuild/flowise_automation/README.md`

**Steps:**

1. Add real predict-call smoke tests for the main assistant and delegated child flows.
2. Verify KB presence, delegated tool references, and at least one tool-backed answer path.
3. Define production release gates: deploy, bootstrap, reconcile, credential preflight, backend health, smoke tests.
4. Document rollback and recovery steps in the README.

**Acceptance criteria:**

- “Production ready” means the smoke suite passes, not just that resources exist.
- The repo contains an operator-facing sequence for deploy, verify, reconcile, and rollback.

**Verification:**

- Run: `powershell -File chatbuild/flowise_automation/Test-FlowiseProdSmoke.ps1`
- Expected: pass on main assistant predict, company lookup flow predict, KB loader present, delegated flows wired.

### Suggested Delivery Order

1. Task 1 and Task 2
2. Task 3
3. Task 4
4. Task 5
5. Task 6
6. Task 7
7. Task 8

### Definition of Done

- A fresh environment can be deployed and bootstrapped from repo artifacts alone.
- Reconcile runs are idempotent and safe.
- Required credentials and external backends are validated automatically.
- Smoke tests prove the main Largo assistant, curated KB, and delegated flows work in production.
- Backup, drift detection, and rollback are documented and executable.
