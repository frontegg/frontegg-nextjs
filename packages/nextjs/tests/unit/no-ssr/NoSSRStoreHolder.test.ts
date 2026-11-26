import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadHolder = async () => (await import('../../../src/no-ssr/NoSSRStoreHolder')).default;

beforeEach(() => {
  vi.resetModules();
});

describe('NoSSRStoreHolder', () => {
  it('starts without a store', async () => {
    const NoSSRStoreHolder = await loadHolder();

    expect(NoSSRStoreHolder.getInstance().store).toBeUndefined();
  });

  it('returns the same holder on every call so the store is shared across renders', async () => {
    const NoSSRStoreHolder = await loadHolder();
    const store = { getState: vi.fn() } as any;

    NoSSRStoreHolder.getInstance().store = store;

    expect(NoSSRStoreHolder.getInstance()).toBe(NoSSRStoreHolder.getInstance());
    expect(NoSSRStoreHolder.getInstance().store).toBe(store);
  });
});
