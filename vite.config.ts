import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: { '/api': 'http://127.0.0.1:5174' },
  },
  test: {
    // Playwright specs (including the P10 prefab kept as execution evidence) are not Vitest suites.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'EXECUTION/**'],
  },
});
