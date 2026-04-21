/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('RiskScoreCard Visual Regression', () => {
  test('default', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-riskscorecard-default');
    await expect(page).toHaveScreenshot('risk-score-card-default.png');
  });

  test('loading', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-riskscorecard-loading');
    await expect(page).toHaveScreenshot('risk-score-card-loading.png');
  });

  test('empty', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-riskscorecard-empty');
    await expect(page).toHaveScreenshot('risk-score-card-empty.png');
  });

  test('with deal name', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-riskscorecard-with-deal-name');
    await expect(page).toHaveScreenshot('risk-score-card-with-deal-name.png');
  });

  test('comparison', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-riskscorecard-comparison');
    await expect(page).toHaveScreenshot('risk-score-card-comparison.png');
  });
});
