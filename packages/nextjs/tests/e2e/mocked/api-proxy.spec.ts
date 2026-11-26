import { test, expect } from '@playwright/test';

/**
 * API proxy E2E tests.
 *
 * The Next.js app proxies `/api/frontegg/*` requests to the upstream Frontegg
 * backend. These tests verify the proxy correctly forwards requests and
 * returns upstream responses to the client.
 *
 * NOTE: These tests hit the real Frontegg backend through the proxy — no
 * page.route mocks are needed since we use the `request` API context which
 * makes direct HTTP calls to the Next.js server.
 */

// Run sequentially to avoid overwhelming the proxy with concurrent requests.
test.describe.configure({ mode: 'serial' });

test.describe('API proxy', () => {
  test('proxy forwards GET to Frontegg backend', async ({ request }) => {
    // The configurations endpoint returns tenant config. Without auth it
    // returns 401. Either way, the proxy must forward the request — we verify
    // the response is NOT a redirect and NOT a 5xx.
    const response = await request.get('/api/frontegg/identity/resources/configurations/v1');

    expect(response.status()).not.toBe(307);
    expect(response.status()).toBeLessThan(500);

    const body = await response.text();
    // The proxy should return the upstream JSON body (even if it's an error).
    expect(body.length).toBeGreaterThan(0);
  });

  test('proxy forwards POST with body', async ({ request }) => {
    // POST to the user auth endpoint with mock credentials. The upstream will
    // reject them, but the proxy should forward the request faithfully.
    const response = await request.post('/api/frontegg/identity/resources/auth/v1/user', {
      data: {
        email: 'test-proxy@example.com',
        password: 'not-a-real-password',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // We expect a 4xx from the upstream (invalid credentials) — NOT a 307
    // redirect or 500 server error. This proves the proxy forwarded the POST.
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('proxy returns 401 from backend', async ({ request }) => {
    // Hit a protected endpoint without auth headers. The upstream should
    // return 401, and the proxy should relay it faithfully.
    const response = await request.get('/api/frontegg/identity/resources/users/v2/me');

    expect(response.status()).toBe(401);
  });
});
