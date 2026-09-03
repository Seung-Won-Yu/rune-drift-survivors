import { defineConfig, devices } from '@playwright/test';

const useSystemChrome = !process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: 'balance-sample.spec.mjs',
  timeout: 420_000,
  expect: {
    timeout: 20_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5173',
    ...(useSystemChrome ? { channel: 'chrome' } : {}),
    headless: true,
    viewport: { width: 960, height: 600 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    trace: 'off',
    video: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ]
    }
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
