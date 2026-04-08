import { describe, it, expect, vi } from 'vitest';

// Mock config before importing modules that read it.
vi.mock('../../../../src/config', () => ({
  default: {
    cookieName: 'fe_session',
    cookieDomain: 'example.com',
    cookieSameSite: 'none',
    clientId: 'abc-def-ghi',
    appId: undefined,
    rewriteCookieByAppId: false,
    baseUrlHost: 'frontegg.example.com',
  },
}));

import { chunkString } from '../../../../src/utils/common';

describe('chunkString', () => {
  it('returns single chunk for input smaller than chunk size', () => {
    expect(chunkString('hello', 100)).toEqual(['hello']);
  });

  it('splits exact multiples correctly', () => {
    expect(chunkString('abcdefghijkl', 4)).toEqual(['abcd', 'efgh', 'ijkl']);
  });

  it('splits non-multiple lengths with a shorter final chunk', () => {
    expect(chunkString('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('returns empty array for empty string (documents current behavior)', () => {
    // Math.ceil(0/4) === 0 -> no chunks produced
    expect(chunkString('', 4)).toEqual([]);
  });

  it('handles single character chunk size', () => {
    expect(chunkString('abc', 1)).toEqual(['a', 'b', 'c']);
  });

  it('handles unicode BMP characters by UTF-16 code units', () => {
    // JS substring splits by UTF-16 code units, not grapheme clusters.
    expect(chunkString('αβγδ', 2)).toEqual(['αβ', 'γδ']);
  });
});
