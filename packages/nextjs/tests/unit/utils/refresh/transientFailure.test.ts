import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FRONTEGG_CONFIG_BASE, mockNextPageContext } from './fixtures';

vi.mock('../../../../src/config', () => ({ default: { ...FRONTEGG_CONFIG_BASE } }));
vi.mock('../../../../src/utils/cookies', () => ({
  default: { removeCookies: vi.fn(), getSessionCookieFromRequest: vi.fn(), modifySetCookie: vi.fn(), create: vi.fn() },
}));
vi.mock('../../../../src/utils/refreshAccessTokenIfNeeded/helpers', () => ({
  isOauthCallback: vi.fn(() => false),
  isSamlCallback: vi.fn(() => false),
  isRuntimeNextRequest: vi.fn(() => false),
  hasSetSessionCookie: vi.fn(() => false),
  refreshAccessTokenEmbedded: vi.fn(),
  refreshAccessTokenHostedLogin: vi.fn(),
  saveForwardedSession: vi.fn(),
  getForwardedSession: vi.fn(),
}));

import refreshAccessTokenIfNeeded from '../../../../src/utils/refreshAccessTokenIfNeeded';
import CookieManager from '../../../../src/utils/cookies';
import * as helpers from '../../../../src/utils/refreshAccessTokenIfNeeded/helpers';

const mockedRemoveCookies = vi.mocked(CookieManager.removeCookies);
const mockedRefresh = vi.mocked(helpers.refreshAccessTokenEmbedded);

describe('refreshAccessTokenIfNeeded when the refresh fails', () => {
  beforeEach(() => {
    mockedRefresh.mockReset();
  });

  it.each([400, 401])('clears the session cookies when Frontegg rejects the refresh token (%s)', async (status) => {
    mockedRefresh.mockResolvedValue(new Response('', { status }));

    const session = await refreshAccessTokenIfNeeded(mockNextPageContext());

    expect(session).toBeNull();
    expect(mockedRemoveCookies).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a Frontegg outage (503)', () => new Response('', { status: 503 })],
    ['rate limiting (429)', () => new Response('', { status: 429 })],
    ['no response', () => null],
  ])('keeps the session cookies on %s so the user is not logged out', async (_case, response) => {
    mockedRefresh.mockResolvedValue(response());

    const session = await refreshAccessTokenIfNeeded(mockNextPageContext());

    expect(session).toBeNull();
    expect(mockedRemoveCookies).not.toHaveBeenCalled();
  });
});
