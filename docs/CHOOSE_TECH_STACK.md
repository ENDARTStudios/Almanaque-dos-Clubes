# CHOOSE_TECH_STACK.md — Stack escolhida e por quê

> ADRs de decisão: [docs/ADR.md](./ADR.md) + DECISOES.md. Este arquivo resume a stack e os
> critérios que a fixaram (custo-zero/escala inicial, dado auditável, operação solo).

## Escolhas

| Camada | Escolha | Por quê |
|---|---|---|
| Monorepo | pnpm workspace | api/web/worker/domain compartilham tipos (Zod/domain) |
| Frontend | Next.js (App Router) + Tailwind | SSR para SEO/AEO, server components para oferta com moeda por geolocalização |
| API | Fastify + Zod | performance, schemas estritos, plugins (rate-limit, swagger) |
| ORM/DB | Prisma + PostgreSQL 16 (+ PostGIS disponível; espelho SQLite p/ testes rápidos) | dado relacional auditável; migrations versionadas; RLS real |
| Fila | BullMQ + Redis | ETL/cron (T451)/e-mail; retry+backoff |
| Auth | argon2id + cookies `__Host-` + refresh rotativo + RLS | sem terceiro na identidade |
| Pagamentos | Stripe Checkout (LIVE) | PCI minimizado; webhook HMAC idempotente |
| E-mail | Resend | transacional simples |
| Armazenamento | Cloudflare R2 (backups) | custo zero de egress |
| Deploy | Vercel (web) + Railway (API/worker/DB/Redis) | preview por PR; geo de borda grátis |
| Observabilidade | pino + /metrics Prometheus + alerts.yml | custo zero, suficiente para a escala |
| Fontes de dado | Wikidata (CC0), RSSSF (domínio público) | abertas, auditáveis, sem licença fechada |

## Critérios que descartaram alternativas

- Supabase/Firebase: identidade/RLS de terceiro conflitava com o objetivo de RLS própria auditable.
- Meilisearch: busca extra-brilhante, mas outro serviço para operar — tsvector/pg_trgm cobre o
  volume atual (claim ajustada na oferta — T465).
- Microserviços: operação solo — monorepo modular com filas resolve.
- Fonte fechada (FBref/StatsBomb/Transfermarkt): licença incompatível com o produto aberto e
  auditável — fora até decisão do Operador com contrato.

## Revisão

A stack se reavalia quando: volume de leitura 10×, IA operacional (precisará de pgvector/Ollama —
hoje não roda), mapa (Leaflet + GeoJSON com licença verificada — T467).
