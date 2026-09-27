# WS-D M1 — FASE 0 (design read-only): Seed/enriquecimento massivo via Wikidata

> **Status:** PROPOSTA. Nada implementado, nada gravado, nada publicado. Medição read-only em
> produção (2026-09-27). Escopo final = decisão do Thinker após revisão.

## 1. Estado atual medido

| item                                 | valor                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| clubes ativos com QID                | **3.871 / 3.871 (100%)**                                                                                              |
| clubes ativos sem QID                | **0**                                                                                                                 |
| competições sem QID                  | **3** de 1.564                                                                                                        |
| duplicatas de QID ativo (homônimos)  | **0**                                                                                                                 |
| competições sem QID (identificadas)  | `Campeonato Brasileiro Série A` (LEAGUE/BR) · `Copa do Brasil` (CUP/BR) · `Copa Libertadores da América` (TOURNAMENT) |
| atributos ausentes nos clubes ativos | `city` nulo **3.417/3.871 (88%)** · `latitude` nula **3.713/3.871 (96%)** · `fullName` nulo **3.848/3.871 (~99%)**    |

**Top países por volume (clubes ativos):** BR **611** · GB 324 · DE 305 · SE 294 · PT 212 · ES 143 ·
IT 106 · FR 85 · US 73 · BE 61 · CH 53 · KR 50 · RO 49 · HU 48 · TR 44 · IQ 43 · BY 41 · CZ 39 ·
MX 39 · NL 36 · PL 34 · CA 33 · AT 31 · AR 31 · JP 31.

**Cobertura de QID por país:** **100%** (0 sem QID em **todos** os países).

**Consequência:** um “seed massivo **para preencher QIDs faltantes**” é **no-op de identidade**.
O valor real do M1 é **(M1a) enriquecer atributos dos clubes existentes + QID das 3 competições** e
**(M1b) expandir** o acervo (novos clubes/competições) — decisão de produto.

## 2. M1a — Enriquecimento de atributos (prioridade 1)

**Objetivo:** preencher `city`/`latitude`/`longitude`/`fullName` dos 3.871 clubes existentes **por QID**
(já existente) e o **QID das 3 competições** sem identidade.

**Fonte:** Wikidata **CC0** — `P131` (território administrativo) → `city`; `P625` (coordenada) →
`latitude/longitude`; `labels.pt`/`labels.en` → `fullName`.

**Estratégia:**

- resolução **por QID** (identidade já canônica) — nunca por nome;
- **chunks de 100** por transação `Serializable`;
- **idempotente:** noop quando o QID já tem o campo preenchido (só preenche o que falta);
- proveniência: `importedFrom='wikidata-enrich-v1'`, `sourceUrl=https://www.wikidata.org/wiki/<QID>`,
  `retrievedAt` estático por batch, `license='CC0'`;
- **rollback lógico** por `importedFrom='wikidata-enrich-v1'` (reverter campos para NULL — **sem hard delete**).

**Critérios de sucesso:** ≥90% `city` · ≥80% `latitude/longitude` · ≥90% `fullName` · 3 competições BR
com QID · zero impacto em rankings/estaduais/MG/GO/PR.

**Riscos:** `P625` ausente (fallback `P131`→cidade→coordenada da cidade); `label pt` ausente (fallback `en`);
rate-limit (backoff + `User-Agent` identificado).

## 3. M1b — Expansão de acervo (prioridade 2, após M1a)

**Objetivo:** ≥1.000 clubes novos + ≥50 competições novas + ≥20 países.
**Fonte:** Wikidata **SPARQL** (`P17` país + `P31=Q476028` clube de futebol; `P576` ausente = ativo).
**Estratégia:** top **30 países** por volume atual; **top 3 divisões** por país (via `P131`/liga quando
mapeável); **dedup por QID** (skip se ocupado; soft-deleted → **skip**, sem reativar); **chunks de 100** +
pausa; `retrievedAt` estático; **rollback por `importedFrom`** (soft-delete dos criados, sem hard delete).

**Critérios de sucesso:** ≥1.000 clubes novos · ≥50 competições novas · ≥20 países · **zero duplicidade
global de QID** · zero impacto em dados existentes.

## 4. M1c — Jogadores/estádios (FUTURO, não autorizado)

Depende de M1a/M1b consolidados. Fora do escopo desta fase.

## 5. Plano de validação

- **Dry-run em DB espelhado** (zero escrita): assert zero escrita.
- Todo **QID proposto existe** no Wikidata (fetch por QID).
- **Nenhum conflito** com clubes ativos (skip conservador p/ homônimos/QID ocupado).
- **Proveniência preenchida** (`importedFrom`, `sourceUrl`, `retrievedAt`, `license`).
- **Rollback simulado** funciona (reverter por `importedFrom`).
- **Amostragem manual de 5%** antes do apply.

## 6. Plano de gate de produção

`dry-run → apply → SQL gate → cache cirúrgico → API smoke`, **chunk-by-chunk** com pausa para observação;
**rollback disponível por chunk**. SQL gate: contagens antes/depois, **zero duplicidade de QID**,
proveniência 100%, **MG/GO/PR e rankings/entries intactos** (hashes pré=pós). Cache: inventário via `SCAN`;
sem `FLUSHALL/FLUSHDB`.

## 7. Riscos e mitigações

| risco                   | mitigação                                                        |
| ----------------------- | ---------------------------------------------------------------- |
| Rate-limit Wikidata     | backoff exponencial; `User-Agent` identificado; teto de req/hora |
| Homônimos / QID ocupado | validação prévia conservadora; skip (não reativa soft-deleted)   |
| Performance             | transações pequenas (100); índice `clubs.qid` já existe          |
| Qualidade dos dados     | amostragem manual de 5% antes do apply                           |
| Schema                  | validar `latitude`/`city` no dry-run (tipos/limites)             |

## 8. Critérios de sucesso globais (M1a + M1b)

≥90% `city` preenchido · ≥80% `latitude/longitude` · ≥1.000 clubes novos · ≥50 competições novas ·
≥20 países cobertos · **zero duplicidade global de QID** · **zero impacto** em rankings/estaduais ·
cache cirúrgico · API smoke verde.

## 9. Confirmações desta FASE 0

**Zero código escrito · zero produção alterada · zero segredo · MG/GO/PR intactos** (estadual RSSSF=7;
rankings/entries inalterados). Apenas **SELECT** read-only + este documento. **T448b-2g = encerrado via
T448b-2h** (adendo 49). Escopo final do M1 = decisão do Thinker.
