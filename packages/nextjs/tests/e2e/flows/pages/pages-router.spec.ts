import { test, expect } from '@playwright/test';
import { forgeExpiredSessionCookie, forgeSessionCookie } from '../../mocked/fixtures/session-forge';
import { FLOWS } from '../fixtures/env';
import { MockBackend, REFRESH_PATH, refreshCookie } from '../fixtures/mock-backend';

/** The `ssrSession.user.email` from the page props Next.js embeds in server-rendered HTML. */
function ssrSessionEmail(html: string): string | undefined {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!match) {
    return undefined;
  }
  return JSON.parse(match[1]).props?.pageProps?.ssrSession?.user?.email;
}

/** Pages Router (example-pages): withFronteggApp, withSSRSession, getSession and no-SSR, against the mock backend. */
test.describe('pages router', () => {
  let mock: MockBackend;

  test.beforeEach(async ({ playwright }) => {
    mock = new MockBackend(await playwright.request.newContext());
    await mock.reset();
  });

  // withFronteggApp refreshes on every full page load, so signed-in browsers always carry a refresh cookie.
  test('withSSRSession passes the server-side session to the page for a signed-in user', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.pagesAppUrl)]);

    const response = await context.request.get('/force-session', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(ssrSessionEmail(await response.text())).toBe('mock-user@example.com');
  });

  test('a full page load refreshes the token once on the server', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.pagesAppUrl)]);

    await context.request.get('/force-session', { maxRedirects: 0 });

    const refreshCalls = await mock.requests(REFRESH_PATH);
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].headers.cookie).toContain('refresh-0');
  });

  test('without a refresh cookie, a still-valid session is kept (nothing to refresh with)', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie()]);

    const response = await context.request.get('/force-session', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(ssrSessionEmail(await response.text())).toBe('mock-user@example.com');
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(0);
  });

  test('a signed-out visit with only an expired session and no refresh cookie is sent to login', async ({
    context,
  }) => {
    await context.addCookies([await forgeExpiredSessionCookie()]);

    const response = await context.request.get('/force-session', { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/account/login');
  });

  test('getSession passes the optional server-side session to the page for a signed-in user', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.pagesAppUrl)]);

    const response = await context.request.get('/optional-session');

    expect(ssrSessionEmail(await response.text())).toBe('mock-user@example.com');
  });

  test('a signed-out visit to a protected page is sent to login', async ({ context }) => {
    const response = await context.request.get('/force-session', { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/account/login?redirectUrl=%2Fforce-session');
  });

  test('an expired session is refreshed before getServerSideProps runs', async ({ context }) => {
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.pagesAppUrl)]);

    const response = await context.request.get('/force-session');

    // the refreshed session reached the page's server-side props
    expect(ssrSessionEmail(await response.text())).toBe('mock-user@example.com');
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(1);
  });

  test('the no-SSR page renders for a signed-in user', async ({ page, context }) => {
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.pagesAppUrl)]);

    const response = await page.goto('/no-ssr', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'NO SSR Session' })).toBeVisible({ timeout: 30_000 });
  });

  test('logout through the pages API proxy clears the session', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.pagesAppUrl)]);

    const response = await context.request.post('/api/frontegg/identity/resources/auth/v1/logout', { data: {} });

    expect(response.status()).toBeLessThan(400);
    const remaining = (await context.cookies()).filter((c) => c.name.startsWith('fe_session'));
    expect(remaining).toHaveLength(0);
  });
});
