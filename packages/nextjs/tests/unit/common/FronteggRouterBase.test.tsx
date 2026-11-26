import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

vi.mock('../../../src/config', () => ({ default: { authRoutes: {} as Record<string, string> } }));
vi.mock('@frontegg/react-hooks', () => ({ useLoginWithRedirect: vi.fn(), useLoginActions: vi.fn() }));

import config from '../../../src/config';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';
import AppContext from '../../../src/common/AppContext';
import { FronteggRouterBase } from '../../../src/common/FronteggRouterBase';
import { FRONTEGG_AFTER_AUTH_REDIRECT_URL } from '../../../src/utils/common/constants';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const loginWithRedirect = vi.fn();
const requestAuthorize = vi.fn();
const logout = vi.fn();

let container: HTMLDivElement;
let root: Root;

const render = async (props: React.ComponentProps<typeof FronteggRouterBase>, hostedLoginBox?: boolean) => {
  const app = hostedLoginBox === undefined ? null : ({ options: { hostedLoginBox } } as any);
  await act(async () => {
    root.render(
      <AppContext.Provider value={app}>
        <FronteggRouterBase {...props} />
      </AppContext.Provider>
    );
  });
};

beforeEach(() => {
  Object.assign(config, { authRoutes: {} });
  vi.mocked(useLoginWithRedirect).mockReturnValue(loginWithRedirect);
  vi.mocked(useLoginActions).mockReturnValue({ requestAuthorize, logout } as any);
  localStorage.clear();
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('FronteggRouterBase without an app', () => {
  it('does nothing until the frontegg app is available', async () => {
    await render({ pathArr: ['account', 'login'] });

    expect(loginWithRedirect).not.toHaveBeenCalled();
    expect(requestAuthorize).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });
});

describe('FronteggRouterBase with hosted login', () => {
  it('starts the hosted login redirect on the login route', async () => {
    await render({ pathArr: ['account', 'login'] }, true);

    expect(loginWithRedirect).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(FRONTEGG_AFTER_AUTH_REDIRECT_URL)).toBeNull();
  });

  it('remembers where to return after login as a single absolute url', async () => {
    await render({ pathArr: ['account', 'login'], queryParams: { redirectUrl: '/dashboard', tab: '2' } }, true);

    expect(loginWithRedirect).toHaveBeenCalledTimes(1);
    const stored = localStorage.getItem(FRONTEGG_AFTER_AUTH_REDIRECT_URL);
    expect(stored).toBe(`${window.location.origin}/dashboard?tab=2`);
    expect(new URL(stored as string).host).toBe(window.location.host);
  });

  it('logs out on the logout route', async () => {
    await render({ pathArr: ['account', 'logout'] }, true);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(loginWithRedirect).not.toHaveBeenCalled();
  });

  it('honors overridden login routes', async () => {
    Object.assign(config, { authRoutes: { loginUrl: '/signin' } });

    await render({ pathArr: ['signin'] }, true);

    expect(loginWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('ignores other auth routes', async () => {
    await render({ pathArr: ['account', 'sign-up'] }, true);

    expect(loginWithRedirect).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('FronteggRouterBase with embedded login', () => {
  it('requests authorize on the login page of the app directory router', async () => {
    await render({ pathArr: ['account', 'login'], isAppDirEnabled: true }, false);

    expect(requestAuthorize).toHaveBeenCalledWith(true);
  });

  it('does not request authorize on the login page of the pages router', async () => {
    await render({ pathArr: ['account', 'login'] }, false);

    expect(requestAuthorize).not.toHaveBeenCalled();
  });

  it('requests authorize after a saml callback', async () => {
    await render({ pathArr: ['account', 'saml', 'callback'] }, false);

    expect(requestAuthorize).toHaveBeenCalledWith(true);
  });

  it('navigates to the authenticated url instead of requesting authorize on the hosted login callback route', async () => {
    // jsdom reports navigation as "not implemented"; a non-root url makes the assignment a real navigation
    Object.assign(config, { authRoutes: { authenticatedUrl: '/dashboard' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await render({ pathArr: ['oauth', 'callback'], isAppDirEnabled: true }, false);

      expect(requestAuthorize).not.toHaveBeenCalled();
      const errors = consoleError.mock.calls.map(([message]) => String(message));
      expect(errors.some((message) => message.includes('Not implemented: navigation'))).toBe(true);
    } finally {
      consoleError.mockRestore();
    }
  });
});
