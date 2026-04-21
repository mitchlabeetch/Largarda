# Testing Guide for Contributors

## Overview

Learn how to write and run tests in Largo. The project uses Vitest for unit/integration tests and Playwright for E2E tests.

## Test Frameworks

### Vitest

- **Purpose**: Unit and integration tests
- **Environments**: Node.js and jsdom
- **Configuration**: `vitest.config.ts`

### Playwright

- **Purpose**: End-to-end tests
- **Environment**: Electron
- **Configuration**: `playwright.config.ts`

## Running Tests

### All Tests

```bash
bun run test
```

### Node Environment Tests (Backend)

```bash
bun run test:node
```

### DOM Environment Tests (React Components)

```bash
bun run test:dom
```

### With Coverage

```bash
bun run test:coverage
```

### E2E Tests

```bash
bun run test:e2e
```

### Watch Mode

```bash
bun run test:watch
```

## Writing Unit Tests

### Node Environment Test

For backend logic, services, utilities.

```typescript
// tests/unit/myService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '@/process/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe('expected');
  });

  it('should handle errors', async () => {
    await expect(service.doAsync()).rejects.toThrow();
  });
});
```

### DOM Environment Test

For React components and hooks.

```typescript
// tests/unit/MyComponent.dom.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/renderer/components/MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle click', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## Test File Naming

### Node Environment

- `*.test.ts` - Standard test files
- `test_*.ts` - Alternative naming

### DOM Environment

- `*.dom.test.ts` - Component tests
- `*.dom.test.tsx` - React component tests

### E2E

- `*.e2e.ts` - End-to-end tests

## Test Setup

### Node Environment Setup

`tests/vitest.setup.ts`:

- Mock Electron APIs
- Configure test database
- Set up global variables

### DOM Environment Setup

`tests/vitest.dom.setup.ts`:

- Configure jsdom
- Set up React Testing Library
- Mock renderer-specific APIs

## Common Patterns

### Testing Services

```typescript
describe('ConversationService', () => {
  it('should create conversation', async () => {
    const service = new ConversationService(mockRepository);
    const conversation = await service.createConversation({
      title: 'Test',
    });
    expect(conversation.id).toBeDefined();
    expect(conversation.title).toBe('Test');
  });
});
```

### Testing Hooks

```typescript
// tests/unit/hooks/useMyHook.dom.test.ts
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/renderer/hooks/useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.state).toBe('initial');
  });

  it('should update state on action', async () => {
    const { result } = renderHook(() => useMyHook());
    await act(async () => {
      await result.current.doSomething();
    });
    expect(result.current.state).toBe('updated');
  });
});
```

### Testing Async Operations

```typescript
it('should handle async operation', async () => {
  const promise = service.asyncOperation();
  await expect(promise).resolves.toBe('result');
});

it('should handle async error', async () => {
  const promise = service.failingOperation();
  await expect(promise).rejects.toThrow('error');
});
```

### Mocking

```typescript
it('should use mock', () => {
  const mockFn = vi.fn();
  mockFn.mockReturnValue('mocked');
  const result = service.useMock(mockFn);
  expect(mockFn).toHaveBeenCalled();
  expect(result).toBe('mocked');
});
```

## Coverage

### Coverage Target

- **Goal**: ≥80% coverage across all files
- **Current**: Informational (thresholds set to 0%)

### Coverage Report

```bash
bun run test:coverage
```

Report location: `coverage/`

### Coverage Configuration

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'text-summary', 'html', 'lcov'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.d.ts',
    'src/index.ts',
    'src/preload.ts',
    // Type-only files, assets, etc.
  ]
}
```

## E2E Testing

### E2E Test Structure

```typescript
// tests/e2e/specs/myFeature.e2e.ts
import { test, expect } from '@playwright/test';
import { ElectronApp } from '../fixtures';

test('should perform action', async ({ app }) => {
  const window = await app.firstWindow();

  // Interact with UI
  await window.click('#button');

  // Assert result
  const text = await window.textContent('#result');
  expect(text).toBe('Success');
});
```

### E2E Fixtures

`tests/e2e/fixtures.ts`:

- Electron app setup
- Window management
- Custom test utilities

## Best Practices

### Arrange-Act-Assert (AAA)

```typescript
it('should do something', () => {
  // Arrange
  const service = new MyService();
  const input = 'test';

  // Act
  const result = service.process(input);

  // Assert
  expect(result).toBe('expected');
});
```

### Descriptive Test Names

- Use `should` for expected behavior
- Describe what is being tested
- Be specific

```typescript
// Good
it('should return empty array when no items exist');

// Bad
it('test 1');
```

### Isolation

- Each test should be independent
- Use `beforeEach`/`afterEach` for setup/teardown
- Don't rely on test order

### Mock External Dependencies

- Mock API calls
- Mock file system
- Mock Electron APIs

```typescript
vi.mock('@common/api', () => ({
  ClientFactory: {
    create: vi.fn(() => mockClient),
  },
}));
```

## Quality Standards

### Before Committing

```bash
bun run lint:fix       # Fix lint issues
bun run format         # Format code
bunx tsc --noEmit      # Type check
bun run test           # Run tests
```

### CI/CD

- Tests run automatically on PR
- Coverage is reported
- Failing tests block merge

## Related Documentation

- [tests/](../../tests/) - Test directory
- [vitest.config.ts](../../vitest.config.ts) - Vitest configuration
- [playwright.config.ts](../../playwright.config.ts) - Playwright configuration
- [AGENTS.md](../../AGENTS.md) - Testing standards
