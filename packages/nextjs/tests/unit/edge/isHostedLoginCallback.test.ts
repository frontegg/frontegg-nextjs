import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    appUrl: 'https://app.example.com',
    authRoutes: {} as Record<string, string>,
    secureJwtEnabled: true,
  },
}));

vi.mock('../../../src/api', () => ({ default: { exchangeHostedLoginToken: vi.fn() } }));
vi.mock('../../../src/utils/encryption-edge', () => ({ default: { sealTokens: vi.fn() } }));
vi.mock('../../../src/utils/jwt', () => ({ default: { verify: vi.fn() } }));

import config from '../../../src/config';
import { isHostedLoginCallback } from '../../../src/edge/getSessionOnEdge';

const params = (qs: string) => new URLSearchParams(qs);

beforeEach(() => {
  Object.assign(config, { authRoutes: {}, secureJwtEnabled: true });
});

describe('isHostedLoginCallback', () => {
  it('matches the default callback path carrying a code', () => {
    expect(isHostedLoginCallback('/oauth/callback', params('code=abc'))).toBe(true);
  });

  it('ignores the callback path without a code', () => {
    expect(isHostedLoginCallback('/oauth/callback', params(''))).toBe(false);
  });

  it('ignores a code on an unrelated path by default', () => {
    expect(isHostedLoginCallback('/', params('code=abc'))).toBe(false);
  });

  it('is disabled when secure jwt is off', () => {
    Object.assign(config, { secureJwtEnabled: false });
    expect(isHostedLoginCallback('/oauth/callback', params('code=abc'))).toBe(false);
  });

  it('follows an overridden callback route', () => {
    Object.assign(config, { authRoutes: { hostedLoginRedirectUrl: '/auth/cb' } });
    expect(isHostedLoginCallback('/auth/cb', params('code=abc'))).toBe(true);
    expect(isHostedLoginCallback('/oauth/callback', params('code=abc'))).toBe(false);
  });

  it('matches an impersonation landing at the app root when the callback route is the root', () => {
    Object.assign(config, { authRoutes: { hostedLoginRedirectUrl: '/' } });
    expect(isHostedLoginCallback('/', params('code=abc'))).toBe(true);
    expect(isHostedLoginCallback('/', params(''))).toBe(false);
  });
});
