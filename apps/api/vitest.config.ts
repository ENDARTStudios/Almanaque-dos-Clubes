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
      // Thresholds alinhados à cobertura real da suíte atual (linhas ~34%, branches ~24%).
      // Ajuste para cima conforme os testes de integração/unit forem adicionados.
      thresholds: { statements: 30, branches: 20, functions: 25, lines: 30 },
    },
    server: {
      deps: {
        inline: [/@almanaque/],
      },
    },
  },
});
