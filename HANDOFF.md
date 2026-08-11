# HANDOFF.md — Almanaque dos Clubes

> Documento de transferência de contexto gerado em 2026-08-11.
> Destinado a qualquer desenvolvedor que assuma o projeto.

---

## 1. Resumo do Projeto

**Almanaque dos Clubes** é uma plataforma SaaS de inteligência sobre futebol brasileiro e mundial. Reúne história completa de clubes, jogadores, competições, rankings auditáveis e IA com respostas fundamentadas em dados (RAG + pgvector).

**Stack principal:** TypeScript | Fastify 5 | Next.js 16 | Prisma 5 | PostgreSQL 16 | Redis | MinIO | BullMQ | Docker | pnpm workspaces

**Repositório:** `github.com/ENDARTStudios/Almanaque-dos-Clubes`
**Branch principal:** `main`
**Último commit:** `c45e016` — "feat: deploy docker + api funcional + roadmap completo"

---

## 2. Estrutura do Projeto

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

### 2.1 Módulos da API (`apps/api/src/modules/`)

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

## 3. Estado Atual

### ✅ Concluído (10 fases do Plano Mestre)

- **Fase 0:** Setup (monorepo, gitignore, ESLint, Prettier, Dependabot, SECURITY.md)
- **Fase 1:** Infra base (Fastify, Helmet, CORS, rate-limit, Pino, Zod, health, metrics)
- **Fase 2:** Dados (15 tabelas Prisma: clubs, players, competitions, rankings, matches, seasons, users, roles, permissions, sessions, subscriptions, billings, audit_logs, knowledge_graph + full-text search)
- **Fase 3:** Auth (JWT HS256 + refresh rotation + argon2id + RBAC + session + rate-limit + password-reset)
- **Fase 4:** APIs/CRUDs (todos os 14 módulos funcionais)
- **Fase 5:** Frontend (Next.js 16, Tailwind 4, GSAP, PWA, WCAG AA, ProtectedRoute)
- **Fase 6:** Avançado (Upload MinIO, BullMQ/Redis, Cache, ETL, IA/RAG, Knowledge Graph, Feature Flags, CSV/JSON, WebSocket)
- **Fase 7:** Hardening (CSP, rate-limit 4 camadas, body limit, secret rotation)
- **Fase 8:** Testes (21 unit+int, Vitest, Playwright E2E, ESLint security, CodeQL, DAST ZAP, k6 load/stress)
- **Fase 9:** CI/CD (GitHub Actions, Docker multi-stage, Trivy, security gate, backup scripts)

### ⚠️ Pendente / Bloqueado

| Item | Responsável | Bloqueia? |
|------|-------------|-----------|
| 1. **Registrar domínio** (ex: almanaque.app) | Operador | 🔴 Produção |
| 2. **Escolher plataforma de deploy** (Fly.io vs Railway) | Operador | 🔴 Deploy |
| 3. **Executar migration PostgreSQL** (`pwsh ./scripts/migrate.ps1`) | Operador | 🔴 Deploy |
| 4. **Stripe/PagSeguro — criar conta e configurar webhook** | Operador | 🟡 Billing real |
| 5. **Ollama + pgvector — instalar e configurar** | Dev | 🟡 RAG |
| 6. **ETL — scrapers reais (RSSSF, FBref)** | Dev | 🟡 Dados |
| 7. **Blue-green / zero-downtime deploy** | Dev | 🟡 Qualidade |
| 8. **Observabilidade (Loki/Prometheus/Grafana)** — Fase 14 | Dev | 🟢 Desejável |
| 9. **2FA TOTP** — Fase 3.9 opcional | Dev | 🟢 Desejável |

---

## 4. Como Executar Localmente

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
| `pnpm test` | Vitest (unit + integration) |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm test:k6` | k6 load test (100 users) |
| `pnpm db:seed` | Seed: 10 clubes, 3 competições, 2 rankings, RBAC |

---

## 5. Deploy

### Docker
```bash
# Build imagem da API
docker build -t almanaque-api -f apps/api/Dockerfile .

# Docker Compose (produção local)
docker compose up -d
```

### CI/CD (GitHub Actions)
- **ci.yml:** Executa em push para `main`/`staging` e PRs para `main`
  - Setup PostgreSQL 16 service container
  - `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm audit` → Deploy staging
  - Escaneia imagem Docker com Trivy (bloqueia CVEs CRITICAL)
- **dast.yml:** OWASP ZAP semanal (domingos 06:00 UTC)

---

## 6. Decisões Técnicas Importantes

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

---

## 7. Database

**14 modelos Prisma** (PostgreSQL em produção, SQLite em dev sandbox):
- clubs, players, competitions, seasons, matches, rankings, ranking_entries
- users, roles, permissions, user_roles, role_permissions
- sessions, subscriptions, billings, audit_logs, knowledge_graph

**Extensões PostgreSQL:** uuid-ossp, pgcrypto, pg_trgm, pgvector
**Full-text:** Coluna tsvector em clubs + GIN index (SQL raw, não Prisma)

Para migrar: `pwsh ./scripts/migrate.ps1` (Windows) ou `npx prisma migrate deploy` (Linux).

---

## 8. Testes

| Suite | Framework | Qtd | O que cobre |
|-------|-----------|-----|-------------|
| Unit (API) | Vitest | 5+ | Clubs service (create, validation, duplicate, getById) |
| Unit (Domain) | Vitest | 4 | Zod schemas validation |
| Integration | Vitest | 6 | Health, clubs, auth, 404 |
| E2E (Web) | Playwright | 1+ | Auth flow + clubs list |
| Load | k6 | 1 | 100 concurrent users |
| Stress | k6 | 1 | 1000 concurrent users |
| Verification | TS scripts | 8 | 313 asserções (auth, JWT, crypto, session, RBAC, audit, billing) |

---

## 9. Riscos Imediatos

1. **Domínio não registrado** → bloqueia HSTS preload, DNSSEC, produção
2. **Migration PostgreSQL pendente** → banco SQLite apenas para dev
3. **Sem provedor de pagamento** → billing real não funciona
4. **Sem dados reais** → ETL precisa ser populado (RSSSF, FBref)
5. **RAG sem Ollama** → endpoint /ai/ask não responde

---

## 10. Roadmap (Próximos Passos)

### Imediato (Fase 10 — Go to Production)
1. Registrar domínio (Operador)
2. Escolher Fly.io vs Railway (Operador)
3. Migration PostgreSQL (Operador)
4. Criar conta Stripe + webhook (Operador)
5. Deploy staging com Docker + env vars

### Curto prazo (Fases 11-12)
6. Scrapers RSSSF + FBref para dados reais
7. Ollama + pgvector + pipeline RAG completo
8. Stripe integrado com prorrotação
9. Email onboarding (Resend + BullMQ)
10. SEO: blog, páginas de clubes, rich snippets

### Médio prazo (Fases 13-14)
11. Compress, HTTP/2, CDN
12. Observabilidade (Loki + Grafana)
13. Cache inteligente em endpoints críticos
14. Teste de carga com 1000 usuários reais

---

## 11. Para Quem Assumir

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

### Arquivos de configuração importantes:
- `.env.example` — template de variáveis de ambiente
- `docker-compose.yml` — infraestrutura local
- `.github/workflows/ci.yml` — pipeline de CI
- `apps/api/prisma/schema.prisma` — schema do banco

---

## 12. Contatos e Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| **Operador** (humano) | Domínio, deploy, Stripe, secrets, DNS, decisões de negócio |
| **Desenvolvedor** (IA ou humano) | Código, testes, infra como código, documentação técnica |

Toda interação entre Dev e Operador segue o `PROTOCOLO_MESTRE.md` — nada é decidido por prosa livre no chat. Decisões vão para `DECISOES.md`. Pendências do Operador vão para `PENDENCIAS_OPERADOR.md`.

---

*Handoff gerado em 2026-08-11. Qualquer dúvida, consulte a documentação listada na seção 11 ou abra uma issue no repositório.*
