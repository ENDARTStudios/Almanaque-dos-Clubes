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
