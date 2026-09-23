# PERFORMANCE.md — Desempenho

## Estado atual

- **Fonts auto-hospedadas** (T469): 27 woff2 locais (Barlow/Barlow Condensed) com unicode-range —
  zero requisição a terceiro na renderização; carrega só os subconjuntos usados.
- **Cache read-through** (Redis com fallback silencioso): champions 1h, clubes 5min, listas 1min.
  Invalidação por chave exata pós-ingestão (DEL `champions:all` — padrão por padrão falha
  silenciosamente; fail-loud desde T448d).
- **Compressão** Fastify (gzip) + helmet + ETag.
- **Rate-limit** global + buckets por rota (auth 600/15min — T458) protege o orçamento de sessão.
- **Paginação OFFSET** em todas as listas (limite 100) — cursor-based é round próprio (WS-S/C).

## Frontend

- Carrossel/consentimento sem libs (CSS scroll-snap + estado local).
- Home: server components + metadata; carrossel client-side pós-hidratação com skeletons.
- Mapa (T467, futuro): Leaflet lazy + GeoJSON de fronteiras carregado sob demanda (licença a
  verificar: Natural Earth domínio público ok; OSM ODbL implica compartilhamento).

## Backend

- Índices: KG por (sourceId, sourceType)/(targetId, targetType)/relation; clubes por qid; full-text
  tsvector em clubes.
- Ingestão: janelas curtas de SPARQL (evitar 504), labels VALUES-bounded chunk 200 (evitar 431),
  sleep entre janelas, cache de 10min em resolução de geo.
- Conhecido e aceito: contagem de vitrine re-agrega por request (barato no volume atual); se o
  acervo crescer 10×, materializar.

## Regras

Toda query nova em rota pública precisa de índice correspondente no schema; todo efeito de
terceiro na renderização precisa passar pelo checklist do [INTEGRATIONS.md](./INTEGRATIONS.md)
(fornecedor novo = custo de privacidade + latência).
