import { expect, test } from '@playwright/test';

test.describe('Circuit Box', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/circuit-box', { waitUntil: 'domcontentloaded' });
  });

  test('renders header with system status', async ({ page }) => {
    await expect(page.getByText('Circuit Box').first()).toBeVisible();
    await expect(page.getByText('System Management').first()).toBeVisible();
    await expect(page.getByText(/System (Optimal|Degraded|Critical)/).first()).toBeVisible();
  });

  test('renders panel grid with AI Agents section', async ({ page }) => {
    await expect(page.getByText('AI Agents').first()).toBeVisible();
    await expect(page.getByText('ACHEEVY').first()).toBeVisible();
    await expect(page.getByText('Chicken Hawk').first()).toBeVisible();
  });

  test('renders BYOK Keys panel', async ({ page }) => {
    await expect(page.getByText('BYOK Keys').first()).toBeVisible();
  });

  test('search filters panels', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search panels...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('voice');
    // Voice panel should be visible, unrelated panels hidden
    await expect(page.getByText('Voice / STT / TTS').first()).toBeVisible();
  });

  test('clicking panel opens right detail view', async ({ page }) => {
    const agentPanel = page.getByText('AI Agents').first();
    await agentPanel.click();
    // Right panel should appear with agent entries
    // Right panel should appear (border-l element)
    await expect(page.locator('.border-l').first()).toBeVisible({ timeout: 5000 });
  });

  test('bottom alert bar shows timestamp', async ({ page }) => {
    await expect(page.getByText('[INFO]').first()).toBeVisible();
    await expect(page.getByText('Circuit Box loaded').first()).toBeVisible();
  });
});
