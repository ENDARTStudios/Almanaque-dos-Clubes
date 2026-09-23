# MANUAL_DO_OPERADOR.md

> Guia operacional do Almanaque dos Clubes, atualizado para refletir a
> realidade de 2026-08-26 (fase F13-operador-delegacao).
> Versão: 2.0 | Fonte: commits, `DECISOES.md` e `docs/`.
> **Não contém segredos.** Para credenciais, use o secret manager.

## 1. Produção atual

| Frente | Onde | Como verificar |
|---|---|---|
| Frontend | Vercel — `https://almanaquedosclubes.com` | `curl -sI https://almanaquedosclubes.com` → `HTTP/1.1 200 OK` |
| API | Railway — serviço `Almanaque-dos-Clubes` — `https://api.almanaquedosclubes.com` | `curl -s https://api.almanaquedosclubes.com/api/v1/health` → `{"status":"ok",...}` |

- Root Directory do projeto Vercel = `apps/web` (corrigido em T351).
- `main` protegida: check `security-gate` obrigatório, `approvals=0` (repo de
  um único contribuidor), `enforce_admins`, sem force push/delete.
- Produção é **independente** do GitHub Actions: Vercel e Railway não caem se o
  CI estiver vermelho.

## 2. Fila de branches e ordem de merge

Tudo entra em `main` por **PR** (push direto bloqueado). Branches aguardando:

| Ordem | Branch | Conteúdo |
|---|---|---|
| — | `feat/ci-hardening` | T378 — gates gitleaks (bloqueante) + dependency-audit (não-bloqueante) |
| 1º | `feat/rls-sessions-policies` | T377 — policies RLS completas de `sessions` |
| 2º | `feat/rls-bulk-adoption` | T371 — adoção de `withRlsContext` nos fluxos de sessão |

A ordem **T377 → T371** é obrigatória (a adoção depende das policies). O merge
só acontece com `security-gate` verde (ver §3) ou por Caminho B explícito.

## 3. CI `security-gate` vermelho (o que fazer)

**Causa conhecida:** falha **pré-runner / account-level** — o GitHub Actions não
executa nem o primeiro step, em qualquer workflow (confirmado por oracle T375,
com zero beacons chegando à API própria). Não é problema de código.

Duas saídas (ambas documentadas em `DECISOES.md`):

- **Caminho A (recomendado):** abrir `Settings → Actions → Billing` e verificar
  minutos usados vs. incluídos e o estado do pagamento. Corrigir o billing
  reativa o CI e destrava todos os merges.
- **Caminho B (exceção governada):** relaxar temporariamente a proteção de
  `main`, mergear os PRs aprovados e restaurar a proteção em seguida — como em
  T376. Exige aprovação explícita do Operador e registro before/after.

## 4. RLS (Row-Level Security)

- **Status: FORCE RLS está OFF em produção.**
- Policies de `sessions` já **validadas em banco de teste** (T344 + T377):
  SELECT por dono/posse/SERVICE, INSERT por dono, UPDATE por dono/SERVICE,
  DELETE por SERVICE. Acesso cross-user é negado (deny-by-default).
- `users` **não** tem RLS (design deferido).
- **Enablement em produção exige, cumulativamente**
  (`D-2026-08-24-rls-enforcement-exige-app-user`):
  1. a aplicação conectar como role **não-superusuária** (`app_user`), com o
     segredo no secret manager;
  2. ciclo completo de auth **verde em staging** sob FORCE RLS;
  3. decisão explícita do Operador.

Não habilite FORCE RLS antes disso — quebraria o fluxo de auth (escritas sem
policy e busca pré-auth).

## 5. Segredos e rotação de token

- **Rotacionar o token GitHub antigo** (usado em handoffs anteriores; ainda
  ativo). A revogação é pendência do Operador — ação de UI que o token não faz
  sobre si mesmo.
- Regras: tokens nunca em código, commits ou documentação; sempre via ambiente
  ou secret manager; nunca ecoar tokens em logs.
- Gitleaks (bloqueante, via T378) passa a detectar segredos no CI quando o
  Actions voltar.

## 6. Resposta a incidentes

Siga `docs/INCIDENT_RESPONSE.md`. Pontos rápidos:

- Produção (Vercel/Railway) é independente do CI; um `security-gate` vermelho
  **não** derruba o site nem a API.
- Rollback de frontend = redeploy do commit anterior no Vercel; rollback de API
  = `railway up` do commit anterior (scripts em `scripts/deploy-*.sh`).

## 7. Pendências atuais do Operador

1. **Caminho A** — resolver Actions/billing para reativar o CI e destravar os
   merges das 3 branches (§2).
2. **Revogar o token GitHub antigo** (§5).
3. (Opcional) quando o CI voltar, decidir a virada do `dependency-audit` para
   gate bloqueante, após sanar os achados existentes.
4. (Futuro) decidir o enablement de FORCE RLS em produção conforme §4.
