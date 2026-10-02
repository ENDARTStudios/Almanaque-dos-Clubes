# RANKING-ALGORITHM.md — Ranking 0-100 auditável (T425)

Este documento especifica o algoritmo de Ranking 0-100 implementado em
`apps/api/src/modules/rankings/ranking-algorithm.service.ts` (funções puras) e
consumido pela cron `apps/api/src/modules/rankings/ranking-cron.job.ts`
(BullMQ, fila `ranking`, 03:00 UTC).

> **Proposta de valor:** um ranking **auditável** — cada posição expõe a base que a
> sustenta ("com base em N partidas / T títulos auditáveis"), a proveniência
> (`dataSourceIds`) e o escopo (ano/competição/gênero). Nada é publicado sem dado.

---

## 1. Fórmula de pontos brutos (clube-ano)

```
pontos_brutos = (vitórias × 3 × peso) + (empates × 1 × peso) + (títulos × 50 × peso)
```

O `peso` é o **peso da hierarquia da competição** da partida/título que gerou o evento.

| Constante | Valor |
|---|---|
| vitória | ×3 |
| empate | ×1 |
| título | ×50 |

## 2. Pesos por hierarquia

```
Mundial     = 5.0
Continental = 4.0
Nacional    = 3.0   ← DEFAULT (schema não tem campo de hierarquia)
Estadual    = 2.0
Municipal   = 1.0
```

Constantes em `HIERARCHY_WEIGHTS` (service).

## 3. Mapeamento de hierarquia (SEM campo no schema)

Como `Competition` não tem coluna de hierarquia, a hierarquia é **derivada** nesta
ordem (a primeira regra que bate vence), caindo no default **Nacional (3.0)**:

1. **Por QID** — override explícito em `COMPETITION_HIERARCHY_BY_QID`
   (mapeamento documentado a ser preenchido conforme o acervo ganha competições
   mundial/continental conhecidas; hoje vazio → default).
2. **Por `país:type`** — override em `HIERARCHY_BY_COUNTRY_TYPE`
   (ex.: `BR:SUPER_CUP` → `nacional`; vazio por padrão).
3. **Por palavra-chave no nome** — heurística em `HIERARCHY_KEYWORDS`:
   - mundo/copa do mundo/world cup/fifa club → **mundial**;
   - libertadores/champions league/uefa/conmebol/europa league/afc cup/copa américa → **continental**;
   - supercopa/super cup/superliga/campeonato/liga/league/série/divisão/torneio → **nacional**.
4. **Default** → `nacional`.

`resolveHierarchy(comp)` e `hierarchyWeight(comp)` são puras e exportadas.

## 4. Amostra mínima (honestidade ≈ não publicar métrica sem dado)

- **Clube-ano** só é ranqueado se: `baseTitles >= 1 OU baseMatches >= 5`.
  Caso contrário o registro é **NULL** (`position = NULL`, `points = NULL`) com
  `reason = 'dados insuficientes'` — **não publica posição/score**.
- **Jogador-ano** só se: `baseMatches >= 3` **e** existirem estatísticas
  (gols/assistências). Sem essa fonte → NULL com o mesmo motivo.

## 5. Normalização MinMax (0-100)

```
score_i = round( (points_i - min) / (max - min) × 100 )
```
- O máximo do conjunto assume **100**, o mínimo **0**.
- Se todos os pontos forem **iguais** (ou houver **um único** valor), todos recebem **0**.

`normalizeMinMax(values)` é pura e exportada.

## 6. Isolamento por gênero

A normalização é feita **separadamente** para o conjunto masculino e o feminino, para que
o feminino não seja **esmagado** pela escala masculina. O gênero é derivado, sem coluna nova:

- Competição com QID em `WOMENS_COMPETITION_QIDS` (registro do connector
  wikidata-womens-football, T424) ou nome com `women/feminino/female` → **feminina**.
- Título (aresta `KnowledgeGraph` relation=`WON`) com `metadata.gender === 'women'`
  → feminino.

Cada clube-ano é classificado `men` ou `women`; o score 0-100 é normalizado por grupo.
No calendário da cron, para cada ano+escopo são gerados um **Ranking masculino** e um
**feminino** (posições únicas por gênero).

## 7. Metadata de base auditável

Cada `RankingEntry` grava (migration `20260930_ranking_base_metadata`):
- `baseMatches` — nº de partidas que compõem a base do clube-ano;
- `baseTitles` — nº de títulos auditáveis que compõem a base;
- `dataSourceIds` — proveniência (JSONB, ex.: `["rsssf","wikidata"]`);
- `reason` — NULL ou motivo de não-publicação;
- `gender` — `men` | `women` (isolamento).

A API de rankings (`/rankings/:id/entries`) já retorna esses campos (foram adicionados ao
model `RankingEntry`), permitindo à UI exibir "com base em N partidas / T títulos auditáveis".
`position` passou a ser **nullable** para representar registros sem posição publicada.

## 8. Cron diário (03:00 UTC)

- Fila BullMQ **`ranking`**, job `ranking:compute`, padrão `0 3 * * *` (UTC).
- **Idempotente:** se já existe um `Ranking` publicado para o mesmo (season, competitionId,
  nome por gênero), **não recalcula nem republica** (skip).
- Roda com **contexto RLS `SERVICE`** (`withRlsContext({ role: 'SERVICE' })`).
- Arquivo: `apps/api/src/modules/rankings/ranking-cron.job.ts`.
  - `registerRankingCron()` agenda via `upsertJobScheduler` (BullMQ v6) + cria o worker;
  - `runRankingForSeason(scope)` executa para os dois gêneros (isolamento).

## 9. Limitações (honestas, não fabricadas)

1. **Sem tabela de estatísticas jogador↔partida (gols/assistências) no schema.** A fórmula
   de jogador (`pontos = gols×4 + assistências×2 + vitórias×1`) está implementada, mas o
   repositório `loadPlayerSeasonStats` devolve **vazio** → todo jogador-ano é **NULL** com
   `reason='dados insuficientes'`. Quando a fonte de stats existir, basta implementar
   `loadPlayerSeasonStats` e o ranking de jogadores passa a produzir valores.
2. **Feminino sparse.** A base de partidas/títulos auditados do feminino é muito pequena;
   nesta rodada a maioria dos clubes-ano femininos fica NULL por amostra mínima.
3. **Hierarquia por default Nacional.** Sem campo de hierarquia no schema, competições não
   mapeadas por QID/nome/type caem em `nacional` (3.0). O mapeamento por QID é o ponto de
   ajuste quando o acervo confirmar os QIDs reais de competições mundial/continental.
4. **Amostra mínima depende dos dados.** A base em produção tem **0 partidas** e poucos
   títulos; portanto muitos rankings serão NULL (`dados insuficientes`) — **nenhum valor é
   fabricado**.
