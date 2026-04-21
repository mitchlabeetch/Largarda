# src/common/chat/approval/ - Approval Workflow

## Overview

Message approval workflow system for requiring user approval before executing sensitive actions or sending certain types of messages.

## Directory Structure

### Files

- **ApprovalStore.ts** (2KB) - Approval state management
  - Pending approval tracking
  - Approval history
  - State persistence
  - Approval queue management

- **index.ts** (191B) - Module exports

## Features

### Approval Queue

- Track pending approvals
- Queue management
- Priority handling
- Timeout management

### Approval History

- Record all approval decisions
- Timestamp tracking
- User attribution
- Reason logging

### State Management

- Persistent approval state
- Cross-process synchronization
- Event emission for state changes

## Usage Patterns

### Requesting Approval

```typescript
import { ApprovalStore } from '@/common/chat/approval';

const store = new ApprovalStore();
const approvalId = await store.requestApproval({
  action: 'send_message',
  message: '...',
  requiresApproval: true,
});
```

### Checking Approval Status

```typescript
const status = await store.getApprovalStatus(approvalId);
// status: 'pending' | 'approved' | 'rejected'
```

### Approving an Action

```typescript
await store.approve(approvalId, {
  userId: '...',
  reason: '...',
});
```

## Related Documentation

- [src/common/chat/](../) - Chat system overview
