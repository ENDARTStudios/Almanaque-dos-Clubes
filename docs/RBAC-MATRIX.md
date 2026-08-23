# RBAC-MATRIX.md — Almanaque dos Clubes

> Matriz de papéis e permissões espelhada do código real
> (`apps/api/src/modules/auth/rbac.service.ts`), reconciliada com o HEAD
> `7a50d99` (tarefa T347).
>
> **Fonte de verdade:** `rbac.service.ts` (constantes `ROLE_NAMES`,
> `PERMISSIONS`, `ROLE_PERMISSIONS`) + tabelas `roles`, `permissions`,
> `user_roles`, `role_permissions` em `schema.prisma`.
>
> **Fonte NÃO autorizada:** `packages/domain/src/rbac-matrix.ts` (contém
> permissões estrangeiras: `favorites:*`, `album:*`, `collection:streak:*`).

---

## 1. Roles (RBAC)

Definidas em `rbac.service.ts` (`ROLE_NAMES`, linha 26):

| Role | Valor | Atribuição |
|---|---|---|
| ADMIN | `admin` | Via módulo admin (CRUD de usuários/roles) |
| PRO | `pro` | Via módulo admin |
| FREE | `free` | Automática no registro (`auth.service.ts` → `assignRole(user.id, ROLE_NAMES.FREE)`) |

## 2. Permissões (19)

Formato `<resource>:<action>` — `rbac.service.ts` (`PERMISSIONS`, linha 40):

| Constante | Permissão |
|---|---|
| CLUBS_READ / WRITE / MANAGE / DELETE | `clubs:read`, `clubs:write`, `clubs:manage`, `clubs:delete` |
| PLAYERS_READ / WRITE / MANAGE | `players:read`, `players:write`, `players:manage` |
| COMPETITIONS_READ / WRITE / MANAGE | `competitions:read`, `competitions:write`, `competitions:manage` |
| RANKINGS_READ / WRITE / PUBLISH | `rankings:read`, `rankings:write`, `rankings:publish` |
| USERS_READ / MANAGE | `users:read`, `users:manage` |
| BILLINGS_READ / REFUND | `billings:read`, `billings:refund` |
| AUDIT_LOGS_READ | `audit_logs:read` |
| EXPORT_CSV | `export:csv` |

## 3. Matriz role × permissão

Fonte: `ROLE_PERMISSIONS` (`rbac.service.ts`, linha 82).

| Permissão | admin | pro | free |
|---|---|---|---|
| `clubs:read` | ✅ | ✅ | ✅ |
| `clubs:write` | ✅ | ✅ | — |
| `clubs:manage` | ✅ | — | — |
| `clubs:delete` | ✅ | — | — |
| `players:read` | ✅ | ✅ | — |
| `players:write` | ✅ | ✅ | — |
| `players:manage` | ✅ | — | — |
| `competitions:read` | ✅ | ✅ | ✅ |
| `competitions:write` | ✅ | — | — |
| `competitions:manage` | ✅ | — | — |
| `rankings:read` | ✅ | ✅ | ✅ |
| `rankings:write` | ✅ | — | — |
| `rankings:publish` | ✅ | — | — |
| `users:read` | ✅ | ✅ | ✅ |
| `users:manage` | ✅ | — | — |
| `billings:read` | ✅ | ✅ | ✅ |
| `billings:refund` | ✅ | — | — |
| `audit_logs:read` | ✅ | — | — |
| `export:csv` | ✅ | ✅ | — |

Resumo (fonte: `ROLE_PERMISSIONS`): **admin** = 19/19 (todas), **pro** = 9,
**free** = 5.

> Nota: o payload da tarefa T347 citava "16 permissões"; o código real tem
> 19. Em divergência, o código vence — esta matriz espelha `rbac.service.ts`.

## 4. Distinção crítica: roles RBAC ≠ planos de billing

| Conceito | Fonte | Valores |
|---|---|---|
| **RBAC role** | `roles` + `rbac.service.ts` | `admin`, `pro`, `free` |
| **Plano de assinatura** | `SubscriptionPlan` no schema | `FREE`, `PRO`, `ELITE` |

A role `free` é atribuída a todo usuário no registro, independentemente do
plano. Elevação de role acontece apenas pelo módulo admin — nunca pelo fluxo
de billing/webhook (billing altera `Subscription.plan`, não roles).

## 5. Mecanismos de enforcement

- Middleware `authenticate` (JWT/sessão): `apps/api/src/modules/auth/authenticate.middleware.ts`.
- Guards `requirePermission` / `requireRole`: `rbac.service.ts`.
- Cache de permissões em memória, TTL 5 min (decisão 2026-07-20 em DECISOES.md).
- Seed de admin inicial: `PLANO_MESTRE.md` item 2.11.

## 6. Contaminação declarada

`packages/domain/src/rbac-matrix.ts` define permissões `favorites:create`,
`favorites:unlimited`, `album:standard|foil|exclusive|secret`,
`collection:streak:daily|unlimited` — **não existem** em `rbac.service.ts`
nem no schema. São domínio estrangeiro (outro projeto). Não usar como fonte.
Quarentena pendente de aprovação do Operador (ESCALATE T347).
