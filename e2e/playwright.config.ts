import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  globalSetup: './global-setup.mjs',
  globalTeardown: './global-teardown.mjs',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:53250',
    colorScheme: 'light',
  },
  reporter: [['list']],
});
