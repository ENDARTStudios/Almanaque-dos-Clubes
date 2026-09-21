import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    headless: true,
    // T448 — specs mockados via page.route exigem que o fetch chegue à camada
    // de rede para ser interceptado; a CSP de dev (connect-src 'self' + prod)
    // bloqueia localhost cross-origin ANTES da intercepção. O header continua
    // sendo servido — o bypass desliga apenas a enforceção no browser do teste.
    bypassCSP: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
