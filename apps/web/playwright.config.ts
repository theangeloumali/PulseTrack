import {defineConfig, devices} from '@playwright/test';

/**
 * Playwright config for PulseTrack E2E + demo recordings.
 * - Video ON for every test (1440x900) so each run produces a recording.
 * - webServer auto-starts `pnpm dev` on :4649 and reuses an already-running one.
 * - Sequential (workers:1) so recordings are clean and DB writes don't interleave.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  // One retry absorbs transient flakes from sustained load on the single dev server
  // during the full suite; a genuine failure still fails both attempts.
  retries: 1,
  reporter: [['list'], ['html', {open: 'never', outputFolder: 'playwright-report'}]],
  timeout: 90_000,
  expect: {timeout: 15_000},
  use: {
    baseURL: 'http://localhost:4649',
    viewport: {width: 1440, height: 900},
    video: {mode: 'on', size: {width: 1440, height: 900}},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}}},
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4649/login',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
