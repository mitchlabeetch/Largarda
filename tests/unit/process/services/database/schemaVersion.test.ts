import { describe, expect, it } from 'vitest';
import { ALL_MIGRATIONS } from '@process/services/database/migrations';
import { CURRENT_DB_VERSION } from '@process/services/database/schema';

describe('database schema version contract', () => {
  it('keeps CURRENT_DB_VERSION aligned with the latest migration', () => {
    const latestMigration = ALL_MIGRATIONS[ALL_MIGRATIONS.length - 1];

    expect(latestMigration).toBeDefined();
    expect(CURRENT_DB_VERSION).toBe(latestMigration.version);
  });
});
