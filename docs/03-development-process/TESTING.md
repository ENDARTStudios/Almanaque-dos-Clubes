# TESTING.md — Estratégia de testes

## Camadas

| Camada | Ferramenta | Onde | Nota |
|---|---|---|---|
| Unit (funções puras) | vitest | `apps/api/tests/unit/` | sem rede/banco; selects/reps/shuffles provam determinismo |
| Unit (contrato de fonte) | vitest | `apps/web/tests/unit/` | ex.: plano-features (catálogo da oferta) lê o page.tsx e rejeita hardcode |
| Integração (Postgres real) | vitest | `apps/api/tests/integration/` | `buildApp()` + fixtures; CI roda com Postgres + RLS + app_user |
| E2E (browser) | Playwright | `apps/web/tests/e2e/` | produção ou stack local completa; sem mock onde é fluxo de dado |

## Regras

1. **R2 — fixtures escopadas**: nomes/QIDs/ANOS únicos por arquivo + limpeza no `afterAll` +
   contagens escopadas (contagem global em banco compartilhado é corrida). Fixture que contamine
   estado global de vitrine usa ano BAIXO (ex.: 1901 — nunca desbancar o campeão vigente do T441).
2. **Skip silencioso proibido**: `TEST_REQUIRE_DB=true` no CI transforma banco ausente em FALHA
   (D-2026-09-18). Sem DB local → skip honesto com `dbOk` guard.
3. **Leitura congelada testada com mock**: o que lê estado GLOBAL de vitrine (ex.: /champions) é
   testado com `vi.mock` + `vi.hoisted` — gravar fixture em hierarquia viva contamina o T441.
4. **Mock de módulo com efeito de import**: serviços que instanciam PrismaClient no import
   precisam de `vi.mock` do módulo de config.
5. **E2E produção é a prova de vitrine**: regra do cookie real, sem mock — os cards da vitrine,
   a oferta e o consentimento são verificados ao vivo pós-deploy.

## Espelho local de CI (54330)

`almanaque-postgis-test` (db `almanaque_test`): create_postgis → db push → rls_* → create_app_user
→ rls_users (ordem do CI). Rodar a suíte:

```bash
DATABASE_URL="postgresql://almanaque:<pw>@localhost:54330/almanaque_test" \
TEST_REQUIRE_DB=true npx vitest run
```

## Controle main-limpo

Antes de reportar qualquer falha local: rodar a MESMA suíte no main limpo (`git stash -u` →
main → rodar → restaurar). As únicas falhas locais pré-existentes conhecidas são as 4 RLS-env
(rls-sessions, rls-sessions-policies, favorites, rls-users) — ambiente, não código. Qualquer
outra falha é da task.

## Cobertura

Thresholds atuais (api): statements 30 / branches 20 / functions 25 / lines 30 — piso, não meta.
Módulos tocados por uma task devem fechar ≥ 80% de linhas no arquivo (ex.: champions.service,
cache.ts, won-edges.service).
