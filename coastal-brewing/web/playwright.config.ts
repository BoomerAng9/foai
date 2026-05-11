import { defineConfig, devices } from "@playwright/test";

/**
 * Coastal Brewing Co. — Playwright e2e config.
 *
 * Targets the LIVE site at brewing.foai.cloud (no local server start).
 * Test runs against the production deploy — useful for post-merge
 * smoke-testing the /pricing subscribe flow end-to-end.
 *
 * Run: `npx playwright test --reporter=list`
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://brewing.foai.cloud",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
