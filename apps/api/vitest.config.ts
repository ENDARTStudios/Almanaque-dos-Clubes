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
      // T138 (2026-10-08): cobertura medida com suíte COMPLETA (DB+Redis locais):
      // 73,15% stmts · 63% branches · 72,21% functions · 74,91% lines.
      // Thresholds = piso real com margem para variação de CI. Próximos gaps
      // registrados em docs/PLANO-CONCLUSAO.md (rankings.service, graph, rag,
      // legal, upload routes) até os 80% do T138.
      thresholds: { statements: 70, branches: 60, functions: 68, lines: 72 },
    },
    server: {
      deps: {
        inline: [/@almanaque/],
      },
    },
  },
});
