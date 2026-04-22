import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Per|Form Gate 2 E2E — Can Someone Sign Up? (SHIP-CHECKLIST)
 *
 * What this suite covers (runs against live BASE_URL):
 *   Item 7  Incognito homepage load under 3s + markup present
 *   Item 8  /signup page renders form + ToS consent + legal links
 *   Item 9  /login page renders form + Forgot + Create-account links
 *   Item 10 /forgot page renders email input + submit button
 *   Item 11 Session cookie hygiene on logout clear
 *   Item 13 /api/draft/tokens/checkout rejects anon with 401 (middleware gate)
 *
 * What this suite does NOT cover (needs a test-Firebase project with admin
 * service-account creds so we can flip emailVerified programmatically):
 *   - Actual signup completion (hits real Firebase, creates real user)
 *   - Verification-link click simulation
 *   - 403 email_unverified response from checkout (requires authed cookie)
 *   - Password reset email delivery + link click
 *
 * These deferrable items are covered by code audit and static rendering
 * checks in this suite; the full end-to-end flow is gated on provisioning
 * a test Firebase project (tracked as Gate 2 follow-up).
 */

const HOMEPAGE_MAX_LOAD_MS = 3000;

test.describe('Gate 2 · Item 7 — Incognito homepage', () => {
  test('loads under 3s and renders Per|Form brand', async ({ page }) => {
    const start = Date.now();
    const response = await page.goto('/');
    const loadMs = Date.now() - start;

    expect(response?.status()).toBe(200);
    expect(loadMs, `homepage load was ${loadMs}ms, ceiling is ${HOMEPAGE_MAX_LOAD_MS}ms`).toBeLessThan(HOMEPAGE_MAX_LOAD_MS);

    // Brand header visible
    await expect(page.getByText(/PER.?FORM/i).first()).toBeVisible();

    // Season-aware hero should include at least one of the current-window
    // moments (NFL Draft, NBA Playoffs, MLB Season on 2026-04-22).
    const hero = page.locator('body');
    const text = (await hero.textContent()) ?? '';
    const hasSeasonMoment = /NFL Draft|NBA Playoffs|MLB Season/i.test(text);
    expect(hasSeasonMoment, 'homepage should surface at least one season moment').toBe(true);
  });
});

test.describe('Gate 2 · Item 8 — Signup page', () => {
  test('/signup renders email, password, name, consent checkbox, legal links', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();

    // Form fields
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Your name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/At least 8 characters/i)).toBeVisible();

    // ToS / Privacy consent (MIM §45)
    await expect(page.getByText(/Terms of Service/i)).toBeVisible();
    await expect(page.getByText(/Privacy Policy/i)).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();

    // Google OAuth alternative
    await expect(page.getByText(/CONTINUE WITH GOOGLE/i)).toBeVisible();

    // Link back to /login
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
  });

  test('blocks submission when consent unchecked', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder(/Your name/i).fill('Test User');
    await page.getByPlaceholder(/you@example.com/i).fill(`test-${Date.now()}@example.com`);
    await page.getByPlaceholder(/At least 8 characters/i).fill('correctpassword123');

    await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

    // Error banner should surface ToS requirement
    await expect(page.getByText(/accept the Terms of Service and Privacy Policy/i)).toBeVisible();
  });

  test('blocks submission when password under 8 chars', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder(/Your name/i).fill('Test User');
    await page.getByPlaceholder(/you@example.com/i).fill(`test-${Date.now()}@example.com`);
    await page.getByPlaceholder(/At least 8 characters/i).fill('short');
    await page.locator('input[type="checkbox"]').check();

    await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
  });
});

test.describe('Gate 2 · Item 9 — Login page', () => {
  test('/login renders form with Forgot and Create-account links', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in to Per.?Form/i })).toBeVisible();

    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your password/i)).toBeVisible();

    await expect(page.getByRole('link', { name: /Forgot password/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create account/i })).toBeVisible();

    await expect(page.getByText(/CONTINUE WITH GOOGLE/i)).toBeVisible();
  });
});

test.describe('Gate 2 · Item 10 — Forgot password page', () => {
  test('/forgot renders email input and submit button', async ({ page }) => {
    await page.goto('/forgot');
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();

    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /SEND RESET LINK/i })).toBeVisible();

    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
  });

  test('anti-enumeration: submitting any email shows same success screen', async ({ page }) => {
    await page.goto('/forgot');
    // Use an email that almost certainly has no Firebase account.
    const fakeEmail = `does-not-exist-${Date.now()}@example-nonexistent.tld`;
    await page.getByPlaceholder(/you@example.com/i).fill(fakeEmail);
    await page.getByRole('button', { name: /SEND RESET LINK/i }).click();

    // Success screen should appear regardless of whether the email is registered
    await expect(page.getByText(/If an account exists/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(fakeEmail)).toBeVisible();
  });
});

test.describe('Gate 2 · Item 11 — Session cookie hygiene', () => {
  test('POST /api/auth/logout clears cookie with secure attributes', async ({ request }) => {
    const res = await request.post('/api/auth/logout');
    expect(res.status()).toBe(200);

    const setCookie = res.headers()['set-cookie'] || '';
    expect(setCookie).toContain('firebase-auth-token=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=strict');
  });

  test('GET /api/auth/verify without cookie returns 401', async ({ request }) => {
    const res = await request.get('/api/auth/verify');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });
});

test.describe('Gate 2 · Item 13 — Checkout gate', () => {
  test('POST /api/draft/tokens/checkout without auth returns 401', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.post('/api/draft/tokens/checkout', {
      data: { package_id: 'single' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Authentication required|Auth required|Unauthorized/i);
  });

  test('POST /api/auth/session with empty body returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/session', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Gate 2 · health probe', () => {
  test('GET /api/health returns 200 with all components ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.components.database.ok).toBe(true);
    expect(body.components.runtime.ok).toBe(true);
    expect(body.components.upstream_espn.ok).toBe(true);
    expect(body.components.upstream_gemini.ok).toBe(true);
  });
});
