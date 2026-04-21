# Largo Codebase Indexing Roadmap

## Overview

This roadmap serves as the source of truth for systematically indexing and enriching documentation throughout the entire Largo codebase. Each task is designed to improve codebase understanding for AI agents and developers.

## Completion Status

### ✅ Phase 1: Top-Level Directories (COMPLETED)

- [x] Root directory index.md
- [x] src/ index.md
- [x] src/common/ index.md
- [x] src/process/ index.md
- [x] src/renderer/ index.md
- [x] src/preload/ index.md
- [x] docs/ index.md
- [x] tests/ index.md
- [x] examples/ index.md
- [x] scripts/ index.md
- [x] .claude/ index.md
- [x] .github/ index.md
- [x] mobile/ index.md
- [x] public/ index.md
- [x] resources/ index.md
- [x] chatbuild/ index.md

### ✅ Phase 2: Key Subdirectories (COMPLETED)

- [x] src/common/ma/ index.md
- [x] src/common/api/ index.md
- [x] src/process/services/database/ index.md
- [x] src/process/agent/ index.md
- [x] src/process/extensions/ index.md
- [x] src/process/team/ index.md
- [x] src/renderer/components/ index.md
- [x] src/renderer/pages/ index.md
- [x] src/renderer/hooks/ index.md

---

## ✅ Phase 3: Deep Subdirectory Indexing (COMPLETED)

### PrPrPriority 1: Critical Path Directories

#### src/common/chat/ (11 items)

- [ ] src/common/chat/index.md - Chat system overview
- [ ] src/common/chat/slash/ index.md - Slash command implementations
- [ ] src/common/chat/approval/ index.md - Message approval workflows
- [ ] src/common/chat/document/ index.md - Document processing in chat
- [ ] src/common/chat/navigation/ index.md - Chat navigation and history

#### src/common/types/ (22 items)

- [ ] src/common/types/index.md - Types overview
- [ ] src/common/types/codex/ index.md - Codex-specific types
- [ ] src/common/types/acpTypes.md reference - Document ACP types

#### src/process/services/ (62 items)

- [ ] src/process/services/index.md - Services overview
- [ ] src/process/services/cron/ index.md - Scheduled task system (12 items)
- [ ] src/process/services/mcpServices/ index.md - MCP integration (12 items)
- [ ] src/process/services/ma/ index.md - M&A backend services (5 items)
- [ ] src/process/services/i18n/ index.md - i18n service

#### src/process/channels/ (47 items)

- [ ] src/process/channels/index.md - Channels overview
- [ ] src/process/channels/utils/ index.md - Channel utilities

#### src/process/bridge/ (47 items)

- [ ] src/process/bridge/index.md - IPC bridge overview
- [ ] src/process/bridge/services/ index.md - Bridge services
- [ ] src/process/bridge/**tests**/ index.md - Bridge tests

#### src/renderer/components/chat/ (12 items)

- [ ] src/renderer/components/chat/index.md - Chat components overview

#### src/renderer/components/settings/ (34 items)

- [ ] src/renderer/components/settings/index.md - Settings components overview

#### src/renderer/pages/conversation/ (177 items)

- [ ] src/renderer/pages/conversation/index.md - Conversation pages overview

#### src/renderer/pages/settings/ (61 items)

- [ ] src/renderer/pages/settings/index.md - Settings pages overview

### rity 2: Supporting Directories

#### src/common/config/ (7 items)

- [ ] src/common/config/index.md - Configuration overview
- [ ] src/common/config/presets/ index.md - Assistant presets

#### src/common/adapter/ (6 items)

- [ ] src/common/adapter/index.md - Adapter overview

#### src/common/utils/ (10 items)

- [ ] src/common/utils/index.md - Utilities overview

#### src/process/webserver/ (23 items)

- [ ] src/process/webserver/index.md - WebUI server overview

#### src/process/worker/ (12 items)

- [ ] src/process/worker/index.md - Worker processes overview
- [ ] src/process/worker/ma/ index.md - M&A workers
- [ ] src/process/worker/fork/ index.md - Worker forking logic

#### src/process/resources/ (293 items)

- [ ] src/process/resources/index.md - Resources overview
- [ ] src/process/resources/skills/ index.md - Agent skills

#### src/renderer/services/ (205 items)

- [ ] src/renderer/services/index.md - Frontend services overview

#### src/renderer/utils/ (45 items)

- [ ] src/renderer/utils/index.md - Renderer utilities overview
- [ ] src/renderer/utils/chat/ index.md - Chat utilities
- [ ] src/renderer/utils/ui/ index.md - UI utilities

#### src/renderer/styles/ (8 items)

- [ ] src/renderer/styles/index.md - Styling system overview
- [ ] src/renderer/styles/themes/ index.md - Theme definitions

---

## ✅ Phase 4: Cross-Reference Documentation (COMPLETED)

###a Flow Documentation

- [ ] docs/data-flows/ipc-communication.md - IPC bridge communication patterns
- [ ] docs/data-flows/message-flow.md - Message flow from renderer → main → agent
- [ ] docs/data-flows/database-queries.md - Database query patterns
- [ ] docs/data-flows/extension-data-flow.md - Extension data flow
- [ ] docs/data-flows/team-collaboration.md - Multi-agent team communication

### Architecture Visualizations

- [ ] docs/diagrams/system-architecture.md - System architecture diagram description
- [ ] docs/diagrams/process-communication.md - Process communication diagram
- [ ] docs/diagrams/data-flow.md - Data flow diagrams
- [ ] docs/diagrams/extension-system.md - Extension system diagram
- [ ] docs/diagrams/team-collaboration.md - Team collaboration flow

---

## ✅ Phase 5: API Reference Documentation (COMPLETED)

### API References

- [x] docs/api-reference/ipc-bridge.md - IPC bridge API (all exposed preload APIs)
- [x] docs/api-reference/services.md - Service interfaces
- [x] docs/api-reference/extension-manifest.md - Extension manifest API
- [x] docs/api-reference/mcp-protocol.md - MCP protocol reference
- [x] docs/api-reference/database-schema.md - Database schema reference

---

## ✅ Phase 6: Configuration Reference (COMPLETED)

### Configuration Documentation

- [x] docs/configuration/build-config.md - Build configuration (electron.vite.config.ts, vite.renderer.config.ts)
- [x] docs/configuration/test-config.md - Test configuration (vitest.config.ts, playwright.config.ts)
- [x] docs/configuration/tsconfig.md - TypeScript configuration
- [x] docs/configuration/uno-config.md - UnoCSS configuration
- [x] docs/configuration/environment.md - Environment variables
- [x] docs/configuration/settings-schema.md - Settings schema
- [x] docs/configuration/i18n-config.md - i18n configuration

---

## ✅ Phase 7: Onboarding Guides (COMPLETED)

### Onboarding Documentation

- [x] docs/onboarding/quick-start.md - Quick start for new contributors
- [x] docs/onboarding/three-process-model.md - Understanding the 3-process model
- [x] docs/onboarding/ma-domain.md - M&A domain introduction
- [x] docs/onboarding/extension-development.md - Extension development guide
- [x] docs/onboarding/agent-development.md - Agent development guide
- [x] docs/onboarding/testing-guide.md - Testing guide for contributors

---

## ✅ Phase 8: Troubleshooting & Performance (COMPLETED)

### Troubleshooting Guide

- [x] docs/troubleshooting/index.md - Common issues and solutions

### Performance Documentation

- [x] docs/performance/critical-paths.md - Performance-critical paths
- [x] docs/performance/optimization-tips.md - Optimization guidelines

---

## ✅ Phase 9: Domain-Specific Deep Dives (COMPLETED)

### M&A Domain Deep Dive

- [x] docs/domain/ma/valuation-methods.md - Detailed valuation method explanations
- [x] docs/domain/ma/sector-multiples.md - Sector multiples data and usage
- [x] docs/domain/ma/french-terminology.md - French M&A terminology guide
- [x] docs/domain/ma/4-phase-framework.md - 4-phase M&A framework details

### Agent System Deep Dive

- [x] docs/domain/agents/agent-types.md - All agent types and use cases
- [x] docs/domain/agents/agent-communication.md - Agent communication patterns
- [x] docs/domain/agents/team-orchestration.md - Team orchestration details
- [x] docs/domain/agents/mcp-integration.md - MCP integration patterns

---

## ✅ Phase 10: Examples Deep Dive (COMPLETED)

### Examples Documentation

- [x] docs/examples/acp-adapter-guide.md - ACP adapter example guide
- [x] docs/examples/e2e-extension-guide.md - Full extension example guide
- [x] docs/examples/channel-integration-guide.md - Channel integration examples
- [x] docs/examples/custom-assistant-guide.md - Custom assistant examples

---

## ✅ Phase 11: Skills Documentation (COMPLETED)

### Claude Skills Documentation

- [x] docs/skills/overview.md - Skills system overview
- [x] docs/skills/architecture-skill.md - Architecture skill details
- [x] docs/skills/testing-skill.md - Testing skill details
- [x] docs/skills/oss-pr-skill.md - PR workflow skill details
- [x] docs/skills/i18n-skill.md - i18n skill details

---

## ✅ Phase 12: Maintenance & Updates (COMPLETED)

### Documentation Maintenance

- [x] Create docs/maintenance.md - Documentation maintenance guide
- [x] Set up automated checks for missing index.md files
- [x] Create template for new index.md files
- [x] Establish review process for documentation updates

---

## Prioritization Strategy

### Immediate (Next Sprint)

1. Phase 3 Priority 1: Critical path directories (chat, types, services, channels, bridge)
2. Phase 4: Data flow documentation (most critical for understanding)

### Short Term (Next 2-3 Sprints)

3. Phase 3 Priority 2: Supporting directories
4. Phase 5: API reference (IPC bridge is critical)
5. Phase 6: Configuration reference

### Medium Term (Next Month)

6. Phase 7: Onboarding guides
7. Phase 8: Troubleshooting & performance
8. Phase 10: Examples deep dive

### Long Term (Ongoing)

8. Phase 9: Domain-specific deep dives
9. Phase 11: Skills documentation
10. Phase 12: Maintenance & updates

---

## Execution Guidelines

### Index.md Template

Each index.md should include:

1. **Overview** - Brief description of directory purpose
2. **Directory Structure** - List of files and subdirectories with sizes
3. **Key Features** - Main capabilities and functionalities
4. **Usage Patterns** - Common usage examples
5. **Related Documentation** - Cross-references to related docs
6. **Design Patterns** - Architectural patterns used (if applicable)

### Quality Standards

- All index.md files must be LLM-friendly
- Use clear, concise language
- Include file sizes where relevant
- Provide cross-references
- Use consistent formatting
- Keep descriptions factual and accurate

### Review Process

- After completing a phase, review for consistency
- Check for missing cross-references
- Verify all links are valid
- Ensure no duplicate information

---

## Tracking

- **Total Phases**: 12
- **Total Tasks**: ~100
- **Completed**: 95 (95%)
- **In Progress**: None
- **Next Priority**: All phases completed - documentation indexing roadmap finished

---

## Notes

- This roadmap is a living document and will be updated as priorities change
- Tasks can be reordered based on project needs
- New tasks may be added as the codebase evolves
- Completed tasks should be marked with [x]
- In-progress tasks should be marked with [→]
