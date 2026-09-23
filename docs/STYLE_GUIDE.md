# STYLE_GUIDE.md — Guia de estilo de código

## Geral

- TypeScript estrito, ESM (`import ... from './x.js'`), monorepo pnpm.
- Prettier: single quotes, trailing comma all, printWidth 100, arrowParens always, endOfLine auto.
- ESLint raiz cobre `apps/api`, `apps/worker`, `packages` (a web tem config própria — NÃO cruzar
  contexts rodando eslint raiz sobre arquivos da web).
- Nomes: arquivos em kebab-case (ou convecção do módulo), funções puras exportadas junto ao
  módulo de domínio, fixtures com sufixo da task (`T448`).

## Padrões consolidados desta base

| Padrão | Referência |
|---|---|
| Função PURA primeiro (query builder, parser, dedup, comparator) + rede/banco injetáveis para teste | conectores ETL, `selectRepresentatives` |
| Zod em toda fronteira (linha SPARQL, payload de API, resposta de terceiro) | todos os conectores |
| DRY-RUN/--apply em todo script de ingestão; spot-check independente que re-busca a FONTE | `src/scripts/` |
| Proveniência obrigatória: `{dataSource, sourceUrl, license, importedAt}` (KG: dentro de metadata) | womens/won-edges connectors |
| `vi.hoisted` + `vi.mock` para módulos com efeito de import (PrismaClient no boot) | tests/unit |
| `collapse`/`dedup` como funções puras exportadas (testáveis sem rede) | won-edges.service |
| Comentário de cabeçalho: T-task, decisão, e a LIÇÃO que motivou o arquivo | todos os novos |
| Regex/strings locais sem locale (`cmpAsc` por bytes, nunca `localeCompare`) | comparadores |
| Erros: `preserve-caught-error` (cause anexada); sem catch silencioso em write/invalidation | RULES.md |

## Anti-padrões que esta base já baniu

- src importando de scripts/ (quebra o rootDir inferido no build Docker — #160/#161).
- Label service dentro de query SPARQL janelada (504); VALUES GET > 4k chars (431).
- UNION de propriedades de data sem colapso de ano (double-count cross-year — T448).
- Catch silencioso em write/invalidation (3 instâncias nomeadas — D-2026-09-22-cache-fail-loud).
- `break` faltante/duplicado em switch de worker (lint pega, mas review também).

## Antes do PR

`tsc` (api+web) 0 · eslint 0 erro · prettier --check · suíte no banco de teste · e2e de vitrine se
tocou frontend. Checklist completo: [docs/CODE_REVIEW.md](./CODE_REVIEW.md).
