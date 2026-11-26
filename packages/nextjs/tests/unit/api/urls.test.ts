import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: { appUrl: 'https://app.example.com' },
}));

import { buildLoginRoute, buildLogoutRoute } from '../../../src/api/urls';

describe('buildLoginRoute', () => {
  it('builds the login route on the configured app url with an encoded redirectUrl', () => {
    // Act
    const { asPath, asUrl } = buildLoginRoute('/dashboard?tab=1&x=a b');

    // Assert
    expect(asPath).toBe('https://app.example.com/account/login?redirectUrl=%2Fdashboard%3Ftab%3D1%26x%3Da%20b');
    expect(asUrl.searchParams.get('redirectUrl')).toBe('/dashboard?tab=1&x=a b');
    expect(asUrl.pathname).toBe('/account/login');
  });

  it('preserves additional search params after the redirectUrl', () => {
    const searchParams = new URLSearchParams({ organization: 'acme', invite: 'tok' });

    const { asPath, asUrl } = buildLoginRoute('/home', searchParams);

    expect(asPath).toBe('https://app.example.com/account/login?redirectUrl=%2Fhome&organization=acme&invite=tok');
    expect(asUrl.searchParams.get('organization')).toBe('acme');
    expect(asUrl.searchParams.get('invite')).toBe('tok');
  });

  it('uses a custom base url when provided', () => {
    const { asUrl } = buildLoginRoute('/home', undefined, 'https://other.example.org');

    expect(asUrl.origin).toBe('https://other.example.org');
  });

  it('throws a TypeError when the base url is not a valid absolute url', () => {
    expect(() => buildLoginRoute('/home', undefined, 'not-a-url')).toThrow(TypeError);
  });
});

describe('buildLogoutRoute', () => {
  it('builds the hosted logout route with an encoded post_logout_redirect_uri', () => {
    const { asPath, asUrl } = buildLogoutRoute('https://app.example.com/after?x=1', 'https://auth.example.com');

    expect(asPath).toBe(
      'https://auth.example.com/oauth/logout?post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fafter%3Fx%3D1'
    );
    expect(asUrl.origin).toBe('https://auth.example.com');
    expect(asUrl.pathname).toBe('/oauth/logout');
    expect(asUrl.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com/after?x=1');
  });
});
