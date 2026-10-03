# packages/domain — Tipos e validadores compartilhados

Contratos de domínio (tipos TypeScript + validadores Zod) consumidos por `apps/api`,
`apps/worker` e `apps/web`.

## Comandos

```bash
pnpm build       # tsc → dist/ (consumidores importam o dist)
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```

Regra do monorepo: nada de lógica de framework (HTTP/DB) aqui — apenas domínio puro.
