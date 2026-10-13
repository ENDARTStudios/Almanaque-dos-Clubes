---
name: idempotent-seed
description: Escrever scripts de ingestão/seed seguros do acervo do Almanaque dos Clubes (Prisma + Postgres) — dedup por chave natural, zero overwrite, upsert idempotente, proveniência, re-run noop e guards de plausibilidade. Use ao criar/mudar qualquer script que grave dados (clubes, seleções, competições, temporadas, troféus) ou ao revisar um script que já gravou algo suspeito.
---

# Seeds idempotentes (a regra do projeto)

## Os 5 invariantes

1. **Dedup por chave NATURAL** — QID para entidades; `(competitionId, season)` para temporadas. Nunca por auto-id.
2. **Zero overwrite** — preencha só campos `NULL`; nunca sobrescreva o que já existe. Antes de atualizar, leia e compare.
3. **Anexar em vez de duplicar** — mesmo nome e SEM QID no acervo → **anexe o QID** ao registro existente
   (aconteceu com Vasco, Chapecoense, Remo, Paysandu, Sampaio Corrêa, Volta Redonda — todos já existiam sem QID).
4. **Proveniência obrigatória** — `importedFrom` (marcador próprio, ex. `wikidata-t515`) + `sourceUrl` (URL da fonte).
   Isso torna o lote **reversível por proveniência**: `DELETE FROM clubs WHERE "importedFrom"='wikidata-t515'`.
5. **Re-run = noop** é o gate de aceite: rode de novo e exija `criaria=0 · anexaria=0 · já-existiam=<total>`.
   Sem isso, o script não é idempotente.

## Prisma: as duas armadilhas que já gravaram errado

- **`undefined` ≠ `Prisma.DbNull`.** Em `update`, `undefined` significa **"não mexa neste campo"** — o valor antigo
  SOBREVIVE. Para ZERAR um campo (inclusive `Json`), passe **`Prisma.DbNull`**. Foi isso que manteve o artilheiro do
  Apertura no Clausura depois do "fix". Nullable Json só aceita `Prisma.DbNull`/`Prisma.JsonNull`, não `null`.
- **`String @id @default(uuid())` é TEXT no Postgres** (não `uuid`), e datas são **`TIMESTAMP(3)`** (não `TIMESTAMPTZ`).
  Migração que use `uuid`/`TIMESTAMPTZ` dá drift no CI (42804 / tipo divergente). O nome da tabela é o nome do model
  (`CompetitionSeason`), a não ser que haja `@@map`.
- **Tabela nova precisa de GRANT**: sem `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "X" TO app_user` em
  `apps/api/scripts/sql/create_app_user.sql` a rota dá **500** (`42501 permission denied`) mesmo com o dado certo.

## Ordenação e paginação (lição repetida 4×)

`LIMIT` sem `ORDER BY` **trunca de forma não-determinística** — uma entidade fica de fora (a seleção do Brasil sumiu de
uma consulta de 2.300). Sempre `ORDER BY` + paginação explícita (`LIMIT/OFFSET` ou cursor).

## Guards de plausibilidade do DADO (não do parse)

Valide o que entra, não só o que o parser leu:

- Número fora de faixa é sinal de coluna errada: gols `> 60` → provavelmente outra coluna ("Flamengo (33778)").
- Nome precisa "parecer" a entidade: artilheiro tem formato de pessoa; clube tem ≥3 letras.
- **Não invente para preencher**: se a fonte não tem (artilharia, vice de copa com formato esquisito), grave `null` e
  **declare o gap** — o projeto prefere lacuna honesta a dado fabricado (critério D-2026-10-10).
- Texto de infobox pode estar quebrado NA FONTE (a Prima Liga 2021-22 renderiza `{{Futebol B-SAD}}` literal): mapeie
  com um **alias documentado** para o clube certo, ou deixe sem clube — nunca invente um nome.

## Documentação que o script precisa carregar

- Um comentário no topo com a **origem** (artigo/Wikidata), **licença** (CC0 / CC-BY-SA) e **como reverter**.
- O `--apply` (dry-run é o default) e, quando couber, `--wave=<lote>` para reexecutar um lote curado sem tocar nos outros.
