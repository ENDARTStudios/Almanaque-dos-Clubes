# Branch Protection — Almanaque dos Clubes

> Referência determinística para o Operador aplicar proteção na branch `main`.
> Tarefa T352 (fase F13). Registro: a tentativa automática via API retornou
> **401 Unauthorized** com o `GITHUB_TOKEN` do ambiente (inválido/expirado) —
> ação manual necessária.

## Objetivo

Garantir que `main` só aceite merge com CI verde, sem force push e com PR
aprovado (gate do PROTOCOLO_MESTRE.md).

## Via interface web (GitHub)

1. `Settings` → `Branches` → `Add branch protection rule`.
2. Branch name pattern: `main`.
3. Marcar:
   - **Require a pull request before merging** → `Require approvals` = 1.
   - **Require status checks to pass before merging** → adicionar contexto `security-gate`; marcar **Require branches to be up to date before merging** (strict).
   - **Do not allow bypassing the above settings** (enforce admins).
   - Desmarcar **Allow force pushes** e **Allow deletions**.

## Via API (curl)

```bash
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/ENDARTStudios/Almanaque-dos-Clubes/branches/main/protection \
  -d '{
    "required_status_checks": {"strict": true, "contexts": ["security-gate"]},
    "enforce_admins": true,
    "required_pull_request_reviews": {"required_approving_review_count": 1},
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

> Requisitos do token: escopo `repo` (ou permissão de administração do repo) e
> acesso ao repositório `ENDARTStudios/Almanaque-dos-Clubes`.
>
> Contexto de status check: o job de CI no `.github/workflows/ci.yml` chama-se
> `security-gate` (roda em `push` e `pull_request`). Os jobs de deploy
> (`deploy-vercel-frontend`, `deploy-docker-api`) só rodam em `push` de `main`
> e NÃO devem ser exigidos como check de PR.

## Verificação

```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/ENDARTStudios/Almanaque-dos-Clubes/branches/main/protection
```
