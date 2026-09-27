import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/live-setup.ts',
  // Specs share one live server and seeded workspace; decisions persist, so run them one at a time.
  workers: 1,
  use: {
    // Separate ports from the owner's running Workbench (5173/5174) so tests never collide with it.
    baseURL: 'http://127.0.0.1:4183',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npx cross-env MWB_WORKSPACE_REGISTRY_FILE=.mozare-runtime/e2e/workspaces.json MWB_WORK_LEDGER_DIR=.mozare-runtime/e2e/work-ledger MWB_RUNTIME_DIR=.mozare-runtime/e2e MOZARE_SERVER_PORT=5184 tsx src/server/index.ts', url: 'http://127.0.0.1:5184/api/health', reuseExistingServer: false },
    { command: 'npx cross-env MOZARE_SERVER_PORT=5184 npm run dev:web -- --port 4183 --strictPort', url: 'http://127.0.0.1:4183', reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
