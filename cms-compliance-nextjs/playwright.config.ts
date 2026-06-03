import { defineConfig, devices } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT || '3000'
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI: use production server after build (avoids Turbopack dev panics)
    command: process.env.CI
      ? `npm run start -- -p ${port}`
      : `npx next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://cms_user:cms_password@localhost:5432/cms_compliance',
      DEMO_MODE: process.env.DEMO_MODE || 'true',
      AUTH_ENABLED: process.env.AUTH_ENABLED || 'false',
    },
  },
})
