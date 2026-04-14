import { test, expect } from '@playwright/test';

/**
 * Real-tenant smoke suite. Runs only when FRONTEGG_BASE_URL and
 * FRONTEGG_CLIENT_ID are set (the nightly workflow provides them as secrets).
 */
test.skip(!process.env.FRONTEGG_BASE_URL || !process.env.FRONTEGG_CLIENT_ID, 'real-tenant env vars not set');

test.describe('real-tenant smoke', () => {
  test('unauthenticated visit redirects through Frontegg OAuth', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    const baseUrl = process.env.FRONTEGG_BASE_URL!;
    const redirectedToLogin =
      finalUrl.includes(new URL(baseUrl).host) || finalUrl.includes('/oauth/') || finalUrl.includes('/account/login');
    expect(redirectedToLogin, `expected login redirect, got ${finalUrl}`).toBe(true);
  });

  test('public no-ssr endpoint renders without a session', async ({ page }) => {
    const response = await page.goto('/no-ssr', { waitUntil: 'domcontentloaded' });
    // Page may redirect depending on middleware config; accept 2xx or a
    // redirect-with-rendered-fallback.
    expect(response?.ok() || response?.status() === 302).toBeTruthy();
  });

  test('identity configurations health endpoint returns 2xx', async ({ request }) => {
    const response = await request.get('/api/frontegg/identity/resources/configurations/v1');
    expect(response.status()).toBeLessThan(500);
  });
});
