# WS-C-3 — Plano de testes do mapa-múndi público (FASE 1, local/off)

> **Escopo:** testes do mapa **sem publicá-lo**. O mapa permanece `noindex`/fora do nav. Nada aqui altera
> produção. Complementa `docs/WS-C-3-FASE0-DESIGN.md`.

## 1. Unit (puro, network-free) — já iniciado

`apps/web/src/lib/map-geo.ts` + `apps/web/tests/unit/ws-c3-map-geo.test.ts` (11 casos):

- **nunca pino falso**: `isPlotable`/`filterPlotable` rejeitam `null`/`NaN`/fora de faixa;
- `bboxFilter`/`inBbox` (viewport);
- `clusterPoints` determinístico (grid, centróide, ids asc, ordenação estável);
- `limitPerViewport` (teto de markers);
- `layerAttribution` (ODbL/CC0/RSSSF/domínio público).

## 2. Contrato da API geo (leitura)

- `GET /clubs/:id/geo` → `coordinates {lat,lng}` + `attribution` (ODbL quando OSM/Nominatim; `null` p/ Wikidata);
- `GET /clubs/geo-stats` → agregação por continente/país/estado (`source='derived'`);
- (futuro) endpoint de pontos por **bbox** gated — contrato ainda a desenhar; sem implementar agora.

## 3. Integração (fixtures network-free)

- pontos com/sem coordenada → só os plotáveis entram;
- homônimos com coordenadas distintas → clusters distintos (não colapsar por nome);
- coordSource OSM → atribuição ODbL presente; Wikidata → sem ODbL;
- clubes sem coord **não** viram pino; aparecem na **listagem** por país/cidade com gap declarado.

## 4. E2E (quando houver UI de mapa aprovada)

- mapa carrega em viewport mobile; lista alternativa navegável por teclado;
- `/map` **continua noindex/nofollow** e **fora do nav** (assertiva de não-publicação);
- atribuição visível (não só tooltip); `prefers-reduced-motion` respeitado;
- sem 500/hidratação crítica.

## 5. Atribuição

- por camada: base (Natural Earth, domínio público), pontos (OSM/Nominatim → `© OpenStreetMap contributors (ODbL)`),
  identidade (Wikidata CC0), histórico (RSSSF por autor);
- teste de presença das strings no painel "Fontes deste mapa" (quando existir).

## 6. Performance

- clustering/bbox/lazy; nunca renderizar ~9k markers crus;
- orçamento: base GeoJSON local (~819 KB) + pontos sob demanda; sem tiles pagos.

## 7. Gates de aceite

- zero migration · zero escrita · zero scheduler;
- **zero mapa público** antes de aprovação (WS-C-3 FASE 4);
- atribuição obrigatória;
- integridade preservada (`ranking_entries` `d2b117aa…`, estadual 7, EN pyramid 1, 0 sem QID, MG/GO/PR intactos).
