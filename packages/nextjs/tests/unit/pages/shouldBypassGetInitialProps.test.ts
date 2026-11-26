import { describe, it, expect } from 'vitest';
import { shouldBypassGetInitialProps } from '../../../src/pages/withFronteggApp/shouldBypassGetInitialProps';

describe('shouldBypassGetInitialProps', () => {
  it.each(['/_next/static/chunk.js', '/_next/data/build/page.json', '/favicon.ico', '/.well-known/security.txt'])(
    'bypasses %s by default',
    (pathname) => {
      expect(shouldBypassGetInitialProps(pathname)).toBe(true);
    }
  );

  it('runs for application pages without headers', () => {
    expect(shouldBypassGetInitialProps('/dashboard')).toBe(false);
  });

  it('runs for application pages with regular navigation headers', () => {
    expect(shouldBypassGetInitialProps('/dashboard', { 'sec-fetch-mode': 'navigate' })).toBe(false);
  });

  it('honors options that disable each bypass', () => {
    // Arrange
    const options = { bypassNextJsFiles: false, bypassHeaderRequests: false, bypassWillKnownRoutes: false };

    // Act & Assert
    expect(shouldBypassGetInitialProps('/_next/static/a.js', undefined, options)).toBe(false);
    expect(shouldBypassGetInitialProps('/favicon.ico', undefined, options)).toBe(false);
    expect(shouldBypassGetInitialProps('/.well-known/x', undefined, options)).toBe(false);
  });

  it('bypasses link hover prefetch requests', () => {
    expect(shouldBypassGetInitialProps('/dashboard', { 'next-router-prefetch': '1' })).toBe(true);
    expect(shouldBypassGetInitialProps('/dashboard', { purpose: 'prefetch' })).toBe(true);
  });

  it('runs for browser address bar prefetches of a document', () => {
    const headers = { purpose: 'prefetch', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' };

    expect(shouldBypassGetInitialProps('/dashboard', headers)).toBe(false);
  });
});
