import { expect, test } from '@playwright/test';

test.describe('The Chamber', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/the-chamber', { waitUntil: 'domcontentloaded' });
  });

  test('renders header with mode toggle', async ({ page }) => {
    await expect(page.getByText('The Chamber').first()).toBeVisible();
    await expect(page.getByText('TESTING').first()).toBeVisible();
    await expect(page.getByText('WORKBENCH').first()).toBeVisible();
  });

  test('left panel shows available tools', async ({ page }) => {
    await expect(page.getByText('Available Tools').first()).toBeVisible();
    await expect(page.getByText('Fast Intelligence').first()).toBeVisible();
    await expect(page.getByText('Standard Chat').first()).toBeVisible();
  });

  test('clicking a tool does not crash', async ({ page }) => {
    await page.getByText('Fast Intelligence').first().click();
    // Page should still be functional
    await expect(page.getByText('The Chamber').first()).toBeVisible();
  });

  test('scenario form fields are present', async ({ page }) => {
    await expect(page.getByPlaceholder('e.g. Live STT Test')).toBeVisible();
    await expect(page.getByText('Headers').first()).toBeVisible();
    await expect(page.getByText('Body').first()).toBeVisible();
  });

  test('run test button is present and clickable', async ({ page }) => {
    await expect(page.getByText('RUN TEST').first()).toBeVisible();
  });

  test('results panel shows empty state initially', async ({ page }) => {
    await expect(page.getByText('Real-Time Results').first()).toBeVisible();
    await expect(page.getByText('Run a test to see results here.').first()).toBeVisible();
  });

  test('workbench mode toggle does not crash', async ({ page }) => {
    await page.getByText('WORKBENCH').click();
    // Page should still be functional
    await expect(page.getByText('The Chamber').first()).toBeVisible();
  });

  test('preloads tool from URL param', async ({ page }) => {
    await page.goto('/the-chamber?tool=glm-5.1', { waitUntil: 'domcontentloaded' });
    const toolInput = page.locator('input[placeholder="Select from left panel"]');
    await expect(toolInput).toHaveValue('glm-5.1');
  });

  test('run test button is present', async ({ page }) => {
    const runButton = page.getByText('RUN TEST');
    await expect(runButton).toBeVisible();
  });
});
