# ARCHITECTURE.md — Arquitetura do sistema

> Catálogo completo de componentes: [docs/ARCHITECTURE-CATALOG.md](./ARCHITECTURE-CATALOG.md) ·
> Diagramas: [docs/UML-DIAGRAMS.md](./UML-DIAGRAMS.md) (gaps em UML-GAP-ANALYSIS.md). Esta página
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
