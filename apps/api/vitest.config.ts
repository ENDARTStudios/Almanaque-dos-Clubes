import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.git/**',
      // RLS integration tests testam uma feature INERTE (D-2026-09-02-v5c, T390) — reativar quando a RLS for efetiva.
      'tests/integration/rls-sessions-policies.test.ts',
      'tests/integration/rls-sessions.test.ts',
    ],
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
