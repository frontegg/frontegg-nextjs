import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createStore: vi.fn(),
  getInstance: vi.fn(),
  initialize: vi.fn(),
  isMiddlewarePath: vi.fn(),
}));

vi.mock('@frontegg/js', () => ({
  AppHolder: { getInstance: mocks.getInstance },
  initialize: mocks.initialize,
}));

vi.mock('@frontegg/redux-store', () => ({
  createStore: mocks.createStore,
}));

vi.mock('../../../../src/api/utils', () => ({
  isMiddlewarePath: mocks.isMiddlewarePath,
}));

import nextjsPkg from 'next/package.json';
import initializeFronteggApp from '../../../../src/utils/initializeFronteggApp';
import sdkVersion from '../../../../src/sdkVersion';
import { CommonUrls } from '../../../../src/utils/common/urls';
import { APP_URL, BASE_URL, baseOptions, lastStoreContext } from './fixtures';

const FAKE_STORE = { id: 'store' };
const onRedirectTo = vi.fn();

const SDK_HEADERS = [
  { key: 'x-frontegg-framework', value: `next@${nextjsPkg.version}` },
  { key: 'x-frontegg-sdk', value: `@frontegg/nextjs@${sdkVersion.version}` },
];

const run = (options = baseOptions(), storeHolder: any = {}, appName?: string) =>
  initializeFronteggApp({ options, onRedirectTo, storeHolder, appName });

const contextFor = (options = baseOptions()) => {
  run(options);
  return lastStoreContext(mocks.createStore);
};

beforeEach(() => {
  mocks.createStore.mockReturnValue(FAKE_STORE);
  mocks.getInstance.mockImplementation(() => {
    throw new Error('app not found');
  });
  mocks.initialize.mockImplementation((opts: any, name: string) => ({ created: true, name, store: opts.store }));
  mocks.isMiddlewarePath.mockReturnValue(false);
});

describe('initializeFronteggApp - store and app lifecycle', () => {
  it('creates a new store and saves it on the storeHolder when none exists', () => {
    // Arrange
    const storeHolder: any = {};
    const options = baseOptions({ previewMode: true, urlStrategy: 'hash' } as any);

    // Act
    run(options, storeHolder);

    // Assert
    expect(mocks.createStore).toHaveBeenCalledTimes(1);
    expect(mocks.createStore).toHaveBeenCalledWith(
      expect.objectContaining({
        storeHolder,
        previewMode: true,
        urlStrategy: 'hash',
        name: 'default',
        builderMode: false,
        initialState: { auth: expect.objectContaining({ onRedirectTo }) },
      })
    );
    expect(storeHolder.store).toBe(FAKE_STORE);
  });

  it('reuses an existing store from the storeHolder', () => {
    // Arrange
    const existingStore = { id: 'existing' };

    // Act
    const app: any = run(baseOptions(), { store: existingStore });

    // Assert
    expect(mocks.createStore).not.toHaveBeenCalled();
    expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({ store: existingStore }), 'default');
    expect(app.store).toBe(existingStore);
  });

  it('returns an existing app instance and attaches the shared store to it', () => {
    // Arrange
    const existingApp: any = { name: 'existing-app' };
    mocks.getInstance.mockReturnValue(existingApp);

    // Act
    const app = run();

    // Assert
    expect(mocks.getInstance).toHaveBeenCalledWith('default');
    expect(mocks.initialize).not.toHaveBeenCalled();
    expect(app).toBe(existingApp);
    expect(existingApp.store).toBe(FAKE_STORE);
  });

  it('initializes a new app with the merged options when no app instance exists', () => {
    // Arrange
    const options = baseOptions({ basename: '/base', customLoginBox: true, hostedLoginBox: true } as any);

    // Act
    const app: any = run(options);

    // Assert
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    const [initOptions, name] = mocks.initialize.mock.calls[0];
    expect(name).toBe('default');
    expect(initOptions).toEqual(
      expect.objectContaining({
        envAppUrl: APP_URL,
        store: FAKE_STORE,
        basename: '/base',
        hostedLoginBox: true,
        customLoginBox: true,
        onRedirectTo,
        contextOptions: lastStoreContext(mocks.createStore),
        authOptions: expect.objectContaining({ hostedLoginBox: true }),
      })
    );
    expect(app.created).toBe(true);
  });

  it('defaults hostedLoginBox and customLoginBox to false when initializing a new app', () => {
    run();

    const [initOptions] = mocks.initialize.mock.calls[0];
    expect(initOptions.hostedLoginBox).toBe(false);
    expect(initOptions.customLoginBox).toBe(false);
  });

  it('uses a custom appName for the store, the app lookup and initialization', () => {
    run(baseOptions(), {}, 'my-app');

    expect(mocks.createStore).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-app' }));
    expect(mocks.getInstance).toHaveBeenCalledWith('my-app');
    expect(mocks.initialize).toHaveBeenCalledWith(expect.anything(), 'my-app');
  });
});

describe('initializeFronteggApp - auth options', () => {
  const authStateFor = (options = baseOptions()) => {
    run(options);
    return mocks.createStore.mock.calls[0][0].initialState.auth;
  };

  it('marks the user as unauthenticated with no user when there is no session', () => {
    const auth = authStateFor();

    expect(auth).toEqual(
      expect.objectContaining({
        isLoading: false,
        isAuthenticated: false,
        hostedLoginBox: false,
        disableSilentRefresh: true,
        user: null,
        tenantsState: { tenants: [], activeTenant: undefined },
      })
    );
  });

  it('builds user data with the session tokens when a session and user exist', () => {
    // Arrange
    const options = baseOptions({
      session: { accessToken: 'access', refreshToken: 'refresh' },
      user: { id: 'user-1', email: 'user@example.com' },
    } as any);

    // Act
    const auth = authStateFor(options);

    // Assert
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('defaults the access token to an empty string and refresh token to undefined without a session', () => {
    const auth = authStateFor(baseOptions({ user: { id: 'user-1' } } as any));

    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user.accessToken).toBe('');
    expect(auth.user.refreshToken).toBeUndefined();
  });

  it('lets authOptions.user override the server-provided user fields', () => {
    const auth = authStateFor(
      baseOptions({
        session: { accessToken: 'access' },
        user: { id: 'user-1', name: 'server' },
        authOptions: { user: { name: 'override' } },
      } as any)
    );

    expect(auth.user.name).toBe('override');
    expect(auth.user.id).toBe('user-1');
  });

  it('builds tenantsState from tenants / activeTenant and lets authOptions.tenantsState override it', () => {
    // Arrange
    const tenants = [{ tenantId: 't1' }, { tenantId: 't2' }];
    const options = baseOptions({
      tenants,
      activeTenant: tenants[0],
      authOptions: { tenantsState: { loading: true } },
    } as any);

    // Act
    const auth = authStateFor(options);

    // Assert
    expect(auth.tenantsState).toEqual({ tenants, activeTenant: tenants[0], loading: true });
  });

  it('keeps other authOptions and respects an explicit disableSilentRefresh=false', () => {
    const auth = authStateFor(
      baseOptions({ authOptions: { disableSilentRefresh: false, keepSessionAlive: true } } as any)
    );

    expect(auth.disableSilentRefresh).toBe(false);
    expect(auth.keepSessionAlive).toBe(true);
  });

  it('passes hostedLoginBox through to the auth state', () => {
    const auth = authStateFor(baseOptions({ hostedLoginBox: true } as any));

    expect(auth.hostedLoginBox).toBe(true);
  });
});

describe('initializeFronteggApp - context options', () => {
  it('sets clientId, appId and includes credentials by default', () => {
    const context = contextFor();

    expect(context.clientId).toBe('client-id');
    expect(context.appId).toBe('app-id');
    expect(context.requestCredentials).toBe('include');
  });

  it('keeps user provided contextOptions such as requestCredentials', () => {
    const context = contextFor(baseOptions({ contextOptions: { requestCredentials: 'same-origin' } } as any));

    expect(context.requestCredentials).toBe('same-origin');
  });

  it('has no tokenResolver when secure JWT is disabled', () => {
    expect(contextFor().tokenResolver).toBeUndefined();
  });

  it('resolves an empty token when secure JWT is enabled', () => {
    const context = contextFor(baseOptions({ secureJwtEnabled: true }));

    expect(context.tokenResolver()).toBe('');
  });

  it('routes regular API paths to the Frontegg base url', () => {
    // Arrange
    const context = contextFor();

    // Act
    const url = context.baseUrl('/identity/resources/users/v2/me');

    // Assert
    expect(mocks.isMiddlewarePath).toHaveBeenCalledWith('/identity/resources/users/v2/me');
    expect(url).toBe(BASE_URL);
  });

  it('routes middleware paths through the app /api proxy', () => {
    mocks.isMiddlewarePath.mockReturnValue(true);
    const context = contextFor();

    expect(context.baseUrl('/identity/resources/auth/v1/user')).toBe(`${APP_URL}/api`);
  });

  it('routes every path through the app /api proxy when secure JWT is enabled', () => {
    const context = contextFor(baseOptions({ secureJwtEnabled: true }));

    expect(context.baseUrl('/identity/resources/users/v2/me')).toBe(`${APP_URL}/api`);
  });
});

describe('initializeFronteggApp - additionalHeadersResolver', () => {
  it('returns only the SDK headers when no resolver is configured', async () => {
    const context = contextFor();

    await expect(context.additionalHeadersResolver()).resolves.toEqual(SDK_HEADERS);
  });

  it('prepends headers returned by a user provided resolver function', async () => {
    // Arrange
    const userHeaders = [{ key: 'x-custom', value: '1' }];
    const resolver = vi.fn(async () => userHeaders);
    const context = contextFor(baseOptions({ contextOptions: { additionalHeadersResolver: resolver } } as any));

    // Act
    const headers = await context.additionalHeadersResolver();

    // Assert
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(headers).toEqual([...userHeaders, ...SDK_HEADERS]);
  });

  it('prepends headers from a user provided static array', async () => {
    const userHeaders = [{ key: 'x-static', value: 'a' }];
    const context = contextFor(baseOptions({ contextOptions: { additionalHeadersResolver: userHeaders } } as any));

    await expect(context.additionalHeadersResolver()).resolves.toEqual([...userHeaders, ...SDK_HEADERS]);
  });

  it('ignores a failing user resolver and still returns the SDK headers', async () => {
    const resolver = vi.fn(async () => {
      throw new Error('boom');
    });
    const context = contextFor(baseOptions({ contextOptions: { additionalHeadersResolver: resolver } } as any));

    await expect(context.additionalHeadersResolver()).resolves.toEqual(SDK_HEADERS);
  });
});

describe('initializeFronteggApp - beforeRequestInterceptor', () => {
  const ORIGIN = window.location.origin;
  const authHeaders = () => ({ authorization: 'Bearer a', Authorization: 'Bearer A', 'x-other': 'keep' });

  it.each([
    ['embedded refresh token', CommonUrls.refreshToken.embedded],
    ['hosted refresh token', CommonUrls.refreshToken.hosted],
    ['activate account', CommonUrls.activateAccount.activate],
    ['logout', CommonUrls.logout],
  ])('strips authorization headers for same-origin %s requests', (_label, path) => {
    // Arrange
    const context = contextFor();
    const url = `${ORIGIN}/api${path}`;

    // Act
    const result = context.beforeRequestInterceptor({ method: 'POST', headers: authHeaders() }, url);

    // Assert
    expect(result.url).toBe(url);
    expect(result.method).toBe('POST');
    expect(result.headers).toEqual({ 'x-other': 'keep' });
  });

  it('keeps authorization headers for same-origin requests to other paths', () => {
    const context = contextFor();
    const url = `${ORIGIN}/api/identity/resources/users/v2/me`;

    const result = context.beforeRequestInterceptor({ headers: authHeaders() }, url);

    expect(result).toEqual({ headers: authHeaders(), url });
  });

  it('leaves cross-origin requests untouched even for excluded paths', () => {
    const context = contextFor();
    const url = `https://other-origin.example.com${CommonUrls.logout}`;

    const result = context.beforeRequestInterceptor({ headers: authHeaders() }, url);

    expect(result).toEqual({ headers: authHeaders(), url });
  });

  it('passes requests without headers through unchanged', () => {
    const context = contextFor();
    const url = `${ORIGIN}${CommonUrls.logout}`;

    const result = context.beforeRequestInterceptor({ method: 'GET' }, url);

    expect(result).toEqual({ method: 'GET', url });
  });

  it('passes requests without a url through unchanged', () => {
    const context = contextFor();

    const result = context.beforeRequestInterceptor({ headers: authHeaders() }, undefined);

    expect(result).toEqual({ headers: authHeaders(), url: undefined });
  });

  it('ignores an unparsable url and returns the request unchanged', () => {
    const context = contextFor();

    const result = context.beforeRequestInterceptor({ headers: authHeaders() }, 'not a url');

    expect(result).toEqual({ headers: authHeaders(), url: 'not a url' });
  });
});
