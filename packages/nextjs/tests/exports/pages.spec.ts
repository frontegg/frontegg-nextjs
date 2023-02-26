import { test, expect } from '@playwright/test';
import * as Exports from '../../src/pages';

test('@frontegg/nextjs/pages exports test', () => {
  const requiredExports: Set<string> = new Set<string>([
    'FronteggRouter',
    'FronteggRouterProps',
    'withFronteggApp',
    'getSession',
    'withSSRSession',
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
