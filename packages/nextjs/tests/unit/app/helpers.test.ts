import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('../../../src/utils/cookies', () => ({ default: { parseCookieFromArray: vi.fn() } }));
vi.mock('../../../src/utils/createSession', () => ({ default: vi.fn() }));
vi.mock('../../../src/utils/encryption', () => ({ default: { id: 'node-encryption' } }));

import { cookies, headers } from 'next/headers';
import CookieManager from '../../../src/utils/cookies';
import createSession from '../../../src/utils/createSession';
import encryption from '../../../src/utils/encryption';
import {
  getAppHeaders,
  getAppSession,
  getAppUserSession,
  getAppUserTokens,
  handleOptionalPromiseObject,
} from '../../../src/app/helpers';

const mockedCookies = vi.mocked(cookies);
const mockedHeaders = vi.mocked(headers);
const mockedParseCookies = vi.mocked(CookieManager.parseCookieFromArray);
const mockedCreateSession = vi.mocked(createSession);

const COOKIE_LIST = [{ name: 'fe_session', value: 'sealed' }];
const SESSION = { accessToken: 'a', refreshToken: 'r', user: { sub: 'u' } } as any;

const cookieStore = () => ({ getAll: () => COOKIE_LIST }) as any;

beforeEach(() => {
  mockedCookies.mockReturnValue(cookieStore());
  mockedParseCookies.mockReturnValue('sealed');
});

describe('handleOptionalPromiseObject', () => {
  it('awaits a promise based accessor (next.js 15)', async () => {
    const props = { params: async () => ({ slug: 'a' }) };

    await expect(handleOptionalPromiseObject(props, 'params')).resolves.toEqual({ slug: 'a' });
  });

  it('returns a plain object value (next.js 14 and below)', async () => {
    await expect(handleOptionalPromiseObject({ params: { slug: 'b' } }, 'params')).resolves.toEqual({ slug: 'b' });
  });

  it('returns undefined for a missing key', async () => {
    await expect(handleOptionalPromiseObject({}, 'params')).resolves.toBeUndefined();
  });
});

describe('getAppSession', () => {
  it('creates the session from the synchronous cookie store', async () => {
    // Arrange
    mockedCreateSession.mockResolvedValue(SESSION);

    // Act
    const session = await getAppSession();

    // Assert
    expect(mockedParseCookies).toHaveBeenCalledWith(COOKIE_LIST);
    expect(mockedCreateSession).toHaveBeenCalledWith('sealed', encryption);
    expect(session).toBe(SESSION);
  });

  it('awaits a promise based cookie store (next.js 15)', async () => {
    mockedCookies.mockReturnValue(Promise.resolve(cookieStore()) as any);
    mockedCreateSession.mockResolvedValue(SESSION);

    await expect(getAppSession()).resolves.toBe(SESSION);
    expect(mockedParseCookies).toHaveBeenCalledWith(COOKIE_LIST);
  });
});

describe('getAppHeaders', () => {
  it('converts synchronous request headers to a plain record', async () => {
    mockedHeaders.mockReturnValue(new Headers({ host: 'app.example.com', 'x-a': '1' }) as any);

    await expect(getAppHeaders()).resolves.toEqual({ host: 'app.example.com', 'x-a': '1' });
  });

  it('awaits promise based request headers (next.js 15)', async () => {
    mockedHeaders.mockReturnValue(Promise.resolve(new Headers({ host: 'h' })) as any);

    await expect(getAppHeaders()).resolves.toEqual({ host: 'h' });
  });
});

describe('getAppUserSession', () => {
  it('returns the user of the session', async () => {
    mockedCreateSession.mockResolvedValue(SESSION);

    await expect(getAppUserSession()).resolves.toEqual({ sub: 'u' });
  });

  it('returns undefined without a session', async () => {
    mockedCreateSession.mockResolvedValue(undefined);

    await expect(getAppUserSession()).resolves.toBeUndefined();
  });
});

describe('getAppUserTokens', () => {
  it('returns only the access and refresh tokens of the session', async () => {
    mockedCreateSession.mockResolvedValue(SESSION);

    await expect(getAppUserTokens()).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  it('returns undefined without a session', async () => {
    mockedCreateSession.mockResolvedValue(undefined);

    await expect(getAppUserTokens()).resolves.toBeUndefined();
  });
});
