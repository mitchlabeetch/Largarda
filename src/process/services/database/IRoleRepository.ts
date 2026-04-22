/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IRole, IPermission, IRoleWithPermissions, IUserRole, SystemRole } from '@/common/types/rbacTypes';

/**
 * Repository interface for role operations
 */
export interface IRoleRepository {
  /**
   * Create a new role
   * @param role The role to create
   * @returns Promise<void>
   */
  create(role: IRole): Promise<void>;

  /**
   * Get a role by ID
   * @param id The role ID
   * @returns Promise<IRole | undefined>
   */
  getById(id: string): Promise<IRole | undefined>;

  /**
   * Get a role by name
   * @param name The role name
   * @returns Promise<IRole | undefined>
   */
  getByName(name: string): Promise<IRole | undefined>;

  /**
   * Get all roles
   * @returns Promise<IRole[]>
   */
  getAll(): Promise<IRole[]>;

  /**
   * Get system roles
   * @returns Promise<IRole[]>
   */
  getSystemRoles(): Promise<IRole[]>;

  /**
   * Get custom (non-system) roles
   * @returns Promise<IRole[]>
   */
  getCustomRoles(): Promise<IRole[]>;

  /**
   * Update a role
   * @param id The role ID
   * @param updates The updates to apply
   * @returns Promise<void>
   */
  update(id: string, updates: Partial<Omit<IRole, 'id' | 'createdAt' | 'isSystem'>>): Promise<void>;

  /**
   * Delete a role (only custom roles can be deleted)
   * @param id The role ID
   * @returns Promise<boolean> True if deleted, false if system role
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get role with its permissions
   * @param id The role ID
   * @returns Promise<IRoleWithPermissions | undefined>
   */
  getWithPermissions(id: string): Promise<IRoleWithPermissions | undefined>;

  /**
   * Get permissions for a role
   * @param roleId The role ID
   * @returns Promise<IPermission[]>
   */
  getPermissions(roleId: string): Promise<IPermission[]>;

  /**
   * Add a permission to a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns Promise<void>
   */
  addPermission(roleId: string, permissionId: string): Promise<void>;

  /**
   * Remove a permission from a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns Promise<void>
   */
  removePermission(roleId: string, permissionId: string): Promise<void>;

  /**
   * Set all permissions for a role (replaces existing)
   * @param roleId The role ID
   * @param permissionIds Array of permission IDs
   * @returns Promise<void>
   */
  setPermissions(roleId: string, permissionIds: string[]): Promise<void>;

  /**
   * Get roles for a user
   * @param userId The user ID
   * @returns Promise<IRole[]>
   */
  getRolesForUser(userId: string): Promise<IRole[]>;

  /**
   * Assign a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   * @param assignedBy Optional ID of user who assigned the role
   * @returns Promise<void>
   */
  assignToUser(userId: string, roleId: string, assignedBy?: string): Promise<void>;

  /**
   * Remove a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   * @returns Promise<void>
   */
  removeFromUser(userId: string, roleId: string): Promise<void>;

  /**
   * Get user role assignments
   * @param userId The user ID
   * @returns Promise<IUserRole[]>
   */
  getUserAssignments(userId: string): Promise<IUserRole[]>;

  /**
   * Get users with a specific role
   * @param roleId The role ID
   * @returns Promise<string[]> Array of user IDs
   */
  getUsersWithRole(roleId: string): Promise<string[]>;

  /**
   * Check if user has a specific role
   * @param userId The user ID
   * @param roleId The role ID
   * @returns Promise<boolean>
   */
  userHasRole(userId: string, roleId: string): Promise<boolean>;

  /**
   * Get or create a system role
   * @param systemRole The system role type
   * @returns Promise<IRole>
   */
  getOrCreateSystemRole(systemRole: SystemRole): Promise<IRole>;

  /**
   * Check if a role exists
   * @param id The role ID
   * @returns Promise<boolean>
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count total roles
   * @returns Promise<number>
   */
  count(): Promise<number>;
}
