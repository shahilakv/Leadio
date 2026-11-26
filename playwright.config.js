// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 20000,
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Pixel 7'],
    browserName: 'chromium',
    // Optional: point at an already-installed Chrome/Chromium instead of `npx playwright install`
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  },
  webServer: {
    command: 'node scripts/preview.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: true
  }
});
