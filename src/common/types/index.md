# src/common/types/ - Type Definitions

## Overview

TypeScript type definitions shared across all processes. Provides comprehensive type safety for the entire application.

## Directory Structure

### Core Type Files

- **acpTypes.ts** (40KB) - ACP (Aion CLI) type definitions
  - Extensive ACP-related types
  - Command types
  - Response types
  - Configuration types

- **conversion.ts** (3.2KB) - Type conversion utilities
  - Conversion between type systems
  - Type guards
  - Type transformers

- **database.ts** (439B) - Database-related types
  - Entity types
  - Query result types
  - Repository types

- **electron.ts** (2.5KB) - Electron-specific types
  - IPC types
  - Window types
  - Process types

- **fileSnapshot.ts** (624B) - File snapshot types
  - File metadata types
  - Snapshot types

- **hub.ts** (1.5KB) - Extension hub types
  - Hub API types
  - Extension metadata types
  - Marketplace types

- **pptx2json.d.ts** (368B) - PowerPoint conversion type definitions
  - PPTX parsing types
  - JSON structure types

- **preview.ts** (701B) - Preview-related types
  - Preview configuration types
  - Preview state types

- **speech.ts** (1KB) - Speech recognition types
  - Speech-to-text types
  - Audio types

- **teamTypes.ts** (4.4KB) - Multi-agent team types
  - Team configuration types
  - Agent types
  - Workflow types

- **turndown-plugin-gfm.d.ts** (332B) - Markdown conversion type definitions
  - GFM plugin types
  - Conversion options

### `codex/` (11 items)

Codex-specific type definitions.

- **codexModels.ts** (1.3KB) - Codex model types
- **codexModes.ts** (537B) - Codex mode types
- **types/** (6 items) - Additional codex types
- **utils/** (3 items) - Codex type utilities

## Key Type Categories

### ACP Types (acpTypes.ts)

Comprehensive types for Aion CLI integration:

- Command and response types
- Configuration types
- State management types
- Error types

### Team Types (teamTypes.ts)

Multi-agent team system types:

- Team configuration
- Agent definitions
- Workflow types
- Communication types

### Electron Types (electron.ts)

Electron-specific types:

- IPC communication
- Window management
- Process types
- Event types

### Database Types (database.ts)

Database-related types:

- Entity types
- Query types
- Repository interfaces
- Transaction types

## Related Documentation

- [src/common/api/](../api/) - API client types
- [src/process/team/types.ts](../../process/team/types.ts) - Team implementation types
- [src/process/services/database/types.ts](../../process/services/database/types.ts) - Database service types
