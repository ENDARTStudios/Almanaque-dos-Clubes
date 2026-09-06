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

## 11. Resultados de partidas (RSSSF) + títulos (Wikidata) — T420

**Fontes abertas (sem scraping que viole Termos; User-Agent identificado):**
- **RSSSF** (Rec.Sport.Soccer Statistics Foundation) — tabelas de resultados em texto/HTML públicos.
- **Wikidata** (CC0) — campeões de liga via `P3450` (sports season of the league) + `P1346` (winner).

**Campos novos em `matches` (proveniência + dedup):** `qid` (único) · `importedFrom` · `importedAt` ·
`sourceUrl` · `license` · `dedupKey` (**unique**). A `dedupKey` é a chave estável
`competicao|temporada|dataISO|homeClubId|awayClubId` — garante que reexecutar o seed **não duplica**.

**Mapeamento fonte → campo:**
| Origem | Campo em `matches` |
|---|---|
| linha `<data>` | `date` (ISO `YYYY-MM-DD`) |
| `<casa> - <fora>` | `homeClubId` / `awayClubId` (resolvidos contra o acervo por QID/nome normalizado) |
| placar `n-n` ou `n:n` | `homeScore` / `awayScore` (inteiros ≥ 0) |
| `(Rodada N)/(Round N)` | `round` |
| competição | `competitionId` (resolvida por QID/nome) |
| temporada | `seasonId` (find-or-create `Season`) |
| URL da fonte / licença | `sourceUrl` / `license` |
| — | `importedFrom='rsssf'`, `importedAt` |

**Regra anti-órfão:** se clube/competição não for resolvido, a partida **não** é criada — vai para `rejected`
(motivo), nunca para o acervo. Títulos (`wikidata-titles`) usam a mesma regra (vínculo por QID).

**Comando:**
```
pnpm --filter @almanaque/api exec tsx scripts/seed-matches.ts --url=<rsssf_url> --competition=<nome> --season=<ano>            # DRY-RUN (não escreve)
pnpm --filter @almanaque/api exec tsx scripts/seed-matches.ts --url=<rsssf_url> --competition=<nome> --season=<ano> --apply  # grava
```

**Contratos testados (TDD, HTTP/banco mockados):** parse + normalização (data/placar) · validação Zod
(placar ≥ 0, data ISO) · `dedupKey` determinística · ingestão idempotente (2ª execução → `alreadyExists`) ·
não-criação de órfãos. Teste: `apps/api/tests/integration/matches-ingestion.test.ts`.

**Limitações conhecidas (honesto, não fabricado):**
- **Formato canônico:** o parser cobre um subconjunto documentado de layouts RSSSF (data ISO `YYYY-MM-DD` /
  `DD/MM/YYYY` / `[DD.MM.YY]`, separador ` - `/` vs `, placar `n-n`/`n:n`). Linhas fora do contrato vão
  para `skipped` (com motivo), nunca são descartadas em silêncio.
- **RSSSF Brasil mudou de domínio** (`rsssfbrasil.com`, antes `rsssf.org/tablesb`); as páginas têm layout
  variável e formato HTML/tabela, exigindo extração HTML→texto por fonte — **extensão futura**.
- **Meta ≥ 5.000 partidas** no banco de teste e verificação amostral manual de 10 partidas **não** foram alegadas
  nesta entrega: exigem uma fonte vigente + extração por layout. O Ranking 0-100 permanece **adiado** até que
  exista base de resultados auditável (regra: nunca publicar métrica sem dado).
- **Reversível:** `DELETE FROM matches WHERE "importedFrom"='rsssf';`

---

## 12. Elencos clube↔jogador (P54) — WS-D / T421

**Fonte:** Wikidata (CC0). Propriedade **P54** ("member of sports team") liga o jogador ao clube
(`?player p:P54 ?stmt` / `?stmt ps:P54 ?club`); o qualificador **P580** (start time) dá a
temporada/ano (`?stmt pq:P580 ?start`), com `FILTER(YEAR(?start) >= 1900)`.

**Mapeamento P54 → tabela `knowledge_graph` (já existente — NÃO alterado):**

| P54/P580 (Wikidata) | Tabela/coluna | Valor |
|---|---|---|
| `?player` (item do jogador) | `knowledge_graph.sourceId` + `sourceType='Player'` | `player.id` (resolvido por `Player.qid`) |
| `?club` (item do clube) | `knowledge_graph.targetId` + `targetType='Club'` | `club.id` (resolvido por `Club.qid`) |
| relação | `knowledge_graph.relation` | `'PLAYED_FOR'` |
| `P580` (ano) | `metadata.year` / `metadata.season` | `2023` / `"2023"` |
| proveniência | `metadata.dataSource` / `sourceUrl` / `license` | `'wikidata'` / `https://www.wikidata.org/wiki/<playerQid>` / `'CC0'` |

**Dedup key:** `playerQid|clubQid|year` (função `squadsDedupKey` no connector). É a identidade
natural do vínculo (mesma pessoa + mesmo clube + mesma temporada); é a base da idempotência.

**Regra anti-órfão (obrigatória):** `knowledge_graph` **não tem FK** (sourceId/targetId são strings).
Por isso o seed **nunca** cria um vínculo cujo jogador/clube não exista no acervo: ele resolve por QID
contra `Player.qid`/`Club.qid`; não-casados vão para a **fila de revisão** (report/log), jamais para o
banco — o grafo nunca fica com ponta solta.

**Comando:**
```bash
pnpm --filter @almanaque/api exec tsx scripts/seed-squads.ts           # DRY-RUN (default) — baixa+parse+reporta, não grava
pnpm --filter @almanaque/api exec tsx scripts/seed-squads.ts --apply   # grava no banco (teste/CI)
```

**Comportamento:**
- **DRY-RUN (default):** não abre banco. Baixa uma amostra, valida via Zod e reporta (leituras + dedup
  key únicas + amostra). Nada é escrito.
- **APPLY (`--apply`):** abre banco, resolve jogador/clube por QID, aplica dedup + idempotência
  (rodar 2× não duplica) e grava com proveniência obrigatória em `metadata`. Reporta
  criados / já-existiam / órfãos.

**Reversibilidade (Postgres):**
```sql
DELETE FROM knowledge_graph WHERE "relation"='PLAYED_FOR' AND "metadata"->>'dataSource'='wikidata';
```

**Variáveis de ambiente (com defaults):** `SQUADS_MIN_YEAR=1900` · `SQUADS_LIMIT=1000` ·
`SQUADS_MAX_PAGES` (2 dry-run / 20 apply) · `SQUADS_PLAYER_CHUNK=400` · `SQUADS_TARGET_MIN=10000`.

**Qualidade:** validação **Zod** de todo payload externo (`SquadsEntrySchema`: `playerQid`/`clubQid`
`^Q\d+$` e `year` int ≥ 1900); connector é **puro** (sem rede/Prisma) e coberto por teste de
integração sem rede/banco (mock `globalThis.fetch` + repositório em memória). Sem escrita em produção.

**Limitações:**
- Só entra vínculo com **P580** (ano determinável). Vínculos P54 **sem** P580 não têm ano → são
  descartados (o Wikidata tem poucos vínculos P54 com P580, então o conjunto é menor do que "todos
  os elencos do mundo").
- O filtro `VALUES ?player {...}` / `VALUES ?club {...}` limita a consulta aos QIDs do acervo para
  alcançar a meta de `≥10.000` vínculos sem varrer todos os P54 do mundo; o acervo é reduzido, então
  o total real depende da interseção elenco↔acervo.
- O valor alvo `≥10.000` é **reporte** (não trava) — o seed não fabrica contagem.
- Metadata `year`/`season` são normalizados (sem trimestre/mês); temporadas que cruzam anos são

---

## 13. Estádios via Wikidata + PostGIS — WS-D / T423

**Fonte:** Wikidata (CC0). Itens de estádio (classe **Q483110**) via
`wdt:P31/wdt:P279* wd:Q483110` (estádio ou subtipo). Propriedades extraídas:

| Propriedade (Wikidata) | Campo `stadiums` | Observação |
|---|---|---|
| item (`?stadium`) | `qid` (unique) | dedup key / idempotência |
| `rdfs:label` (`pt,en`) | `name` | via `wikibase:label` |
| `P1083` (capacity) | `capacity` | int ≥ 0 |
| `P625` (coordinate) | `latitude` / `longitude` (+ coluna PostGIS `location`) | `POINT(lon lat)` |
| `P131` (ADM entity -> label) | `city` | entidade administrativa (município) |
| `P17` -> `P297` (ISO 3166-1) | `country` | alpha-2 |
| `P466` (occupant) | `clubId` (via `Club.qid`) | clube mandante/ocupante |
| — | `surface` | **sempre null** (Wikidata não tem propriedade estável de piso; backlog) |
| — | `state` | **sempre null** (não derivável de forma confiável na consulta atual) |

**PostGIS / migration:** o `schema.prisma` (model `Stadium`) ganhou a coluna
`location Unsupported("geometry(Point,4326)")?`. A migration
`apps/api/prisma/migrations/20260905_stadiums_postgis/migration.sql` cria a extensão
(`CREATE EXTENSION IF NOT EXISTS postgis;`) e a coluna
(`ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS location geometry(Point,4326);`).
Como o CI usa **`prisma db push`** (não `migrate deploy`), o workflow
`.github/workflows/ci.yml` foi alterado para usar a imagem **`postgis/postgis:16-3.4`**
no service container e rodar `apps/api/scripts/sql/create_postgis.sql`
(`CREATE EXTENSION IF NOT EXISTS postgis;`) **antes** do `db push`, para que o tipo
`geometry` exista quando a coluna for criada. Há ainda um índice espacial
(`GIST (location)`). A extensão é **não-destrutiva** (`IF NOT EXISTS`).

**Mapeamento/gravação:** o seed grava `latitude`/`longitude` (Float, para leitura) **e** seta a
coluna geográfica via SQL crua no repositório Prisma:
`UPDATE stadiums SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326) WHERE id = ?`
(Prisma não grava tipo `Unsupported` pelo cliente tipado). Proveniência: `importedFrom='wikidata'`
e `importedAt` (a URL de origem é derivável de `https://www.wikidata.org/wiki/<qid>`).

**Dedup key:** `qid` (função `stadiumsDedupKey` no connector). A idempotência é garantida:
rodar o seed 2× não duplica (checa `stadiums.qid` antes de criar).

**Regra anti-órfão (obrigatória):** o estádio **só** é persistido com `clubId` se o clube
associado (via `P466`) resolver para um `Club.qid` **existente no acervo**. Estádio **sem**
clube associado é gravado com `clubId = null`. Estádio **com** clube não-casado **nunca é
persistido** — vai para a **fila de revisão** (report/envio ao log), garantindo que `clubId`
nunca aponte para uma entidade inexistente. O connector é **puro** (sem rede/Prisma), testado com
repositório em memória.

**Comando:**
```bash
# DRY-RUN (default) — baixa amostra via Wikidata, valida e reporta; NÃO abre banco
pnpm --filter @almanaque/api exec tsx scripts/seed-stadiums.ts
# APPLY — grava no banco (teste/CI): resolve clube por QID, dedup QID, PostGIS location
pnpm --filter @almanaque/api exec tsx scripts/seed-stadiums.ts --apply
DELETE FROM stadiums WHERE "importedFrom"='wikidata';
```

**Variáveis de ambiente (com defaults):** `STADIUMS_LIMIT=500` · `STADIUMS_MAX_PAGES`
(2 dry-run / 20 apply) · `STADIUMS_CLUB_CHUNK=400` · `STADIUMS_TARGET_MIN=500` (apenas reporte) ·
`STADIUMS_RETRIES=3` · `STADIUMS_BACKOFF_MS=10000` (retry/backoff para os 504 transitórios do endpoint).

**Qualidade:** validação **Zod** de todo payload externo (`StadiumEntrySchema`): `qid`
`^Q\d+$`, `name` min-length, `latitude ∈ [-90,90]`, `longitude ∈ [-180,180]`,
`capacity` int ≥ 0, `country` ISO alpha-2. Coberto por teste de integração sem rede/banco
(mock `globalThis.fetch` + repositório em memória): dedup por QID, idempotência, anti-órfão,
proveniência. Sem escrita em produção.

**Limitações:**
- **O Wikidata tem muitos estádios sem `P625` (coordenadas) e/ou sem `P1083` (capacidade).** A
  meta de `≥ 500` refere-se ao total **persistido**; a quantidade **com** coordenadas/capacidade é
  tipicamente bem menor. O seed **reporta** os números reais (com P625 / com P1083) e **nunca
  fabrica** contagem.
- `surface` e `state` ficam `null` (sem propriedade confiável na consulta atual) — backlog.
- `city` vem do label de `P131` (entidade administrativa imediata), que pode ser município ou
  entidade de nível superior (estado) conforme o item.
- Só estádios com **`P466`** ligando a um clube do acervo entram com `clubId`; estádios sem
  `P466` ficam com `clubId=null` (não são "órfãos" — são estádios genéricos).
- A consulta genérica (sem `VALUES ?club`) é cara; o dry-run usa amostragem sem
  DISTINCT/ORDER BY e o seed usa retry+backoff (`STADIUMS_RETRIES`/`STADIUMS_BACKOFF_MS`), pois
  o Wikidata retorna **HTTP 504** em consultas pesadas na primeira execução (cache frio).
- Correção importante: quando há `VALUES ?club`, o vínculo `?stadium wdt:P466 ?club` é **obrigatório**
  (fora do `OPTIONAL`). Deixá-lo no `OPTIONAL` faz o `VALUES` casar com estádios **sem** P466,
  gerando associação espúria de clube (bug já corrigido no `buildStadiumsQuery`).

---

## 14. Futebol feminino (Wikidata) — WS-D / T424

> Sem coluna de gênero no schema (evita conflito com a tarefa paralela que altera o schema). O feminino
> é representado por **convenção documentada**.

**Fonte:** Wikidata (CC0), via SPARQL `query.wikidata.org`.

**ATENÇÃO — QIDs corrigidos (verificados no Wikidata, não fabricados):** o enunciado citava
`Q461753 = women's association football`, mas na verdade **`Q461753` é "Jean Duvieusart"** (político
belga) e **`Q104548798` é "Samuel Frankfurter"** (pessoa). Os QIDs corretos usados aqui são:

| Semântica | QID | Nota |
|---|---|---|
| women's association football (raiz do esporte) | **Q606060** | substitui Q461753 |
| women's association football league (competição) | **Q135641755** | ligas femininas |
| women's sports competition (classe ampla) | **Q61983760** | registro documentado |
| women's association football team (clube) | **Q28140340** | substitui Q104548798 |
| women's association football club (clube) | **Q51481377** | clube com elenco feminino |
| association football player (ocupação P106) | **Q937857** | ok (enunciado correto) |
| female (sexo/gênero P21) | **Q6581072** | ok (enunciado correto) |

### ⚠️ Convenção de gênero (SEM novo schema)

O schema Prisma **não tem coluna de gênero** (e não deve ganhar nesta tarefa). O feminino é
representado por convenção:

1. **Toda entidade/vínculo** criado por este connector grava `metadata.gender = 'women'` no
   `knowledge_graph` (constante `WOMENS_GENDER_VALUE`).
2. **Registro documentado `WOMENS_COMPETITION_QIDS`** no connector: lista os QIDs que marcam uma
   competição como feminina (`Q606060`, `Q135641755`, `Q61983760`). É o contrato que a normalização
   isolada por gênero do Ranking (**T425**) usará para derivar o gênero, sem coluna nova.

### Mapeamento fonte → acervo

| Fonte (Wikidata) | Tabela/coluna | Valor |
|---|---|---|
| QID da competição (classe Q135641755) | `competition.qid` + `name` + `country` | label en + ISO via P297 |
| QID do clube (Q28140340/Q51481377) | `club.qid` + `name` + `country` | label en + ISO via P297 |
| QID da jogadora (P106=Q937857 + P21=Q6581072) | `player.qid` + `fullName` + `country` + `position` | label en + ISO + P413 |
| P54 jogadora→clube + P580 (ano) | `knowledge_graph` (`sourceType='Player'`, `targetType='Club'`) | `relation='PLAYED_FOR'` |
| — | `metadata.gender='women'`, `dataSource='wikidata'`, `sourceUrl`, `license='CC0'` | proveniência |

**Dedup por QID:** entidades usam o **QID** como chave estável (`qid` é `unique` em
competition/club/player). Vínculos P54 usam `playerQid|clubQid|year` (função `womensEdgeDedupKey`).
Reexecução **não duplica** (idempotente).

**Anti-órfão (obrigatória):** `knowledge_graph` **não tem FK**. O connector resolve jogadora/clube por
QID contra `player.qid`/`club.qid`; não-casados vão para a **fila de revisão** (report), **jamais**
para o banco. No `--apply`, os vínculos são buscados já limitados aos clubes do acervo feminino
(`VALUES ?club`), reduzindo órfãos.

**Comando:**
```bash
pnpm --filter @almanaque/api exec tsx scripts/seed-womens-football.ts           # DRY-RUN (default)
pnpm --filter @almanaque/api exec tsx scripts/seed-womens-football.ts --apply   # grava (teste/CI)
```
DELETE FROM knowledge_graph WHERE "relation"='PLAYED_FOR' AND "metadata"->>'gender'='women';
```
Entidades criadas são idempotentes (re-run → `skipped`, 0 novos). Para remover as entidades do seed,
apague pelos QIDs do conjunto ingerido (registro exposto pelo connector).

**Qualidade (TDD, sem rede/banco no teste):** validação **Zod** de todo payload externo (QID
`^Q\\d+$`, país ISO alpha-2, ano int ≥ 1900); connector **puro**; teste com mock de
`globalThis.fetch` + repositório em memória cobre parse, dedup QID, idempotência 2×, anti-órfão,
proveniência e **isolamento por gênero** (registro separado `womensQids`).

**Limitações (honesto, não fabricado):**
- **Competições:** a classe Q135641755 (liga feminina) retorna **~12** competições no Wikidata. O
  caminho `P31/P279* → Q606060` descoberto retorna clubes/overviews (não competições), e a interseção
  com `Q15991303` (liga de futebol, usada no §7) retornou **0**. A meta de **≥200 competições** não é
  alcançável de forma auditável com uma única classe; **não fabricamos** contagem.
- **Clubes:** Q28140340/Q51481377 retornam **~800+** clubes femininos (real).
- **Jogadoras:** P106=Q937857 + P21=Q6581072 retornam milhares; o `--apply` amostra por
  `WOMENS_PLAYER_MAX_PAGES` (default 8 páginas de 1000) para não estourar o label service.
- **Vínculos P54:** só entram vínculos com **P580** (ano determinável); sem P580 são descartados.
- **País:** P297 dá a ISO do país soberano (Inglaterra/Gales/Escócia → GB), como no §5.
- **Gênero:** não há coluna única; T425 deriva o gênero do registro `WOMENS_COMPETITION_QIDS` +
  `metadata.gender`.

## 15. Execução e monitoramento (T426)

**Comandos (sempre DRY-RUN primeiro):**
```bash
pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts          # DRY-RUN
pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts --apply  # grava
pnpm --filter @almanaque/api exec tsx scripts/enrich-club-coords.ts --apply     # P625 → lat/lon
```

**Rate limit e retry policy (T426):** retry com backoff exponencial (3 tentativas:
1s, 2s, 4s) em HTTP não-200, timeout de 30s por request (AbortController),
sleep de 2s entre batches do seed e throttle de 200ms entre chamadas SPARQL
do worker (máx 5 req/s). Falhas logadas em Pino (`warn` com offset/tentativa)
sem vazar segredos; User-Agent identificado em todos os fetches.

**Como ler os logs:** `qid collision — kept first occurrence` = mesmo QID com
nomes distintos no mesmo lote (1ª ocorrência vence, nada é sobrescrito às
cegas); `sync concluído { candidatos, novos, atualizados, colisoes }` = resumo
do `--apply`; órfãos (ex.: `club_missing`) vão para a fila de revisão, jamais
para o banco.

**Counts reais (banco de teste, T426 — publicar atualização a cada seed):**
*total com qid / total com coordenada / % com sourceUrl — ver corpo do PR.*
Qualquer número abaixo do esperado é dado, não defeito (princípio 1.3).

**Amostragem não-determinística (achado T426):** a query SPARQL não tem
`ORDER BY`, então cada rodada retorna uma amostra diferente da classe
(rodadas reais: 1901, 1626 e 1626 distintos). Re-rodar acumula cobertura;
para seed determinístico futuro, adicionar `ORDER BY ?club` (custa tempo
de ordenação no endpoint — avaliar).
