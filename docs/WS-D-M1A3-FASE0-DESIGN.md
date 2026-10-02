# WS-D M1a-3 — Geocodificação opcional (FASE 0: design read-only)

> **Estado:** FASE 0 (medição + design). **Nenhum código escrito; nenhuma escrita no banco.** Aguarda aprovação do Thinker.
> **Contexto:** encerramento do WS-D M1b (5.420 clubes / 344 competições / 25 países). M1a-3 estava na fila como *opcional*.

## 1. Medição read-only (produção, 2026-09-27)

| Métrica | Valor |
| --- | --- |
| Clubes ativos | **9.291** |
| Com coordenadas | **5.865** (63,1%) |
| **Sem coordenadas** | **3.426** (36,9%) |

Sem coords por país (top): **SE 554 · AU 383 · PT 269 · BR 246 · TR 204 · JP 153 · HU 137 · PL 135 · NO 128 · BE 110 · PE 97 · NZ 96 · AR 94 · FI 76 · ES 53 · GR 38 · IQ 36 · US 34 · GB 33 · CL 29 · AT 28 · DK 28 · CH 26 · CA 25 · DE 23 · UY 20 · MX 13 · RO 13 · IT 13** (cauda longa).

**Achado decisivo:** **0 dos 3.426 têm `city` preenchida** — o enriquecimento M1a-2/M1b só preenche `city` quando a fonte resolvida é uma *cidade*; para esses clubes, nenhuma fonte foi resolvida. Portanto **geocode por texto de cidade não é viável** sem antes popular a cidade.

**Colunas disponíveis em `clubs`:** `city` (text), `cityId` (text), `latitude`, `longitude`. **Não existe** coluna `coordSource` — a proveniência de coords vive em `metadata` (JSON). Não há campo de *precisão* (exata vs. aproximada).

## 2. O que o extractor atual já esgota

`extract-club-coordinates.ts` / `expansion/extract-attributes.ts` resolvem em **1 nível**:
`P625` direto > `P159` (sede) > `P115` (estádio) > `P131` (admin). Os 3.426 restantes **falharam nesses 4 caminhos** — não têm P625 próprio nem P159/P115/P131 com P625.

Logo M1a-3 precisa de **caminhos novos** (mais profundos) ou de **fonte externa**.

## 3. Opções

### Opção A — Fallback profundo Wikidata (conservador, mesma fonte CC0)
- Cadeia adicional: `P115` (estádio) → `P131` do estádio (centroide) · `P131` do clube → `P131` aninhado (até k níveis, sugerido k=3) → centroide · `P276`/`P937` (local de trabalho) quando presentes.
- Último recurso discutível: centroide do país `P17` — **coarse demais** (erro de centenas de km); **recomendação: NÃO usar** (ou marcar `precision='country'` e excluir do mapa por default).
- **Prós:** mesma fonte/dedupe QID, determinístico, proveniência limpa, sem dependência externa nem rate-limit.
- **Contras:** yield incerto (pode ficar abaixo do esperado; a cadeia P131 costuma faltar); coords são **centroides de município**, não do estádio → precisão **aproximada**.

### Opção B — Geocoder externo (Nominatim/OSM) por nome + país
- **Prós:** maior yield (a maioria dos clubes é nome-de-município ou nomeado pela sede).
- **Contras:** **fuzzy** (risco de coordenada errada), ODbL (atribuição obrigatória), rate-limit/política de uso, e conflita com o ethos conservador. Não altera identidade (que continua QID), mas **introduz dado aproximado de fonte externa**.

### Opção C — Híbrido
- A primeiro; B apenas para o residual, sempre rotulado `precision='approximate'` e `source`, **nunca** sobrescrevendo coords existentes.

### Recomendação (FASE 0)
**Opção A** primeiro, com medição de yield; só considerar B se o yield de A for insuficiente **e** com aprovação explícita do Thinker (dado o caráter fuzzy/licenciamento).

## 4. Modelo de dados proposto (aditivo, sem migration de coluna nova)
- Gravar proveniência e precisão em `metadata` JSONB do clube: `coordSource` (`P131-chain` | `P115-P131` | ... ), `coordPrecision` (`exact` | `municipality` | `country`), `coordResolvedAt`.
- **Nunca** sobrescrever `latitude`/`longitude` já preenchidos; apenas preencher `NULL`.
- Idempotente (dedupe por QID); dry-run default; `--apply --allow-production`; re-run = noop.

## 5. Gates propostos
- Pré-apply (dry-run): `errors=[]`; mortos-vivos = 0; **coords existentes alteradas = 0**.
- Pós-apply (SQL): `with_coords` só aumenta; nenhuma coord pré-existente modificada (hash do conjunto antigo); provenance 100% (`sourceUrl` inalterado); dup QID 0; `ranking_entries` hash `d2b117aa…` intacto; estadual RSSSF=7; `country_pyramid`=1.
- Amostragem manual (≤2% FP) do subconjunto novo; checagem de plausibilidade (ponto no país correto).

## 6. Riscos / observações
- Centroide de município ≠ estádio → **não** serve para rotas; serve para o **mapa** (cluster por cidade). O UI deve distinguir/rotular precisão.
- Se adotar `precision='country'`, excluir do mapa por default (evita pino enganoso).
- Sem mudança de schema se usarmos `metadata`; se o Thinker quiser `coordPrecision` como coluna (para filtrar no mapa), vira **migration aditiva** (gate `migration-drift`).

## 7. Pergunta ao Thinker (decisão de dono)
1. Aprovar **Opção A** (Wikidata profundo) como FASE 1, com **B vetado por ora**?
2. Usar **país `P17`** como último recurso (`precision='country'`, fora do mapa) — sim/não?
3. Precisão como **JSONB `metadata`** (sem migration) ou **coluna `coordPrecision`** (migration aditiva, filtrável no mapa)?
