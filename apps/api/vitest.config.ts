import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit tests importam módulos que carregam o singleton Prisma no import; sem uma
    // URL definida o construtor lança antes de qualquer query (não conecta aqui).
    // Integration tests usam a DATABASE_URL real do ambiente (CI/sandbox).
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://almanaque:almanaque@localhost:5432/almanaque_test',
    },
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.git/**',
      // RLS reativado: RLS FORCE + role app_user aplicadas no test DB (T400).
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
