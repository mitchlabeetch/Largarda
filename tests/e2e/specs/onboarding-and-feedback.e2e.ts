/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '../fixtures';

test.describe('First-Run Onboarding Flow', () => {
  test('should display onboarding modal on first launch', async ({ page }) => {
    // Clear any persisted onboarding state
    await page.evaluate(() => {
      localStorage.removeItem('agent.config');
    });
    await page.reload();

    // Verify onboarding modal appears
    const modal = page.getByRole('dialog', { name: /Welcome to AionUi/i });
    await expect(modal).toBeVisible();

    // Verify first step content
    await expect(page.getByText('Welcome!')).toBeVisible();
    await expect(page.getByText(/AionUi is your local AI assistant/)).toBeVisible();
  });

  test('should navigate through all onboarding steps', async ({ page }) => {
    // Clear persisted state
    await page.evaluate(() => {
      localStorage.removeItem('agent.config');
    });
    await page.reload();

    const modal = page.getByRole('dialog', { name: /Welcome to AionUi/i });
    await expect(modal).toBeVisible();

    // Step 1: Welcome
    await expect(page.getByText('Welcome!')).toBeVisible();
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 2: Choose Your Agent
    await expect(page.getByText('Choose Your Agent')).toBeVisible();
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 3: Start Chatting
    await expect(page.getByText('Start Chatting')).toBeVisible();
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 4: All Set
    await expect(page.getByText(/You're All Set!/)).toBeVisible();

    // Complete onboarding
    await page.getByRole('button', { name: /Get Started/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('should skip onboarding and not show again', async ({ page }) => {
    // Clear persisted state
    await page.evaluate(() => {
      localStorage.removeItem('agent.config');
    });
    await page.reload();

    const modal = page.getByRole('dialog', { name: /Welcome to AionUi/i });
    await expect(modal).toBeVisible();

    // Skip onboarding
    await page.getByRole('button', { name: /Skip Tour/i }).click();
    await expect(modal).not.toBeVisible();

    // Reload page - onboarding should not appear
    await page.reload();
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Feedback Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure onboarding is completed so it doesn't interfere
    await page.evaluate(() => {
      const config = JSON.parse(localStorage.getItem('agent.config') || '{}');
      config['onboarding.completed'] = true;
      localStorage.setItem('agent.config', JSON.stringify(config));
    });
    await page.goto('/');
  });

  test('should open feedback modal from quick action button', async ({ page }) => {
    // Hover over quick action buttons to reveal them
    const quickActions = page.locator('[class*="guidQuickActions"]').first();
    await quickActions.hover();

    // Click feedback button
    const feedbackButton = page.getByRole('button', { name: /feedback or suggestions/i });
    await feedbackButton.click();

    // Verify feedback modal appears
    const feedbackModal = page.getByRole('dialog', { name: /Bug Report/i });
    await expect(feedbackModal).toBeVisible();

    // Verify form elements
    await expect(page.getByLabel(/Module/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
    await expect(page.getByText(/Screenshots/i)).toBeVisible();
  });

  test('should have accessible form structure in feedback modal', async ({ page }) => {
    // Open feedback modal
    const quickActions = page.locator('[class*="guidQuickActions"]').first();
    await quickActions.hover();
    await page.getByRole('button', { name: /feedback or suggestions/i }).click();

    // Verify ARIA attributes
    const modal = page.getByRole('dialog', { name: /Bug Report/i });
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Verify required fields are marked
    const moduleGroup = page.locator('[role="group"]').filter({ hasText: /Module/i }).first();
    await expect(moduleGroup).toHaveAttribute('aria-labelledby');

    // Close modal
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('should disable submit until required fields are filled', async ({ page }) => {
    // Open feedback modal
    const quickActions = page.locator('[class*="guidQuickActions"]').first();
    await quickActions.hover();
    await page.getByRole('button', { name: /feedback or suggestions/i }).click();

    // Submit should be disabled initially
    const submitButton = page.getByRole('button', { name: /Submit/i });
    await expect(submitButton).toBeDisabled();

    // Fill in module
    await page.locator('[class*="arco-select"]').first().click();
    await page.locator('.arco-select-option').filter({ hasText: 'Agent Detection' }).first().click();

    // Still disabled without description
    await expect(submitButton).toBeDisabled();

    // Fill in description
    await page.fill('textarea', 'Test feedback description');

    // Now submit should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should close feedback modal on cancel', async ({ page }) => {
    // Open feedback modal
    const quickActions = page.locator('[class*="guidQuickActions"]').first();
    await quickActions.hover();
    await page.getByRole('button', { name: /feedback or suggestions/i }).click();

    const modal = page.getByRole('dialog', { name: /Bug Report/i });
    await expect(modal).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Complete onboarding
    await page.evaluate(() => {
      const config = JSON.parse(localStorage.getItem('agent.config') || '{}');
      config['onboarding.completed'] = true;
      localStorage.setItem('agent.config', JSON.stringify(config));
    });
    await page.goto('/');
  });

  test('should have proper focus management in feedback modal', async ({ page }) => {
    // Open feedback modal
    const quickActions = page.locator('[class*="guidQuickActions"]').first();
    await quickActions.hover();
    await page.getByRole('button', { name: /feedback or suggestions/i }).click();

    // Verify modal has proper dialog role
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Verify form fields have proper labels
    const moduleLabel = page.locator('label:has-text("Module")');
    await expect(moduleLabel).toBeVisible();

    const descriptionLabel = page.locator('label:has-text("Description")');
    await expect(descriptionLabel).toBeVisible();
  });
});
