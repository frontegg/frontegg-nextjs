import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FRONTEGG_CONFIG_BASE } from './fixtures';

vi.mock('../../../../src/config', () => ({
  default: { ...FRONTEGG_CONFIG_BASE },
}));

vi.mock('../../../../src/api', () => ({
  default: {
    refreshTokenEmbedded: vi.fn(),
    refreshTokenHostedLogin: vi.fn(),
  },
}));

vi.mock('../../../../src/common', () => ({
  getTokensFromCookie: vi.fn(),
  createSessionFromAccessToken: vi.fn(),
}));

import { hasRefreshTokenCookie } from '../../../../src/utils/refreshAccessTokenIfNeeded/helpers';
import config from '../../../../src/config';
import CookieManager from '../../../../src/utils/cookies';

beforeEach(() => {
  Object.assign(config, FRONTEGG_CONFIG_BASE, { appId: undefined });
});

describe('hasRefreshTokenCookie', () => {
  it('returns false when cookies is null', () => {
    expect(hasRefreshTokenCookie(null as any)).toBe(false);
  });

  it('returns false when no refresh token cookie present', () => {
    expect(hasRefreshTokenCookie({ other_cookie: 'x' })).toBe(false);
  });

  it('returns true when refresh token cookie matches by exact key', () => {
    const key = CookieManager.refreshTokenKey;
    expect(hasRefreshTokenCookie({ [key]: 'value' })).toBe(true);
  });

  it('returns true when refresh token cookie key contains dashes (normalized)', () => {
    const key = CookieManager.refreshTokenKey;
    const dashed = key.slice(0, 4) + '-' + key.slice(4);
    expect(hasRefreshTokenCookie({ [dashed]: 'value' })).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(hasRefreshTokenCookie({})).toBe(false);
  });
});
