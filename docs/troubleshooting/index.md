# Troubleshooting Guide

## Overview

Common issues, errors, and their solutions for Largo development and runtime.

## Build Issues

### Module Not Found

**Error**: `Cannot find module 'xxx'` or `Error: Module not found: Can't resolve 'xxx'`

**Solutions**:

- Run `bun install` to install dependencies
- Check if the module is listed in `package.json`
- Clear node_modules and reinstall: `rm -rf node_modules && bun install`
- Verify path aliases in `tsconfig.json` and build configs

### Type Errors

**Error**: TypeScript compilation fails with type errors

**Solutions**:

- Run `bunx tsc --noEmit` to check for type errors
- Check if types are properly exported
- Verify import paths use correct aliases (`@common/*`, `@process/*`, `@renderer/*`)
- Check for missing type definitions in `types.d.ts` files

### Vite Build Fails

**Error**: Build fails during Vite compilation

**Solutions**:

- Clear Vite cache: `rm -rf node_modules/.vite`
- Check for circular dependencies
- Verify build configuration in `electron.vite.config.ts`
- Check for syntax errors in entry files

### Electron Builder Fails

**Error**: Packaging fails with electron-builder

**Solutions**:

- Check `electron-builder.yml` configuration
- Verify all required assets exist
- Check for file path issues (Windows vs Unix paths)
- Run with `DEBUG=electron-builder` for detailed logs

## Runtime Errors

### IPC Communication Error

**Error**: `IPC channel not found` or `Error: Channel does not exist`

**Solutions**:

- Check bridge handler registration in `src/process/bridge/`
- Verify handler name matches between bridge and preload
- Check preload script is properly loaded
- Verify contextBridge configuration in `src/preload/`

### Database Error

**Error**: SQLite database locked or `SQLITE_BUSY`

**Solutions**:

- Close other instances of the application
- Check for file locks on database file
- Verify database directory has write permissions
- Use WAL mode for better concurrency (configured in database service)

### Extension Load Error

**Error**: Extension failed to load or manifest validation failed

**Solutions**:

- Check `aion-extension.json` manifest structure
- Verify all required fields are present
- Check file paths in manifest are relative and correct
- Review extension logs in console
- Validate against extension manifest schema

### Agent Execution Error

**Error**: Agent failed to generate response

**Solutions**:

- Check API key configuration for the agent provider
- Verify network connectivity
- Check API rate limits and quotas
- Review agent configuration in settings
- Check agent-specific error logs

## Extension Debugging

### Enable Debug Mode

Set advanced settings to enable debug logging:

```typescript
{
  advanced: {
    debugMode: true,
    logLevel: 'debug'
  }
}
```

### View Extension Logs

- Open DevTools (F12 or Cmd+Option+I)
- Check Console tab for extension-specific logs
- Filter logs by extension name or ID
- Look for errors in red text

### Test Extension Locally

```bash
# Install extension from local directory
bun run extension:install ./path/to/extension

# Rebuild extension during development
bun run extension:rebuild <extension-id>
```

### Common Extension Issues

#### Manifest Validation

- Ensure `name` and `version` are present
- Check `contributes` section structure
- Verify file paths are correct relative to manifest

#### Handler Not Found

- Verify handler file exists at specified path
- Check handler exports required functions
- Ensure handler is valid JavaScript/TypeScript

#### Permission Errors

- Check extension has required permissions in manifest
- Verify sandbox restrictions are respected
- Ensure file operations use bridge APIs

## Performance Issues

### Slow Startup

**Symptoms**: Application takes >10 seconds to launch

**Solutions**:

- Disable unused extensions
- Clear database cache: Delete `backups/` old entries
- Check for large conversation history (archive old conversations)
- Disable pet companion if not needed
- Check system resources (CPU, RAM, disk I/O)

### High Memory Usage

**Symptoms**: Application uses >1GB RAM

**Solutions**:

- Limit conversation history size in settings
- Close unused tabs/conversations
- Restart application periodically
- Check for memory leaks in DevTools Memory profiler
- Disable heavy extensions

### UI Lag

**Symptoms**: Interface is slow to respond

**Solutions**:

- Reduce font size (rendering optimization)
- Disable animations in settings
- Check for expensive re-renders in React DevTools Profiler
- Clear browser cache
- Disable markdown preview for large messages

### Slow AI Response

**Symptoms**: AI responses take >30 seconds

**Solutions**:

- Check network latency to AI provider
- Try different AI model (faster model)
- Reduce context window size
- Check API rate limits
- Use streaming for faster perceived response

## IPC Communication Errors

### Timeout Errors

**Error**: IPC call timeout

**Solutions**:

- Check main process logs for handler errors
- Verify handler is not blocking the event loop
- Implement timeout handling in bridge methods
- Use async/await properly to avoid blocking

### Channel Not Registered

**Error**: `Error: Channel does not exist: xxx`

**Solutions**:

- Verify bridge handler is registered in main process
- Check preload script exposes the channel
- Verify channel name spelling (case-sensitive)
- Check for duplicate channel registrations

### Serialization Errors

**Error**: Data cannot be serialized for IPC

**Solutions**:

- Ensure data is JSON-serializable
- Avoid passing functions, DOM nodes, or circular references
- Use structured clone algorithm for complex objects
- Convert large data to IDs and fetch separately

## Database Issues

### Corruption

**Symptoms**: Database queries fail or return incorrect data

**Solutions**:

- Restore from backup in `backups/` directory
- Run database integrity check
- Rebuild database from scratch (last resort)
- Check for disk errors

### Migration Failure

**Error**: Database migration failed

**Solutions**:

- Check `src/process/services/database/migrations.ts`
- Verify migration SQL is valid
- Manually apply migration if needed
- Rollback to previous migration version

### Slow Queries

**Symptoms**: Database operations are slow

**Solutions**:

- Check for missing indexes on frequently queried columns
- Use prepared statements
- Optimize complex queries
- Consider query result caching
- Use transactions for multi-step operations

## WebUI Issues

### Cannot Access WebUI

**Symptoms**: WebUI server not accessible

**Solutions**:

- Check if WebUI server is enabled in settings
- Verify server is running (check main process logs)
- Check firewall settings
- Verify port is not in use by another application
- Try accessing via `localhost:port` instead of IP

### Authentication Errors

**Error**: JWT authentication failed

**Solutions**:

- Check JWT secret configuration
- Verify token is not expired
- Clear browser cookies and localStorage
- Regenerate authentication token

### WebSocket Connection Failed

**Error**: WebSocket connection failed

**Solutions**:

- Check WebSocket server is running
- Verify CORS settings
- Check proxy configuration
- Test with direct connection (no proxy)

## Platform-Specific Issues

### Windows

- **Path separators**: Use forward slashes in config, Windows handles both
- **File permissions**: Run as administrator if file access fails
- **Antivirus**: Add exceptions for Largo directory
- **Path length**: Windows has 260 character path limit

### macOS

- **Gatekeeper**: May block unsigned apps, allow in System Preferences
- **Notarization**: Required for distribution
- **Sandbox**: File access restricted in sandbox mode
- **Permissions**: Grant accessibility permissions if needed

### Linux

- **Dependencies**: Ensure system dependencies are installed
- **AppImage**: May need `fuse` library
- **Wayland**: Check for Wayland compatibility issues
- **Permissions**: May need specific user permissions

## Getting Help

### Debug Information

Collect the following when reporting issues:

- Application version
- Operating system and version
- Error messages and stack traces
- Steps to reproduce
- Console logs (DevTools)
- Main process logs

### Log Locations

- **Renderer logs**: DevTools Console (F12)
- **Main process logs**: Check terminal where app was launched
- **Database logs**: In application data directory
- **Extension logs**: In DevTools Console with extension filter

### Useful Commands

```bash
# Check application version
bun run version

# Run with debug logging
DEBUG=* bun run dev

# Check for dependency issues
bunx depcheck

# Verify TypeScript types
bunx tsc --noEmit

# Run diagnostics
bun run diagnose
```

## Related Documentation

- [index_roadmap.md](../../index_roadmap.md) - Full documentation roadmap
- [docs/performance/](../performance/) - Performance optimization
- [docs/onboarding/](../onboarding/) - Development setup
