# RLS-POLICIES.md — Almanaque dos Clubes

> **STATUS: `sessions` APLICADA-TESTE (T344, 2026-08-23); demais tabelas SPEC PENDENTE · PRODUÇÃO: INERTE (2026-09-02, D-2026-09-02-v5c-rls-inerte) · T400: role app_user criada/validada em banco de teste; enforcement só após T401**
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
- `FORCE ROW LEVEL SECURITY` ativado em `sessions` (teste + produção via migration manual). **Em produção está INERTE** (a API conecta como `postgres` superusuário, e o PostgreSQL dispensa RLS para superusuário).
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

### `sessions` — APLICADA-TESTE (migrations `20260824_rls_sessions` + `20260825_rls_sessions_complete`) · **PRODUÇÃO: INERTE (superuser)**

| Policy | Comando | Condição |
|---|---|---|
| `sessions_owner_select` | SELECT | `"userId" = current_setting('app.current_user_id', true)` |
| `sessions_service_select` | SELECT | `current_setting('app.current_user_role', true) = 'SERVICE'` |
| `sessions_select_by_token` | SELECT | `"tokenHash" = NULLIF(current_setting('app.current_token_hash', true), '')` |
| `sessions_insert_owner` | INSERT | `"userId" = app.current_user_id OR role = 'SERVICE'` |
| `sessions_update_owner` | UPDATE | `"userId" = app.current_user_id` (USING + CHECK) |
| `sessions_update_service` | UPDATE | `role = 'SERVICE'` (USING + CHECK) |
| `sessions_delete_service` | DELETE | `role = 'SERVICE'` |

Matriz validada (psql, role `app_user` não-superusuário, banco de teste):

| Cenário | Resultado |
|---|---|
| SELECT owner (A) | 1 (apenas a própria) |
| SELECT por `tokenHash` (posse) | 1 (sessão do hash) |
| SELECT sem contexto | 0 (deny) |
| SELECT cross-user | 0 (deny) |
| SELECT `tokenHash` vazio | 0 (deny) |
| INSERT owner | ok |
| INSERT sem contexto | negado |
| UPDATE owner / SERVICE | ok |
| DELETE SERVICE | ok |

> O caminho pré-auth usa **posse** do hash (`app.current_token_hash`), nunca
> identidade fornecida pelo cliente. `users` permanece sem RLS (design próprio
> deferido — `D-2026-08-24-rls-sessions-pre-auth-design`). **Produção (2026-09-02):**
> `FORCE RLS` foi aplicado (migration manual) mas está **INERTE** — a aplicação conecta
> como superuser, que dispensa RLS; o enforcement real depende de `app_user` (T390,
> pendente do Operador).

### Adoção `withRlsContext` (T371) — código pronto, merge deferido

`session.service.ts` usa `withRlsContext` fluxo a fluxo:
`createSession` → owner (`userId`); `verifySession`/`findSessionByToken` →
posse (`tokenHash`, pré-auth); `revokeSession` → posse→owner;
`revokeAllUserSessions`/`count`/`list` → owner; `cleanupExpiredSessions` →
`SERVICE`. O contexto `tokenHash` foi adicionado a `withRlsContext` (recebe o
hash SHA-256, nunca o token cru).

> Depende da migration `20260825_rls_sessions_complete` (T377, branch
> `feat/rls-sessions-policies`) para as policies de posse/escrita. **Produção (2026-09-02):**
> as migrações foram aplicadas manualmente (D-2026-09-02-v5c-rls-inerte), `FORCE RLS` está ON
> em `sessions`, mas a aplicação conecta como **superuser** → a RLS está **INERTE** (superuser
> dispensa RLS). `withRlsContext` é inócuo enquanto a conexão for superuser; o enforcement real
> depende da conexão como role não-superusuária (`app_user`) — T390, pendente do Operador.

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


---

## T400 (2026-09-02) — role `app_user` criada + matriz revalidada (banco de teste real)

Após D-2026-09-02-operador-decisoes-finais (RLS efetiva autorizada), foi preparado e **validado** o mecanismo que
torna a RLS efetiva: uma role de aplicação **não-superusuária** (`app_user`), sobre a qual o `FORCE RLS` atua. Como a
aplicação conecta como **superuser**, a RLS fica INERTE (superuser dispensa RLS) — por isso a conexão precisa passar
a ser `app_user` (T401).

### Artefatos versionados
- `apps/api/scripts/sql/create_app_user.sql` — cria `app_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS` (idempotente) + grants mínimos em `sessions` + USAGE em sequences.
- `apps/api/scripts/sql/rls_sessions_setup.sql` — aplica `ENABLE`+`FORCE RLS` e as 7 policies de `sessions` (consolidação idempotente das migrations 20260824/20260825).
- `apps/api/vitest.config.ts` — RLS tests **reativados** (removidos os excludes).
- `.github/workflows/ci.yml` — passo **Apply RLS + app_user (test DB)** após `prisma db push`, para que o Postgres 16 do service container do CI tenha a RLS FORCE + role `app_user` antes dos testes.

### Validação (matriz como app_user, banco de teste real — Postgres Railway 18)
Script independente (`scripts/_tmp_validate_rls.ts`, descartado após a corrida) reproduzindo os cenários T345/T377
via `SET ROLE app_user` + GUCs. **Resultado: 11 PASS / 0 FAIL**, cobrindo:

| Cenário | Resultado |
|---|---|
| owner A vê apenas a própria sessão | PASS |
| SERVICE vê ambas as sessões | PASS |
| sem contexto → deny-by-default (0) | PASS |
| SELECT por tokenHash (posse) | PASS |
| cross-user → deny (0) | PASS |
| tokenHash vazio → deny (0) | PASS |
| INSERT owner | PASS |
| INSERT sem contexto → negado | PASS |
| UPDATE owner / UPDATE SERVICE / DELETE SERVICE | PASS |

> **Conclusão (T400):** a role `app_user` + policies RLS produzem o isolamento esperado no banco. O passo seguinte é
> **T401** — aplicar `create_app_user.sql` no banco de **produção** e trocar a conexão da API para `app_user`
> (DATABASE_URL_APP no Railway), com rollback documentado e smoke pós-deploy. Enquanto isso, produção continua INERTE.
