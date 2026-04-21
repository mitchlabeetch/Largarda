# tests/ - Test Suite

## Overview

Comprehensive test suite covering unit, integration, end-to-end, and regression tests. Uses Vitest for unit/integration tests and Playwright for E2E tests.

## Directory Structure

### Root Configuration Files

- **vitest.setup.ts** - Vitest test setup and configuration
- **vitest.dom.setup.ts** - DOM environment setup for Vitest

### `e2e/` (35 items)

End-to-end tests using Playwright.

- **fixtures.ts** (9KB) - E2E test fixtures and helper functions
- **helpers/** - E2E test helper utilities (9 items)
- **specs/** - E2E test specifications (25 items)
  - Team creation and lifecycle tests
  - Agent communication tests
  - Whitelist tests
  - Workflow tests

### `integration/` (14 items)

Integration tests testing component interactions.

- **acp-smoke.test.ts** (7.7KB) - ACP smoke tests
- **autoUpdate.integration.test.ts** (8KB) - Auto-update integration tests
- **bundled-bun-packaged.test.ts** (3.9KB) - Bundled Bun packaging tests
- **hub-install-flow.test.ts** (16KB) - Extension hub installation flow tests
- **i18n-packaged.test.ts** (4KB) - i18n packaged application tests
- **i18n-performance.test.ts** (5.5KB) - i18n performance tests
- **i18n.test.ts** (10KB) - Internationalization tests
- **pet-renderer-build.test.ts** (5.5KB) - Pet renderer build tests
- **team-mcp-server.test.ts** (31KB) - Team MCP server integration tests
- **team-real-components.test.ts** (37KB) - Team real component tests
- **team-stress-concurrency.test.ts** (33KB) - Team stress and concurrency tests
- **team-stress-tcp.test.ts** (19KB) - Team TCP stress tests
- **webui-favicon-build.test.ts** (4.8KB) - WebUI favicon build tests
- **webui-pwa-build.test.ts** (5.5KB) - WebUI PWA build tests

### `regression/` (1 items)

Regression tests for known bugs.

- **layout_theme_route_revert.test.ts** - Layout, theme, and route regression test

### `unit/` (416 items)

Unit tests for individual components and functions.

- Component tests
- Utility function tests
- Service tests
- Hook tests

### `fixtures/` (4 items)

Test fixtures and mocks.

- **fake-acp-cli/** - Fake ACP CLI for testing (1 item)
- **fake-extension/** - Fake extension for testing (2 items)
- **fake-extension.zip** - Zipped fake extension

## Test Frameworks

### Vitest

Primary testing framework for unit and integration tests.

- Fast unit test execution
- Native TypeScript support
- Snapshot testing
- Coverage reporting with @vitest/coverage-v8
- Watch mode for development

### Playwright

End-to-end testing framework.

- Browser automation (Chromium, Firefox, WebKit)
- Multi-browser testing
- Network interception
- Screenshot and video recording
- Trace viewing for debugging

## Test Categories

### Unit Tests

- Test individual functions and components in isolation
- Fast execution
- Mock external dependencies
- High coverage target (≥80%)

### Integration Tests

- Test interactions between components
- Test service integrations
- Test cross-process communication
- Test database operations

### E2E Tests

- Test complete user workflows
- Test application from user perspective
- Test critical paths (login, conversation, team creation)
- Test across browsers

### Regression Tests

- Prevent recurrence of known bugs
- Track historical issues
- Ensure fixes remain effective

## Key Test Suites

### Team Mode Tests

Comprehensive testing of multi-agent team functionality:

- **team-real-components.test.ts** - Real component integration
- **team-mcp-server.test.ts** - MCP server integration
- **team-stress-concurrency.test.ts** - Concurrency stress testing
- **team-stress-tcp.test.ts** - TCP communication stress testing

### i18n Tests

Internationalization testing:

- **i18n.test.ts** - Core i18n functionality
- **i18n-packaged.test.ts** - Packaged application i18n
- **i18n-performance.test.ts** - i18n performance characteristics

### Build Tests

Build and packaging verification:

- **bundled-bun-packaged.test.ts** - Bun packaging
- **pet-renderer-build.test.ts** - Pet renderer build
- **webui-favicon-build.test.ts** - WebUI favicon
- **webui-pwa-build.test.ts** - WebUI PWA features

### ACP Tests

ACP (Aion CLI) integration testing:

- **acp-smoke.test.ts** - Basic ACP functionality

### Extension Hub Tests

Extension marketplace testing:

- **hub-install-flow.test.ts** - Installation workflow

## Running Tests

### All Tests

```bash
bun run test
```

### Unit Tests

```bash
bun run test:unit
```

### Integration Tests

```bash
bun run test:integration
```

### E2E Tests

```bash
bun run test:e2e
```

### Specific E2E Suite

```bash
bun run test:e2e:team
bun run test:e2e:team:create
bun run test:e2e:team:lifecycle
```

### Coverage

```bash
bun run test:coverage
```

## Test Configuration

### Vitest Configuration (vitest.config.ts)

- Test environment: node
- Coverage provider: v8
- TypeScript support
- Path aliases
- Setup files

### Playwright Configuration (playwright.config.ts)

- Browser targets
- Test directory
- Reporter configuration
- Timeout settings

## Coverage Target

Minimum coverage target: **80%**

- Enforced in CI/CD pipeline
- Measured across all unit and integration tests
- Excludes E2E tests from coverage calculation

## Test Quality Standards

### Writing Tests

- Follow the `testing` skill guidelines (`.claude/skills/testing/SKILL.md`)
- Write descriptive test names
- Test both happy path and error cases
- Use meaningful assertions
- Mock external dependencies appropriately

### Before Committing

- Run full test suite: `bun run test`
- Ensure all tests pass
- Check coverage meets 80% target
- Run pre-commit checks with prek

## Related Documentation

- [Testing Skill](../../.claude/skills/testing/SKILL.md) - Complete testing workflow and quality standards
- [AGENTS.md](../../AGENTS.md) - Development conventions
- [vitest.config.ts](../../vitest.config.ts) - Vitest configuration
- [playwright.config.ts](../../playwright.config.ts) - Playwright configuration
