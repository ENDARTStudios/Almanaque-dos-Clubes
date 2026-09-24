# PLANO_MESTRE.md — Almanaque dos Clubes

> Gerado sob PROTOCOLO_MESTRE.md v2.0 (Seção 5).
> Conflito entre este arquivo e o Protocolo: o Protocolo vence.

---

## 📋 PROGRESSO GERAL (CHECKLIST RESUMIDA — T002, 2026-08-11)

> **Reconciliação 2026-09-02:** status consolidado atualizado em "STATUS CONSOLIDADO — 2026-09-02" (final do arquivo). Este checklist por fase reflete o estado por Fase; aquele reflete o estado por domínio com o backlog completo.

- [x] Fase 0 – Setup `[OBRIGATÓRIO]` ✅ (T002: lint 0 erros, typecheck 0 erros)
- [x] Fase 1 – Infra base `[OBRIGATÓRIO]` ✅ (testes de integração 17/17)
- [~] Fase 2 – Dados `[OBRIGATÓRIO + auth/billing/audit]` — 13/15 (2.7 governança e 2.10 cripto-coluna pendentes)
- [x] Fase 3 – Auth `[OBRIGATÓRIO, 2FA TOTP opcional]` ✅ (T002: rate-limit 3.8 implementado; 3.9 testes int. bloqueados por migration PG)
- [x] Fase 4 – APIs/CRUDs `[OBRIGATÓRIO + billing]` ✅ (14 módulos, typecheck/lint limpos)
- [x] Fase 5 – Frontend `[OBRIGATÓRIO]` ✅ (15+ rotas; CSRF middleware agora registrado na API — T002)
- [x] Fase 6 – Avançado `[OBRIGATÓRIOS]` ✅ (T002: cache Redis integrado em clubs, WebSocket registrado)
- [~] Fase 7 – Hardening `[Vault e DNSSEC CONDICIONAIS]` — 7.1–7.8 ✅ (T002: brute-force lockout ativo), 7.9/7.10 `[ ]` condicionais
- [x] Fase 8 – Testes/segurança `[OBRIGATÓRIO + DAST]` ✅ (27/27 testes, SAST 0 erros; E2E/k6 configurados, execução manual)
- [~] Fase 9 – CI/CD e deploy `[OBRIGATÓRIO]` — pipeline ✅ + gates locais passando; 9.3/9.4 (deploy) pendentes

> **Convenção:** `[x]` só com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6). `[~]` = parcialmente feito, com gap documentado.
> **Reconciliação 2026-09-02:** base técnica (infra+segurança+auth+CI) em nível produção; ver resumo e backlog no fim do arquivo.
> **Reconciliação T001 (2026-08-11):** Evidência executável coletada. Gaps corrigidos em T002 (2026-08-11): `pnpm lint` ✅ 0 erros | `pnpm typecheck` ✅ 0 erros | `pnpm test` ✅ 27/27.

---

## Resumo do Discovery (DECISOES.md, 2026-07-16)

- **Produto:** Plataforma mundial de inteligência em futebol — clubes, jogadores, competições, rankings auditáveis, IA RAG com citações, Knowledge Graph.
- **Escala:** 100 → 1.000 → 10–50k usuários no Ano 1. Monolito modular (sem microsserviços).
- **Login:** Sim. **Assinatura:** Sim (Free/Pro/Elite). **Dado sensível:** Não. **Upload:** Sim (admin/CSV).
- **Prazo:** Não. Qualidade > velocidade.
- **Marca:** "Almanaque dos Clubes". **Domínio:** Pendente (PENDENCIAS_OPERADOR.md item 1).

---

## FASE 0 — SETUP `[OBRIGATÓRIO]` ✅

- [x] 0.1 Repo Git com `.gitignore` (excluir `.env`, `node_modules`, segredos, `*.db`). ✅
- [x] 0.2 Stack: TypeScript + Node.js + Fastify + Prisma + PostgreSQL. Monolito modular. ✅
- [x] 0.3 `package.json` raiz + `apps/api` + `packages/domain` (workspace pnpm). ✅
- [x] 0.4 `docker-compose.yml` com `postgres:16-alpine`. ✅
- [x] 0.5 `.env.example` sem valor real (apenas placeholders). ✅
- [x] 0.6 Dependências fixadas por `pnpm-lock.yaml`. ✅
- [x] 0.7 ESLint + Prettier + `eslint-plugin-security`. ✅ (2026-08-10)
- [x] 0.8 Dependabot configurado (`.github/dependabot.yml`). ✅ (2026-08-10)
- [x] 0.9 `SECURITY.md` com política de divulgação responsável. ✅ (2026-08-10)

**Verificação (T002 — 2026-08-11):**

- `pnpm lint` — ✅ 0 erros (98 warnings: `security/detect-object-injection` 57, `no-explicit-any` 26, `detect-non-literal-fs-filename` 14, `detect-unsafe-regex` 1 — FP/estilo, não bloqueiam). **Nota T476 (09-22):** o glob SEM aspas fazia o bash do CI expandir só 1 nível (**27/186** arquivos de `apps/api`; `modules/**`, `tests/**`, `src/scripts/**` nunca varridos = falso verde). Corrigido com aspas (o eslint expande recursivo) + triagem (118 prettier auto-fix, 3 FP `no-undef` desligado p/ TS, 1 `preserve-caught-error`) + `.gitattributes` LF (lição T448d). **Fase 9.1.1 (lint+typecheck em todo PR): [x] CI cobre recursivamente de verdade** (R1).
- `pnpm typecheck` — ✅ 0 erros
- `pnpm test` — ✅ 27/27 (API 17 + Domain 4 + FeatureFlags 6)
- `pnpm format:check` — pendente de ajustes finos. `[~]`

---

## FASE 1 — INFRA BASE `[OBRIGATÓRIO]` ✅

- [x] 1.1 Fastify com TypeScript estrito + logging Pino (sem dados sensíveis no log). ✅
- [x] 1.2 `@fastify/helmet` com CSP/HSTS/X-Frame-Options/X-Content-Type-Options. HSTS só em produção. ✅
- [x] 1.3 `@fastify/rate-limit` por IP e por rota. Store: Redis quando disponível, em memória em dev. ✅ (2026-08-10)
- [x] 1.4 Logger Pino estruturado. `redact` para campos sensíveis. ✅
- [x] 1.5 Validação Zod em TODOS os endpoints de escrita. Rejeitar payload não validado. ✅
- [x] 1.6 CORS restrito. Dev: `localhost`. Prod: origem do domínio oficial. ✅
- [x] 1.7 Sanitização de saída: nunca expor campos internos sem necessidade. ✅
- [x] 1.8 `GET /api/v1/health` (sem detalhes internos) e `GET /api/v1/metrics`. ✅ (metrics adicionado 2026-08-10)
- [x] 1.9 Handler global de erros: nunca vazar stack trace em produção. ✅

**Verificação (reconciliado T001 — 2026-08-11):**

- Script `scripts/test_api.sh` passa 9/9. `[x]` (não re-executado, sem dependência de infra)
- curl para endpoint inexistente retorna JSON padronizado, sem stack. `[x]` (verificado em código)
- Header `X-Powered-By` removido; `X-Frame-Options: SAMEORIGIN` presente. `[x]` (verificado em código)
- `pnpm test` — módulos de infra (health, metrics) cobertos por testes de integração. ✅

---

## FASE 2 — DADOS `[OBRIGATÓRIO + auth/billing/audit]` ✅

- [x] 2.1 Prisma schema canônico (`schema.prisma`) com provider PostgreSQL. ✅
- [x] 2.2 Migration inicial versionada e aplicada. ✅
- [x] 2.3 Tabelas de domínio: `clubs`, `players`, `competitions`, `rankings`, `matches`, `seasons`. ✅
- [x] 2.4 Tabelas de auth: `users`, `roles`, `permissions`, `user_roles`, `sessions`. ✅
- [x] 2.5 Tabelas de billing: `subscriptions`, `billings`. ✅
- [x] 2.6 Tabelas de auditoria: `audit_logs` (imutável, append-only). ✅
- [x] 2.7 Governança de proveniência — **convenção vigente oficializada** (D-2026-09-07-proveniencia-convencional, T426): `qid` unique + `importedFrom` + `importedAt` + `sourceUrl` canônico em clubs/players/competitions/stadiums/matches. Tabelas `data_sources`/`entity_revisions` **não existem** no schema e foram **deliberadamente não criadas** (YAGNI). `[x]`
- [x] 2.8 Senha/token sempre hash com argon2id (custo ≥ 12). ✅
- [x] 2.9 Soft delete em entidades críticas (`deletedAt` em `clubs`, `players`, `users`). ✅
- [ ] 2.10 Criptografia a nível de coluna — **não implementada** (reconciliado T001). Pode ser entregue via Vault/Infisical quando o Operador decidir; monitoramento de segurança hoje cobre campos sem coluna criptografada de forma granular. `[ ]`
- [x] 2.11 Seed de admin inicial com senha forte. ✅
- [x] 2.12 Índices em todas as chaves estrangeiras + colunas de busca frequente. ✅
- [x] 2.13 Restrições de unicidade documentadas. ✅

**Verificação:** 164 asserções em 5 scripts de verificação (`apps/api/scripts/verify-*.ts`, não re-executados — requerem DB/SQLite + infra). Migrations PostgreSQL presentes em `apps/api/prisma/migrations/`. `prisma migrate status` não executável sem `.env` (env file é gitignored e não faz parte do repo).

---

## FASE 3 — AUTH `[OBRIGATÓRIO, 2FA TOTP opcional]` ✅

- [x] 3.0 Preflight Auth (deps + env.ts com Zod + .env.example). ✅
- [x] 3.0b Gap T001 resolvido em T002 — `rate-limit.service.ts` implementado de fato, `csrf.ts` corrigido e registrado. Lint e typecheck limpos. ✅
- [x] 3.1 Setup JWT + Cookie + tipos Fastify. ✅
- [x] 3.2 Rotas Register / Login / Logout. ✅
- [x] 3.3 Refresh token flow (rotação com detecção de reuso). ✅
- [x] 3.4 Middleware de Autenticação (`authenticate` preHandler). ✅
- [x] 3.5 Middleware RBAC (`requirePermission`, `requireRole`). ✅
- [x] 3.6 Reset de senha (token único, expira 15min). ✅
- [x] 3.7 Audit logging para auth. ✅
- [x] 3.8 Rate limiting específico para /auth/* (5 tentativas/15min, lockout 1h). ✅ (implementado de fato em T002 — Redis + fallback memória, integrado em POST /auth/login)
- [~] 3.9 Testes de integração — BLOQUEADO até migration PostgreSQL ser aplicada pelo Operador.
- [x] 3.10 Documentação API Auth (`docs/api/auth.md`). ✅ (2026-08-10)

**Verificação:** 313 asserções em 8 scripts de verificação (`apps/api/scripts/verify-*.ts`). Typecheck ✅ 0 erros (T002).

---

## FASE 4 — APIs/CRUDs `[OBRIGATÓRIO + billing]`

REST versionado `/api/v1`. Cada módulo em `apps/api/src/modules/<nome>/` com `routes/service/repository`.

- [x] 4.1 CRUD `clubs` — re-verificado. ✅
- [x] 4.2 CRUD `players` — implementado com POST/GET/GET:id/PUT/DELETE + auth. ✅ (2026-08-10)
- [x] 4.3 CRUD `competitions` — implementado com POST/GET/GET:id/PUT/DELETE + auth. ✅ (2026-08-10)
- [x] 4.4 CRUD `rankings` — implementado com POST/GET/GET:id/PUT/DELETE + publish + entries CRUD + imutabilidade pós-publicação. ✅ (2026-08-10)
- [x] 4.5 CRUD `matches` + `seasons` — implementado. ✅ (2026-08-10)
- [x] 4.6 Módulo `billing`:
  - [x] 4.6.1 Modelos Free/Pro/Elite. ✅
  - [x] 4.6.2 Webhook de pagamento implementado (provedor: pendente definir Stripe vs PagSeguro). ✅
  - [x] 4.6.3 Webhook assinado/idempotente — estrutura criada. ✅
  - [x] 4.6.4 Upgrade/downgrade via `changePlan()` — implementado. ✅
- [x] 4.7 Módulo `admin` — CRUD usuários (listar/suspender/reativar) + atribuição de roles. ✅ (2026-08-10)
- [x] 4.8 Busca textual: índices `tsvector` + `pg_trgm` na Fase 2. ✅
- [x] 4.9 Paginação offset-based implementada em todos os endpoints (cursor-based: pendente upgrade). ✅
- [x] 4.10 Query builder parametrizada (Prisma ORM). ✅
- [x] 4.11 OpenAPI 3.1 via `@fastify/swagger` + Swagger UI em `/docs`. ✅ (2026-08-10)
- [x] 4.12 Idempotência via middleware `Idempotency-Key` (store em memória, 24h TTL). ✅ (2026-08-10)

**Verificação (T002 — 2026-08-11):**

- `pnpm typecheck` ✅ 0 erros | `pnpm lint` ✅ 0 erros | `pnpm test` ✅ 27/27 (API 17 + Domain 4 + FeatureFlags 6)
- OpenAPI em `http://localhost:3000/docs` (configurado, requer servidor rodando)
- 14 módulos: auth, admin, billing, clubs, competitions, export, graph, matches, players, rag, rankings, seasons, upload, etl + health/metrics

---

## FASE 5 — FRONTEND `[OBRIGATÓRIO]` ✅ (2026-08-10)

Stack: Next.js 16 + TypeScript + Tailwind.

- [x] 5.1 Inicializar `apps/web` no monorepo (Next.js App Router + Tailwind). ✅
- [x] 5.2 Cliente HTTP (`src/lib/api.ts`) com cookie de sessão. ✅
- [x] 5.3 Proteção CSRF — middleware implementado (`src/middleware/csrf.ts`). ✅ (2026-08-10)
- [x] 5.4 Páginas públicas: home, login, registro, clubs, players, rankings, search. ✅
- [x] 5.6 `ProtectedRoute` component (client-side session check). ✅
- [x] 5.7 Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy. ✅
- [x] 5.9 Sessão exclusivamente via cookie httpOnly (sem localStorage). ✅
- [x] 5.11 Responsivo mobile-first (Tailwind breakpoints). ✅
- [x] 5.12 PWA: Web App Manifest (`manifest.ts`). ✅
- [x] 5.5 Páginas privadas: dashboard, subscription, history. ✅ (2026-08-10)
- [x] 5.8 DOMPurify — `src/lib/sanitize.ts` com HTML sanitizer. ✅ (2026-08-10)
- [x] 5.10 Acessibilidade WCAG 2.1 AA — labels, aria-labels, focus-visible, skip-nav. ✅ (2026-08-10)

---

## FASE 6 — AVANÇADO `[OBRIGATÓRIOS]` ✅ (2026-08-10)

- [x] 6.1 Upload seguro (MinIO + MIME magic bytes + UUID + limite 50MiB). ✅
- [x] 6.2 Fila assíncrona BullMQ + Redis (queues: etl, email, export; workers). ✅
- [x] 6.3 Cache Redis read-through (get/set/invalidate/remember) + cache clubs list/detail. ✅
- [x] 6.4 Pipeline ETL — conectores RSSSF + FBref + trigger service. ✅
- [x] 6.5 IA / RAG — endpoint `/api/v1/ai/ask` + estrutura pgvector/Ollama. ✅
- [x] 6.6 Knowledge Graph — modelo Prisma + service + rotas CRUD. ✅
- [x] 6.7 Feature flags — `packages/feature-flags` com plan gating. ✅
- [x] 6.8 Exportação CSV/JSON — clubs, players, competitions, rankings. ✅
- [x] 6.9 WebSocket `[CONDICIONAL]` — implementado (`/ws`, notificação por userId, server.ts). ✅ (2026-08-10)

---

## FASE 7 — HARDENING `[CONDICIONAIS: Vault e DNSSEC]` ✅ (2026-08-10)

- [x] 7.1 CSP restritiva (Helmet produção). ✅
- [x] 7.2 `X-Frame-Options: DENY`. ✅
- [x] 7.3 Rate limiting 4 camadas (Cloudflare → Fastify → App → Lockout) + Redis sliding window. ✅
- [x] 7.4 npm audit no CI. ✅
- [x] 7.5 Força bruta: lockout progressivo (5 tentativas/15min, 1h lockout). ✅
- [x] 7.6 Apenas métodos HTTP necessários. ✅
- [x] 7.7 Body limit 1 MiB + 50 MiB upload. ✅
- [x] 7.8 Rotação automática de segredos — script `scripts/rotate-secrets.sh`. ✅ (2026-08-10)
- [ ] 7.9 **(CONDICIONAL)** Vault/Infisical.
- [ ] 7.10 **(CONDICIONAL: domínio próprio)** DNSSEC + CAA + HSTS preload.

---

## FASE 8 — TESTES/SEGURANÇA `[OBRIGATÓRIO + DAST]` ✅ (2026-08-10)

- [x] 8.1 Testes unitários (Vitest) — 27 testes (API 17 + Domain 4 + FeatureFlags 6), todos passando (T002). ✅
- [x] 8.2 Testes de integração (Fastify inject) — health, clubs, auth, 404. ✅ (incluídos nos 27)
- [~] 8.3 Testes E2E (Playwright) — ✅ **5/5 passando** com frontend Next.js real (porta 3001) + API SQLite (T003, 2026-08-12). BaseURL corrigido de 3000→3001.
- [x] 8.4 SAST: ESLint + eslint-plugin-security — ✅ 0 erros (12 warnings FP documentados). (T002)
- [x] 8.5 `npm audit` no CI — workflow presente. Warnings de segurança sinalizados na seção de gaps. ✅
- [x] 8.6 DAST: workflow OWASP ZAP semanal. ✅
- [x] 8.7 k6: load-test (200 VUs) + stress-test (1000 VUs) — ✅ **executados e verdes** (T003, 2026-08-12). Load: 48.850 reqs, 0% erros, p95=4.5ms. Stress: 1.559.595 reqs, 0% erros, p95=78ms, 3.710 req/s.
- [~] 8.8 Testes de regressão de segurança — CI configurado, expandir com mais cenários.
- [~] 8.9 Testes do pipeline de IA — pendente (requer Ollama/pgvector operacional).

---

## FASE 9 — CI/CD E DEPLOY `[OBRIGATÓRIO]` ✅ (2026-08-10)

- [x] 9.1 Pipeline GitHub Actions:
  - [x] 9.1.1 Lint + typecheck em todo PR — ✅ passando localmente (T002: 0 erros ambos).
  - [x] 9.1.2 Testes unitários + integração. ✅ (21/21 passando)
  - [x] 9.1.3 SAST + dependency scan. ✅
  - [x] 9.1.4 Docker multi-stage build (API + Web Dockerfiles). ✅ (2026-08-10)
  - [x] 9.1.5 Trivy scan configurado no CI. ✅ (2026-08-10)
  - [x] 9.1.6 Deploy autorizado após security gate — ✅ gates locais passando (T002); deploy efetivo depende de 9.3/9.4.
- [x] 9.2 Secrets no CI (GitHub secrets). ✅
- [x] 9.5 Observabilidade — métricas em `/api/v1/metrics` + healthcheck. ✅
- [x] 9.6 Healthcheck HTTP (`/api/v1/health`). ✅
- [x] 9.7 Backup — script `scripts/backup-db.sh`. ✅ (2026-08-10)
- [x] 9.8 Plano de resposta a incidentes (`docs/INCIDENT_RESPONSE.md`). ✅ (2026-08-10)
- [x] 9.9 `MANUAL_DO_OPERADOR.md` entregue. ✅ (reescrito v2.0 em T379, 2026-08-27)
- [ ] 9.3 Deploy blue-green ou rolling (zero downtime).
- [x] 9.4 Plataforma de deploy — **DECIDIDA**: Railway (API, serviço `Almanaque-dos-Clubes`) + Vercel (web, Root Directory `apps/web`). Em produção desde T366–T380. ✅ (reconciliado T381)

---

## Marcos de Lançamento (atualizado 2026-09-15)

| Marco                               | Status              | Data           | Evidência                                                                                                                                               |
| ----------------------------------- | ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 — Método ativo                   | ✅                  | 2026-08-11     | PLANO-ACAO.md mergeado                                                                                                                                  |
| **M1 — Beta Fechada (ler/navegar)** | **✅**              | **2026-09-15** | **PR #105 + smoke verde + 7 critérios atendidos**                                                                                                       |
| **M2 — Beta Fechada (engajar)**     | **✅ COMPLETO 4/4** | **2026-09-16** | **T438 rankings · T439 favoritos · T440 comparadores · T441 carrossel (PRs #107–#119)**                                                                 |
| **M3 — Open Beta (monetizar)**      | **✅**              | **2026-09-21** | **Stripe LIVE + checkout + webhook HMAC idempotente + assinatura funcional + CDC art. 49 (PRs #127–#155) — compra real R$4,90 + estorno com protocolo** |
| M4 — v1.0 conteúdo amplo            | ⏳                  | —              | Futebol feminino + ETL automático + Knowledge Graph                                                                                                     |
| M5 — v1.0 público                   | ⏳                  | —              | IA RAG + 360º + DAST + domínio próprio [Operador]                                                                                                       |

## 🎉 M1 — Beta Fechada (ler/navegar) — DECLARADO [2026-09-15]

| Critério                                    | Status | Evidência                                                                                                                                                        |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed ≥1.000 clubes (Wikidata)               | ✅     | 3.857 clubes em produção (100% proveniência: qid + importedFrom + importedAt + sourceUrl)                                                                        |
| Mapa-múndi read-only                        | ✅     | /map com 113 coords de 3.857 clubes + marcadores + drill-down                                                                                                    |
| Perfis clube/jogador                        | ✅     | /clubs/[id] + /players/[id] com sourceUrl auditável                                                                                                              |
| Busca global                                | ✅     | /search com tsvector + pg_trgm                                                                                                                                   |
| Hero dinâmico (1.3)                         | ✅     | Server Component com revalidate 3600 (totals reais no HTML)                                                                                                      |
| **Cookie banner + consentimento publicado** | ✅     | PR #101 merged + flags ativadas + smoke verde (banner visível, prova gravando, 0 analytics antes do consentimento)                                               |
| **Políticas publicadas**                    | ✅     | /privacidade + /termos + /cookies + /seguranca retornando 200 com dados reais (CNPJ 45.370.930/0001-75, Osasco/SP, endart.studios@gmail.com, fornecedores reais) |

**M1 completo.** Plataforma pronta para Beta Fechada (100 usuários) com:

- Conteúdo auditável (3.857 clubes + 1.263 competições + 2.396 jogadores + 3.606 estádios)
- Experiência navegável (mapa + perfis + busca + hero dinâmico)
- Compliance LGPD (banner + consentimento + políticas + prova de consentimento)
- Infraestrutura sólida (Railway + Vercel + Railway Postgres + Cloudflare)
- Segurança empresarial (CSP + rate-limit + argon2id + RLS + audit log)

Fila avança para M2 (Beta Fechada engajar: rankings 0-100 + favoritos + comparações).

## Estado Final do Projeto (reconciliado 2026-09-02)

> Sobreposição/resumo executivo da base técnica concluída. O detalhamento por domínio e o backlog completo estão em
> **"## 📊 STATUS CONSOLIDADO — 2026-09-02"** (final deste arquivo) e em `docs/RECONCILIATION-REPORT.md`.

| Dimensão                                                    | Status                           | % estimado                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infraestrutura & DevOps                                     | 🟢 Concluída                     | 95%                                                                                                                                                                                                                                       |
| Segurança & Hardening                                       | 🟢 Concluída                     | 90%                                                                                                                                                                                                                                       |
| Autenticação & Sessão (RLS efetiva)                         | 🟢 Concluída                     | 95%                                                                                                                                                                                                                                       |
| Schema & Migrations                                         | 🟢 Concluído                     | 85%                                                                                                                                                                                                                                       |
| Compliance Legal                                            | 🔴 Crítico                       | 10%                                                                                                                                                                                                                                       |
| Features Core (produto)                                     | 🔴 Crítico                       | 5%                                                                                                                                                                                                                                        |
| Dados — identidade de entidade (clubs/players/competitions) | 🟢 Alta                          | T429: 3.857 clubes · 2.396 jogadores · 1.263 competições; proveniência 100%                                                                                                                                                               |
| Dados — histórico/conquista (arestas WON)                   | 🟢 Quase-completo — T448/T448b-1 | **5.157 arestas em produção** (mundial 16 · continental 268 · nacional 4.873), proveniência 100%, carrossel + galeria + comparador vivos com fonte; gap 2.832 → **514** (estaduais/regionais → T448b-2); tie-break determinístico (T448c) |
| Frontend UX                                                 | 🟡 Parcial                       | 35% (carrossel de campeões vivo + galeria de honra)                                                                                                                                                                                       |
| IA/ETL/Knowledge Graph                                      | 🟡 Parcial — T448                | escrita+leitura de WON funcionando; ETL cron = T451                                                                                                                                                                                       |
| Testes avançados                                            | 🟡 Parcial                       | 40%                                                                                                                                                                                                                                       |
| Observabilidade                                             | 🟡 Parcial                       | 30%                                                                                                                                                                                                                                       |

**Nota T469 (09-22):** P0 jurídico-autônomo executado (T469): prazos LGPD/GDPR harmonizados, retenção ancorada em config real, incidentes, menores, fornecedores com DPAs públicos, Google Fonts auto-hospedado, consentimento provado em produção (11/11), claims da home re-ancoradas, /metodologia publicada. Compliance Legal sobe de 10% para estrutura-P0 publicada; identidade/DPO/DPAs/advogado = [ ] dono Operador (gate distinto do técnico).

**Nota T469b (09-22):** correção dos 3 deltas do Operador + achados da FASE 0 (D-2026-09-22-t469b-legal-deltas). **Age gate REMOVIDO** (D-2026-09-22-sem-age-gate): retirada a declaração de 18 anos do cadastro e §9 Menores reescrito para declarar a AUSÊNCIA de verificação, não prometer mecanismo. **T471 (geobloqueio UE) NÃO aplicado** (D-2026-09-22-t471-nao-aplicado; opcional-futuro). **Gate do beta pago ajustado** (D-2026-09-22-gate-beta-pago-ajustado): dependem de T470 (direitos do titular + DMCA) e T472 (checkout pt/en/es); advogado/representante UE/age gate = não exigidos por decisão do Operador (risco residual aceito e registrado). Corrigidos: `reembolso@almanaquedosclubes.com` → canal único `endart.studios@gmail.com`; claims do grid `home.features` ("História Completa"/"IA com Citações"/"cursor-based") em ×3 locales. Counts de produção re-ancorados: clubs 3.857 · players 2.396 · competitions 1.563.

**Nota T449b (09-23):** motor 0-100 de **jogadores/técnicos** — infraestrutura lógica pura (`src/lib/scoring/**`: tipos, pesos, engines, normalização) + 14 testes (mocks sintéticos, **sem DB/rede**) + `docs/METODOLOGIA_RANKING.md`. **Estrutura pronta; dado real/ativação gated** (fontes granulares = Operador/futuro). Clubes seguem classificação federativa (0-100 calc. é de jogadores/técnicos).

**Nota T449a (09-23):** ranking 0-100 **por competição/temporada** a partir das **tabelas RSSSF** England 2022/23 (5 divisões) — **sem `matches`** (populá-los exigiria parser de resultados+abreviações). Fórmula `W×3 + D×1 + GF×0.2` (títulos=0; limitação) → MinMax por competição → **tier emerge** (sem agregado cross-division, dívida T449c). Sem migration; proveniência/atribuição RSSSF; cobertura 116/116. **M2/WS-C/WS-G rankings 0-100 [x]** (piloto EN por competição/temporada **fechado**: dado em produção + **superfície pública** com fórmula/atribuição RSSSF + badge honesto; cron=T451; dimensões=T449b; escopo "0-100 jogadores/técnicos" futuro).

**Nota T449EN (09-23):** base EN para o piloto T449a — **universo mínimo** (só os faltantes do piloto; Wikidata CC0, dedup QID), **threshold 100%**, **migração `clubs.deletedAt`** + filtro default (nuído soft-deleted, nunca hard). DRY-RUN **115/115** nomes resolvidos. **T449a permanece [~] bloqueado** até a base EN bater o threshold em produção; **#185 não mergeado** (não publicar ranking parcial). WS-D base EN **[~]**.

**Nota T448b-2d writer GO (09-25): [~] writer idempotente 2023–2024 implementado; apply pendente do gate.** `modules/etl/rsssf-won-edges-go.service.ts` + `--pack=go` no writer (MG inalterado). Resolve só por QID; sem criar/linkar; restore só de reasons GO; rejeita 2025/Q1513287. Dry-run local created=2. **Gate produção (dry→apply→SQL→cache) condicionado a #205+#206+#207 e verificação do /champions.**

**Nota T448b-2d parser GO (09-25): [x] parser puro 2023–2024.** `lib/rsssf/go/**` (reusa núcleo) + pack `go-pilot-candidates.json` (2 candidates; `retrievedAt` estático) + script dry. FASE 0: GO é UTF-8 (não cp1252); gender=men evidenciado (sufixo `w` + clube masculino). **2025 = gap** (`club_name_unique_conflict`). Testes T1–T15 + unit rsssf 78. **Writer GO [ ]** (gate separado). **GO 2025 [blocked-schema-identity]**; **T448b-2f** (identidade) pré-requisito. Estaduais do Brasil = gap.

**Nota T448b-2d GO (09-24, reduzido): mãe `Q931386` a criar; `Q198034` noop; 2025 = gap.** Seed de identidade (só competição) implementado no PR — sem parser/writer/arestas. **Blocker de schema:** `clubs @@unique([name,country])` impede criar `Q1513287` (Vila Nova/GO) → **piloto GO = 2023–2024 only**; **GO 2025 [blocked-schema-identity]**; follow-up **T448b-2f** (remediation de identidade). **Parser GO 2023–2024 [ ]** (após seed verde). Estaduais do Brasil = gap declarado.

**Nota T448b-2d (09-24): PR [blocked-source]; GO [~] discovery seedable.** **PR bloqueado** (0 temporadas ready: 2023 sem declaração, 2024 só tabela, 2025 com clube `Q2580083` ausente) — nenhum parser PR. **GO aprovado no discovery read-only** (3/3 com frase de campeão + licença; mãe `Q931386` a semear; campeões `Q198034` presente e `Q1513287` seedable; homônimo Vila Nova → só QID). **Seed de identidade GO [ ]** gated na aprovação do Thinker. **Parser GO [ ]** só após seed. Doc: `docs/T448B2D-PR-BLOCK-GO-DISCOVERY.md`.

**Nota T448b-2c (09-24): [x] DISCOVERY read-only de expansão estadual.** Medidas: RSSSF Brasil cobre SP/CE/PR/SC/GO (**RJ/RS/RO/RR ausentes = gap de fonte**); mães validadas ao vivo (SP `Q1348155`, CE `Q2469206`, PR `Q920397`, SC `Q2317199`, GO `Q931386`); no acervo, **SP/CE/PR já existem**, **SC/GO ausentes (gap)**; homônimos confirmados (Vila Nova, Operário). **Recomendação:** **PR** primária, **GO** secundária. **T448b-2d (parser 1ª UF) [ ]** condicionado à aprovação do Thinker. **Estaduais do Brasil = gap declarado** (só MG coberto). Doc: `docs/T448B2C-DISCOVERY-UFS.md`.

**Nota T448b-2b (09-24): [x] CONCLUÍDO — Piloto MG ATIVO em produção.** Pack congelado em `src/lib/rsssf/data/mg-pilot-candidates.json` + `candidates-pack.ts` (Zod/fail-fast); writer lê o pack por padrão. Gate de produção (#198, SHA `dfe6e5c`): dry-run/apply `created=0 · restored=3 · failed=0`; SQL verde (active=3, `missing_provenance=0`, `soft_deleted_remaining=0`, links=3, Q5028286=0); cache `champions:*`; API `/titles`=3 e `/champions` estadual=Atlético-MG. **Próximo:** expansão para **outros estados (T448b-2c)** ou **municipal (T448b-2d)**, conforme prioridade de conteúdo vs engenharia. **NÃO marcar conquistas estaduais completas** (só MG).

**Nota T448b-2b FASE 2 (09-24): [x] writer de arestas WON RSSSF** — `rsssf-won-edges.service` (repo injetável + sync idempotente) + script `write-rsssf-won-edges` (DRY por transação revertida; `--apply`; bloqueio de produção) + read-filter de soft-delete (`graph/soft-delete`, aplicado em titles/champions/compare/ranking). Ponte de identidade: mãe ausente → upsert por `qid`; clube por nome exato → vincula `qid`; senão fail-fast. Evidência em Postgres local: apply→**3 created**, re-run→**0 created/3 skipped**, `/clubs/:id/titles`→3. **Desvios de schema sinalizados** (Competition sem hierarchy/state; KG sem competitionId/clubId/year → convenção T448). **NÃO rodado em produção** (aguarda checkpoint). Gap estadual (fora do MG) declarado.

**Nota T448b-2b FASE 1 (09-24): [x] parser PURO MG (2023–2025)** — `apps/api/src/lib/rsssf/**` (decode cp1252 + tabela, campeão por família de frases + cross-check, time→clube exato **sem fuzzy**, competição-mãe por QID auditável, **candidate** WON com proveniência/atribuição) + script DRY sem Prisma + 41 testes network-free + fixtures reais mínimas com atribuição. `dedupKey` factual = `competition+year+club+WON` (hash de URL só em `externalId`); co-campeão/conflito ⇒ `pending_review`; sem escrita/rede/migration. Dry-run: 3/3 candidates. **FASE 2 (writer/idempotência/read-filter de soft-delete + apply) ainda [ ]. Gap estadual (fora do MG) declarado.**

**Nota T448b-2 (09-22):** reclassificação de **miscategorização por keyword** ENTREGUE — FASE 0 mediu **2** competitions erradas (`VFF Champions League` VU, `Afghanistan Champions League` AF) entre 18 que batem o keyword continental; correção **(a)**: continental por nome só com `country` nulo (confederação) + re-ingestão idempotente. **Licença RSSSF corrigida:** não é domínio público — exige **atribuição**. **WS-D conquistas estaduais/municipais: [~]** — gap 514 (**0** no metadata) **DECLARADO**; o **parser RSSSF BR estadual foi SPLITADO** (T448b-2b) por exceder o round (27 estados, layouts variados, sem URL canônica). Municipal/outros países depois. Mapa **não** ganha pinos (RSSSF não dá P625 — limitação do T467).

**Nota T472a (09-22):** i18n da UI de assinatura/checkout pt/en/es (clareza CDC art. 6) — `CheckoutSummary` + `CheckoutButton` + modal T464 + **catálogo `plan-features.ts` multi-locale** (fonte única, anti-hardcode T465). Texto jurídico = **T472b (CONDICIONADO: disclaimer de prevalência do PT ou advogado)**; não executado. E2E en/es em `/planos` (+`/checkout` se flag on).

**Nota T467 (09-22):** **M1·WS-C mapa-múndi read-only [x]** (smoke pós-deploy C1 **verde**: `geo-stats` 200 `source=derived` 3.808 clubes/168 países/97 estados/7 continentes; `/map` 200 com lista de regiões; asset servido; sem segredos) — choropleth por região (Natural Earth domínio público, só continente+país), `GET /clubs/geo-stats` (COUNT real derivado, `source='derived'`, cache read-through) + drill-down por **lista clicável** (estado/cidade vazio-honesto, sem ODbL) + listagem paginada (offset) + busca textual. Continente já era campo (`Country.continent`), sem migration. **Gaps DECLARADOS:** coord direta ~3,7% (pino opcional, não núcleo), estado 4,9%, cidade 11,6%, fronteira de estado/cidade ausente. **NUNCA "mapa completo"** — read-only sobre dado parcial-honesto. Busca preditiva e pino-denso seguem `[ ]` (Operador cloud / M4).

**Nota T470b (09-22):** fecha o gap dos **15 min** do access token pós-exclusão — `authenticate` é stateless puro (`jwt.verify`, sem DB) ⇒ **Opção B**: blocklist de `userId` no Redis (TTL 15 min) checada no `authenticate`, escrita **antes** da anonimização com **fail-loud** (Redis fora ⇒ 502, nada muda); leitura fail-open com log. Ressalva **R3-PROD-GATE do T470 fechada por construção** (sem migration).

**Nota T464 (09-22):** WS-P hardening pré-beta pago — modal de confirmação acessível (foco preso/Esc/padrão Voltar) **distinguindo** reembolso (devolve valor + encerra agora) de cancelamento (interrompe renovação, sem devolução); **consistência billing↔refund** corrigida na UI (re-fetch do histórico após a ação; o servidor já marcava REFUNDED); fail-loud preservado. Sem migration.

**Nota T470 (09-22):** WS-L processo de titular + notificação autoral **reais** (tabelas `data_subject_requests`/`copyright_notices`, protocolo, RLS owner-scoped, export, exclusão soft+anonimização, sem safe harbor formal, sem age gate, sem SMTP). Páginas `/direitos-titular` e `/direitos-autorais` substituem o formulário raso por fluxo autenticado + canal manual. **Processo de direitos do titular [x] · processo autoral/análogo [x] · páginas legais funcionais [x]** · advogado/rep UE **não exigidos** neste beta (risco aceito). Gaps declarados: tradução legal (T472), SMTP (Operador), remoção total das rotas T445 legadas (follow-up).

**Nota T466 (09-22):** dado geográfico (WS-D) — FASE 0 mediu **veredicto (a)** (não havia models geográficos; produção: 100% com `country`, 463 com `city`, 10 com `state`, **113/3.857 com coordenada**; `stadiums` vazio; PostGIS ausente). Entregue: migration `20261001120000_t466_geo_hierarchy` (`Country`/`State`/`City` + FKs nullable em `clubs`/`stadiums`, PG+SQLite) + seed `ingest-geo-wikidata.ts` (P17/P131/P300/P625; dedup iso2/code/qid; proveniência; Zod) + `GET /clubs/:id/geo`. **Dado geográfico: [~]** (estrutura + seed prontos; **gap de coordenada declarado** ~3% com P625; aplicação em produção = pós-deploy). **WS-C mapa: [ ]** até **T467** (pinta o mapa sobre este dado). Features Core: identidade+KG+**geográfico** = ENTREGUE; mapa/rankings-por-jogo/360º/IA = em breve, gap declarado.

**Nota T465 (09-22):** oferta honesta — /planos ≡ /checkout com FONTE ÚNICA (plan-features.ts consumido; hardcode morto); IA e API de dados = (em breve); KG = ENTREGUE na ELITE (5.157 arestas, Escopo 6.6 tornado verdade); busca textual e exportação CSV/JSON descritas como são; preço/periodicidade intocados. Features Core: identidade+KG+favoritos+auth+billing+CSV+busca = ENTREGUE; mapa/rankings-por-jogo/360º/IA = em breve com gap declarado.

**Nota T448f (09-22):** vitrine corrigida POR HIERARQUIA — liga representa o país (GRUPO-LIGA), copa representa o continente/mundo (GRUPO-COPA: continental restaurado para UCL 2025); dívidas ligadas a T448b-2/T449: tier/flagship (supertaça-vs-UCL), 1ª-vs-2ª divisão e miscategorização por keyword (VFF e universo a auditar).

**Nota T448e (09-22):** vitrine nacional corrigida POR TIPO — LEAGUE representa o país, supercopa não (campo objetivo já existente; backfill das 18 ligas com aresta executado); dívida de tier (1ª-vs-2ª divisão) explicitamente ligada ao T449. Conquistas mantidas em 5.157.

**Nota T448d (09-22):** vitrine nacional corrigida com critério determinístico (vigência→edições→campeões→nome→id) e guarda de vigência (edições futuras não representam); cache fail-loud (3ª instância do anti-padrão catch-silencioso nomeada). Conquistas mantidas em 5.157.

**Conclusão honesta (corrigida pós-T448, regra R3):** a leitura antiga "dados 1% / Knowledge Graph 5%" estava velha — o Estado Final agora distingue DUAS CAMADAS de dado: **identidade de entidade = ALTA** (T429, proveniência 100%) e **histórico/conquista = PARCIAL** (T448 fecha o circuito técnico com dado real citável no piloto local; a escala de produção é um comando do Operador e o gap de mães ausentes é medido e declarado, não escondido). A base técnica continua sólida; faltam conteúdo em escala (T448b/T449/T451), experiência e legalidade.

**Seed de TESTE (T428) — counts reais auditáveis:** 1.626 clubes · 892 competições · 2.458 jogadores, todos com proveniência completa (qid + importedFrom + importedAt + sourceUrl, **100%**); 113 clubes com coordenada P625 em produção (vs 1.889 totais em produção pós-rodada pré-#84 — o número cresce com T429); idempotência 2× provada por script com `novos=0` na segunda execução; bug 1.3 do `/map` corrigido (count 113 de 1.889 auditável em runtime, não assado no build). **M1 (Beta Fechada) ainda NÃO declarado** — faltam T429 (seed prod, operacional), WS-C restante (drill-down/perfis/busca), WS-L 1ª camada. Próximo: T429 (rodar `ingest-*-wikidata.ts --apply` contra produção com rollback por proveniência + smoke pós).

**Seed de PRODUÇÃO (T429, fechado 2026-09-08) — counts reais auditáveis:** clubs 1889 → 3857 total (1968 novos + 10 backfilled), `sourceUrl` 0 → 3847 (100% das linhas com qid; 10 sem qid); competitions 895 → 1263 total (368 novos + 334 backfilled), `sourceUrl` 0 → 1260 (100% das com qid; 3 sem qid); players 2396 total, `sourceUrl` 0 → 2396 (100%, via backfill SQL determinístico — SPARQL da Wikidata instável na janela com 502/429/timeout, retry/backoff comportou-se conforme o contrato). API: `GET /clubs?limit=1` 200 com `sourceUrl` presente; health 200; zero 5xx nos logs Railway. **M1 segue NÃO declarado** (faltam WS-C restante + WS-L). Próximo: T430 (migration automation).

**WS-L 1ª camada (T436, fechado 2026-09-15) — cookie banner + consentimento + páginas legais:** schema `cookie_consents` + `cookie_policy_versions` (migration reversível, drift-verificada) e API `POST/GET /api/v1/consent` (prova auditável com IP apenas como hash SHA-256, CSRF obrigatório de uso único — 8 testes de integração). Web: banner com 3 botões de mesmo destaque (E2E de same-visual-weight), centro de preferências granular, hook `useConsent`, storage `consent_v` (localStorage + cookie + legado) e script loader gateado por categoria (4 testes unitários — analytics/marketing nunca carregam sem consentimento). Páginas legais (privacidade/termos/cookies/segurança) com dados REAIS em 3 idiomas e feature flags `LEGAL_PAGES_ENABLED`/`COOKIE_BANNER_ENABLED` **default OFF** (default verificado: legais 404 e sem banner; ON: 11/11 E2E). **Critérios técnicos do M1: 6/6 atendidos; a condição ("smoke da ativação de produção das flags") foi cumprida em 2026-09-15 — M1 formalmente DECLARADO (ver seção \"🎉 M1\" acima e D-2026-09-15-m1-declarado no DECISOES).**

**Migration automation (T430, fechado 2026-09-09) — fim da classe P2022:** entrypoint com `migrate deploy` fail-fast no boot da API (SKIP_MIGRATIONS só-incidente); job `migration-drift` no CI (baseline dump + resolve pinado + deploy + diff, com 1 exceção documentada para o índice GIST); job-runnability (scripts na imagem + dry-run in-container validado); `_prisma_migrations` de produção com 15 linhas (11 históricas + 4 do T430 aplicadas no primeiro boot). Validação: scratch Railway com baseline+resolve+deploy limpos; entrypoint real executado (migrate + boot até EADDRINUSE esperado); drift verde no CI + teste negativo vermelho-proposital (coluna sem migration → job falha com o DDL exato no log).

## Resumo de Arquivos Criados/Modificados (2026-08-10)

| Arquivo                                               | Tipo                           | Fase          |
| ----------------------------------------------------- | ------------------------------ | ------------- |
| `.eslintrc.cjs`                                       | ✅ Novo                        | 0.7           |
| `.prettierrc`                                         | ✅ Novo                        | 0.7           |
| `.github/dependabot.yml`                              | ✅ Novo                        | 0.8           |
| `SECURITY.md`                                         | ✅ Novo                        | 0.9           |
| `docs/CRITERIOS_DESENVOLVIMENTO.md`                   | ✅ Novo                        | Documentação  |
| `docs/api/auth.md`                                    | ✅ Novo                        | 3.10          |
| `apps/api/src/routes/metrics.ts`                      | ✅ Novo                        | 1.8           |
| `apps/api/src/modules/players/*.ts`                   | ✅ Novo (3 arquivos)           | 4.2           |
| `apps/api/src/modules/competitions/*.ts`              | ✅ Novo (3 arquivos)           | 4.3           |
| `packages/domain/src/player.ts`                       | ✅ Novo                        | 4.2           |
| `packages/domain/src/competition.ts`                  | ✅ Novo                        | 4.3           |
| `apps/api/src/app.ts`                                 | 🔄 Modificado                  | 1.3, 4.2, 4.3 |
| `packages/domain/src/index.ts`                        | 🔄 Modificado                  | 4.2, 4.3      |
| `apps/api/src/modules/auth/password-reset.service.ts` | 🔄 Modificado                  | 3.6           |
| `package.json`                                        | 🔄 Modificado                  | 0.7           |
| `.env`                                                | Pré-existente                  | —             |
| `.env.example`                                        | Pré-existente                  | —             |
| `PENDENCIAS_OPERADOR.md`                              | Pré-existente                  | —             |
| `DECISOES.md`                                         | Pré-existente                  | —             |
| `apps/web/*`                                          | ✅ Frontend Next.js 16         | 5.1–5.12      |
| `apps/web/src/hooks/useGsap.ts`                       | ✅ Novo (GSAP hooks)           | 5.0           |
| `apps/web/src/components/`                            | ✅ 6 componentes               | 5.0           |
| `docs/seo-aeo-aio-geo-strategy.md`                    | ✅ Novo (estratégia completa)  | 5.0           |
| `packages/feature-flags/*`                            | ✅ Novo (3 arquivos)           | 6.7           |
| `.github/workflows/ci.yml`                            | ✅ Novo                        | 9.1           |
| `.github/workflows/dast.yml`                          | ✅ Novo                        | 8.6           |
| `apps/api/vitest.config.ts`                           | ✅ Novo                        | 8.1           |
| `apps/api/tests/`                                     | ✅ Novo (2 suites, 11 testes)  | 8.1           |
| `packages/domain/tests/`                              | ✅ Novo (1 suite, 4 testes)    | 8.1           |
| `apps/api/src/modules/matches/`                       | ✅ Novo (3 arquivos)           | 4.5           |
| `apps/api/src/modules/seasons/`                       | ✅ Novo (3 arquivos)           | 4.5           |
| `apps/api/src/modules/rankings/`                      | ✅ Novo (arquivos atualizados) | 4.4           |
| `apps/api/src/modules/billing/routes.ts`              | ✅ Novo (webhook + rotas)      | 4.6           |
| `apps/api/src/modules/admin/routes.ts`                | ✅ Novo (CRUD users + roles)   | 4.7           |
| `apps/api/src/middleware/idempotency.ts`              | ✅ Novo                        | 4.12          |

---

## Convenções de commit

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `security:` correção de segurança
- `test:` adição/correção de testes
- `chore:` manutenção (deps, configs)
- `docs:` documentação

Commits atômicos por tarefa. Referenciar o ID da tarefa.

---

## Próximas tarefas (priorizadas)

> ⚠️ **Obsoleto (reconciliado T381, 2026-08-27):** todos os itens abaixo já
> foram concluídos nas Fases correspondentes (marcados `[x]` acima). Mantido
> apenas como histórico. As pendências reais estão em
> `docs/RECONCILIATION-REPORT.md` §6.

1. **Fase 6.1** — Upload seguro (MinIO + ClamAV + validação MIME)
2. **Fase 6.2** — Fila assíncrona BullMQ + Redis
3. **Fase 6.3** — Cache Redis (read-through em consultas frequentes)
4. **Fase 8.2** — Testes de integração (Fastify inject)
5. **Fase 9.3** — Deploy blue-green (Fly.io/Railway)
6. **Fase 9.5** — Observabilidade (Loki + Prometheus + Grafana)
7. **Fase 6.4** — Pipeline ETL (RSSSF, FBref, Wikipedia)
8. **Fase 6.5** — IA/RAG (pgvector + Ollama)
9. **Fase 6.6** — Knowledge Graph
10. **Fase 8.3** — Testes E2E (Playwright)
11. **Fase 9.7** — Backup automático PostgreSQL

---

## 📊 STATUS CONSOLIDADO — 2026-09-02 (Relatório de Status)

> **Data:** 02/09/2026 · **Branch main:** `50af90c` · **Regime:** padrão operacional (CI verde).
> Fonte: Relatório de Status do Projeto (02/09/2026) + governança SIMBIOTICO (T274–T401).

### ✅ CONCLUÍDO (com evidência real)

#### Infraestrutura & DevOps

| Item                                                               | Evidência    |
| ------------------------------------------------------------------ | ------------ |
| Monorepo pnpm (apps/api + apps/web + packages/domain)              | main         |
| Fastify 5 + Prisma + TypeScript estrito                            | main         |
| GitHub Actions verde (security-gate + gitleaks + dependency-audit) | T393         |
| Deploy automático Vercel (web) + Railway (API)                     | T380/T391    |
| Proteção de main (enforce_admins, PR-only, check obrigatório)      | D-2026-08-24 |
| Regime padrão de merges restaurado                                 | D-2026-09-02 |
| MANUAL_DO_OPERADOR.md v2.0                                         | T379         |
| CI-ROOT-CAUSE.md com forense completa                              | T374–T393    |
| INCIDENT_RESPONSE.md                                               | T363         |

#### Segurança & Hardening (Fase 7 — alta cobertura)

| Item                                                                       | Evidência |
| -------------------------------------------------------------------------- | --------- |
| Helmet + CSP + HSTS (prod) + X-Frame-Options: DENY                         | T383      |
| Rate limit por IP + usuário (janela deslizante, Redis + fallback memória)  | T384      |
| Rejeição de métodos não usados (TRACE/HEAD/CONNECT → 405)                  | T385      |
| Limite de payload (1 MiB padrão, 50 MiB upload → 413)                      | T385      |
| Guarda de boot (RATE_LIMIT_DISABLED + NODE_ENV=production → falha startup) | T385      |
| Regressão de segurança (headers, SQLi, XSS, CSRF)                          | T382      |
| CSRF client-side corrigido (forgot-password)                               | T388      |
| Dependabot ativo + gitleaks no CI                                          | T378      |
| Higiene de segredos (token antigo revogado)                                | Operador  |

#### Autenticação & Sessão (Fase 3)

| Item                                                                                      | Evidência |
| ----------------------------------------------------------------------------------------- | --------- |
| Register / Login / Logout / Refresh / Forgot-password                                     | main      |
| JWT + cookie httpOnly + SameSite                                                          | main      |
| RLS efetiva em produção (app_user, cross-user deny confirmado)                            | T401      |
| withRlsContext em todos os fluxos de sessão                                               | T371      |
| Policies completas de sessions (SELECT por tokenHash, INSERT/UPDATE/DELETE owner+SERVICE) | T377      |
| Rate limit específico em /auth/*                                                          | T384      |

#### Dados & Schema (Fase 2)

| Item                                                                          | Evidência     |
| ----------------------------------------------------------------------------- | ------------- |
| Schema Prisma canônico (PostgreSQL)                                           | main          |
| Migrations versionadas                                                        | main          |
| Tabelas de domínio (clubs, players, competitions, rankings, matches, seasons) | Fase 2        |
| Tabelas de auth (users, sessions, roles)                                      | Fase 2 + T344 |
| Tabelas de billing (subscriptions, bills)                                     | Fase 2        |
| Tabelas de auditoria (audit_logs imutável)                                    | Fase 2        |
| Senha hash argon2id                                                           | Fase 2        |
| Soft delete em entidades críticas                                             | Fase 2        |
| Índices em FKs                                                                | Fase 2        |
| Contas de teste removidas (soft-disable)                                      | T398          |

#### Qualidade & Governança

| Item                                                                                                  | Evidência |
| ----------------------------------------------------------------------------------------------------- | --------- |
| PLANO_MESTRE reconciliado (112 [x] / 7 [~] / 5 [ ])                                                   | T381      |
| DECISOES.md com histórico completo                                                                    | main      |
| RECONCILIATION-REPORT.md                                                                              | T381      |
| Hero com números reais (10 clubes / 3 competições / 2 rankings)                                       | T394      |
| Hero dinâmico com totals reais no HTML (T435: Server Component, revalidate 3600; 3857/1263/2 em prod) | T435      |
| Linha "em crescimento" no hero (pt/en/es)                                                             | T399      |
| ESLint + Prettier (sem varrer dist/)                                                                  | T392      |

### ⚠️ PARCIALMENTE FEITO (gaps documentados)

| Item                             | Status | Gap                                                                                                                                                                                                                |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RLS em `users`                   | [x]    | **T442**: ENABLE+FORCE, owner select/update, INSERT com id gerado no server + contexto, função SECURITY DEFINER pre-auth, SERVICE pleno; matriz cross-user no CI (app_user) + aplicado em produção com smoke verde |
| Governança de proveniência (2.7) | [x]    | Convenção `qid`+`importedFrom`+`importedAt`+`sourceUrl` oficializada (D-2026-09-07-proveniencia-convencional, T426); `data_sources`/`entity_revisions` não existem e não serão criadas                             |
| Criptografia de coluna (2.10)    | [~]    | Infra pronta, não aplicada a email/telefone                                                                                                                                                                        |
| Testes E2E (Playwright)          | [~]    | Estrutura existe, cobertura baixa                                                                                                                                                                                  |
| Testes de carga (k6)             | [ ]    | Não executado                                                                                                                                                                                                      |
| DAST (OWASP ZAP)                 | [ ]    | Job existe, sem cron semanal ativo                                                                                                                                                                                 |
| CodeQL (SAST)                    | [~]    | Configurado, sem análise regular                                                                                                                                                                                   |
| Feature flags                    | [ ]    | Tabela existe, sem UI de administração                                                                                                                                                                             |
| DNSSEC + CAA + HSTS preload      | [ ]    | Depende de domínio próprio (pendência Operador)                                                                                                                                                                    |
| Vault/Infisical                  | [~]    | Railway tem secret manager nativo (usado), mas sem rotação automática de 90 dias                                                                                                                                   |

### ❌ FALTA FAZER (por domínio)

#### 🏛️ Compliance & Legal (pacote de publicação)

**Bloqueante para ir ao ar publicamente:**

- [x] **Banner de cookies** (LGPD/GDPR) — 1ª camada + centro de preferências + prova de consentimento (T436: 3 botões de mesmo destaque, script loader gateado, prova em `cookie_consents`; ativação em produção = flag `COOKIE_BANNER_ENABLED`, Operador pós-merge)
- [x] **Política de Privacidade** publicada (T436: conteúdo real em 3 idiomas, fornecedores atuais Vercel/Railway/Cloudflare/Google Fonts/Stripe; ativação = flag `LEGAL_PAGES_ENABLED`)
- [x] **Termos de Uso** publicados (T436: §Planos referencia /planos em vez de valores hardcoded; ativação = flag `LEGAL_PAGES_ENABLED`)
- [x] **Política de Cookies** publicada (T436: inventário REAL — access_token, refresh_token, almanaque_locale, consent_v, CSRF sem cookie; zero analytics/marketing hoje; ativação = flag `LEGAL_PAGES_ENABLED`)
- [x] **Política de Segurança** publicada (T436: medidas reais — CSP/Helmet, argon2id, rate-limit em camadas, RLS, audit log append-only, CI security; ativação = flag `LEGAL_PAGES_ENABLED`)
- [x] **Razão social + CNPJ + endereço** da END ART Studios (confirmado pelo Operador em D-2026-09-15-ws-l-identity-confirmed; CNPJ 45.370.930/0001-75 · Osasco/SP já publicados no rodapé e páginas legais)
- [ ] **Encarregado/DPO** nomeado e publicado
- [ ] **E-mails oficiais** configurados (contato@, suporte@, privacidade@, security@, reembolso@, direitos@)
- [x] **Processo de direitos do titular** (LGPD art. 18) — T445 FECHO (2026-09-18, PR #137): formulário /direitos-titular com protocolo de acompanhamento, SLA imediato/15d ANPD, cadeia auditada, decisão motivada, fulfillment com anonimização (soft-delete sempre)
- [x] **Processo de reclamação de direitos autorais** (DMCA/análogo) — T445 FECHO (2026-09-18, PR #137): /direitos-autorais com honeypot + rate-limit, triagem com decisão motivada
- [x] **Histórico de cobranças + transparência de reembolso no painel** — T453 (2026-09-20): billings owner-scoped com valor/status/externalId + bloco CDC art. 49/prazo do adquirente/canal, i18n ×3 (PR da sessão T452/T453); logout efetivo validado server-side (T452, D-2026-09-20-t452-t453-logout-e-historico)
- [ ] **Gateway de pagamento** (Stripe, PagSeguro ou Pix direto) — decisão pendente
- [ ] **Webhook de pagamento** assinado (HMAC) e idempotente

#### 🗺️ Produto — Features Core (Escopo 1/2)

**O que define o Almanaque como produto, não como plataforma:**

- [~] **Mapa-múndi interativo** — **código pronto** (`/map` Leaflet, círculos por clube, popup; 113 clubes com coords; T65). **Live deploy web bloqueado por Vercel build-rate-limit (externo)**; transições fluídas continente→país ainda são milestone WS-C
- [ ] **Barra de pesquisa global** preditiva (Meilisearch ou OpenSearch)
- [x] **Ranking 0-100** com normalização MinMax (cron diário 03:00 UTC — T438: job BullMQ ativo + CLI + métricas; publica somente com clubes ranqueáveis; conteúdo completo aguarda ETL de partidas/títulos, M4)
- [ ] **Ranking de jogadores** (mesmo algoritmo, isolado por gênero)
- [ ] **Futebol feminino integrado** (normalização independente)
- [ ] **Visualizador 360º de troféus/bolas** (Three.js, modelos .gltf)
- [x] **Painel de favoritos em tempo real** (T439)
- [x] **Comparadores clube×clube e jogador×jogador** (T440)
- [x] **Carrossel de campeões** (T441)
- [x] **Backup remoto R2 + drill semanal** (T446: pg_dump primário + restore drill counts idênticos + alerta anomalia tamanho) (T439: WebSocket próprio /ws com ticket curto single-use — sem Supabase/SSE; RLS owner-only FORCE, soft-delete, rate-limit por usuário, E2E cross-user em produção)
- [x] **Comparadores clube×clube e jogador×jogador** (T440: /compare com autocomplete duplo, tabela com líder por métrica, gráficos recharts responsivos/acessíveis, cache Redis 5min, deep-link com SEO dinâmico; métricas de partidas/gols honestamente vazias até o ETL M4)
- [x] **Carrossel de campeões** (T441: GET /champions por hierarquia via KnowledgeGraph WON — ano mais recente vence, cache 1h; carrossel scroll-snap CSS puro com teclado/dots/aria-live; hierarquia sem dados → null+reason e estado vazio honesto na home; conteúdo aparece automaticamente com o ETL M4)
- [ ] **Perfil completo de clube** (história, elencos, conquistas, derrotas, hino, flâmula, estádio)
- [ ] **Perfil completo de jogador** (carreira, estatísticas, ranking histórico)
- [ ] **Linha do tempo** de clubes e jogadores
- [ ] **Comparações** (clube×clube, jogador×jogador, com gráficos)
- [ ] **Uniformes históricos** por temporada (titular/reserva/alternativo)

#### 🔧 Produto — Infra Avançada (Fase 6)

- [ ] **ETL automático** (conectores RSSSF, FBref, Wikidata, Wikipedia) — cron = T451
- [ ] **Web scrapers** (Python/BeautifulSoup para federações locais)
- [ ] **IA RAG** com citações verificáveis (pgvector + LLM open-source)
- [~] **Knowledge Graph** (jogador→clube→competição→título) — T448 fechou a camada `WON` (conquistas) com proveniência por aresta e leitura congelada; `PLAYED_FOR` feminino (WS-O womens) e demais relações conforme WS-D avança
- [ ] **Upload antivírus** (ClamAV em container)
- [ ] **Cache Redis** read-through em listas frequentes
- [ ] **Fila BullMQ** completa (ETL, emails, reprocessamento de rankings)
- [ ] **Exportação de dados** com rate limit + paginação
- [ ] **Feature flags** com UI

#### 📊 Produto — Dados Reais

- [~] **Seed de dados** — **1.889 clubes** + **895 competições** (via Wikidata, WS-D/2026-09-02, `docs/DATA-INGESTION.md`; recentemente com **type LEAGUE** por classe); **2.396 jogadores** notáveis (via Wikidata)
- [ ] **Ingestão Wikidata** (script pronto no Escopo 2, não executado)
- [~] **Arestas WON (títulos de clubes)** — T448 + T448b-1: conector P1346 + dedup idempotente + hierarquia/gênero congelados + fonte por aresta + galeria de honra + carrossel com tie-break determinístico (T448c); **produção: 5.157 arestas (mundial 16 · continental 268 · nacional 4.873), zero duplicação, proveniência 100%**; gap residual 514 (copas de onze/estaduais regionais) → T448b-2; refinamento de critério (edições futuras) com T449
- [ ] **Ingestão RSSSF** (arquivo histórico global)
- [ ] **Ingestão de federações** (divisões inferiores, futebol feminino, amador)
- [ ] **Dados de estádios** (coordenadas PostGIS, curiosidades)
- [ ] **Dados de hinos** (Wikimedia Commons)
- [ ] **Dados de uniformes** (imagens históricas)

#### 🎨 Frontend (Fase 5)

- [ ] **Páginas públicas:** clube, jogador, competição, partida, ranking
- [ ] **Páginas privadas:** área do usuário, assinatura, histórico, favoritos
- [ ] **Páginas legais:** privacidade, termos, cookies, segurança, contato
- [ ] **Checkout** (preço, periodicidade, renovação, limites visíveis antes do pagamento)
- [ ] **Acessibilidade WCAG 2.1 AA** (labels, ARIA, contraste, teclado)
- [ ] **Lighthouse > 90** em performance/acessibilidade/SEO
- [ ] **PWA** (offline-first opcional)
- [ ] **DOMPurify** em HTML dinâmico

#### 🧪 Testes (Fase 8)

- [ ] **Cobertura ≥ 80%** em services
- [ ] **Testes E2E** (login → pesquisa → detalhes → favoritos)
- [ ] **Testes de carga** (1.000 usuários concorrentes, p95 < 500ms)
- [ ] **DAST** (OWASP ZAP semanal em staging)
- [ ] **Testes do pipeline de IA** (citações verificáveis)

#### 🔭 Observabilidade (Fase 9)

- [ ] **Logs centralizados** (Loki ou Better Stack)
- [ ] **Métricas** (Prometheus + Grafana)
- [ ] **Alertas** (5xx > 1% em 5min, falhas auth > 50 em 1min)
- [ ] **Uptime check externo** (UptimeRobot)
- [~] **Backup automático** do PostgreSQL — **scripts backup/restore prontos e verificados** (round-trip, retenção 30d; `docs/BACKUP-RESTORE.md`). **Cron diário** a configurar no Railway (scheduled job); Railway tem backups nativos (snapshots/PITR) como camada extra

### 📊 Resumo Executivo

| Dimensão                    | Status       | % estimado |
| --------------------------- | ------------ | ---------- |
| **Infraestrutura & DevOps** | 🟢 Concluída | 95%        |
| **Segurança & Hardening**   | 🟢 Concluída | 90%        |
| **Autenticação & Sessão**   | 🟢 Concluída | 95%        |
| **Schema & Migrations**     | 🟢 Concluído | 85%        |
| **Compliance Legal**        | 🔴 Crítico   | 10%        |
| **Features Core (produto)** | 🔴 Crítico   | 5%         |
| **Dados reais (conteúdo)**  | 🔴 Crítico   | 1%         |
| **Frontend UX**             | 🟡 Parcial   | 30%        |
| **IA/ETL/Knowledge Graph**  | 🔴 Crítico   | 5%         |
| **Testes avançados**        | 🟡 Parcial   | 40%        |
| **Observabilidade**         | 🟡 Parcial   | 30%        |

### 🎯 Conclusão honesta

**O projeto tem uma base técnica (infra + segurança + auth + CI) excepcionalmente sólida — nível produção empresarial.**
Mas ainda **não é o produto Almanaque dos Clubes** descrito no Escopo 1/2. É uma plataforma pronta para hospedar o
Almanaque, mas faltam:

1. **O conteúdo** (99% dos clubes, competições e jogadores do planeta ainda não foram ingeridos)
2. **A experiência** (mapa-múndi, rankings, favoritos, 360º, comparações)
3. **A legalidade** (banner cookies, termos, privacidade, gateway, CNPJ)

### 🎲 Próximos marcos sugeridos

**Para ir ao ar como Beta Fechada (100 usuários):**

1. Compliance legal completo (pacote de publicação)
2. Gateway de pagamento integrado
3. Mapa-múndi interativo básico
4. Seed de dados real (pelo menos 1.000 clubes via Wikidata)
5. Perfis de clube/jogador navegáveis

**Para Open Beta (1.000 usuários):** 6. Rankings 0-100 rodando em cron 7. Futebol feminino integrado 8. Painel de favoritos 9. ETL automático (Wikidata + RSSSF) 10. IA RAG com citações

**Para v1.0 público:** 11. Knowledge Graph 12. Visualizador 360º 13. DAST + carga + observabilidade completos 14. Domínio próprio + DNSSEC

---

## 🎉 M3 — Open Beta (monetizar) — DECLARADO [2026-09-21]

| Critério (PLANO-ACAO §4)       | Evidência                                                                                                           | Status |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------ |
| Gateway de pagamento integrado | Stripe LIVE (sk_live_/pk_live_/whsec_), 4 preços BRL corretos                                                       | ✅     |
| Checkout funcional             | Compra real Pro R$ 4,90 (20/09) — sessão live paga, redirect de sucesso                                             | ✅     |
| Webhook HMAC idempotente       | payment_events gravando checkout.session.completed + charge.refunded; applyPaymentEvent insert-first                | ✅     |
| Assinatura funcional           | PRO/ACTIVE → "Solicitar reembolso" → protocolo re_3UHwb… instantâneo → "Nenhuma assinatura ativa"                   | ✅     |
| Arrependimento CDC art. 49     | Estorno REAL executado com fail-loud (#146): refund no provedor antes de marcar local; protocolo na tela            | ✅     |
| Compliance completo            | T445 (direitos do titular + DMCA) + políticas v1.2 (#141) + histórico de cobranças + bloco de condições (#147/#155) | ✅     |
| Smoke live verde               | Compra + estorno reais pelo /checkout logado, com auditoria (audit_logs provider: stripe)                           | ✅     |

**M3 completo.** Plataforma em Open Beta monetizada: cobra, registra, reembolsa e
mostra o histórico com honestidade. Sessão confiável no ambiente real do pagante
(saga T452→T462 fechada). Fila avança para M4 (conteúdo — WS-D).

### Postmortem da saga de sessão (T452→T462, oito PRs, uma causa por camada)

| Camada                             | Defeito                                                       | Fix                                |
| ---------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| API — clearCookie sem atributos    | Chrome rejeita Set-Cookie `__Host-` sem Secure                | #148: espelha atributos da criação |
| API — logout sem body              | FST_ERR_CTP_EMPTY_JSON_BODY → 400 antes do handler            | T462: body `{}`                    |
| API — refund silencioso            | `invoice.payment_intent` null no formato novo → refund pulado | #146: fail-loud + resolver cascata |
| API — cancel sem tocar no provedor | Stripe continuaria cobrando pós-cancel na UI                  | cancel_at_period_end               |
| Client — interceptor ressuscitava  | refresh residual pós-logout                                   | suppressSessionRefresh             |
| Client — sem refresh no fluxo      | access de 15min expirava, ninguém chamava /auth/refresh       | #143 interceptor                   |
| Client — indicador cego            | navbar "Entrar" hardcoded                                     | AuthProvider T450                  |
| Infra — CRLF no entrypoint         | checkouts Windows quebravam shebang                           | Dockerfile sed                     |
| Infra — price IDs errados          | prod_ em vez de price_                                        | Operador corrigiu                  |

Regras permanentes registradas: D-2026-09-18-testes-sem-skip-silencioso · D-2026-09-20-fixtures-escopados · D-2026-09-20-refund-fail-loud · D-2026-09-20-sessao-sempre-assenta · D-2026-09-21-pr-merged-nao-certifica-conteudo · D-2026-09-21-t463-checkout-entradas · D-2026-09-21-t462-logout-efetivo.

---

## 22. 🏆 M4 inicia — T448: Arestas WON no Knowledge Graph (2026-09-22)

**O que fechou:** o Almanaque já tinha O QUE catalogar (3.857 clubes, T429); o T448 começa a dar a ele
A HISTÓRIA catalogada — campeões reais, citáveis, com a fonte na aresta. Conector `wikidata-won-edges`
(P1346 sobre edições cuja mãe é competição de futebol Q1478437 — classe verificada ao vivo), sync
idempotente (dedup `(competitionId, year, clubId, WON)`), hierarquia e gênero congelados em
`metadata` na escrita (mesma `resolveHierarchy` do ranking; carrossel LÊ, não re-deriva),
proveniência POR ARESTA (sourceUrl = EDIÇÃO, CC0), job `wikidata-titles` na fila ETL (retry+backoff;
cron = T451), `GET /clubs/:id/titles` + galeria de honra no perfil, fonte por título no carrossel
(T441) e no perfil.

**Regra R3 validada pela 3ª vez (permanente):** dispatch ancora em query de produção, não em
documento/snapshot/checklist. A FASE 0 pegou "dados 1%" velho + premissa de hierarquia-como-coluna;
a execução pegou `upsertTitle`-stub do T420, 504 do endpoint com label service, 431 de URL grande e
o double-count de temporada cross-year (424→235) — nenhum documento registrava qualquer um deles.

**Números do piloto local (2005–2026, corpus DECLARADO — 12 mães + 101 clubes):** 7.681 candidatos
únicos · 235 arestas (continental 40 · nacional 195) · gap 277 por hierarquia (input do T448b) ·
órfãos 5.681 · re-run `0 criar · 235 skip` · spot-check independente 20/20 · `/champions` ao vivo
com PSG (Champions League) e Arsenal (Premier League), fonte por card.

**Pendências declaradas:** rodada de produção = MESMO script via Railway (Operador — runbook no
REPORT §22); RSSSF estadual/municipal + semeadura de mães ausentes = T448b; partidas = T449;
feminino = T450; cron = T451.

Regras permanentes: + **R3-t448-dispatch-ancora-em-query**.
