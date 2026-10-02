# CLEANUP-TEST-ACCOUNTS.md — contas de teste em produção

## Auditoria (T395, 2026-09-02)
Produção tem **3 usuários** (Postgres Railway):

| Email | Status | Verdict |
|---|---|---|
| `endart.studios@gmail.com` | ACTIVE | **REAL** (operador) — manter |
| `audit.test.zz99@example.com` | ACTIVE | **TESTE** — desabilitar |
| `audit.ok.zz001@example.com` | ACTIVE | **TESTE** — desabilitar |

As 2 contas de teste foram criadas em testes de cadastro/login ("audit.*@example.com").

## Critério de identificação (padrão de email)
- Contém `test` / `teste` / domínio `@test.` (case-insensitive).

## Método de remoção — SOFT-DISABLE (reversível)
> O schema `users` **não tem coluna `deleted_at`** (colunas: id, email, name, passwordHash, status, emailVerified, lastLoginAt, createdAt, updatedAt). Por isso, em vez de `deleted_at = NOW()`, usa-se **`status = 'INACTIVE'`** (enum `UserStatus`), que desabilita a conta de forma reversível (pode voltar a ACTIVE).

- Script: `apps/api/scripts/cleanup-test-accounts.ts` (dry-run por padrão; `--apply` para aplicar).
- **NÃO executado em produção** — requer autorização explícita do Operador (a auditoria é read-only; o script fica pronto).

## Como rodar (após autorização)
```
pnpm --filter @almanaque/api exec tsx scripts/cleanup-test-accounts.ts            # lista
pnpm --filter @almanaque/api exec tsx scripts/cleanup-test-accounts.ts --apply    # desabilita
```

## Resultado esperado
- 2 contas de teste → `status = 'INACTIVE'` (não podem mais logar; dados preservados, reversível).
- Produção fica apenas com o usuário real (`endart.studios@gmail.com`).
- Risco de dados pessoais fictícios em ambiente real eliminado.


---

## Execução — T398 (2026-09-02) — APLICADO (autorização do Operador)

> Autorização: D-2026-09-02-operador-decisoes-finais ("exclua as contas de teste").
> Método: SOFT-DISABLE reversível (status = 'INACTIVE') — nenhum hard delete.

### Dry-run (antes)
O script (critério test/teste/@test.) encontrou 1 candidato:

| ID | Email | Status |
|---|---|---|
| ab86814c-da0a-4a07-9d0a-82ba64e97fa0 | audit.test.zz99@example.com | ACTIVE |

**Nota de escopo:** a 2ª conta de teste (audit.ok.zz001@example.com) NÃO é capturada pelo padrão do script
(não contém test/teste/@test.). O escopo autorizado pelo Operador (D-2026-09-02) cobre exatamente as 2 contas de
teste (IDs listados na decisão). Foi desabilitada por ID de forma dirigida, com guarda de identidade
(row.email confere com o esperado antes do UPDATE) — sem tocar em nenhuma outra linha.

### Ações executadas
1. cleanup-test-accounts.ts --apply → audit.test.zz99@example.com → INACTIVE
2. Desabilitação dirigida por ID autorizado → audit.ok.zz001@example.com → INACTIVE

### Estado final (verificado no banco de produção, Postgres Railway)

| ID | Email | Status |
|---|---|---|
| 5fe86d33-b314-4819-a7ef-0c8e19d6be03 | endart.studios@gmail.com | ACTIVE (único usuário real, intocado) |
| ab86814c-da0a-4a07-9d0a-82ba64e97fa0 | audit.test.zz99@example.com | INACTIVE |
| d2b1afee-5c60-41ae-9bf6-c94a3d363816 | audit.ok.zz001@example.com | INACTIVE |

- Total de usuários na produção: 3 (0 alterados além dos 2 autorizados; nenhum hard delete).
- Conclusão: 2 contas de teste inativas; produção com apenas o usuário real ativo.
