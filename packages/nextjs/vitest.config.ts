import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: ['tests/**/*.spec.ts'], // leave existing Playwright specs alone
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
      // Type-only files have no runtime code, so v8 would always report them as 0%.
      exclude: ['src/**/*.d.ts', 'src/**/types.ts', 'src/types/**'],
      // CI fails below these. Current coverage is ~99% lines / ~97% branches; keep headroom for small refactors.
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
