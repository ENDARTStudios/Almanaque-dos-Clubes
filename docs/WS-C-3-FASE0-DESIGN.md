# WS-C-3 FASE 0 — Mapa-múndi público (design read-only)

> **Estado:** FASE 0 (read-only). **Nenhuma UI pública de mapa, nenhum deploy, nenhuma remoção de `noindex`,
> nenhum link no nav.** O mapa segue `noindex/nofollow` e fora do nav até aprovação explícita e release
> separada. Objetivo: desenhar a liberação pública do mapa com segurança jurídica, performance e honestidade
> geográfica.

## Contexto vivo (inventário)

- **`/map` atual** = **choropleth** por país (`components/MapExplorer.tsx` + `WorldChoropleth.tsx`): Leaflet
  **1.9.4** (única dep de mapa) + GeoJSON **local** `public/geo/ne_110m_admin_0_countries.geojson`
  (**Natural Earth, domínio público**, 819 KB) com `attributionControl: false`, drill-down por **listas**
  (continente→país→estado→cidade) + listagem paginada de clubes + busca textual. **Sem tiles externos.**
- **`WorldMap.tsx`/`MapSection.tsx`** (pinos por clube em tiles OSM + `© OpenStreetMap contributors`) existem
  mas **não são importados por nenhuma página** (não estão no ar).
- **Cobertura geo**: clubs ativos **9.291**, com coordenada **6.366 (68,5%)** (fontes: `none` 5.865 ·
  `nominatim` 451 · `P115_P131` 34 · `P276` 12 · `P159_P131` 4). Payload por clube: `/clubs/:id/geo` +
  atribuição ODbL já exposta (PR #259).
- **Atribuições já publicadas** em `/metodologia`: Wikidata **CC0**, RSSSF (**não** domínio público, por autor),
  OpenStreetMap/Nominatim (**ODbL**).
- **Estado:** WS-C-2 `[x]` (perfil/busca/carrossel em produção); mapa **off**.

## 1. Biblioteca de mapa

| Opção | Prós | Contras | Veredito |
| --- | --- | --- | --- |
| **Leaflet** (já usado) | já integrado (`MapExplorer`/`WorldChoropleth`), leve, OSS, mobile | para "pinos" exige tiles (OSM→ODbL) ou GeoJSON local | **Preferida** (zero dep nova) |
| MapLibre GL | vetorial/GPU, zoom fluido | bundle maior, estilo a hospedar | 2ª opção (se vetorial) |
| OpenLayers | completo | pesado p/ o caso | Não |
| D3 + GeoJSON/TopoJSON | zero tile; já há Natural Earth local | menos "slippy map" | Fallback p/ choropleth puro |
| React Simple Maps | simples | menos flexível | Fallback |

**Recomendação:** permanecer **Leaflet + GeoJSON local (Natural Earth)** para a camada-base (sem tiles
externos → **sem dependência de terceiros/ToS**). Pinos por clube ficam atrás de decisão de camada (item 2).

## 2. Base cartográfica (camadas)

- **Camada-base (obrigatória):** Natural Earth **local** (domínio público) — já versionado.
- **Camada de pontos por clube (opcional, gated):** usar **somente** quando houver coordenada confiável do
  clube. Duas variantes:
  - **A. Sem tiles OSM:** desenhar pontos/markers sobre a camada-base Natural Earth (sem tile provider) →
    **nenhuma exigência ODbL de tile** (a coord do clube já tem atribuição própria).
  - **B. Com tiles OSM:** exige respeitar a **Tile Usage Policy** (público, não bulk, atribuição) → risco de
    ToS/limite. **Só com aprovação e com atribuição visível.**
- **Sem tiles pagos** sem conta/autorização do Operador.
- **Preferência:** variante **A** (sem tiles externos) — reduz risco jurídico e de rate-limit.

## 3. Clubes sem coordenada

- **Nunca plotar ponto falso.** Clube sem `latitude/longitude` **não** vira pino.
- Aparece na **listagem por país/estado/cidade** (hierarquia T466) quando houver dado confiável, com **gap
  declarado** ("sem coordenada registrada") — vazio-honesto (padrão já usado no perfil WS-C-2).

## 4. Atribuição (por camada)

- **Camada-base:** Natural Earth — *domínio público* (crédito de cortesia).
- **Pontos/cidade OSM/Nominatim:** **`© OpenStreetMap contributors (ODbL)`** visível (não só tooltip).
- **Identidade/atributos:** Wikidata **CC0** (fonte em `provenance.sourceUrl` do perfil).
- **Títulos/histórico RSSSF:** atribuição **ao autor da página** (não é domínio público).
- **Camada → fonte**: o mapa deve expor, por camada, a fonte e a licença (painel "Fontes deste mapa").

## 5. Performance

- **Não** carregar 9k markers crus. Estratégia: **clustering** (Leaflet.markercluster, OSS) **ou** carregar
  pontos **por viewport/zoom** (bbox) via endpoint gated; paginação na lista; **lazy load** do Leaflet
  (já há `dynamic(..., {ssr:false})`); **cache** read-through; **mobile-first** (touch, `scrollWheelZoom:false`).
- Orçamento: GeoJSON base 819 KB (já aceito); pontos só sob demanda.

## 6. Acessibilidade

- Navegação por **teclado**; o mapa é **acessório** — a **lista de regiões/clubes** é o caminho principal
  (já implementado em `MapExplorer`); contraste AA; `prefers-reduced-motion` respeitado (sem autoplay/animação
  obrigatória); `aria-label` nas regiões e nos controles.

## 7. SEO / AEO

- As **páginas de clube** (WS-C-2) já são indexáveis — o mapa **não** deve canibalizar perfis: manter
  `/map` **`noindex`** até pronto e, na liberação, decidir por **`noindex` permanente** ou indexação leve.
- Canonical/OG/JSON-LD sem prometer dado ausente.

## 8. Risco legal / fonte

- **Não** violar Tile Usage Policy (se OSM tiles) — usar atribuição e limites conservadores, ou **evitar
  tiles** (variante A).
- **Não** usar serviço pago sem o Operador.
- **Não** raspar fonte com ToS restritivo; RSSSF mantém atribuição por autor.

## Gates de liberação (propostos — futuros, não autorizados agora)

1. Design aprovado pelo Thinker.
2. Camada-base + pontos **sem tiles externos** (variante A) implementada e testada.
3. Atribuição ODbL/CC0/RSSSF **visível por camada**.
4. Sem clubes sem coordenada plotados; gaps declarados.
5. Performance (clustering/lazy) e acessibilidade (lista alternativa) verificadas.
6. Remoção do `noindex` + entrada no nav **apenas** como **release separada**, com aprovação explícita.
7. Smoke + integridade (`ranking_entries` `d2b117aa…`, estadual 7, EN pyramid 1, 0 sem QID).

## Confirmações da FASE 0

- **zero escrita · zero migration · zero produção alterada · zero UI pública de mapa · zero remoção de
  `noindex` · zero link no nav.** Documento read-only.
