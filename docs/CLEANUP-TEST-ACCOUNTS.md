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
