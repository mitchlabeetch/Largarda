/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('Skeleton Visual Regression', () => {
  test('line variant', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-skeleton-line');
    await expect(page).toHaveScreenshot('skeleton-line.png');
  });

  test('line multiple', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-skeleton-line-multiple');
    await expect(page).toHaveScreenshot('skeleton-line-multiple.png');
  });

  test('circle variant', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-skeleton-circle');
    await expect(page).toHaveScreenshot('skeleton-circle.png');
  });

  test('card variant', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-skeleton-card');
    await expect(page).toHaveScreenshot('skeleton-card.png');
  });

  test('custom size', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/base-skeleton-custom-size');
    await expect(page).toHaveScreenshot('skeleton-custom-size.png');
  });
});
