/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RbacService } from '@process/services/database/rbacService';
import {
  SystemRole,
  PermissionAction,
  ResourceType,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
} from '@/common/types/rbacTypes';
import type { IRoleRepository, IPermissionRepository } from '@process/services/database';
import type { IRole, IPermission } from '@/common/types/rbacTypes';

// Mock repositories
const createMockRoleRepository = (): IRoleRepository => ({
  create: vi.fn(),
  getById: vi.fn(),
  getByName: vi.fn(),
  getAll: vi.fn(),
  getSystemRoles: vi.fn(),
  getCustomRoles: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getWithPermissions: vi.fn(),
  getPermissions: vi.fn(),
  addPermission: vi.fn(),
  removePermission: vi.fn(),
  setPermissions: vi.fn(),
  getRolesForUser: vi.fn(),
  assignToUser: vi.fn(),
  removeFromUser: vi.fn(),
  getUserAssignments: vi.fn(),
  getUsersWithRole: vi.fn(),
  userHasRole: vi.fn(),
  getOrCreateSystemRole: vi.fn(),
  exists: vi.fn(),
  count: vi.fn(),
});

const createMockPermissionRepository = (): IPermissionRepository => ({
  create: vi.fn(),
  getById: vi.fn(),
  getByName: vi.fn(),
  getAll: vi.fn(),
  getByResourceType: vi.fn(),
  getByAction: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByResourceAndAction: vi.fn(),
  bulkCreate: vi.fn(),
  exists: vi.fn(),
  count: vi.fn(),
});

describe('RbacService - Permission Coverage', () => {
  let rbacService: RbacService;
  let mockRoleRepository: ReturnType<typeof createMockRoleRepository>;
  let mockPermissionRepository: ReturnType<typeof createMockPermissionRepository>;

  beforeEach(() => {
    mockRoleRepository = createMockRoleRepository();
    mockPermissionRepository = createMockPermissionRepository();
    rbacService = new RbacService(mockRoleRepository, mockPermissionRepository);
  });

  describe('Permission Checking', () => {
    it('should grant permission when user has explicit permission', async () => {
      const userId = 'user_1';
      const role: IRole = {
        id: 'role_1',
        name: 'User',
        description: 'Standard user',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const permission: IPermission = {
        id: 'perm_1',
        name: 'conversation:read',
        description: 'Read conversations',
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
        createdAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([role]);
      mockRoleRepository.getPermissions.mockResolvedValue([permission]);

      const result = await rbacService.checkPermission({
        userId,
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
      });

      expect(result.granted).toBe(true);
      expect(result.roleIds).toContain(role.id);
      expect(result.permissionIds).toContain(permission.id);
    });

    it('should deny permission when user lacks it', async () => {
      const userId = 'user_1';
      const role: IRole = {
        id: 'role_1',
        name: 'User',
        description: 'Standard user',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const permission: IPermission = {
        id: 'perm_1',
        name: 'conversation:read',
        description: 'Read conversations',
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
        createdAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([role]);
      mockRoleRepository.getPermissions.mockResolvedValue([permission]);

      const result = await rbacService.checkPermission({
        userId,
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.DELETE,
      });

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('Missing permission');
    });

    it('should deny permission when user has no roles', async () => {
      const userId = 'user_1';

      mockRoleRepository.getRolesForUser.mockResolvedValue([]);

      const result = await rbacService.checkPermission({
        userId,
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
      });

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('User has no roles assigned');
    });

    it('should grant all permissions for admin role', async () => {
      const userId = 'user_1';
      const adminRole: IRole = {
        id: 'role_admin',
        name: DEFAULT_ROLES[SystemRole.ADMIN].name,
        description: 'Administrator',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([adminRole]);

      const result = await rbacService.checkPermission({
        userId,
        resourceType: ResourceType.SYSTEM,
        action: PermissionAction.ADMIN,
      });

      expect(result.granted).toBe(true);
      expect(result.roleIds).toContain(adminRole.id);
    });

    it('should grant permission when user has admin permission on system resource', async () => {
      const userId = 'user_1';
      const role: IRole = {
        id: 'role_1',
        name: 'User',
        description: 'Standard user',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const adminPermission: IPermission = {
        id: 'perm_admin',
        name: 'system:admin',
        description: 'System admin',
        resourceType: ResourceType.SYSTEM,
        action: PermissionAction.ADMIN,
        createdAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([role]);
      mockRoleRepository.getPermissions.mockResolvedValue([adminPermission]);

      const result = await rbacService.checkPermission({
        userId,
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.DELETE,
      });

      expect(result.granted).toBe(true);
    });
  });

  describe('Permission Aggregations', () => {
    it('should aggregate permissions from multiple roles', async () => {
      const userId = 'user_1';
      const role1: IRole = {
        id: 'role_1',
        name: 'Role1',
        description: 'First role',
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const role2: IRole = {
        id: 'role_2',
        name: 'Role2',
        description: 'Second role',
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const permission1: IPermission = {
        id: 'perm_1',
        name: 'conversation:read',
        description: 'Read conversations',
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
        createdAt: Date.now(),
      };
      const permission2: IPermission = {
        id: 'perm_2',
        name: 'message:create',
        description: 'Create messages',
        resourceType: ResourceType.MESSAGE,
        action: PermissionAction.CREATE,
        createdAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([role1, role2]);
      mockRoleRepository.getPermissions.mockResolvedValueOnce([permission1]).mockResolvedValueOnce([permission2]);

      const userPermissions = await rbacService.getUserPermissions(userId);

      expect(userPermissions.roles).toHaveLength(2);
      expect(userPermissions.permissions).toHaveLength(2);
      expect(userPermissions.permissions.map((p: IPermission) => p.id)).toContain(permission1.id);
      expect(userPermissions.permissions.map((p: IPermission) => p.id)).toContain(permission2.id);
    });

    it('should deduplicate permissions from multiple roles', async () => {
      const userId = 'user_1';
      const role1: IRole = {
        id: 'role_1',
        name: 'Role1',
        description: 'First role',
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const role2: IRole = {
        id: 'role_2',
        name: 'Role2',
        description: 'Second role',
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const permission: IPermission = {
        id: 'perm_1',
        name: 'conversation:read',
        description: 'Read conversations',
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
        createdAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([role1, role2]);
      mockRoleRepository.getPermissions.mockResolvedValueOnce([permission]).mockResolvedValueOnce([permission]);

      const userPermissions = await rbacService.getUserPermissions(userId);

      expect(userPermissions.permissions).toHaveLength(1);
    });
  });

  describe('Resource Type Coverage', () => {
    it('should cover all resource types defined in DEFAULT_PERMISSIONS', () => {
      const resourceTypes = new Set(DEFAULT_PERMISSIONS.map((p: (typeof DEFAULT_PERMISSIONS)[0]) => p.resourceType));
      const expectedTypes = Object.values(ResourceType);

      for (const resourceType of expectedTypes) {
        expect(resourceTypes.has(resourceType)).toBe(true);
      }
    });

    it('should cover all permission actions for each resource', () => {
      const actionCoverage: Record<ResourceType, Set<PermissionAction>> = {} as Record<
        ResourceType,
        Set<PermissionAction>
      >;

      for (const permission of DEFAULT_PERMISSIONS) {
        if (!actionCoverage[permission.resourceType]) {
          actionCoverage[permission.resourceType] = new Set();
        }
        actionCoverage[permission.resourceType].add(permission.action);
      }

      // Verify critical resources have expected actions
      expect(actionCoverage[ResourceType.CONVERSATION]).toContain(PermissionAction.READ);
      expect(actionCoverage[ResourceType.CONVERSATION]).toContain(PermissionAction.CREATE);
      expect(actionCoverage[ResourceType.MESSAGE]).toContain(PermissionAction.CREATE);
      expect(actionCoverage[ResourceType.SYSTEM]).toContain(PermissionAction.ADMIN);
    });
  });

  describe('Convenience Methods', () => {
    it('should return true for hasPermission when granted', async () => {
      const userId = 'user_1';
      const role: IRole = {
        id: 'role_1',
        name: 'User',
        description: 'Standard user',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const permission: IPermission = {
        id: 'perm_1',
        name: 'conversation:read',
        description: 'Read conversations',
        resourceType: ResourceType.CONVERSATION,
        action: PermissionAction.READ,
        createdAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([role]);
      mockRoleRepository.getPermissions.mockResolvedValue([permission]);

      const result = await rbacService.hasPermission(userId, ResourceType.CONVERSATION, PermissionAction.READ);

      expect(result).toBe(true);
    });

    it('should identify admin users', async () => {
      const userId = 'user_1';
      const adminRole: IRole = {
        id: 'role_admin',
        name: DEFAULT_ROLES[SystemRole.ADMIN].name,
        description: 'Administrator',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([adminRole]);

      const result = await rbacService.isAdmin(userId);

      expect(result).toBe(true);
    });

    it('should not identify non-admin users as admin', async () => {
      const userId = 'user_1';
      const userRole: IRole = {
        id: 'role_user',
        name: DEFAULT_ROLES[SystemRole.USER].name,
        description: 'Standard user',
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRoleRepository.getRolesForUser.mockResolvedValue([userRole]);

      const result = await rbacService.isAdmin(userId);

      expect(result).toBe(false);
    });
  });
});
