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
