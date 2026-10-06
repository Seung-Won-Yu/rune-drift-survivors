import {defineConfig} from '@playwright/test';
import base from './playwright-survivor-fullrun.config.mjs';
export default defineConfig({...base, testMatch: 'survivor-progression-fullrun.spec.mjs'});
