/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('DealSelector Visual Regression', () => {
  test('default', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-dealselector-default');
    await expect(page).toHaveScreenshot('deal-selector-default.png');
  });

  test('loading', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-dealselector-loading');
    await expect(page).toHaveScreenshot('deal-selector-loading.png');
  });

  test('empty', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-dealselector-empty');
    await expect(page).toHaveScreenshot('deal-selector-empty.png');
  });

  test('without create button', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-dealselector-without-create-button');
    await expect(page).toHaveScreenshot('deal-selector-without-create-button.png');
  });
});
