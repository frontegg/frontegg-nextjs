import { test } from '@playwright/test';
import CookieManager from '../src/CookieManager';

test.describe('CookieManager tests', () => {
  test('should create a fe_session cookie', async () => {
    const cookie = CookieManager.create({
      value: 'testing',
      secure: true,
      expires: new Date(),
    });

    console.log(cookie);
  });
});
