import { vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/fronteggLogger', () => ({
  default: {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});
