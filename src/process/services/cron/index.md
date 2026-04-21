# src/process/services/cron/ - Scheduled Task System

## Overview

Cron-based scheduled task system for automating recurring operations. Supports job scheduling, execution, and monitoring with SQLite persistence.

## Directory Structure

### Core Components

- **CronService.ts** (27.9KB) - Main cron service
  - Job scheduling and management
  - Cron expression parsing
  - Job execution orchestration
  - Event emission

- **CronStore.ts** (10.4KB) - Cron job persistence
  - SQLite storage for jobs
  - Job state management
  - Execution history
  - Scheduling metadata

- **CronBusyGuard.ts** (3.8KB) - Concurrency control
  - Prevents overlapping executions
  - Busy state tracking
  - Lock management

- **SkillSuggestWatcher.ts** (5.6KB) - Skill file watcher
  - Monitors skill file changes
  - Auto-reloads skills
  - Triggers re-evaluation

- **cronSkillFile.ts** (7KB) - Skill file management
  - Skill file parsing
  - Validation
  - Loading logic

### Interfaces

- **ICronEventEmitter.ts** (500B) - Event emitter interface
- **ICronJobExecutor.ts** (1.2KB) - Job executor interface
- **ICronRepository.ts** (578B) - Repository interface

### Implementations

- **SqliteCronRepository.ts** (1.2KB) - SQLite repository implementation
- **IpcCronEventEmitter.ts** (1KB) - IPC-based event emitter
- **WorkerTaskManagerJobExecutor.ts** (36.4KB) - Worker-based job executor

### Singleton

- **cronServiceSingleton.ts** (835B) - Singleton instance

## Key Features

### Job Scheduling

- Cron expression support
- Flexible scheduling
- Timezone handling
- One-time and recurring jobs

### Job Execution

- Synchronous and async execution
- Worker-based execution for heavy tasks
- Timeout handling
- Error handling and retry

### Concurrency Control

- Prevent overlapping executions
- Busy state management
- Lock-based synchronization
- Priority handling

### Persistence

- SQLite storage
- Job state tracking
- Execution history
- Audit logging

### Event System

- Job execution events
- State change notifications
- Error events
- Completion events

## Usage Patterns

### Scheduling a Job

```typescript
import { cronService } from '@/process/services/cron';

await cronService.scheduleJob({
  name: 'daily-report',
  cronExpression: '0 9 * * *', // 9 AM daily
  handler: async () => {
    // Job logic
  },
});
```

### Monitoring Execution

```typescript
cronService.on('job:executed', (event) => {
  console.log(`Job ${event.jobName} executed`);
});
```

## Related Documentation

- [src/process/services/](../) - Services overview
- [src/renderer/pages/cron/](../../../renderer/pages/cron/) - Cron UI pages
