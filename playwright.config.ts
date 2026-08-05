import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Environments controlled by `E2E_BASE_URL` env var:
 *   - Local:   http://localhost:3000 (default)
 *   - Staging: https://staging.srdigital.com.br
 *   - CI:      set via workflow
 *
 * Real production URL is never used for tests.
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,           // fluxos compartilham estado no DB de teste
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
    // Firefox/Safari podem ser habilitados após validação inicial
  ],
  webServer: process.env.E2E_START_SERVER
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000
      }
    : undefined
});
