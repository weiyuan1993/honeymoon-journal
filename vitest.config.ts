import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': decodeURIComponent(new URL('./src', import.meta.url).pathname),
    },
  },
  test: {
    environment: 'node',
    include: ['worker/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
