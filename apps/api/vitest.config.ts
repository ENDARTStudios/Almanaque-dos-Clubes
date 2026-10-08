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
      // T138 (08-10, rodada 2): cobertura medida com suíte COMPLETA (DB+Redis):
      // 77,36% stmts · 66,12% branches · 78,79% functions · 79,27% lines.
      // Thresholds = piso real com margem de CI. Gap restante para os 80%:
      // agregado country_pyramid do rankings.service (fixture EN-pyramid) —
      // registrado em docs/PLANO-CONCLUSAO.md.
      thresholds: { statements: 75, branches: 63, functions: 75, lines: 77 },
    },
    server: {
      deps: {
        inline: [/@almanaque/],
      },
    },
  },
});
