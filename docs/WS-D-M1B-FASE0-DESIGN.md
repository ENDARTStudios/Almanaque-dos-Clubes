# WS-D M1b — FASE 0 (design read-only): Expansão de acervo via Wikidata

> **Status:** PROPOSTA. Nada implementado/gravado. Medição read-only (2026-09-28).
> Pergunta central: _“Conseguimos +≥1.000 clubes e ≥50 competições com proveniência CC0, dedupe por
> QID, cobertura geográfica útil e risco controlado?”_ → **Sim** (medido adiante).

## 1. Estado vivo medido

**GitHub:** `main` = `b7eedaf` (pós `#248`); sem PR/branch M1b pré-existente; CI verde real.
**API/site:** `health`/`rankings`/`champions`/agregado/`metodologia` = **200**.

**DB (read-only):**

| métrica               | valor                                               |
| --------------------- | --------------------------------------------------- |
| clubes ativos         | **3.871** (com QID **3.871 / 100%**; sem QID **0**) |
| clubes com coordenada | **2.790** · com `city` **2.625**                    |
| competições ativas    | **1.561** (com QID **1.561 / 100%**; sem QID **0**) |
| rankings / entries    | **10 / 256**                                        |
| hash entries EN       | **`d2b117aa…`** (inalterado)                        |
| estadual RSSSF ativo  | **7**                                               |

## 2. Inventário por país (clubes ativos)

| país |                                                                                                                                                     clubes ativos |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| BR   | 611 · GB 324 · DE 305 · SE 294 · PT 212 · ES 143 · IT 106 · FR 85 · US 73 · BE 61 · CH 53 · KR 50 · RO 49 · HU 48 · TR 44 · IQ 43 · BY 41 · CZ 39 · MX 39 · NL 36 |

**QID por país:** 100% em todos (0 sem QID). **=** o valor do M1b **não** é preencher QID (nada falta),
mas **EXPANDIR** o acervo (adicionar entidades novas por QID).

## 3. Amostragem Wikidata (read-only)

- **Clubes-amostra** (Flamengo `Q17479`, Palmeiras `Q80964`, etc.): `P31=Q476028` presente; **`P625` direto raro** (só ~2%); **`P131` quase ausente**; **`P115` (estádio) ≈43%**, **`P159` (sede) ≈61%** → coordenadas vêm do **estádio/sede** (M1a-2 já usa isso).
- **Falsos positivos a excluir:** subclasses (`?item wdt:P31/wdt:P279* wd:Q476028` inclui feminino, B/reserva, juvenil, futsal/beach, extintos) → filtros explícitos abaixo.

## 4. Candidatos por país (Wikidata, ativos, `P31=Q476028`)

SPARQL `query.wikidata.org` (`FILTER NOT EXISTS { ?club wdt:P576 ?d }`):

| país |                     candidatos ativos (Wikidata) | nosso acervo | novo potencial |
| ---- | -----------------------------------------------: | -----------: | -------------: |
| DE   |                                            1.775 |          305 |         ~1.470 |
| BR   |                                            1.661 |          611 |         ~1.050 |
| FR   |                                            1.609 |           85 |         ~1.524 |
| ES   |                                            1.557 |          143 |         ~1.414 |
| IT   |                                            1.065 |          106 |           ~959 |
| US   |                                            1.059 |           73 |           ~986 |
| BE   |                                              997 |           61 |           ~936 |
| SE   |                                              946 |          294 |           ~652 |
| PT   |                                              604 |          212 |           ~392 |
| PL   | 522 · NL 366 · DK 317 · HU 255 · CH 232 · FI 226 |       ~30–53 |       ~150–500 |

**Conclusão:** só DE+FR+ES já entregam **>4.000** candidatos → **≥1.000 é trivial**. **≥20 países** garantido.

## 5. Competições candidatas

- Fonte: `P31` de competição de futebol por país (`P17`) / confederação; **não inventar hierarquia** (`level`) — gravar só o evidenciado; `gender` só com evidência.
- **Meta ≥50** é conservadora (há centenas: ligas nacionais + copas por país).
- **Exclusões:** feminina/juvenil (quando evidenciado) no round inicial; amistoso; já existente por QID.

## 6. Proposta de escopo (recomendada)

**M1b-conservadora + filtro geo opcional:**

- clubes **ativos** (`P576` ausente), `P31=Q476028` **direto** (subclasses depois, com whitelist);
- **excluir** feminino/B/reserva/juvenil/futsal/beach quando **evidenciado**; sem evidência → tratar `gender=unknown` e **excluir** no round inicial (conservador);
- top ~20 países por yield (**DE, BR, FR, ES, IT, US, BE, SE, PT, PL, NL, DK, HU, CH, FI, …**);
- **city/coords quando disponíveis** (P625 → P159 → P115), declarando gap quando ausente;
- metas: **≥1.000 clubes**, **≥50 competições**, **≥20 países**.

**Opções comparadas:** M1b-geografia (exigir coords) · M1b-histórica (extintos `DISSOLVED`) · M1b-mista — **adiadas**; recomenda-se **conservadora** primeiro (ativo + QID + gap declarado).

## 7. Política de dedupe/conflito

1. **Identidade = QID.** 2. QID já em clube ativo → **skip**. 3. QID em clube **soft-deleted** → **skip, não reativar** (registrar). 4. QID novo com `name+country` de clube ativo sem QID → **revisão humana** (hoje: 0 casos). 5. Homônimo legítimo (QID distinto, geo distinta) → **coexistir**, sem renomear/fundir. 6. Competição com QID novo e nome igual a ativa → **não criar, revisar**. 7. Nome divergente suspeito → **human pair** (como T448b-2i), **nunca fuzzy**.

## 8. Plano de implementação futura

- Script `expand-wikidata.ts` (**DRY default**; `--apply --allow-production`); **chunks de 100**, transação `Serializable`; SPARQL por país (User-Agent identificado, backoff).
- **Proveniência:** `importedFrom='wikidata-expansion-v1'`, `source='wikidata'`, `license='CC0'`, `sourceUrl=https://www.wikidata.org/wiki/<QID>`, `retrievedAt` **estático por batch** (nunca `now()`).
- Write: clubes (name/fullName/country/city/state/lat/lng/foundedYear quando confiável/status ACTIVE); competições (name/type/hierarchy **só se evidenciado**).
- **Manifest** (qids/ids/batchId/retrievedAt) + **rollback lógico** por `importedFrom` (soft-delete dos criados **sem referências**; nunca hard delete; nunca reativar pré-existentes).
- Gate: dry-run → apply chunk a chunk (pausa) → SQL gate → cache cirúrgico → API/UI(mapa) smoke.
- **Amostragem manual de 5%** antes do apply.

## 9. Plano de testes

Unit (filtros de inclusão/exclusão, dedupe por QID, validação de pack, determinismo); integração Postgres (cria por QID idempotente; skip de QID ocupado/soft-deleted; **estaduais/rankings intactos**); regressão; amostragem 5%.

## 10. Riscos e mitigações

| risco                      | mitigação                                                               |
| -------------------------- | ----------------------------------------------------------------------- |
| subclasses indesejadas     | `P31` direto + whitelist; amostragem 5%                                 |
| feminino/juvenil/reserva   | exclusão por evidência; `gender=unknown` excluído no 1º round           |
| extintos poluindo "ativos" | `P576` ausente (round inicial)                                          |
| homônimos/duplicatas       | QID como chave; human pair p/ divergência                               |
| rate limit                 | backoff + UA + pausa entre lotes                                        |
| coords ausentes (~gap)     | gap declarado; clube existe sem pino (não plotar falso)                 |
| rollback difícil           | chunks 100 + manifest + soft-delete por `importedFrom`                  |
| legal                      | Wikidata **CC0**; **RSSSF continua exigindo atribuição** (não misturar) |

## 11. Impacto em mapa/produto

- Nem todo novo clube terá coordenada (~meta: 60–80% via P159/P115). **Não plotar ponto falso**; listar por país/estado; mapa só com `lat/lng` válidas.
- Avaliar **M1a-3** (geocodificação alternativa) **antes/depois** conforme yield real.

## 12. Confirmações desta FASE 0

**Zero escrita · zero migration · zero produção · zero criação de entidades · zero novo ranking · zero
mudança de score · MG/GO/PR intactos** (entries EN `d2b117aa…`; estadual=7) · **zero segredo**.
Somente SELECT/SPARQL read-only + este documento. **Escopo final = decisão do Thinker.**
