# T449c-v2 — FASE 0 (design read-only): Ranking agregado cross-division — Piloto Inglaterra

> **Status:** PROPOSTA. **Nada implementado. Nada gravado. Nada publicado.**
> Esta fase é leitura/simulação. Escrita/migration/apply/UI ficam para PR futuro **após
> aprovação explícita do Thinker** e correção prévia da divergência do item 1.

## 0. Contexto (T449c-v1, fechado)
`Competition.level Int?` + `competitions_level_idx` existem; EN: `Q9448`=1 Premier League ·
`Q19510`=2 Championship · `Q19565`=3 League One · `Q48837`=4 League Two · `Q18504`=5 National
League. A API expõe `competition.level/divisionLabel/tierSource/tierVersion`; a UI mostra badge
quando `divisionLabel` existe. Os 5 rankings **por divisão** continuam normalizados isoladamente.

**Problema residual:** “100” da Premier League ≍ “100” da National League; não há agregado nacional.

---

## 1. Reconciliação código ↔ metodologia (GATE CRÍTICO)

| aspecto | **código real** | **metodologia publicada** (`/metodologia#ranking-piloto-inglaterra`) |
|---|---|---|
| pontuação bruta | `rankDivision()` usa **`points` da tabela** (W×3+D×1) | “Vitórias×3 + Empates×1 + **Gols Pró×0.2**” |
| títulos | 0 (sem termo) | “títulos = 0” |
| normalização | MinMax de `points` **por divisão/competição** | MinMax por competição/temporada/divisão |
| desempate | `points` desc → **saldo (GF−GA)** desc | “gols contra, saldo, gols pró, nome, id” |

**Divergências materiais:** (a) o texto publica um termo **Gols Pró×0.2** que **não está no código**;
(b) a ordem de desempate publicada ≠ código; (c) o schema **não persiste os pontos brutos** — só a
nota 0-100 (MinMax é lossy).

**Regra do despacho:** *não propor v2 por cima de divergência.* Opções antes de codar v2:
- **A. Corrigir a metodologia** para refletir o código (`MinMax(points)` por divisão, desempate por saldo) — docs-only.
- **B. Corrigir o código** para refletir a metodologia (adicionar `GF×0.2` e desempate publicado) — **muda score** do piloto existente → exigiria checkpoint próprio.
- **C. Declarar duas fórmulas** (piloto-divisão = `MinMax(points)`; agregado futuro = tier-aware) e publicar isso.

**Recomendação:** **A + C** (corrigir o texto e explicitar as duas fórmulas) — não altera score e
desbloqueia o v2. B implicaria recalcular 116 entries (fora de escopo agora).

---

## 2. Inventário (produção, read-only)

- **5 competições EN** (levels 1..5) e **5 rankings** (`season='2023'`): PL 20 clubes; Championship/
  L1/L2/NL 24 cada = **116 entries**; **all `gender='men'`**; por divisão `min=0`/`max=100`.
- **Hash de referência (pré-v2):** rankings `bfb6c4850d6648a8e51d276bc53921fa` · entries `d2b117aa537047efe96edbac844e4c40` (definição compacta `id|name|season|level` e `rankingId|position|points`).
- Clubes em >1 divisão: **0** · rankings sem entries: **0** · duplicidade por clube: **0** · gêneros misturados: **0**.

## 3. Diagnóstico de comparabilidade

| level | divisão | ranking id | season | max | min | clubes | normalização atual | comparável? |
|---:|---|---|---:|---:|---:|---:|---|---|
| 1 | Premier League | f193b1d6… | 2023 | 100 | 0 | 20 | MinMax(points) isolado | **não** |
| 2 | EFL Championship | 124ed0bc… | 2023 | 100 | 0 | 24 | MinMax(points) isolado | **não** |
| 3 | EFL League One | 97adbf36… | 2023 | 100 | 0 | 24 | MinMax(points) isolado | **não** |
| 4 | EFL League Two | 02d5dbbd… | 2023 | 100 | 0 | 24 | MinMax(points) isolado | **não** |
| 5 | National League | e563fd84… | 2023 | 100 | 0 | 24 | MinMax(points) isolado | **não** |

1. Sim, cada divisão normaliza isolada. 2. Sim, o 1º recebe 100. 3. Sim, o último recebe 0.
4. **Há sobreposição de pontos entre divisões** (todas cobrem 0-100) → “40” não é comparável.
5. **Sim** — o 1º da NL recebe 100 e parece equivalente a Manchester City (100).
6. `baseMatches` está presente (38/46); `baseTitles` ausente/0; `dataSourceIds=['rsssf']` — proveniência ok, **mas os pontos brutos não estão persistidos**.
7. Nenhum clube em >1 divisão (0). 8. Sem duplicidade por id/QID. 9. Sem mistura de gênero.
10. Nenhum ranking publicado sem entries.

**Risco de agregação:** a base persistida é a nota 0-100 (não os pontos brutos). Qualquer
`raw × multiplicador` **não é computável sem re-parsear o RSSSF**; sobre os dados atuais, só é
possível **ponderar a nota normalizada** (Esquema 3). Isso é decisivo para o modelo.

## 4. Opções de modelo de dados

| opção | mudança schema | risco | reversibilidade | auditabilidade | impacto UI | recomendação |
|---|---|---|---|---|---|---|
| **A** novo `Ranking` + `Competition` sentinel | cria entidade artificial | polui `competitions`; proveniência duvidosa | soft-hide do sentinel | média | reusa `/rankings` | ✗ |
| **B** `Ranking.scope` + `country` + `tierVersion` (migration aditiva nullable) | +2/3 colunas null | baixo (aditivo) | down trivial | **alta** (filtrável) | tab/seletor novo | **✓ recomendada** |
| **C** `Ranking.metadata` JSON | migration (não há campo) | baixo | down | baixa (não filtrável) | idem | ~ |
| **D** derivado runtime (sem persistir) | nenhuma | baixo | n/a | baixa (não citável) | read-time | ✗ (não publicável) |

**Recomendação preliminar:** **B**, com `Ranking.competitionId = NULL`, `season` reusando o padrão
atual (`'2023'`), `scope='country_pyramid'`, `country='GB'`, `tierVersion=…`, `formulaVersion=…`.
Migration **aditiva/nullable**; nada toca os 5 rankings existentes.

## 5. Esquemas tier-aware (simulados read-only sobre os 116 dados persistidos)

Pesos lineares propostos: L1 1.00 · L2 0.85 · L3 0.70 · L4 0.55 · L5 0.40.
Decaimento: `mult(l)=1/(1+α·(l−1))`, α∈{0.15, 0.25, 0.35}.

| esquema | base | como | top-3 (amostra) |
|---|---|---|---|
| 1/3 | nota 0-100 | `score × peso_divisão` (MinMax global opcional) | Man City 100 · Arsenal 92 · **Burnley(L2) 85** |
| 2 (α=0.15) | nota 0-100 | `score / (1+0.15(l−1))` | Man City · Arsenal · **Burnley 87**; **Wrexham(L5)=63** |
| 2 (α=0.25) | idem | idem | … Wrexham 50 |
| 2 (α=0.35) | idem | idem | … Wrexham 42 |

**Observações determinísticas:**
- **A ordem intra-divisão é sempre preservada** (peso por nível multiplica igualmente o nível) — não há “perda de mérito intra-divisão”.
- **Cross-over:** com peso L5=0.40, **Wrexham (40) fica acima de 10/20 clubes da Premier League** (metade inferior). Com α=0.15 (mais suave), Wrexham (63) sobe para acima de **15/20** PL — **inflação** das divisões baixas. α=0.35 → 10/20.
- Como a base é a nota normalizada (não pontos brutos), Esquemas 1 e 2 **colapsam** no Esquema 3 sem re-parse do RSSSF.

**Trade-offs:** linear (0.40) = explicável e estável, mas coloca um clube da 5ª divisão acima de metade da elite; decaimento suave (α=0.15) infla ainda mais; α alto reduz cross-over e melhora plausibilidade. **Nenhum esquema escolhido nesta fase** (o despacho exige apresentar, não decidir).

**Critérios de escolha** (do despacho): simplicidade · explicabilidade · estabilidade · não inflar
inferiores · preservar mérito intra-divisão · reprodutibilidade · rollback — o linear/decay satisfazem
“simples/reprodutível/estável”; a plausibilidade (cross-over) é o ponto a arbitrar publicamente.

## 6. Rascunho de metodologia pública (NÃO publicar)

> **Ranking cross-division — Piloto Inglaterra (2023) — PROPOSTO / não publicado**
> Derivado das **tabelas finais** RSSSF das 5 divisões (2022/23). Os rankings **por divisão
> continuam existindo**. O agregado aplica um **fator de divisão** (level 1..5) à nota 0-100 de
> cada clube e normaliza no grupo *país+temporada+gênero*. **É estimativa metodológica — não é
> confronto direto nem resultado oficial.** Sem títulos (limitação). Baseado em tabelas finais, não
> em partidas. Pode mudar posições em relação ao ranking por divisão. Fonte: RSSSF (uso condicionado
> à **atribuição adequada**; **não é domínio público**). Vigência/data + canal de correção
> (`endart.studios@gmail.com`).

## 7. API/UI propostas (não implementar)

- **API:** filtro aditivo `GET /rankings?scope=country_pyramid&country=GB&season=2023` **ou** `GET /rankings/cross-division`. Requisitos: não quebrar contratos; cursor-based; expor `scope, country, season, tierVersion, formulaVersion, divisionLabel, level, source, sourceUrl, attribution, publishedAt, gender`.
- **UI:** manter a visão por divisão; **tab/seletor “Pirâmide nacional”** só após aprovação; badge de divisão permanece; **disclaimer** “agregado metodológico”. A11y: texto visível, contraste, mobile.

## 8. Plano de testes/gates (futuro)

Unit: multiplier puro; validação de level; rejeição fora do mapeamento; determinismo; desempate;
isolamento por gênero; **não-mutação** dos rankings por divisão. Integração: cria ranking
cross-division em DB de teste; assert divisões **inalteradas** (hash); proveniência; re-run
idempotente; despublicar não afeta divisões; API filtra por scope. E2E: tab/badge/disclaimer;
score visual = API. Produção: dry-run → apply → SQL gate (hashes divisão inalterados) → cache → API/
UI smoke → rollback.

## 9. Rollback/reversibilidade

- Novo ranking **despublicável/soft-hidden** sem afetar divisões.
- Migration aditiva → down remove coluna/índice sem afetar dados.
- **Sem** `Competition` sentinel (evita hard delete).
- **Nunca** alterar/recalcular rankings por divisão sem snapshot.
- **Nunca** publicar sem metodologia viva (item 1 resolvido).

## 10. Confirmações desta FASE 0
**Zero escrita · zero migration · zero produção · zero mudança de score · zero novo ranking
publicado · zero hard delete · zero segredo · MG/GO/PR intocados.** Apenas leitura + simulação local.
