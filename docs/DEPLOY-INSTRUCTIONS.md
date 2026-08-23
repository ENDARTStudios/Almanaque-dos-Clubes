# DEPLOY-INSTRUCTIONS.md — Almanaque dos Clubes

> Instruções determinísticas de produção/plataforma, consolidadas na fase
> F13-operador-delegacao (T351–T356). Comandos idempotentes; credenciais via
> variáveis de ambiente (nunca em arquivos versionados).

---

## 1. Vercel — Root Directory (T351) ✅ + push (T366) ✅ + build ⚠️ CI_FAILURE

- **T351:** `rootDirectory` configurado para `apps/web` via API (antes vazio).
- **T366:** `git push origin main` fast-forward — `origin/main` agora em `7378494`
  (5 commits: `59c56e3`, `84e73d7`, `c5c3a4a`, `8cbd8ed`, `7378494`).
- **Build git-triggered:** deployment `dpl_Ds3qLRrYoNHxq9Ew6cheTWJBRRBx`
  (`d3td176qq`) → **ERROR**, `errorCode: NEXT_OUTPUT_DIR_MISSING`.
  Causa-raiz: o `vercel.json` da raiz ainda tem
  `outputDirectory: "apps/web/.next"`, que com `rootDirectory=apps/web` é
  resolvido para `/vercel/path0/apps/web/apps/web/.next` (caminho duplicado).

**Correção necessária (tarefa futura, não retry cego):** remover o
`vercel.json` da raiz (o hack de "commands da raiz" já foi declarado falho em
DECISAO) ou criar `apps/web/vercel.json` com `outputDirectory: ".next"`
relativo ao Root Directory. Após corrigir, novo push dispara build limpo.

## 2. Branch protection (T352) ⚠️ PENDENTE (401)

A tentativa automática falhou (GITHUB_TOKEN 401). Aplicar manualmente —
instruções completas em `docs/BRANCH-PROTECTION.md`.

## 3. Deploys via Railway (T356)

Pré-requisitos: CLI `railway` autenticada (`railway login`), conta com acesso
ao projeto. Serviço: `api` (overridável via `RAILWAY_SERVICE`).

| Script | Objetivo |
|---|---|
| `scripts/deploy-t341.sh` | Deploy do mailer transacional (fila email + worker + templates) |
| `scripts/deploy-t342.sh` | Deploy do mailer auth (verificação de email + reset) |

> T341 e T342 já estão no HEAD de `main`; ambos os deploys equivalem a
> `railway up --service api --detach` do commit atual. A distinção é apenas
> de rastreabilidade.
>
> ⚠️ Serviço Railway vinculado é `Almanaque-dos-Clubes` (`railway status`),
> não `api`. Executar com `RAILWAY_SERVICE=Almanaque-dos-Clubes`.

## 4. Migration `trial_used_at` (T359) ✅ CRIADA — pendente validação em Postgres

A migration `20260823_trial_used_at` foi criada em T359 (`ALTER TABLE
"subscriptions" ADD COLUMN "trial_used_at" TIMESTAMP(3);`) e o modelo
`Subscription` ganhou `trial_used_at DateTime?` (schema canônico + sqlite).
`prisma validate` e `typecheck` verdes.

**Ação restante:** validar com `prisma migrate deploy` em Postgres de teste
(T365) antes de aplicar em produção. A migration foi escrita manualmente
(ENV_MISMATCH) e deve ser confirmada em banco vivo.

## 5. Postgres de teste (T354) ⚠️ BLOQUEADA (ENV_MISMATCH)

O Docker daemon não está acessível neste ambiente
(`failed to connect ... npipe:////./pipe/dockerDesktopLinuxEngine`).

- **Local (Operador):** iniciar Docker Desktop e rodar
  `docker compose up -d postgres`. Serviço: `postgres`, porta `5432`, user/senha
  de teste `almanaque`/`almanaque_dev_2025` (não são credenciais de produção).
- **Verificação:** `psql postgresql://almanaque:almanaque_dev_2025@localhost:5432/almanaque -c 'SELECT 1'`.
- Após disponível, desbloquear T344/T345 (RLS). Não expor a porta fora de
  localhost.

## 6. Ordem recomendada de execução (Operador)

1. Redeploy Vercel (confirmar build verde + domínio servindo `887fcb7`).
2. Aplicar branch protection em `main`.
3. `RAILWAY_SERVICE=Almanaque-dos-Clubes bash scripts/deploy-t342.sh` (Railway) — cobre T341+T342 do HEAD.
4. `migrate deploy` da migration `trial_used_at` em Postgres de teste, depois em produção.
5. Subir Postgres de teste → T344/T345.
