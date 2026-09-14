import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit apenas: tests/e2e é do Playwright (playwright.config.ts, testDir
    // ./tests/e2e) e NÃO roda sob o runner do vitest.
    include: ['tests/unit/**/*.test.ts'],
  },
});
