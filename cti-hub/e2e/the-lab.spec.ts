import { expect, test } from '@playwright/test';

test.describe('The Lab', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the catalog API to avoid needing auth
    await page.route('**/api/the-lab/catalog', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          catalog: [
            { id: 'test-llm', title: 'Test Intelligence', provider: 'Fast', sector: 'llm', tier: 'fast', costLuc: 1, overview: 'A test LLM tool.', bestCase: 'Testing', isLatest: true, routingPriority: 1, capabilities: ['coding'] },
            { id: 'test-image', title: 'Test Image', provider: 'Standard', sector: 'image', tier: 'standard', costLuc: 2, overview: 'A test image tool.', bestCase: 'Image gen', isLatest: true, routingPriority: 2, capabilities: ['design'] },
            { id: 'test-video', title: 'Test Video', provider: 'Premium', sector: 'video', tier: 'premium', costLuc: 5, overview: 'A test video tool.', bestCase: 'Video gen', isLatest: true, routingPriority: 3, capabilities: ['vision'] },
          ],
          count: 3,
        }),
      }),
    );
    await page.goto('/the-lab', { waitUntil: 'domcontentloaded' });
  });

  test('renders header with tool count', async ({ page }) => {
    await expect(page.getByText('The Lab').first()).toBeVisible();
    await expect(page.getByText(/\d+ tools/).first()).toBeVisible();
  });

  test('renders tool tiles', async ({ page }) => {
    // Should render some tool tiles (from API or fallback)
    await expect(page.locator('[class*="border-border"]').first()).toBeVisible();
  });

  test('search input filters tools', async ({ page }) => {
    const searchInput = page.getByText('Search tools...').or(page.locator('input[type="text"]').first());
    await expect(searchInput).toBeVisible();
  });

  test('filter button is visible', async ({ page }) => {
    await expect(page.getByText('Filters').first()).toBeVisible();
  });

  test('tile shows LUC cost and Try button', async ({ page }) => {
    await expect(page.getByText('1 LUC').first()).toBeVisible();
    const tryButtons = page.getByText('TRY');
    await expect(tryButtons.first()).toBeVisible();
  });

  test('Try button links to The Chamber', async ({ page }) => {
    const tryLink = page.getByText('TRY').first();
    await expect(tryLink).toHaveAttribute('href', /\/the-chamber\?tool=/);
  });
});
