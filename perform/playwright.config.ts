import { defineConfig, devices } from '@playwright/test';

/**
 * Per|Form E2E harness (SHIP-CHECKLIST Gate 2 · Item 7 + full-flow coverage).
 *
 * Target: live production by default. Override via BASE_URL env for local
 * dev (`BASE_URL=http://localhost:3000 npm run test:e2e`). The live-prod
 * target lets us run Gate 2 E2E without spinning up a local server, since
 * α+β are already deployed.
 *
 * Full signup→verify→login flow requires a test Firebase project with
 * admin credentials so we can flip `emailVerified` programmatically. That
 * is tracked as a follow-up; this harness covers everything verifiable
 * against the public production surface.
 */

const BASE_URL = process.env.BASE_URL || 'https://perform.foai.cloud';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
