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
    { command: 'npx cross-env MWB_WORKSPACE_REGISTRY_FILE=.mozare-runtime/e2e/workspaces.json MWB_WORK_LEDGER_DIR=.mozare-runtime/e2e/work-ledger tsx src/server/index.ts', url: 'http://127.0.0.1:5174/api/health', reuseExistingServer: false },
    { command: 'npm run dev:web -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
