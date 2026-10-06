import {defineConfig} from '@playwright/test';

const baseURL=process.env.ASH_FULLRUN_URL??'http://127.0.0.1:5173';
export default defineConfig({
  testDir: '.',
  testMatch: 'survivor-fullrun.spec.mjs',
  timeout: 420_000,
  workers: 3,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    headless:true,
    screenshot:'only-on-failure'
  },
  ...(process.env.ASH_FULLRUN_URL ? {} : {webServer:{
    command:'npm run dev -- --host 127.0.0.1',
    url:baseURL,
    reuseExistingServer:true
  }})
});
