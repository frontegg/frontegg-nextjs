import { describe, it, expect } from 'vitest';
import cookieSerializer from '../../../../src/utils/cookies/serializer';

describe('cookieSerializer.parse edge cases', () => {
  it('returns an empty object when the string has no "=" at all', () => {
    expect(cookieSerializer.parse('just-a-flag')).toEqual({});
  });

  it('stops at a trailing segment without "="', () => {
    expect(cookieSerializer.parse('a=1; trailing')).toEqual({ a: '1' });
  });

  it('skips a valueless segment that precedes a pair (backtracks to the prior semicolon)', () => {
    expect(cookieSerializer.parse('flag; a=1; b=2')).toEqual({ a: '1', b: '2' });
  });

  it('trims whitespace around keys and values', () => {
    expect(cookieSerializer.parse('  a =  1  ;b=2')).toEqual({ a: '1', b: '2' });
  });

  it('keeps "=" characters inside the value', () => {
    expect(cookieSerializer.parse('token=abc==')).toEqual({ token: 'abc==' });
  });
});

describe('cookieSerializer.serialize edge cases', () => {
  it('serializes a bare name=value pair when options are omitted', () => {
    expect(cookieSerializer.serialize('n', 'v')).toBe('n=v');
  });

  it('url-encodes characters that are not allowed in a cookie value', () => {
    expect(cookieSerializer.serialize('n', 'a b;c')).toBe('n=a%20b%3Bc');
  });

  it('allows an empty value', () => {
    expect(cookieSerializer.serialize('n', '')).toBe('n=');
  });

  it('floors a fractional maxAge', () => {
    expect(cookieSerializer.serialize('n', 'v', { maxAge: 10.9 })).toBe('n=v; Max-Age=10');
  });

  it('throws for an infinite maxAge', () => {
    expect(() => cookieSerializer.serialize('n', 'v', { maxAge: Infinity })).toThrow('option maxAge is invalid');
  });

  it('throws when expires is not a Date', () => {
    expect(() => cookieSerializer.serialize('n', 'v', { expires: '2030-01-01' as unknown as Date })).toThrow(
      'option expires is invalid'
    );
  });

  it('accepts priority values case-insensitively', () => {
    expect(cookieSerializer.serialize('n', 'v', { priority: 'HIGH' as 'high' })).toBe('n=v; Priority=High');
  });

  it('throws for a non-string priority', () => {
    expect(() => cookieSerializer.serialize('n', 'v', { priority: 1 as unknown as 'high' })).toThrow(
      'option priority is invalid'
    );
  });

  it('accepts sameSite values case-insensitively', () => {
    expect(cookieSerializer.serialize('n', 'v', { sameSite: 'LAX' as 'lax' })).toBe('n=v; SameSite=Lax');
  });

  it('omits SameSite when sameSite is false', () => {
    expect(cookieSerializer.serialize('n', 'v', { sameSite: false })).toBe('n=v');
  });

  it('emits attributes in a stable order', () => {
    // Arrange
    const expires = new Date('2030-01-01T00:00:00Z');

    // Act
    const serialized = cookieSerializer.serialize('n', 'v', {
      sameSite: 'strict',
      priority: 'low',
      secure: true,
      httpOnly: true,
      expires,
      path: '/',
      domain: 'example.com',
      maxAge: 60,
    });

    // Assert
    expect(serialized).toBe(
      `n=v; Max-Age=60; Domain=example.com; Path=/; Expires=${expires.toUTCString()}; HttpOnly; Secure; Priority=Low; SameSite=Strict`
    );
  });
});
