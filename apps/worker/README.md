# apps/worker — Workers BullMQ

Workers standalone para filas BullMQ (Redis): ETL de dados (`dev:etl`) e e-mail transacional (`dev:email`).

**Não é deployado** — em produção a API consome as filas in-process (T451). Este pacote
serve para execução local/manual (reprocessos, ingestão sob demanda).

## Comandos

```bash
pnpm dev:etl     # tsx src/etl-worker.ts
pnpm dev:email   # tsx src/email-worker.ts
```

Requer Redis local (`docker compose up -d redis`).

## Dívida conhecida (não typecheckar)

O worker importa módulos de dentro de `apps/api/src` (`services/queue`,
`modules/etl/won-edges.service`) — resolvidos em runtime pelo workspace `@almanaque/api`,
mas **fora do rootDir** do tsconfig dele: um `tsc --noEmit` aqui falha com TS6059.
Extrair os contratos compartilhados para `packages/` é o refactor pendente (não fazer
typecheck do worker antes disso).
