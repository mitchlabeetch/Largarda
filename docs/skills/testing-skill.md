# Testing Skill

## Overview

The Testing skill provides guidance on testing workflow and quality standards for the Largo codebase. It ensures all code changes are properly tested before being committed.

## Triggers

This skill is invoked when:

- Writing new tests
- Adding new features
- Modifying logic that has existing tests
- Before claiming a task is complete
- User requests testing guidance

## Testing Framework

### Vitest

Primary testing framework for unit and integration tests.

**Features**:

- Fast unit test execution
- Native TypeScript support
- Snapshot testing
- Coverage reporting with @vitest/coverage-v8
- Watch mode for development

### Playwright

End-to-end testing framework.

**Features**:

- Browser automation (Chromium, Firefox, WebKit)
- Multi-browser testing
- Network interception
- Screenshot and video recording
- Trace viewing for debugging

## Test Categories

### Unit Tests

Test individual functions and components in isolation.

**Characteristics**:

- Fast execution
- Mock external dependencies
- High coverage target (≥80%)
- No side effects

**When to Write**:

- New utility functions
- New components
- New services
- Bug fixes

**Example**:

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/common/utils/formatDate';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01');
    expect(formatDate(date)).toBe('2024-01-01');
  });
});
```

### Integration Tests

Test interactions between components and services.

**Characteristics**:

- Test component interactions
- Test service integrations
- Test cross-process communication
- Test database operations

**When to Write**:

- New service integrations
- IPC bridge methods
- Database operations
- Complex workflows

**Example**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationService } from '@/process/services/ConversationServiceImpl';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService();
  });

  it('should create conversation', async () => {
    const conversation = await service.create({
      title: 'Test',
      agentId: 'test-agent',
    });
    expect(conversation.id).toBeDefined();
  });
});
```

### E2E Tests

Test complete user workflows from the UI perspective.

**Characteristics**:

- Test application from user perspective
- Test critical paths (login, conversation, team creation)
- Test across browsers
- Slower execution

**When to Write**:

- Critical user workflows
- Regression prevention
- Cross-browser compatibility
- UI integration

**Example**:

```typescript
import { test, expect } from '@playwright/test';

test('user can create conversation', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="new-conversation"]');
  await page.fill('[data-testid="conversation-title"]', 'Test');
  await page.click('[data-testid="save"]');
  await expect(page.locator('text=Test')).toBeVisible();
});
```

## Running Tests

### All Tests

```bash
bun run test
```

### Unit Tests Only

```bash
bun run test:unit
```

### Integration Tests Only

```bash
bun run test:integration
```

### E2E Tests Only

```bash
bun run test:e2e
```

### Specific Test Suite

```bash
bun run test -- src/common/utils/formatDate.test.ts
```

### Watch Mode

```bash
bun run test:watch
```

### Coverage Report

```bash
bun run test:coverage
```

## Coverage Requirements

### Target Coverage

- **Minimum**: 80% code coverage
- **Preferred**: 90%+ for critical paths
- **Measured**: Using @vitest/coverage-v8

### Coverage by Type

- **Unit tests**: Should cover individual functions and components
- **Integration tests**: Should cover service integrations
- **E2E tests**: Should cover critical user paths

### Checking Coverage

```bash
bun run test:coverage
# View report in coverage/ directory
```

## Test Organization

### File Structure

```
tests/
├── unit/              # Unit tests
│   ├── utils/
│   │   └── formatDate.test.ts
│   └── components/
│       └── Button.test.tsx
├── integration/      # Integration tests
│   ├── conversation.test.ts
│   └── database.test.ts
├── e2e/              # E2E tests
│   ├── helpers/
│   └── specs/
├── fixtures/         # Test fixtures
│   └── fake-extension/
└── vitest.setup.ts   # Test setup
```

### Naming Convention

- Test files: `[name].test.ts` or `[name].test.tsx`
- Describe blocks: Describe what is being tested
- Test cases: Describe expected behavior

## Test Writing Guidelines

### Unit Test Guidelines

1. **Test one thing per test**: Each test should verify a single behavior
2. **Use descriptive names**: Test names should clearly state what is tested
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock dependencies**: Isolate the unit under test
5. **Test edge cases**: Include boundary conditions and error cases

**Example**:

```typescript
it('should handle empty input', () => {
  expect(formatDate(null)).toBeNull();
});

it('should handle invalid date', () => {
  expect(() => formatDate('invalid')).toThrow();
});
```

### Integration Test Guidelines

1. **Test real interactions**: Use actual dependencies where possible
2. **Test happy path**: Verify normal operation works
3. **Test error paths**: Verify error handling works
4. **Clean up after tests**: Ensure no side effects
5. **Use test database**: Don't use production data

### E2E Test Guidelines

1. **Test user workflows**: Simulate real user actions
2. **Use data-testid**: Avoid fragile CSS selectors
3. **Wait for elements**: Don't rely on fixed timeouts
4. **Clean up after tests**: Reset application state
5. **Test across browsers**: Verify cross-browser compatibility

## Quality Standards

### Before Committing Tests

- [ ] All tests pass (`bun run test`)
- [ ] Coverage meets requirements (≥80%)
- [ ] No flaky tests (tests that sometimes fail)
- [ ] Tests are fast (unit tests < 1s each)
- [ ] Tests are maintainable and clear

### Test Quality Checklist

- [ ] Tests are isolated (no dependencies on other tests)
- [ ] Tests are deterministic (same result every time)
- [ ] Tests have clear descriptions
- [ ] Tests cover edge cases
- [ ] Tests are not brittle (don't break easily)

## Common Testing Patterns

### Mocking External Dependencies

```typescript
import { vi } from 'vitest'

// Mock a module
vi.mock('@/common/api/client', () => ({
  createClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(() => ({ content: 'mocked' }))
      }
    })
}))
```

### Testing Async Code

```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

it('should render button', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

### Testing Error Cases

```typescript
it('should throw error for invalid input', () => {
  expect(() => functionUnderTest(invalidInput)).toThrow();
});
```

## Debugging Tests

### Vitest Debugging

```bash
# Run tests in debug mode
bun run test -- --inspect-brk

# Or use VS Code debugger
# Set breakpoint and press F5
```

### Playwright Debugging

```bash
# Run with UI mode
bun run test:e2e --ui

# Run with headed mode
bun run test:e2e --headed

# Run with trace
bun run test:e2e --trace on
```

### Viewing Coverage

```bash
# Generate coverage report
bun run test:coverage

# Open in browser
open coverage/index.html
```

## Test Fixtures

### Using Fixtures

Fixtures provide reusable test data and helpers.

**Example**:

```typescript
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test('user can access protected page', async ({ page }) => {
  await login(page, 'test-user');
  await page.goto('/protected');
  await expect(page.locator('h1')).toContainText('Protected');
});
```

### Creating Fixtures

```typescript
// tests/fixtures/test-user.ts
export const testUser = {
  id: 'test-1',
  name: 'Test User',
  email: 'test@example.com',
};
```

## Performance Testing

### Benchmarking

For performance-critical code, use benchmarks:

```typescript
import { bench, describe } from 'vitest';

describe('formatDate performance', () => {
  bench('formatDate', () => {
    formatDate(new Date());
  });
});
```

## Continuous Integration

### CI Test Requirements

- All tests must pass in CI
- Coverage must meet requirements
- No flaky tests allowed
- Tests must complete within time limits

### Pre-commit Hooks

Consider using pre-commit hooks to run tests:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "bun run test:unit"
    }
  }
}
```

## Best Practices

### DO

- Write tests as you write code (TDD when possible)
- Keep tests simple and focused
- Use descriptive test names
- Test edge cases and error conditions
- Keep tests fast (especially unit tests)
- Mock external dependencies appropriately
- Clean up after tests
- Use fixtures for common test data

### DON'T

- Don't test implementation details
- Don't write tests that are too complex
- Don't use sleep/wait for synchronization
- Don't test third-party libraries
- Don't write flaky tests
- Don't ignore failing tests
- Don't commit without running tests

## Related Documentation

- [vitest.config.ts](../../vitest.config.ts) - Vitest configuration
- [playwright.config.ts](../../playwright.config.ts) - Playwright configuration
- [tests/](../../tests/) - Test suite
- [AGENTS.md](../../AGENTS.md) - Agent skills index
