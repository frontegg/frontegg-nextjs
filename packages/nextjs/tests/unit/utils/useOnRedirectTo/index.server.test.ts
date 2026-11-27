// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { NextRouter } from 'next/router';
import useOnRedirectTo from '../../../../src/utils/useOnRedirectTo';

/** useOnRedirectTo without `window`, rendered with react-dom/server. */

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
    // guard that this file really runs without a window
    expect(typeof window).toBe('undefined');
    const router = createRouter();
    const onRedirectTo = renderOnServer('/app', router);

    onRedirectTo('/app/dashboard');

    expect(router.push).toHaveBeenCalledWith('/dashboard');
  });

  it('replaces a non auth route through the router when opts.replace is true', () => {
    const router = createRouter();
    const onRedirectTo = renderOnServer('', router);

    onRedirectTo('/dashboard', { replace: true });

    expect(router.replace).toHaveBeenCalledWith('/dashboard');
  });

  /** Known bug (src/utils/useOnRedirectTo/index.ts:20): `typeof window == undefined` is always false, so this throws. */
  it.fails('falls back to the router when opts.refresh is true on the server', () => {
    const router = createRouter();
    const onRedirectTo = renderOnServer('', router);

    onRedirectTo('/dashboard', { refresh: true });

    expect(router.push).toHaveBeenCalledWith('/dashboard');
  });
});
