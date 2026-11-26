import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    isHostedLogin: false,
    authRoutes: {} as Record<string, string>,
  },
}));

vi.mock('../../../../src/config', () => ({ default: mockConfig }));

import { defaultFronteggRoutes, getAuthRoutes, isAuthRoute } from '../../../../src/utils/routing';

beforeEach(() => {
  mockConfig.isHostedLogin = false;
  mockConfig.authRoutes = {};
});

describe('getAuthRoutes', () => {
  it('returns the default routes as both an object and an array of paths', () => {
    const { routesObj, routesArr } = getAuthRoutes();

    expect(routesObj).toEqual(defaultFronteggRoutes);
    expect(routesArr).toEqual(Object.values(defaultFronteggRoutes));
  });

  it('merges config.authRoutes overrides on top of the defaults', () => {
    mockConfig.authRoutes = { loginUrl: '/sign-in', customUrl: '/custom' };

    const { routesObj, routesArr } = getAuthRoutes();

    expect(routesObj.loginUrl).toBe('/sign-in');
    expect(routesObj.customUrl).toBe('/custom');
    expect(routesObj.logoutUrl).toBe(defaultFronteggRoutes.logoutUrl);
    expect(routesArr).toContain('/sign-in');
    expect(routesArr).toContain('/custom');
    expect(routesArr).not.toContain(defaultFronteggRoutes.loginUrl);
  });

  it('does not mutate the exported default routes', () => {
    mockConfig.authRoutes = { loginUrl: '/sign-in' };

    getAuthRoutes();

    expect(defaultFronteggRoutes.loginUrl).toBe('/account/login');
  });
});

describe('isAuthRoute (embedded login)', () => {
  it.each([
    '/account/login',
    '/account/logout',
    '/account/sign-up',
    '/account/activate',
    '/oauth/callback',
    '/account/redirect',
  ])('returns true for the default auth route %s', (pathname) => {
    expect(isAuthRoute(pathname)).toBe(true);
  });

  it('returns false for the authenticatedUrl even though it is part of the routes', () => {
    expect(isAuthRoute('/')).toBe(false);
  });

  it('returns false for a non auth path', () => {
    expect(isAuthRoute('/dashboard')).toBe(false);
  });

  it('returns false for a sub path of an auth route (exact match only)', () => {
    expect(isAuthRoute('/account/login/extra')).toBe(false);
  });

  it('honors overridden routes and drops the replaced default', () => {
    mockConfig.authRoutes = { loginUrl: '/sign-in' };

    expect(isAuthRoute('/sign-in')).toBe(true);
    expect(isAuthRoute('/account/login')).toBe(false);
  });

  it('excludes an overridden authenticatedUrl', () => {
    mockConfig.authRoutes = { authenticatedUrl: '/home' };

    expect(isAuthRoute('/home')).toBe(false);
  });
});

describe('isAuthRoute (hosted login)', () => {
  beforeEach(() => {
    mockConfig.isHostedLogin = true;
  });

  it.each(['/account/login', '/account/logout', '/oauth/callback'])(
    'returns true for the hosted login route %s',
    (pathname) => {
      expect(isAuthRoute(pathname)).toBe(true);
    }
  );

  it.each(['/account/sign-up', '/account/activate', '/account/forget-password', '/'])(
    'returns false for embedded-only route %s',
    (pathname) => {
      expect(isAuthRoute(pathname)).toBe(false);
    }
  );

  it('honors overridden login, logout and hosted callback routes', () => {
    mockConfig.authRoutes = {
      loginUrl: '/sign-in',
      logoutUrl: '/sign-out',
      hostedLoginRedirectUrl: '/auth/cb',
    };

    // + Assert
    expect(isAuthRoute('/sign-in')).toBe(true);
    expect(isAuthRoute('/sign-out')).toBe(true);
    expect(isAuthRoute('/auth/cb')).toBe(true);
    expect(isAuthRoute('/account/login')).toBe(false);
    expect(isAuthRoute('/oauth/callback')).toBe(false);
  });
});
