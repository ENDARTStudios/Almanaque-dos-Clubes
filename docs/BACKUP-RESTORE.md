# BACKUP-RESTORE.md — Backup lógico do PostgreSQL (WS-O)

> Almanaque dos Clubes · Fase F16 / WS-O. Backup **lógico** (tabelas de conteúdo) sem depender de `pg_dump`.

## Scripts
- `apps/api/scripts/backup-db.ts` — despeja as tabelas de conteúdo para `backups/almanaque-<ts>.json.gz` (gzip JSON), com **retenção de 30 dias** (remove antigos).
- `apps/api/scripts/restore-db.ts` — lê um `.json.gz` e reinsere as linhas (idempotente, `skipDuplicates`), em ordem de dependência.

## Como rodar
```
pnpm --filter @almanaque/api exec tsx scripts/backup-db.ts [output-dir]      # backup
pnpm --filter @almanaque/api exec tsx scripts/restore-db.ts ./backups/<file>  # restore
```

## Garantias
- **Round-trip verificada (2026-09-02):** backup → restauração em banco limpo → 5.167 registros (1.879 clubes + 892 competições + 2.396 jogadores).
- **Sem pg_dump:** usa Prisma (`$queryRawUnsafe`), selecionando apenas colunas escalares (exclui `search_vector`/tsvector e geometry — derivadas).
- **Retenção 30 dias** (exclui `.json.gz` com idade > 30d).
- **Idempotente** (`skipDuplicates`) — restauração não duplica.

## Limitações
- Backup **lógico** (dados), não `pg_dump` de schema/roles. O schema é versionado (migrations) e pode ser recriado via `prisma db push`/migrate.
- **Agendamento automático (diário):** o script está pronto; o **cron** deve ser configurado no Railway (scheduled job) ou via agendador externo. O Railway também oferece **backups nativos** do Postgres (snapshots + retenção + PITR no painel) — camada de proteção adicional do plataforma.
- Recomenda-se manter o backup em armazenamento externo/volume persistente (não em filesystem efêmero de container).
