# AGENTS.md — Almanaque dos Clubes

> Instruções completas para agentes: **[docs/AGENTS.md](docs/AGENTS.md)**.
> Este ponteiro permanece na raiz porque convenções de agentes (Claude Code, Codex,
> Cursor, etc.) só carregam instruções do `AGENTS.md` da raiz do repositório.

Resumo das regras essenciais (valência completa em `docs/AGENTS.md`):

- **Graft-first**: consulte `graft ask` / `graft grep` / `graft callers` antes de grep
  ou leitura de código-fonte; leia o nó markdown em `graft/**/*.md` que cobre o trecho.
- **Terminal & CLI first**: deploy (Railway), PRs (`gh`) e ingestão são autônomos do
  agente; o Operador é dono exclusivo de identidade, dinheiro, domínio e credenciais.
- **Stack**: monorepo pnpm — `apps/api` (Fastify + Prisma + Postgres), `apps/web`
  (Next.js), `apps/worker`, `packages/domain`. Dockerfile da API: `apps/api/Dockerfile`.
- Migrações/schema em `apps/api/prisma` (Postgres canônico). Infra local em `infra/`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
