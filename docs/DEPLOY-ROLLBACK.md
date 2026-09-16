# DEPLOY-ROLLBACK.md — Runbook de rollback de produção (T443)

> Princípio (L1 do incidente T437): em outage, se o rollback documentado é mais
> rápido que o fix-forward, **executa-se o rollback primeiro** e diagnostica-se
> depois com produção viva.

## 1. Gate de cutover (prevenção)

O serviço da API tem **healthcheck gate** (`railway.json` →
`deploy.healthcheckPath = /api/v1/health`, timeout 120s): o tráfego só troca
para o novo deployment depois do healthcheck passar. Se o novo deployment
falhar (crash do entrypoint, migrate quebrado, app não sobe), o deployment
anterior **continua servindo** — a falha fica isolada no deployment novo.

Verificação de que o gate está ativo: `railway.json` na raiz contém
`deploy.healthcheckPath`.

## 2. Rollback por cenário

### 2.1 Falha causada por variável (ex.: credencial inválida — caso T437)
```bash
railway variables --service "Almanaque-dos-Clubes" \
  --set "DATABASE_URL_APP=<valor anterior conhecido-bom>"
# redeploy automático; verificar: railway deployment list
```

### 2.2 Falha causada por código (merge quebrado)
```bash
git revert <merge-commit> && git push
# CI de main faz o deploy da correção (deploy-vercel-frontend p/ web;
# Railway p/ API)
```

### 2.3 Rollback imediato de deployment (sem esperar CI)
1. `railway deployment list --service "Almanaque-dos-Clubes"` → anote o
   último deployment `SUCCESS` **anterior** ao problemático.
2. Reverter a causa (variável ou commit) e `railway redeploy` — o Railway
   reimplanta a última revisão saudável do código.

> Limite documentado (gap 9.3 parcial): o Railway não expõe via CLI o
> redeploy de um deployment ESPECÍFICO antigo; o caminho 2.3 é
> reverter-causa + redeploy. Com o healthcheck gate (1), o cenário que
> exigiria fallback manual ficou restrito a falhas pós-start.

## 3. Teste de fogo (evidência T443)

Procedimento executado em 2026-09-16: variável `DATABASE_URL_APP` apontada
para credencial inválida → novo deployment falha no healthcheck/entrypoint →
**health de produção permaneceu 200** (deployment anterior segue servindo) →
variável revertida → SUCCESS. Log completo em `docs/evidence/t443/`.
