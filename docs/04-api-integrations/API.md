# API.md — Superfície da API

> Base: `https://api.almanaquedosclubes.com/api/v1` · Fastify · Zod nas entradas · swagger UI em
> `/docs` (dev). Módulos registrados em `apps/api/src/app.ts`.

## Módulos e rotas principais

| Módulo | Rotas | Notas |
|---|---|---|
| health / metrics | `/health`, `/metrics` | healthcheck do Railway + Prometheus |
| auth | `/auth/register · login · logout · refresh · me · csrf-token` | cookies `__Host-`, rotação, single-flight |
| clubs | `GET/POST /clubs`, `GET /clubs/:id`, **`GET /clubs/:id/titles` (T448)** | titles = galeria de honra com fonte |
| competitions | `GET/POST /competitions`, `GET /competitions/:id` | type LEAGUE/CUP; backfill T448e |
| players | `GET /players`, `GET /players/:id` | |
| champions | `GET /champions?gender=men\|women` | campeão vigente POR HIERARQUIA; critério condicional T448f (type-first em GRUPO-LIGA; vigência-first em GRUPO-COPA); guarda de vigência T448d; expõe `editions` e `sourceUrl` |
| compare | `GET /compare` | clubes/jogadores lado-a-lado (títulos lêem WON) |
| rankings | `GET /rankings`, CRUD admin | 0-100; rankings reais aguardam T449 |
| seasons / matches | CRUD + consulta | matches = T449 |
| favorites | CRUD owner-only | RLS (T439) |
| billing | `POST /billing/checkout`, `/billing/cancel`, `/billing/withdraw`, `GET /billing/invoices` | Stripe; gate `PAYMENTS_ENABLED` |
| consent | `POST/GET /consent` | prova de consentimento (LGPD) |
| privacy / copyright | fluxos de direitos e DMCA | T445 |
| graph | leitura do KnowledgeGraph | arestas WON/PLAYED_FOR |
| export | `GET /export?format=csv\|json` | dados do acervo com fonte |
| etl | `POST /admin/etl/ingest/:source` | admin; `wikidata-titles` = T448 |
| upload / ws / rag / backup | — | rag = placeholder; backup = T446 |

## Convenções

- Resposta de coleção: `{ data: [...], total? }`; erro: `{ error: { code, message } }`.
- Autenticação: cookies `__Host-` (access 15min + refresh 7d rotativo) + CSRF token de uso único.
- Moeda: definida pela localização REAL do IP (nunca pelo cliente — schema rejeita campo `currency`).
- Rate-limit: global + buckets próprios (auth 600/15min; sessão isenta do global — T458).

## Scripts de ingestão (prod, via container)

`node dist/scripts/ingest-won-edges-wikidata.js --apply --spot-check=20` ·
`node dist/scripts/seed-competitions-cups.js --apply` (ver [docs/06-devops-deployment/PRODUCTION_DEPLOY.md](../06-devops-deployment/PRODUCTION_DEPLOY.md)).


---

> **Fundido de:** `docs/api/auth.md`

# Auth API — Documentação

## Visão Geral

O módulo de autenticação gerencia registro, login, logout e refresh de sessão
via JWT + httpOnly cookies com refresh token rotation.

Stack:
- Fastify + @fastify/jwt (HS256)
- @fastify/cookie (httpOnly, SameSite=Strict)
- argon2id para hash de senhas
- SHA-256 para hash de refresh tokens

## Endpoints

### POST /api/v1/auth/register

Cria novo usuário com role FREE e subscription FREE.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass",
  "name": "João Silva"
}
```

**Senha:** 8+ chars, pelo menos 1 maiúscula, 1 minúscula, 1 número, 1 especial.

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "roles": ["free"], "permissions": ["clubs:read", ...] }
}
```

**Cookies:**
- `access_token` (httpOnly, SameSite=Strict, 15 min)
- `refresh_token` (httpOnly, SameSite=Strict, 7 dias)

**Erros:** 409 (email já cadastrado), 422 (validação Zod).

---

### POST /api/v1/auth/login

Autentica por email + senha.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass"
}
```

**Response (200):** Mesmo formato do register.

**Segurança:**
- Mensagem genérica "Credenciais inválidas" (não revela se email existe).
- Timing attack prevention: hash dummy executado quando email não existe.
- AuditLog registra toda tentativa (sucesso e falha).
- Rate limit: 5 tentativas/IP a cada 15 min, lockout 1h após 10 falhas.

---

### POST /api/v1/auth/logout

Revoga refresh token e limpa cookies.

**Header:** `Authorization: Bearer <refresh_token>` ou cookie `refresh_token`.

**Response (200):**
```json
{ "message": "Logout realizado" }
```

---

### POST /api/v1/auth/refresh

Renova o par access+refresh tokens (rotação).

**Header:** `Authorization: Bearer <refresh_token>` ou cookie `refresh_token`.

**Response (200):** Mesmo formato do login, com novos cookies.

**Segurança:**
- Sessão antiga é revogada, nova sessão criada.
- Se refresh token já revogado for reutilizado → **todas as sessões do usuário são revogadas** (proteção contra roubo).

---

### POST /api/v1/auth/reset-password (em implementação)

Solicita reset de senha (email mock em dev).

**Request body:** `{ "email": "user@example.com" }`

---

## Middleware

### `authenticate` (preHandler)
Extrai `access_token` do cookie, valida JWT, popula `request.user`.

### `requirePermission(permission: string)` (preHandler)
Verifica se `request.user.permissions` inclui a permissão.

### `requireRole(role: string)` (preHandler)
Verifica se `request.user.roles` inclui a role.

**Uso:**
```typescript
app.delete('/clubs/:id', {
  preHandler: [authenticate, requirePermission('clubs:delete')]
}, handler);
```

## Cookies

| Cookie | Ambiente | Prefixo | httpOnly | SameSite | Path |
|---|---|---|---|---|---|
| access_token | dev | `access_token` | ✅ | Strict | `/api/v1` |
| access_token | prod | `__Host-access_token` | ✅ | Strict | `/api/v1` |
| refresh_token | dev | `refresh_token` | ✅ | Strict | `/api/v1/auth` |
| refresh_token | prod | `__Host-refresh_token` | ✅ | Strict | `/api/v1/auth` |

## Rate Limiting

| Rota | Limite | Janela | Lockout |
|---|---|---|---|
| POST /login | 5 tentativas | 15 min | 1h após 10 falhas |
| POST /register | 3 tentativas | 15 min | — |
| POST /reset-password | 3 tentativas | 1h | — |
| POST /refresh | 10 tentativas | 15 min | — |

## Audit Events

| Evento | Ação |
|---|---|
| Novo cadastro | `user.register` |
| Login bem-sucedido | `user.login` |
| Falha de login | `user.login_failed` |
| Logout | `user.logout` |
| Refresh | `user.refresh` |
| Reset solicitado | `user.password_reset.request` |
| Reset confirmado | `user.password_reset.confirm` |

