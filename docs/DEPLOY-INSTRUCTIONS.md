# DEPLOY-INSTRUCTIONS.md — Almanaque dos Clubes

> Instruções determinísticas de produção/plataforma, consolidadas na fase
> F13-operador-delegacao (T351–T356). Comandos idempotentes; credenciais via
> variáveis de ambiente (nunca em arquivos versionados).

---

## 1. Vercel — Root Directory (T351) ✅ + push (T366) ✅ + vercel.json raiz removido (T368)

- **T351:** `rootDirectory` configurado para `apps/web` via API (antes vazio).
- **T366:** `git push origin main` fast-forward — `origin/main` em `7378494`
  (5 commits: `59c56e3`, `84e73d7`, `c5c3a4a`, `8cbd8ed`, `7378494`).
- **T368:** `vercel.json` da raiz removido (o hack de "commands da raiz" já
  declarado falho em DECISAO). Com `rootDirectory=apps/web`, o Vercel
  auto-detecta Next.js em `apps/web` e usa saída `.next` relativa. Build
  anterior falhou com `NEXT_OUTPUT_DIR_MISSING` por caminho duplicado
  (`apps/web/apps/web/.next`), corrigido por esta remoção.
- **Resultado:** deployment `n9rf54jdw` → **READY** (27s), commit `8d52bcb`;
  `https://almanaquedosclubes.com` responde **200** servindo o HEAD novo.

## 2. Branch protection (T363) ✅ APLICADO

Proteção ativa em `main`: status check `security-gate` (strict), PR com 1
aprovação, `enforce_admins`, sem force push e sem delete. Detalhes em
`docs/BRANCH-PROTECTION.md`. Fluxo de merge passa a ser branch + PR + CI verde.

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
