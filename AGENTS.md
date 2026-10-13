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
- **Workflows operacionais (ZCode)**: skills e subagentes deste projeto vivem em
  **`.zcode/skills/`** e **`.zcode/agents/`** (escopo do workspace, carregados sob demanda):
  `prod-railway` (produção via container), `wikidata-entity` (QID/validação),
  `wiki-table-parser` (parser de tabelas), `release-loop` (PR→deploy→produção),
  `idempotent-seed` (seeds seguros); agentes `fonte-scout`, `prod-runner`, `gate-verifier`.
  A **fonte canônica é o plugin** `plugins/almanaque-dev/` — edite lá e rode
  `bash plugins/scripts/sync-to-workspace.sh`. Ver [docs/PLUGIN-ALMANAQUE-DEV.md](docs/PLUGIN-ALMANAQUE-DEV.md).
- **UI/UX (plugin `almanaque-design`)**: design system, padrões de hero/landing, copy de
  conversão (gancho→promessa→prova→CTA), acessibilidade WCAG 2.2 AA e QA visual com
  Playwright: skills em `plugins/almanaque-design/skills/` (espelhadas em **`.dsh/skills/`**,
  o diretório que o DSH varre) e papéis de subagente em `plugins/almanaque-design/agents/`
  (`design-critic`, `a11y-auditor`, `ux-copywriter`, `visual-qa-auditor`, em `.zcode/agents/`
  e `.dsh/agents/`). O mesmo `plugins/scripts/sync-to-workspace.sh` sincroniza os dois
  plugins. Ver [docs/PLUGIN-ALMANAQUE-DESIGN.md](docs/PLUGIN-ALMANAQUE-DESIGN.md).
  **Antes de mexer em qualquer tela, carregue a skill `design-system-almanaque`.**
- **Régua de animação (T533)**: antes de escrever ou revisar movimento, carregue `motion-craft`
  (curvas, durações, física, qual dos três motores usar) e `motion-review` (dez padrões não
  negociáveis). O portão objetivo é `pnpm run ui:audit:ci` — falha se houver `transition-all`,
  `scale(0)`, `ease-in`, animação de layout, import de `framer-motion`, GSAP sem
  `prefers-reduced-motion` ou texto abaixo do piso de contraste. Detalhes dos três motores:
  **GSAP** é dono dos reveals (`useGsap.ts`), **`motion/react`** (`motion@13`) é o motor de
  spring/gesto/exit, e `animejs` está instalado **sem uso** (dívida). Curadoria das ferramentas
  avaliadas em [docs/UI-UX-TOOLKIT.md](docs/UI-UX-TOOLKIT.md).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
