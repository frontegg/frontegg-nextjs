import { test, expect } from '@playwright/test';
import { forgeExpiredSessionCookie, forgeSessionCookie } from '../../mocked/fixtures/session-forge';
import { FLOWS } from '../fixtures/env';
import { MockBackend, OAUTH_TOKEN_PATH, refreshCookie, sessionCookies } from '../fixtures/mock-backend';

/**
 * Hosted login (FRONTEGG_HOSTED_LOGIN=true) against the mock backend: the authorization-code
 * exchange, refresh-token grant and logout all run on the Next.js server.
 */
test.describe('hosted login', () => {
  let mock: MockBackend;

  test.beforeEach(async ({ playwright }) => {
    mock = new MockBackend(await playwright.request.newContext());
    await mock.reset();
  });

  test('the callback exchanges the authorization code for a session', async ({ context }) => {
    // Act
    const response = await context.request.get('/oauth/callback?code=mock-authorization-code', { maxRedirects: 0 });

    // Assert
    expect(response.status()).toBe(307);
    // Next.js may write a same-origin Location as a relative path.
    expect(new URL(response.headers()['location'], FLOWS.hostedAppUrl).toString()).toBe(`${FLOWS.hostedAppUrl}/`);
    const [exchange] = await mock.requests(OAUTH_TOKEN_PATH);
    expect(JSON.parse(exchange.body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'mock-authorization-code',
      client_id: FLOWS.clientId,
      client_secret: 'e2e-client-secret',
      redirect_uri: `${FLOWS.hostedAppUrl}/oauth/callback`,
    });
    expect(await sessionCookies(context)).not.toHaveLength(0);
    expect(await (await context.request.get('/e2e/session')).json()).toMatchObject({ authenticated: true });
  });

  test('a full login redirects through the authorize endpoint and lands back signed in', async ({ page, context }) => {
    // Act
    await page.goto('/session', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.origin === FLOWS.hostedAppUrl && !url.pathname.startsWith('/account/login'), {
      timeout: 30_000,
    });

    // Assert
    expect((await mock.requests()).some((r) => r.path.endsWith('/oauth/authorize'))).toBe(true);
    expect(await mock.requests(OAUTH_TOKEN_PATH)).toHaveLength(1);
    expect(await sessionCookies(context)).not.toHaveLength(0);
    expect(await (await context.request.get('/e2e/session')).json()).toMatchObject({ authenticated: true });
  });

  test('an expired session is refreshed with the refresh-token grant', async ({ context }) => {
    // Arrange
    await context.addCookies([await forgeExpiredSessionCookie(), refreshCookie('refresh-0', FLOWS.hostedAppUrl)]);

    // Act
    const response = await context.request.get('/e2e/session');

    // Assert
    expect(await response.json()).toMatchObject({ authenticated: true });
    const [refresh] = await mock.requests(OAUTH_TOKEN_PATH);
    expect(JSON.parse(refresh.body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-0',
      client_id: FLOWS.clientId,
      client_secret: 'e2e-client-secret',
    });
  });

  test('logout clears the session and points the browser at the hosted logout page', async ({ context }) => {
    // Arrange
    await context.addCookies([await forgeSessionCookie(), refreshCookie('refresh-0', FLOWS.hostedAppUrl)]);

    // Act
    const response = await context.request.post('/api/frontegg/identity/resources/auth/v1/logout', {
      data: {},
      maxRedirects: 0,
    });

    // Assert
    expect(response.status()).toBe(302);
    expect(await response.text()).toContain(`${FLOWS.mockBaseUrl}/oauth/logout?post_logout_redirect_uri=`);
    const [logoutCall] = await mock.requests('/frontegg/identity/resources/auth/v1/logout');
    expect(logoutCall.headers.authorization).toMatch(/^Bearer /);
    expect(await sessionCookies(context)).toHaveLength(0);
  });
});
