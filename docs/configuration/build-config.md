# Build Configuration Reference

## Overview

Largo uses Electron-Vite for the main Electron build configuration and a separate Vite config for standalone renderer builds (WebUI/server deployments).

## electron.vite.config.ts

### Main Process Configuration

#### Plugins

- **externalizeDepsPlugin**: Externalizes Node.js dependencies for main process
  - Excludes `fix-path` to bundle inline (3KB)
- **buildMcpServersPlugin**: Builds MCP servers after main process bundle
- **viteStaticCopy**: Copies static assets (production only)
  - Skills: `src/process/resources/skills/*` → `skills/`
  - Assistant resources: `src/process/resources/assistant/*` → `assistant/`
  - Logos: `src/renderer/assets/logos/*` → `static/images/`
- **sentryVitePlugin**: Source map upload to Sentry (production with auth token)

#### Path Aliases

```typescript
{
  '@': resolve('src'),
  '@common': resolve('src/common'),
  '@renderer': resolve('src/renderer'),
  '@process': resolve('src/process'),
  '@worker': resolve('src/process/worker'),
  '@xterm/headless': resolve('src/common/utils/shims/xterm-headless.ts')
}
```

#### Build Options

```typescript
{
  sourcemap: enableSentrySourceMaps ? 'hidden' : false,
  reportCompressedSize: false,
  rollupOptions: {
    input: {
      index: 'src/index.ts',
      gemini: 'src/process/worker/gemini.ts',
      lifecycleRunner: 'src/process/extensions/lifecycle/lifecycleRunner.ts'
    }
  }
}
```

#### Environment Variables

```typescript
{
  'process.env.NODE_ENV': mode,
  'process.env.env': process.env.env,
  'process.env.SENTRY_DSN': process.env.SENTRY_DSN ?? ''
}
```

### Preload Configuration

#### Plugins

- **externalizeDepsPlugin**: Externalizes Node.js dependencies

#### Path Aliases

```typescript
{
  '@': resolve('src'),
  '@common': resolve('src/common')
}
```

#### Build Options

```typescript
{
  sourcemap: false,
  rollupOptions: {
    input: {
      index: 'src/preload/main.ts',
      petPreload: 'src/preload/petPreload.ts',
      petHitPreload: 'src/preload/petHitPreload.ts',
      petConfirmPreload: 'src/preload/petConfirmPreload.ts'
    }
  }
}
```

### Renderer Configuration

#### Server Options

```typescript
{
  port: 5173,
  hmr: {
    host: 'localhost' // Direct connection, not via WebUI proxy
  }
}
```

#### Path Aliases

```typescript
{
  '@': resolve('src'),
  '@common': resolve('src/common'),
  '@renderer': resolve('src/renderer'),
  '@process': resolve('src/process'),
  '@worker': resolve('src/process/worker'),
  streamdown: resolve('node_modules/streamdown/dist/index.js')
}
```

#### Plugins

- **UnoCSS**: Utility-first CSS framework
- **iconParkPlugin**: Transforms Icon Park imports to use HOC
- **sentryVitePlugin**: Source map upload (production)

#### Build Options

```typescript
{
  target: 'es2022',
  sourcemap: enableSentrySourceMaps ? 'hidden' : isDevelopment,
  minify: !isDevelopment,
  chunkSizeWarningLimit: 1500,
  cssCodeSplit: true,
  rollupOptions: {
    input: {
      index: 'src/renderer/index.html',
      pet: 'src/renderer/pet/pet.html',
      'pet-hit': 'src/renderer/pet/pet-hit.html',
      'pet-confirm': 'src/renderer/pet/pet-confirm.html'
    },
    external: ['node:crypto', 'crypto']
  }
}
```

#### Manual Chunks (Code Splitting)

```typescript
manualChunks(id: string) {
  if (id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react';
  if (id.includes('/@arco-design/')) return 'vendor-arco';
  if (id.includes('/react-markdown/') || id.includes('/remark-') /* ... */) return 'vendor-markdown';
  if (id.includes('/react-syntax-highlighter/') /* ... */) return 'vendor-highlight';
  if (id.includes('/monaco-editor/') || id.includes('/codemirror/')) return 'vendor-editor';
  if (id.includes('/katex/')) return 'vendor-katex';
  if (id.includes('/@icon-park/')) return 'vendor-icons';
  if (id.includes('/diff2html/')) return 'vendor-diff';
}
```

#### Optimize Dependencies

```typescript
{
  exclude: ['electron'],
  include: [
    'react',
    'react-dom',
    'react-router-dom',
    'react-i18next',
    'i18next',
    '@arco-design/web-react',
    '@icon-park/react',
    'react-markdown',
    'react-syntax-highlighter',
    'react-virtuoso',
    'classnames',
    'swr',
    'eventemitter3',
    'katex',
    'diff2html',
    'remark-gfm',
    'remark-math',
    'remark-breaks',
    'rehype-raw',
    'rehype-katex'
  ]
}
```

## vite.renderer.config.ts

### Purpose

Standalone renderer build for WebUI/server deployments without Electron dependency.

### Key Differences from electron.vite.config.ts

- No Electron-specific plugins
- Single entry point (no pet windows)
- Outputs to `out/renderer/`
- Production-only configuration
- No MCP server building

### Configuration

```typescript
{
  base: './',
  root: resolve('src/renderer'),
  publicDir: resolve('public'),
  build: {
    outDir: resolve('out/renderer'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    minify: true
  }
}
```

## Custom Plugins

### iconParkPlugin

Transforms Icon Park icon imports to use HOC for consistent styling:

```typescript
// Before
import { User, Settings } from '@icon-park/react';

// After
import { User as _User, Settings as _Settings } from '@icon-park/react';
import IconParkHOC from '@renderer/components/IconParkHOC';
const User = IconParkHOC(_User);
const Settings = IconParkHOC(_Settings);
```

### buildMcpServersPlugin

Builds MCP servers using esbuild after main process bundle:

```typescript
execSync('node scripts/build-mcp-servers.js', { stdio: 'inherit' });
```

## Build Scripts

```bash
# Development
bun run dev              # Start Electron with HMR
bun run dev:renderer      # Start renderer dev server only

# Production
bun run build            # Build for production
bun run build:renderer   # Build renderer only (for WebUI)
bun run build:renderer:web # Standalone renderer build

# Preview
bun run preview          # Preview production build
```

## Related Documentation

- [electron.vite.config.ts](../../electron.vite.config.ts) - Electron-Vite config
- [vite.renderer.config.ts](../../vite.renderer.config.ts) - Standalone renderer config
- [uno.config.ts](../../uno.config.ts) - UnoCSS configuration
