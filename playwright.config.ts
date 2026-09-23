import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/live-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npx tsx src/server/index.ts', url: 'http://127.0.0.1:5174/api/health', reuseExistingServer: false },
    { command: 'npm run dev:web -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
