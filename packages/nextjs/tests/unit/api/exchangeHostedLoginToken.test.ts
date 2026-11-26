import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    appUrl: 'https://app.example.com',
    authRoutes: {} as Record<string, string>,
    baseUrl: 'https://auth.example.com',
  },
}));

vi.mock('../../../src/api/utils', () => ({
  Post: vi.fn(),
  Get: vi.fn(),
  parseHttpResponse: vi.fn(),
  buildRequestHeaders: (h: Record<string, string>) => h,
}));

import config from '../../../src/config';
import { Post } from '../../../src/api/utils';
import { exchangeHostedLoginToken } from '../../../src/api';

const mockedPost = vi.mocked(Post);

const bodyOf = () => JSON.parse((mockedPost.mock.calls[0][0] as any).body);

beforeEach(() => {
  Object.assign(config, { appUrl: 'https://app.example.com', authRoutes: {} });
});

describe('exchangeHostedLoginToken', () => {
  it('sends the default callback path as redirect_uri', async () => {
    await exchangeHostedLoginToken({}, 'the-code', 'client', 'secret');
    expect(bodyOf().redirect_uri).toBe('https://app.example.com/oauth/callback');
  });

  it('sends an overridden callback path as redirect_uri', async () => {
    Object.assign(config, { authRoutes: { hostedLoginRedirectUrl: '/auth/cb' } });
    await exchangeHostedLoginToken({}, 'the-code', 'client', 'secret');
    expect(bodyOf().redirect_uri).toBe('https://app.example.com/auth/cb');
  });

  it('sends the bare app url when the callback route is the app root', async () => {
    Object.assign(config, { authRoutes: { hostedLoginRedirectUrl: '/' } });
    await exchangeHostedLoginToken({}, 'the-code', 'client', 'secret');
    expect(bodyOf().redirect_uri).toBe('https://app.example.com');
  });
});
