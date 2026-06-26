import { defineConfig, devices } from '@playwright/test'

// In CI the env vars are injected by the workflow; locally op reads them from the template.
const webServerCommand = process.env.CI
  ? './node_modules/.bin/next build --webpack && ./node_modules/.bin/next start'
  : 'op run --env-file=.env.app.local.tpl -- sh -c "./node_modules/.bin/next build --webpack && ./node_modules/.bin/next start"'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
})
