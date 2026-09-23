# API.md — Superfície da API

> Base: `https://api.almanaquedosclubes.com/api/v1` · Fastify · Zod nas entradas · swagger UI em
> `/docs` (dev). Módulos registrados em `apps/api/src/app.ts`.

## Módulos e rotas principais

| Módulo | Rotas | Notas |
|---|---|---|
| health / metrics | `/health`, `/metrics` | healthcheck do Railway + Prometheus |
| auth | `/auth/register · login · logout · refresh · me · csrf-token` | cookies `__Host-`, rotação, single-flight |
| clubs | `GET/POST /clubs`, `GET /clubs/:id`, **`GET /clubs/:id/titles` (T448)** | titles = galeria de honra com fonte |
| competitions | `GET/POST /competitions`, `GET /competitions/:id` | type LEAGUE/CUP; backfill T448e |
| players | `GET /players`, `GET /players/:id` | |
| champions | `GET /champions?gender=men\|women` | campeão vigente POR HIERARQUIA; critério condicional T448f (type-first em GRUPO-LIGA; vigência-first em GRUPO-COPA); guarda de vigência T448d; expõe `editions` e `sourceUrl` |
| compare | `GET /compare` | clubes/jogadores lado-a-lado (títulos lêem WON) |
| rankings | `GET /rankings`, CRUD admin | 0-100; rankings reais aguardam T449 |
| seasons / matches | CRUD + consulta | matches = T449 |
| favorites | CRUD owner-only | RLS (T439) |
| billing | `POST /billing/checkout`, `/billing/cancel`, `/billing/withdraw`, `GET /billing/invoices` | Stripe; gate `PAYMENTS_ENABLED` |
| consent | `POST/GET /consent` | prova de consentimento (LGPD) |
| privacy / copyright | fluxos de direitos e DMCA | T445 |
| graph | leitura do KnowledgeGraph | arestas WON/PLAYED_FOR |
| export | `GET /export?format=csv\|json` | dados do acervo com fonte |
| etl | `POST /admin/etl/ingest/:source` | admin; `wikidata-titles` = T448 |
| upload / ws / rag / backup | — | rag = placeholder; backup = T446 |

## Convenções

- Resposta de coleção: `{ data: [...], total? }`; erro: `{ error: { code, message } }`.
- Autenticação: cookies `__Host-` (access 15min + refresh 7d rotativo) + CSRF token de uso único.
- Moeda: definida pela localização REAL do IP (nunca pelo cliente — schema rejeita campo `currency`).
- Rate-limit: global + buckets próprios (auth 600/15min; sessão isenta do global — T458).

## Scripts de ingestão (prod, via container)

`node dist/scripts/ingest-won-edges-wikidata.js --apply --spot-check=20` ·
`node dist/scripts/seed-competitions-cups.js --apply` (ver [docs/PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)).
