import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Modes controlled by env:
 *   - E2E_BASE_URL      → hits a remote target; webServer disabled
 *   - E2E_NO_SERVER=1   → assume dev server already running on baseURL
 *   - (default)         → auto-start `next dev` in-band
 *
 * Guards:
 *   - Never point E2E_BASE_URL at production.
 *   - CI uses `E2E_ALLOW_DATABASE_RESET=true` explicitly (see fixtures).
 */

const remoteBaseURL = process.env.E2E_BASE_URL;
const baseURL = remoteBaseURL ?? 'http://localhost:3010';
const isCI = !!process.env.CI;
const noServer = process.env.E2E_NO_SERVER === '1';

// Refuse to run against production hostnames — accidental commit guard.
if (remoteBaseURL && /(?:^|\.)app\.srdigital\.com\.br(?::|\/|$)/i.test(remoteBaseURL)) {
  // Print + non-zero exit is done by Playwright when it fails to boot;
  // here we throw so no test executes.
  throw new Error('Refusing to run E2E against production URL.');
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : 2,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer:
    remoteBaseURL || noServer
      ? undefined
      : {
          command: 'npm run dev -- -p 3010',
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
          stdout: 'ignore',
          stderr: 'pipe'
        }
});
