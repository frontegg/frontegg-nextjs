// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createStore: vi.fn(),
  initialize: vi.fn(),
}));

vi.mock('@frontegg/js', () => ({
  AppHolder: {
    getInstance: () => {
      throw new Error('app not found');
    },
  },
  initialize: mocks.initialize,
}));

vi.mock('@frontegg/redux-store', () => ({
  createStore: mocks.createStore,
}));

vi.mock('../../../../src/api/utils', () => ({
  isMiddlewarePath: () => false,
}));

import initializeFronteggApp from '../../../../src/utils/initializeFronteggApp';
import { CommonUrls } from '../../../../src/utils/common/urls';
import { baseOptions, lastStoreContext } from './fixtures';

/** Without `window` the interceptor can't compare origins, so the excluded-path rule applies to every absolute URL. */
describe('initializeFronteggApp beforeRequestInterceptor on the server', () => {
  beforeEach(() => {
    mocks.createStore.mockReturnValue({});
    initializeFronteggApp({ options: baseOptions(), onRedirectTo: vi.fn(), storeHolder: {} });
  });

  it('strips authorization headers for excluded paths on any origin', () => {
    // guard that this file really runs without a window (otherwise the origin check applies)
    expect(typeof window).toBe('undefined');
    const context = lastStoreContext(mocks.createStore);
    const url = `https://any-origin.example.com${CommonUrls.refreshToken.hosted}`;

    const result = context.beforeRequestInterceptor({ headers: { authorization: 'Bearer a', other: 'x' } }, url);

    expect(result).toEqual({ headers: { other: 'x' }, url });
  });

  it('keeps authorization headers for non excluded paths', () => {
    const context = lastStoreContext(mocks.createStore);
    const url = 'https://any-origin.example.com/identity/resources/users/v2/me';

    const result = context.beforeRequestInterceptor({ headers: { authorization: 'Bearer a' } }, url);

    expect(result).toEqual({ headers: { authorization: 'Bearer a' }, url });
  });
});
