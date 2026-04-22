/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IRoleRepository } from './IRoleRepository';
import type { IPermissionRepository } from './IPermissionRepository';
import type {
  IRole,
  IPermission,
  IUserWithRoles,
  IPermissionCheck,
  IPermissionCheckResult,
} from '@/common/types/rbacTypes';
import {
  SystemRole,
  PermissionAction,
  ResourceType,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
} from '@/common/types/rbacTypes';

/**
 * Service for Role-Based Access Control operations
 * Provides permission checking, role management, and initialization
 */
export class RbacService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository
  ) {}

  // ===== Initialization =====

  /**
   * Initialize default permissions and roles
   * Should be called once during application setup
   */
  async initializeDefaults(): Promise<void> {
    // Create default permissions
    const permissions = await this.permissionRepository.getAll();
    const existingNames = new Set(permissions.map((p) => p.name));

    for (const defaultPermission of DEFAULT_PERMISSIONS) {
      if (!existingNames.has(defaultPermission.name)) {
        await this.permissionRepository.create({
          ...defaultPermission,
          id: `perm_${defaultPermission.name.replace(/:/g, '_')}`,
          createdAt: Date.now(),
        });
      }
    }

    // Create default roles and assign permissions
    for (const [systemRoleKey, roleConfig] of Object.entries(DEFAULT_ROLES)) {
      const systemRole = systemRoleKey as SystemRole;
      let role = await this.roleRepository.getByName(roleConfig.name);

      if (!role) {
        const id = `role_system_${systemRole}`;
        const now = Date.now();
        await this.roleRepository.create({
          id,
          name: roleConfig.name,
          description: roleConfig.description,
          isSystem: true,
          createdAt: now,
          updatedAt: now,
        });
        role = await this.roleRepository.getById(id);
      }

      if (role) {
        // Get permission IDs for this role
        const rolePermissions: string[] = [];
        for (const permName of roleConfig.permissions) {
          const permission = await this.permissionRepository.getByName(permName);
          if (permission) {
            rolePermissions.push(permission.id);
          }
        }

        await this.roleRepository.setPermissions(role.id, rolePermissions);
      }
    }
  }

  // ===== Permission Checking =====

  /**
   * Check if a user has a specific permission
   * @param check Permission check parameters
   * @returns Promise<IPermissionCheckResult>
   */
  async checkPermission(check: IPermissionCheck): Promise<IPermissionCheckResult> {
    const roles = await this.roleRepository.getRolesForUser(check.userId);

    if (roles.length === 0) {
      return { granted: false, reason: 'User has no roles assigned' };
    }

    // Check if user has admin role (grants all permissions)
    const isAdmin = roles.some((r) => r.name === DEFAULT_ROLES[SystemRole.ADMIN].name);
    if (isAdmin) {
      return { granted: true, roleIds: roles.map((r) => r.id) };
    }

    // Get all permissions for user's roles
    const roleIds = roles.map((r) => r.id);
    const userPermissions: IPermission[] = [];
    for (const role of roles) {
      const perms = await this.roleRepository.getPermissions(role.id);
      userPermissions.push(...perms);
    }

    // Check for exact permission match
    const hasPermission = userPermissions.some(
      (p) => p.resourceType === check.resourceType && p.action === check.action
    );

    if (hasPermission) {
      return {
        granted: true,
        roleIds,
        permissionIds: userPermissions
          .filter((p) => p.resourceType === check.resourceType && p.action === check.action)
          .map((p) => p.id),
      };
    }

    // Check for admin permission on system resource
    const hasAdmin = userPermissions.some(
      (p) => p.resourceType === ResourceType.SYSTEM && p.action === PermissionAction.ADMIN
    );

    if (hasAdmin) {
      return { granted: true, roleIds };
    }

    return {
      granted: false,
      reason: `Missing permission: ${check.action} on ${check.resourceType}`,
      roleIds,
    };
  }

  /**
   * Check if user has a specific permission (convenience method)
   * @param userId The user ID
   * @param resourceType The resource type
   * @param action The action
   * @returns Promise<boolean>
   */
  async hasPermission(userId: string, resourceType: ResourceType, action: PermissionAction): Promise<boolean> {
    const result = await this.checkPermission({ userId, resourceType, action });
    return result.granted;
  }

  /**
   * Check if user is an administrator
   * @param userId The user ID
   * @returns Promise<boolean>
   */
  async isAdmin(userId: string): Promise<boolean> {
    const roles = await this.roleRepository.getRolesForUser(userId);
    return roles.some((r) => r.name === DEFAULT_ROLES[SystemRole.ADMIN].name);
  }

  /**
   * Get all permissions for a user
   * @param userId The user ID
   * @returns Promise<IUserWithRoles>
   */
  async getUserPermissions(userId: string): Promise<IUserWithRoles> {
    const roles = await this.roleRepository.getRolesForUser(userId);
    const permissions: IPermission[] = [];
    const seenIds = new Set<string>();

    for (const role of roles) {
      const rolePerms = await this.roleRepository.getPermissions(role.id);
      for (const perm of rolePerms) {
        if (!seenIds.has(perm.id)) {
          seenIds.add(perm.id);
          permissions.push(perm);
        }
      }
    }

    return { userId, roles, permissions };
  }

  // ===== Role Management =====

  /**
   * Create a custom role
   * @param name Role name
   * @param description Role description
   * @param permissionIds Initial permission IDs
   * @returns Promise<IRole>
   */
  async createRole(name: string, description: string, permissionIds: string[] = []): Promise<IRole> {
    const existing = await this.roleRepository.getByName(name);
    if (existing) {
      throw new Error(`Role with name '${name}' already exists`);
    }

    const id = `role_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const role: IRole = {
      id,
      name,
      description,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.roleRepository.create(role);

    if (permissionIds.length > 0) {
      await this.roleRepository.setPermissions(id, permissionIds);
    }

    return role;
  }

  /**
   * Delete a custom role
   * @param roleId The role ID
   * @returns Promise<boolean>
   */
  async deleteRole(roleId: string): Promise<boolean> {
    return this.roleRepository.delete(roleId);
  }

  /**
   * Assign a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   * @param assignedBy Optional ID of the user assigning the role
   * @returns Promise<void>
   */
  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    await this.roleRepository.assignToUser(userId, roleId, assignedBy);
  }

  /**
   * Remove a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   * @returns Promise<void>
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.roleRepository.removeFromUser(userId, roleId);
  }

  /**
   * Get all roles for a user
   * @param userId The user ID
   * @returns Promise<IRole[]>
   */
  async getUserRoles(userId: string): Promise<IRole[]> {
    return this.roleRepository.getRolesForUser(userId);
  }

  /**
   * Add a permission to a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns Promise<void>
   */
  async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await this.roleRepository.addPermission(roleId, permissionId);
  }

  /**
   * Remove a permission from a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns Promise<void>
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.roleRepository.removePermission(roleId, permissionId);
  }

  // ===== Permission Management =====

  /**
   * Get all permissions
   * @returns Promise<IPermission[]>
   */
  async getAllPermissions(): Promise<IPermission[]> {
    return this.permissionRepository.getAll();
  }

  /**
   * Get permissions by resource type
   * @param resourceType The resource type
   * @returns Promise<IPermission[]>
   */
  async getPermissionsByResource(resourceType: ResourceType): Promise<IPermission[]> {
    return this.permissionRepository.getByResourceType(resourceType);
  }

  // ===== Bulk Operations =====

  /**
   * Assign default roles to a new user
   * @param userId The user ID
   * @returns Promise<void>
   */
  async assignDefaultRoles(userId: string): Promise<void> {
    const userRole = await this.roleRepository.getByName(DEFAULT_ROLES[SystemRole.USER].name);
    if (userRole) {
      await this.roleRepository.assignToUser(userId, userRole.id, 'system');
    }
  }

  /**
   * Assign admin role to a user
   * @param userId The user ID
   * @param assignedBy The user assigning the role
   * @returns Promise<void>
   */
  async assignAdminRole(userId: string, assignedBy?: string): Promise<void> {
    const adminRole = await this.roleRepository.getByName(DEFAULT_ROLES[SystemRole.ADMIN].name);
    if (adminRole) {
      await this.roleRepository.assignToUser(userId, adminRole.id, assignedBy);
    }
  }
}
