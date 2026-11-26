import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: { shouldForwardIp: true, isVercel: true, clientIpHeader: undefined },
}));
vi.mock('../../../src/api', () => ({ getPublicSettings: vi.fn() }));
vi.mock('../../../src/app/helpers', () => ({ getAppHeaders: vi.fn() }));

import config from '../../../src/config';
import { getPublicSettings } from '../../../src/api';
import { getAppHeaders } from '../../../src/app/helpers';
import { getAppUrlForCustomLoginWithSubdomain } from '../../../src/app/getAppUrlForCustomLoginWithSubdomain';

const CLIENT_IP = '198.51.100.7';
const mockedGetPublicSettings = vi.mocked(getPublicSettings);

beforeEach(() => {
  Object.assign(config, { isVercel: true, clientIpHeader: undefined });
  mockedGetPublicSettings.mockResolvedValue({ applicationUrl: 'https://tenant.example.com' } as any);
});

describe('getAppUrlForCustomLoginWithSubdomain client ip', () => {
  it.each([
    ['Vercel', {}, { 'x-forwarded-for': CLIENT_IP }, CLIENT_IP],
    ['a configured header', { isVercel: false, clientIpHeader: 'x-real-ip' }, { 'x-real-ip': CLIENT_IP }, CLIENT_IP],
    ['no configured source off Vercel', { isVercel: false }, { 'x-forwarded-for': CLIENT_IP }, undefined],
  ])('passes the client ip resolved for %s to getPublicSettings', async (_name, configOverrides, headers, clientIp) => {
    Object.assign(config, configOverrides);
    vi.mocked(getAppHeaders).mockResolvedValue({ host: 'tenant.app.example.com', ...headers });

    await getAppUrlForCustomLoginWithSubdomain(0);

    expect(mockedGetPublicSettings).toHaveBeenCalledWith(
      expect.objectContaining({ 'frontegg-login-alias': 'tenant' }),
      clientIp
    );
  });
});
