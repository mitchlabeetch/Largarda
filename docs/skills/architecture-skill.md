# Architecture Skill

## Overview

The Architecture skill provides guidance on file and directory structure conventions for all process types in Largo. It ensures consistent code organization across the project.

## Triggers

This skill is invoked when:

- Creating new files or directories
- Adding modules to existing directories
- Making architectural decisions
- Restructuring code
- Converting single-file components to directories

## Core Principles

### 3-Process Architecture

Largo uses a strict 3-process model:

- **Main Process** (`src/process/`) - Electron main process, Node.js APIs
- **Renderer Process** (`src/renderer/`) - React UI, DOM APIs
- **Worker Processes** (`src/process/worker/`) - Fork workers, no Electron APIs

**Critical Rule**: Never mix APIs across process types. Main process cannot use DOM APIs; renderer cannot use Node.js APIs.

### Directory Size Limit

**Rule**: A single directory must not exceed **10** direct children (files + subdirectories).

**When approaching this limit**: Split by responsibility into subdirectories.

### Path Aliases

Use path aliases instead of relative imports:

```typescript
// Good
import { Something } from '@common/types';

// Bad
import { Something } from '../../../common/types';
```

**Available Aliases**:

- `@/*` → `src/*`
- `@common/*` → `src/common/*`
- `@process/*` → `src/process/*`
- `@renderer/*` → `src/renderer/*`
- `@worker/*` → `src/process/worker/*`

## Directory Naming Conventions

### General Rules

- **Directories**: kebab-case (e.g., `chat-components`, `user-settings`)
- **Files**: camelCase for code (e.g., `formatDate.ts`), PascalCase for React components (e.g., `Button.tsx`)
- **Constants files**: camelCase (e.g., `constants.ts`) with UPPER_SNAKE_CASE values inside
- **Type files**: camelCase (e.g., `types.ts`)
- **Style files**: kebab-case or `ComponentName.module.css`

### Process-Specific Conventions

#### Main Process (`src/process/`)

- **Services**: camelCase (e.g., `conversationService.ts`)
- **Bridges**: camelCase with `Bridge` suffix (e.g., `conversationBridge.ts`)
- **Agents**: camelCase (e.g., `geminiAgent.ts`)
- **Channels**: camelCase (e.g., `feishuChannel.ts`)

#### Renderer Process (`src/renderer/`)

- **Components**: PascalCase (e.g., `MessageList.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTheme.ts`)
- **Pages**: camelCase (e.g., `conversationPage.tsx`)
- **Services**: camelCase (e.g., `apiService.ts`)

#### Common (`src/common/`)

- **Types**: camelCase (e.g., `database.ts`)
- **Utils**: camelCase (e.g., `formatDate.ts`)
- **API**: camelCase (e.g., `clientFactory.ts`)

## File Placement Guidelines

### Where to Place Code

#### UI Components

- **Location**: `src/renderer/components/`
- **Subdirectories**: Organize by domain (chat, settings, layout, etc.)
- **Example**: `src/renderer/components/chat/MessageList.tsx`

#### Services

- **Main process services**: `src/process/services/`
- **Renderer services**: `src/renderer/services/`
- **Example**: `src/process/services/ConversationServiceImpl.ts`

#### Types

- **Shared types**: `src/common/types/`
- **Domain-specific types**: Place in domain directory
- **Example**: `src/common/types/database.ts`

#### Utilities

- **Common utilities**: `src/common/utils/`
- **Renderer utilities**: `src/renderer/utils/`
- **Process utilities**: `src/process/utils/`
- **Example**: `src/common/utils/formatDate.ts`

### Shared vs Private Code

#### Shared Code

- **Location**: `src/common/`
- **Use Case**: Code used by multiple processes
- **Examples**: Types, utilities, API clients

#### Private Code

- **Location**: Process-specific directories
- **Use Case**: Code specific to one process
- **Examples**: UI components (renderer), Electron APIs (main)

## Component Organization

### When to Split Components

**Split when**:

- Component exceeds 300 lines
- Component has multiple responsibilities
- Component can be logically divided
- Directory approaches 10 files

**Example split**:

```
Before:
src/renderer/components/ChatPanel.tsx (500 lines)

After:
src/renderer/components/chat/
  ├── ChatPanel.tsx (main component)
  ├── MessageList.tsx
  ├── InputArea.tsx
  └── chat.module.css
```

### Module Structure

For complex modules, use this structure:

```
module-name/
├── index.ts           # Module exports
├── types.ts           # Type definitions
├── constants.ts       # Constants
├── main.ts            # Main implementation
├── utils.ts           # Utilities
└── __tests__/         # Tests
```

## Page Module Layout

### Page Structure

Pages in `src/renderer/pages/` follow this pattern:

```
page-name/
├── index.tsx          # Page component
├── components/        # Page-specific components
├── hooks/             # Page-specific hooks
├── utils/             # Page-specific utilities
└── [page-name].module.css
```

**Example**:

```
src/renderer/pages/conversation/
├── index.tsx
├── components/
│   ├── MessageList.tsx
│   └── InputArea.tsx
├── hooks/
│   └── useConversation.ts
└── conversation.module.css
```

## Cross-Process Communication

### IPC Bridge Pattern

All cross-process communication must go through the IPC bridge:

1. Define bridge handler in `src/process/bridge/`
2. Expose in preload (`src/preload/`)
3. Use in renderer via `window.electronAPI`

**Example**:

```typescript
// Bridge (src/process/bridge/myBridge.ts)
ipcMain.handle('my:method', async (event, params) => {
  return await myService.doSomething(params);
});

// Preload (src/preload/main.ts)
contextBridge.exposeInMainWorld('electronAPI', {
  my: {
    doSomething: (params) => ipcRenderer.invoke('my:method', params),
  },
});

// Renderer
const result = await window.electronAPI.my.doSomething(params);
```

## Quality Standards

### Checklist Before Creating Files

- [ ] Determine correct process type (main, renderer, worker, common)
- [ ] Check directory size (< 10 children)
- [ ] Follow naming conventions
- [ ] Use appropriate path aliases
- [ ] Place in correct directory
- [ ] Consider future splitting needs

### Code Organization Review

- [ ] No mixing of process APIs
- [ ] Consistent naming within directory
- [ ] Logical grouping of related files
- [ ] Clear separation of concerns
- [ ] Appropriate use of shared vs private code

## Common Mistakes

### Mistake 1: Mixing Process APIs

```typescript
// BAD: Using Node.js API in renderer
import fs from 'fs'; // Error in renderer

// GOOD: Use bridge instead
const result = await window.electronAPI.fs.readFile(path);
```

### Mistake 2: Relative Imports

```typescript
// BAD: Deep relative import
import { Type } from '../../../../common/types';

// GOOD: Use path alias
import { Type } from '@common/types';
```

### Mistake 3: Overcrowded Directories

```typescript
// BAD: Directory with 15 files
src/renderer/components/
  ├── Component1.tsx
  ├── Component2.tsx
  // ... 13 more files

// GOOD: Split by domain
src/renderer/components/
  ├── chat/
  ├── settings/
  └── layout/
```

### Mistake 4: Wrong Naming Convention

```typescript
// BAD: Inconsistent naming
src / renderer / components / messageList.tsx; // Should be PascalCase
src / common / utils / FormatDate.ts; // Should be camelCase

// GOOD: Consistent naming
src / renderer / components / MessageList.tsx;
src / common / utils / formatDate.ts;
```

## Decision Framework

### Where to Place New Code?

**Question 1**: Is this code used by multiple processes?

- Yes → Place in `src/common/`
- No → Continue to question 2

**Question 2**: Which process needs this code?

- Main process (Electron APIs) → `src/process/`
- Renderer (UI/DOM) → `src/renderer/`
- Worker (CPU-intensive) → `src/process/worker/`

**Question 3**: What type of code is it?

- Service → `services/` subdirectory
- Component → `components/` subdirectory
- Utility → `utils/` subdirectory
- Type → `types/` subdirectory

**Question 4**: Will this directory exceed 10 files?

- Yes → Split by responsibility into subdirectories
- No → Place in current directory

## Related Documentation

- [docs/conventions/file-structure.md](../conventions/file-structure.md) - Complete file structure rules
- [docs/tech/architecture.md](../tech/architecture.md) - System architecture
- [AGENTS.md](../../AGENTS.md) - Agent skills index
- [.claude/skills/architecture/](../../.claude/skills/architecture/) - Skill implementation
