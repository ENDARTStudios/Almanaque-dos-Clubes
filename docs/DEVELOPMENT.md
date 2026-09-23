# DEVELOPMENT.md — Fluxo de desenvolvimento

## Navegação graft-first (obrigatório)

O repo é indexado pelo grafo `graft/`. Antes de grep/leitura: `graft ask "<pergunta>"`,
`graft grep <símbolo>`, `graft callers <fn>`. `graft build` recria o cache (local, gitignored).
Ler código às cegas custa ~10× tokens e perde contexto de quem-chama-quem.

## Ciclo de uma tarefa (T-series)

1. **Dispatch** do Thinker com gates de aceite explícitos.
2. **FASE 0 (R3)**: medir o estado em produção/fonte ANTES de codar. Nunca assumir a partir de
   documento/snapshot/memória — esta regra pegou defeitos reais em 6 rounds seguidos.
3. **Branch** a partir da main atualizada: `feat/<tarefa>-<slug>`. Commit nasce NA branch.
4. **Implementação** com testes junto (unit puro + integração Postgres + e2e quando vitrine).
5. **Gates locais**: `tsc` (api+web) 0 · eslint 0 erro · prettier · suíte completa no banco de
   teste (54330) · controle main-limpo (as únicas falhas locais permitidas são as 4 RLS-env
   pré-existentes: rls-sessions, rls-sessions-policies, favorites, rls-users).
6. **PR** → CI (Security Gate + migration-drift + gitleaks) → squash merge.
7. **Deploy + fingerprint**: API auto-deploya no merge; confirmar
   `RAILWAY_GIT_COMMIT_SHA` no container + handler/rota nova. Web = Vercel automático.
8. **Live verify** contra produção (regra do cookie real, sem mock) + evidência no
   [REPORT §22](./RECONCILIATION-REPORT.md).

## Checkpoint de contexto

Contexto baixo no meio de uma tarefa → commit WIP + PR draft + HANDOFF + parar
(D-2026-09-18-checkpoint-de-contexto). Nunca terminar a sessão com trabalho só no chat.

## Convenções

- Mensagens de commit/PR: prefixo do domínio (`feat(ws-d):`, `fix(champions):`, `docs:`) + ID da
  task + o quê. Squash merge com `(#N)`.
- Todo arquivo novo entra na branch do PR (nunca main local).
- Testes: fixtures com nomes/QIDs/ANOS únicos + limpeza no afterAll + contagens escopadas
  ([docs/TESTING.md](./TESTING.md)).
- Dado externo (Wikidata etc.): Zod em toda linha, proveniência obrigatória, DRY-RUN/--apply.

## Documentação

Toda task reconcilia docs no MESMO PR (DECISOES + PLANO_MESTRE + REPORT §22). Snapshot que mente
é pior que ausência (R3): re-ancore números em produção antes de editar.
