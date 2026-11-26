import { describe, it, expect, vi, beforeEach } from 'vitest';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  baseUrl: 'https://auth.example.com',
  authRoutes: {} as Record<string, string> | undefined,
}));

vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));

import config from '../../../src/config';
import {
  extractAccessToken,
  getHostedLogoutUrl,
  isFronteggLogoutUrl,
  isFronteggOauthLogoutUrl,
  isInternalRequest,
  removeJwtSignatureFrom,
  rewritePath,
} from '../../../src/middleware/helpers';
import { fronteggPathRewrite, fronteggSSOPathRewrite } from '../../../src/middleware/constants';

const jwt = (payload: string) => `header.${payload}.signature`;

beforeEach(() => {
  Object.assign(config, { ...CONFIG_BASE, authRoutes: {} });
});

describe('rewritePath', () => {
  it('rewrites the first matching pattern from an array of rules', () => {
    // Arrange
    const rules = [
      { patternStr: '^/nope/', replaceStr: '/x/' },
      { patternStr: '^/api/', replaceStr: '/' },
      { patternStr: '^/api/frontegg', replaceStr: '/never' },
    ];

    // Act
    const result = rewritePath('/api/frontegg/identity', rules);

    // Assert
    expect(result).toBe('/frontegg/identity');
  });

  it('rewrites using an object map of pattern to replacement', () => {
    const result = rewritePath('/old/path', { '^/old': '/new' });

    expect(result).toBe('/new/path');
  });

  it('skips non-matching entries of an object map before rewriting', () => {
    const result = rewritePath('/b/path', { '^/a': '/x', '^/b': '/y' });

    expect(result).toBe('/y/path');
  });

  it('returns the url untouched when no array rule matches', () => {
    expect(rewritePath('/other', [{ patternStr: '^/api/', replaceStr: '/' }])).toBe('/other');
  });

  it('returns the url untouched when no object rule matches', () => {
    expect(rewritePath('/other', { '^/api/': '/' })).toBe('/other');
  });

  it('strips the /api prefix with the default frontegg rewrite rules', () => {
    expect(rewritePath('/api/frontegg/identity/resources/auth/v1/user', fronteggPathRewrite)).toBe(
      '/frontegg/identity/resources/auth/v1/user'
    );
  });

  it('maps the frontegg saml callback to the auth saml callback route', () => {
    expect(rewritePath('/frontegg/saml/callback', fronteggSSOPathRewrite)).toBe('/auth/saml/callback');
    expect(rewritePath('/frontegg/auth/saml/callback', fronteggSSOPathRewrite)).toBe('/frontegg/auth/saml/callback');
  });
});

describe('logout url predicates', () => {
  it('detects any path ending with /logout', () => {
    expect(isFronteggLogoutUrl('/frontegg/identity/resources/auth/v1/logout')).toBe(true);
    expect(isFronteggLogoutUrl('/frontegg/oauth/logout')).toBe(true);
    expect(isFronteggLogoutUrl('/frontegg/logout/other')).toBe(false);
  });

  it('detects only oauth logout paths as hosted logout', () => {
    expect(isFronteggOauthLogoutUrl('/frontegg/oauth/logout')).toBe(true);
    expect(isFronteggOauthLogoutUrl('/frontegg/identity/resources/auth/v1/logout')).toBe(false);
  });
});

describe('getHostedLogoutUrl', () => {
  it('defaults the post logout redirect to the app url', () => {
    // Act
    const { asPath } = getHostedLogoutUrl();

    // Assert
    expect(asPath).toBe(
      `https://auth.example.com/oauth/logout?post_logout_redirect_uri=${encodeURIComponent('https://app.example.com/')}`
    );
  });

  it('keeps a referer that is not the logout route as the redirect target', () => {
    const { asUrl } = getHostedLogoutUrl('https://app.example.com/dashboard?tab=1');

    expect(asUrl.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com/dashboard?tab=1');
  });

  it('drops the logout path from the referer to avoid a logout loop', () => {
    const { asUrl } = getHostedLogoutUrl('https://app.example.com/account/logout?foo=bar');

    expect(asUrl.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com?foo=bar');
  });

  it('honors an overridden logout route', () => {
    Object.assign(config, { authRoutes: { logoutUrl: '/bye' } });

    const { asUrl } = getHostedLogoutUrl('https://app.example.com/bye');

    expect(asUrl.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com');
  });

  it('falls back to the default logout route when authRoutes is missing', () => {
    Object.assign(config, { authRoutes: undefined });

    const { asUrl } = getHostedLogoutUrl('https://app.example.com/account/logout');

    expect(asUrl.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com');
  });
});

describe('extractAccessToken', () => {
  it('reads camelCase tokens', () => {
    expect(extractAccessToken(JSON.stringify({ accessToken: 'a', refreshToken: 'r' }))).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('reads snake_case tokens', () => {
    expect(extractAccessToken(JSON.stringify({ access_token: 'a', refresh_token: 'r' }))).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('prefers tokens nested in authResponse', () => {
    const body = { accessToken: 'outer', authResponse: { accessToken: 'inner', refreshToken: 'inner-r' } };

    expect(extractAccessToken(JSON.stringify(body))).toEqual({ accessToken: 'inner', refreshToken: 'inner-r' });
  });

  it('returns undefined tokens for a body without tokens', () => {
    expect(extractAccessToken('{}')).toEqual({ accessToken: undefined, refreshToken: undefined });
  });

  it('throws on a non json body', () => {
    expect(() => extractAccessToken('<html>')).toThrow();
  });
});

describe('removeJwtSignatureFrom', () => {
  it('returns falsy bodies as is', () => {
    expect(removeJwtSignatureFrom(null)).toBeNull();
    expect(removeJwtSignatureFrom(undefined)).toBeUndefined();
  });

  it('redacts header and signature of top level jwts and drops refresh tokens', () => {
    // Arrange
    const body = {
      accessToken: jwt('p1'),
      access_token: jwt('p2'),
      idToken: jwt('p3'),
      id_token: jwt('p4'),
      refreshToken: 'r1',
      refresh_token: 'r2',
      other: 'kept',
    };

    // Act
    const result: any = removeJwtSignatureFrom(body);

    // Assert
    expect(result).toEqual({
      accessToken: 'REDACTED_FOR_SECURITY.p1.REDACTED_FOR_SECURITY',
      access_token: 'REDACTED_FOR_SECURITY.p2.REDACTED_FOR_SECURITY',
      idToken: 'REDACTED_FOR_SECURITY.p3.REDACTED_FOR_SECURITY',
      id_token: 'REDACTED_FOR_SECURITY.p4.REDACTED_FOR_SECURITY',
      other: 'kept',
    });
  });

  it('redacts jwts nested in authResponse and drops nested refresh tokens', () => {
    const body = { authResponse: { accessToken: jwt('inner'), refresh_token: 'r', user: 'u' } };

    const result: any = removeJwtSignatureFrom(body);

    expect(result.authResponse).toEqual({
      accessToken: 'REDACTED_FOR_SECURITY.inner.REDACTED_FOR_SECURITY',
      user: 'u',
    });
  });

  it('leaves bodies without tokens unchanged', () => {
    expect(removeJwtSignatureFrom({ authResponse: {}, user: 'u' })).toEqual({ authResponse: {}, user: 'u' });
  });
});

describe('isInternalRequest', () => {
  it('matches a host that is part of the app url', () => {
    expect(isInternalRequest('app.example.com')).toBe(true);
  });

  it('rejects a foreign host', () => {
    expect(isInternalRequest('evil.com')).toBe(false);
  });
});
