import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/config', () => ({
  default: {
    appUrl: 'https://app.example.com',
    authRoutes: {} as Record<string, string>,
  },
}));

import config from '../../../../src/config';
import {
  getHostedLoginRedirectPath,
  buildHostedLoginRedirectUri,
  isHostedLoginCallbackPath,
} from '../../../../src/utils/routing';

const setRoutes = (routes: Record<string, string>) => Object.assign(config, { authRoutes: routes });

beforeEach(() => {
  Object.assign(config, { appUrl: 'https://app.example.com', authRoutes: {} });
});

describe('getHostedLoginRedirectPath', () => {
  it('defaults to /oauth/callback', () => {
    expect(getHostedLoginRedirectPath()).toBe('/oauth/callback');
  });

  it('honors an authRoutes override', () => {
    setRoutes({ hostedLoginRedirectUrl: '/auth/cb' });
    expect(getHostedLoginRedirectPath()).toBe('/auth/cb');
  });

  it('normalizes an override missing its leading slash', () => {
    setRoutes({ hostedLoginRedirectUrl: 'auth/cb' });
    expect(getHostedLoginRedirectPath()).toBe('/auth/cb');
  });
});

describe('buildHostedLoginRedirectUri', () => {
  it('appends the default callback path to the app url', () => {
    expect(buildHostedLoginRedirectUri()).toBe('https://app.example.com/oauth/callback');
  });

  it('appends an overridden callback path', () => {
    setRoutes({ hostedLoginRedirectUrl: '/auth/cb' });
    expect(buildHostedLoginRedirectUri()).toBe('https://app.example.com/auth/cb');
  });

  it('drops the path entirely when the callback is the app root', () => {
    setRoutes({ hostedLoginRedirectUrl: '/' });
    expect(buildHostedLoginRedirectUri()).toBe('https://app.example.com');
  });

  it('leaves a trailing slash on appUrl alone so it still matches the authorize-time URI', () => {
    Object.assign(config, { appUrl: 'https://app.example.com/' });
    expect(buildHostedLoginRedirectUri()).toBe('https://app.example.com//oauth/callback');
  });

  it('drops a trailing slash on appUrl only when the callback is the app root', () => {
    Object.assign(config, { appUrl: 'https://app.example.com/', authRoutes: { hostedLoginRedirectUrl: '/' } });
    expect(buildHostedLoginRedirectUri()).toBe('https://app.example.com');
  });
});

describe('isHostedLoginCallbackPath', () => {
  it('matches the default callback path', () => {
    expect(isHostedLoginCallbackPath('/oauth/callback', true)).toBe(true);
  });

  it('matches nested paths under the callback path', () => {
    expect(isHostedLoginCallbackPath('/oauth/callback/extra', true)).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isHostedLoginCallbackPath('/account/login', true)).toBe(false);
  });

  it('matches an overridden callback path', () => {
    setRoutes({ hostedLoginRedirectUrl: '/auth/cb' });
    expect(isHostedLoginCallbackPath('/auth/cb', true)).toBe(true);
    expect(isHostedLoginCallbackPath('/oauth/callback', true)).toBe(false);
  });

  it('requires an authorization code when the callback is the app root', () => {
    setRoutes({ hostedLoginRedirectUrl: '/' });
    expect(isHostedLoginCallbackPath('/', true)).toBe(true);
    expect(isHostedLoginCallbackPath('/dashboard', true)).toBe(true);
    expect(isHostedLoginCallbackPath('/', false)).toBe(false);
    expect(isHostedLoginCallbackPath('/dashboard', false)).toBe(false);
  });
});
