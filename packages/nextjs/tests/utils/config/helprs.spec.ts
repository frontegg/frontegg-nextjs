import { generateAppUrl } from '../../../src/config/helpers';
import { test, expect } from '@playwright/test';

test.describe('test config helpers', () => {
  const testAppUrl = 'http://test.com';
  const customLoginAppUrl = 'http://custom.test.com';
  const testAppUrlWithoutHttps = 'test.com';
  const oldEnv = process.env;
  const oldGlobal = global;

  test.beforeEach(() => {
    process.env = { ...oldEnv };
    global = { ...oldGlobal };
  });

  test.afterEach(() => {
    process.env = oldEnv;
    global = oldGlobal;
  });

  test('generateAppUrl should return env variable if provided', () => {
    process.env.FRONTEGG_APP_URL = testAppUrl;
    const appUrl = generateAppUrl();
    expect(appUrl).toBe(testAppUrl);
  });

  test('generateAppUrl should return global customLoginAppUrl if provided', () => {
    process.env.FRONTEGG_APP_URL = testAppUrl;
    global.customLoginAppUrl = customLoginAppUrl;
    const appUrl = generateAppUrl();
    expect(appUrl).toBe(customLoginAppUrl);
  });

  test('generateAppUrl should add https to url if not exist', () => {
    process.env.FRONTEGG_APP_URL = testAppUrlWithoutHttps;
    const appUrl = generateAppUrl();
    expect(appUrl).toBe(`https://${testAppUrlWithoutHttps}`);
  });
});
