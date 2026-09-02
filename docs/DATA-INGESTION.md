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
