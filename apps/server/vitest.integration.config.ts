import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 25000,
    hookTimeout: 10000,
    fileParallelism: false,
  },
});
