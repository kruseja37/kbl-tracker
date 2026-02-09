import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test-utils/journeys',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-utils/journey-results.json' }],
  ],
});
