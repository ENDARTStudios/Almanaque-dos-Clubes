# AGENTS.md — Almanaque dos Clubes

> Instruções para agentes que trabalham neste repositório (Claude Code, DeepSeek Harness, Codex, Cursor, etc.).

## Como navegar o código — GRAFT-FIRST (important)

Este repo é indexado por **`graft/`** (um grafo de contexto: nós markdown + `graft/.graph/wiring.json` com
quem-chama-quem, por `file:line`). **Para qualquer tarefa** (entender como algo funciona, localizar onde está o
código, rastrear quem chama um símbolo ou o que uma mudança quebra, ou delimitar uma edição), **obtenha o contexto do
`graft` ANTES de fazer grep ou ler arquivos-fonte**:

```
graft ask "<pergunta>"        # mapa de símbolos/relevantes para a pergunta
graft grep <símbolo>          # onde está definido/usado
graft callers <função>        # quem chama
graft skeleton                # esqueleto da árvore
```
E leia o nó markdown apontado (`graft/**/*.md`) que cobre o trecho antes de abrir o arquivo.

- Consultar um nó custa poucos tokens; **reconstruir o entendimento lendo o código-fonte às cegas custa muito**.
- O grafo é barato (tree-sitter, offline, sem LLM/deep). O camada `deep` (resumos por símbolo) é opcional.
- **Determinístico:** recertas consultas fazem refresh do grafo contra a árvore atual (~3ms); junto código não-commitado.

## O grafo `graft/`
- **Cache local, gitignored e regenerável** (tipo `node_modules`). Rode `graft build` para recriar.
- `graft check` = sinal de frescor.
- O **wiring commitado** (o que fica no repo) é: `.claude/` (Claude Code: settings + hooks + skill) + `.mcp.json` (MCP) + `.ignore` + entrada `/graft/` no `.gitignore`.

## Stack / estrutura (rápido)
- Monorepo pnpm: `apps/api` (Fastify + Prisma + Postgres), `apps/web` (Next.js 16 + Tailwind), `apps/worker`, `packages/domain`.
- Migrações/schema em `apps/api/prisma` (Postgres canônico). Ingestão de dados via Wikidata em `apps/api/scripts/*`.
