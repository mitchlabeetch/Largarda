/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('ErrorState Visual Regression', () => {
  test('string error', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-errorstate-string-error');
    await expect(page).toHaveScreenshot('error-state-string-error.png');
  });

  test('error object', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-errorstate-error-object');
    await expect(page).toHaveScreenshot('error-state-error-object.png');
  });

  test('with observability', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-errorstate-with-observability');
    await expect(page).toHaveScreenshot('error-state-with-observability.png');
  });

  test('without retry', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-errorstate-without-retry');
    await expect(page).toHaveScreenshot('error-state-without-retry.png');
  });

  test('complex error', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-errorstate-complex-error');
    await expect(page).toHaveScreenshot('error-state-complex-error.png');
  });
});
