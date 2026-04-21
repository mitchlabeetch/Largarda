# Quick Start Guide

## Overview

Get started with Largo development in minutes.

## Prerequisites

- **Node.js**: 18+ (Bun recommended)
- **Git**: Latest version
- **OS**: Windows, macOS, or Linux

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/largo.git
cd largo
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start Development Server

```bash
bun run dev
```

This will:

- Start the Electron app
- Launch the renderer with HMR
- Start the main process with hot reload

## Project Structure

```
largo/
├── src/
│   ├── common/      # Shared code (types, API, utilities)
│   ├── process/     # Main process (Electron, Node.js)
│   ├── renderer/    # Renderer process (React UI)
│   └── preload/     # IPC bridge
├── tests/           # Test suite
├── docs/            # Documentation
└── package.json
```

## Key Concepts

### 3-Process Architecture

Largo uses a 3-process model:

1. **Main Process**: Electron main process, Node.js APIs
2. **Renderer Process**: React UI, DOM APIs
3. **Worker Processes**: Heavy computation, no Electron APIs

Processes communicate via IPC bridge.

### Path Aliases

Use path aliases instead of relative imports:

```typescript
// Good
import { Something } from '@common/types';

// Bad
import { Something } from '../../../common/types';
```

Available aliases:

- `@/*` → `src/*`
- `@common/*` → `src/common/*`
- `@process/*` → `src/process/*`
- `@renderer/*` → `src/renderer/*`
- `@worker/*` → `src/process/worker/*`

## Common Tasks

### Add a New Component

1. Create component in `src/renderer/components/`
2. Follow naming: PascalCase (e.g., `MyComponent.tsx`)
3. Use Arco Design components
4. Style with UnoCSS utilities or CSS Modules

```tsx
// src/renderer/components/MyComponent.tsx
import { Button } from '@arco-design/web-react';

export function MyComponent() {
  return (
    <div className='p-4 bg-base'>
      <Button type='primary'>Click me</Button>
    </div>
  );
}
```

### Add a New Service

1. Create service in `src/process/services/`
2. Implement interface
3. Register in bridge

```typescript
// src/process/services/MyService.ts
export class MyService {
  async doSomething() {
    // Implementation
  }
}
```

### Add IPC Bridge Method

1. Add handler in `src/process/bridge/myBridge.ts`
2. Expose in preload
3. Use in renderer

```typescript
// Bridge
ipcMain.handle('my:method', async (event, params) => {
  return await myService.doSomething(params);
});

// Preload
contextBridge.exposeInMainWorld('electronAPI', {
  my: {
    doSomething: (params) => ipcRenderer.invoke('my:method', params),
  },
});

// Renderer
const result = await window.electronAPI.my.doSomething(params);
```

## Development Workflow

### Code Quality

Before committing, run:

```bash
bun run lint:fix       # Auto-fix lint issues
bun run format         # Format code
bunx tsc --noEmit      # Type check
```

### Testing

```bash
bun run test           # Run all tests
bun run test:coverage  # Run with coverage
bun run test:e2e       # Run E2E tests
```

### Building

```bash
bun run build          # Production build
bun run preview        # Preview production build
```

## Code Conventions

### Naming

- Components: PascalCase (`Button.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Hooks: camelCase with `use` prefix (`useTheme.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Unused params: prefix with `_`

### UI Library

- Use Arco Design components
- Icons from `@icon-park/react`
- Styling with UnoCSS utilities
- CSS Modules for complex styles

### TypeScript

- Strict mode enabled
- No `any` types
- Prefer `type` over `interface`
- Use path aliases

## Getting Help

- **Documentation**: Check `docs/` directory
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Code Style**: See `AGENTS.md`
- **Examples**: See `examples/` directory

## Next Steps

1. Read [docs/ARCHITECTURE.md](../ARCHITECTURE.md) for system architecture
2. Read [AGENTS.md](../../AGENTS.md) for code conventions
3. Explore [docs/onboarding/three-process-model.md](./three-process-model.md) for 3-process model details
4. Check out [examples/](../../examples/) for extension examples

## Related Documentation

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [AGENTS.md](../../AGENTS.md) - Code conventions
- [docs/onboarding/three-process-model.md](./three-process-model.md) - 3-process model
