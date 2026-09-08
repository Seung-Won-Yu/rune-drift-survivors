import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'survivor-smoke.spec.mjs',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...(process.env.CI === 'true' ? {} : { channel: 'chrome' }),
    ...(process.env.ASH_QA_SOFTWARE === '1' ? {
      launchOptions: { args: ['--disable-gpu', '--disable-accelerated-2d-canvas'] }
    } : {}),
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true
  }
});
