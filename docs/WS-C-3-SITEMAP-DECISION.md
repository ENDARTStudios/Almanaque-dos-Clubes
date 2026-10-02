# WS-C-3 — Decisão de sitemap (T454)

> **Estado:** durante observação. **Sitemap ainda NÃO publicado.** Patch local pronto em
> `feat/ws-c-3-sitemap-map` (adiciona `/map`, nada mais).

## Recomendação atual

```
ADIAR_SITEMAP
```

**Justificativa:** T+0 verde, mas a **janela de observação** (mínimo T+24h híbridas; ideal T+72h) **ainda não
foi percorrida em tempo real** — não fabricamos ciclos futuros. Também é necessário **janela Vercel segura** e
**aprovação explícita do Operador** antes de publicar.

## Evidência atual (T+0)

`/map` 200 público (sem `noindex`, nav “Mapa”); `/preview/mapa` `noindex`; **sitemap sem `/map`**; API geo
BR/PT/GB 200 (`withoutLocation`, `rulesVersion=ws-c3-geo-v1`; bbox inválida/country inválido → 400); perfil
OSM→ODbL / Wikidata→null; integridade `d2b117aa…`/estadual 7/EN pyramid 1; sem cookie/analytics/terceiros;
flags off; nenhum deploy inesperado.

## Critérios para mudar para `APROVAR_SITEMAP`

T+24h+ verdes (ciclos reais) · zero 5xx/429 · atribuição ok · sem-coord não plotado · degradados não plotados ·
`/metodologia` verde · integridade sem drift · flags off · **janela Vercel segura** (preview+production+margem) ·
**aprovação explícita do Operador**. Então release única mínima de sitemap (patch `feat/ws-c-3-sitemap-map`).

## Critérios para `REPROVAR_SITEMAP`

Incidente (5xx relevante/429 não explicado/atribuição ausente/estado degradado plotado/homônimo colapsado/
cookie ou analytics não autorizado/fetch externo não autorizado/drift de integridade).
