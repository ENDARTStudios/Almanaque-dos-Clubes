# WS-C-3 — Log de observação híbrida (T454)

> Apenas **ciclos realmente executados**. Não preencher ciclos futuros.

## Ciclo T+0 — 2026-09-29T19:35Z

- **Lock remoto:** `main` `63dfa3e`; nenhum push/PR/merge/deploy novo; `Deploy Web` último `9e56c61` success;
  produção `ko7d9r1mm` (`Ready`) = deploy da release.
- **Guarda:** `ci.yml` sem `deploy-vercel-frontend`; `deploy-web.yml` presente; `vercel.json`
  `git.deploymentEnabled.main=false`.
- **Páginas (cache-bypass):** `/` 200 (1418ms, 31.6KB) · `/map` 200 (236ms, 24.3KB, `noindex=False`, nav “Mapa”) ·
  `/preview/mapa` 200 (243ms, `noindex=True`) · `/rankings` 200 (201ms) · `/metodologia` 200 (277ms) ·
  `/search?q=Flamengo` 200 · `/search?type=competition&q=Libertadores` 200 · `/sitemap.xml` 200 (1092B).
- **Sitemap:** **sem `/map`** e sem `preview`.
- **`/metodologia`:** strings vigentes OK (saldo/ODbL/OpenStreetMap/CC0; `Gols Pró × 0.2` só em nota histórica).
- **API geo:** BR 200 (705ms, withoutLoc 212) · PT 200 (251ms, 223) · GB 200 (256ms, 31) · bbox válida 200 ·
  bbox invertida **400** · country inválido **400** · `rulesVersion=ws-c3-geo-v1`.
- **API geral:** `health` 200 · `rankings` 200 · `champions/carousel` 200 (675ms) · `search/global` 200.
- **Perfis:** OSM `attr=ODbL` · Wikidata `attr=null` · inexistente **404**.
- **Integridade SQL:** clubs 9.291 (0 sem QID) · comps 1.905 (0 sem QID) · coords 6.366 · dup 0/0 ·
  `ranking_entries` `d2b117aa…` · estadual 7 · EN pyramid 1.
- **Flags:** `ORCHESTRATION_ENABLED`/`ETL_SCHEDULER_ENABLED` = `<unset>`.
- **Segurança:** `/map` sem `Set-Cookie`; sem analytics/terceiros; sem tiles externos carregados.
- **Incidentes:** nenhum.
- **Decisão parcial:** continuar observação (T+6…T+72).

<!-- Ciclos T+6/T+12/T+24/T+36/T+48/T+72: preencher apenas quando executados em tempo real. -->
