import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/config', () => ({ default: { appUrl: 'https://app.example.com' } }));
vi.mock('@frontegg/react-hooks', () => ({ useRootState: vi.fn(), useLoginActions: vi.fn() }));
vi.mock('@frontegg/rest-api', () => ({ ContextHolder: { for: vi.fn() } }));

import { useLoginActions, useRootState } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import { useLogoutHostedLogin } from '../../../src/common/hooks';

const mockedUseRootState = vi.mocked(useRootState);
const mockedUseLoginActions = vi.mocked(useLoginActions);
const mockedContextFor = vi.mocked(ContextHolder.for);

const logout = vi.fn();
const location = { href: 'https://app.example.com/current' };

const givenContextBaseUrl = (baseUrl: unknown) =>
  mockedContextFor.mockReturnValue({ getContext: () => (baseUrl === null ? undefined : { baseUrl }) } as any);

const logoutUrlFor = (baseUrl: string | undefined, redirect: string) =>
  `${baseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(redirect)}`;

beforeEach(() => {
  location.href = 'https://app.example.com/current';
  vi.stubGlobal('window', { location });
  mockedUseRootState.mockReturnValue({ appName: 'my-app' } as any);
  mockedUseLoginActions.mockReturnValue({ logout } as any);
  logout.mockImplementation((callback: () => void) => callback());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLogoutHostedLogin', () => {
  it('logs out and navigates to the hosted logout route returning to the current page', () => {
    givenContextBaseUrl('https://auth.example.com');
    const logoutHostedLogin = useLogoutHostedLogin();

    logoutHostedLogin();

    expect(mockedContextFor).toHaveBeenCalledWith('my-app');
    expect(logout).toHaveBeenCalledWith(expect.any(Function));
    expect(location.href).toBe(logoutUrlFor('https://auth.example.com', 'https://app.example.com/current'));
  });

  it('returns to an explicit redirect url after logout', () => {
    givenContextBaseUrl('https://auth.example.com');

    useLogoutHostedLogin()('https://app.example.com/bye');

    expect(location.href).toBe(logoutUrlFor('https://auth.example.com', 'https://app.example.com/bye'));
  });

  it('resolves a function base url from the rest api context', () => {
    const baseUrlResolver = vi.fn(() => 'https://dynamic.example.com');
    givenContextBaseUrl(baseUrlResolver);

    useLogoutHostedLogin()('https://app.example.com/bye');

    expect(baseUrlResolver).toHaveBeenCalledWith('');
    expect(location.href).toBe(logoutUrlFor('https://dynamic.example.com', 'https://app.example.com/bye'));
  });

  it('navigates only once the logout action completes', () => {
    givenContextBaseUrl('https://auth.example.com');
    logout.mockImplementation(() => undefined);

    useLogoutHostedLogin()();

    expect(location.href).toBe('https://app.example.com/current');
  });
});
