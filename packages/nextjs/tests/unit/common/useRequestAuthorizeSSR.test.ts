import { describe, it, expect, vi, afterEach } from 'vitest';
import useRequestAuthorizeSSR from '../../../src/common/useRequestAuthorizeSSR';

const createApp = () => ({ store: { dispatch: vi.fn() } }) as any;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRequestAuthorizeSSR', () => {
  it('hydrates the store with the server user, merging session tokens into the user', () => {
    const app = createApp();
    const user = { id: 'u', email: 'a@b.c' } as any;
    const tenants = [{ id: 't' }] as any;
    const session = { accessToken: 'session-access', refreshToken: 'session-refresh' } as any;

    useRequestAuthorizeSSR({ app, user, tenants, session });

    expect(app.store.dispatch).toHaveBeenCalledWith({
      type: 'auth/requestAuthorizeSSR',
      payload: {
        accessToken: 'session-access',
        user: { id: 'u', email: 'a@b.c', accessToken: 'session-access', refreshToken: 'session-refresh' },
        tenants,
      },
    });
  });

  it('keeps an access token already present on the user', () => {
    const app = createApp();

    useRequestAuthorizeSSR({ app, user: { accessToken: 'user-access' } as any, session: { accessToken: 's' } as any });

    expect(app.store.dispatch.mock.calls[0][0].payload.user.accessToken).toBe('user-access');
  });

  it('dispatches a null user when no user is logged in', () => {
    const app = createApp();

    useRequestAuthorizeSSR({ app, user: null, tenants: null, session: null });

    expect(app.store.dispatch).toHaveBeenCalledWith({
      type: 'auth/requestAuthorizeSSR',
      payload: { accessToken: undefined, user: null, tenants: null },
    });
  });

  it('tolerates a missing app', () => {
    expect(() => useRequestAuthorizeSSR({ app: undefined as any, user: null })).not.toThrow();
  });

  it('does not dispatch during server rendering', () => {
    vi.stubGlobal('window', undefined);
    const app = createApp();

    useRequestAuthorizeSSR({ app, user: { id: 'u' } as any });

    expect(app.store.dispatch).not.toHaveBeenCalled();
  });
});
