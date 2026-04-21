# TypeScript Configuration Reference

## Overview

TypeScript configuration for the entire project using strict mode and path aliases.

## tsconfig.json

### Compiler Options

```json
{
  "compilerOptions": {
    "target": "ES6",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "noImplicitAny": true,
    "sourceMap": true,
    "outDir": "dist",
    "resolveJsonModule": true,
    "jsx": "react",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "baseUrl": "."
  }
}
```

### Key Options

#### Type Checking

- **noImplicitAny**: `true` - Disallows implicit `any` types (strict)
- **skipLibCheck**: `true` - Skip type checking of declaration files (faster builds)

#### Module Resolution

- **module**: `esnext` - Modern ES modules
- **moduleResolution**: `bundler` - Bundler-aware resolution
- **resolveJsonModule**: `true` - Allow importing JSON files
- **allowImportingTsExtensions**: `true` - Allow importing `.ts` files

#### JSX

- **jsx**: `react` - Use React JSX transform

#### Output

- **sourceMap**: `true` - Generate source maps
- **outDir**: `dist` - Output directory
- **noEmit**: `true` - Don't emit files (Vite handles compilation)

### Path Aliases

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@process/*": ["./src/process/*"],
    "@renderer/*": ["./src/renderer/*"],
    "@worker/*": ["./src/process/worker/*"]
  }
}
```

### Include/Exclude

**Include:**

```json
["src/**/*", "uno.config.ts", "electron.vite.config.ts", "playwright.config.ts", "src/renderer/types.d.ts"]
```

**Exclude:**

```json
[
  "src/process/services/database/drivers/BunSqliteDriver.ts",
  "src/process/services/database/drivers/BunSqliteDriver.bun.test.ts"
]
```

## Type Preferences

### Per AGENTS.md

- **Prefer `type` over `interface`** (per Oxlint config)
- **No `any` types** - Strict mode enabled
- **Implicit returns disallowed**
- **English for code comments**
- **JSDoc for public functions**

## Path Alias Usage

```typescript
// Instead of
import { Something } from '../../../common/types';

// Use
import { Something } from '@common/types';
```

## Related Documentation

- [tsconfig.json](../../tsconfig.json) - TypeScript configuration
- [AGENTS.md](../../AGENTS.md) - Code conventions
