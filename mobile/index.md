# mobile/ - React Native Mobile Application

## Overview
React Native mobile application for iOS and Android platforms. Provides mobile access to Largo's M&A assistant functionality.

## Directory Structure

### Configuration Files
- **.easignore** - EAS Build ignore patterns
- **.gitignore** - Git ignore patterns for mobile
- **app.config.ts** (1.3KB) - Expo/EAS application configuration
- **eas.json** (731B) - EAS Build configuration
- **jest.config.ts** - Jest testing configuration
- **jest.setup.ts** (1KB) - Jest test setup
- **metro.config.js** (874B) - Metro bundler configuration
- **package.json** (2.9KB) - Mobile dependencies and scripts
- **tsconfig.json** (283B) - TypeScript configuration
- **bun.lock** - Bun lockfile for dependencies

### `app/` (11 items)
React Native application source code using Expo Router.
- **(tabs)/** - Tab-based navigation screens
- **_layout.tsx** - Root layout configuration
- **connect.tsx** - Connection/Authentication screen
- **file-preview.tsx** - File preview component

### `src/` (49 items)
Mobile-specific source code.
- Business logic
- Components
- Utilities
- Services
- API clients

### `__tests__/` (7 items)
Mobile test suite.
- Component tests
- Integration tests
- Unit tests

### `assets/` (0 items)
Mobile-specific assets (placeholder).
- Images
- Fonts
- Icons

### `scripts/` (1 items)
Mobile build and utility scripts.

### `versions/` (1 items)
Version management for mobile app.

## Technology Stack

### Framework
- **React Native** - Cross-platform mobile framework
- **Expo** - Development and build platform
- **Expo Router** - File-based routing

### Build System
- **EAS Build** - Expo Application Services for building
- **Metro** - JavaScript bundler for React Native

### Testing
- **Jest** - Testing framework
- **React Native Testing Library** - Component testing

### Language
- **TypeScript** - Type-safe JavaScript

## Key Features

### Cross-Platform
- iOS and Android support
- Shared codebase between platforms
- Platform-specific adaptations where needed

### Authentication
- Connection screen for user authentication
- Secure credential management
- Session persistence

### File Handling
- File preview functionality
- Document viewing
- Attachment management

### Navigation
- Tab-based navigation
- File-based routing with Expo Router
- Deep linking support

## Build Configuration

### EAS Build
- **eas.json** - Build configuration for different environments
- Supports development, preview, and production builds
- Platform-specific configurations (iOS, Android)
- Code signing and distribution

### Metro Bundler
- **metro.config.js** - Bundler configuration
- Module resolution
- Transformer configuration
- Platform extensions

## Development Workflow

### Running the App
```bash
cd mobile
bun install
bun start  # Start Expo development server
```

### Building
```bash
eas build --platform ios    # Build for iOS
eas build --platform android # Build for Android
```

### Testing
```bash
bun test  # Run Jest tests
```

## Related Documentation
- [README](../README.md) - Main project overview
- [AGENTS.md](../AGENTS.md) - Development conventions
