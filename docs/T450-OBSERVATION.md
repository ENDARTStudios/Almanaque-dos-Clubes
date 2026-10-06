# T450 — Observação do seeding feminino + enriquecimento wave 2 (10-06)

Coleta read-only em produção (SQL via container, owner) + execução do enrich T471
com a flag nova `--gender=women`.

## Fase 1 — Inventário (após o apply de 10-06)

| Critério | Resultado | Veredito |
|---|---|---|
| A. Duplicatas por QID | **0** | ✅ |
| B. Coordenadas | **331/331 sem coords** (o seed T424 não traz P625) | gap estrutural → wave 2 |
| C. Proveniência | 100% `importedFrom='wikidata'` + `gender='women'` na coluna T450 (desvio do 'wikidata-women' do despacho declarado: o marker de gênero é a COLUNA, não o sufixo de proveniência — queryable por filtro) | ✅ |
| D. Órfãos (clubes sem aresta) | **328** — estrutural: o seed só cria vínculos P54 jogador↔clube (19 edges), a maioria dos clubes não tem jogadoras no lote | esperado, não é bug |
| E. Jogadoras T424 sem P54 | **86 de 104** | gap estrutural |
| Amostra de curadoria | FVPR El Olivo · FC Kansas City · Maccabi Holon · LP Super Sport Sofia · Lincoln Ladies · ŽNK Viktorija — **clubes reais** | ✅ |

**Decisão Fase 1: qualidade ACEITÁVEL** — 0 duplicatas, proveniência 100%, nomes reais.
Gaps (coords, órfãos) são estruturais da fonte, declarados para wave 3.

## Fase 2a — T471 wave 2 (coords femininas)

`enrich-clubs-geo-wikidata` ganhou `--gender=women` (escopo só clubes femininos).

- **Dry-run** (limit 40): 40 no escopo, **3 clubes com coords via P115 (venue)** + 3 estádios novos;
- **Apply**: `coordenadas preenchidas: 3` · stadiums criados 3 (gap PostGIS declarado — scalar only);
- **Re-run noop**: coords=0 · stadiums 0 novos · 3 já existentes (zero overwrite intacto);
- 37 não resolvidos = seleções nacionais sem venue no Wikidata (gap da fonte).

## Fase 2b — clubes BR femininos via P118 (gap estrutural da fonte)

- **QIDs do despacho ERRADOS** (lição T424 repetida): Q2891107=Anatomography · Q2891108=Enrique
  Gil Robles (pessoa) · Q65088888=ferrovia finlandesa · Q65088889=construtora.
- QIDs reais verificados via wbsearchentities: **Q5028272** (Brasileirão A1) · **Q28679927**
  (A2) · **Q5028303** (Paulista) · **Q5028277** (Carioca).
- **Descoberta estrutural**: as 4 ligas são **stubs no Wikidata** (zero claims P1923/P1346/
  P710) e NENHUM clube aponta P118 para elas → a query retorna 0. Buscas diretas por clubes
  BR femininos (Kindermann, Santos feminino, Corinthians feminino) → **0 entidades no WD**.
- **Consequência**: o seed `seed-brazilian-women-football.ts` foi implementado e testado
  (unit 4/4 com fetch mockado), mas o gate de produção dá "NADA A SEMEAR" — criar itens no
  Wikidata é edição em serviço de terceiros (fora de escopo/autorização). Re-executar quando
  o WD preencher as claims (script pronto, onda 3).

## Recomendações wave 3

1. Coordenadas: ampliar o enrich das mulheres (fontes: P625 direto nos itens; os 331 têm
   QIDs reais — 3 resolvidos via P115 na onda 2);
2. BR: monitorar o preenchimento do WD (ou avaliar fonte aprovada alternativa com o Operador);
3. Cura: separar seleções nacionais de clubes (classe no WD permite — onda de qualidade).
