import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

const APP_ENV_CONFIG = vi.hoisted(() => ({
  envAppUrl: 'https://app.example.com',
  envBaseUrl: 'https://auth.example.com',
  envClientId: 'client-id',
}));

vi.mock('../../../src/config', () => ({
  default: { appEnvConfig: APP_ENV_CONFIG, checkHostedLoginConfig: vi.fn(), appUrl: 'https://app.example.com' },
}));
vi.mock('../../../src/pages/FronteggPagesProvider', () => ({
  default: vi.fn((props: any) => props.children),
}));
vi.mock('../../../src/utils/refreshAccessTokenIfNeeded', () => ({
  default: vi.fn(),
  isRuntimeNextRequest: (url: string) => url.startsWith('/_next/'),
}));
vi.mock('../../../src/utils/fetchUserData', () => ({ default: vi.fn() }));
vi.mock('../../../src/pages/withFronteggApp/shouldBypassGetInitialProps', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { shouldBypassGetInitialProps: vi.fn(actual.shouldBypassGetInitialProps) };
});

import config from '../../../src/config';
import FronteggPagesProvider from '../../../src/pages/FronteggPagesProvider';
import refreshAccessTokenIfNeeded from '../../../src/utils/refreshAccessTokenIfNeeded';
import fetchUserData from '../../../src/utils/fetchUserData';
import { shouldBypassGetInitialProps } from '../../../src/pages/withFronteggApp/shouldBypassGetInitialProps';
import { withFronteggApp } from '../../../src/pages';

const mockedProvider = vi.mocked(FronteggPagesProvider);
const mockedRefresh = vi.mocked(refreshAccessTokenIfNeeded);
const mockedFetchUserData = vi.mocked(fetchUserData);
const mockedShouldBypass = vi.mocked(shouldBypassGetInitialProps);
const mockedCheckHostedLoginConfig = vi.mocked(config.checkHostedLoginConfig);

const jwt = (payload: string) => `h.${payload}.s`;

const createApp = (originalGetInitialProps?: (ctx: any) => Promise<any>) => {
  const app: any = vi.fn((props: any) => <span>{props.pageProps.title}</span>);
  app.getInitialProps = originalGetInitialProps;
  return app;
};

const createAppContext = ({
  req = { url: '/dashboard', headers: { cookie: 'c' } } as any,
  isReady = true,
  isPreview = false,
  componentGetInitialProps = undefined as undefined | ((ctx: any) => Promise<any>),
} = {}) => ({
  ctx: { req },
  router: { isReady, isPreview },
  Component: { getInitialProps: componentGetInitialProps },
});

const getInitialProps = async (app: any, appContext: any, options?: any) => {
  const wrapped: any = withFronteggApp(app, options);
  return wrapped.getInitialProps(appContext);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withFronteggApp getInitialProps bypass', () => {
  it('only runs the original initial props for bypassed urls', async () => {
    const app = createApp(async () => ({ fromApp: 1 }));
    const appContext = createAppContext({
      req: { url: '/favicon.ico', headers: {} },
      componentGetInitialProps: async () => ({ fromPage: 2 }),
    });

    const result = await getInitialProps(app, appContext);

    expect(result).toEqual({ pageProps: { fromApp: 1, fromPage: 2 } });
    expect(mockedFetchUserData).not.toHaveBeenCalled();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it('returns empty page props for bypassed urls without original initial props', async () => {
    const result = await getInitialProps(createApp(), createAppContext({ req: { url: '/_next/static/a.js' } }));

    expect(result).toEqual({ pageProps: {} });
  });

  it('validates the hosted login options even for bypassed urls', async () => {
    const options = { hostedLoginBox: true };

    await getInitialProps(createApp(), createAppContext({ req: { url: '/favicon.ico' } }), options);

    expect(mockedCheckHostedLoginConfig).toHaveBeenCalledWith(options);
  });
});

describe('withFronteggApp getInitialProps on the client', () => {
  it('does not fetch user data or request authorize without a server request', async () => {
    const appContext: any = { ...createAppContext(), ctx: {} };

    const result = await getInitialProps(createApp(), appContext);

    expect(mockedShouldBypass).toHaveBeenCalledWith('/', undefined);
    expect(result).toEqual({ pageProps: { shouldRequestAuthorize: false } });
    expect(appContext).toMatchObject({ session: null, user: null, tenants: null });
    expect(mockedFetchUserData).not.toHaveBeenCalled();
  });
});

describe('withFronteggApp getInitialProps on the server', () => {
  it('requests authorize on the client for static generation without fetching user data', async () => {
    const result = await getInitialProps(createApp(), createAppContext({ isReady: false, isPreview: false }));

    expect(result).toEqual({ pageProps: { ...APP_ENV_CONFIG, shouldRequestAuthorize: true } });
    expect(mockedFetchUserData).not.toHaveBeenCalled();
  });

  it('fetches user data and exposes it to the app, the page and page props', async () => {
    const userData = { session: { accessToken: 'a' }, user: { id: 'u' }, tenants: [{ id: 't' }] };
    mockedFetchUserData.mockResolvedValue(userData as any);
    const originalGetInitialProps = vi.fn(async (ctx: any) => ({ appSawUser: ctx.user.id }));
    const appContext: any = createAppContext({ componentGetInitialProps: async () => ({ page: true }) });

    const result = await getInitialProps(createApp(originalGetInitialProps), appContext);

    expect(appContext.user).toEqual({ id: 'u' });
    expect(result.pageProps).toEqual({
      appSawUser: 'u',
      page: true,
      ...userData,
      ...APP_ENV_CONFIG,
      shouldRequestAuthorize: true,
    });
  });

  it('resolves the session and request headers lazily for fetchUserData', async () => {
    mockedFetchUserData.mockResolvedValue(undefined as any);
    mockedRefresh.mockResolvedValue({ accessToken: 'a' } as any);
    const appContext = createAppContext();

    await getInitialProps(createApp(), appContext);
    const { getSession, getHeaders } = mockedFetchUserData.mock.calls[0][0];

    await expect(getSession()).resolves.toEqual({ accessToken: 'a' });
    expect(mockedRefresh).toHaveBeenCalledWith(appContext.ctx);
    await expect(getHeaders()).resolves.toEqual({ cookie: 'c' });
  });

  it('falls back to empty headers when the request has none', async () => {
    mockedFetchUserData.mockResolvedValue(undefined as any);

    await getInitialProps(createApp(), createAppContext({ req: { url: '/dashboard' } }));

    await expect(mockedFetchUserData.mock.calls[0][0].getHeaders()).resolves.toEqual({});
  });

  it('omits session data from page props when the user is not logged in', async () => {
    mockedFetchUserData.mockResolvedValue(undefined as any);

    const result = await getInitialProps(createApp(), createAppContext());

    expect(result.pageProps).toEqual({ ...APP_ENV_CONFIG, shouldRequestAuthorize: true });
  });

  it('redacts token signatures from user data when secure jwt is enabled', async () => {
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedFetchUserData.mockResolvedValue({
      session: { accessToken: jwt('s'), refreshToken: 'r' },
      user: { id: 'u' },
      tenants: [],
    } as any);

    const result = await getInitialProps(createApp(), createAppContext());

    expect(result.pageProps.session).toEqual({ accessToken: 'REDACTED_FOR_SECURITY.s.REDACTED_FOR_SECURITY' });
    expect(result.pageProps.user).toEqual({ id: 'u' });
  });

  it('resolves only the session for runtime next.js requests that are not bypassed', async () => {
    // shouldBypassGetInitialProps bypasses every /_next/ url, so the runtime branch is only reachable in isolation
    mockedShouldBypass.mockReturnValueOnce(false);
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedRefresh.mockResolvedValue({ accessToken: jwt('rt'), refreshToken: 'r' } as any);
    const appContext = createAppContext({ req: { url: '/_next/data/build/page.json', headers: {} } });

    const result = await getInitialProps(createApp(), appContext);

    expect(mockedFetchUserData).not.toHaveBeenCalled();
    expect(result.pageProps).toEqual({
      session: { accessToken: 'REDACTED_FOR_SECURITY.rt.REDACTED_FOR_SECURITY' },
      user: null,
      tenants: null,
      ...APP_ENV_CONFIG,
      shouldRequestAuthorize: false,
    });
  });

  it('keeps the raw session for runtime next.js requests without secure jwt', async () => {
    mockedShouldBypass.mockReturnValueOnce(false);
    mockedRefresh.mockResolvedValue({ accessToken: 'raw' } as any);

    const result = await getInitialProps(createApp(), createAppContext({ req: { url: '/_next/data/x.json' } }));

    expect(result.pageProps.session).toEqual({ accessToken: 'raw' });
  });
});

describe('withFronteggApp rendered app', () => {
  beforeEach(() => {
    mockedProvider.mockImplementation((props: any) => props.children);
  });

  it('wraps the app with the pages provider fed from page props and options', () => {
    const app = createApp();
    const Wrapped: any = withFronteggApp(app, { contextOptions: { tenantResolver: undefined } } as any);
    const pageProps = {
      title: 'Hello',
      user: { id: 'u' },
      tenants: [],
      activeTenant: { id: 't' },
      session: { accessToken: 'a' },
      envAppUrl: 'https://app.example.com',
      envBaseUrl: 'https://auth.example.com',
      envClientId: 'client-id',
      envAppId: 'app-id',
      secureJwtEnabled: true,
      envHostedLoginBox: true,
      shouldRequestAuthorize: true,
    };

    const html = renderToString(<Wrapped pageProps={pageProps} __N_SSG />);

    expect(html).toBe('<span>Hello</span>');
    expect(Wrapped.getInitialProps).toBe(app.getInitialProps);
    const { children, ...providerProps } = mockedProvider.mock.calls[0][0] as any;
    expect(providerProps).toEqual({
      contextOptions: { tenantResolver: undefined },
      hostedLoginBox: true,
      user: { id: 'u' },
      tenants: [],
      activeTenant: { id: 't' },
      session: { accessToken: 'a' },
      envAppUrl: 'https://app.example.com',
      envBaseUrl: 'https://auth.example.com',
      envHostedLoginBox: true,
      secureJwtEnabled: true,
      shouldRequestAuthorize: true,
      isSSG: true,
      envClientId: 'client-id',
      envAppId: 'app-id',
    });
  });
});
