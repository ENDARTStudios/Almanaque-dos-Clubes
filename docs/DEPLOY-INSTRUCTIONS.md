# DEPLOY-INSTRUCTIONS.md — Almanaque dos Clubes

> Instruções determinísticas de produção/plataforma, consolidadas na fase
> F13-operador-delegacao (T351–T356). Comandos idempotentes; credenciais via
> variáveis de ambiente (nunca em arquivos versionados).

---

## 1. Vercel — Root Directory (T351) ✅ CONFIGURADO

O `rootDirectory` do projeto Vercel foi configurado para `apps/web` via API
(projeto `almanaque-dos-clubes`, org `ENDARTStudios`).

- **Antes:** `rootDirectory` vazio → builder `@vercel/next` não detectava o
  framework no diretório-raiz do monorepo → build git-triggered falhava com
  `No Next.js version detected` (~23s).
- **Ação restante (Operador):** na dashboard do Vercel, disparar um redeploy da
  branch `main` e confirmar build verde. Depois validar que
  `almanaquedosclubes.com` serve a versão `887fcb7` (não o deploy manual
  antigo `7ND1bQJCg`).
- O `vercel.json` da raiz deixa de ser usado pelo build web (o Vercel procura
  `vercel.json` dentro do Root Directory). Se o build web exigir ajustes,
  criar `apps/web/vercel.json` — não editar o da raiz até confirmação.

Verificação local de config: `vercel whoami` (autenticado) + API:
`GET /v9/projects/{projectId}?teamId={teamId}` → `rootDirectory == "apps/web"`.

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
| `scripts/deploy-t322.sh` | Reparo de órfãos — **guarda: falha até o entrypoint existir** |

> T341 e T342 já estão no HEAD de `main`; ambos os deploys equivalem a
> `railway up --service api --detach` do commit atual. A distinção é apenas
> de rastreabilidade.

## 4. Migration `trial_used_at` (T355) ⚠️ BLOQUEADA (AMBIGUOUS_SPEC)

A migration `20260815_trial_used_at` **não existe no repositório** e o
`schema.prisma` não tem a coluna `trial_used_at`. Migrations presentes em
`apps/api/prisma/migrations/`:

- `20260716154544_init`
- `20260720000001_phase2_final`
- `20260720202741_init_almanaque_v2`
- `20260720202940_add_composite_indexes`
- `20260814_add_qid_and_stadium`

**Ação:** antes de qualquer `migrate deploy` de `trial_used_at`, o Doer deve
criar a migration a partir do schema (se a feature for de fato necessária) em
tarefa própria, com revisão. `prisma migrate deploy` em produção só depois
disso.

## 5. Postgres de teste (T354) ⚠️ BLOQUEADA (ENV_MISMATCH)

O Docker daemon não está acessível neste ambiente
(`failed to connect ... npipe:////./pipe/dockerDesktopLinuxEngine`).

- **Local (Operador):** iniciar Docker Desktop e rodar
  `docker compose up -d postgres`. Serviço: `postgres`, porta `5432`, user/senha
  de teste `almanaque`/`almanaque_dev_2025` (não são credenciais de produção).
- **Verificação:** `psql postgresql://almanaque:almanaque_dev_2025@localhost:5432/almanaque -c 'SELECT 1'`.
- Após disponível, desbloquear T344/T345 (RLS). Não expor a porta fora de
  localhost.

## 6. Reparo de órfãos (T322) ⚠️ PENDENTE DE CÓDIGO

O entrypoint de reparo de órfãos não existe no repositório (nenhum script
`db:reparo:orfaos` em `apps/api/package.json`, nenhum módulo de reparo).
`scripts/deploy-t322.sh` falha rápido até isso ser implementado. Tarefa de
código futura, fora do escopo F13.

## 7. Ordem recomendada de execução (Operador)

1. Redeploy Vercel (confirmar build verde + domínio servindo `887fcb7`).
2. Aplicar branch protection em `main`.
3. `bash scripts/deploy-t342.sh` (Railway) — cobre T341+T342 do HEAD.
4. Criar migration `trial_used_at` (tarefa) → `migrate deploy` em produção.
5. Subir Postgres de teste → T344/T345.
6. Implementar e rodar reparo de órfãos (T322).
