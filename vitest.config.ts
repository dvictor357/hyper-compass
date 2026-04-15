import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    alias: {
      'bun:sqlite': new URL('./src/__tests__/__mocks__/bun-sqlite.ts', import.meta.url).pathname,
    },
  },
});
