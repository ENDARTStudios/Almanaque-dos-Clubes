# CRITÉRIOS DE DESENVOLVIMENTO — Almanaque dos Clubes

> Documento mestre de arquitetura, segurança e governança do projeto.
> Versão: 1.0 | Data: 2026-08-10

---

## ÍNDICE

1. [PRD — Product Requirements Document](#1-prd--product-requirements-document)
2. [UML — Diagrama de Classes e Sequência](#2-uml--diagrama-de-classes-e-sequência)
3. [RBAC — Matriz de Níveis de Acesso](#3-rbac--matriz-de-níveis-de-acesso)
4. [Multi-tenancy — Isolamento por tenant_id](#4-multi-tenancy--isolamento-por-tenant_id)
5. [RLS — Row Level Security](#5-rls--row-level-security)
6. [Secrets Management — Variáveis de Ambiente (.env)](#6-secrets-management--variáveis-de-ambiente-env)
7. [Arquitetura Modular — Catálogo de Apps + Feature Flags](#7-arquitetura-modular--catálogo-de-apps--feature-flags)
8. [Error Reporting — Error Boundary + Captura de Logs](#8-error-reporting--error-boundary--captura-de-logs)
9. [Testes Unitários, Integração e E2E](#9-testes-unitários-integração-e-e2e)
10. [Security Audit — Gate de Deploy](#10-security-audit--gate-de-deploy)
11. [WAF + Bot Fight Mode + Rate Limiting](#11-waf--bot-fight-mode--rate-limiting)
12. [TLS/SSL + HSTS — Full (Strict)](#12-tlsssl--hsts--full-strict)

---

## 1. PRD — Product Requirements Document

### 1.1 Visão do Produto

**Almanaque dos Clubes** é um SaaS B2B/B2C de pesquisa e análise histórica do futebol mundial. Permite que jornalistas, pesquisadores, torcedores e profissionais do futebol consultem dados estruturados de clubes, jogadores, competições, rankings e partidas com busca textual avançada.

### 1.2 Público-Alvo

| Segmento | Tamanho estimado | Plano alvo |
|---|---|---|
| Torcedores / entusiastas | 50k | FREE |
| Jornalistas / blogueiros | 5k | PRO (R$ 29/mês) |
| Profissionais / clubes / federações | 500 | ELITE (R$ 99/mês) |

### 1.3 Funcionalidades por Fase

| Fase | Funcionalidades | Status |
|---|---|---|
| **Fase 0** | Setup monorepo, Docker, .env, git, dependabot | ✅ |
| **Fase 1** | Infra base: Fastify, Helmet, CORS, rate-limit, Pino, Zod, health | ✅ |
| **Fase 2** | Dados: Prisma schema (14 tabelas), migrations, seed, full-text, índices | ✅ |
| **Fase 3** | Auth: JWT+cookie, Register/Login/Logout/Refresh, RBAC, rate-limit, auditoria | 🔄 |
| **Fase 4** | APIs: CRUD clubs/players/competitions/rankings/matches/seasons, billing, busca | 📅 |
| **Fase 5** | Frontend: Next.js, Tailwind, shadcn/ui, CSP, WCAG, PWA | 📅 |
| **Fase 6** | Upload, BullMQ+Redis, Cache, ETL, IA/RAG, Knowledge Graph, feature flags | 📅 |
| **Fase 7** | Hardening: CSP, rate-limit avançado, brute-force, Vault, DNSSEC | 📅 |
| **Fase 8** | Testes: unitários, integração, E2E, SAST, DAST, k6 | 📅 |
| **Fase 9** | CI/CD: GitHub Actions, multi-stage Docker, Trivy, blue-green, observabilidade | 📅 |

### 1.4 Requisitos Não-Funcionais

| Requisito | Alvo |
|---|---|
| Disponibilidade | 99.9% (8h downtime/ano) |
| Latência P95 | < 200ms (API), < 2s (busca textual) |
| Tamanho de payload | 1 MB (bodyLimit Fastify) |
| Cobertura de testes | > 80% unitários, > 60% integração |
| Segurança | OWASP Top 10 mitigado, HSTS preload, argon2id senhas |
| GDPR/LGPD | Audit trail, direito ao esquecimento (soft delete) |

### 1.5 Stack Técnica

```
Monorepo:     pnpm workspaces
Backend:      TypeScript + Fastify 5 + Prisma 5.22
Banco:        PostgreSQL 16 (prod) / SQLite (sandbox)
Validação:    Zod
Auth:         JWT (HS256) + httpOnly cookies + refresh rotation
Senhas:       argon2id (custo 12, 64 MiB)
Logger:       Pino estruturado
Infra:        Docker Compose → k8s (Fase 9)
```

---

## 2. UML — Diagrama de Classes e Sequência

### 2.1 Diagrama de Classes (Domínio)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODELOS PRISMA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐               │
│  │   User   │1──→│ Session  │    │ PasswordReset │               │
│  │──────────│    │──────────│    │──────────────│               │
│  │ id (PK)  │    │ id (PK)  │    │ id (PK)      │               │
│  │ email (U)│    │ userId   │    │ userId (FK)  │               │
│  │ password │    │ tokenHash│    │ tokenHash    │               │
│  │ name     │    │ expiresAt│    │ expiresAt    │               │
│  │ status   │    │ revokedAt│    │ usedAt       │               │
│  │ lastLogin│    │ metadata │    │ createdAt    │               │
│  │ createdAt│    │ createdAt│    └──────────────┘               │
│  │ updatedAt│    └──────────┘                                   │
│  │ deletedAt│                                                   │
│  └────┬─────┘                                                   │
│       │                                                         │
│       │ 1                                        ┌─────────┐   │
│       ├─────────────────────────────────────────→│Billing  │   │
│       │                                          │─────────│   │
│       │ 1                          ┌──────────┐  │ id (PK) │   │
│       ├──────────────────────────→ │Subscription│←──│ subId   │   │
│       │                           │──────────│  │ userId  │   │
│       │                           │ id (PK)   │  │ amountCt│   │
│       │                           │ userId(U) │  │ currency│   │
│       │                           │ plan      │  │ status  │   │
│       │                           │ status    │  │ paidAt  │   │
│       │                           │ startedAt │  │external │   │
│       │                           │currentPer │  │ createdAt│  │
│       │                           │ cancelled │  └─────────┘   │
│       │                           │ createdAt │                 │
│       │                           │ updatedAt │                 │
│       │                           └──────────┘                 │
│       │                    ┌──────────────┐                     │
│       │ N                 │   UserRole   │                     │
│       ├──────────────────→│──────────────│                     │
│       │                   │ userId (PFK) │                     │
│       │                   │ roleId (PFK) │                     │
│       │                   └──────┬───────┘                     │
│       │                          │ N                           │
│       │              ┌───────────┴──────┐                      │
│       │              │      Role       │                      │
│       │              │─────────────────│                      │
│       │              │ id (PK)         │                      │
│       │              │ name (U)        │                      │
│       │              │ description     │                      │
│       │              └───────┬─────────┘                      │
│       │                      │ N                              │
│       │              ┌───────┴──────────┐                     │
│       │              │  RolePermission  │                     │
│       │              │──────────────────│                     │
│       │              │ roleId (PFK)     │                     │
│       │              │ permId (PFK)     │                     │
│       │              └───────┬──────────┘                     │
│       │                      │ N                              │
│       │              ┌───────┴───────┐                        │
│       │              │  Permission   │                        │
│       │              │───────────────│                        │
│       │              │ id (PK)       │                        │
│       │              │ name (U)      │                        │
│       │              │ description   │                        │
│       │              └───────────────┘                        │
│       │                                                       │
│  ┌────┴───────────┐    ┌────────────┐    ┌──────────────┐    │
│  │     Club       │    │   Player   │    │ Competition  │    │
│  │────────────────│    │────────────│    │──────────────│    │
│  │ id (PK)        │    │ id (PK)    │    │ id (PK)      │    │
│  │ name           │    │ name       │    │ name         │    │
│  │ fullName       │    │ fullName   │    │ type (enum)  │    │
│  │ shortName      │    │ birthDate  │    │ country      │    │
│  │ city/state/ctry│    │ nationality│    │ season       │    │
│  │ foundedYear    │    │ position   │    │ startDate    │    │
│  │ status (enum)  │    │ clubId(FK) │    │ endDate      │    │
│  │ primaryColor   │    │ status     │    │ status       │    │
│  │ website        │    │ createdAt  │    │ logoUrl      │    │
│  │ createdAt      │    │ updatedAt  │    │ createdAt    │    │
│  │ updatedAt      │    │ deletedAt  │    │ updatedAt    │    │
│  │ deletedAt      │    └────────────┘    │ deletedAt    │    │
│  │ search_vec(TS) │                      └──────────────┘    │
│  └────────────────┘                                           │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Ranking    │    │ RankingEntry │    │  AuditLog    │     │
│  │──────────────│    │──────────────│    │──────────────│     │
│  │ id (PK)      │  N │ id (PK)      │    │ id (PK)      │     │
│  │ name         │←───│ rankingId(FK)│    │ entityType   │     │
│  │ type         │    │ position     │    │ entityId     │     │
│  │ season       │    │ entityType   │    │ action       │     │
│  │ source       │    │ entityId     │    │ userId       │     │
│  │ description  │    │ score        │    │ changes (J)  │     │
│  │ createdAt    │    │ metadata (J) │    │ metadata (J) │     │
│  │ updatedAt    │    │ createdAt    │    │ createdAt    │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │    Match     │    │    Season    │    │   (Futuro)   │     │
│  │──────────────│    │──────────────│    │──────────────│     │
│  │ id (PK)      │    │ id (PK)      │    │ KnowledgeGraph│    │
│  │ homeClubId   │    │ name         │    │ pgvector     │     │
│  │ awayClubId   │    │ startDate    │    │ LLM/RAG      │     │
│  │ date         │    │ endDate      │    │ Export       │     │
│  │ score        │    │ status       │    │ FeatureFlag  │     │
│  │ competitionId│    │ createdAt    │    │ Webhook      │     │
│  │ seasonId     │    │              │    │ Upload       │     │
│  │ round        │    └──────────────┘    └──────────────┘     │
│  │ status       │                                              │
│  │ createdAt    │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Diagrama de Pacotes (Arquitetura Hexagonal)

```
┌──────────────────────────────────────────────────────────────────┐
│                        apps/api                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │                    src/config                           │      │
│  │    env.ts — Zod schema + dotenv + secrets validation    │      │
│  │    logger.ts — Pino estruturado                         │      │
│  │    prisma.ts — PrismaClient singleton                   │      │
│  │    crypto.ts — argon2id + SHA-256 + timing-safe         │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │                    src/types                            │      │
│  │    fastify.d.ts — extends FastifyRequest/FastifyJWT    │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │                    src/routes                           │      │
│  │    health.ts — GET /health                              │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │                    src/modules                          │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │      │
│  │  │   auth   │  │  clubs   │  │  audit   │  │ billing│ │      │
│  │  │──────────│  │──────────│  │──────────│  │────────│ │      │
│  │  │routes    │  │routes    │  │service   │  │service │ │      │
│  │  │service   │  │service   │  │          │  │        │ │      │
│  │  │schemas   │  │repository│  │          │  │        │ │      │
│  │  │middleware│  └──────────┘  └──────────┘  └────────┘ │      │
│  │  │jwt/sess  │                                          │      │
│  │  │rbac/rate │                                          │      │
│  │  │pwd-reset │                                          │      │
│  │  └──────────┘                                          │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌────────────────────┐  ┌────────────────────────────────┐      │
│  │     app.ts          │  │     server.ts                  │      │
│  │  buildApp() –       │  │  main() – start/shutdown       │      │
│  │  registra plugins   │  │  SIGINT/SIGTERM handlers       │      │
│  └────────────────────┘  └────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     packages/domain                              │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  src/                                                   │      │
│  │  ┌────────────┐  ┌────────────┐                        │      │
│  │  │   club.ts   │  │  errors.ts │                        │      │
│  │  │─────────────│  │────────────│                        │      │
│  │  │Zod schemas  │  │DomainError │                        │      │
│  │  │Club interface│  │NotFound    │                        │      │
│  │  │CreateClub   │  │Conflict    │                        │      │
│  │  └────────────┘  │Validation  │                        │      │
│  │                   └────────────┘                        │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Diagrama de Sequência — Fluxo de Login

```
┌──────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Client│     │auth.routes │     │auth.svc  │     │crypto.ts │     │session   │     │prisma    │
│      │     │Fastify     │     │          │     │          │     │.service  │     │          │
└──┬───┘     └─────┬──────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
   │               │                 │                │               │                │
   │ POST /login   │                 │                │               │                │
   │ email+password│                 │                │               │                │
   │──────────────→│                 │                │               │                │
   │               │login(input,meta)│                │               │                │
   │               │────────────────→│                │               │                │
   │               │                 │findUnique(email)               │                │
   │               │                 │───────────────────────────────────────────────→│
   │               │                 │←───────────────────────────────────────────────│
   │               │                 │                                                │
   │               │                 │verifyPassword(pwd, hash)                       │
   │               │                 │────────────────→│                               │
   │               │                 │←────────────────│                               │
   │               │                 │   boolean       │                               │
   │               │                 │                                                │
   │               │                 │update(lastLoginAt)                             │
   │               │                 │───────────────────────────────────────────────→│
   │               │                 │←───────────────────────────────────────────────│
   │               │                 │                                                │
   │               │                 │createSession(userId,meta)                      │
   │               │                 │────────────────────────→│                       │
   │               │                 │                         │ create(Session)      │
   │               │                 │                         │────────────────────→│
   │               │                 │                         │←────────────────────│
   │               │                 │←────────────────────────│                       │
   │               │                 │   {refreshToken,session}│                       │
   │               │                 │                                                │
   │               │                 │getUserRoles(userId)                            │
   │               │                 │───────────────────────────────────────────────→│
   │               │                 │←───────────────────────────────────────────────│
   │               │                 │                                                │
   │               │                 │getUserPermissions(userId)                      │
   │               │                 │───────────────────────────────────────────────→│
   │               │                 │←───────────────────────────────────────────────│
   │               │                 │                                                │
   │               │                 │auditLog.record(USER_LOGIN)                     │
   │               │                 │───────────────────────────────────────────────→│
   │               │                 │←───────────────────────────────────────────────│
   │               │                 │                                                │
   │               │←────────────────│   {user,refreshToken,sessionId}                │
   │               │                 │                                                │
   │               │setAuthCookies   │                                                │
   │               │(access_token    │                                                │
   │               │ httpOnly cookie,│                                                │
   │               │ refreshToken)   │                                                │
   │←──────────────│                 │                                                │
   │ 200 + cookies │                 │                                                │
```

### 2.4 Diagrama de Sequência — Refresh Token Rotation

```
┌──────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Client│     │auth.routes │     │auth.svc  │     │session   │     │prisma    │
│      │     │            │     │          │     │.service  │     │          │
└──┬───┘     └─────┬──────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
   │               │                 │                │               │
   │ POST /refresh │                 │                │               │
   │ Header: refr. │                 │                │               │
   │──────────────→│                 │                │               │
   │               │refreshSession   │                │               │
   │               │────────────────→│                │               │
   │               │                 │verifySession(token)            │
   │               │                 │────────────────→│               │
   │               │                 │                │findByToken    │
   │               │                 │                │─────────────→│
   │               │                 │                │←─────────────│
   │               │                 │←────────────────│               │
   │               │                 │   session|null  │               │
   │               │                 │                │               │
   │               │  (se session.revokedAt !== null) │               │
   │               │  → revokeAllUserSessions(userId) │               │
   │               │                 │                │               │
   │               │                 │revokeSession(old)              │
   │               │                 │────────────────→│               │
   │               │                 │                │update(revoked)│
   │               │                 │                │─────────────→│
   │               │                 │←────────────────│               │
   │               │                 │                │               │
   │               │                 │createSession(userId,meta)      │
   │               │                 │────────────────→│               │
   │               │                 │                │create(Session)│
   │               │                 │                │─────────────→│
   │               │                 │←────────────────│               │
   │               │                 │   newToken      │               │
   │               │                 │                │               │
   │               │←────────────────│   {user,newToken}              │
   │               │                 │                                │
   │               │setAuthCookies   │                                │
   │←──────────────│                 │                                │
   │ 200 + cookies │                 │                                │
```

---

## 3. RBAC — Matriz de Níveis de Acesso

### 3.1 Roles e Hierarquia

| Role | Descrição | Base |
|---|---|---|
| `admin` | Acesso total ao sistema | Adminitradores da plataforma |
| `pro` | Leitura + escrita de dados próprios | Usuários pagantes (R$ 29/mês) |
| `free` | Apenas leitura de dados públicos | Usuários gratuitos |

### 3.2 Matriz de Permissões

```
Permissão               Recurso        free    pro     admin
─────────────────────────────────────────────────────────────
clubs:read              Club           ✅      ✅      ✅
clubs:write             Club           ❌      ✅      ✅
clubs:manage            Club           ❌      ❌      ✅
clubs:delete            Club           ❌      ❌      ✅

players:read            Player         ❌      ✅      ✅
players:write           Player         ❌      ✅      ✅
players:manage          Player         ❌      ❌      ✅

competitions:read       Competition    ✅      ✅      ✅
competitions:write      Competition    ❌      ❌      ✅
competitions:manage     Competition    ❌      ❌      ✅

rankings:read           Ranking        ✅      ✅      ✅
rankings:write          Ranking        ❌      ❌      ✅
rankings:publish        Ranking        ❌      ❌      ✅

users:read              User           ✅      ✅      ✅
users:manage            User           ❌      ❌      ✅

billings:read           Billing        ✅      ✅      ✅
billings:refund         Billing        ❌      ❌      ✅

audit_logs:read         AuditLog       ❌      ❌      ✅
```

### 3.3 Modelo de Dados RBAC

```
User ──N── UserRole ──N── Role ──N── RolePermission ──N── Permission

UserRole:       PK (userId, roleId)
RolePermission: PK (roleId, permissionId)

Cache:          Map<userId, { permissions: Set<string>, expiresAt }>
TTL:            5 min
Invalidação:    assignRole / revokeRole → delete cache entry
```

### 3.4 Proteção de Endpoints

```
Middleware Stack para rota protegida:
  1. authenticate            → extrai + valida JWT do cookie
  2. requirePermission('X')  → verifica permissão no payload JWT
  3. requireRole('Y')        → verifica role no payload JWT

├ POST   /api/v1/clubs          → authenticate + requirePermission('clubs:write')
├ PUT    /api/v1/clubs/:id      → authenticate + requirePermission('clubs:write')
├ DELETE /api/v1/clubs/:id      → authenticate + requirePermission('clubs:delete')
├ POST   /api/v1/admin/users    → authenticate + requireRole('admin')
├ POST   /api/v1/admin/refund   → authenticate + requirePermission('billings:refund')
```

---

## 4. Multi-tenancy — Isolamento por tenant_id

### 4.1 Modelo de Dados

O multitenancy é baseado em **discriminação por `userId`** (cada usuário é seu próprio tenant lógico no plano FREE/PRO) + **admin cross-tenant** para ELITE/admin.

```
User ─→ Club        (userId: criador do clube)
User ─→ Session     (userId: dono da sessão)
User ─→ Subscription(userId: único por usuário, userId @unique)
User ─→ Billing     (userId: dono da cobrança)
User ─→ AuditLog    (userId: executor da ação)
```

### 4.2 Padrão Repository com Isolamento

```typescript
// apps/api/src/modules/clubs/repository.ts
// Toda query filtrar por userId = request.user.id
async function findMany(userId: string, filters: ClubFilters) {
  return prisma.club.findMany({
    where: {
      userId,  // ← tenant isolation automática
      ...filters,
    },
  });
}
```

### 4.3 Isolamento por Plano

| Funcionalidade | FREE | PRO | ELITE |
|---|---|---|---|
| Clubes próprios | 5 | 50 | ilimitado |
| Players próprios | ❌ | 200 | ilimitado |
| Export CSV | ❌ | ✅ | ✅ |
| API Key | ❌ | ❌ | ✅ |
| Suporte prioritário | ❌ | ❌ | ✅ |

### 4.4 Admin Cross-Tenant

Usuários com role `admin` ignoram o filtro `userId` e enxergam todos os tenants. Controlado por permissão `clubs:manage`.

```typescript
async function findMany(userId: string, isAdmin: boolean, filters: ClubFilters) {
  const where: Prisma.ClubWhereInput = {};
  if (!isAdmin) where.userId = userId; // tenant isolation
  if (!isAdmin && !userHasPermission('clubs:manage')) where.userId = userId;
  return prisma.club.findMany({ where: { ...where, ...filters } });
}
```

### 4.5 Escalabilidade Futura

Para multi-instance com Redis:
- Cache de permissões por tenant (TTL 5 min)
- Invalidar via pub/sub quando role mudar
- Rate-limit por tenant (não apenas por IP)

---

## 5. RLS — Row Level Security

### 5.1 Estratégia

O projeto implementa **RLS em nível de aplicação** (não PostgreSQL RLS nativo), com planos de migrar para RLS nativo do PostgreSQL quando houver múltiplas instâncias.

**Motivo:** Com SQLite no sandbox, RLS do PostgreSQL não funciona. A abordagem app-level é portável.

### 5.2 Regras de Isolamento em Aplicação

| Entidade | Regra | Implementação |
|---|---|---|
| Club | userId = current user (exceto admin) | `repository.ts` — `where: { userId }` |
| Player | via clubId indireto | `repository.ts` — `where: { club: { userId } }` |
| Session | userId = current user | `session.service.ts` |
| Billing | userId = current user | `subscription.service.ts` |
| AuditLog | userId = current user (admin: todos) | `audit-log.service.ts` |

### 5.3 PostgreSQL RLS Nativo (Fase 7)

```sql
-- Preparação
ALTER TABLE "Club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Club" FORCE ROW LEVEL SECURITY;

CREATE POLICY club_tenant_isolation ON "Club"
  USING ("userId" = current_setting('app.current_user_id')::uuid);

-- Função auxiliar
CREATE OR REPLACE FUNCTION set_app_user_id(user_id uuid)
RETURNS void AS $$
  SELECT set_config('app.current_user_id', user_id::text, true);
$$ LANGUAGE sql;
```

### 5.4 Soft Delete + RLS

Todas as entidades de domínio (Club, Player, Competition) têm `deletedAt: DateTime?`. Queries RLS + aplicação filtram `WHERE deletedAt IS NULL` por padrão, com opção `includeDeleted` para admin.

---

## 6. Secrets Management — Variáveis de Ambiente (.env)

### 6.1 Arquivos

| Arquivo | Uso | Versionado? |
|---|---|---|
| `.env.example` | Template com placeholders e instruções | ✅ Sim |
| `.env` | Valores efetivos (desenvolvimento) | ❌ Não (gitignored) |
| `.env.production` | Valores de produção | ❌ Não (gitignored) |

### 6.2 Validação de Secrets (em runtime)

`apps/api/src/config/env.ts` implementa validação rigorosa:

```typescript
// 1. Schema Zod
const envSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']),
  port: z.coerce.number().int().min(1).max(65535),
  host: z.string(),
  logLevel: z.enum(['fatal','error','warn','info','debug','trace']),
  databaseUrl: z.string().min(1),
  prismaSchemaProvider: z.enum(['sqlite', 'postgres']),
});

// 2. Forbidden secrets list
const FORBIDDEN_SECRETS = new Set([
  'SUA_CHAVE_AQUI', 'SUA_CHAVE_JWT_AQUI', 'SUA_CHAVE_REFRESH_AQUI',
  'changeme', 'secret', 'jwt_secret', 'your-secret-key',
]);

// 3. Validação de JWT_SECRET
if (FORBIDDEN_SECRETS.has(value.toLowerCase()))
  throw new Error('Placeholder proibido');
if (value.length < (isProd ? 32 : 16))
  throw new Error('Muito curta');

// 4. Produção: JWT_SECRET !== JWT_REFRESH_SECRET (obrigatório)
// 5. Desenvolvimento: geração de secret efêmero se não definido
```

### 6.3 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de conexão PostgreSQL |
| `JWT_SECRET` | ✅ (prod) | Chave de assinatura JWT (≥32 chars) |
| `JWT_REFRESH_SECRET` | ✅ (prod) | Chave de refresh (≠ JWT_SECRET, ≥32 chars) |
| `JWT_EXPIRES_IN` | ❌ | Padrão: `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | Padrão: `7d` |
| `NODE_ENV` | ❌ | development / test / production |
| `PORT` | ❌ | Padrão: 3000 |
| `HOST` | ❌ | Padrão: 0.0.0.0 |
| `LOG_LEVEL` | ❌ | Padrão: info |
| `PRISMA_SCHEMA_PROVIDER` | ❌ | sqlite / postgres |
| `DB_PASSWORD` | ❌ | Senha do banco (dev) |

### 6.4 Roadmap de Secrets (Fase 7)

| Fase | Melhoria |
|---|---|
| **Fase 7** | HashiCorp Vault para rotação automática de segredos |
| **Fase 7** | DNSSEC + certificados ACME automáticos |
| **Fase 7** | Criptografia de colunas sensíveis (dados pessoais) |

---

## 7. Arquitetura Modular — Catálogo de Apps + Feature Flags

### 7.1 Catálogo de Apps (Monorepo)

```
almanaque-dos-clubes/
├── apps/
│   ├── api/          ← REST API (Fastify)
│   ├── web/          ← Frontend Next.js (Fase 5)
│   ├── worker/       ← BullMQ worker (Fase 6)
│   └── admin/        ← Painel admin (Fase 6)
│
├── packages/
│   ├── domain/       ← Entidades, schemas Zod, erros (puro, sem I/O)
│   ├── database/     ← Prisma schema compartilhado
│   ├── auth/         ← Lógica de auth cross-app
│   ├── ui/           ← Componentes compartilhados (Fase 5)
│   └── config/       ← ESLint, tsconfig, etc.
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### 7.2 Feature Flags (Fase 6)

```typescript
// packages/feature-flags/src/index.ts
export const FeatureFlag = {
  EXPORT_CSV:         'export_csv',         // PRO+
  ADVANCED_SEARCH:    'advanced_search',    // PRO+
  API_KEYS:           'api_keys',           // ELITE
  KNOWLEDGE_GRAPH:    'knowledge_graph',    // ELITE
  WEBHOOKS:           'webhooks',           // ELITE
  BULK_IMPORT:        'bulk_import',        // admin
  BETA_FEATURE_X:     'beta_feature_x',     // internal
} as const;

// Estratégias de rollout:
// 1. Por plano (plan gating): FREE/PRO/ELITE
// 2. Por usuário (allowlist): userId in allowlist
// 3. Porcentage (gradual): random sample 0-100
// 4. Ambiental: dev/staging/prod

// Storage: tabela UserFeatureFlag ou Redis
```

### 7.3 Modularização por Módulo (apps/api)

```
src/modules/
├── auth/        → auth.routes.ts, auth.service.ts, jwt.service.ts,
│                  session.service.ts, rbac.service.ts, authenticate.middleware.ts
│                  auth.schemas.ts, rate-limit.service.ts, password-reset.service.ts
├── clubs/       → routes.ts, service.ts, repository.ts
├── players/     → routes.ts, service.ts, repository.ts (Fase 4)
├── competitions/→ routes.ts, service.ts, repository.ts (Fase 4)
├── rankings/    → routes.ts, service.ts, repository.ts (Fase 4)
├── matches/     → routes.ts, service.ts, repository.ts (Fase 4)
├── seasons/     → routes.ts, service.ts, repository.ts (Fase 4)
├── billing/     → subscription.service.ts
├── audit/       → audit-log.service.ts
└── admin/       → admin routes (Fase 6)

Princípio: cada módulo é auto-contido (routes + service + repository).
Nenhum módulo importa de outro módulo — apenas dos services autorizados.
```

### 7.4 Dependências Entre Módulos

```
auth.service → session.service, rbac.service, crypto, audit, billing
              (orquestração, sem circular)
clubs.service → clubs.repository, domain (schemas)
audit-log     → prisma (append-only, independente)
billing       → prisma (independente)
```

---

## 8. Error Reporting — Error Boundary + Captura de Logs

### 8.1 Error Handler Global (Fastify)

```typescript
// apps/api/src/app.ts
app.setErrorHandler((err, _request, reply) => {
  logger.error({ err }, 'Unhandled error');

  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
  const message = statusCode >= 500 && env.isProd
    ? 'Erro interno do servidor'             // Não vazar detalhes em prod
    : err instanceof Error ? err.message
    : 'Erro desconhecido';

  return reply.status(statusCode).send({ error: { code, message } });
});
```

### 8.2 Domain Error Hierarchy

```
Error
└── DomainError (code + statusCode)
    ├── NotFoundError      → 404
    ├── ConflictError      → 409
    ├── ValidationError    → 422
    └── AuthError          → 401 (credenciais inválidas)
```

### 8.3 Captura de Logs Estruturados (Pino)

```typescript
// logger.ts — Pino + pino-pretty (dev)
const logger = pino({
  level: env.logLevel,
  ...(env.isDev ? {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' }
    }
  } : {}),
});
```

**Níveis de log:**
- `fatal` → Falha ao iniciar servidor
- `error` → Erros não tratados, auditoria falha
- `warn` → Rate-limit excedido, refresh token reuso
- `info` → Login, registro, operações CRUD
- `debug` → Queries Prisma (dev)

### 8.4 Redaction de Dados Sensíveis (AuditLog)

```typescript
const SENSITIVE_FIELDS = new Set([
  'password', 'passwordhash', 'token', 'tokenhash',
  'refreshtoken', 'accesstoken', 'secret', 'apikey',
  'authorization', 'cookie',
]);

function redactSensitive<T>(input: T): T {
  // Substitui valor por '***REDACTED***'
}
```

### 8.5 Error Boundary (Frontend — Fase 5)

```typescript
// apps/web/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error({ error, info }, 'React Error Boundary caught');
    // Enviar para Sentry / DataDog
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 8.6 Observabilidade (Fase 9)

```
Stack planejada:
- Métricas: Prometheus (+ fastify-metrics)
- Logs agregados: Loki + Grafana
- Tracing: OpenTelemetry (opcional)
- APM: Sentry ou DataDog
- Alertas: Grafana AlertManager
```

---

## 9. Testes Unitários, Integração e E2E

### 9.1 Pirâmide de Testes

```
         ╱╲
        ╱ E2E ╲           Playwright / Cypress
       ╱────────╲
      ╱ Integração ╲      Vitest + Supertest + Prisma
     ╱──────────────╲
    ╱   Unitários     ╲   Vitest (isolado, sem I/O)
   ╱────────────────────╲
```

### 9.2 Estrutura de Testes

```
apps/api/
├── tests/
│   ├── unit/
│   │   ├── auth/
│   │   │   ├── auth.service.test.ts
│   │   │   ├── rbac.service.test.ts
│   │   │   ├── jwt.service.test.ts
│   │   │   └── rate-limit.service.test.ts
│   │   ├── clubs/
│   │   │   ├── clubs.service.test.ts
│   │   │   └── clubs.repository.test.ts
│   │   ├── billing/
│   │   │   └── subscription.service.test.ts
│   │   ├── audit/
│   │   │   └── audit-log.service.test.ts
│   │   └── config/
│   │       ├── env.test.ts
│   │       └── crypto.test.ts
│   │
│   ├── integration/
│   │   ├── auth/
│   │   │   ├── auth.routes.test.ts         ← fluxo register→login→refresh→logout
│   │   │   ├── auth.rbac.test.ts           ← permissões por role
│   │   │   └── auth.rate-limit.test.ts     ← brute force detection
│   │   ├── clubs/
│   │   │   ├── clubs.crud.test.ts          ← CRUD com tenant isolation
│   │   │   └── clubs.search.test.ts        ← full-text search
│   │   ├── billing/
│   │   │   └── billing.integration.test.ts ← subscription + payment flow
│   │   └── audit/
│   │       └── audit-log.integration.test.ts
│   │
│   └── e2e/
│       ├── auth.flow.e2e.ts                ← navegador real (login/logout)
│       ├── clubs.flow.e2e.ts               ← CRUD + verificação visual
│       └── billing.flow.e2e.ts             ← upgrade PRO, cancelamento
```

### 9.3 Definições

**Testes Unitários:**
- Mock total de Prisma (via `vitest-mock-extended` ou `prisma-mock`)
- Testar lógica pura: `hashPassword/verifyPassword`, `generateToken`, `redactSensitive`
- Testar regras de negócio: `hasMinimumPlan`, `isValidPlan`, `userHasPermission`
- Testar validação: `CreateClubSchema`, `RegisterSchema`

**Testes de Integração:**
- Banco de teste PostgreSQL (Docker) ou SQLite em memória
- Fastify `inject()` para chamadas HTTP reais
- Prisma Migrate antes da suíte, seed + reset entre testes
- Testar fluxos completos: register → login → createClub → listClubs → refresh
- Testar isolamento tenant: User A não vê Club de User B

**Testes E2E (Fase 8):**
- Playwright ou Cypress contra instância completa (API + Frontend)
- Cenários críticos: login, cadastro, busca, upgrade de plano
- Mobile viewport (PWA)

### 9.4 Scripts de Verificação Atuais

O projeto já possui 8 scripts de verificação (`apps/api/scripts/verify-*.ts`) com **313 asserções** no total:

| Script | Asserções | O que cobre |
|---|---|---|
| verify-crypto.ts | 49 | argon2id, SHA-256, timing-safe |
| verify-auth-preflight.ts | 28 | env.ts, secrets validation |
| verify-jwt-setup.ts | 50 | JWT plugin, cookies, types |
| verify-auth-routes.ts | 71 | Register/Login/Logout/Refresh |
| verify-session.ts | 29 | Create/Verify/Revoke/Cleanup |
| verify-rbac.ts | 29 | Roles, permissions, cache |
| verify-billing.ts | 45 | Subscription + Billing |
| verify-auditlog.ts | 12 | Append-only, redaction |

### 9.5 Cobertura Alvo

| Tipo | Cobertura | Ferramenta |
|---|---|---|
| Unitários | > 80% linhas | Vitest + c8/istanbul |
| Integração | > 60% linhas | Vitest |
| E2E | Fluxos críticos (5 cenários) | Playwright |
| SAST (CodeQL) | 100% severities críticas | GitHub CodeQL |

---

## 10. Security Audit — Gate de Deploy

### 10.1 Pipeline CI/CD (GitHub Actions — Fase 9)

```yaml
# .github/workflows/deploy-gate.yml
name: Security Gate

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      # 1. SAST - Static Analysis
      - run: npm audit --audit-level=high
      - run: npx tsx scripts/verify-crypto.ts
      - run: npx tsx scripts/verify-auth-preflight.ts

      # 2. Lint + Typecheck
      - run: pnpm lint
      - run: pnpm typecheck

      # 3. Unit Tests
      - run: pnpm test:unit --coverage
      - run: pnpm test:integration

      # 4. Container Scan (Trivy)
      - run: trivy image --severity CRITICAL almanaque-api:latest

      # 5. DAST (ZAP) — staging
      - run: zap-cli quick-scan --self-contained http://staging:3000

      # 6. Dependency Check
      - run: pnpm audit
      - run: npx snyk test --severity-threshold=high

      # 7. Performance (k6)
      - run: k6 run scripts/load-test.js --vus 50 --duration 30s

  deploy:
    needs: [security-gate]
    if: success()
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy autorizado"
```

### 10.2 Gate Rules

| Regra | Ação |
|---|---|
| `npm audit` com severidade CRITICAL | ❌ Bloqueia |
| `tsc --noEmit` com erro | ❌ Bloqueia |
| Testes unitários com falha | ❌ Bloqueia |
| Cobertura < 80% | ⚠️ Warning (não bloqueia) |
| Trivy com CVE CRITICAL | ❌ Bloqueia |
| ZAP com alerta HIGH | ❌ Bloqueia |
| k6 p95 > 500ms | ⚠️ Warning |

### 10.3 Scripts de Verificação Pré-Deploy

```powershell
# scripts/verify-migration.ps1
Verifica: extensões PostgreSQL, 14 tabelas, índices GIN, triggers,
          dados de seed (10 clubes, 3 competições, 2 rankings, 3 roles,
          18 permissões, 31 atribuições)

# apps/api/scripts/verify-*.ts (8 scripts, 313 asserções)
```

---

## 11. WAF + Bot Fight Mode + Rate Limiting

### 11.1 WAF — Web Application Firewall

**Cloudflare WAF (produção):**

| Regra | Ação | Descrição |
|---|---|---|
| OWASP Core Ruleset | BLOCK | SQLi, XSS, LFI, RCE, RFI |
| Rate Limiting | BLOCK | > 100 req/min por IP |
| Bot Fight Mode | BLOCK/JS Challenge | Bloquear bots conhecidos |
| Geo-blocking | BLOCK | Países sem operação |
| API Shield | BLOCK | Requisições sem valid schema |

```yaml
# Cloudflare WAF custom rule (exemplo)
- expression: "(http.request.uri.path contains \"/api/v1/auth/login\")"
  action: "block"
  ratelimit:
    characteristics: ["cf.unique_ip"]
    period: 900        # 15 min
    requests_per_period: 5
    mitigation_timeout: 3600  # 1h lockout
```

### 11.2 Bot Fight Mode

| Recurso | Ativado? | Configuração |
|---|---|---|
| JS Challenge | ✅ | Requisições suspeitas (headless browsers) |
| CAPTCHA (Turnstile) | ✅ | Após 3 tentativas de login falhas |
| Block AI Crawlers | ✅ | Bloquear GPTBot, CCBot, etc. |
| Block Spam Referrers | ✅ | Lista de referrers maliciosos |

### 11.3 Rate Limiting em Aplicação

```typescript
// apps/api/src/modules/auth/rate-limit.service.ts

// Constantes
LOGIN_MAX_ATTEMPTS     = 5   // por IP, a cada 15 min
LOGIN_LOCKOUT_AFTER    = 10  // falhas consecutivas → lockout 1h
FORGOT_PASSWORD_MAX    = 3   // por IP/hora
API_KEY_RATE           = 30  // req/min (ELITE)

// Implementação atual: em memória
// Futuro (Fase 6): Redis (ioredis + @fastify/rate-limit)
```

### 11.4 Camadas de Rate Limiting

```
Layer 1: Cloudflare WAF          → 100 req/min por IP (global)
Layer 2: Fastify (@fastify/rate-limit) → 30 req/min por IP (API)
Layer 3: Aplicação (rate-limit.service) → 5 req/15min (login)
Layer 4: Lockout progressivo     → 1h após 10 falhas consecutivas
```

### 11.5 Headers Anti-Automação

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1620000000
Retry-After: 120
```

---

## 12. TLS/SSL + HSTS — Full (Strict)

### 12.1 TLS/SSL

**Certificado:**
- Provedor: Let's Encrypt (automático via ACME)
- Validação: DNS-01 (wildcard `*.almanaque.app`)
- Renovação: Auto (certbot / Traefik / Caddy)
- Ciphers permitidos: apenas TLS 1.3 (produção)

```nginx
# Caddyfile (produção)
almanaque.app, *.almanaque.app {
    tls {
        protocols tls1.3
        curves x25519
        alpn h2 http/1.1
    }
    reverse_proxy api:3000
}

# Strict Transport Security
header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
}
```

### 12.2 HSTS — Full (Strict)

Configuração atual (Fastify Helmet):

```typescript
await app.register(helmet, {
  hsts: env.isProd ? {
    maxAge: 31536000,          // 1 ano (recomendado mínimo)
    includeSubDomains: true,   // Todos os subdomínios
    preload: true,             // Google Chrome preload list
  } : false,
});
```

**Alvo para Fase 7 (Full Strict):**

| Parâmetro | Atual | Alvo |
|---|---|---|
| `max-age` | 1 ano (31536000) | 2 anos (63072000) |
| `includeSubDomains` | ✅ | ✅ |
| `preload` | ✅ | ✅ (submeter ao hstspreload.org) |
| TLS min version | 1.2 | 1.3 |
| OCSP Stapling | ❌ | ✅ |
| HTTP → HTTPS redirect | 301 | 308 (permanente) |

### 12.3 Headers de Segurança (Helmet)

```typescript
{
  contentSecurityPolicy: env.isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind JIT
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.almanaque.app"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  } : false,

  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: false,
    microphone: false,
    geolocation: false,
  },
}
```

### 12.4 TLS Configuration (nginx/Traefik — Produção)

```nginx
ssl_protocols TLSv1.3;
ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# Diffie-Hellman parameters
ssl_dhparam /etc/ssl/dhparam.pem;

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name almanaque.app *.almanaque.app;
    return 308 https://$host$request_uri;
}
```

### 12.5 Certificados e Renovação (Fase 7)

| Tarefa | Prazo |
|---|---|
| Let's Encrypt + DNS-01 wildcard | Fase 7 |
| Auto-renewal via certbot/caddy | Fase 7 |
| Submeter hstspreload.org | Fase 7 |
| Certificate Transparency logs | Fase 7 |
| HPKP (opcional — deprecated) | ❌ Não implementar |

### 12.6 Checklist de Segurança (OWASP Top 10)

| Item | Status | Onde |
|---|---|---|
| **Broken Access Control** | ✅ | RBAC + authenticate middleware |
| **Cryptographic Failures** | ✅ | argon2id + SHA-256 + env validation |
| **Injection** | ✅ | Prisma ORM (parameterized queries) |
| **Insecure Design** | ✅ | Rate limit + lockout + audit log |
| **Security Misconfiguration** | ✅ | Helmet + env val + strict TS |
| **Vulnerable Components** | ⚠️ | npm audit + Dependabot (Fase 9) |
| **Auth Failures** | ✅ | JWT + httpOnly + refresh rotation |
| **Data Integrity Failures** | ✅ | AuditLog append-only + redaction |
| **Logging Failures** | ✅ | Pino estruturado + audit trail |
| **SSRF** | ⚠️ | Validar URLs de entrada (Fase 4) |

---

## Apêndice: Mapa de Arquivos

| Documento/Código | Caminho |
|---|---|
| Domain schemas | `packages/domain/src/club.ts` |
| Domain errors | `packages/domain/src/errors.ts` |
| Env validation | `apps/api/src/config/env.ts` |
| Crypto (argon2id) | `apps/api/src/config/crypto.ts` |
| Logger (Pino) | `apps/api/src/config/logger.ts` |
| Prisma client | `apps/api/src/config/prisma.ts` |
| App factory | `apps/api/src/app.ts` |
| Server entry | `apps/api/src/server.ts` |
| Auth routes | `apps/api/src/modules/auth/auth.routes.ts` |
| Auth service | `apps/api/src/modules/auth/auth.service.ts` |
| JWT service | `apps/api/src/modules/auth/jwt.service.ts` |
| Session service | `apps/api/src/modules/auth/session.service.ts` |
| RBAC service | `apps/api/src/modules/auth/rbac.service.ts` |
| Auth middleware | `apps/api/src/modules/auth/authenticate.middleware.ts` |
| Rate limit | `apps/api/src/modules/auth/rate-limit.service.ts` |
| Password reset | `apps/api/src/modules/auth/password-reset.service.ts` |
| Clubs module | `apps/api/src/modules/clubs/{routes,service,repository}.ts` |
| Billing service | `apps/api/src/modules/billing/subscription.service.ts` |
| Audit log | `apps/api/src/modules/audit/audit-log.service.ts` |
| Prisma schema (PG) | `apps/api/prisma/schema.prisma` |
| Prisma schema (SQLite) | `apps/api/prisma/schema.sqlite.prisma` |
| Seed data | `apps/api/prisma/seed.ts` |
| Verify scripts | `apps/api/scripts/verify-*.ts` (x8) |
| Docker compose | `docker-compose.yml` |
| Env template | `.env.example` |
| Env effective | `.env` |
| Decision log | `DECISOES.md` |
| Master plan | `PLANO_MESTRE.md` |
