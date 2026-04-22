/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IPermission, PermissionAction, ResourceType } from '@/common/types/rbacTypes';

/**
 * Repository interface for permission operations
 */
export interface IPermissionRepository {
  /**
   * Create a new permission
   * @param permission The permission to create
   * @returns Promise<void>
   */
  create(permission: IPermission): Promise<void>;

  /**
   * Get a permission by ID
   * @param id The permission ID
   * @returns Promise<IPermission | undefined>
   */
  getById(id: string): Promise<IPermission | undefined>;

  /**
   * Get a permission by name
   * @param name The permission name
   * @returns Promise<IPermission | undefined>
   */
  getByName(name: string): Promise<IPermission | undefined>;

  /**
   * Get all permissions
   * @returns Promise<IPermission[]>
   */
  getAll(): Promise<IPermission[]>;

  /**
   * Get permissions by resource type
   * @param resourceType The resource type
   * @returns Promise<IPermission[]>
   */
  getByResourceType(resourceType: ResourceType): Promise<IPermission[]>;

  /**
   * Get permissions by action
   * @param action The permission action
   * @returns Promise<IPermission[]>
   */
  getByAction(action: PermissionAction): Promise<IPermission[]>;

  /**
   * Update a permission
   * @param id The permission ID
   * @param updates The updates to apply
   * @returns Promise<void>
   */
  update(id: string, updates: Partial<Omit<IPermission, 'id' | 'createdAt'>>): Promise<void>;

  /**
   * Delete a permission
   * @param id The permission ID
   * @returns Promise<void>
   */
  delete(id: string): Promise<void>;

  /**
   * Find permission by resource type and action
   * @param resourceType The resource type
   * @param action The action
   * @returns Promise<IPermission | undefined>
   */
  findByResourceAndAction(resourceType: ResourceType, action: PermissionAction): Promise<IPermission | undefined>;

  /**
   * Bulk create permissions
   * @param permissions Array of permissions to create
   * @returns Promise<void>
   */
  bulkCreate(permissions: IPermission[]): Promise<void>;

  /**
   * Check if a permission exists
   * @param id The permission ID
   * @returns Promise<boolean>
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count total permissions
   * @returns Promise<number>
   */
  count(): Promise<number>;
}
