import { describe, it, expect, vi, beforeEach } from 'vitest';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  authRoutes: {} as Record<string, string>,
}));

vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));
vi.mock('../../../src/utils/cookies', () => ({
  default: { getSessionCookieFromRequest: vi.fn(), getSessionCookieFromRedirectedResponse: vi.fn() },
}));
vi.mock('../../../src/utils/createSession', () => ({ default: vi.fn() }));
vi.mock('../../../src/utils/encryption', () => ({ default: { id: 'node-encryption' } }));
vi.mock('../../../src/utils/refreshAccessTokenIfNeeded/helpers', () => ({ hasSetSessionCookie: vi.fn() }));

import config from '../../../src/config';
import CookieManager from '../../../src/utils/cookies';
import createSession from '../../../src/utils/createSession';
import encryption from '../../../src/utils/encryption';
import { hasSetSessionCookie } from '../../../src/utils/refreshAccessTokenIfNeeded/helpers';
import { getSession, withSSRSession } from '../../../src/pages/helpers';

const mockedFromRequest = vi.mocked(CookieManager.getSessionCookieFromRequest);
const mockedFromResponse = vi.mocked(CookieManager.getSessionCookieFromRedirectedResponse);
const mockedCreateSession = vi.mocked(createSession);
const mockedHasSetSessionCookie = vi.mocked(hasSetSessionCookie);

const SESSION = { accessToken: 'a', user: { sub: 'u' } } as any;

const createRes = (setCookie?: string[]) => ({ getHeader: vi.fn(() => setCookie) }) as any;

const createContext = (resolvedUrl: string | undefined, reqUrl = '/fallback') =>
  ({ req: { url: reqUrl, headers: {} }, res: createRes(), resolvedUrl }) as any;

beforeEach(() => {
  Object.assign(config, { ...CONFIG_BASE, authRoutes: {} });
  mockedHasSetSessionCookie.mockReturnValue(false);
});

describe('getSession', () => {
  it('reads the session cookie from the request', async () => {
    const req = { headers: { cookie: 'fe_session=x' } } as any;
    mockedFromRequest.mockReturnValue('x');
    mockedCreateSession.mockResolvedValue(SESSION);

    const session = await getSession(req, undefined);

    expect(mockedFromRequest).toHaveBeenCalledWith(req);
    expect(mockedCreateSession).toHaveBeenCalledWith('x', encryption);
    expect(session).toBe(SESSION);
  });

  it('reads the session cookie from the request when the response has no new session cookie', async () => {
    const req = { headers: {} } as any;
    const res = createRes(['other=1']);
    mockedFromRequest.mockReturnValue('from-request');
    mockedCreateSession.mockResolvedValue(SESSION);

    const session = await getSession(req, res);

    expect(mockedHasSetSessionCookie).toHaveBeenCalledWith(['other=1']);
    expect(mockedFromResponse).not.toHaveBeenCalled();
    expect(mockedFromRequest).toHaveBeenCalledWith(req);
    expect(mockedCreateSession).toHaveBeenCalledWith('from-request', encryption);
    expect(session).toBe(SESSION);
  });

  it('prefers a session cookie already set on the response by a previous redirect', async () => {
    const res = createRes(['fe_session=fresh']);
    mockedHasSetSessionCookie.mockReturnValue(true);
    mockedFromResponse.mockReturnValue('fresh');

    await getSession({} as any, res);

    expect(mockedFromResponse).toHaveBeenCalledWith(res);
    expect(mockedFromRequest).not.toHaveBeenCalled();
    expect(mockedCreateSession).toHaveBeenCalledWith('fresh', encryption);
  });
});

describe('withSSRSession', () => {
  it('calls the handler with the context and the session when authenticated', async () => {
    mockedCreateSession.mockResolvedValue(SESSION);
    const handler = vi.fn(async () => ({ props: { ok: true } }));
    const context = createContext('/dashboard');

    const result = await withSSRSession(handler)(context);

    expect(handler).toHaveBeenCalledWith(context, SESSION);
    expect(result).toEqual({ props: { ok: true } });
  });

  it('redirects unauthenticated users to the login page with the resolved url', async () => {
    mockedCreateSession.mockResolvedValue(undefined);
    const handler = vi.fn();

    const result: any = await withSSRSession(handler)(createContext('/dashboard'));

    expect(handler).not.toHaveBeenCalled();
    expect(result).toEqual({
      redirect: { permanent: false, destination: '/account/login?redirectUrl=%2Fdashboard' },
      props: {},
    });
  });

  it('keeps the original query string next to the redirect url', async () => {
    mockedCreateSession.mockResolvedValue(undefined);

    const result: any = await withSSRSession(vi.fn())(createContext('/dashboard?tab=2'));

    const destination = new URL(result.redirect.destination, 'https://app.example.com');
    expect(destination.searchParams.get('tab')).toBe('2');
    expect(destination.searchParams.get('redirectUrl')).toBe('/dashboard?tab=2');
  });

  it('uses an overridden login route', async () => {
    Object.assign(config, { authRoutes: { loginUrl: '/signin' } });
    mockedCreateSession.mockResolvedValue(undefined);

    const result: any = await withSSRSession(vi.fn())(createContext('/x'));

    expect(result.redirect.destination).toBe('/signin?redirectUrl=%2Fx');
  });

  it('prefixes an overridden login route that lacks a leading slash', async () => {
    Object.assign(config, { authRoutes: { loginUrl: 'signin' } });
    mockedCreateSession.mockResolvedValue(undefined);

    const result: any = await withSSRSession(vi.fn())(createContext('/x'));

    expect(result.redirect.destination).toBe('/signin?redirectUrl=%2Fx');
  });
});
