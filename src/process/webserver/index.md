# src/process/webserver/ - WebUI Server

## Overview

Express-based web server for browser-based access to Largo. Provides JWT authentication, CSRF protection, rate limiting, and WebSocket support.

## Directory Structure

### Core Files

- **index.ts** (11.8KB) - Web server main entry point
  - Express app setup
  - Middleware configuration
  - Route registration
  - Server initialization

- **setup.ts** (6.2KB) - Server setup and configuration
  - Environment setup
  - Security configuration
  - CORS setup
  - Static file serving

- **adapter.ts** (2.3KB) - Web server adapter
  - Server lifecycle
  - Configuration handling

- **directoryApi.ts** (15KB) - Directory API endpoints
  - File browsing
  - Directory operations
  - File serving

### `auth/` (6 items)

Authentication system.

- JWT authentication
- Password management
- Session handling
- Token validation

### `config/` (1 items)

Server configuration.

### `middleware/` (4 items)

Express middleware.

- Authentication middleware
- CSRF protection
- Rate limiting
- Error handling

### `routes/` (6 items)

API route definitions.

- Conversation routes
- Agent routes
- Settings routes
- File routes

### `types/` (1 items)

Server-specific type definitions.

### `websocket/` (1 items)

WebSocket support for real-time updates.

## Key Features

### Authentication

- JWT-based authentication
- Password hashing with bcrypt
- Token refresh
- Session management

### Security

- CSRF protection
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention

### WebSocket

- Real-time message streaming
- Event broadcasting
- Connection management
- Authentication for WebSocket

### Static Files

- Serve React build
- Static asset serving
- Cache headers
- Gzip compression

## Usage

### Starting the Server

```bash
bun run server:start              # Development
bun run server:start:prod         # Production
bun run server:start:remote       # Allow remote connections
```

### Configuration

Environment variables:

- `NODE_ENV` - Environment (development/production)
- `ALLOW_REMOTE` - Allow remote connections
- `PORT` - Server port (default: 3000)

## Related Documentation

- [docs/WEBUI_GUIDE.md](../../../../docs/WEBUI_GUIDE.md) - WebUI guide
- [docs/SERVER_DEPLOY_GUIDE.md](../../../../docs/SERVER_DEPLOY_GUIDE.md) - Server deployment
