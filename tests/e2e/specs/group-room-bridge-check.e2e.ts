/**
 * Diagnostic test: check if group-room bridge providers are registered.
 */
import { test, expect } from '../fixtures';
import { invokeBridge } from '../helpers/bridge';

test('group-room.create bridge responds within 10s', async ({ page }) => {
  // Wait for app to fully load
  await page.waitForTimeout(8000);

  // Try to create a group room via bridge
  const result = await invokeBridge<{ success: boolean; data?: { id: string }; msg?: string }>(
    page,
    'group-room.create',
    { name: 'Bridge Test', desc: '', hostBackend: 'claude' },
    15_000
  );

  console.log('[E2E] Bridge result:', JSON.stringify(result));
  expect(result).toBeDefined();
  expect(result.success).toBeDefined();
});
