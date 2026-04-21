# src/renderer/components/settings/ - Settings Components

## Overview

React components for the settings interface. Includes modals, controls, and configuration UI elements.

## Directory Structure

### Core Components

- **SettingsModal/** (29 items) - Main settings modal
  - Tabbed interface
  - Settings categories
  - Form controls
  - Validation
  - Persistence

- **DirectorySelectionModal.tsx** (7.3KB) - Directory selection modal
  - Folder browser
  - Path validation
  - Recent paths
  - Permissions check

- **FontSizeControl.tsx** (4.7KB) - Font size control component
  - Slider control
  - Preview
  - Preset sizes
  - Accessibility support

- **LanguageSwitcher.tsx** (2KB) - Language selection component
  - Language dropdown
  - Flag display
  - Search/filter
  - 9 language support

- **ThemeSwitcher.tsx** (3.8KB) - Theme selection component
  - Light/dark mode toggle
  - Theme preview
  - Custom themes
  - System preference

- **UpdateModal.tsx** (18KB) - Update notification and download modal
  - Update availability check
  - Changelog display
  - Download progress
  - Installation
  - Version comparison

## Component Features

### Settings Modal

- Tabbed navigation (General, API, Appearance, Extensions, Team)
- Form validation
- Real-time preview
- Save/Cancel actions
- Keyboard shortcuts

### Directory Selection

- Native file dialog
- Path validation
- Permission checking
- Recent directories
- Bookmarking

### Font Size Control

- Slider with presets
- Live preview
- Accessibility support
- System font integration

### Language Switcher

- 9 languages (fr-FR, en-US, zh-CN, ja-JP, zh-TW, ko-KR, tr-TR, ru-RU, uk-UA)
- Flag icons
- Search functionality
- Instant apply

### Theme Switcher

- Light/dark mode
- Custom themes
- System preference
- Theme preview

### Update Modal

- Auto-update checking
- Changelog display
- Download progress
- Install/restart
- Version comparison

## Related Documentation

- [src/renderer/components/](../) - Components overview
- [src/renderer/pages/settings/](../../pages/settings/) - Settings pages
- [src/common/config/](../../../common/config/) - Configuration management
