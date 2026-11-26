import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

const APP_ENV_CONFIG = vi.hoisted(() => ({
  envAppUrl: 'https://app.example.com',
  envBaseUrl: 'https://auth.example.com',
  envClientId: 'client-id',
  envHostedLoginBox: undefined as boolean | undefined,
}));
const logger = vi.hoisted(() => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('../../../src/utils/fronteggLogger', () => ({ default: { child: () => logger } }));
vi.mock('../../../src/config', () => ({
  default: {
    appEnvConfig: { ...APP_ENV_CONFIG },
    authRoutes: {},
    isHostedLogin: false,
    appUrl: 'https://app.example.com',
  },
}));
vi.mock('../../../src/common/FronteggBaseProvider', () => ({
  FronteggBaseProvider: vi.fn((props: any) => props.children),
}));
vi.mock('../../../src/common/FronteggRouterBase', () => ({ FronteggRouterBase: vi.fn(() => null) }));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })), notFound: vi.fn() }));
vi.mock('../../../src/utils/fetchUserData', () => ({ default: vi.fn() }));
vi.mock('../../../src/app/helpers', () => ({ getAppHeaders: vi.fn(), getAppSession: vi.fn() }));
vi.mock('../../../src/app/getAppUrlForCustomLoginWithSubdomain', () => ({
  getAppUrlForCustomLoginWithSubdomain: vi.fn(),
}));

import config from '../../../src/config';
import { FronteggBaseProvider } from '../../../src/common/FronteggBaseProvider';
import { FronteggRouterBase } from '../../../src/common/FronteggRouterBase';
import { notFound, useRouter } from 'next/navigation';
import fetchUserData from '../../../src/utils/fetchUserData';
import { getAppHeaders, getAppSession } from '../../../src/app/helpers';
import { getAppUrlForCustomLoginWithSubdomain } from '../../../src/app/getAppUrlForCustomLoginWithSubdomain';
import { ClientFronteggProvider } from '../../../src/app/ClientFronteggProvider';
import { FronteggAppProvider, FronteggAppRouter } from '../../../src/app';

const mockedBaseProvider = vi.mocked(FronteggBaseProvider);
const mockedNotFound = vi.mocked(notFound);
const mockedFetchUserData = vi.mocked(fetchUserData);
const mockedSubdomainAppUrl = vi.mocked(getAppUrlForCustomLoginWithSubdomain);

const jwt = (payload: string) => `h.${payload}.s`;

beforeEach(() => {
  Object.assign(config, { appEnvConfig: { ...APP_ENV_CONFIG }, authRoutes: {}, isHostedLogin: false });
  mockedBaseProvider.mockImplementation((props: any) => props.children);
  mockedSubdomainAppUrl.mockResolvedValue(undefined);
  mockedFetchUserData.mockResolvedValue({} as any);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('ClientFronteggProvider', () => {
  it('wires the next router, the env base path and a tenant resolver into the base provider', () => {
    // Arrange
    vi.stubEnv('__NEXT_ROUTER_BASEPATH', '/base');
    vi.stubGlobal('window', { location: { hostname: 'acme.example.com', search: '' } });

    // Act
    const html = renderToString(
      <ClientFronteggProvider
        {...({ envAppUrl: 'https://app.example.com', contextOptions: { requestCredentials: 'include' } } as any)}
        customLoginOptions={{ subDomainIndex: 0 }}
      >
        <b>child</b>
      </ClientFronteggProvider>
    );

    // Assert
    expect(html).toBe('<b>child</b>');
    const props = mockedBaseProvider.mock.calls[0][0] as any;
    expect(props.router).toBe(vi.mocked(useRouter).mock.results[0].value);
    expect(props.basename).toBe('/base');
    expect(props.envAppUrl).toBe('https://app.example.com');
    expect(props.contextOptions.requestCredentials).toBe('include');
    expect(props.contextOptions.tenantResolver()).toEqual({ tenant: 'acme' });
  });

  it('prefers an explicit basename and omits the tenant resolver without custom login', () => {
    renderToString(<ClientFronteggProvider {...({ basename: '/custom' } as any)} />);

    const props = mockedBaseProvider.mock.calls[0][0] as any;
    expect(props.basename).toBe('/custom');
    expect(props.contextOptions).toEqual({ tenantResolver: undefined });
  });

  it('defaults the basename to an empty string', () => {
    renderToString(<ClientFronteggProvider {...({} as any)} />);

    expect((mockedBaseProvider.mock.calls[0][0] as any).basename).toBe('');
  });
});

describe('FronteggAppProvider', () => {
  it('builds client provider props from env config, user data and options', async () => {
    // Arrange
    const userData = { user: { id: 'u' }, tenants: [], session: { accessToken: 'a' } };
    mockedFetchUserData.mockResolvedValue(userData as any);

    // Act
    const element: any = await FronteggAppProvider({ customLoginOptions: { subDomainIndex: 1 } } as any);

    // Assert
    expect(element.type).toBe(ClientFronteggProvider);
    expect(mockedFetchUserData).toHaveBeenCalledWith({ getSession: getAppSession, getHeaders: getAppHeaders });
    expect(mockedSubdomainAppUrl).toHaveBeenCalledWith(1);
    expect(element.props).toEqual({
      envBaseUrl: 'https://auth.example.com',
      envClientId: 'client-id',
      envHostedLoginBox: undefined,
      ...userData,
      customLoginOptions: { subDomainIndex: 1 },
      shouldRequestAuthorize: true,
      envAppUrl: 'https://app.example.com',
      secureJwtEnabled: false,
      hostedLoginBox: false,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses the tenant application url resolved from the subdomain', async () => {
    mockedSubdomainAppUrl.mockResolvedValue('https://acme.example.com');

    const element: any = await FronteggAppProvider({} as any);

    expect(element.props.envAppUrl).toBe('https://acme.example.com');
  });

  it('prefers the hosted login env variable over the deprecated prop and warns about the prop', async () => {
    Object.assign(config, { appEnvConfig: { ...APP_ENV_CONFIG, envHostedLoginBox: true } });

    const element: any = await FronteggAppProvider({ hostedLoginBox: false } as any);

    expect(element.props.hostedLoginBox).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("'hostedLoginBox' prop is deprecated"));
  });

  it('falls back to the deprecated hosted login prop when the env variable is unset', async () => {
    const element: any = await FronteggAppProvider({ hostedLoginBox: true, secureJwtEnabled: true } as any);

    expect(element.props.hostedLoginBox).toBe(true);
    expect(element.props.secureJwtEnabled).toBe(true);
  });

  it('redacts token signatures when secure jwt is enabled', async () => {
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedFetchUserData.mockResolvedValue({ session: { accessToken: jwt('p'), refreshToken: 'r' }, user: {} } as any);

    const element: any = await FronteggAppProvider({} as any);

    expect(element.props.session).toEqual({ accessToken: 'REDACTED_FOR_SECURITY.p.REDACTED_FOR_SECURITY' });
  });
});

describe('FronteggAppRouter', () => {
  it('renders the router base for auth routes with sync props', () => {
    // Act
    const element: any = FronteggAppRouter({
      params: { 'frontegg-router': ['account', 'login'] },
      searchParams: { redirectUrl: '/x' },
    });

    // Assert
    expect(element.type).toBe(FronteggRouterBase);
    expect(element.props).toEqual({
      pathArr: ['account', 'login'],
      queryParams: { redirectUrl: '/x' },
      isAppDirEnabled: true,
    });
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it('renders the router base for auth routes with promise props (next.js 15)', async () => {
    const element: any = await FronteggAppRouter({
      params: Promise.resolve({ 'frontegg-router': ['account', 'logout'] }),
      searchParams: Promise.resolve({}),
    });

    expect(element.props.pathArr).toEqual(['account', 'logout']);
  });

  it('calls notFound for routes that are not auth routes', () => {
    const element = FronteggAppRouter({ params: { 'frontegg-router': ['dashboard'] } });

    expect(element).toBeNull();
    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });

  it('calls notFound for promise props without router segments', async () => {
    const element = await FronteggAppRouter({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });

    expect(element).toBeNull();
    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });

  it('resolves next data requests from the first search param', () => {
    const element: any = FronteggAppRouter({
      params: { 'frontegg-router': ['_next', 'data', 'id.json'] },
      searchParams: { route: ['account', 'login'] },
    });

    // the resolved route only gates the auth route check; the router base still receives the raw segments
    expect(element.type).toBe(FronteggRouterBase);
    expect(element.props).toEqual({
      pathArr: ['_next', 'data', 'id.json'],
      queryParams: { route: ['account', 'login'] },
      isAppDirEnabled: true,
    });
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it('resolves next data requests from a single search param value', () => {
    const element = FronteggAppRouter({
      params: { 'frontegg-router': ['_next', 'data', 'id.json'] },
      searchParams: { route: 'dashboard' },
    });

    expect(element).toBeNull();
    expect(mockedNotFound).toHaveBeenCalled();
  });

  it('calls notFound for next data requests without search params', () => {
    const element = FronteggAppRouter({ params: { 'frontegg-router': ['_next', 'data', 'id.json'] } });

    expect(element).toBeNull();
    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});
