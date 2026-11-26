import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateExpiresInFromExp, chunkString } from '../../../../src/utils/common';

describe('chunkString', () => {
  it('splits a string into fixed size chunks with a shorter last chunk', () => {
    expect(chunkString('abcdefg', 3)).toEqual(['abc', 'def', 'g']);
  });

  it('returns a single chunk when the string fits', () => {
    expect(chunkString('abc', 10)).toEqual(['abc']);
  });

  it('returns no chunks for an empty string', () => {
    expect(chunkString('', 4)).toEqual([]);
  });

  it('reassembles to the original string', () => {
    // Arrange
    const original = 'x'.repeat(1234) + 'y'.repeat(17);

    // Act
    const chunks = chunkString(original, 100);

    // Assert
    expect(chunks.join('')).toBe(original);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
    expect(chunks).toHaveLength(13);
  });
});

describe('calculateExpiresInFromExp', () => {
  const NOW_MS = Date.UTC(2030, 0, 1, 0, 0, 0);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the number of seconds left until exp', () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    const exp = NOW_MS / 1000 + 3600;

    // Act + Assert
    expect(calculateExpiresInFromExp(exp)).toBe(3600);
  });

  it('returns zero when exp equals now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);

    expect(calculateExpiresInFromExp(NOW_MS / 1000)).toBe(0);
  });

  it('returns a negative value for an already expired exp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);

    expect(calculateExpiresInFromExp(NOW_MS / 1000 - 60)).toBe(-60);
  });

  it('floors partial seconds', () => {
    // Arrange: 500ms after a whole second, so 10s exp leaves 9.5s
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS + 500);

    // Act + Assert
    expect(calculateExpiresInFromExp(NOW_MS / 1000 + 10)).toBe(9);
  });
});
