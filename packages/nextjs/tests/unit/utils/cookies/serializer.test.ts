import { describe, it, expect, vi } from 'vitest';

// Mock config before importing modules that read it (serializer itself doesn't,
// but helpers.ts/splitValueToChunks does).
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
import cookieSerializer from '../../../../src/utils/cookies/serializer';
import { splitValueToChunks, getIndexedCookieName } from '../../../../src/utils/cookies/helpers';
import { COOKIE_MAX_LENGTH } from '../../../../src/utils/cookies/constants';

describe('chunkString', () => {
  it('returns single chunk for input smaller than chunk size', () => {
    expect(chunkString('hello', 100)).toEqual(['hello']);
  });

  it('splits exact multiples correctly', () => {
    // 12 chars / 4 = exactly 3 chunks
    expect(chunkString('abcdefghijkl', 4)).toEqual(['abcd', 'efgh', 'ijkl']);
  });

  it('splits non-multiple lengths with a shorter final chunk', () => {
    // 10 chars / 4 = 3 chunks, last is 2 chars
    expect(chunkString('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('returns empty array for empty string', () => {
    // Math.ceil(0/4) === 0 -> no chunks produced
    expect(chunkString('', 4)).toEqual([]);
  });

  it('handles single character chunk size', () => {
    expect(chunkString('abc', 1)).toEqual(['a', 'b', 'c']);
  });

  it('handles unicode BMP characters by code unit (documents current behavior)', () => {
    // JS substring splits by UTF-16 code units, not grapheme clusters.
    // These tests pin current behavior, not an aspirational contract.
    expect(chunkString('αβγδ', 2)).toEqual(['αβ', 'γδ']);
  });
});

describe('cookieSerializer.serialize / parse round-trip', () => {
  it('serializes and parses back a simple name=value pair', () => {
    const serialized = cookieSerializer.serialize('fe_session', 'abc123', {});
    const parsed = cookieSerializer.parse(serialized.split(';')[0]);
    expect(parsed).toEqual({ fe_session: 'abc123' });
  });

  it('round-trips URL-encoded values', () => {
    const value = 'value with spaces and; semicolons';
    const serialized = cookieSerializer.serialize('fe_session', value, {});
    // parse expects cookie header format: only the name=value portion
    const parsed = cookieSerializer.parse(serialized.split(';')[0]);
    expect(parsed.fe_session).toBe(value);
  });

  it('includes Expires when provided', () => {
    const expires = new Date('2030-01-01T00:00:00Z');
    const serialized = cookieSerializer.serialize('fe_session', 'v', { expires });
    expect(serialized).toContain(`Expires=${expires.toUTCString()}`);
  });

  it('includes Max-Age when provided', () => {
    const serialized = cookieSerializer.serialize('fe_session', 'v', { maxAge: 3600 });
    expect(serialized).toContain('Max-Age=3600');
  });

  it('throws on invalid maxAge', () => {
    expect(() => cookieSerializer.serialize('fe_session', 'v', { maxAge: NaN })).toThrow(TypeError);
  });

  it('includes Domain, Path, HttpOnly, Secure, SameSite flags', () => {
    const serialized = cookieSerializer.serialize('fe_session', 'v', {
      domain: 'example.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    expect(serialized).toContain('Domain=example.com');
    expect(serialized).toContain('Path=/');
    expect(serialized).toContain('HttpOnly');
    expect(serialized).toContain('Secure');
    expect(serialized).toContain('SameSite=None');
  });

  it('supports sameSite variants lax, strict, none, and boolean-true -> Strict', () => {
    expect(cookieSerializer.serialize('n', 'v', { sameSite: 'lax' })).toContain('SameSite=Lax');
    expect(cookieSerializer.serialize('n', 'v', { sameSite: 'strict' })).toContain('SameSite=Strict');
    expect(cookieSerializer.serialize('n', 'v', { sameSite: 'none' })).toContain('SameSite=None');
    expect(cookieSerializer.serialize('n', 'v', { sameSite: true })).toContain('SameSite=Strict');
  });

  it('supports priority values low/medium/high', () => {
    expect(cookieSerializer.serialize('n', 'v', { priority: 'low' })).toContain('Priority=Low');
    expect(cookieSerializer.serialize('n', 'v', { priority: 'medium' })).toContain('Priority=Medium');
    expect(cookieSerializer.serialize('n', 'v', { priority: 'high' })).toContain('Priority=High');
  });

  it('throws on invalid priority, domain, path, expires, sameSite, name', () => {
    expect(() => cookieSerializer.serialize('bad\nname', 'v', {})).toThrow(TypeError);
    expect(() => cookieSerializer.serialize('n', 'v', { priority: 'urgent' as any })).toThrow(TypeError);
    expect(() => cookieSerializer.serialize('n', 'v', { domain: 'bad domain\n' })).toThrow(TypeError);
    expect(() => cookieSerializer.serialize('n', 'v', { path: 'bad\npath' })).toThrow(TypeError);
    expect(() => cookieSerializer.serialize('n', 'v', { expires: new Date('invalid') })).toThrow(TypeError);
    expect(() => cookieSerializer.serialize('n', 'v', { sameSite: 'weird' as any })).toThrow(TypeError);
  });

  it('omits optional flags when not set', () => {
    const serialized = cookieSerializer.serialize('n', 'v', {});
    expect(serialized).toBe('n=v');
  });

  it('parse handles multiple cookies separated by semicolons', () => {
    const parsed = cookieSerializer.parse('a=1; b=2; c=3');
    expect(parsed).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('parse handles quoted values', () => {
    const parsed = cookieSerializer.parse('a="wrapped"');
    expect(parsed).toEqual({ a: 'wrapped' });
  });

  it('parse throws on non-string input', () => {
    expect(() => cookieSerializer.parse(undefined as any)).toThrow(TypeError);
  });

  it('parse returns empty object on empty string', () => {
    expect(cookieSerializer.parse('')).toEqual({});
  });

  it('parse assigns only the first occurrence of a key', () => {
    expect(cookieSerializer.parse('a=1; a=2')).toEqual({ a: '1' });
  });

  it('parse falls back to raw value when decodeURIComponent throws', () => {
    // '%E0%A4%A' is an invalid percent sequence
    const parsed = cookieSerializer.parse('bad=%E0%A4%A');
    expect(parsed.bad).toBe('%E0%A4%A');
  });
});

describe('splitValueToChunks (chunked cookie round-trip)', () => {
  it('produces a single chunked cookie small enough to fit', () => {
    const value = 'z'.repeat(200);
    const chunks = splitValueToChunks('fe_session', value, { domain: 'example.com', path: '/' });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(COOKIE_MAX_LENGTH));
  });

  it('produces multiple chunks whose concatenated values equal the original', () => {
    const value = 'q'.repeat(12000);
    const chunks = splitValueToChunks('fe_session', value, { domain: 'example.com', path: '/' });
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk uses the indexed cookie name fe_session-1, fe_session-2, ...
    const concatenated = chunks
      .map((chunk, idx) => {
        const indexedName = getIndexedCookieName(idx + 1, 'fe_session');
        // Parse the first segment "name=value"
        const firstSegment = chunk.split(';')[0];
        expect(firstSegment.startsWith(`${indexedName}=`)).toBe(true);
        return decodeURIComponent(firstSegment.slice(indexedName.length + 1));
      })
      .join('');

    expect(concatenated).toBe(value);
  });

  it('each chunk respects COOKIE_MAX_LENGTH', () => {
    const value = 'w'.repeat(20000);
    const chunks = splitValueToChunks('fe_session', value, {
      domain: 'example.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    chunks.forEach((c) => {
      expect(c.length).toBeLessThanOrEqual(COOKIE_MAX_LENGTH);
    });
  });
});
