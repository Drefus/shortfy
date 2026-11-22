import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // No CI, o HTML é publicado como artefato quando algum teste falha.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start:e2e',
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: !process.env.CI,
    // NODE_ENV=test habilita /__test/destino, usado como destino local dos redirecionamentos.
    env: { PORT: String(PORT), STORAGE: 'memory', NODE_ENV: 'test' },
  },
});
