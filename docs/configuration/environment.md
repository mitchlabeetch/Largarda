# Environment Variables Reference

## Overview

Environment variables used throughout the Largo application for configuration and behavior control.

## Application Environment

### NODE_ENV

- **Description**: Application environment
- **Values**: `development` | `production`
- **Default**: `development`
- **Usage**: Controls build optimizations, debugging features, source maps

```typescript
// Set in build config
'process.env.NODE_ENV': JSON.stringify(mode)
```

### env

- **Description**: Runtime environment mode
- **Values**: `desktop` | `webui` | `remote`
- **Default**: `desktop`
- **Usage**: Determines if running as desktop app, WebUI, or remote agent

```typescript
// Set in build config
'process.env.env': JSON.stringify(process.env.env)
```

## Multi-Instance

### AIONUI_MULTI_INSTANCE

- **Description**: Allow multiple instances to run simultaneously
- **Values**: `1` | `0` | empty
- **Default**: empty (single instance)
- **Usage**: When set, allows multiple AionUi instances to run

```typescript
// Set in renderer build config
'process.env.AIONUI_MULTI_INSTANCE': JSON.stringify(process.env.AIONUI_MULTI_INSTANCE ?? '')
```

## Sentry (Error Tracking)

### SENTRY_DSN

- **Description**: Sentry Data Source Name
- **Format**: `https://<key>@<host>/<project>`
- **Default**: `''` (disabled)
- **Usage**: Enables error tracking to Sentry

```typescript
// Set in build config
'process.env.SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN ?? '')
```

### SENTRY_AUTH_TOKEN

- **Description**: Sentry authentication token for source map upload
- **Format**: Authentication token string
- **Default**: undefined
- **Usage**: Required for uploading source maps to Sentry

### SENTRY_ORG

- **Description**: Sentry organization slug
- **Default**: undefined
- **Usage**: Sentry organization identifier

### SENTRY_PROJECT

- **Description**: Sentry project slug
- **Default**: undefined
- **Usage**: Sentry project identifier

## WebUI Server

### ALLOW_REMOTE

- **Description**: Allow remote connections to WebUI server
- **Values**: `1` | `0`
- **Default**: `0` (local only)
- **Usage**: When set, WebUI accepts connections from remote addresses

```bash
bun run server:start:remote  # Sets ALLOW_REMOTE=1
```

### PORT

- **Description**: WebUI server port
- **Values**: Port number
- **Default**: `3000`
- **Usage**: Port for WebUI server to listen on

## Development

### VITE_PORT

- **Description**: Vite dev server port
- **Values**: Port number
- **Default**: `5173`
- **Usage**: Port for Vite dev server (auto-increments if occupied)

## Setting Environment Variables

### Command Line

```bash
NODE_ENV=production bun run build
ALLOW_REMOTE=1 bun run server:start:remote
```

### .env Files

Create `.env` files in project root:

```bash
# .env
NODE_ENV=development
SENTRY_DSN=https://...
```

### In Code

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const isWebUI = process.env.env === 'webui';
```

## Related Documentation

- [electron.vite.config.ts](../../electron.vite.config.ts) - Build configuration
- [src/process/webserver/](../../src/process/webserver/) - WebUI server
