import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRouter } from 'next/router';
import type { AuthPageRoutes } from '@frontegg/redux-store';

const { isAuthRouteSpy } = vi.hoisted(() => ({ isAuthRouteSpy: vi.fn() }));

vi.mock('@frontegg/redux-store', async () => {
  const actual = await vi.importActual<typeof import('@frontegg/redux-store')>('@frontegg/redux-store');
  isAuthRouteSpy.mockImplementation(actual.isAuthRoute);
  return { ...actual, isAuthRoute: isAuthRouteSpy };
});

import useOnRedirectTo from '../../../../src/utils/useOnRedirectTo';
import { renderHook } from './renderHook';

type HookProps = { baseName: string; router: NextRouter; routes?: Partial<AuthPageRoutes> };

const createRouter = () =>
  ({
    push: vi.fn(),
    replace: vi.fn(),
  }) as unknown as NextRouter & { push: ReturnType<typeof vi.fn>; replace: ReturnType<typeof vi.fn> };

const renderOnRedirectTo = (props: HookProps) =>
  renderHook(({ baseName, router, routes }: HookProps) => useOnRedirectTo(baseName, router, routes), props);

const INITIAL_PATH = '/current';

beforeEach(() => {
  window.history.replaceState({}, '', `${INITIAL_PATH}?foo=bar`);
});

afterEach(() => {
  delete (window as any).Cypress;
  window.history.replaceState({}, '', '/');
});

describe('useOnRedirectTo', () => {
  it('pushes the path through the router by default', () => {
    // Arrange
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '', router });

    // Act
    result.current('/dashboard');

    // Assert
    expect(router.push).toHaveBeenCalledWith('/dashboard');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('uses router.replace when opts.replace is true', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '', router });

    result.current('/dashboard', { replace: true });

    expect(router.replace).toHaveBeenCalledWith('/dashboard');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('strips the baseName prefix from the redirect path', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '/app', router });

    result.current('/app/dashboard');

    expect(router.push).toHaveBeenCalledWith('/dashboard');
  });

  it('keeps paths that do not start with the baseName untouched', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '/app', router });

    result.current('/other/dashboard');

    expect(router.push).toHaveBeenCalledWith('/other/dashboard');
  });

  it('appends the current query string when opts.preserveQueryParams is true', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '', router });

    result.current('/dashboard', { preserveQueryParams: true });

    expect(router.push).toHaveBeenCalledWith('/dashboard?foo=bar');
  });

  it('appends the current query string automatically for default auth routes', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '', router });

    result.current('/account/login');

    expect(router.push).toHaveBeenCalledWith('/account/login?foo=bar');
  });

  it('checks the auth route after stripping the baseName', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '/app', router });

    result.current('/app/account/login');

    expect(router.push).toHaveBeenCalledWith('/account/login?foo=bar');
  });

  it('does not append the query string for non auth routes', () => {
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '', router });

    result.current('/settings');

    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('treats custom auth routes as auth routes and passes them to isAuthRoute', () => {
    // Arrange
    const router = createRouter();
    const routes = { loginUrl: '/my-login' };
    const { result } = renderOnRedirectTo({ baseName: '', router, routes });

    // Act
    result.current('/my-login');

    // Assert
    expect(isAuthRouteSpy).toHaveBeenCalledWith('/my-login', routes);
    expect(router.push).toHaveBeenCalledWith('/my-login?foo=bar');
  });

  it('picks up new routes after a rerender', () => {
    // Arrange
    const router = createRouter();
    const { result, rerender } = renderOnRedirectTo({ baseName: '', router, routes: { loginUrl: '/first' } });

    // Act
    rerender({ baseName: '', router, routes: { loginUrl: '/second' } });
    result.current('/second');

    // Assert
    expect(router.push).toHaveBeenCalledWith('/second?foo=bar');
  });

  it('uses the latest baseName and router after a rerender', () => {
    // Arrange
    const firstRouter = createRouter();
    const secondRouter = createRouter();
    const { result, rerender } = renderOnRedirectTo({ baseName: '/one', router: firstRouter });

    // Act
    rerender({ baseName: '/two', router: secondRouter });
    result.current('/two/page');

    // Assert
    expect(secondRouter.push).toHaveBeenCalledWith('/page');
    expect(firstRouter.push).not.toHaveBeenCalled();
  });

  it('performs a full page navigation via window.location when opts.refresh is true', () => {
    // Arrange: hash-only navigation is supported by jsdom, so the href change is observable
    const router = createRouter();
    const { result } = renderOnRedirectTo({ baseName: '', router });

    // Act
    result.current(`${INITIAL_PATH}?foo=bar#after-refresh`, { refresh: true });

    // Assert
    expect(window.location.hash).toBe('#after-refresh');
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('uses router.push instead of a full navigation under Cypress when opts.refresh is true', () => {
    const router = createRouter();
    (window as any).Cypress = {};
    const { result } = renderOnRedirectTo({ baseName: '', router });

    result.current('/dashboard', { refresh: true, replace: true });

    expect(router.push).toHaveBeenCalledWith('/dashboard');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
