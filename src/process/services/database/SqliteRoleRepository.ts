/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { ISqliteDriver } from './drivers/ISqliteDriver';
import type { IRoleRepository } from './IRoleRepository';
import type {
  IRole,
  IRoleRow,
  IPermission,
  IPermissionRow,
  IRoleWithPermissions,
  IUserRole,
  IUserRoleRow,
  SystemRole,
} from '@/common/types/rbacTypes';

/**
 * SQLite-backed implementation of IRoleRepository
 */
export class SqliteRoleRepository implements IRoleRepository {
  private async getDriver(): Promise<ISqliteDriver> {
    const db = await getDatabase();
    return db.getDriver();
  }

  private rowToRole(row: IRoleRow): IRole {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isSystem: row.is_system === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private rowToPermission(row: IPermissionRow): IPermission {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      resourceType: row.resource_type as IPermission['resourceType'],
      action: row.action as IPermission['action'],
      createdAt: row.created_at,
    };
  }

  private rowToUserRole(row: IUserRoleRow): IUserRole {
    return {
      userId: row.user_id,
      roleId: row.role_id,
      assignedAt: row.assigned_at,
      assignedBy: row.assigned_by,
    };
  }

  async create(role: IRole): Promise<void> {
    const db = await this.getDriver();
    const stmt = db.prepare(`
      INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(role.id, role.name, role.description, role.isSystem ? 1 : 0, role.createdAt, role.updatedAt);
  }

  async getById(id: string): Promise<IRole | undefined> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as IRoleRow | undefined;
    return row ? this.rowToRole(row) : undefined;
  }

  async getByName(name: string): Promise<IRole | undefined> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT * FROM roles WHERE name = ?').get(name) as IRoleRow | undefined;
    return row ? this.rowToRole(row) : undefined;
  }

  async getAll(): Promise<IRole[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT * FROM roles ORDER BY name').all() as IRoleRow[];
    return rows.map((row) => this.rowToRole(row));
  }

  async getSystemRoles(): Promise<IRole[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT * FROM roles WHERE is_system = 1 ORDER BY name').all() as IRoleRow[];
    return rows.map((row) => this.rowToRole(row));
  }

  async getCustomRoles(): Promise<IRole[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT * FROM roles WHERE is_system = 0 ORDER BY name').all() as IRoleRow[];
    return rows.map((row) => this.rowToRole(row));
  }

  async update(id: string, updates: Partial<Omit<IRole, 'id' | 'createdAt' | 'isSystem'>>): Promise<void> {
    const db = await this.getDriver();
    const sets: string[] = [];
    const params: (string | number)[] = [];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description);
    }

    if (sets.length === 0) return;

    params.push(Date.now(), id);
    const stmt = db.prepare(`UPDATE roles SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`);
    stmt.run(...params);
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.getDriver();
    // Check if system role
    const role = await this.getById(id);
    if (!role || role.isSystem) {
      return false;
    }

    db.prepare('DELETE FROM roles WHERE id = ?').run(id);
    return true;
  }

  async getWithPermissions(id: string): Promise<IRoleWithPermissions | undefined> {
    const role = await this.getById(id);
    if (!role) return undefined;

    const permissions = await this.getPermissions(id);
    return { ...role, permissions };
  }

  async getPermissions(roleId: string): Promise<IPermission[]> {
    const db = await this.getDriver();
    const rows = db
      .prepare(
        `SELECT p.* FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ? ORDER BY p.name`
      )
      .all(roleId) as IPermissionRow[];
    return rows.map((row) => this.rowToPermission(row));
  }

  async addPermission(roleId: string, permissionId: string): Promise<void> {
    const db = await this.getDriver();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(roleId, permissionId, Date.now());
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const db = await this.getDriver();
    db.prepare('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?').run(roleId, permissionId);
  }

  async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const db = await this.getDriver();
    const deleteStmt = db.prepare('DELETE FROM role_permissions WHERE role_id = ?');
    const insertStmt = db.prepare(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      VALUES (?, ?, ?)
    `);

    const tx = db.transaction(() => {
      deleteStmt.run(roleId);
      for (const permissionId of permissionIds) {
        insertStmt.run(roleId, permissionId, Date.now());
      }
    });

    tx();
  }

  async getRolesForUser(userId: string): Promise<IRole[]> {
    const db = await this.getDriver();
    const rows = db
      .prepare(
        `SELECT r.* FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ? ORDER BY r.name`
      )
      .all(userId) as IRoleRow[];
    return rows.map((row) => this.rowToRole(row));
  }

  async assignToUser(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    const db = await this.getDriver();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at, assigned_by)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(userId, roleId, Date.now(), assignedBy ?? null);
  }

  async removeFromUser(userId: string, roleId: string): Promise<void> {
    const db = await this.getDriver();
    db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').run(userId, roleId);
  }

  async getUserAssignments(userId: string): Promise<IUserRole[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT * FROM user_roles WHERE user_id = ?').all(userId) as IUserRoleRow[];
    return rows.map((row) => this.rowToUserRole(row));
  }

  async getUsersWithRole(roleId: string): Promise<string[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT user_id FROM user_roles WHERE role_id = ?').all(roleId) as Array<{
      user_id: string;
    }>;
    return rows.map((row) => row.user_id);
  }

  async userHasRole(userId: string, roleId: string): Promise<boolean> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT 1 as one FROM user_roles WHERE user_id = ? AND role_id = ?').get(userId, roleId) as
      | { one: number }
      | undefined;
    return row !== undefined;
  }

  async getOrCreateSystemRole(systemRole: SystemRole): Promise<IRole> {
    const db = await this.getDriver();
    const name = systemRole.toString();

    // Try to find existing
    const existing = await this.getByName(name);
    if (existing) return existing;

    // Create new system role
    const id = `system_role_${systemRole}`;
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, `System ${name} role`, 1, now, now);

    return {
      id,
      name,
      description: `System ${name} role`,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async exists(id: string): Promise<boolean> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT 1 as one FROM roles WHERE id = ?').get(id) as { one: number } | undefined;
    return row !== undefined;
  }

  async count(): Promise<number> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT COUNT(*) as total FROM roles').get() as { total: number };
    return row.total;
  }
}
