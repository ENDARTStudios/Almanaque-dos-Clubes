# ARCHITECTURE.md — Arquitetura do sistema

> Catálogo completo de componentes: [docs/02-architecture-design/ARCHITECTURE.md](./ARCHITECTURE.md) ·
> Diagramas: [docs/02-architecture-design/UML.md](./UML.md) (gaps em UML-GAP-ANALYSIS.md). Esta página
> é a visão atual de alto nível (2026-09-22).

## Visão geral

```
Browser ── Vercel (Next.js 16: SSR + client components)
              │  fetch (cookies __Host-, CSRF)
              ▼
Railway ── Fastify API (/api/v1, 20 módulos) ── Prisma ──▶ PostgreSQL 16 (RLS FORCE)
   │              │                                      └─ tsvector (busca) + PostGIS (disponível)
   │              ├── Redis (cache read-through + rate-limit)
   │              └── BullMQ (queues: etl · email · export · ranking)
   └── Worker (consumers ETL/e-mail)
Fontes: Wikidata SPARQL (CC0) ──▶ scripts de ingestão (dist/scripts no container, DRY-RUN/--apply)
```

## Monorepo (pnpm)

| Pacote | Papel |
|---|---|
| `apps/web` | Next.js — vitrine, oferta, legais, i18n pt/en/es, fontes self-hosted |
| `apps/api` | Fastify — 20 módulos de rota + services + `src/scripts` (ingestão executável em prod) |
| `apps/worker` | consumers BullMQ (etl-connector inclui `wikidata-titles` do T448) |
| `packages/domain` | schemas Zod + tipos + pricing compartilhados |

## Decisões estruturais que moldam o código (ver [ADR.md](./ADR.md))

1. **Proveniência por registro** — dado importado carrega fonte/QID/URL/data/licença; KG guarda
   proveniência DENTRO de `metadata` (`dataSource`, `sourceUrl` da EDIÇÃO, `license`, `importedAt`).
2. **Hierarquia/gênero congelados na escrita** (T448) — leitores (`/champions`, comparador) LÊEM
   `metadata.hierarchy`, não re-derivam (mesma `resolveHierarchy` do ranking só na ingestão).
3. **RLS como fronteira real** — `app_user` NOBYPASSRLS; policies owner-only em users/sessions/
   favorites; função SECURITY DEFINER para lookup pre-auth.
4. **Cache read-through com invalidação fail-loud** (T448d) — leitura degrada silenciosa,
   escrita/invalidação nunca engolem erro.
5. **Ingestão = script compilado em `src/scripts/`** (padrão T430: roda com `node` puro no
   container; `apps/api/scripts/` NÃO vai para a imagem).
6. **Oferta com fonte única** (T465) — `plan-features.ts` é o catálogo; superfícies consomem.

## Fronteiras intencionalmente NÃO construídas ainda

IA/RAG (placeholder, não operacional) · partidas/rankings-por-jogo (T449) · mapa (T466/T467) ·
API de dados com keys (não implementada — "(em breve)" na oferta).

## Regra de leitura

Antes de tocar código: `graft ask` / `graft callers` (grafo de contexto, ver AGENTS.md). A
arquitetura viva está no grafo + neste catálogo — diagramas estáticos envelhecem.


---

> **Fundido de:** `docs/ARCHITECTURE-CATALOG.md`

# ARCHITECTURE-CATALOG.md — Almanaque dos Clubes

> Catálogo de arquitetura gerado a partir do repositório real (globs
> executados na tarefa T347, HEAD `7a50d99`). Estrutura pnpm monorepo:
> `apps/api`, `apps/web`, `apps/worker`, `packages/domain`,
> `packages/feature-flags`.
>
> Diagrama de deployment (zonas Vercel/Railway/externo, fluxos runtime +
> ETL): [`./diagrams/deployment.svg`](./diagrams/deployment.svg) — SVG
> autocontido, verificado contra `Dockerfile`, `../railway.json`, `ci.yml`
> e `docker-compose.yml`; sem Mermaid, sem build.

---

## 1. apps/api (Fastify + TypeScript + Prisma)

### Módulos de domínio (14) — `apps/api/src/modules/`

| Módulo | Arquivos | Responsabilidade |
|---|---|---|
| `auth` | routes, service, schemas, jwt, session, rbac, rate-limit, password-reset, authenticate.middleware | Registro, login, logout, refresh rotation, RBAC, reset de senha |
| `admin` | routes | CRUD de usuários, suspensão/reativação, atribuição de roles |
| `billing` | routes, subscription.service | Webhook, upgrade/downgrade de plano, assinaturas |
| `clubs` | routes, service, repository | CRUD de clubes + busca full-text + cache Redis |
| `competitions` | routes, service, repository | CRUD de competições |
| `export` | routes, service | Exportação CSV/JSON |
| `graph` | routes, service | Knowledge Graph |
| `matches` | routes, service, repository | CRUD de partidas |
| `players` | routes, service, repository | CRUD de jogadores |
| `rag` | routes | IA/RAG (`/api/v1/ai/ask`) |
| `rankings` | routes, service, repository | Rankings + entries + publish (imutável pós-publicação) |
| `seasons` | routes, service, repository | Temporadas/edições |
| `upload` | routes, service | Upload seguro (MinIO, MIME magic bytes, UUID) |
| `etl` | routes, service | Pipeline ETL (RSSSF, FBref, etc.) |

### Infra — `apps/api/src/`

| Path | Conteúdo |
|---|---|
| `config/` | `prisma.ts`, `crypto.ts` (argon2id + SHA-256), `env.ts` (Zod), `logger.ts` (Pino redact), `s3.ts` |
| `middleware/` | `csrf.ts`, `idempotency.ts` (+ `auth/authenticate.middleware.ts`) |
| `routes/` | `health.ts`, `metrics.ts` |
| `app.ts` / `server.ts` | Bootstrap Fastify, plugins (helmet, cors, rate-limit, compress, swagger), WebSocket |

### Dados — `apps/api/prisma/`

- `schema.prisma` — 18 models, 8 enums (canônico, provider PostgreSQL).
- `migrations/` — migrations versionadas.
- SQL auxiliar: `extensions.sql`, `fulltext-indexes.sql`.

## 2. apps/web (Next.js 16 + Tailwind)

- App Router, 15+ rotas (públicas: home, login, registro, clubs, players,
  rankings, search; privadas: dashboard, subscription, history).
- `src/lib/api.ts` (HTTP com cookie de sessão), `src/lib/sanitize.ts` (DOMPurify).
- `src/middleware/csrf.ts`, `src/hooks/useGsap.ts` (GSAP), PWA (`manifest.ts`).
- Segurança: headers (X-Frame-Options etc.), sessão httpOnly-only, WCAG 2.1 AA.

## 3. apps/worker (BullMQ + Redis)

| Arquivo | Responsabilidade |
|---|---|
| `src/etl-worker.ts` | Processamento de fila ETL |
| `src/email-worker.ts` | Fila de email (transacional) |
| `src/templates/welcome.ts`, `password-reset.ts` | Templates de email |
| `src/jobs/*.ts` | Conectores: `wikidata`, `wikimedia-commons`, `openstreetmap`, `rsssf`, `fbref`, `football-data`, `thesportsdb`, `entity-resolver` |

> Nota: o email-worker e templates existem; a integração do mailer transacional
> aos fluxos de auth é objeto de T341/T342 (pendente de deploy/banco).

## 4. packages/domain

Barrel `src/index.ts` exporta: `club`, `player`, `competition`, `ranking`,
`season`, `match`, `graph`, `stadium`, `errors`, `uml`, `rbac-matrix`.

### ⚠️ Contaminação declarada (pendente de quarentena)

| Arquivo | Estado |
|---|---|
| `src/uml.ts` | Contaminado com domínio estrangeiro (`Album`, `AlbumItem`, `Streak`, `Favorite`, `ApiKey`, `PipelineRun`). **Não é fonte de verdade** |
| `src/rbac-matrix.ts` | Contaminado com permissões estrangeiras (`favorites:*`, `album:*`, `collection:streak:*`). **Não é fonte de verdade** |

Ambos são exportados pelo barrel mas **não têm consumidores** em `apps/`
(verificado por grep). Remoção/quarentena é tarefa de código futura, após
resposta do Operador ao ESCALATE (T347) e execução de T348-v2.

## 5. packages/feature-flags

Plan gating (`Free/Pro/Elite`) com testes próprios (6). Usado para liberar
recursos por plano.

## 6. Infra e operação (raiz)

- `docker-compose.yml` — PostgreSQL 16, MinIO, Redis.
- `scripts/` — `backup-db.sh`, `rotate-secrets.sh`, `migrate.ps1`, etc.
- `.github/workflows/` — `ci.yml`, `dast.yml`.
- `../SECURITY.md`, `../05-security-compliance/INCIDENT_RESPONSE.md` (`docs/`), `../07-operations-marketing/MANUAL_DO_OPERADOR.md`.

## 7. Convenção de módulos

Módulos API seguem `routes/service/repository` (quando aplicável) em
`apps/api/src/modules/<nome>/`. Rotas usam sufixo `*.routes.ts` — o padrão
`*.controller.ts` **não existe** neste repositório.

