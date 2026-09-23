# PRODUCTION_DEPLOY.md — Deploy de produção

## Serviços

| Serviço | Onde | Deploy |
|---|---|---|
| Web (Next.js) | Vercel | automático no merge em main |
| API (Fastify) | Railway (`Almanaque-dos-Clubes`) | automático no merge (confirmar! — ver fingerprint) |
| Worker (BullMQ) | Railway | mesmo padrão da API |
| Postgres/Redis | Railway | gerenciados |

## Fluxo (API)

1. Merge do PR em main (squash).
2. O auto-deploy dispara no merge — MAS verifique (já falhou 3× por build): 
   `railway deployment list` ou poll do fingerprint.
3. **Fingerprint (obrigatório, R3)**: o deploy vale quando o container de produção responde
   `RAILWAY_GIT_COMMIT_SHA == <sha do merge>` E a rota/artefato novo responde:

```bash
railway ssh -p 4091684b-8701-4ace-bbe2-c39bc8e0911c -s "Almanaque-dos-Clubes" -e production \
  -- "printenv RAILWAY_GIT_COMMIT_SHA"
```

4. Se o auto-deploy não disparar: `railway up` a partir da main local atualizada
   (D-2026-09-22-correcao-premissa-cli: deploy é autônomo do Doer).

## Migrations

O entrypoint da API aplica `prisma migrate deploy` (fail-fast) ANTES do servidor (T430).
Migration nova: versionada + reversível + GRANTs do `app_user` no MESMO PR
(D-2026-09-15-migration-grants-rule) + ensaio no banco de teste.

## Healthcheck

`GET /api/v1/health` com retry window de 2 min — deploy que não sobra saudável é rejeitado e
a versão anterior permanece servindo (rollback automático do Railway).

## Scripts de ingestão em produção (fontes abertas — autônomo do Doer)

```bash
railway ssh -p <project> -s "Almanaque-dos-Clubes" -e production -- \
  "cd /app/apps/api && node dist/scripts/<script>.js --apply"
```

Scripts vivem em `apps/api/src/scripts/` (compilam para `dist/scripts/` — padrão T430;
`apps/api/scripts/` NÃO está no container). Sempre: DRY-RUN → --apply → re-run idempotente →
spot-check independente → contagem por hierarquia. Invalidar cache com **DEL por chave exata**
(`DEL champions:all`) — invalidação por padrão falhou silenciosamente 2× (T448d).

## Rollback

Railway → redeploy do deployment anterior (ou `railway up` do commit anterior). Dado importado é
sempre reversível por proveniência (ex.: `DELETE FROM knowledge_graph WHERE relation='WON' AND
metadata->>'dataSource'='wikidata';`). Ver também [docs/DEPLOY-ROLLBACK.md](./DEPLOY-ROLLBACK.md).
