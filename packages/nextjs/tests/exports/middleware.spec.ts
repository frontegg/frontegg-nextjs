import { test, expect } from '@playwright/test';
import * as Exports from '../../src/middleware';

test('@frontegg/nextjs/middleware exports test', () => {
  const requiredExports: Set<string> = new Set<string>(['FronteggApiMiddleware']);

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
