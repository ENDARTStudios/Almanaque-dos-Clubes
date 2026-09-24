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

### Project Automation Guidelines

### Strict Rule: Terminal & CLI First Policy

You (the AI Agent) have complete command-line and terminal access to this environment. You must maximize your autonomy using CLIs and never delegate web-based infrastructure tasks to the human operator.

### 1. Prohibited Requests

* **NEVER** ask the operator to manually open a browser or log into dashboards (such as Vercel, Railway, Supabase, Netlify, AWS, or GitHub web).
* **NEVER** ask the operator to manually create projects, trigger deployments, set environment variables, or check build logs inside a web user interface.

### 2. Autonomous Execution Flow

* **CLI Over Web UI:** If an infrastructure action is needed, immediately use the respective terminal tool (e.g., vercel, railway, gh).
* **Session Verification:** Before asking for credentials, autonomously check if a session exists using commands like vercel whoami, railway whoami, or gh auth status.
* **Deployments & Variables:** Always use execution commands (e.g., vercel deploy, railway up) and pipe/inject environment variables directly via the CLI tool tools instead of requesting manual copy-pasting.

### 3. Allowed Exceptions

You may only prompt the human operator regarding external platforms if:

* The CLI tool explicitly requires a browser-based OAuth validation link that your environment cannot automatically bypass.
* There is a terminal-blocking account restriction (e.g., payment failure or missing team permissions) that cannot be handled programmatically.

#### Notas deste projeto (âncora em decisão registrada)

Estas diretrizes formalizam o que o projeto já validou em produção
(`D-2026-09-22-correcao-premissa-cli-ingestao-autonoma` no DECISOES.md): ingestão de fonte aberta
e deploy da API são autônomos do agente — CLI Railway instalada/autenticada (`railway up`,
`railway ssh`, `railway deployment list`, fingerprints `RAILWAY_GIT_COMMIT_SHA`), `gh` para PRs,
Vercel automática no merge. O Operador permanece dono exclusivo de identidade, dinheiro, domínio
e credenciais (rolar escalações desses temas NÃO é "pedir tarefa web" — é roteamento de dono).
Armadilha local conhecida: `GITHUB_TOKEN` env pode estar expirado e sobrescrever o login do
keyring — usar `env -u GITHUB_TOKEN gh …` antes de concluir que a auth falhou.
