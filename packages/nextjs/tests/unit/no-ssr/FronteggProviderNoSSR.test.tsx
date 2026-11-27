import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act, useContext } from 'react';
import { createRoot, Root } from 'react-dom/client';

const contextHolder = vi.hoisted(() => ({ setOnRedirectTo: vi.fn() }));

vi.mock('@frontegg/js', () => ({ AppHolder: { getInstance: vi.fn() }, initialize: vi.fn() }));
vi.mock('@frontegg/react-hooks', () => ({
  FronteggStoreProvider: vi.fn((props: any) => props.children),
}));
vi.mock('@frontegg/rest-api', () => ({ ContextHolder: { for: vi.fn(() => contextHolder) } }));
vi.mock('@frontegg/redux-store', () => ({ createStore: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: vi.fn() }));
vi.mock('../../../src/utils/useOnRedirectTo', () => ({ default: vi.fn() }));
vi.mock('../../../src/no-ssr/ExpireInListener', async () => {
  const react = await import('react');
  return { default: () => react.createElement('i', { 'data-testid': 'expire-in-listener' }) };
});

import { AppHolder, initialize } from '@frontegg/js';
import { FronteggStoreProvider } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import { createStore } from '@frontegg/redux-store';
import { useRouter } from 'next/router';
import useOnRedirectTo from '../../../src/utils/useOnRedirectTo';
import AppContext from '../../../src/common/AppContext';
import NoSSRStoreHolder from '../../../src/no-ssr/NoSSRStoreHolder';
import { FronteggProviderNoSSR } from '../../../src/no-ssr';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockedGetInstance = vi.mocked(AppHolder.getInstance);
const mockedInitialize = vi.mocked(initialize);
const mockedCreateStore = vi.mocked(createStore);

const onRedirectTo = vi.fn();
const router = { basePath: '/base' } as any;
const store = { dispatch: vi.fn() } as any;
let root: Root;
let container: HTMLDivElement;

const render = async (props: Record<string, any>, children: React.ReactNode = null) => {
  await act(async () => {
    root.render(<FronteggProviderNoSSR {...(props as any)}>{children}</FronteggProviderNoSSR>);
  });
};

beforeEach(() => {
  NoSSRStoreHolder.getInstance().store = undefined;
  vi.mocked(useRouter).mockReturnValue(router);
  vi.mocked(useOnRedirectTo).mockReturnValue(onRedirectTo);
  mockedCreateStore.mockReturnValue(store);
  mockedGetInstance.mockImplementation(() => {
    throw new Error('app not initialized');
  });
  mockedInitialize.mockImplementation(((options: any) => ({ store: options.store })) as any);
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('FronteggProviderNoSSR', () => {
  it('creates a shared store and initializes a new frontegg app on first render', async () => {
    const authOptions = { routes: { loginUrl: '/signin' } };
    let contextApp: any;
    const Consumer = () => {
      contextApp = useContext(AppContext);
      return <span>child</span>;
    };

    await render({ authOptions, contextOptions: { baseUrl: 'https://auth.example.com' } }, <Consumer />);

    expect(useOnRedirectTo).toHaveBeenCalledWith('/base', router, authOptions.routes);
    expect(mockedCreateStore).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { requestCredentials: 'include', baseUrl: 'https://auth.example.com' },
        storeHolder: NoSSRStoreHolder.getInstance(),
        name: 'default',
        builderMode: false,
        initialState: { auth: { ...authOptions, onRedirectTo } },
      })
    );
    expect(NoSSRStoreHolder.getInstance().store).toBe(store);
    const [options, appName] = mockedInitialize.mock.calls[0];
    expect(appName).toBe('default');
    expect(options).toMatchObject({
      store,
      hostedLoginBox: false,
      basename: '/base',
      framework: 'nextjs',
      authOptions: { ...authOptions, onRedirectTo },
      contextOptions: { requestCredentials: 'include', baseUrl: 'https://auth.example.com' },
      onRedirectTo,
    });
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'auth/requestAuthorize', payload: true });
    expect(ContextHolder.for).toHaveBeenCalledWith('default');
    expect(contextHolder.setOnRedirectTo).toHaveBeenCalledWith(onRedirectTo);
    expect(contextApp).toEqual({ store });
    expect(vi.mocked(FronteggStoreProvider as any).mock.calls[0][0].app).toBe(contextApp);
    expect(container.textContent).toBe('child');
    expect(container.querySelector('[data-testid="expire-in-listener"]')).not.toBeNull();
  });

  it('reuses an already initialized app and attaches the shared store to it', async () => {
    const existingApp: any = { store: undefined };
    mockedGetInstance.mockReturnValue(existingApp);

    await render({ appName: 'admin' } as any);

    expect(mockedGetInstance).toHaveBeenCalledWith('admin');
    expect(mockedInitialize).not.toHaveBeenCalled();
    expect(existingApp.store).toBe(store);
    expect(mockedCreateStore.mock.calls[0][0]).toMatchObject({ name: 'admin' });
  });

  it('reuses the store kept by the store holder instead of creating a new one', async () => {
    const existingStore = { dispatch: vi.fn() } as any;
    NoSSRStoreHolder.getInstance().store = existingStore;

    await render({});

    expect(mockedCreateStore).not.toHaveBeenCalled();
    expect(mockedInitialize.mock.calls[0][0]).toMatchObject({ store: existingStore });
  });

  it('honors explicit basename and hosted login props', async () => {
    await render({ basename: '/explicit', hostedLoginBox: true });

    expect(useOnRedirectTo).toHaveBeenCalledWith('/explicit', router, undefined);
    expect(mockedInitialize.mock.calls[0][0]).toMatchObject({ basename: '/explicit', hostedLoginBox: true });
  });
});
