import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/core/worker.ts',     // Worker can't be tested in jsdom
        'src/core/webllm-client.ts', // Requires actual WebLLM integration
        'src/main.ts',            // Entry point with side effects
        'src/index.ts',           // Re-exports only
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 90,
        lines: 80,
      },
    },
  },
});
