import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/config', () => ({ default: { appUrl: 'https://app.example.com', authRoutes: {} } }));

import { shouldByPassMiddleware } from '../../../src/edge/shouldBypassMiddleware';
import { redirectToLogin } from '../../../src/edge/redirectToLogin';

const headers = (init: Record<string, string> = {}) => new Headers(init) as any;

describe('shouldByPassMiddleware', () => {
  it.each([
    ['/_next/static/chunks/main.js', 'static files'],
    ['/_next/image?url=/a.png', 'image optimization'],
    ['/favicon.ico', 'favicon'],
    ['/.well-known/openid-configuration', 'well known routes'],
    ['/api/frontegg/identity/resources/auth/v1/user', 'frontegg api middleware'],
    ['/account/login', 'frontegg login route'],
    ['/account/logout', 'frontegg logout route'],
    ['/account/saml/callback', 'frontegg saml callback'],
    ['/oauth/callback', 'hosted login callback'],
  ])('bypasses %s (%s) by default', (pathname) => {
    expect(shouldByPassMiddleware(pathname, headers())).toBe(true);
  });

  it('checks the session for application pages', () => {
    expect(shouldByPassMiddleware('/dashboard', headers())).toBe(false);
  });

  it('does not treat the authenticated root url as a frontegg route', () => {
    expect(shouldByPassMiddleware('/', headers())).toBe(false);
  });

  it('protects static files, images and favicon when their bypass is disabled', () => {
    const options = { bypassStaticFiles: false, bypassImageOptimization: false, bypassHeaderRequests: false };

    // & Assert
    expect(shouldByPassMiddleware('/_next/static/a.js', headers(), options)).toBe(false);
    expect(shouldByPassMiddleware('/_next/image', headers(), options)).toBe(false);
    expect(shouldByPassMiddleware('/favicon.ico', headers(), options)).toBe(false);
  });

  it('always bypasses frontegg routes even if options try to disable it', () => {
    const options = { bypassFronteggRoutes: false, bypassFronteggMiddleware: false } as any;

    expect(shouldByPassMiddleware('/account/login', headers(), options)).toBe(true);
    expect(shouldByPassMiddleware('/api/frontegg/x', headers(), options)).toBe(true);
  });

  it('bypasses link hover prefetch requests flagged by next router', () => {
    expect(shouldByPassMiddleware('/dashboard', headers({ 'next-router-prefetch': '1' }))).toBe(true);
  });

  it('bypasses prefetch requests flagged by the purpose header', () => {
    expect(shouldByPassMiddleware('/dashboard', headers({ purpose: 'prefetch' }))).toBe(true);
  });

  it('checks the session for browser address bar prefetches of a document', () => {
    const prefetch = headers({ purpose: 'prefetch', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' });

    expect(shouldByPassMiddleware('/dashboard', prefetch)).toBe(false);
  });

  it('bypasses a navigate prefetch that is not for a document', () => {
    const prefetch = headers({ purpose: 'prefetch', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'empty' });

    expect(shouldByPassMiddleware('/dashboard', prefetch)).toBe(true);
  });
});

describe('redirectToLogin', () => {
  it('redirects to the login route of the app url carrying the original path', () => {
    const response = redirectToLogin('/dashboard');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      `https://app.example.com/account/login?redirectUrl=${encodeURIComponent('/dashboard')}`
    );
  });

  it('preserves search params and honors a custom base url', () => {
    const response = redirectToLogin('/a', new URLSearchParams('x=1&y=2'), 'https://other.example.com');

    expect(response.headers.get('location')).toBe(
      `https://other.example.com/account/login?redirectUrl=${encodeURIComponent('/a')}&x=1&y=2`
    );
  });
});
