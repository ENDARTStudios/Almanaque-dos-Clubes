# RLS-POLICIES.md — Almanaque dos Clubes

> **STATUS: `sessions` APLICADA-TESTE (T344, 2026-08-23); demais tabelas SPEC PENDENTE**
>
> A migration `20260824_rls_sessions` aplicou `ENABLE`+`FORCE ROW LEVEL
> SECURITY` em `sessions` com policy owner-only de leitura e exceção `SERVICE`,
> validada **apenas em banco de teste** (Postgres do docker-compose). Deploy em
> produção **adiado** até auditoria do mecanismo de contexto da aplicação
> (`app.current_user_id`/`app.current_user_role`).

---

## 1. Contexto

- Banco: PostgreSQL (provider `postgresql` em `apps/api/prisma/schema.prisma`).
- RLS protege linhas no nível do banco, independente da camada de aplicação
  (RBAC em `rbac.service.ts` continua sendo a primeira linha).
- `FORCE ROW LEVEL SECURITY` está ativado **apenas** em `sessions` (teste).
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

## 3. Políticas por tabela

Legenda: `self` = linha cujo `id`/`userId` pertence ao usuário autenticado.

### `sessions` — APLICADA-TESTE (migration `20260824_rls_sessions`)

| Policy | Comando | Condição |
|---|---|---|
| `sessions_owner_select` | SELECT | `"userId" = current_setting('app.current_user_id', true)` |
| `sessions_service_select` | SELECT | `current_setting('app.current_user_role', true) = 'SERVICE'` |

Prova A≠B (psql, role `app_user` não-superusuário):

| Cenário | Resultado |
|---|---|
| `app.current_user_id` = A | vê apenas `rlstest-token-a` (B invisível) |
| `app.current_user_role` = SERVICE | vê 2 (ambas) |
| sem contexto | 0 (deny-by-default) |

> Gap registrado: o mecanismo `rls-context.ts` (que definiria
> `app.current_user_id`/`app.current_user_role` por request na aplicação)
> **não existe** no repositório. Sem ele, ativar FORCE RLS em produção
> bloquearia leitura/escrita de `sessions`. Por isso o deploy é adiado.

### Adoção `withRlsContext` (T371) — código pronto, merge deferido

`session.service.ts` usa `withRlsContext` fluxo a fluxo:
`createSession` → owner (`userId`); `verifySession`/`findSessionByToken` →
posse (`tokenHash`, pré-auth); `revokeSession` → posse→owner;
`revokeAllUserSessions`/`count`/`list` → owner; `cleanupExpiredSessions` →
`SERVICE`. O contexto `tokenHash` foi adicionado a `withRlsContext` (recebe o
hash SHA-256, nunca o token cru).

> Depende da migration `20260825_rls_sessions_complete` (T377, branch
> `feat/rls-sessions-policies`) para as policies de posse/escrita. Enquanto
> FORCE RLS está OFF e a aplicação conecta como superuser, `withRlsContext` é
> inócuo; o enforcement real depende da conexão como role não-superusuária
> (`app_user`) — auditoria de contexto futura.

### Demais tabelas — SPEC PENDENTE

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | self ou admin | auth (registro) | self (perfil) ou admin | admin |
| `subscriptions` | self ou admin | sistema/billing | sistema/billing | sistema |
| `billings` | self ou admin | webhook/sistema | webhook/sistema | admin |
| `roles` / `permissions` / `user_roles` / `role_permissions` | admin | admin | admin | admin |
| `clubs`, `players`, `competitions`, `rankings`, `ranking_entries`, `matches`, `seasons`, `stadiums` | autenticado (leitura pública do catálogo) | role com `*:write`/`*:manage` | role com `*:write`/`*:manage` | role com `*:manage`/`*:delete` |
| `knowledge_graph` | autenticado | admin | admin | admin |
| `audit_logs` | admin (`audit_logs:read`) | aplicação (append) | **nunca** | **nunca** |

## 4. Roteiro de implementação

1. **T344 ✅** — migration `20260824_rls_sessions` aplicada em banco de teste; `relforcerowsecurity=true`; prova A≠B registrada.
2. **T345** — teste de integração de isolamento A≠B (vitest) — escrito; execução bloqueada pelo bug de port-proxy do Docker Desktop (P1000) no host.
3. **Produção** — somente após implementar o mecanismo de contexto (`rls-context.ts`) e auditoria do app; senão, FORCE RLS quebra a aplicação.

## 5. Pendências conhecidas

| Item | Estado |
|---|---|
| Ambiente PostgreSQL de teste | ✅ disponível (container `almanaque-postgres`) |
| `prisma migrate deploy` | ✅ aplicado em teste (6 migrations, incluindo `trial_used_at` e `rls_sessions`) |
| T344 (migration RLS) | ✅ DONE (teste) |
| T345 (teste A≠B) | ⏳ escrito; execução bloqueada por port-proxy (P1000) |
| Mecanismo de contexto da aplicação (`rls-context.ts`) | ❌ não existe — pré-requisito para produção |
