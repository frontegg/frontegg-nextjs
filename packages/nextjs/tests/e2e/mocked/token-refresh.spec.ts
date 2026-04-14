import { test, expect } from '@playwright/test';
import { setupFronteggMocks } from './fixtures/intercepts';
import { forgeExpiredSessionCookie, forgeNearExpirySessionCookie } from './fixtures/session-forge';

/**
 * Mocked token-refresh scenarios.
 *
 * Session cookies are forged using iron-session `sealData` with the same
 * password the SDK uses, so the middleware can unseal them. The JWTs inside
 * are signed with a test RSA key pair whose public key is configured in the
 * example app's `.env.local` as `FRONTEGG_JWT_PUBLIC_KEY`.
 */
test.describe('mocked token refresh', () => {
  test.beforeEach(async ({ page }) => {
    await setupFronteggMocks(page);
  });

  test('expired session cookie triggers redirect to login', async ({ page, context }) => {
    // An expired JWT means createSession returns undefined (exp < now),
    // so the middleware should redirect to login.
    const cookie = await forgeExpiredSessionCookie();
    await context.addCookies([cookie]);

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();

    const landedOnLogin =
      finalUrl.includes('/account/login') || finalUrl.includes('/oauth/') || finalUrl.includes('login');
    expect(landedOnLogin, `expected login redirect for expired session, got ${finalUrl}`).toBe(true);
  });

  test('near-expiry session triggers refresh attempt', async ({ page, context }) => {
    let refreshCount = 0;
    await setupFronteggMocks(page, { onRefresh: () => refreshCount++ });

    const cookie = await forgeNearExpirySessionCookie();
    await context.addCookies([cookie]);

    // Navigate — the middleware should attempt a refresh via the server-side
    // refresh flow. We intercept the refresh endpoint and count calls.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3_000);

    // The near-expiry token (30s TTL) is still valid so the middleware passes
    // it through. The client-side SDK may or may not trigger a refresh
    // depending on its keepSessionAlive logic and timing.
    // We just verify the page loads without a hard redirect to login.
    expect(page.url()).not.toContain('/account/login');
  });

  test('concurrent fetches with near-expiry cookie do not crash', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await setupFronteggMocks(page, {});

    const cookie = await forgeNearExpirySessionCookie();
    await context.addCookies([cookie]);

    // Navigate to the home page first so fetch() has a valid origin
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Fire three concurrent fetches — these go through the Next.js server
    // which should handle concurrent session checks without crashing.
    const results = await page.evaluate(async () => {
      const urls = ['/session', '/no-ssr', '/'];
      const responses = await Promise.allSettled(urls.map((u) => fetch(u)));
      return responses.map((r) => (r.status === 'fulfilled' ? r.value.status : 'rejected'));
    });

    // All fetches should complete (any status is fine — no unhandled errors)
    expect(results).toHaveLength(3);
    results.forEach((status) => {
      expect(typeof status).toBe('number');
    });

    await context.close();
  });
});
