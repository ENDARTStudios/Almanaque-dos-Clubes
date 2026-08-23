# CI-ROOT-CAUSE.md — Diagnóstico do `security-gate` vermelho

> Tarefa T373, fase F09-ci-cd-deploy. Forense estática + reprodução local.
> Evidência com comandos e saídas reais. Nenhum gate removido.

## 1. Hipóteses testadas (todas com saída real)

| # | Hipótese | Verificação | Resultado |
|---|---|---|---|
| a | `uses: ./.github/actions/...` inexistente | `ls .github` → só `workflows/ci.yml`, `workflows/dast.yml`, `dependabot.yml` | ❌ refutada (não há `actions/` local) |
| b | `pnpm/action-setup` sem `version`/`packageManager` | `ci.yml:34` tem `version: 11`; `package.json:6` tem `packageManager: pnpm@11.13.1` | ❌ refutada |
| c | YAML inválido | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` → `YAML_OK` | ❌ refutada |
| d | ação com versão removida | `uses:` são `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` (todas ativas) | ❌ refutada |
| e | `pnpm-lock.yaml` não versionado | `git ls-files pnpm-lock.yaml` → presente; `.gitignore` não o ignora | ❌ refutada |
| f | `pnpm install --frozen-lockfile` quebrado | local: `Already up to date` (148ms, exit 0) | ❌ refutada |

## 2. Causa-raiz reproduzida

`pnpm test:unit --coverage` (o step "Unit & Integration Tests" do `security-gate`)
falha porque `apps/api/tests/integration/routes.test.ts` depende de **Redis**
(rate-limit em `auth/rate-limit.service.ts` e cache em `services/cache.ts`), mas
o job `security-gate` provisionava **apenas o serviço `postgres`**.

Saída local (Redis indisponível):

```
FAIL  tests/integration/routes.test.ts > GET /api/v1/clubs > retorna lista paginada
    expected 200 to be 500   (ECONNREFUSED 127.0.0.1:6379)
FAIL  tests/integration/routes.test.ts > Auth endpoints > POST /login ... 401
    expected 401 to be 500   (ECONNREFUSED 127.0.0.1:6379)
```

## 3. Correção mínima

Adicionado o serviço `redis` ao job `security-gate` (imagem `redis:7-alpine`,
porta 6379, healthcheck `redis-cli ping`), espelhando o `docker-compose.yml`.

- Nenhum gate removido ou enfraquecido (lint/typecheck/test/audit preservados).
- Nenhum secret novo.

## 4. Observações (fora do escopo desta correção)

1. O `ci.yml` real NÃO implementa os jobs `protocol-integrity`, `gitleaks` e
   `dependency-audit` descritos em `PROMPT_MESTRE_AUTONOMO.md` (linhas 920-940).
   Isso é um **fortalecimento pendente**, separado — adicionar depois do
   destravamento.
2. A falha "3-6s" relatada no screenshot não foi reproduzida: localmente o
   `security-gate` falha no step de teste (~17s), por falta de Redis. A causa
   desta correção é a falha reproduzível; se houver ainda uma falha anterior
   de setup (3-6s), ela só será visível no log do run após o push do fix.
3. Verificação local do YAML após a correção: `python3 -c "import yaml;
   yaml.safe_load(open('.github/workflows/ci.yml'))"`.
