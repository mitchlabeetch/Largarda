/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('EmptyState Visual Regression', () => {
  test('default', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-emptystate-default');
    await expect(page).toHaveScreenshot('empty-state-default.png');
  });

  test('with actions', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-emptystate-with-actions');
    await expect(page).toHaveScreenshot('empty-state-with-actions.png');
  });

  test('minimal', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-emptystate-minimal');
    await expect(page).toHaveScreenshot('empty-state-minimal.png');
  });

  test('custom namespace', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-emptystate-custom-namespace');
    await expect(page).toHaveScreenshot('empty-state-custom-namespace.png');
  });
});
