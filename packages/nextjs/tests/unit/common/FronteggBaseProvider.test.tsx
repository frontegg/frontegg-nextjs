import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act, useContext } from 'react';
import { createRoot, Root } from 'react-dom/client';

const hooks = vi.hoisted(() => ({
  requestAuthorize: vi.fn(),
  setAuthState: vi.fn(),
  store: { auth: { silentRefreshing: false } },
}));
const contextHolder = vi.hoisted(() => ({ setOnRedirectTo: vi.fn(), setAccessToken: vi.fn(), setUser: vi.fn() }));

vi.mock('@frontegg/react-hooks', async () => {
  const react = await import('react');
  return {
    FronteggStoreProvider: vi.fn((props: any) =>
      react.createElement(react.Fragment, null, props.alwaysVisibleChildren, props.children)
    ),
    CustomComponentRegister: vi.fn(() => null),
    useAuthActions: () => ({ requestAuthorize: hooks.requestAuthorize, setAuthState: hooks.setAuthState }),
    useStore: () => ({ store: hooks.store }),
  };
});
vi.mock('@frontegg/rest-api', () => ({ ContextHolder: { for: vi.fn(() => contextHolder) } }));
vi.mock('../../../src/utils/initializeFronteggApp', () => ({ default: vi.fn() }));
vi.mock('../../../src/utils/useOnRedirectTo', () => ({ default: vi.fn() }));
vi.mock('../../../src/config', () => ({ default: { fronteggAppOptions: {} } }));

import { CustomComponentRegister, FronteggStoreProvider } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import initializeFronteggApp from '../../../src/utils/initializeFronteggApp';
import useOnRedirectTo from '../../../src/utils/useOnRedirectTo';
import config from '../../../src/config';
import AppContext from '../../../src/common/AppContext';
import { FronteggBaseProvider } from '../../../src/common/FronteggBaseProvider';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockedInitialize = vi.mocked(initializeFronteggApp);
const mockedUseOnRedirectTo = vi.mocked(useOnRedirectTo);
const mockedStoreProvider = vi.mocked(FronteggStoreProvider as any);

const onRedirectTo = vi.fn();
const router = { push: vi.fn() } as any;
let app: any;
let root: Root;
let container: HTMLDivElement;

const render = async (props: Record<string, any>, children: React.ReactNode = null) => {
  await act(async () => {
    root.render(
      <FronteggBaseProvider router={router} {...(props as any)}>
        {children}
      </FronteggBaseProvider>
    );
  });
};

beforeEach(() => {
  app = { store: { dispatch: vi.fn() } };
  mockedInitialize.mockReturnValue(app);
  mockedUseOnRedirectTo.mockReturnValue(onRedirectTo);
  hooks.store.auth.silentRefreshing = false;
  hooks.requestAuthorize.mockResolvedValue(undefined);
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('FronteggBaseProvider setup', () => {
  it('initializes the frontegg app and exposes it to children through AppContext', async () => {
    const props = { envAppUrl: 'https://app.example.com', authOptions: { routes: { loginUrl: '/signin' } } };
    let contextApp: unknown;
    const Consumer = () => {
      contextApp = useContext(AppContext);
      return <span>child</span>;
    };

    await render(props, <Consumer />);

    expect(config.fronteggAppOptions).toMatchObject(props);
    expect(mockedUseOnRedirectTo).toHaveBeenCalledWith('', router, { loginUrl: '/signin' });
    expect(mockedInitialize).toHaveBeenCalledWith({
      options: expect.objectContaining({ ...props, basename: '', framework: 'nextjs' }),
      onRedirectTo,
      appName: 'default',
      storeHolder: {},
    });
    expect(ContextHolder.for).toHaveBeenCalledWith('default');
    expect(contextHolder.setOnRedirectTo).toHaveBeenCalledWith(onRedirectTo);
    expect(contextApp).toBe(app);
    expect(container.textContent).toBe('child');
    expect(mockedStoreProvider.mock.calls[0][0].app).toBe(app);
  });

  it('uses the given app name and basename', async () => {
    await render({ appName: 'admin', basename: '/portal' });

    expect(mockedUseOnRedirectTo).toHaveBeenCalledWith('/portal', router, undefined);
    expect(mockedInitialize.mock.calls[0][0]).toMatchObject({ appName: 'admin', options: { basename: '/portal' } });
    expect(ContextHolder.for).toHaveBeenCalledWith('admin');
  });

  it('registers custom components and always visible children on the client', async () => {
    await render({ themeOptions: { palette: {} }, alwaysVisibleChildren: <em>always</em> });

    expect(vi.mocked(CustomComponentRegister as any).mock.calls[0][0]).toEqual({ app, themeOptions: { palette: {} } });
    expect(container.innerHTML).toContain('<em>always</em>');
  });
});

describe('FronteggBaseProvider server session hydration', () => {
  it('hydrates tokens, user and store from the server session', async () => {
    const session = { accessToken: 'access', refreshToken: 'refresh' };
    const user = { id: 'u' };
    const tenants = [{ id: 't' }];

    await render({ shouldRequestAuthorize: true, isSSG: false, session, user, tenants });

    expect(contextHolder.setAccessToken).toHaveBeenCalledWith('access');
    expect(contextHolder.setUser).toHaveBeenCalledWith(user);
    expect(app.store.dispatch).toHaveBeenCalledWith({
      type: 'auth/requestAuthorizeSSR',
      payload: {
        accessToken: 'access',
        user: { id: 'u', accessToken: 'access', refreshToken: 'refresh' },
        tenants,
      },
    });
  });

  it('hydrates an anonymous visitor without touching tokens', async () => {
    await render({ shouldRequestAuthorize: true });

    expect(contextHolder.setAccessToken).not.toHaveBeenCalled();
    expect(contextHolder.setUser).not.toHaveBeenCalled();
    expect(app.store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/requestAuthorizeSSR', payload: expect.objectContaining({ user: null }) })
    );
  });

  it('skips server hydration for static pages', async () => {
    await render({ shouldRequestAuthorize: true, isSSG: true, session: { accessToken: 'a' } });

    expect(contextHolder.setAccessToken).not.toHaveBeenCalled();
    expect(app.store.dispatch).not.toHaveBeenCalled();
  });
});

describe('FronteggBaseProvider static page authorization', () => {
  it('silently requests authorize once for static pages', async () => {
    await render({ shouldRequestAuthorize: true, isSSG: true });

    expect(hooks.setAuthState).toHaveBeenNthCalledWith(1, { silentRefreshing: true });
    expect(hooks.requestAuthorize).toHaveBeenCalledTimes(1);
    expect(hooks.setAuthState).toHaveBeenLastCalledWith({ silentRefreshing: false });
  });

  it('does not request authorize again while a silent refresh is running', async () => {
    hooks.store.auth.silentRefreshing = true;

    await render({ shouldRequestAuthorize: true, isSSG: true });

    expect(hooks.requestAuthorize).not.toHaveBeenCalled();
    expect(hooks.setAuthState).toHaveBeenCalledWith({ silentRefreshing: false });
  });

  it('only clears the silent refresh flag for server rendered pages', async () => {
    await render({ shouldRequestAuthorize: true, isSSG: false });

    expect(hooks.requestAuthorize).not.toHaveBeenCalled();
    expect(hooks.setAuthState).toHaveBeenCalledWith({ silentRefreshing: false });
  });
});
