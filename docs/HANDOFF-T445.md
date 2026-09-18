# HANDOFF-T445.md — Checkpoint de contexto (2026-09-17)

> Sessão encerrada com contexto degradado. Este handoff contém tudo que a
> sessão fresca precisa para retomar sem redescobrir nada. Ler antes de
> tocar em qualquer arquivo.

## Feito (commit `28a92a0` na branch `feat/t445-direitos-titular`)

- **schema.prisma**: `PrivacyRequest` (10 rightTypes do art. 18, status flow,
  SLA, token p/ não-usuários, deferredUntil art. 18 §3) + `CopyrightClaim`
  (formulário DMCA com workflow admin) — ambos com GRANTs app_user.
- **Migration** `20260918120000_direitos_titular/migration.sql`: DDL completo
  (tabelas + índices). Rollback em `docs/evidence/t445-rollback.sql`.
- **`create_app_user.sql`**: GRANTs das duas tabelas (regra grants — mesmo PR).
- **PR #137 aberto como DRAFT** — CI valida DDL/migration-drift/GRANTs.

## Faltando (nesta ordem)

### Espelho sqlite
1. Adicionar os 2 models a `prisma/schema.sqlite.prisma` (Json→String se
   houver; o sqlite client é regenerado para testes locais).
2. `DATABASE_URL="file:./dev.db" npx prisma db push --schema=prisma/schema.sqlite.prisma`
   → `npx prisma generate --schema=prisma/schema.sqlite.prisma`.
3. **Depois de testar local**: regenerar o client Postgres (`npx prisma
   generate --schema=prisma/schema.prisma`) para paridade com CI.

### F2 — API + máquina de estados
4. `src/modules/privacy/`: service (SLA imediato p/ direito de resposta;
   15 dias ANPD para os demais; fulfillment via SERVICE com segregação
   — eliminação = soft-delete + segregação do que fica por obrigação
   legal, NUNCA hard-delete), repository, rotas autenticadas.
5. `src/modules/copyright/`: form público com rate-limit + honeypot,
   workflow admin com decisão motivada.
6. Machine de estados: `recebido → em_andamento → atendido/indeferido`
   com transições auditadas (auditLog).
7. `PAYMENTS_ENABLED` — NÃO confundir com T444; T445 não tem flag.

### F3 — UI
8. Formulário público de direitos do titular (10 rightTypes + email +
   confirmação por token) — rota `/direitos-titular`.
9. Formulário público de copyright claim — rota `/copyright`.
10. Rodapé: links "Direitos do Titular" e "Copyright" (políticas v1.1).
11. i18n 3 idiomas.

### F4 — Testes
12. Unit: SLA (imediato/15d), transições inválidas.
13. Integração: create/status/fulfillment/claim + matriz RLS (se houver).
14. E2E: formulário → protocolo → status.

### F5 — Reconciliação
15. DECISOES: D-2026-09-XX-t445-direitos-titular.
16. PLANO_MESTRE: WS-L 2ª camada [x].
17. RECONCILIATION-REPORT: snapshot.

## Decisões já tomadas (não re-discutir)

| Decisão | Justificativa |
|---|---|
| 10 rightTypes do art. 18 como enum string | flexível p/ novos direitos |
| SLA imediato p/ direito de resposta; 15 dias ANPD para os demais | LGPD art. 18 §3 |
| Token p/ não-usuários confirmarem identidade | sem login obrigatório |
| deferredUntil p/ prazo estendido | art. 18 §3 |
| Eliminação = soft-delete + segregação | princípio 1.1 |
| Sem RLS nas tabelas (workflow interno) | acesso via SERVICE/admin |
| Formulário copyright: rate-limit + honeypot | abuso público |
| Canal do titular: endart.studios@gmail.com (já publicado) | T436 |

## Ponteiros

- **Spec T445 do Thinker**: dispatch de 09-16 (ver histórico do chat)
- **Pacote jurídico**: docs/LEGAL-FIELDS.md §2.12 (direitos) e §3.7 (DMCA)
- **Canal do titular**: endart.studios@gmail.com (já publicado em rodapé)
- **T444 artefatos**: PR #127 (checkout), PAYMENTS-RUNBOOK.md (criado no
  commit docs/t446-fechamento)
- **T446 fechamento**: PRs #128-#136, restore drill counts idênticos
- **Eco-4**: rotação owner 09-16 ~19:15 UTC (confirmada, sem ambiguidade)
- **Regra no-echo**: D-2026-09-16-regra-no-echo no DECISOES
- **Protocolo checkpoint de contexto**: D-2026-09-18-checkpoint-de-contexto
  (registrar na próxima reconciliação)

## Armadilhas conhecidas (ler antes de escrever código)

| Armadilha | Solução |
|---|---|
| `postgres.railway.internal` não resolve fora da rede | executar via `railway ssh` |
| `railway variables --json` expõe valores raw | redigir outputs |
| npm/npx ecoa comandos completos | usar binário direto (`railway`, `node`) |
| `git add apps/web` arrasta lockfile bagunçado pelo npm | restaurar de origin/main antes de commitar |
| sqlite client + typecheck = falhas ambientais | regenerar client Postgres para typecheck |
| commits pós-merge caem na main local | criar branch ANTES de tocar em arquivos |
| `SET LOCAL ROLE` fora de transação = no-op | sondas RLS devem usar BEGIN/ROLLBACK |
| `page.request` não envia CSRF em writes | buscar /auth/csrf-token |
| Fastify 400 com Content-Type json + corpo vazio | mandar `{}` |
| E2E contra produção precisa esperar deploy terminar (~5min pós-merge) | aguardar antes de testar |
