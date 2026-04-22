/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Main database exports
 * Use this file to import database functionality throughout the app
 */

export { AionUIDatabase, getDatabase, closeDatabase } from './index';
export {
  runMigrations,
  rollbackMigrations,
  getMigrationHistory,
  isMigrationApplied,
  type IMigration,
} from './migrations';

export type {
  // Database-specific types
  IUser,
  IQueryResult,
  IPaginatedResult,
  // Business types (re-exported for convenience)
  TChatConversation,
  TMessage,
  IConfigStorageRefer,
  // Database row types (for advanced usage)
  IConversationRow,
  IMessageRow,
  IConfigRow,
} from './types';

// Re-export conversion functions
export { conversationToRow, rowToConversation, messageToRow, rowToMessage } from './types';

// Audit log exports
export { AuditLogService } from './auditLogService';
export type { IAuditLogRepository } from './IAuditLogRepository';
export { SqliteAuditLogRepository } from './SqliteAuditLogRepository';

// RBAC exports
export { RbacService } from './rbacService';
export type { IRoleRepository } from './IRoleRepository';
export type { IPermissionRepository } from './IPermissionRepository';
export { SqliteRoleRepository } from './SqliteRoleRepository';
export { SqlitePermissionRepository } from './SqlitePermissionRepository';

// Compliance repository exports
export type {
  IGdprExportRepository,
  IGdprErasureRepository,
  IRetentionPolicyRepository,
  IVdrAccessRepository,
  IComplianceWorkflowRepository,
  IDestructiveActionReviewRepository,
} from './IComplianceRepository';
