# public/ - Public Assets

## Overview

Static public assets served by the application, including PWA resources, pet animations, and service worker configuration.

## Directory Structure

### Root Files

- **manifest.webmanifest** (483B) - Progressive Web App manifest
  - App metadata (name, description, icons)
  - Display mode configuration
  - Theme colors
  - Start URL
  - PWA capabilities

- **sw.js** (2.6KB) - Service Worker for PWA functionality
  - Offline caching
  - Resource precaching
  - Network strategies
  - Update handling
  - Cache management

### `pet-states/` (22 items)

Pet companion animation state assets.

- SVG animations for different pet states:
  - attention.svg
  - building.svg
  - carrying.svg
  - (and 19 more state animations)
- Used for rendering pet animations in the UI
- Each SVG represents a different emotional/functional state

### `pwa/` (0 items)

PWA-specific assets (placeholder).

- Icons for different sizes
- Splash screens
- Platform-specific assets

## Progressive Web App (PWA)

### Manifest (manifest.webmanifest)

Defines PWA configuration:

- App identity (name, short_name, description)
- Icons for various sizes and platforms
- Display mode (standalone, fullscreen, etc.)
- Theme colors (background, theme)
- Start URL and scope
- Orientation preferences
- Categories for app stores

### Service Worker (sw.js)

Provides offline capabilities:

- Caches critical resources
- Implements cache-first or network-first strategies
- Handles offline scenarios
- Manages cache updates
- Intercepts network requests

## Pet States

### Purpose

Visual representation of the pet companion's current state and emotion.

### States Include

- **attention** - Pet is attentive/focused
- **building** - Pet is working/processing
- **carrying** - Pet is carrying something
- Additional emotional and functional states

### Usage

- Dynamically loaded based on pet state
- SVG format for scalability
- Animated for visual feedback
- Integrated with pet companion feature

## Asset Serving

These assets are:

- Served statically by the web server
- Accessible via relative paths
- Not processed by bundlers
- Directly referenced in HTML/React code

## Related Documentation

- [Design System](../docs/DESIGN_SYSTEM.md) - Visual design guidelines
- [WebUI Guide](../docs/WEBUI_GUIDE.md) - WebUI deployment
- [src/renderer/pet/](../src/renderer/pet/) - Pet UI components
