import { test, expect } from '@playwright/test';
import { forgeExpiredSessionCookie, forgeSessionCookie } from '../../mocked/fixtures/session-forge';
import { FLOWS } from '../fixtures/env';
import {
  MockBackend,
  REFRESH_PATH,
  JWKS_PATH,
  refreshCookie,
  refreshCookieName,
  sessionCookieBaseName,
  sessionCookies,
} from '../fixtures/mock-backend';

/** Edge middleware session handling (embedded login); every Frontegg call here comes from the Next.js server. */
test.describe('embedded: middleware session and token refresh', () => {
  let mock: MockBackend;

  test.beforeEach(async ({ playwright }) => {
    mock = new MockBackend(await playwright.request.newContext());
    await mock.reset();
  });

  test('a valid session is accepted without calling the refresh endpoint', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie()]);

    const response = await context.request.get('/e2e/session');

    expect(await response.json()).toMatchObject({ authenticated: true, user: { email: 'mock-user@example.com' } });
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(0);
  });

  test('the JWT public key is downloaded from the JWKS endpoint when no key is configured', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie()]);

    await context.request.get('/e2e/session');

    // Cached per server process, so it may already have been fetched by an earlier test.
    const jwksCalls = await mock.requests(JWKS_PATH);
    expect(jwksCalls.length).toBeLessThanOrEqual(1);
  });

  test('an expired session is refreshed on the server with the refresh cookie', async ({ context }) => {
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    const response = await context.request.get('/e2e/session');

    expect(await response.json()).toMatchObject({ authenticated: true });
    const refreshCalls = await mock.requests(REFRESH_PATH);
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].headers.cookie).toContain(`${refreshCookieName()}=refresh-0`);
    const browserCookies = await context.cookies();
    expect(browserCookies.find((c) => c.name === refreshCookieName())?.value).toMatch(/^mock-refresh-token-/);
    expect(await sessionCookies(context)).not.toHaveLength(0);
  });

  test('after a refresh, the new session cookie is reused without refreshing again', async ({ context }) => {
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    await context.request.get('/e2e/session');
    const second = await context.request.get('/e2e/session');

    expect(await second.json()).toMatchObject({ authenticated: true });
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(1);
  });

  test('on the refresh request, the app receives all request cookies with refreshed values', async ({ context }) => {
    await context.addCookies([
      { name: 'theme', value: 'dark', url: FLOWS.embeddedAppUrl },
      { name: 'tracking', value: 'a=b==', url: FLOWS.embeddedAppUrl },
      await forgeExpiredSessionCookie(),
      refreshCookie('refresh-0', FLOWS.embeddedAppUrl),
    ]);

    const received: { name: string; value: string }[] = await (
      await context.request.get('/e2e/request-cookies')
    ).json();

    const byName = Object.fromEntries(received.map((c) => [c.name, c.value]));
    expect(byName.theme).toBe('dark');
    expect(byName.tracking).toBe('a=b==');
    expect(byName[refreshCookieName()]).toMatch(/^mock-refresh-token-/);
    expect(Object.keys(byName).some((name) => name.startsWith(sessionCookieBaseName()))).toBe(true);
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(1);
  });

  test('a large session is split into chunks that the app receives whole', async ({ context }) => {
    // a token big enough that the sealed session exceeds one cookie
    await mock.configure({ claimsPaddingLength: 6000 });
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    const received: { name: string; value: string }[] = await (
      await context.request.get('/e2e/request-cookies')
    ).json();
    const sessionAfter = await context.request.get('/e2e/session');

    const chunkNames = received.map((c) => c.name).filter((name) => name.startsWith(`${sessionCookieBaseName()}-`));
    expect(chunkNames.length).toBeGreaterThan(1);
    expect((await sessionCookies(context)).length).toBeGreaterThan(1);
    expect(await sessionAfter.json()).toMatchObject({ authenticated: true });
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(1);
  });

  test('a rejected refresh sends the user to login and clears the session cookies', async ({ page, context }) => {
    await mock.configure({ failRefresh: true });
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    await page.goto('/session', { waitUntil: 'domcontentloaded' });

    expect(await mock.requests(REFRESH_PATH)).toHaveLength(1);
    await expect(page).toHaveURL(/\/account\/login/);
    expect(await sessionCookies(context)).toHaveLength(0);
  });

  test('a Frontegg outage during refresh keeps the refresh cookie, so the session recovers', async ({
    page,
    context,
  }) => {
    await mock.configure({ failRefresh: true, refreshFailureStatus: 503 });
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    await page.goto('/session', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/account\/login/);
    const refreshAfterOutage = (await context.cookies()).find((c) => c.name === refreshCookieName());
    expect(refreshAfterOutage?.value).toBe('refresh-0');

    await mock.configure({ failRefresh: false });
    const recovered = await context.request.get('/e2e/session');
    expect(await recovered.json()).toMatchObject({ authenticated: true });
  });

  test('without any session or refresh cookie, the user is sent to login and Frontegg is not called', async ({
    page,
  }) => {
    await page.goto('/session', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/account\/login\?redirectUrl=%2Fsession/);
    expect(await mock.requests(REFRESH_PATH)).toHaveLength(0);
  });
});
