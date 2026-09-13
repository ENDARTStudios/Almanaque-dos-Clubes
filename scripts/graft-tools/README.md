# scripts/graft-tools — comandos graft-first complementares (local, sem commit ainda)

> Status: desenvolvido e testado localmente. Não commitado por restrição
> operacional temporária (billing do GitHub indisponível — sem CI para validar
> o merge). Revisar e commitar quando o gate voltar.

## Origem

Ideias extraídas de [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)
(dead-code detection, diff impact mapping), **adaptadas aos dados que este repo
já tem**: `graft/.graph/wiring.json` (símbolos tree-sitter + arestas
calls/contains/imports/references) + `git`. Decisão consciente de **não
instalar** o codebase-memory-mcp: seria um segundo indexador redundante com o
`graft/` (que já é barato, offline e amarrado ao método). Em vez disso,
evoluímos o graft com o que faltava.

## Ferramentas

### `graft-dead.mjs` — dead code detection

```bash
node scripts/graft-tools/graft-dead.mjs [--limit N] [--json] [--scope <prefix/>]
```

Tiers (honestidade calibrada por verificação contra `grep` neste repo):

| Tier | Significado | Ação |
|---|---|---|
| DEAD | sem arestas + sem refs no próprio arquivo + sem chamada por nome | candidato real a remoção (ex.: `seed-womens-football#findCompetitionByQid`, `web/.../sanitize.ts`, `ProtectedRoute.tsx`) |
| METHOD-REF | invocado como `obj.nome()` ou `<Nome/>` em outro arquivo | quase sempre vivo (dispatch por interface/JSX que o grafo não resolve) |
| SAME-FILE-REF | nome reaparece no próprio arquivo | vivo via paths cegos do grafo (anotações de tipo, callbacks, default params) |
| SUSPECT | exportado, sem evidência in-repo | julgar: consumidor externo? |
| DEAD-FILES | todos os símbolos mortos + sem imports internos | revisar arquivo inteiro |

Limitações conhecidas (grafo estático, não da ferramenta):
cruzamentos de pacote via bare specifier são resolvidos textualmente só para
`@almanaque/*`; imports dinâmicos/`require` não são vistos; `declare module`
e `*.config.*` são excluídos por convenção.

### `graft-impact.mjs` — blast radius de um diff

```bash
node scripts/graft-tools/graft-impact.mjs [--staged] [--range A..B] [--depth N] [--json]
```

Mapeia arquivos/linhas alterados → símbolos → callers transitivos (BFS sobre
`calls`+`references` reversas). Validado: 1 linha de comentário em
`fetchWithRetry` → blast radius exato (4 consumers diretos + 3 mains em d2).

## Verificação executada (local, 2026-09-09)

- `graft-dead --json`: `{dead:1, suspect:206, sameFileRef:38, methodRef:124, deadFiles:3}`
- Cada achado DEAD/DEAD-FILES conferido via `grep` (nenhum falso positivo restante).
- `graft-impact` em mudança sintética revertida: blast radius exato.
- Nenhum teste automatizado ainda (TODO: asserções sobre o JSON em `tests/`).
