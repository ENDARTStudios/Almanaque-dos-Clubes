import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/modules/**/*.ts', 'src/config/**/*.ts', 'src/middleware/**/*.ts'],
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 },
    },
    server: {
      deps: {
        inline: [/@almanaque/],
      },
    },
  },
});
