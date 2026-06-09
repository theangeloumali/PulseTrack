import {defineConfig, devices} from '@playwright/test';

/**
 * Founder-grade DEMO recording config (separate from the assertion suite).
 *
 * Goal: produce ONE clean, human-looking MP4-able video per test — visible
 * cursor, slow deliberate motion, scene beats. NOT the CI assertion run.
 *
 *   pnpm exec playwright test --config=playwright.demo.config.ts
 *
 * Videos land in ./demo-output/<test>/video.webm — convert to H.264 MP4
 * before sharing (see CLAUDE.md VIDEO OUTPUT rule):
 *   ffmpeg -i demo-output/.../video.webm -c:v libx264 -preset slow -crf 18 \
 *     -pix_fmt yuv420p -c:a aac -b:a 192k owner-demo.mp4
 */
export default defineConfig({
  testDir: './tests/demo',
  outputDir: './demo-output',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Demos narrate via long scene waits — give every step generous headroom.
  timeout: 180_000,
  expect: {timeout: 20_000},
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4649',
    viewport: {width: 1440, height: 900},
    // Record every demo test at native viewport resolution.
    video: {mode: 'on', size: {width: 1440, height: 900}},
    trace: 'off',
    screenshot: 'off',
    // Real-feeling interaction: every action has a perceptible beat.
    launchOptions: {slowMo: 120},
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    acceptDownloads: true,
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
