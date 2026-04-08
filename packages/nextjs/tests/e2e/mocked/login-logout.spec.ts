import { test, expect } from '@playwright/test';
import { setupFronteggMocks, MOCK_USER } from './fixtures/intercepts';

/**
 * Mocked login/logout smoke scenarios for the Next.js App Router example.
 *
 * All network calls to the Frontegg identity service are intercepted by
 * `setupFronteggMocks`, so these tests run without a real tenant.
 */
test.describe('mocked login/logout', () => {
  test.beforeEach(async ({ page }) => {
    await setupFronteggMocks(page);
  });

  test('unauthenticated visit redirects to hosted login', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();

    // The Frontegg middleware should redirect unauth requests into the hosted
    // login flow, which lives under the `/account/login` or `/oauth/` path.
    // We accept either to stay resilient against minor middleware changes.
    const landedOnLogin =
      finalUrl.includes('/account/login') ||
      finalUrl.includes('/oauth/') ||
      finalUrl.includes('login');

    expect(response, 'expected a response object').not.toBeNull();
    expect(landedOnLogin, `expected a login redirect, got ${finalUrl}`).toBe(true);
  });

  test('pre-set session cookie renders home with user email', async ({ page, context }) => {
    // The real session cookie is encrypted with FRONTEGG_ENCRYPTION_PASSWORD
    // and signed; we cannot forge it from the test side without importing src.
    // If we ever expose a test-only fixture route, swap this skip out.
    test.skip(
      !process.env.FRONTEGG_E2E_MOCK_SESSION_COOKIE,
      'requires FRONTEGG_E2E_MOCK_SESSION_COOKIE — session cookie is encrypted; ' +
        'see tests/e2e/mocked/fixtures/intercepts.ts for mock user payload',
    );

    await context.addCookies([
      {
        name: process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session',
        value: process.env.FRONTEGG_E2E_MOCK_SESSION_COOKIE!,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(MOCK_USER.email)).toBeVisible({ timeout: 10_000 });
  });

  test('logout click clears session and redirects', async ({ page, context }) => {
    test.skip(
      !process.env.FRONTEGG_E2E_MOCK_SESSION_COOKIE,
      'requires a pre-authenticated session; see companion test above',
    );

    await context.addCookies([
      {
        name: process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session',
        value: process.env.FRONTEGG_E2E_MOCK_SESSION_COOKIE!,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/');
    await page.getByRole('link', { name: /logout/i }).first().click();

    await page.waitForLoadState('domcontentloaded');
    const cookies = await context.cookies();
    const sessionCookieName = process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session';
    const sessionCookie = cookies.find((c) => c.name === sessionCookieName);
    expect(sessionCookie, 'session cookie should be cleared after logout').toBeFalsy();
  });
});
