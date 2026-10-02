import eslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import securityPlugin from 'eslint-plugin-security';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  { ignores: ['**/dist/', 'node_modules/', '*.js', '*.mjs', 'apps/web/', '**/*.config.*'] },
  eslint.configs.recommended,
  {
    files: ['apps/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: { ...globals.node, ...globals.es2022 },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      security: securityPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...securityPlugin.configs.recommended.rules,
      'prettier/prettier': 'error',
      // T476 — FP documentado: core `no-undef` não entende namespaces de TIPO do TS
      // (ex.: `NodeJS.ProcessEnv`), embora o parser TS os resolva. typescript-eslint
      // recomenda desligar core `no-undef` em arquivos TS (o compilador já cobre
      // identificadores indefinidos). Ver D-2026-09-22-t476-ci-glob-recursivo.
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
