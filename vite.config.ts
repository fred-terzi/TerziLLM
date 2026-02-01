import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/llm-model-vetter/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
    open: true,
  },
});
