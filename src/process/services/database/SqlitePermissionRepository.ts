/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type { ISqliteDriver } from './drivers/ISqliteDriver';
import type { IPermissionRepository } from './IPermissionRepository';
import type { IPermission, IPermissionRow, PermissionAction, ResourceType } from '@/common/types/rbacTypes';

/**
 * SQLite-backed implementation of IPermissionRepository
 */
export class SqlitePermissionRepository implements IPermissionRepository {
  private async getDriver(): Promise<ISqliteDriver> {
    const db = await getDatabase();
    return db.getDriver();
  }

  private rowToPermission(row: IPermissionRow): IPermission {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      resourceType: row.resource_type as ResourceType,
      action: row.action as PermissionAction,
      createdAt: row.created_at,
    };
  }

  async create(permission: IPermission): Promise<void> {
    const db = await this.getDriver();
    const stmt = db.prepare(`
      INSERT INTO permissions (id, name, description, resource_type, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      permission.id,
      permission.name,
      permission.description,
      permission.resourceType,
      permission.action,
      permission.createdAt
    );
  }

  async getById(id: string): Promise<IPermission | undefined> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id) as IPermissionRow | undefined;
    return row ? this.rowToPermission(row) : undefined;
  }

  async getByName(name: string): Promise<IPermission | undefined> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT * FROM permissions WHERE name = ?').get(name) as IPermissionRow | undefined;
    return row ? this.rowToPermission(row) : undefined;
  }

  async getAll(): Promise<IPermission[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT * FROM permissions ORDER BY name').all() as IPermissionRow[];
    return rows.map((row) => this.rowToPermission(row));
  }

  async getByResourceType(resourceType: ResourceType): Promise<IPermission[]> {
    const db = await this.getDriver();
    const rows = db
      .prepare('SELECT * FROM permissions WHERE resource_type = ? ORDER BY name')
      .all(resourceType) as IPermissionRow[];
    return rows.map((row) => this.rowToPermission(row));
  }

  async getByAction(action: PermissionAction): Promise<IPermission[]> {
    const db = await this.getDriver();
    const rows = db.prepare('SELECT * FROM permissions WHERE action = ? ORDER BY name').all(action) as IPermissionRow[];
    return rows.map((row) => this.rowToPermission(row));
  }

  async update(id: string, updates: Partial<Omit<IPermission, 'id' | 'createdAt'>>): Promise<void> {
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
    if (updates.resourceType !== undefined) {
      sets.push('resource_type = ?');
      params.push(updates.resourceType);
    }
    if (updates.action !== undefined) {
      sets.push('action = ?');
      params.push(updates.action);
    }

    if (sets.length === 0) return;

    params.push(id);
    const stmt = db.prepare(`UPDATE permissions SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(...params);
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDriver();
    db.prepare('DELETE FROM permissions WHERE id = ?').run(id);
  }

  async findByResourceAndAction(
    resourceType: ResourceType,
    action: PermissionAction
  ): Promise<IPermission | undefined> {
    const db = await this.getDriver();
    const row = db
      .prepare('SELECT * FROM permissions WHERE resource_type = ? AND action = ?')
      .get(resourceType, action) as IPermissionRow | undefined;
    return row ? this.rowToPermission(row) : undefined;
  }

  async bulkCreate(permissions: IPermission[]): Promise<void> {
    const db = await this.getDriver();
    const insert = db.prepare(`
      INSERT INTO permissions (id, name, description, resource_type, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      for (const permission of permissions) {
        insert.run(
          permission.id,
          permission.name,
          permission.description,
          permission.resourceType,
          permission.action,
          permission.createdAt
        );
      }
    });

    tx();
  }

  async exists(id: string): Promise<boolean> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT 1 as one FROM permissions WHERE id = ?').get(id) as { one: number } | undefined;
    return row !== undefined;
  }

  async count(): Promise<number> {
    const db = await this.getDriver();
    const row = db.prepare('SELECT COUNT(*) as total FROM permissions').get() as { total: number };
    return row.total;
  }
}
