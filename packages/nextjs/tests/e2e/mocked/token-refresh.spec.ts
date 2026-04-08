import { test, expect } from '@playwright/test';
import { setupFronteggMocks } from './fixtures/intercepts';

/**
 * Mocked token-refresh scenarios.
 *
 * Session cookies are encrypted + signed by `@frontegg/nextjs` with
 * FRONTEGG_ENCRYPTION_PASSWORD; forging one from the test side requires either
 * a test-only fixture route or importing internals, both of which are out of
 * scope for Phase 3. Until such a helper lands, the forge-dependent scenarios
 * skip with a clear reason so the suite stays green.
 */
test.describe('mocked token refresh', () => {
  test.beforeEach(async ({ page }) => {
    // Default mocks; individual tests may override via a second setup call.
    await setupFronteggMocks(page);
  });

  test('near-expiry session triggers refresh on page load', async ({ page, context }) => {
    test.skip(
      !process.env.FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE,
      'requires FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE — session cookie is encrypted ' +
        'and must be produced by the middleware (no forge helper yet)'
    );

    let refreshCount = 0;
    await setupFronteggMocks(page, { onRefresh: () => refreshCount++ });

    await context.addCookies([
      {
        name: process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session',
        value: process.env.FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE!,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/');
    expect(refreshCount).toBeGreaterThanOrEqual(1);
  });

  test('refresh returns 401 clears cookies and redirects to login', async ({ page, context }) => {
    test.skip(
      !process.env.FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE,
      'requires a forged near-expiry session cookie (not yet available)'
    );

    await setupFronteggMocks(page, { refreshStatus: 401 });

    await context.addCookies([
      {
        name: process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session',
        value: process.env.FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE!,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cookies = await context.cookies();
    const sessionCookieName = process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session';
    expect(cookies.find((c) => c.name === sessionCookieName)).toBeFalsy();
    expect(page.url()).toMatch(/login|oauth/);
  });

  test('concurrent navigations only trigger one refresh call', async ({ page, context }) => {
    test.skip(
      !process.env.FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE,
      'requires a forged near-expiry session cookie (not yet available)'
    );

    let refreshCount = 0;
    await setupFronteggMocks(page, { onRefresh: () => refreshCount++ });

    await context.addCookies([
      {
        name: process.env.FRONTEGG_COOKIE_NAME ?? 'fe_session',
        value: process.env.FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE!,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await Promise.all([page.goto('/'), page.goto('/session'), page.goto('/no-ssr')]);
    expect(refreshCount).toBeLessThanOrEqual(1);
  });
});
