# HANDOFF-T445.md — Checkpoint de contexto (2026-09-17)

> Sessão encerrada com contexto degradado. Este handoff contém tudo que a
> sessão fresca precisa para retomar sem redescobrir nada. Ler antes de
> tocar em qualquer arquivo.

## Feito (F1 `28a92a0` · **F2 `b7563aa`** — flakes fixados `60c2198`+`684fe25`; CI 100% verde em `684fe25`)

- **schema.prisma**: `PrivacyRequest` (10 rightTypes do art. 18, status flow,
  SLA, token p/ não-usuários, deferredUntil art. 18 §3) + `CopyrightClaim`
  (formulário DMCA com workflow admin) — ambos com GRANTs app_user.
- **Migration** `20260918120000_direitos_titular/migration.sql`: DDL completo
  (tabelas + índices). Rollback em `docs/evidence/t445-rollback.sql`.
- **`create_app_user.sql`**: GRANTs das duas tabelas (regra grants — mesmo PR).
- **PR #137 DRAFT com CI verde** (security-gate, drift, gitleaks, deps, Vercel).

### F2 — API COMPLETA (b7563aa)
- **`src/modules/privacy/`**: `state-machine.ts` (cadeia ESTRITA
  recebido→em_andamento→atendido|indeferido; mesmo estado = no-op) ·
  `privacy.service.ts` (criação pública com token 48-hex; SLA
  `computeSlaDueAt` — imediato p/ confirmação/acesso, 15d ANPD demais;
  transições com decisão motivada — indeferido exige notes; deferredUntil
  art. 18 §3; fulfillment de eliminação = anonimiza titular + revoga
  sessões, workflow preservado — SOFT-DELETE SEMPRE) · `privacy.routes.ts`
  (POST público c/ auth opcional; GET status por token — projeção sem
  email/notes; admin listagem+transição com `users:manage`).
- **`src/modules/copyright/`**: service + rotas — POST público com honeypot
  (`website`, descarte silencioso) + rate-limit de rota (5/h); cadeia
  recebida→em_analise→deferida|indeferida|retirado; deferida/indeferida
  exigem resolution.
- **Audit**: ações `privacy.*`/`copyright.*` + EntityTypes novos.
- **Espelho sqlite**: 2 models adicionados.
- **12 testes de integração REAIS** (`privacy-copyright.test.ts`): CSRF,
  guardas 401/403, SLA imediato/15d, cadeia estrita 409, decisão motivada
  422, anonimização+sessões, honeypot, deferredUntil — passando no CI
  postgres. O teste loga `dbOk` no beforeAll (run sem banco = skip honesto).

## Faltando (nesta ordem)

### F3 — UI (próximo)
- `/direitos-titular`: formulário público (10 rightTypes + email) + tela de
  acompanhamento por protocolo/token; `/copyright`: formulário DMCA com
  honeypot invisível; rodapé com os 2 links; políticas v1.1 com links
  cruzados; i18n ×3 (pt-br/en-us/es-es).

### F4 — Testes complementares
- E2E browser dos formulários (criação → protocolo → status). A API já tem
  integração real (12 casos no CI).

### F5 — Reconciliação
- DECISOES `D-2026-09-XX-t445-direitos-titular` (+ protocolo
  `D-2026-09-18-checkpoint-de-contexto`) · PLANO_MESTRE WS-L 2ª camada [x] ·
  RECONCILIATION-REPORT → draft #137 vira ready → merge → smoke.

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
- **Pacote jurídico**: minuta do Thinker (dispatch de 09-16, histórico do
  chat). Atenção: `docs/LEGAL-FIELDS.md` tem apenas seções A–F — **não**
  contém §2.12/§3.7 (verificado em 09-18; não procurar lá).
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
| `.env.local` NUNCA é carregado (dotenv lê só `.env`) | testes locais: `DATABASE_URL` + `PRISMA_SCHEMA_PROVIDER=sqlite` INLINE no comando |
| Path do repo tem ESPAÇOS — URL sqlite do runtime quebra | usar `%20` ou um path sem espaços (ex.: `file:C:/Users/edina/AppData/Local/Temp/t445-e2e.db`) |
| "12/12 local" pode ser VACUOUS (dbOk=false → skips silenciosos) | o teste T445 loga `dbOk` com `--disable-console-intercept`; CI é quem valida |
| `git checkout <arquivo>` reverte TUDO não-commitado (os 2 models do espelho se perderam assim) | commitar antes de reverter arquivo |
| Flake rankings-read × ranking-algorithm (cleanup `contains 'Ranking 0-100'` apagava fixture vizinho; mesmo ano 2023) | CORRIGIDO nesta branch (`60c2198`+`684fe25`): read usa temporada `2038`; procurar ano/prefixo compartilhado em flakes futuros |
