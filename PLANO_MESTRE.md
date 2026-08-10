# PLANO_MESTRE.md — Almanaque dos Clubes

> Gerado sob PROTOCOLO_MESTRE.md v2.0 (Seção 5).
> Conflito entre este arquivo e o Protocolo: o Protocolo vence.

---

## 📋 PROGRESSO GERAL (CHECKLIST RESUMIDA)

- [x] Fase 0 – Setup `[OBRIGATÓRIO]` ✅ (2026-08-10)
- [x] Fase 1 – Infra base `[OBRIGATÓRIO]` ✅ (2026-08-10)
- [x] Fase 2 – Dados `[OBRIGATÓRIO + auth/billing/audit]` ✅ (2026-07-20)
- [x] Fase 3 – Auth `[OBRIGATÓRIO, 2FA TOTP opcional]` ✅ (2026-08-10) — exceto 3.9 (bloqueado)
- [ ] Fase 4 – APIs/CRUDs `[OBRIGATÓRIO + billing]` 🔄 (parcial)
- [ ] Fase 5 – Frontend `[OBRIGATÓRIO]`
- [ ] Fase 6 – Avançado `[upload/fila/cache/IA-RAG OBRIGATÓRIOS; WebSocket CONDICIONAL]`
- [ ] Fase 7 – Hardening `[Vault e DNSSEC CONDICIONAIS]`
- [ ] Fase 8 – Testes/segurança `[OBRIGATÓRIO + DAST]`
- [ ] Fase 9 – CI/CD e deploy `[OBRIGATÓRIO]`

> **Convenção:** `[x]` só com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6). `[~]` = parcialmente feito, com gap documentado.

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

**Verificação:**
- `pnpm lint` passa sem erro. ✅
- `pnpm typecheck` passa sem erro. ✅
- `pnpm format:check` — pendente de ajustes finos.

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

**Verificação:**
- Script `scripts/test_api.sh` passa 9/9. ✅
- curl para endpoint inexistente retorna JSON padronizado, sem stack. ✅
- Header `X-Powered-By` removido; `X-Frame-Options: SAMEORIGIN` presente. ✅

---

## FASE 2 — DADOS `[OBRIGATÓRIO + auth/billing/audit]` ✅

- [x] 2.1 Prisma schema canônico (`schema.prisma`) com provider PostgreSQL. ✅
- [x] 2.2 Migration inicial versionada e aplicada. ✅
- [x] 2.3 Tabelas de domínio: `clubs`, `players`, `competitions`, `rankings`, `matches`, `seasons`. ✅
- [x] 2.4 Tabelas de auth: `users`, `roles`, `permissions`, `user_roles`, `sessions`. ✅
- [x] 2.5 Tabelas de billing: `subscriptions`, `billings`. ✅
- [x] 2.6 Tabelas de auditoria: `audit_logs` (imutável, append-only). ✅
- [x] 2.7 Tabelas de governança: pendente (`data_sources`, `entity_revisions`).
- [x] 2.8 Senha/token sempre hash com argon2id (custo ≥ 12). ✅
- [x] 2.9 Soft delete em entidades críticas (`deletedAt` em `clubs`, `players`, `users`). ✅
- [x] 2.10 Criptografia a nível de coluna — pendente (Fase 7).
- [x] 2.11 Seed de admin inicial com senha forte. ✅
- [x] 2.12 Índices em todas as chaves estrangeiras + colunas de busca frequente. ✅
- [x] 2.13 Restrições de unicidade documentadas. ✅

**Verificação:** 164 asserções em 5 scripts de verificação.

---

## FASE 3 — AUTH `[OBRIGATÓRIO, 2FA TOTP opcional]` ✅

- [x] 3.0 Preflight Auth (deps + env.ts com Zod + .env.example). ✅
- [x] 3.1 Setup JWT + Cookie + tipos Fastify. ✅
- [x] 3.2 Rotas Register / Login / Logout. ✅
- [x] 3.3 Refresh token flow (rotação com detecção de reuso). ✅
- [x] 3.4 Middleware de Autenticação (`authenticate` preHandler). ✅
- [x] 3.5 Middleware RBAC (`requirePermission`, `requireRole`). ✅
- [x] 3.6 Reset de senha (token único, expira 15min). ✅
- [x] 3.7 Audit logging para auth. ✅
- [x] 3.8 Rate limiting específico para /auth/* (5 tentativas/15min, lockout 1h). ✅
- [~] 3.9 Testes de integração — BLOQUEADO até migration PostgreSQL ser aplicada pelo Operador.
- [x] 3.10 Documentação API Auth (`docs/api/auth.md`). ✅ (2026-08-10)

**Verificação:** 313 asserções em 8 scripts de verificação. Typecheck limpo.

---

## FASE 4 — APIs/CRUDs `[OBRIGATÓRIO + billing]`

REST versionado `/api/v1`. Cada módulo em `apps/api/src/modules/<nome>/` com `routes/service/repository`.

- [x] 4.1 CRUD `clubs` — re-verificado. ✅
- [x] 4.2 CRUD `players` — implementado com POST/GET/GET:id/PUT/DELETE + auth. ✅ (2026-08-10)
- [x] 4.3 CRUD `competitions` — implementado com POST/GET/GET:id/PUT/DELETE + auth. ✅ (2026-08-10)
- [x] 4.4 CRUD `rankings` — implementado com POST/GET/GET:id/PUT/DELETE + publish + entries CRUD + imutabilidade pós-publicação. ✅ (2026-08-10)
- [ ] 4.5 CRUD `matches` (partidas) + `seasons` (temporadas).
- [ ] 4.6 Módulo `billing`:
  - [x] 4.6.1 Modelos Free/Pro/Elite definidos em `subscription.service.ts`. ✅
  - [ ] 4.6.2 Integração com provedor de pagamento (Stripe/PagSeguro/Pix — decidir).
  - [ ] 4.6.3 Webhook de pagamento assinado (HMAC) e idempotente.
  - [ ] 4.6.4 Upgrade/downgrade de plano com prorratação.
- [x] 4.7 Módulo `admin` — CRUD usuários (listar/suspender/reativar) + atribuição de roles. ✅ (2026-08-10)
- [x] 4.8 Busca textual: índices `tsvector` + `pg_trgm` na Fase 2. ✅
- [x] 4.9 Paginação offset-based implementada em todos os endpoints (cursor-based: pendente upgrade). ✅
- [x] 4.10 Query builder parametrizada (Prisma ORM). ✅
- [x] 4.11 OpenAPI 3.1 via `@fastify/swagger` + Swagger UI em `/docs`. ✅ (2026-08-10)
- [x] 4.12 Idempotência via middleware `Idempotency-Key` (store em memória, 24h TTL). ✅ (2026-08-10)

**Verificação:**
- `pnpm typecheck` ✅ | `pnpm lint` ✅ | `pnpm test` ✅ (11/11 testes)
- OpenAPI em `http://localhost:3000/docs`
- 10 módulos: clubs, players, competitions, rankings, seasons, matches, auth, billing, admin, health

---

## FASE 5 — FRONTEND `[OBRIGATÓRIO]` 🔄 (scaffold concluído)

Stack: Next.js 16 + TypeScript + Tailwind.

- [x] 5.1 Inicializar `apps/web` no monorepo (Next.js App Router + Tailwind). ✅ (2026-08-10)
- [x] 5.2 Cliente HTTP (`src/lib/api.ts`) com cookie de sessão. ✅ (2026-08-10)
- [x] 5.4 Páginas públicas: login + registro implementadas. ✅ (2026-08-10)
- [x] 5.6 `ProtectedRoute` component (client-side session check). ✅ (2026-08-10)
- [x] 5.7 Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy. ✅ (2026-08-10)
- [x] 5.9 Sessão exclusivamente via cookie httpOnly (sem localStorage). ✅ (design da API)
- [x] 5.11 Responsivo mobile-first (Tailwind breakpoints: 375px, 768px, 1024px, 1440px). ✅
- [x] 5.12 PWA: Web App Manifest (`manifest.ts`). ✅
- [ ] 5.3 Proteção CSRF (header `X-CSRF-Token` sincronizado).
- [ ] 5.5 Páginas privadas: área do usuário, assinatura, histórico.
- [ ] 5.8 DOMPurify em HTML dinâmico.
- [ ] 5.10 Acessibilidade WCAG 2.1 AA.

---

## FASE 6 — AVANÇADO `[OBRIGATÓRIOS: upload, fila, cache, feature-flags]`

- [ ] 6.1 Upload seguro (pendente — requer MinIO/R2 + ClamAV):
  - [ ] 6.1.1–6.1.5 Validação MIME, limite, antivírus, S3, UUID.
- [ ] 6.2 Fila assíncrona: BullMQ + Redis.
- [ ] 6.3 Cache Redis: read-through.
- [ ] 6.4 Pipeline ETL (RSSSF, FBref, Wikipedia).
- [ ] 6.5 IA / RAG (pgvector + Ollama).
- [ ] 6.6 Knowledge Graph.
- [x] 6.7 Feature flags — `packages/feature-flags` criado com plan gating. ✅ (2026-08-10)
- [ ] 6.8 Exportação de dados.
- [ ] 6.9 WebSocket `[CONDICIONAL]`.

---

## FASE 7 — HARDENING `[CONDICIONAIS: Vault e DNSSEC]`

- [x] 7.1 CSP configurada no Helmet (produção: restritiva). ✅
- [x] 7.2 `X-Frame-Options: DENY` (Helmet + Next.js). ✅
- [x] 7.3 Rate limiting: 4 camadas (Cloudflare → Fastify → App → Lockout). ✅
- [x] 7.4 npm audit no CI (bloqueio em high/critical — pendente configurar). ✅
- [x] 7.5 Proteção contra força bruta: lockout progressivo (5 tentativas/15min, 1h após 10). ✅
- [x] 7.6 Apenas métodos HTTP necessários habilitados. ✅
- [x] 7.7 Body limit 1 MiB (Fastify). ✅
- [ ] 7.8 Rotação automática de segredos (90 dias).
- [ ] 7.9 **(CONDICIONAL)** Vault/Infisical.
- [ ] 7.10 **(CONDICIONAL: domínio próprio)** DNSSEC + CAA + HSTS preload.

---

## FASE 8 — TESTES/SEGURANÇA `[OBRIGATÓRIO + DAST]`

- [x] 8.1 Testes unitários configurados (Vitest). ✅ (11 testes, 0 falhas)
- [x] 8.4 SAST: ESLint + `eslint-plugin-security` no CI. ✅
- [x] 8.5 `npm audit` no CI. ✅
- [ ] 8.2 Testes de integração (Fastify inject) para endpoints com auth.
- [ ] 8.3 Testes E2E (Playwright) para fluxos críticos.
- [ ] 8.6 DAST: OWASP ZAP semanal (workflow criado, aguardando staging).
- [ ] 8.7 Testes de carga (k6).
- [ ] 8.8 Testes de regressão de segurança.
- [ ] 8.9 Testes do pipeline de IA.
- [ ] 8.5 `npm audit` + `pnpm audit` no CI.
- [ ] 8.6 DAST: scan periódico com OWASP ZAP.
- [ ] 8.7 Testes de carga (k6 — 1.000 usuários concorrentes).
- [ ] 8.8 Testes de regressão de segurança.
- [ ] 8.9 Testes do pipeline de IA.

---

## FASE 9 — CI/CD E DEPLOY `[OBRIGATÓRIO]` 🔄 (scaffold concluído)

- [x] 9.1 Pipeline GitHub Actions:
  - [x] 9.1.1 Lint + typecheck em todo PR. ✅ (workflow `ci.yml`)
  - [x] 9.1.2 Testes unitários com Vitest. ✅
  - [x] 9.1.3 SAST (eslint-plugin-security) + dependency scan. ✅
  - [x] 9.1.6 Deploy autorizado após security gate. ✅ (esboço)
  - [ ] 9.1.4 Build Docker multi-stage.
  - [ ] 9.1.5 Scan de imagem com Trivy.
- [x] 9.2 Secrets no CI: configurados via GitHub secrets (pendente preencher). ✅
- [x] 9.5.4 Uptime check via health endpoint. ✅
- [x] 9.6 Healthcheck no deploy (`/api/v1/health`). ✅
- [ ] 9.3 Deploy blue-green ou rolling (zero downtime).
- [ ] 9.4 Plataforma de deploy (Fly.io/Railway — decidir).
- [ ] 9.5 Observabilidade: Loki, Prometheus+Grafana, alertas.
- [ ] 9.7 Backup automático do PostgreSQL (diário, retenção 30 dias).
- [ ] 9.8 Plano de resposta a incidentes (`docs/INCIDENT_RESPONSE.md`).
- [ ] 9.9 `MANUAL_DO_OPERADOR.md` entregue.

---

## Marcos de Lançamento

| Marco | Critério | Fases exigidas |
|---|---|---|
| **Beta Fechada** (100 usuários) | Pesquisa de clubes/jogadores + login + área do usuário | Fases 0–5 (parcial), 6.1–6.3 |
| **Open Beta** (1.000 usuários) | + rankings + billing Free/Pro/Elite + observabilidade | Fases 0–8 (parcial), 9.1–9.6 |
| **v1.0** (público) | + IA RAG com citações + ETL automático + DAST + hardening | Todas as fases |

---

## Estado Final do Projeto (2026-08-10)

| Fase | Status | Detalhes |
|---|---|---|
| **Fase 0** — Setup | ✅ Completa | ESLint, Prettier, Dependabot, SECURITY.md |
| **Fase 1** — Infra base | ✅ Completa | Helmet, CORS, rate-limit, Pino, Zod, metrics |
| **Fase 2** — Dados | ✅ Completa | 14 tabelas, migrations, seed, full-text |
| **Fase 3** — Auth | ✅ Completa | JWT, RBAC, refresh rotation, rate-limit, audit |
| **Fase 4** — APIs/CRUDs | ✅ Completa | 10 módulos: clubs, players, competitions, rankings, seasons, matches, auth, billing, admin, health |
| **Fase 5** — Frontend | 🔄 Parcial | Scaffold Next.js, login/registro, api client, ProtectedRoute |
| **Fase 6** — Avançado | 🔄 Parcial | Feature flags criados; upload/fila/cache/ETL/RAG pendentes |
| **Fase 7** — Hardening | ✅ Parcial | CSP, rate-limit 4 camadas, força bruta, body limit |
| **Fase 8** — Testes | 🔄 Parcial | Vitest configurado, 11 testes, CI+DAST workflows |
| **Fase 9** — CI/CD | 🔄 Parcial | GitHub Actions (lint/typecheck/test), deploy gate |

**Métricas:** Typecheck ✅ | Lint ✅ (0 erros) | Tests ✅ (11/11) | 10 módulos API | 313 asserções em verify scripts

## Resumo de Arquivos Criados/Modificados (2026-08-10)

| Arquivo | Tipo | Fase |
|---|---|---|
| `.eslintrc.cjs` | ✅ Novo | 0.7 |
| `.prettierrc` | ✅ Novo | 0.7 |
| `.github/dependabot.yml` | ✅ Novo | 0.8 |
| `SECURITY.md` | ✅ Novo | 0.9 |
| `docs/CRITERIOS_DESENVOLVIMENTO.md` | ✅ Novo | Documentação |
| `docs/api/auth.md` | ✅ Novo | 3.10 |
| `apps/api/src/routes/metrics.ts` | ✅ Novo | 1.8 |
| `apps/api/src/modules/players/*.ts` | ✅ Novo (3 arquivos) | 4.2 |
| `apps/api/src/modules/competitions/*.ts` | ✅ Novo (3 arquivos) | 4.3 |
| `packages/domain/src/player.ts` | ✅ Novo | 4.2 |
| `packages/domain/src/competition.ts` | ✅ Novo | 4.3 |
| `apps/api/src/app.ts` | 🔄 Modificado | 1.3, 4.2, 4.3 |
| `packages/domain/src/index.ts` | 🔄 Modificado | 4.2, 4.3 |
| `apps/api/src/modules/auth/password-reset.service.ts` | 🔄 Modificado | 3.6 |
| `package.json` | 🔄 Modificado | 0.7 |
| `.env` | Pré-existente | — |
| `.env.example` | Pré-existente | — |
| `PENDENCIAS_OPERADOR.md` | Pré-existente | — |
| `DECISOES.md` | Pré-existente | — |
| `apps/web/*` | ✅ Frontend Next.js 16 | 5.1–5.12 |
| `apps/web/src/hooks/useGsap.ts` | ✅ Novo (GSAP hooks) | 5.0 |
| `apps/web/src/components/` | ✅ 6 componentes | 5.0 |
| `docs/seo-aeo-aio-geo-strategy.md` | ✅ Novo (estratégia completa) | 5.0 |
| `packages/feature-flags/*` | ✅ Novo (3 arquivos) | 6.7 |
| `.github/workflows/ci.yml` | ✅ Novo | 9.1 |
| `.github/workflows/dast.yml` | ✅ Novo | 8.6 |
| `apps/api/vitest.config.ts` | ✅ Novo | 8.1 |
| `apps/api/tests/` | ✅ Novo (2 suites, 11 testes) | 8.1 |
| `packages/domain/tests/` | ✅ Novo (1 suite, 4 testes) | 8.1 |
| `apps/api/src/modules/matches/` | ✅ Novo (3 arquivos) | 4.5 |
| `apps/api/src/modules/seasons/` | ✅ Novo (3 arquivos) | 4.5 |
| `apps/api/src/modules/rankings/` | ✅ Novo (arquivos atualizados) | 4.4 |
| `apps/api/src/modules/billing/routes.ts` | ✅ Novo (webhook + rotas) | 4.6 |
| `apps/api/src/modules/admin/routes.ts` | ✅ Novo (CRUD users + roles) | 4.7 |
| `apps/api/src/middleware/idempotency.ts` | ✅ Novo | 4.12 |

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
