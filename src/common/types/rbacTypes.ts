/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RBAC (Role-Based Access Control) and Audit Log Types
 *
 * Provides type definitions for:
 * - Roles and permissions
 * - User-role assignments
 * - Audit logging for compliance
 */

// ===== Permission Types =====

/**
 * Core permission actions
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * Resource types that can be permissioned
 */
export enum ResourceType {
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
  TEAM = 'team',
  AGENT = 'agent',
  CHANNEL = 'channel',
  EXTENSION = 'extension',
  CRON_JOB = 'cron_job',
  USER = 'user',
  SETTINGS = 'settings',
  SYSTEM = 'system',
}

/**
 * Permission definition
 */
export interface IPermission {
  id: string;
  name: string;
  description: string;
  resourceType: ResourceType;
  action: PermissionAction;
  createdAt: number;
}

/**
 * Permission row in database
 */
export interface IPermissionRow {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  created_at: number;
}

// ===== Role Types =====

/**
 * Built-in system roles
 */
export enum SystemRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  SERVICE = 'service',
}

/**
 * Role definition
 */
export interface IRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Role row in database
 */
export interface IRoleRow {
  id: string;
  name: string;
  description: string;
  is_system: number; // 0 or 1
  created_at: number;
  updated_at: number;
}

/**
 * Role with associated permissions
 */
export interface IRoleWithPermissions extends IRole {
  permissions: IPermission[];
}

/**
 * Role-Permission mapping
 */
export interface IRolePermission {
  roleId: string;
  permissionId: string;
  createdAt: number;
}

/**
 * Role-Permission row in database
 */
export interface IRolePermissionRow {
  role_id: string;
  permission_id: string;
  created_at: number;
}

// ===== User Role Types =====

/**
 * User-Role assignment
 */
export interface IUserRole {
  userId: string;
  roleId: string;
  assignedAt: number;
  assignedBy?: string;
}

/**
 * User-Role row in database
 */
export interface IUserRoleRow {
  user_id: string;
  role_id: string;
  assigned_at: number;
  assigned_by?: string;
}

/**
 * User with roles and permissions
 */
export interface IUserWithRoles {
  userId: string;
  roles: IRole[];
  permissions: IPermission[];
}

// ===== Audit Log Types =====

/**
 * Audit log severity levels
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit log action categories
 */
export enum AuditActionCategory {
  AUTH = 'auth',
  DATA = 'data',
  CONFIG = 'config',
  SYSTEM = 'system',
  SECURITY = 'security',
  USER = 'user',
}

/**
 * Audit log entry
 */
export interface IAuditLog {
  id: string;
  timestamp: number;
  userId?: string;
  username?: string;
  action: string;
  category: AuditActionCategory;
  severity: AuditSeverity;
  resourceType?: ResourceType;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Audit log row in database
 */
export interface IAuditLogRow {
  id: string;
  timestamp: number;
  user_id?: string;
  username?: string;
  action: string;
  category: string;
  severity: string;
  resource_type?: string;
  resource_id?: string;
  description: string;
  metadata?: string; // JSON string
  ip_address?: string;
  user_agent?: string;
  success: number; // 0 or 1
  error_message?: string;
}

/**
 * Query filters for audit log retrieval
 */
export interface IAuditLogQuery {
  startTime?: number;
  endTime?: number;
  userId?: string;
  action?: string;
  category?: AuditActionCategory;
  severity?: AuditSeverity;
  resourceType?: ResourceType;
  resourceId?: string;
  success?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: 'timestamp' | 'severity' | 'action';
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Paginated audit log result
 */
export interface IAuditLogPaginatedResult {
  logs: IAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Audit log statistics
 */
export interface IAuditLogStats {
  totalCount: number;
  countBySeverity: Record<AuditSeverity, number>;
  countByCategory: Record<AuditActionCategory, number>;
  countByAction: Record<string, number>;
  uniqueUsers: number;
  timeRange: {
    start: number;
    end: number;
  };
}

// ===== Permission Check Types =====

/**
 * Permission check request
 */
export interface IPermissionCheck {
  userId: string;
  resourceType: ResourceType;
  action: PermissionAction;
  resourceId?: string;
}

/**
 * Permission check result
 */
export interface IPermissionCheckResult {
  granted: boolean;
  reason?: string;
  roleIds?: string[];
  permissionIds?: string[];
}

// ===== RBAC Configuration =====

/**
 * Default permissions by resource type
 */
export const DEFAULT_PERMISSIONS: Omit<IPermission, 'id' | 'createdAt'>[] = [
  // Conversation permissions
  {
    name: 'conversation:create',
    description: 'Create conversations',
    resourceType: ResourceType.CONVERSATION,
    action: PermissionAction.CREATE,
  },
  {
    name: 'conversation:read',
    description: 'Read conversations',
    resourceType: ResourceType.CONVERSATION,
    action: PermissionAction.READ,
  },
  {
    name: 'conversation:update',
    description: 'Update conversations',
    resourceType: ResourceType.CONVERSATION,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'conversation:delete',
    description: 'Delete conversations',
    resourceType: ResourceType.CONVERSATION,
    action: PermissionAction.DELETE,
  },

  // Message permissions
  {
    name: 'message:create',
    description: 'Send messages',
    resourceType: ResourceType.MESSAGE,
    action: PermissionAction.CREATE,
  },
  {
    name: 'message:read',
    description: 'Read messages',
    resourceType: ResourceType.MESSAGE,
    action: PermissionAction.READ,
  },
  {
    name: 'message:delete',
    description: 'Delete messages',
    resourceType: ResourceType.MESSAGE,
    action: PermissionAction.DELETE,
  },

  // Team permissions
  {
    name: 'team:create',
    description: 'Create teams',
    resourceType: ResourceType.TEAM,
    action: PermissionAction.CREATE,
  },
  { name: 'team:read', description: 'Read teams', resourceType: ResourceType.TEAM, action: PermissionAction.READ },
  {
    name: 'team:update',
    description: 'Update teams',
    resourceType: ResourceType.TEAM,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'team:delete',
    description: 'Delete teams',
    resourceType: ResourceType.TEAM,
    action: PermissionAction.DELETE,
  },

  // Agent permissions
  {
    name: 'agent:create',
    description: 'Create agents',
    resourceType: ResourceType.AGENT,
    action: PermissionAction.CREATE,
  },
  { name: 'agent:read', description: 'Read agents', resourceType: ResourceType.AGENT, action: PermissionAction.READ },
  {
    name: 'agent:update',
    description: 'Update agents',
    resourceType: ResourceType.AGENT,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'agent:delete',
    description: 'Delete agents',
    resourceType: ResourceType.AGENT,
    action: PermissionAction.DELETE,
  },
  {
    name: 'agent:execute',
    description: 'Execute agent actions',
    resourceType: ResourceType.AGENT,
    action: PermissionAction.EXECUTE,
  },

  // Channel permissions
  {
    name: 'channel:create',
    description: 'Create channels',
    resourceType: ResourceType.CHANNEL,
    action: PermissionAction.CREATE,
  },
  {
    name: 'channel:read',
    description: 'Read channels',
    resourceType: ResourceType.CHANNEL,
    action: PermissionAction.READ,
  },
  {
    name: 'channel:update',
    description: 'Update channels',
    resourceType: ResourceType.CHANNEL,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'channel:delete',
    description: 'Delete channels',
    resourceType: ResourceType.CHANNEL,
    action: PermissionAction.DELETE,
  },

  // Extension permissions
  {
    name: 'extension:install',
    description: 'Install extensions',
    resourceType: ResourceType.EXTENSION,
    action: PermissionAction.CREATE,
  },
  {
    name: 'extension:read',
    description: 'Read extensions',
    resourceType: ResourceType.EXTENSION,
    action: PermissionAction.READ,
  },
  {
    name: 'extension:update',
    description: 'Update extensions',
    resourceType: ResourceType.EXTENSION,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'extension:delete',
    description: 'Uninstall extensions',
    resourceType: ResourceType.EXTENSION,
    action: PermissionAction.DELETE,
  },

  // Cron job permissions
  {
    name: 'cron:create',
    description: 'Create cron jobs',
    resourceType: ResourceType.CRON_JOB,
    action: PermissionAction.CREATE,
  },
  {
    name: 'cron:read',
    description: 'Read cron jobs',
    resourceType: ResourceType.CRON_JOB,
    action: PermissionAction.READ,
  },
  {
    name: 'cron:update',
    description: 'Update cron jobs',
    resourceType: ResourceType.CRON_JOB,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'cron:delete',
    description: 'Delete cron jobs',
    resourceType: ResourceType.CRON_JOB,
    action: PermissionAction.DELETE,
  },
  {
    name: 'cron:execute',
    description: 'Execute cron jobs',
    resourceType: ResourceType.CRON_JOB,
    action: PermissionAction.EXECUTE,
  },

  // User permissions
  {
    name: 'user:create',
    description: 'Create users',
    resourceType: ResourceType.USER,
    action: PermissionAction.CREATE,
  },
  { name: 'user:read', description: 'Read users', resourceType: ResourceType.USER, action: PermissionAction.READ },
  {
    name: 'user:update',
    description: 'Update users',
    resourceType: ResourceType.USER,
    action: PermissionAction.UPDATE,
  },
  {
    name: 'user:delete',
    description: 'Delete users',
    resourceType: ResourceType.USER,
    action: PermissionAction.DELETE,
  },

  // Settings permissions
  {
    name: 'settings:read',
    description: 'Read settings',
    resourceType: ResourceType.SETTINGS,
    action: PermissionAction.READ,
  },
  {
    name: 'settings:update',
    description: 'Update settings',
    resourceType: ResourceType.SETTINGS,
    action: PermissionAction.UPDATE,
  },

  // System permissions
  {
    name: 'system:admin',
    description: 'Full system admin access',
    resourceType: ResourceType.SYSTEM,
    action: PermissionAction.ADMIN,
  },
  {
    name: 'system:audit:read',
    description: 'Read audit logs',
    resourceType: ResourceType.SYSTEM,
    action: PermissionAction.READ,
  },
  {
    name: 'system:audit:delete',
    description: 'Delete audit logs',
    resourceType: ResourceType.SYSTEM,
    action: PermissionAction.DELETE,
  },
];

/**
 * Default role definitions with their permissions
 */
export const DEFAULT_ROLES: Record<SystemRole, { name: string; description: string; permissions: string[] }> = {
  [SystemRole.ADMIN]: {
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: ['system:admin'],
  },
  [SystemRole.USER]: {
    name: 'User',
    description: 'Standard user with typical access',
    permissions: [
      'conversation:create',
      'conversation:read',
      'conversation:update',
      'conversation:delete',
      'message:create',
      'message:read',
      'message:delete',
      'team:read',
      'agent:read',
      'agent:execute',
      'channel:read',
      'extension:read',
      'cron:read',
      'cron:execute',
      'settings:read',
    ],
  },
  [SystemRole.GUEST]: {
    name: 'Guest',
    description: 'Limited read-only access',
    permissions: ['conversation:read', 'message:read', 'agent:read', 'settings:read'],
  },
  [SystemRole.SERVICE]: {
    name: 'Service',
    description: 'Service account for automated operations',
    permissions: [
      'conversation:create',
      'conversation:read',
      'message:create',
      'message:read',
      'agent:read',
      'agent:execute',
      'cron:read',
      'cron:execute',
    ],
  },
};
