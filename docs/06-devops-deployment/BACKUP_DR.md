# BACKUP_DR.md — Backup e disaster recovery

> Detalhe operacional completo: [docs/06-devops-deployment/BACKUP_DR.md](./BACKUP_DR.md) (T446) e
> [docs/06-devops-deployment/PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md). Esta página é o resumo do ciclo.

## Ciclo

| Etapa | Mecanismo | Frequência |
|---|---|---|
| Backup | `pg_dump` (custom, client PG 18) → Cloudflare R2 com manifest + auto-validação (clubs>0, threshold 400KB) | diário 04:00 UTC (workflow) + manual `POST /admin/backup` |
| Restore drill | baixa o mais recente do R2 → createdb efêmero → pg_restore → compara counts (clubs/players/competitions/users/rankings) → drop | semanal (drill.yml; execução manual in-container) |
| Deploy drift | CI provisiona scratch do baseline + migrations → diff contra o schema (falha em DDL real) | por PR |

## Números de referência (último ciclo verificado)

Backup ≈ 460KB · counts: clubs 3.857 · players 2.396 · competitions 1.563 · users 40+ ·
rankings 2 · retenção R2: 30 dias (publicado na Privacidade §8 — T469).

## Regras

1. Dump `custom` format SEMPRE (o dump Prisma-JSON vazio de 21KB foi o incidente original).
2. Backup sem `clubs>0` = falha loud (nunca sucesso silencioso — classe anti-padrão).
3. Credenciais NUNCA em argv (spawnSync/env — D-2026-09-16-regra-no-echo).
4. Restore drill que não roda = backup não confiável: o ciclo só vale com o drill verde.
5. Dado importado é reversível por proveniência (DELETE por `importedFrom`/`dataSource`) —_backup
   não substitui reversibilidade do dado.


---

> **Fundido de:** `docs/BACKUP-RESTORE.md`

# BACKUP-RESTORE.md — Backup lógico do PostgreSQL (WS-O)

> Almanaque dos Clubes · Fase F16 / WS-O. Backup **lógico** (tabelas de conteúdo) sem depender de `pg_dump`.

## Scripts
- `apps/api/scripts/backup-db.ts` — despeja as tabelas de conteúdo para `../backups/almanaque-<ts>.json.gz` (gzip JSON), com **retenção de 30 dias** (remove antigos).
- `apps/api/scripts/restore-db.ts` — lê um `../.json.gz` e reinsere as linhas (idempotente, `skipDuplicates`), em ordem de dependência.

## Como rodar
```
pnpm --filter @almanaque/api exec tsx scripts/backup-db.ts [output-dir]      # backup
pnpm --filter @almanaque/api exec tsx scripts/restore-db.ts ./backups/<file>  # restore
```

## Garantias
- **Round-trip verificada (2026-09-02):** backup → restauração em banco limpo → 5.167 registros (1.879 clubes + 892 competições + 2.396 jogadores).
- **Sem pg_dump:** usa Prisma (`$queryRawUnsafe`), selecionando apenas colunas escalares (exclui `search_vector`/tsvector e geometry — derivadas).
- **Retenção 30 dias** (exclui `../.json.gz` com idade > 30d).
- **Idempotente** (`skipDuplicates`) — restauração não duplica.

## Limitações
- Backup **lógico** (dados), não `pg_dump` de schema/roles. O schema é versionado (migrations) e pode ser recriado via `prisma db push`/migrate.
- **Agendamento automático (diário):** o script está pronto; o **cron** deve ser configurado no Railway (scheduled job) ou via agendador externo. O Railway também oferece **backups nativos** do Postgres (snapshots + retenção + PITR no painel) — camada de proteção adicional do plataforma.
- Recomenda-se manter o backup em armazenamento externo/volume persistente (não em filesystem efêmero de container).

