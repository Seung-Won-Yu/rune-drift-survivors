import { defineConfig, devices } from '@playwright/test';

const isHeadless = process.env.RUNE_QA_HEADLESS === '1';
const useSystemChrome = !process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: 'qa-smoke.spec.mjs',
  timeout: 35_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5173',
    ...(useSystemChrome ? { channel: 'chrome' } : {}),
    headless: isHeadless,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: 'off',
    video: 'off'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        ...(useSystemChrome ? { channel: 'chrome' } : {})
      }
    }
  ]
});
