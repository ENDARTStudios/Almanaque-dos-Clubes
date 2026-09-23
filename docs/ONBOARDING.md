# ONBOARDING.md — Onboarding de dev/agente no Almanaque dos Clubes

> Tempo alvo: rodando local + primeiro PR em < 1 hora.

## 1. Contexto mínimo (leia nesta ordem)

1. [README.md](../README.md) (raiz) + [AGENTS.md](../AGENTS.md) — navegação graft-first.
2. [docs/RULES.md](./RULES.md) — as regras permanentes (R1/R2/R3, branch, fail-loud).
3. [docs/PLANO_MESTRE.md](../PLANO_MESTRE.md) (raiz) — Estado Final consolidado.
4. [docs/TASKS.md](./TASKS.md) — fila atual de tarefas (T-series).

## 2. Ambiente local

Siga [docs/SETUP.md](./SETUP.md). Resumo: pnpm + Docker (Postgres 5432, Redis 6379,
postgis-test 54330 = espelho de CI) + `pnpm install` + `prisma generate` (Postgres) +
`pnpm dev` (api :3000, web :3001).

## 3. Como navegar o código (graft-first)

Este repo é indexado pelo `graft/` (grafo de contexto). Para QUALQUER tarefa:
`graft ask "<pergunta>"` antes de grep/leitura de arquivos. Reconstruir entendimento lendo
arquivos às cegas custa 10× tokens. `graft build` recria o cache local (gitignored).

## 4. Regras inegociáveis

Leia [docs/RULES.md](./RULES.md) inteiro. Destaques: CI verde real (nada de skip silencioso),
fixtures escopadas, proveniência 100%, commit nasce NA branch do PR, dinheiro é fail-loud,
claims ancoram em query (nunca em snapshot/documento).

## 5. Primeiro PR

1. `git switch -c feat/<tarefa>-<slug>` a partir da main ATUALIZADA (`git pull` antes!).
2. Commit nasce NA branch (nunca na main local — se cair, `reset --hard origin/main` e
   cherry-pick; regra D-2026-09-22-regra-processo-branch).
3. CI: `pnpm typecheck && pnpm lint && pnpm test:unit` localmente antes do push.
4. Abra o PR; aguarde o Security Gate (Postgres real roda no CI); merge por squash.
5. Deploy da API = automático no merge (confirmar por FINGERPRINT:
   `RAILWAY_GIT_COMMIT_SHA` no container); web = Vercel automático.

## 6. Quem é quem

- **Doer** — executa tarefas técnicas de forma autônoma (inclui ingestão de fonte aberta e
  deploy da API via railway CLI).
- **Thinker** — planeja, arbitra escopo, fecha gates.
- **Operador** — dono de identidade, dinheiro, domínio e credenciais (advogado/DPO/provedores);
  NÃO é necessário para ingestão técnica nem deploy (D-2026-09-22-correcao-premissa-cli).

## 7. Onde está cada verdade

Estado do dado → query de produção (não docs). Decisões → DECISOES.md. Evidência de gates →
docs/RECONCILIATION-REPORT.md §22+. Pendências do Operador → PENDENCIAS_OPERADOR.md.
