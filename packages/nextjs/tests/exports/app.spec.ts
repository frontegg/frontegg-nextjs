import { test, expect } from '@playwright/test';
import * as Exports from '../../src/app';

test('@frontegg/nextjs/app exports test', () => {
  const requiredExports: Set<string> = new Set<string>([
    'FronteggAppProvider',
    'FronteggAppRouter',
    'getAppSession',
    'getAppUserSession',
    'getAppUserTokens',
  ]);

  const additionalExports = Object.keys(Exports).filter((exported: string) => {
    if (requiredExports.has(exported)) {
      requiredExports.delete(exported);
      return false;
    } else {
      return true;
    }
  });

  expect(requiredExports).toEqual(new Set());
  expect(additionalExports).toEqual([]);
});
