// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { NextRouter } from 'next/router';
import useOnRedirectTo from '../../../../src/utils/useOnRedirectTo';

/**
 * Server-side (no `window`) behaviour of useOnRedirectTo. The hook is rendered with
 * react-dom/server so its returned callback can be invoked outside a browser.
 */

const createRouter = () =>
  ({
    push: vi.fn(),
    replace: vi.fn(),
  }) as unknown as NextRouter & { push: ReturnType<typeof vi.fn>; replace: ReturnType<typeof vi.fn> };

const renderOnServer = (baseName: string, router: NextRouter) => {
  let onRedirectTo: ReturnType<typeof useOnRedirectTo> | undefined;
  const Harness = () => {
    onRedirectTo = useOnRedirectTo(baseName, router);
    return null;
  };
  renderToString(createElement(Harness));
  if (!onRedirectTo) {
    throw new Error('hook did not render');
  }
  return onRedirectTo;
};

describe('useOnRedirectTo on the server', () => {
  it('pushes a non auth route through the router without touching window', () => {
    // Arrange: guard that this file really runs without a window
    expect(typeof window).toBe('undefined');
    const router = createRouter();
    const onRedirectTo = renderOnServer('/app', router);

    // Act
    onRedirectTo('/app/dashboard');

    // Assert
    expect(router.push).toHaveBeenCalledWith('/dashboard');
  });

  it('replaces a non auth route through the router when opts.replace is true', () => {
    const router = createRouter();
    const onRedirectTo = renderOnServer('', router);

    onRedirectTo('/dashboard', { replace: true });

    expect(router.replace).toHaveBeenCalledWith('/dashboard');
  });

  /**
   * KNOWN BUG (src/utils/useOnRedirectTo/index.ts:20): `typeof window == undefined` compares a
   * string with `undefined` and is always false, so `isSSR` is never true. With `refresh: true`
   * on the server the code reaches `window.Cypress` and throws a ReferenceError instead of
   * falling back to the router. This test describes the intended behaviour and is expected to fail.
   */
  it.fails('falls back to the router when opts.refresh is true on the server', () => {
    const router = createRouter();
    const onRedirectTo = renderOnServer('', router);

    onRedirectTo('/dashboard', { refresh: true });

    expect(router.push).toHaveBeenCalledWith('/dashboard');
  });
});
