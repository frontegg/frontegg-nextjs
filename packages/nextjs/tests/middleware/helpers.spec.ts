import { test, expect } from '@playwright/test';
import config from '../../src/config';
import { getHostedLogoutUrl } from '../../src/middleware/helpers';

test.describe('middleware helpers tests', () => {
  test('getHostedLogoutUrl returns the appUrl as post_logout_redirect_uri if no referer', () => {
    const hostedLogoutUrl = getHostedLogoutUrl().asPath;
    expect(hostedLogoutUrl).toBe(
      `${config.baseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(config.appUrl + '/')}`
    );
  });

  test('getHostedLogoutUrl returns the correct url with "session" in post_logout_redirect_uri', () => {
    const redirectUrl = 'https://test.recirect.io/session';
    const hostedLogoutUrl = getHostedLogoutUrl(redirectUrl).asPath;
    expect(hostedLogoutUrl).toBe(
      `${config.baseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(redirectUrl)}`
    );
  });

  test('getHostedLogoutUrl should return the appUrl url as post_logout_redirect_uri if referer is logout path', async () => {
    const hostedLogoutUrl = getHostedLogoutUrl(`${config.appUrl}/account/logout`).asPath;
    expect(hostedLogoutUrl).toBe(
      `${config.baseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(config.appUrl)}`
    );
  });

  test('getHostedLogoutUrl should return base url in post_logout_redirect_uri if logout path', async () => {
    const hostedLogoutUrl = getHostedLogoutUrl(`${config.appUrl}/account/logout?organization=osem`).asPath;
    expect(hostedLogoutUrl).toBe(
      `${config.baseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(
        `${config.appUrl}?organization=osem`
      )}`
    );
  });
});
