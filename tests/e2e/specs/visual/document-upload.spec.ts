/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('DocumentUpload Visual Regression', () => {
  test('default', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-documentupload-default');
    await expect(page).toHaveScreenshot('document-upload-default.png');
  });

  test('single file', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/ma-documentupload-single-file');
    await expect(page).toHaveScreenshot('document-upload-single-file.png');
  });
});
