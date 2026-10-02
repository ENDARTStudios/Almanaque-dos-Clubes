# WS-C-3 — Runbook de observação híbrida pós-release (T454)

> **Sintético leve = GET público, ≤20 req/ciclo, 1 req/s, sem auth/write/deploy/orquestração.** Não é load test
> nem bot externo. Local-only (não pushado). **Sitemap ainda NÃO publicado.**

## 1. Objetivo

Provar estabilidade do `/map` público + API geo via **tráfego real passivo + probes sintéticos leves + testes
locais**, para decidir **APROVAR / ADIAR / REPROVAR** o sitemap.

## 2. Estado vivo

`/map` público (no `noindex`, nav “Mapa”); `/preview/mapa` `noindex`; **sitemap sem `/map`**; guarda de deploy
ativa; produção no deploy da release WS-C-3.

## 3. Endpoints (por ciclo)

Web: `/` · `/map` · `/preview/mapa` · `/rankings` · `/metodologia` · `/search?q=Flamengo` ·
`/search?type=competition&q=Libertadores` · `/sitemap.xml`.
API: `health` · `rankings` · `champions/carousel` · `search/global?q=Flamengo` · `geo/points?country=BR|PT|GB&limit=3`
· bbox válida · bbox invertida (400) · country inválido (400) · perfil OSM · perfil Wikidata · perfil inexistente (404).

## 4. Frequência

T+0, T+6, T+12, T+24, T+36, T+48, T+72 (ou janela possível). **Não fabricar ciclos não executados.**

## 5. Orçamento

≤20 GETs/ciclo · sequencial · 1s de intervalo · ≤1 retry (após 60s) para timeout/5xx · **429 → interromper 6h**.

## 6. Critérios de sucesso

200 nos válidos; 400 nos inválidos; `rulesVersion=ws-c3-geo-v1`; attribution OSM→ODbL; Wikidata→null; sem-coord
não plotado; `withoutLocation` presente; `/preview/mapa` `noindex`; sitemap sem `/map`; integridade sem drift;
flags off; sem novo deploy inesperado.

## 7. Critérios de incidente

5xx relevante · 429 não explicado · atribuição ausente · Estado degradado plotado · homônimo colapsado ·
`/preview/mapa` perder `noindex` · sitemap mudar · `/metodologia` divergir · integridade mudar · flag ON ·
segredo exposto · cookie/analytics novo · fetch externo não autorizado · guarda regredir.

## 8. Em 5xx

Registrar endpoint/status/latência; **não** retry agressivo; se persistir 2 ciclos → PARAR e preparar hotfix/rollback.

## 9. Em 429

Interromper o ciclo; aguardar 6h; registrar; não contornar rate limit.

## 10. Se atribuição falhar

PARAR; `blocked_reason: ws_c3_attribution_regression`; preparar rollback (`/map` → `noindex`/nav off).

## 11. Se clube sem coord for plotado

PARAR; `blocked_reason: ws_c3_false_plot`; rollback mínimo.

## 12. Se sitemap mudar

PARAR; investigar deploy inesperado; `blocked_reason: sitemap_changed_without_authorization`.

## 13. Se metodologia mudar

PARAR; `blocked_reason: metodologia_live_drift_during_observation`.

## 14. Se houver novo deploy web

Verificar origem (deploy-web legítimo vs inesperado); se inesperado e sem autorização → PARAR.

## 15. Decisão de sitemap

Ao fim da janela verde: **APROVAR** (se tudo verde + aprovação do Operador + janela Vercel) · **ADIAR** (sem
janela/batch) · **REPROVAR** (incidente). Registrar em `docs/WS-C-3-SITEMAP-DECISION.md`.
