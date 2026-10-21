import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    clientId: 'abc-def-ghi',
    clientSecret: 'super-secret',
    isHostedLogin: false,
    shouldForwardIp: true,
    isVercel: true,
    clientIpHeader: undefined,
  },
}));
vi.mock('../../../src/api', () => ({
  default: { refreshTokenEmbedded: vi.fn(), refreshTokenHostedLogin: vi.fn() },
}));
vi.mock('../../../src/utils/cookies', () => ({
  default: { getRefreshCookieFromRequestEdge: () => 'refresh-cookie', getRequestCookiesHeaderToRemove: () => [] },
}));

import config from '../../../src/config';
import api from '../../../src/api';
import { refreshAccessTokenIfNeededOnEdge } from '../../../src/edge/refreshAccessTokenIfNeededOnEdge';

const mockedApi = vi.mocked(api);

const refreshWithHeaders = (headers: Record<string, string>) =>
  refreshAccessTokenIfNeededOnEdge(new Request('https://app.example.com/', { headers }));

beforeEach(() => {
  Object.assign(config, { isHostedLogin: false, isVercel: true });
  mockedApi.refreshTokenEmbedded.mockResolvedValue({ ok: false } as any);
  mockedApi.refreshTokenHostedLogin.mockResolvedValue({ ok: false } as any);
});

describe('refreshAccessTokenIfNeededOnEdge client ip', () => {
  it('passes the resolved client ip to the embedded refresh', async () => {
    await refreshWithHeaders({ 'x-forwarded-for': '198.51.100.7', 'x-frontegg-forwarded-for': '6.6.6.6' });

    expect(mockedApi.refreshTokenEmbedded).toHaveBeenCalledWith(
      expect.objectContaining({ 'x-forwarded-for': '198.51.100.7' }),
      '198.51.100.7'
    );
  });

  it('passes the resolved client ip to the hosted login refresh', async () => {
    Object.assign(config, { isHostedLogin: true });

    await refreshWithHeaders({ 'x-forwarded-for': '198.51.100.7' });

    expect(mockedApi.refreshTokenHostedLogin).toHaveBeenCalledWith(
      expect.any(Object),
      'refresh-cookie',
      'abc-def-ghi',
      'super-secret',
      '198.51.100.7'
    );
  });

  it('passes no client ip off Vercel without a configured source', async () => {
    Object.assign(config, { isVercel: false });

    await refreshWithHeaders({ 'x-forwarded-for': '6.6.6.6' });

    expect(mockedApi.refreshTokenEmbedded).toHaveBeenCalledWith(expect.any(Object), undefined);
  });
});
