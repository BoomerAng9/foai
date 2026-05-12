import { test, expect } from "@playwright/test";

/**
 * /pricing + /membership Stripe Checkout e2e smoke suite.
 *
 * Verifies the live Custee flow without actually charging:
 *   1. /pricing 5-tier comparison table renders all rows + brand marks
 *   2. /membership Custee Card form (cadence + matrix) → Stripe Checkout
 *
 * Pooler Pass + Wood Stork live on their own pages (/pooler-pass +
 * /wood-stork) and follow the same matrix pattern — covered by curl
 * smoke tests during PR #410, not by these browser tests.
 */

const SMOKE_TEST_EMAIL = "playwright-smoke@achievemor.io";

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

  // Cadence picker loaded all 4 cadences (rendered as buttons with monthly billing).
  // Owner canon 2026-05-11: 3/6/9 plans are INSTALLMENTS, headline shows
  // monthly Stripe charge, not upfront cadence total.
  await expect(form.getByText("$29.99/mo")).toBeVisible();
  await expect(form.getByText("$22.49/mo")).toBeVisible(); // 9mo: 29.99 × 0.75

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

