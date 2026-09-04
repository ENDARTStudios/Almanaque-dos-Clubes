# DATA-INGESTION.md — Ingestão de dados (WS-D) e proveniência

> Almanaque dos Clubes · Fase F16 / WS-D (dados reais). Fonte aberta e licenciada.

## 1. Modelo de ingestão — clube via Wikidata

**Fonte:** Wikidata (CC0) — entidade `Q476028` (association football club), via SPARQL `query.wikidata.org`.

**Campos populados em `clubs`:** `name` (label en) · `country` (ISO 3166-1 alpha-2, via `P297`) · `city` (`P131`) · `foundedYear` (`P571`) · `qid` (Wikidata Q-ID, **unique**) · `importedFrom='wikidata'` · `importedAt` (timestamp da ingestão).

**Identidade e dedup:** `qid` é a chave estável (unique). Há ainda `@@unique([name, country])`. A inserção usa `createMany ... skipDuplicates` (idempotente e atômico).

## 2. Comando

pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts            # DRY-RUN (não escreve)
pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts --apply    # grava no banco

## 3. Garantias

- **Idempotente:** reexecução não duplica (0 novos).
- **Reversível:** `DELETE FROM clubs WHERE "importedFrom"='wikidata';` remove apenas os importados.
- **Proveniência:** todo registro importado tem `qid` + `importedFrom` + `importedAt`; nunca sem origem.
- **Sem duplicação:** 0 duplicados por `(name, country)` e 0 `qid` nulo no resultado de 2026-09-02.

## 4. Resultado (2026-09-02)
- 1.879 clubes importados do Wikidata; produção com **1.889** clubes no total.
- Distribuição top de país: DE 276 · GB 239 · ES 81 · IT 77 · FR 55 · BR 49 · …

## 5. Limitações conhecidas (backlog)
- **País = soberano:** `P17/P297` dá a ISO do país soberano. Logo Inglaterra/Gales/Escócia mapeiam para `GB`.
  Refinar com sub-região/federação (ex.: `P495`/federação nacional) num round futuro de WS-C/WS-D.
- **Sem coordenadas/estádio/logo em `clubs`:** o mapa-múndi (WS-C) exigirá adicionar `latitude`/`longitude` (PostGIS) e uma tabela de estádios — tarefas futuras.
- **Governança `data_sources`/`entity_revisions`:** **não existem** como tabelas (o relatório 02/09 dizia existirem — não). Criar em round futuro de refinamento de governança.

## 6. Qual a fronteira do que está pronto (M1 parcial)
- WS-D (seed clubes real, com proveniência): **lançado**.
- Ainda faltam para M1 (Beta Fechada): mapa-múndi, busca global, perfis, cookie banner, políticas.


## 7. Competições via Wikidata (WS-D, 2026-09-02)

**Fonte:** Wikidata (CC0) — classe `Q15991303` (association football league) e subclasses, via SPARQL.

**Campos populados em `competitions`:** `name` (label en) · `country` (ISO via `P297`) · `qid` (**unique**) · `importedFrom='wikidata'` · `importedAt`. `type` fica `null` por ora (refinar LEAGUE/CUP/TOURNAMENT num round de enriquecimento).

`pnpm --filter @almanaque/api exec tsx scripts/ingest-competitions-wikidata.ts [--apply]`

**Resultado (2026-09-02):** 892 competições importadas; produção com **895** no total. Idempotente e reversível.

**Observação:** nomes de competições sem rótulo en (`label` = QID) são ignorados; países históricos podem aparecer com código não-atual (ex.: `DD` — Alemanha Oriental).


## 8. Coordenadas dos clubes (WS-C, 2026-09-02) — base do mapa-múndi

**Campos novos em `clubs`:** `latitude`/`longitude` (Float?) vindas do Wikidata `P625` (coordinate location).

`pnpm --filter @almanaque/api exec tsx scripts/enrich-club-coords.ts [--apply]`

**Resultado (2026-09-02):** 113 clubes com coordenadas (de 1.879 com `qid`).

**Limitação:** muitos clubes não têm `P625` no item do clube no Wikidata (a coordenada costuma estar no item do
estádio, não no do clube). Mapa mostra os clubes com coordenada; enriquecer via estádio (WS-D/geo) num round futuro.


## 9. Jogadores via Wikidata (WS-D, 2026-09-02)

**Fonte:** Wikidata (CC0) — ocupação `P106 = Q937857` (association football player), filtrado a **notáveis** (têm artigo na en-wiki).

**Estratégia em 2 passos (evita timeout do SPARQL):**
1. SPARQL (sem o pesado serviço de label do player) → QID + país (ISO via `P297`) + nascimento (`P569`) + posição (`P413`), em batches de 1000.
2. Nomes via API `wbgetentities` (labels en, 50 por chamada).

**Campos populados em `players`:** `fullName` · `country` · `birthDate` · `position` · `qid` (**unique**) · `importedFrom='wikidata'` · `importedAt`. `clubId` fica `null` (elencos/clubes-link, a fazer).

`pnpm --filter @almanaque/api exec tsx scripts/ingest-players-wikidata.ts [--apply]`

**Resultado (2026-09-02):** 2.396 jogadores. Idempotente (re-run 0 novos) e reversível.

**Limitação:** conjunto amplo de jogadores notáveis (não limitado aos clubes do acervo); ligação clube↔jogador (elencos) fica para round de enriquecimento (`P54`/ETL).

## 10. Tipo de competição (WS-D, 2026-09-02)

**Fonte:** classe Wikidata `Q15991303` (association football league). As competições ingeridas vêm desta classe (`P31/P279*`), então o `type` é mapeado pela **CLASSE** (não pelo nome — ex.: "KNVB Women's Cup" é classe league → LEAGUE).

`pnpm --filter @almanaque/api exec tsx scripts/enrich-competition-type.ts [--apply]`

**Resultado:** 892 competições com `type='LEAGUE'` (total: 893 LEAGUE / 1 TOURNAMENT / 1 CUP). Idempotente e reversível (`type=NULL`).
