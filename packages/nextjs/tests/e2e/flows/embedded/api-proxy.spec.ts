import { test, expect } from '@playwright/test';
import { forgeSessionCookie } from '../../mocked/fixtures/session-forge';
import { FLOWS } from '../fixtures/env';
import { MockBackend, REFRESH_PATH, refreshCookie, refreshCookieName, sessionCookies } from '../fixtures/mock-backend';

/** The /api/frontegg proxy against the mock backend: refresh and logout as the browser-side client uses them. */
test.describe('embedded: /api/frontegg proxy', () => {
  let mock: MockBackend;

  test.beforeEach(async ({ playwright }) => {
    mock = new MockBackend(await playwright.request.newContext());
    await mock.reset();
  });

  test('a client-side refresh through the proxy sets a session cookie from the returned token', async ({ context }) => {
    await context.addCookies([refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    const response = await context.request.post(`/api/frontegg${REFRESH_PATH.replace(/^\/frontegg/, '')}`, {
      data: {},
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).accessToken).toBeTruthy();
    const [refreshCall] = await mock.requests(REFRESH_PATH);
    expect(refreshCall.headers.cookie).toContain(`${refreshCookieName()}=refresh-0`);
    expect(await sessionCookies(context)).not.toHaveLength(0);
    expect(await (await context.request.get('/e2e/session')).json()).toMatchObject({ authenticated: true });
  });

  test('a refresh rejected by Frontegg is passed through and sets no session cookie', async ({ context }) => {
    await mock.configure({ failRefresh: true });
    await context.addCookies([refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);

    const response = await context.request.post(`/api/frontegg${REFRESH_PATH.replace(/^\/frontegg/, '')}`, {
      data: {},
    });

    expect(response.status()).toBe(401);
    expect(await sessionCookies(context)).toHaveLength(0);
  });

  test('logout through the proxy clears the session cookies', async ({ context }) => {
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.embeddedAppUrl)]);
    expect(await sessionCookies(context)).not.toHaveLength(0);

    const response = await context.request.post('/api/frontegg/identity/resources/auth/v1/logout', { data: {} });

    expect(response.status()).toBeLessThan(400);
    expect(await mock.requests('/frontegg/identity/resources/auth/v1/logout')).toHaveLength(1);
    expect(await sessionCookies(context)).toHaveLength(0);
    // The session probe is behind the middleware, so a signed-out request is sent to login.
    const afterLogout = await context.request.get('/e2e/session', { maxRedirects: 0 });
    expect(afterLogout.status()).toBe(307);
    expect(afterLogout.headers()['location']).toContain('/account/login');
  });

  test('GET requests are forwarded to Frontegg with the path rewritten', async ({ context }) => {
    const response = await context.request.get('/api/frontegg/identity/resources/users/v2/me');

    expect(response.status()).toBe(200);
    expect(await mock.requests('/frontegg/identity/resources/users/v2/me')).toHaveLength(1);
  });
});
