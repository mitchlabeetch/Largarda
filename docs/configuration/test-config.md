# Test Configuration Reference

## Overview

Largo uses Vitest for unit/integration/regression tests and Playwright for E2E tests.

## vitest.config.ts

### Path Aliases

```typescript
{
  '@/': './src/',
  '@process/': './src/process/',
  '@renderer/': './src/renderer/',
  '@worker/': './src/process/worker/',
  '@mcp/models/': './src/common/models/',
  '@mcp/types/': './src/common/',
  '@mcp/': './src/common/'
}
```

### Test Projects

#### Node Environment

For backend logic, services, and utilities:

```typescript
{
  name: 'node',
  environment: 'node',
  include: [
    'tests/unit/**/*.test.ts',
    'tests/unit/**/test_*.ts',
    'tests/integration/**/*.test.ts',
    'tests/regression/**/*.test.ts'
  ],
  exclude: ['tests/unit/**/*.dom.test.ts', 'tests/unit/**/*.dom.test.tsx'],
  setupFiles: ['./tests/vitest.setup.ts']
}
```

#### DOM Environment (jsdom)

For React components and hooks:

```typescript
{
  name: 'dom',
  environment: 'jsdom',
  include: ['tests/unit/**/*.dom.test.ts', 'tests/unit/**/*.dom.test.tsx'],
  setupFiles: ['./tests/vitest.dom.setup.ts']
}
```

### Test Configuration

```typescript
{
  globals: true,
  testTimeout: 10000
}
```

### Coverage Configuration

```typescript
{
  provider: 'v8',
  reporter: ['text', 'text-summary', 'html', 'lcov'],
  reportsDirectory: './coverage',
  include: [
    'src/**/*.{ts,tsx}',
    'scripts/prepareBundledBun.js'
  ],
  exclude: [
    'src/**/*.d.ts',                    // Type declarations
    'src/index.ts',                    // Electron entry
    'src/preload.ts',                  // Preload entry
    'src/common/utils/shims/**',       // Shims
    'src/common/types/**',             // Type-only files
    'src/renderer/**/*.json',          // i18n JSON
    'src/renderer/**/*.svg',           // SVG assets
    'src/renderer/**/*.css',           // CSS files
    'src/common/config/i18n-config.json' // Config
  ],
  thresholds: {
    statements: 0,    // Informational only
    branches: 0,
    functions: 0,
    lines: 0
  }
}
```

## playwright.config.ts

### Configuration

```typescript
{
  testDir: './tests/e2e/specs',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,  // Electron tests share app instance
  retries: process.env.CI ? 1 : 0,
  workers: 1,           // Required: singleton Electron app
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'tests/e2e/report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/report' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry'
  },
  outputDir: 'tests/e2e/results'
}
```

### Key Settings

- **fullyParallel: false**: Electron tests cannot run in parallel
- **workers: 1**: Required because tests share a singleton Electron app
- **retries**: 1 retry in CI, 0 in development

## Running Tests

### Vitest (Unit/Integration/Regression)

```bash
# Run all tests
bun run test

# Run node environment tests only
bun run test:node

# Run DOM environment tests only
bun run test:dom

# Run with coverage
bun run test:coverage

# Run in watch mode
bun run test:watch

# Run specific file
bun run test tests/unit/example.test.ts
```

### Playwright (E2E)

```bash
# Run all E2E tests
bun run test:e2e

# Run E2E tests in UI mode
bun run test:e2e:ui

# Run E2E tests with debug
bun run test:e2e:debug
```

## Test File Naming Conventions

### Node Environment Tests

- `*.test.ts` - Standard test files
- `test_*.ts` - Alternative naming

### DOM Environment Tests

- `*.dom.test.ts` - Component/hook tests
- `*.dom.test.tsx` - React component tests

### E2E Tests

- `*.e2e.ts` - End-to-end tests

## Setup Files

### vitest.setup.ts

Node environment setup:

- Mock Electron APIs
- Configure test globals
- Set up test database

### vitest.dom.setup.ts

DOM environment setup:

- Configure jsdom
- Set up React Testing Library
- Mock renderer-specific APIs

## Coverage Targets

Current thresholds are set to 0% (informational only). Target is ≥80% coverage across all files.

## Related Documentation

- [tests/](../../tests/) - Test directory
- [vitest.config.ts](../../vitest.config.ts) - Vitest configuration
- [playwright.config.ts](../../playwright.config.ts) - Playwright configuration
- [AGENTS.md](../../AGENTS.md) - Testing standards
