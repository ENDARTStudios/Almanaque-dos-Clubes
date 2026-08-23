# RLS-POLICIES.md — Almanaque dos Clubes

> **STATUS GLOBAL: SPEC PENDENTE**
>
> Nenhuma política Row-Level Security está aplicada no banco neste momento.
> Este documento é especificação para implementação futura, ancorada no HEAD
> `7a50d99` (tarefa T347, fase F10-docs-reconciliacao).
>
> Implementação bloqueada por: T344 (migration RLS) e T345 (teste de
> isolamento A≠B), ambas pendentes de ambiente PostgreSQL de teste válido.

---

## 1. Contexto

- Banco: PostgreSQL (provider `postgresql` em `apps/api/prisma/schema.prisma`).
- RLS protege linhas no nível do banco, independente da camada de aplicação
  (RBAC em `rbac.service.ts` continua sendo a primeira linha).
- `FORCE ROW LEVEL SECURITY` **não** está ativado em nenhuma tabela.
- Em migrations Prisma, RLS é criada via SQL raw aditivo (migration dedicada),
  nunca via alteração destrutiva de tabela existente.

## 2. Princípios

1. **Aditivo e versionado:** toda política entra por migration nova e
   reversível (migration de rollback que remove a política).
2. **Zero regressão:** antes de ativar `FORCE`, validar com testes de
   isolamento (usuário A não lê dados de usuário B — T345).
3. **RBAC + RLS combinados:** RBAC autoriza a operação; RLS restringe as
   linhas visíveis ao contexto do usuário atual (`current_setting` ou JWT claim).
4. **App role vs owner:** definir role de aplicação (`app_user`) com privilégios
   mínimos; owner/migration role não usada em runtime.

## 3. Políticas propostas por tabela

Legenda: `self` = linha cujo `id`/`userId` pertence ao usuário autenticado.

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | self ou admin | auth (registro) | self (perfil) ou admin | admin |
| `sessions` | self | auth | self | self ou admin |
| `subscriptions` | self ou admin | sistema/billing | sistema/billing | sistema |
| `billings` | self ou admin | webhook/sistema | webhook/sistema | admin |
| `roles` / `permissions` / `user_roles` / `role_permissions` | admin | admin | admin | admin |
| `clubs`, `players`, `competitions`, `rankings`, `ranking_entries`, `matches`, `seasons`, `stadiums` | autenticado (leitura pública do catálogo) | role com `*:write`/`*:manage` | role com `*:write`/`*:manage` | role com `*:manage`/`*:delete` |
| `knowledge_graph` | autenticado | admin | admin | admin |
| `audit_logs` | admin (`audit_logs:read`) | aplicação (append) | **nunca** | **nunca** |

## 4. Roteiro mínimo de implementação (futuro, fora de T347)

1. **T344** — migration aditiva com `CREATE POLICY` por tabela + `ALTER TABLE ... FORCE ROW LEVEL SECURITY`, aplicada via `prisma migrate deploy` em ambiente de teste.
2. **T345** — teste de integração de isolamento: criar usuários A e B, verificar que A não acessa linhas de B (e vice-versa) em `users`, `sessions`, `subscriptions`, `billings`.
3. **Rollback** — migration espelhada que remove políticas e `FORCE` antes de qualquer rollback de schema.

## 5. Pendências conhecidas

| Item | Estado |
|---|---|
| Ambiente PostgreSQL de teste | Pendente do Operador (risco `ENV_MISMATCH`) |
| `prisma migrate deploy` das migrations pendentes | Pendente do Operador |
| T344 (migration RLS) | Bloqueada |
| T345 (teste A≠B) | Bloqueada |
| Decisão sobre role de aplicação (`app_user`) e mecanismo de contexto (`app.setting` vs JWT claim) | Aberta — registrar em DECISOES.md na implementação |
