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
metadata->>'dataSource'='wikidata';`). Ver também [docs/06-devops-deployment/PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md).


---

> **Fundido de:** `docs/DEPLOY-INSTRUCTIONS.md`

# DEPLOY-INSTRUCTIONS.md — Almanaque dos Clubes

> Instruções determinísticas de produção/plataforma, consolidadas na fase
> F13-operador-delegacao (T351–T356). Comandos idempotentes; credenciais via
> variáveis de ambiente (nunca em arquivos versionados).

---

## 1. Vercel — Root Directory (T351) ✅ + push (T366) ✅ + vercel.json raiz removido (T368)

- **T351:** `rootDirectory` configurado para `apps/web` via API (antes vazio).
- **T366:** `git push origin main` fast-forward — `origin/main` em `7378494`
  (5 commits: `59c56e3`, `84e73d7`, `c5c3a4a`, `8cbd8ed`, `7378494`).
- **T368:** `../vercel.json` da raiz removido (o hack de "commands da raiz" já
  declarado falho em DECISAO). Com `rootDirectory=apps/web`, o Vercel
  auto-detecta Next.js em `apps/web` e usa saída `.next` relativa. Build
  anterior falhou com `NEXT_OUTPUT_DIR_MISSING` por caminho duplicado
  (`apps/web/apps/web/.next`), corrigido por esta remoção.
- **Resultado:** deployment `n9rf54jdw` → **READY** (27s), commit `8d52bcb`;
  `https://almanaquedosclubes.com` responde **200** servindo o HEAD novo.

## 2. Branch protection (T363) ✅ APLICADO

Proteção ativa em `main`: status check `security-gate` (strict), PR com 1
aprovação, `enforce_admins`, sem force push e sem delete. Detalhes em
`../05-security-compliance/BRANCH-PROTECTION.md`. Fluxo de merge passa a ser branch + PR + CI verde.

## 3. Deploys via Railway (T356)

Pré-requisitos: CLI `railway` autenticada (`railway login`), conta com acesso
ao projeto. Serviço vinculado: `Almanaque-dos-Clubes` (default nos scripts,
overridável via `RAILWAY_SERVICE`).

| Script | Objetivo |
|---|---|
| `scripts/deploy-t341.sh` | Deploy do mailer transacional (fila email + worker + templates) |
| `scripts/deploy-t342.sh` | Deploy do mailer auth (verificação de email + reset) |

> T341 e T342 já estão no HEAD de `main`; ambos os deploys equivalem a
> `railway up --service Almanaque-dos-Clubes --detach` do commit atual. A
> distinção é apenas de rastreabilidade.

**Resultado T367:** deploy `2bf5aed9-f186-496b-a9f0-1f68a8b365e9` concluído;
`https://api.almanaquedosclubes.com/api/v1/health` → **200**
(`{"status":"ok","uptime":~64s}` confirmando o deploy novo).

## 4. Migration `trial_used_at` (T359) ✅ VALIDADA em teste (T365)

A migration `20260823_trial_used_at` foi aplicada e validada em Postgres de
teste vivo: `prisma migrate deploy` aplicou as 6 migrations (incluindo
`20260823_trial_used_at`) e `migrate status` reportou "Database schema is up
to date!". **Deploy em produção** (`prisma migrate deploy` no Railway) segue
como ação do Operador quando decidir ativar a feature de trial.

## 5. Postgres de teste (T365) ✅ DISPONÍVEL — via rede interna

Container `almanaque-postgres` (Postgres 16) em execução. **Importante:** o
port-proxy do Docker Desktop no Windows falha com P1000/P1001 a partir do host
(bug documentado em DECISOES). Contorno para `prisma migrate`:

```bash
docker run --rm --network almanaquedosclubes_default \
  -v "${PWD}/apps/api:/repo" -w /repo \
  -e DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@almanaque-postgres:5432/almanaque?schema=public" \
  node:22 sh -c "npx prisma@5.22.0 migrate deploy --schema prisma/schema.prisma"
```

- **RLS (T344):** `20260824_rls_sessions` aplicada em teste; `relforcerowsecurity=true`;
  prova A≠B capturada via psql (owner vê só a própria sessão; SERVICE vê ambas;
  sem contexto = 0). Deploy em produção **adiado** até implementar o mecanismo de
  contexto (`rls-context.ts`), que **não existe** no repositório.

## 6. Ordem recomendada de execução (Operador)

1. Redeploy Vercel (confirmar build verde + domínio servindo `887fcb7`).
2. Aplicar branch protection em `main`.
3. `RAILWAY_SERVICE=Almanaque-dos-Clubes bash scripts/deploy-t342.sh` (Railway) — cobre T341+T342 do HEAD.
4. `migrate deploy` da migration `trial_used_at` em Postgres de teste, depois em produção.
5. Subir Postgres de teste → T344/T345.



---

> **Fundido de:** `docs/DEPLOY-ROLLBACK.md`

# DEPLOY-ROLLBACK.md — Runbook de rollback de produção (T443)

> Princípio (L1 do incidente T437): em outage, se o rollback documentado é mais
> rápido que o fix-forward, **executa-se o rollback primeiro** e diagnostica-se
> depois com produção viva.

## 1. Gate de cutover (prevenção)

O serviço da API tem **healthcheck gate** (`../railway.json` →
`deploy.healthcheckPath = /api/v1/health`, timeout 120s): o tráfego só troca
para o novo deployment depois do healthcheck passar. Se o novo deployment
falhar (crash do entrypoint, migrate quebrado, app não sobe), o deployment
anterior **continua servindo** — a falha fica isolada no deployment novo.

Verificação de que o gate está ativo: `../railway.json` na raiz contém
`deploy.healthcheckPath`.

## 2. Rollback por cenário

### 2.1 Falha causada por variável (ex.: credencial inválida — caso T437)
```bash
railway variables --service "Almanaque-dos-Clubes" \
  --set "DATABASE_URL_APP=<valor anterior conhecido-bom>"
# redeploy automático; verificar: railway deployment list
```

### 2.2 Falha causada por código (merge quebrado)
```bash
git revert <merge-commit> && git push
# CI de main faz o deploy da correção (deploy-vercel-frontend p/ web;
# Railway p/ API)
```

### 2.3 Rollback imediato de deployment (sem esperar CI)
1. `railway deployment list --service "Almanaque-dos-Clubes"` → anote o
   último deployment `SUCCESS` **anterior** ao problemático.
2. Reverter a causa (variável ou commit) e `railway redeploy` — o Railway
   reimplanta a última revisão saudável do código.

> Limite documentado (gap 9.3 parcial): o Railway não expõe via CLI o
> redeploy de um deployment ESPECÍFICO antigo; o caminho 2.3 é
> reverter-causa + redeploy. Com o healthcheck gate (1), o cenário que
> exigiria fallback manual ficou restrito a falhas pós-start.

## 3. Teste de fogo (evidência T443)

Procedimento executado em 2026-09-16: variável `DATABASE_URL_APP` apontada
para credencial inválida → novo deployment falha no healthcheck/entrypoint →
**health de produção permaneceu 200** (deployment anterior segue servindo) →
variável revertida → SUCCESS. Log completo em `docs/06-devops-deployment/evidence/t443/`.

