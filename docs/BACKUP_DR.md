# BACKUP_DR.md — Backup e disaster recovery

> Detalhe operacional completo: [docs/BACKUP-RESTORE.md](./BACKUP-RESTORE.md) (T446) e
> [docs/DEPLOY-ROLLBACK.md](./DEPLOY-ROLLBACK.md). Esta página é o resumo do ciclo.

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
