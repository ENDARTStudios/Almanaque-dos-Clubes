# HANDOFF.md — Almanaque dos Clubes

> Documento de transferência de contexto gerado em 2026-08-14.
> Destinado a qualquer desenvolvedor que assuma o projeto.

---

## 1. Resumo do Projeto

**Almanaque dos Clubes** é uma plataforma SaaS de inteligência sobre futebol brasileiro e mundial. Reúne história completa de clubes, jogadores, competições, rankings auditáveis e IA com respostas fundamentadas em dados (RAG + pgvector).

**Stack principal:** TypeScript | Fastify 5 | Next.js 16 | Prisma 5 | PostgreSQL 16 | Redis | MinIO | BullMQ | Docker | pnpm workspaces

**Repositório:** `github.com/ENDARTStudios/Almanaque-dos-Clubes`
**Branch principal:** `main`
**Último commit:** `a37f0c0` — "fix: Redis connection usa REDIS_URL (Railway compatible)"

---

## 2. Produção — URLs

| Serviço | URL | Plataforma | Status |
|---|---|---|---|
| **Frontend** | `https://almanaquedosclubes.com` | Vercel | Online |
| **Frontend (www)** | `https://www.almanaquedosclubes.com` | Vercel | Online |
| **API** | `https://api.almanaquedosclubes.com` | Railway | Online |
| **API Health** | `https://api.almanaquedosclubes.com/api/v1/health` | Railway | 200 |

### Detalhes das plataformas

| Plataforma | Projeto | Detalhes |
|---|---|---|
| **Vercel** | `almanaque-dos-clubes` (org: `end-art-studios`) | Next.js 16, autodeploy via CI |
| **Railway** | `Almanaque dos Clubes` (workspace: `END ART Studios's Projects`) | GitHub auto-deploy, região `sfo` |
| **DNS** | Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) | Domínio expira 14/08/2027 |
| **Domínio** | `almanaquedosclubes.com` | Comprado na Vercel, renovação $11.25/ano |

### Serviços Railway

| Serviço | Tipo | Status |
|---|---|---|
| `Almanaque-dos-Clubes` | Web Service (porta 3000) | Online |
| `Postgres` | Database | Online |
| `Redis` | Database | Online |

### Variáveis de ambiente críticas (Railway)

| Variável | Definida? | Nota |
|---|---|---|
| `JWT_SECRET` | Sim (64 chars) | Gerado via `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Sim (64 chars, ≠ JWT_SECRET) | Gerado via `openssl rand -base64 48` |
| `DATABASE_URL` | Sim | PostgreSQL no Railway internal |
| `REDIS_URL` | Sim | Redis no Railway internal |
| `PRISMA_SCHEMA_PROVIDER` | `postgres` | Configurado 2026-08-14 |
| `NODE_ENV` | `production` | — |
| `S3_*` | **Faltando** | Upload depende de MinIO/S3 externo |
| `RESEND_API_KEY` | **Faltando** | Email worker não funcional sem isso |

---

## 3. Estrutura do Projeto

```
raiz/
├── apps/
│   ├── api/              # Fastify API server (40+ endpoints, 14 módulos)
│   ├── web/              # Next.js 16 frontend (15+ rotas, Tailwind, GSAP)
│   └── worker/           # BullMQ workers (ETL, email)
├── packages/
│   ├── domain/           # Schemas Zod + tipos TS compartilhados
│   └── feature-flags/    # Gating por plano (Free/Pro/Elite)
├── design-system/        # Design system (cores, tipografia, componentes)
├── docs/                 # Documentação técnica, roadmap, manual do operador
├── scripts/              # Deploy, backup, migração, testes, k6
├── docker-compose.yml    # PostgreSQL + MinIO + Redis + API
├── pnpm-workspace.yaml   # Monorepo config
├── tsconfig.base.json    # TS config compartilhada
├── eslint.config.mjs     # ESLint flat config
└── .github/workflows/    # CI (typecheck + lint + tests + audit) + DAST semanal
```

### Módulos da API (`apps/api/src/modules/`)

| Módulo | Rotas | Propósito |
|--------|-------|-----------|
| `auth/` | register, login, logout, refresh, reset-password | JWT + refresh rotation + RBAC (18 permissões) + rate-limit + sessão |
| `admin/` | CRUD de usuários | Listar, suspender, reativar, alterar papel |
| `clubs/` | CRUD de clubes | Dados históricos de clubes |
| `players/` | CRUD de jogadores | Vínculo com clubes |
| `competitions/` | CRUD de competições | Liga, Copa, Torneio, Supercopa |
| `seasons/` | CRUD de temporadas | Edições de competições |
| `matches/` | CRUD de partidas | Confrontos com placar |
| `rankings/` | CRUD de rankings | Publicação com imutabilidade |
| `billing/` | Webhook + planos | FREE/PRO/ELITE (2900/9900 centavos) |
| `upload/` | Upload MinIO | Validação MIME por magic bytes, max 50 MiB |
| `export/` | CSV/JSON export | Clubes, players, competitions, rankings |
| `rag/` | `/api/v1/ai/ask` | RAG endpoint (estrutura criada, Ollama pendente) |
| `graph/` | CRUD knowledge graph | Relações entre entidades |
| `etl/` | Pipeline ETL | Conectores RSSSF + FBref (pendente scraping real) |

---

## 4. Estado Atual (2026-08-14)

### O que mudou desde o handoff anterior (2026-08-11)

| Item | Antes | Agora |
|---|---|---|
| **Domínio** | Não registrado | `almanaquedosclubes.com` (Vercel, expira 08/2027) |
| **Plataforma backend** | Fly.io vs Railway (indeciso) | **Railway** (GitHub auto-deploy) |
| **Frontend** | Vercel (projeto `web`) | Vercel (projeto `almanaque-dos-clubes`) |
| **JWT Secrets** | Valores dev placeholder | Secrets reais de 64 chars (rodados em produção) |
| **PRISMA_SCHEMA_PROVIDER** | Não definido (default sqlite) | `postgres` |
| **CORS** | `https://almanaque.app` (placeholder) | `almanaquedosclubes.com` + `www` |
| **Metadados web** | `almanaque.app` (placeholder) | `almanaquedosclubes.com` |
| **DAST target** | `staging.almanaque.app` | `staging.almanaquedosclubes.com` |
| **Email worker** | `noreply@almanaque.app` | `noreply@almanaquedosclubes.com` |

### Concluído (10 fases do Plano Mestre)

- **Fase 0:** Setup (monorepo, gitignore, ESLint, Prettier, Dependabot, SECURITY.md)
- **Fase 1:** Infra base (Fastify, Helmet, CORS, rate-limit, Pino, Zod, health, metrics)
- **Fase 2:** Dados (15 tabelas Prisma: clubs, players, competitions, rankings, matches, seasons, users, roles, permissions, sessions, subscriptions, billings, audit_logs, knowledge_graph + full-text search)
- **Fase 3:** Auth (JWT HS256 + refresh rotation + argon2id + RBAC + session + rate-limit + password-reset)
- **Fase 4:** APIs/CRUDs (todos os 14 módulos funcionais)
- **Fase 5:** Frontend (Next.js 16, Tailwind 4, GSAP, PWA, WCAG AA, ProtectedRoute)
- **Fase 6:** Avançado (Upload MinIO, BullMQ/Redis, Cache, ETL, IA/RAG, Knowledge Graph, Feature Flags, CSV/JSON, WebSocket)
- **Fase 7:** Hardening (CSP, rate-limit 4 camadas, body limit, secret rotation)
- **Fase 8:** Testes (27 unit+int, Vitest, Playwright E2E, ESLint security, CodeQL, DAST ZAP, k6 load/stress)
- **Fase 9:** CI/CD (GitHub Actions, Docker multi-stage, Trivy, security gate, backup scripts)

### Pendente / Bloqueado

| # | Item | Responsável | Bloqueia? | Nota |
|---|------|-------------|-----------|------|
| 1 | ~~Registrar domínio~~ ✅ | Operador | — | `almanaquedosclubes.com` na Vercel |
| 2 | ~~Escolher plataforma backend~~ ✅ | Operador | — | Railway com GitHub auto-deploy |
| 3 | **S3/MinIO para upload** | Operador | 🟡 Upload | Variáveis `S3_*` não configuradas no Railway |
| 4 | **Resend API key** | Operador | 🟡 Email | Worker de email não funcional |
| 5 | **Stripe/PagSeguro — criar conta e configurar webhook** | Operador | 🟡 Billing real | — |
| 6 | **Ollama + pgvector — instalar e configurar** | Dev | 🟡 RAG | — |
| 7 | **ETL — scrapers reais (RSSSF, FBref)** | Dev | 🟡 Dados | — |
| 8 | **Executar migration PostgreSQL** (já tem DB) | Dev | 🟢 | Railway já tem PostgreSQL, verificar schema |
| 9 | **Blue-green / zero-downtime deploy** | Dev | 🟡 Qualidade | — |
| 10 | **Observabilidade (Loki/Prometheus/Grafana)** | Dev | 🟢 Desejável | Fase 14 |
| 11 | **2FA TOTP** | Dev | 🟢 Desejável | Fase 3.9 opcional |
| 12 | **HSTS preload + DNSSEC** | Operador | 🟡 Segurança | Agora possível com domínio próprio |

---

## 5. Como Executar Localmente

### Pré-requisitos
- Node.js 20+ (CI usa 22)
- pnpm 11.13.1+
- Docker Desktop (para PostgreSQL, MinIO, Redis)

### Passos

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir infraestrutura (PostgreSQL + MinIO + Redis)
docker compose up -d

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env se necessário (defaults funcionam para dev)

# 4. Executar migrations no banco
cd apps/api
npx prisma migrate dev --schema=prisma/schema.prisma

# 5. Seedar dados iniciais
npx prisma db seed --schema=prisma/schema.prisma

# 6. Iniciar API em modo dev
pnpm dev
# API rodando em http://localhost:3000

# 7. (Opcional) Iniciar frontend
cd apps/web
pnpm dev
# Frontend rodando em http://localhost:5173
```

### Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `pnpm lint` | ESLint em todo o monorepo |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm test:unit` | Vitest (unit + integration, 27 testes) |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm test:k6` | k6 load test (100 users) |
| `pnpm db:seed` | Seed: 10 clubes, 3 competições, 2 rankings, RBAC |

**⚠️ Ressalva R1 — lint recursivo (T476, 2026-09-22):** até o T476, `pnpm lint` no CI varria só **1 nível** de `apps/api` (**27/186** arquivos); `src/modules/**`, `tests/**` e `src/scripts/**` **não eram lintados** (falso verde). Corrigido (aspas no glob → eslint expande recursivo). A partir daqui, **"CI verde" cobre lint recursivamente** de `apps/api`/`apps/worker`/`packages`. O `format:check` (prettier standalone) **ainda NÃO roda no CI** (954 arquivos, majoritariamente `apps/web`, ignorado pelo eslint) — dívida rastreada.

**⚠️ Ressalva E2E-CI (2026-09-22, achado do G1):** o **"CI verde" NÃO cobre E2E Playwright**. O `security-gate` roda unit+integração (vitest, **inclui `apps/web`**), lint recursivo e typecheck — mas **`tests/e2e/**` não roda no CI de PR**. Logo os E2E de cada round (champions-stability, oferta-honesta, galeria, acessibilidade do mapa T467, direitos titular T470, T472a en/es) são **validação LOCAL/manual por round** — não contam como "CI verde". Dívida **T476c** (opcional-futuro, pré-M5): job Playwright contra preview/staging OU manter esta ressalva permanentemente.

---

## 6. Deploy

### Fluxo atual

```
git push main → CI executa security-gate (lint, typecheck, testes, audit)
                 ├── deploy-vercel-frontend: npx vercel deploy --prod (working-directory: apps/web)
                 └── Railway: GitHub auto-deploy (detecta push e reconstrói automaticamente)
```

### Deploy manual

```bash
# Frontend (Vercel) — a partir de apps/web
cd apps/web
vercel deploy --prod --yes

# Backend (Railway) — faz upload e deploy do diretório atual
railway up --service Almanaque-dos-Clubes --environment production

# Forçar redeploy do último build
railway service redeploy

# Verificar status
railway status
```

### Docker

```bash
# Build imagem da API
docker build -t almanaque-api -f apps/api/Dockerfile .

# Docker Compose (produção local)
docker compose up -d
```

---

## 7. Database

**14 modelos Prisma** (PostgreSQL em produção, SQLite em dev sandbox):
- clubs, players, competitions, seasons, matches, rankings, ranking_entries
- users, roles, permissions, user_roles, role_permissions
- sessions, subscriptions, billings, audit_logs, knowledge_graph

**Extensões PostgreSQL:** uuid-ossp, pgcrypto, pg_trgm, pgvector
**Full-text:** Coluna tsvector em clubs + GIN index (SQL raw, não Prisma)

**Conexão produção:** `DATABASE_URL` no Railway aponta para o PostgreSQL interno.
Para migrar: `npx prisma migrate deploy --schema=prisma/schema.prisma`.

---

## 8. Testes

| Suite | Framework | Qtd | O que cobre |
|-------|-----------|-----|-------------|
| Unit (API) | Vitest | 5+ | Clubs service (create, validation, duplicate, getById) |
| Unit (Domain) | Vitest | 4 | Zod schemas validation |
| Unit (Feature Flags) | Vitest | 6 | Gating por plano Free/Pro/Elite |
| Integration (API) | Vitest | 12 | Health, clubs, auth, 404 |
| E2E (Web) | Playwright | 5 | Auth flow + clubs list |
| Load | k6 | 1 | 100 concurrent users |
| Stress | k6 | 1 | 1000 concurrent users |
| Verification | TS scripts | 8 | 313 asserções (auth, JWT, crypto, session, RBAC, audit, billing) |

**Total: 27 testes unitários/integração passando. Typecheck limpo. Lint: 0 erros, 57 warnings (pré-existentes, sem impacto funcional).**

---

## 9. Decisões Técnicas Importantes

Registradas em `DECISOES.md`. As principais:

| Decisão | Motivo |
|---------|--------|
| **Monolito modular** (não microsserviços) | <50k usuários no Ano 1, complexidade desnecessária |
| **Argon2id para senhas, SHA-256 para tokens** | Senhas são baixa-entropia (KDF memory-hard); tokens já são 256bits |
| **AuditLog polimórfico** (entityType + entityId) | Evita explosão de tabelas, índice composto garante performance |
| **Cache RBAC em memória (TTL 5min)** | Monolito single-instance, Redis adicionaria complexidade sem benefício |
| **Full-text via SQL raw (GIN/tsvector)** | Prisma 5.22 não suporta GIN indexes declarativamente |
| **Valores em centavos (int)** | Float tem problema de precisão; Stripe/PagSeguro usam centavos |
| **Feature flags por plano** | FREE (0), PRO (2900¢/mês), ELITE (9900¢/mês) |
| **Vercel + Railway** (não Fly.io) | Vercel: domínio + frontend Next.js otimizado; Railway: backend + DB + Redis integrados |

---

## 10. Riscos e Pendências Imediatas

1. **S3/MinIO não configurado no Railway** → upload de arquivos não funciona em produção
2. **Resend API key não configurada** → emails de boas-vindas e reset de senha não disparam
3. **Sem provedor de pagamento** → billing real não funciona (Stripe/PagSeguro)
4. **Sem dados reais** → ETL precisa ser populado (RSSSF, FBref)
5. **RAG sem Ollama** → endpoint `/api/v1/ai/ask` não responde
6. **HSTS preload + DNSSEC não ativados** → possíveis agora com domínio próprio
7. **Vercel Root Directory** → configurado como `.` na dashboard; deploys a partir da raiz falham na detecção do Next.js. O deploy deve ser feito sempre a partir de `apps/web` (CI/CD já usa `working-directory: apps/web`).

---

## 11. Comandos Úteis de Operação

```bash
# Verificar saúde dos serviços
curl -s https://api.almanaquedosclubes.com/api/v1/health
curl -s -o /dev/null -w "%{http_code}" https://almanaquedosclubes.com

# Verificar status Railway
railway status

# Verificar variáveis Railway
railway variable list --json

# Verificar logs Railway
railway service logs

# Verificar domínios Vercel
vercel domains inspect almanaquedosclubes.com
vercel domains ls

# Verificar DNS
vercel dns ls almanaquedosclubes.com

# Atualizar variável no Railway
railway variable set CHAVE="valor"
```

---

## 12. Roadmap (Próximos Passos)

> **Fila WS (atualizada 2026-09-22):** T470 **[x]** + T470b **[x]** + T464 **[x]** + T467/M1·WS-C **[x]** (smoke pós-deploy verde) + **T472a (i18n checkout/UI assinatura) [x]** → **M4** (T448b-2 RSSSF estaduais/auditoria de cobertura → T449 partidas/rankings 0-100 → T450 feminino → T451 ETL cron). **T472b (i18n das páginas legais) = [condicionado: disclaimer de prevalência do PT OU advogado] — NÃO é gate.** Beta pago = T465 + T469/T469b + T470(+T470b) + T464 + T472a + identidade Operador → **gate técnico COMPLETO após T472a**; abertura de fato é decisão do Operador. G1: "verde do web (vitest)" é confiável; "E2E web" (Playwright) **não** roda no CI de PR.

### Imediato (travar produção)
1. ~~Registrar domínio~~ ✅
2. ~~Escolher plataforma de deploy~~ ✅ (Railway)
3. ~~Gerar JWT secrets reais~~ ✅
4. Configurar S3/MinIO no Railway (variáveis `S3_*`)
5. Criar conta Resend + configurar `RESEND_API_KEY`
6. Criar conta Stripe/PagSeguro + configurar webhook
7. Executar migration no banco Railway (se necessário)

### Curto prazo (Fases 11-12)
8. Scrapers RSSSF + FBref para dados reais
9. Ollama + pgvector + pipeline RAG completo
10. Stripe integrado com prorrotação
11. Email onboarding funcional (Resend + BullMQ)
12. SEO: blog, páginas de clubes, rich snippets

### Médio prazo (Fases 13-14)
13. HSTS preload + DNSSEC com domínio próprio
14. Compress, HTTP/2, CDN
15. Observabilidade (Loki + Grafana)
16. Cache inteligente em endpoints críticos
17. Teste de carga com 1000 usuários reais

---

## 13. Para Quem Assumir

### Documentação essencial (leia nesta ordem):
1. `DECISOES.md` — decisões técnicas e porquês
2. `PLANO_MESTRE.md` — o que foi feito e como foi verificado
3. `docs/ROADMAP.md` — o que vem a seguir
4. `PENDENCIAS_OPERADOR.md` — o que só o Operador pode fazer
5. `docs/MANUAL_DO_OPERADOR.md` — operação do dia a dia
6. `docs/INCIDENT_RESPONSE.md` — resposta a incidentes
7. `docs/CRITERIOS_DESENVOLVIMENTO.md` — critérios de qualidade
8. `docs/seo-aeo-aio-geo-strategy.md` — estratégia de SEO/AEO
9. `SECURITY.md` — política de segurança
10. `SKILL.md` — skill do Claude para trabalhar no projeto

### Arquivos de configuração críticos:
- `.env.example` — template de variáveis de ambiente
- `docker-compose.yml` — infraestrutura local
- `.github/workflows/ci.yml` — pipeline de CI
- `apps/api/prisma/schema.prisma` — schema do banco
- `apps/api/src/app.ts` — config do servidor (CORS, Helmet, CSRF, JWT)
- `apps/api/src/config/env.ts` — validação de env vars
- `vercel.json` — config de build do Vercel
- `railway.json` — config de build do Railway

---

## 14. Contatos e Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| **Operador** (humano) | Domínio, deploy, Stripe, secrets, DNS, decisões de negócio |
| **Desenvolvedor** (IA ou humano) | Código, testes, infra como código, documentação técnica |

Toda interação entre Dev e Operador segue o `PROTOCOLO_MESTRE.md` — nada é decidido por prosa livre no chat. Decisões vão para `DECISOES.md`. Pendências do Operador vão para `PENDENCIAS_OPERADOR.md`.

---

*Handoff gerado em 2026-08-14. Último commit: `a37f0c0`. Todos os serviços em produção respondendo 200.*

---

## Lições recentes

- **[2026-09-25 · T448b-2d seed GO/PR 2025] Micro-seed de identidade [x] CONCLUÍDO — ativo em produção.** Clubes `Q1513287` (Vila Nova/GO) e `Q2580083` (Operário Ferroviário/PR) via Wikidata CC0: `lib/rsssf/seeds/club-seed.ts` + packs + script. #214 (`4372cd8`) → apply prod `created=2`; SQL QID únicos, homônimos `Q10391045/Q10391046/Q671621` **intocados**, clubes ativos 3878→3880; cache `clubs:list:*`/`clubs:geo-stats`; smoke `search=Vila`/`search=Operário` OK. **Writers GO 2025 / PR 2025 [x] CONCLUÍDOS — aplicados em produção.** `created=1` cada; total estadual RSSSF **5 → 7**; baseline MG(3)/GO 2023–24(2) intacto; smoke `/titles` GO/PR 200. **Conformidade pública [x]:** `/metodologia` validada ao vivo (PR + GO 2023–2025; SHA `720695cc…`). **T448b-2d encerrado.** **Fila:** **T448b-2g** (backfill 9 sem QID) ou **Discovery Nova UF** → T449c (tier/carrossel) → T450 (feminino) → T451 (cron).
- **[2026-09-25 · T448b-2d PR 2025] Parser [x] (mock); apply bloqueado.** Parser puro do Paranaense 2025 (Operário Ferroviário `Q2580083`; mãe `Q920397`): `lib/rsssf/pr/` + fixture mock + pack + testes (homônimo `Q671621` NÃO casa). **Necessário micro-seed de `Q2580083`** antes do writer. Empilhado no #211 (GO 2025).
- **[2026-09-25 · T448b-2d GO 2025] Parser [x] (mock); apply bloqueado.** Parser puro do Goiano 2025 (Vila Nova `Q1513287`): fixture+mock+pack+testes T1–T4. **Necessário micro-seed de `Q1513287`** antes do writer (round separado). `buildGoWonCandidate` generalizado (options). PR 2025 análogo em seguida.
- **[2026-09-25 · T448b-2f GATE] Migration APLICADA em produção; FASE 2 LIBERADA.** `clubs_name_country_key` removido (não-único no lugar); homônimos=0; estadual RSSSF=5; `/champions` ok. **Próximos (FASE 2):** parser **GO 2025** (`feat/t448b2d-parser-go-2025-vilanova`, clube `Q1513287`) e **PR 2025** (`feat/t448b2d-parser-pr-2025-operario`, clube `Q2580083` — pode exigir micro-seed antes do writer; parser deve falhar `missing_club`). **Follow-up:** **T448b-2g** backfill dos 9 clubes sem QID.
- **[2026-09-25 · T448b-2f] Identidade de clubes destravada.** `@@unique([name,country])` **removido** (índice não-único + validação contextual). Homônimos nacionais (GO/RN, PR) agora coexistem; duplicata exata bloqueada. **Próximo:** parser **GO 2025** (agora viável) / PR 2025. **Follow-up:** **T448b-2g** = backfill dos 9 clubes sem QID. Regra: **identidade = QID**; nome ≠ chave.
- **[2026-09-25 · T448b-2d GO] CONCLUÍDO:** piloto **GO 2023–2024 ATIVO** (rate limit Vercel resetou → deploy web #207 → `/metodologia` com atribuição GO → apply `--pack=go` created=2). SQL: GO=2/MG=3/total=5. `/champions` estadual=Atlético-MG 2025. **Próximo: T448b-2f** (identidade/homônimos) → reavaliar GO 2025/PR/outras UFs → T449c → T450 → T451.
- **[2026-09-25 · T448b-2d GO gate] BLOQUEADO por rate limit Vercel.** Parser GO + writer GO + atribuição web (#205/#206/#207) **mergeados**; Railway API em `928e5ce`; falta o **deploy de produção do web** (Vercel `api-deployments-free-per-day`, ~24h) → `/metodologia` sem GO → **apply GO abortado** (atribuição pública é pré-condição). **Retomar** após o deploy conter o #207: `/metodologia`+hash → container → dry-run `--pack=go` → apply → SQL (GO=2/MG=3/total=5) → cache → API. Sem contorno/bypass. Falha persistente → `vercel_deploy_still_rate_limited_after_24h` (escalar infra/Operador).
- **[2026-09-25 · T448b-2d writer GO] Fila:** parser GO **[x]** → writer GO **[~]** (#206; dry=2) → **atribuição pública GO (#207)** → verificar **/champions** → gate produção GO → **T448b-2f**. Writer GO usa `--pack=go` (MG inalterado); resolve só por QID; **não cria/linka**; restore só de reasons `rollback_t448b2d_go_*`.
- **[2026-09-25 · T448b-2d GO] Fila:** parser GO 2023–2024 **[x]** (2 candidates, pronto) → **checkpoint/aprovação** → **writer GO** (idempotência) → gate produção GO → **T448b-2f** (identidade/homônimos) → próxima UF só após T448b-2f ou piloto sem homônimos. **GO 2025 = gap.** **Encoding:** páginas de estadual variam (MG=cp1252; GO=utf-8 apesar do meta) → **sempre medir por hex** antes de codar fixture.
- **[2026-09-24 · T448b-2d GO regras] Homônimos e identidade.** Identidade é **QID**; nome duplicado com QID diferente **não** bloqueia create-by-qid — **exceto** quando existe constraint de schema (`clubs @@unique([name,country])`), caso em que **bloqueia de verdade** (não contornar com rename/sufixo/link/migration silenciosos). Quando isso ocorre: **reduzir o piloto** ou abrir follow-up de schema (**T448b-2f**). Ordem: seed de identidade → parser → writer → produção → expansão.
- **[2026-09-24 · T448b-2d] Fila atualizada:** **PR bloqueado** (0 temporadas ready; `Q2580083` ausente) → **GO seedable** (discovery ok; mãe `Q931386` a semear + clube `Q1513287`) → **seed de identidade GO [ ]** (gated) → **parser GO puro** → writer/gate → outras UFs. **T470c no-op** (SHA `6faa117e…`, sem "resposta imediata"). Homônimo **Vila Nova**: resolver só por QID (`Q1513287`), nunca por nome (DB tem `Q10391045` RN de mesmo nome).
- **[2026-09-24 · T448b-2c discovery] Fila:** T448b-2b MG **[x]** → **T448b-2c discovery [x]** → **aprovação do Thinker** → **T448b-2d parser 1ª UF nova** (recomendadas: **PR** primária, **GO** secundária) → writer/idempotência → gate produção → expansão gradual (T449c tier/carrossel → T450 feminino → T451 cron). **Estaduais do Brasil = gap declarado** (só MG). **RJ/RS sem fonte RSSSF Brasil** (exigiria outra fonte).
- **[2026-09-24 · T448b-2b cache] Não supor nomenclatura de chave.** O padrão do dispatch `club:<clubId>:*` **não** correspondeu às chaves reais (as reais são `clubs:titles:<id>` e `clubs:byId:<id>`; carrossel = `champions:<gender|all>`). A invalidação foi considerada suficiente porque `champions:all` foi deletada, as chaves de titles/byId **não estavam presentes** e a **API respondeu fresca** (3 títulos). **Regra:** antes de declarar cache invalidado, fazer **inventário real via `SCAN`/patterns do serviço**; **nunca** `FLUSHALL`/`FLUSHDB`; documentar a **chave exata + TTL** no round que tocar cache.
- **[2026-09-24 · T448b-2b GATE PROD] Fila atualizada:** piloto **MG 2023–2025 ATIVO em produção** (3 arestas WON estaduais RSSSF, proveniência completa, idempotência/restore validados). Próximo: **T448b-2e** (atribuição/metodologia, se necessário) → **T448b-2c** (outros estados) → **T448b-2d** (municipal) → T449b/c → T450 → T451.
- **[2026-09-25 · T448b-2b #198] Proveniência se testa CONTRA O DB, não só contra o candidate.** O writer v1 gravava `sourceUrl/authorCredit/licenseText` mas descartava `candidate.retrievedAt` (usava `importedAt`) — passou em dry-run/pack mas o **gate SQL** (`missing_provenance`) abortou em produção. Todo campo de proveniência exigido por gate **precisa de teste de integração que assevere presença no `knowledge_graph`** (Postgres real). Rollback lógico (`metadata.deletedAt`) + read-filter funcionaram e são o padrão de reversão; restore idempotente só para reasons de rollback do próprio piloto.
- **[2026-09-25 · T448b-2b #197] Ingestão containerizada nunca depende de `tests/`.** Scripts que rodam em produção (`node dist/scripts/*.js`) devem ler dados de **dentro de `src/`** (ou `prisma/`) — o Dockerfile copia esses diretórios, **não** `tests/`. Antes de prometer um gate de produção, validar `COPY` do Dockerfile × imports/paths relativos do script (ex.: `resolve(here,'../../tests/...')` = ENOENT no container). Padrão adotado: **pack congelado em `src/.../data/*.json`** + **validação Zod + fail-fast** + build que **emite o asset ao `dist/`** (`resolveJsonModule` + import `with { type:'json' }`). DRY/rolled-back é read-only e pode ser permitido em produção; a trava (`--allow-production`) fica **só no `--apply`**.
