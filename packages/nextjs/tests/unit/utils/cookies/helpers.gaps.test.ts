import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServerResponse } from 'http';
import { mockConfig, mockFetchRequest, mockIncomingMessage, mockServerResponse } from './fixtures';

const { configState } = vi.hoisted(() => ({ configState: {} as Record<string, unknown> }));

vi.mock('../../../../src/config', () => ({ default: configState }));

import {
  getCookieHeader,
  getIndexedCookieName,
  getRefreshTokenCookieNameVariants,
  getSetCookieHeader,
} from '../../../../src/utils/cookies/helpers';

beforeEach(() => {
  Object.keys(configState).forEach((key) => delete configState[key]);
  Object.assign(configState, mockConfig());
});

describe('getIndexedCookieName', () => {
  it('uses config.cookieName when no name is given', () => {
    expect(getIndexedCookieName(2)).toBe('fe_session-2');
  });

  it('uses the provided cookie name', () => {
    expect(getIndexedCookieName(1, 'custom')).toBe('custom-1');
  });
});

describe('getCookieHeader', () => {
  it('returns the cookie header of an IncomingMessage', () => {
    expect(getCookieHeader(mockIncomingMessage('a=1; b=2'))).toBe('a=1; b=2');
  });

  it('returns the cookie header of a Fetch Request', () => {
    expect(getCookieHeader(mockFetchRequest('a=1'))).toBe('a=1');
  });

  it('returns an empty string when an IncomingMessage has no cookie header', () => {
    expect(getCookieHeader(mockIncomingMessage(''))).toBe('');
  });

  it('returns an empty string when a Fetch Request has no cookie header', () => {
    expect(getCookieHeader(mockFetchRequest(''))).toBe('');
  });
});

describe('getSetCookieHeader', () => {
  it('joins only the name=value part of each set-cookie entry', () => {
    const res = mockServerResponse({ 'set-cookie': ['a=1; Path=/; HttpOnly', 'b=2; Secure'] });

    expect(getSetCookieHeader(res as unknown as ServerResponse)).toBe('a=1;b=2');
  });

  it('handles a single string set-cookie header', () => {
    const res = mockServerResponse({ 'set-cookie': 'a=1; Path=/' });

    expect(getSetCookieHeader(res as unknown as ServerResponse)).toBe('a=1');
  });
});

describe('getRefreshTokenCookieNameVariants', () => {
  it('returns raw, first-dash-stripped and all-dash-stripped clientId variants by default', () => {
    expect(getRefreshTokenCookieNameVariants()).toEqual([
      'fe_refresh_abc-def-ghi',
      'fe_refresh_abcdef-ghi',
      'fe_refresh_abcdefghi',
    ]);
  });

  it('returns appId variants when rewriteCookieByAppId is enabled and appId is set', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: 'app-id-42' });

    expect(getRefreshTokenCookieNameVariants()).toEqual([
      'fe_refresh_app-id-42',
      'fe_refresh_appid-42',
      'fe_refresh_appid42',
    ]);
  });

  it('falls back to clientId variants when rewriteCookieByAppId is enabled without an appId', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: undefined });

    expect(getRefreshTokenCookieNameVariants()[2]).toBe('fe_refresh_abcdefghi');
  });
});
