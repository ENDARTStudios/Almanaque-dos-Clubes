# packages/feature-flags — Flags de feature

Avaliação de flags (cookie banner, páginas legais, ETL scheduler etc.) compartilhada
entre API e web. Testes com vitest.

## Comandos

```bash
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```

Flags de ambiente em produção são geridas via Railway (`railway variables`); o pacote
define os contratos e defaults.
