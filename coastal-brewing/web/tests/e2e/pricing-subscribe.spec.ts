import { test, expect } from "@playwright/test";

/**
 * /pricing → Stripe Checkout end-to-end smoke test.
 *
 * Verifies the full Custee flow without actually charging:
 *   1. Load /pricing
 *   2. Scroll the SubscriptionCard into view (ScrollReveal needs IntersectionObserver tick)
 *   3. Click the SKU CTA button
 *   4. Inline form expands with email + cadence picker
 *   5. Fill smoke-test email
 *   6. Click Continue
 *   7. Browser navigates to a checkout.stripe.com URL (cs_live_*)
 *
 * Does NOT pay — we only verify the redirect landed at Stripe. No card
 * data entered, no charge fired.
 */

const SMOKE_TEST_EMAIL = "playwright-smoke@achievemor.io";

test("Tea Monthly subscribe flow redirects to Stripe Checkout", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveTitle(/Subscriptions/i);

  const teaCard = page.locator('[data-pricing-tier="subscription-coastal-tea-monthly"]');
  await teaCard.scrollIntoViewIfNeeded();
  await expect(teaCard).toBeVisible();

  const startBtn = teaCard.getByRole("button", { name: /start tea monthly/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // Inline form should expand
  const emailInput = teaCard.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
  await expect(teaCard.locator('input[type="radio"][value="monthly"]')).toBeVisible();
  await expect(teaCard.locator('input[type="radio"][value="9mo"]')).toBeVisible();

  await emailInput.fill(SMOKE_TEST_EMAIL);

  // Tea Monthly $26.99 + $6.54 init = $33.53
  await expect(teaCard).toContainText("$33.53");

  // Click Continue — wait for the Stripe redirect.
  const continueButton = teaCard.getByRole("button", { name: /continue/i });

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 }),
    continueButton.click(),
  ]);

  const url = page.url();
  expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  expect(url).toMatch(/cs_live_|cs_test_/);
});

test("9mo cadence updates total display before submit", async ({ page }) => {
  await page.goto("/pricing");
  const teaCard = page.locator('[data-pricing-tier="subscription-coastal-tea-monthly"]');
  await teaCard.scrollIntoViewIfNeeded();

  await teaCard.getByRole("button", { name: /start tea monthly/i }).click();
  await teaCard.locator('input[type="email"]').fill(SMOKE_TEST_EMAIL);

  // Monthly default: $26.99 + $6.54 = $33.53
  await expect(teaCard).toContainText("$33.53");

  // 9mo: 9 × $26.99 × 0.75 = $182.18, + $6.54 = $188.72
  await teaCard.locator('input[type="radio"][value="9mo"]').click();
  await expect(teaCard).toContainText("$188.72");
});

test("5-tier comparison table renders all rows + marks", async ({ page }) => {
  await page.goto("/pricing");
  const table = page.locator('[data-pricing-table="tier-comparison"]');
  await table.scrollIntoViewIfNeeded();
  await expect(table).toBeVisible();

  for (const tier of [
    "pooler-pass-standard",
    "pooler-pass-plus",
    "coastal-custee-card",
    "wood-stork-standard",
    "wood-stork-reserve",
  ]) {
    await expect(table.locator(`[data-tier-row="${tier}"]`)).toBeVisible();
  }
  for (const mark of [
    "plr-cream",
    "plr-gold",
    "custee-card",
    "wood-stork-standard",
    "wood-stork-reserve",
  ]) {
    await expect(table.locator(`[data-tier-mark="${mark}"]`)).toBeVisible();
  }

  await table.screenshot({ path: "test-results/tier-comparison-table.png" });
});

test("Custee Card /membership flow — cadence picker + product matrix + Stripe redirect", async ({ page }) => {
  await page.goto("/membership");
  const form = page.locator('[data-membership-checkout="custee-card"]');
  await form.scrollIntoViewIfNeeded();
  await expect(form).toBeVisible();

  // Cadence picker loaded all 4 cadences (rendered as buttons with totals).
  await expect(form.getByText("$29.99")).toBeVisible();
  await expect(form.getByText("$202.43")).toBeVisible();

  // Product matrix renders all 5 options
  const matrix = form.locator('[data-matrix-picker="products"]');
  await expect(matrix.locator('[data-matrix-option="tea"]')).toBeVisible();
  await expect(matrix.locator('[data-matrix-option="coffee"]')).toBeVisible();
  await expect(matrix.locator('[data-matrix-option="functional-coffee"]')).toBeVisible();
  await expect(matrix.locator('[data-matrix-option="combo"]')).toBeVisible();
  await expect(matrix.locator('[data-matrix-option="sampler"]')).toBeVisible();

  // Coffee is selected by default per component default
  await expect(matrix.locator('[data-matrix-option="coffee"]')).toHaveAttribute(
    "data-matrix-selected",
    "true",
  );

  // Add tea + leave 9mo as default; fill email; submit
  await matrix.locator('[data-matrix-option="tea"]').click();
  await form.locator('input[type="email"]').fill("playwright-custee@achievemor.io");

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 }),
    form.getByRole("button", { name: /get custee card/i }).click(),
  ]);

  const url = page.url();
  expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  expect(url).toMatch(/cs_live_|cs_test_/);
});

test("Coffee Monthly card has its own independent CTA + form", async ({ page }) => {
  await page.goto("/pricing");
  const coffeeCard = page.locator('[data-pricing-tier="subscription-coastal-coffee-monthly"]');
  await coffeeCard.scrollIntoViewIfNeeded();

  await coffeeCard.getByRole("button", { name: /start coffee monthly/i }).click();

  // Coffee Monthly $34.99 + $6.54 = $41.53
  await expect(coffeeCard).toContainText("$41.53");

  // Tea card should still be in collapsed state
  const teaCard = page.locator('[data-pricing-tier="subscription-coastal-tea-monthly"]');
  await expect(teaCard.locator('input[type="email"]')).toHaveCount(0);
});
