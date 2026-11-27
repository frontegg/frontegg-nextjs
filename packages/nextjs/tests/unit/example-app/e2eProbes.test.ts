// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@frontegg/nextjs/app', () => ({
  getAppUserSession: vi.fn(async () => ({ sub: 'user-1', email: 'user@example.com' })),
  getAppUserTokens: vi.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh-secret' })),
}));
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [{ name: 'fe_refresh_x', value: 'refresh-secret' }] }),
}));

import { GET as sessionProbe } from '../../../../example-app-directory/app/e2e/session/route';
import { GET as requestCookiesProbe } from '../../../../example-app-directory/app/e2e/request-cookies/route';

const PROBES = [
  ['/e2e/session', sessionProbe],
  ['/e2e/request-cookies', requestCookiesProbe],
] as const;

describe('example app E2E probe routes', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(PROBES)('%s returns 404 when FRONTEGG_E2E_PROBES is not set', async (_path, probe) => {
    vi.stubEnv('FRONTEGG_E2E_PROBES', '');

    const response = await probe();

    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('refresh-secret');
  });

  it.each(PROBES)('%s responds when FRONTEGG_E2E_PROBES=1', async (_path, probe) => {
    vi.stubEnv('FRONTEGG_E2E_PROBES', '1');

    const response = await probe();

    expect(response.status).toBe(200);
  });

  it('the session probe never returns token values', async () => {
    vi.stubEnv('FRONTEGG_E2E_PROBES', '1');

    const body = await (await sessionProbe()).json();

    expect(body).toEqual({
      authenticated: true,
      user: { sub: 'user-1', email: 'user@example.com' },
      hasAccessToken: true,
      hasRefreshToken: true,
    });
  });
});
