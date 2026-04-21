# docs/ - Documentation

## Overview

Project documentation covering architecture, design, conventions, features, and technical specifications.

## Directory Structure

### Root Documentation Files

- **ACCESSIBILITY.md** (11KB) - Accessibility guidelines and standards
- **ARCHITECTURE.md** (56KB) - Technical architecture and system design
- **CODE_STYLE.md** (3KB) - Code style and formatting guidelines
- **DESIGN_SYSTEM.md** (34KB) - Mint Whisper design system specifications
- **HUB_TEST_GUIDE.md** (6KB) - Extension hub testing guide
- **LARGO_CONVERGENCE_ANALYSIS.md** (8KB) - Largo convergence analysis
- **SECURITY.md** (52KB) - Security model, threat analysis, and best practices
- **SERVER_DEPLOY_GUIDE.md** (17KB) - Production server deployment guide
- **WEBUI_GUIDE.md** (15KB) - WebUI usage and configuration guide
- **cdp.md** (6KB) - Chrome DevTools Protocol documentation
- **development.md** (8KB) - Development workflow and setup
- **pr/** - Pull request documentation (2 items)
- **research/** - Research documents (3 items)
- **ru-RU-instruction.md** (5KB) - Russian language instructions

### `adr/` (6 items)

Architecture Decision Records - Formal documentation of significant architectural decisions.

- **0001-architecture-decision-records.md** - Introduction to ADR process
- **0002-valuation-engine-placement.md** - Valuation engine architecture decision
- **0003-ci-foundation.md** - CI/CD foundation setup decision
- **0004-company-profile-merge.md** - Company profile merging strategy
- **0005-sector-taxonomy.md** - Sector classification taxonomy decision
- **0006-security-ci-foundation.md** - Security CI foundation decision

### `conventions/` (2 items)

Project conventions and standards.

- **file-structure.md** (16KB) - File and directory structure conventions
- **pr-automation.md** (4.5KB) - PR automation workflow documentation

### `feature/` (17 items)

Feature-specific documentation.

- **allow-insecure-connection/** - Insecure connection feature (2 items)
- **extension-market/** - Extension marketplace feature (10 items)
- **remote-agent/** - Remote agent execution feature (5 items)

### `design/` (1 items)

Design specifications and UX documentation.

### `plans/` (1 items)

Future plans and roadmaps.

### `superpowers/` (0 items)

Superpowers feature documentation (placeholder).

### `tech/` (4 items)

Technical documentation.

- **acp-detector.md** (35KB) - ACP detector implementation details
- **architecture.md** (4KB) - Technical architecture overview
- **queue-and-acp-state.md** (12KB) - Queue and ACP state management
- **team-mode-performance.md** (14KB) - Team mode performance analysis

## Key Documentation

### Architecture (ARCHITECTURE.md)

Comprehensive technical architecture documentation covering:

- 3-process model (main, renderer, worker)
- IPC bridge communication
- Module layout and organization
- Cross-process communication patterns
- Service architecture
- Extension system design

### Design System (DESIGN_SYSTEM.md)

Mint Whisper design system specifications:

- Color palette and tokens
- Typography (Plus Jakarta Sans, Cormorant Garamond, JetBrains Mono)
- Spacing and layout
- Component design patterns
- Theme system (light/dark modes)
- Animation and transitions

### Security (SECURITY.md)

Security model and threat analysis:

- Local-first storage philosophy
- Zero telemetry approach
- Authentication mechanisms (JWT)
- CSRF protection
- Rate limiting
- Threat model
- Vulnerability reporting
- Encryption practices

### Code Style (CODE_STYLE.md)

Coding standards and conventions:

- Naming conventions (PascalCase, camelCase, UPPER_SNAKE_CASE)
- File organization
- TypeScript best practices
- Linting and formatting rules
- Import ordering

### File Structure (conventions/file-structure.md)

Detailed file and directory structure rules:

- Directory size limits (10 children max)
- Naming conventions for directories
- Module organization
- Shared vs private code placement
- Page module layout

### WebUI Guide (WEBUI_GUIDE.md)

Browser-based deployment and usage:

- WebUI server setup
- Configuration options
- Authentication setup
- Remote access configuration
- Production deployment

### Server Deploy Guide (SERVER_DEPLOY_GUIDE.md)

Production server deployment:

- System requirements
- Installation steps
- Configuration
- Security hardening
- Monitoring and logging
- Backup strategies

## Architecture Decision Records (ADRs)

### Purpose

ADRs provide a formal record of significant architectural decisions, including:

- Context and problem statement
- Decision made
- Consequences and trade-offs
- Alternatives considered

### Key ADRs

- **ADR 0001** - Establishes the ADR process
- **ADR 0002** - Valuation engine placement in architecture
- **ADR 0003** - CI/CD foundation setup
- **ADR 0004** - Company profile data merging strategy
- **ADR 0005** - Sector taxonomy and classification
- **ADR 0006** - Security CI integration

## Feature Documentation

### Extension Market

Documentation for the extension marketplace feature including:

- Marketplace architecture
- Extension discovery
- Installation workflows
- Update mechanisms
- Security considerations

### Remote Agent

Remote agent execution documentation:

- Remote agent architecture
- Communication protocols
- Security and authentication
- Deployment patterns
- Monitoring and debugging

### Insecure Connection

Feature documentation for allowing insecure connections in specific scenarios.

## Technical Documentation

### ACP Detector

Detailed implementation of the ACP (Aion CLI) detection system:

- Detection algorithms
- State management
- Queue handling
- Performance considerations

### Team Mode Performance

Analysis and optimization of multi-agent team mode:

- Performance bottlenecks
- Optimization strategies
- Scalability considerations
- Monitoring metrics

## Related Documentation

- [README](../README.md) - Project overview and quick start
- [AGENTS.md](../AGENTS.md) - AI agent development guidelines
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
