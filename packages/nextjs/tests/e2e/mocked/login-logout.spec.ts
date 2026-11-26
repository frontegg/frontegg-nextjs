import { test, expect } from '@playwright/test';
import { setupFronteggMocks, MOCK_USER } from './fixtures/intercepts';
import { forgeSessionCookie } from './fixtures/session-forge';

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

  test('unauthenticated visit redirects to hosted login', async ({ page, request }) => {
    // Verify the raw middleware response is a 307 redirect
    const rawResponse = await request.get('/', { maxRedirects: 0 });
    expect(rawResponse.status()).toBe(307);

    // Also verify the browser follows through to the login page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    const landedOnLogin =
      finalUrl.includes('/account/login') || finalUrl.includes('/oauth/') || finalUrl.includes('login');
    expect(landedOnLogin, `expected a login redirect, got ${finalUrl}`).toBe(true);
  });

  test('pre-set session cookie bypasses middleware redirect', async ({ page, context }) => {
    const cookie = await forgeSessionCookie({ email: MOCK_USER.email });
    await context.addCookies([cookie]);

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    // With a forged session cookie the middleware should NOT redirect (200, not 307).
    expect(response, 'expected a response object').not.toBeNull();
    expect(response!.status()).toBe(200);

    // The page URL should remain on `/`, not redirected to login.
    expect(page.url()).toContain('localhost');
    expect(page.url()).not.toContain('/account/login');
  });

  test('session page shows server-side session data with forged cookie', async ({ page, context }) => {
    const cookie = await forgeSessionCookie({ email: MOCK_USER.email });
    await context.addCookies([cookie]);

    await page.goto('/session', { waitUntil: 'domcontentloaded' });

    // The /session page renders server-side session data. With a valid forged
    // cookie, the server should decode the JWT and render user claims.
    await expect(page.getByText('user session server side')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_USER.email)).toBeVisible({ timeout: 10_000 });
  });

  test('logout embedded link navigates to logout route', async ({ page, context }) => {
    const cookie = await forgeSessionCookie({ email: MOCK_USER.email });
    await context.addCookies([cookie]);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The home page has a "logout embedded" link pointing to /account/logout.
    const logoutLink = page.getByRole('link', { name: /logout/i }).first();
    await expect(logoutLink).toBeVisible({ timeout: 10_000 });
    await logoutLink.click();

    await page.waitForLoadState('domcontentloaded');
    // After clicking logout, the URL should navigate to /account/logout or
    // redirect to a login page.
    const finalUrl = page.url();
    const navigatedAway =
      finalUrl.includes('/account/logout') || finalUrl.includes('/account/login') || finalUrl.includes('/oauth/');
    expect(navigatedAway, `expected navigation to logout/login, got ${finalUrl}`).toBe(true);
  });
});
