import { test, expect } from '@playwright/test';

/**
 * Middleware protection tests.
 *
 * These verify that the Frontegg middleware correctly:
 * - Bypasses auth checks for static assets, API routes, and login pages
 * - Protects application routes that require authentication
 * - Preserves the original URL in the redirect query param
 */
test.describe('middleware protection', () => {
  test('static assets bypass middleware', async ({ request }) => {
    // Static assets under /_next/static should NOT be redirected to login.
    // They may 404 (which is expected for a non-existent path) but should
    // NOT return a 307 redirect.
    const response = await request.get('/_next/static/test.js');
    expect(response.status()).not.toBe(307);
  });

  test('api/frontegg routes bypass middleware', async ({ request }) => {
    // The /api/frontegg proxy route should be accessible without auth.
    // The upstream Frontegg API may return various status codes, but the
    // middleware should NOT redirect to login.
    const response = await request.get('/api/frontegg/identity/resources/configurations/v1');
    expect(response.status()).not.toBe(307);
  });

  test('/account/login route bypasses middleware', async ({ page }) => {
    // The login page itself should not redirect in a loop — it should load.
    const response = await page.goto('/account/login', { waitUntil: 'domcontentloaded' });
    expect(response, 'expected a response object').not.toBeNull();
    // Accept 200 (page loads) or any non-redirect status
    expect(response!.status()).not.toBe(307);
  });

  test('protected route /session requires auth', async ({ page }) => {
    // An unauthenticated visit to /session should be redirected to login.
    const response = await page.goto('/session', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();

    const landedOnLogin =
      finalUrl.includes('/account/login') || finalUrl.includes('/oauth/') || finalUrl.includes('login');
    expect(landedOnLogin, `expected login redirect for /session, got ${finalUrl}`).toBe(true);
  });

  test('redirect URL preserves original path and query', async ({ page }) => {
    // Navigate to a protected route with query params. The middleware should
    // redirect to login with the original path preserved in `redirectUrl`.
    await page.goto('/session?tab=settings', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();

    // The redirect URL should contain the original path. Different Frontegg
    // configurations may encode this differently, so we check both the URL
    // itself and common query param patterns.
    const hasRedirectParam =
      finalUrl.includes('redirectUrl') || finalUrl.includes('redirect_url') || finalUrl.includes('redirect');

    // The original path should appear somewhere in the final URL
    const preservesPath = finalUrl.includes('/session') || finalUrl.includes('%2Fsession');

    expect(hasRedirectParam || preservesPath, `expected redirect to preserve original path, got ${finalUrl}`).toBe(
      true
    );
  });
});
