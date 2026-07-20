# Almanaque dos Clubes — API MVP

> SaaS de pesquisa e análise histórica do futebol mundial.
> Este repositório contém o **primeiro endpoint funcional** da API (Fase 0–2 do `PLANO_MESTRE.md`).

---

## ✅ O que está implementado

| Item | Status |
|------|--------|
| Monorepo pnpm workspaces (`apps/api` + `packages/domain`) | ✅ |
| Prisma schema PostgreSQL (canônico) + SQLite (sandbox) | ✅ |
| Servidor Fastify 5 com TypeScript estrito | ✅ |
| `GET /api/v1/health` — health check | ✅ |
| `POST /api/v1/clubs` — criar clube (validação Zod + unicidade) | ✅ |
| `GET /api/v1/clubs` — listar com filtros + paginação + busca | ✅ |
| `GET /api/v1/clubs/:id` — buscar por ID | ✅ |
| Helmet (CSP, X-Frame-Options, X-Content-Type-Options) | ✅ |
| CORS restrito em produção | ✅ |
| Logger Pino estruturado | ✅ |
| Tratamento global de erros sem vazar stack trace | ✅ |
| Graceful shutdown (SIGINT/SIGTERM) | ✅ |

---

## 🧱 Estrutura do projeto

```
almanaque-dos-clubes/
├── apps/
│   └── api/                          # Servidor Fastify + Prisma
│       ├── prisma/
│       │   ├── schema.prisma         # POSTGRESQL (produção / Docker)
│       │   ├── schema.sqlite.prisma  # SQLITE (sandbox)
│       │   ├── seed.ts               # Seed: Flamengo, Palmeiras, Santos
│       │   └── migrations/
│       └── src/
│           ├── app.ts                # Configuração do Fastify
│           ├── server.ts             # Ponto de entrada
│           ├── config/
│           │   ├── env.ts
│           │   ├── logger.ts
│           │   └── prisma.ts
│           ├── modules/
│           │   └── clubs/
│           │       ├── repository.ts # Acesso a dados (Prisma)
│           │       ├── service.ts    # Regras de negócio
│           │       └── routes.ts     # Camada HTTP
│           └── routes/
│               └── health.ts
├── packages/
│   └── domain/                       # Tipos + validadores Zod compartilhados
│       └── src/
│           ├── club.ts
│           ├── errors.ts
│           └── index.ts
├── docker-compose.yml                # PostgreSQL 16 para dev local
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── .gitignore
```

---

## 🚀 Como rodar LOCALMENTE no Windows (PostgreSQL via Docker)

### Pré-requisitos
- Node.js v20+
- pnpm v9+ (`npm install -g pnpm`)
- Docker Desktop rodando

### Passo a passo (PowerShell)

```powershell
# 1. Entre no diretório do projeto
cd "D:\PROJETOS\Almanaque dos Clubes"

# 2. Suba o PostgreSQL
docker compose up -d
docker ps   # confirme que "almanaque-postgres" está "healthy"

# 3. Crie o .env apontando para o PostgreSQL
$content = @"
DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@localhost:5432/almanaque?schema=public"
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
"@
[System.IO.File]::WriteAllText("$PWD\.env", $content, (New-Object System.Text.UTF8Encoding $false))

# 4. Instale dependências
pnpm install

# 5. Gere o Prisma Client + rode a migration inicial (schema PostgreSQL)
pnpm --filter @almanaque/api exec prisma generate --schema=prisma/schema.prisma
pnpm --filter @almanaque/api exec prisma migrate dev --schema=prisma/schema.prisma --name init

# 6. (Opcional) Rode o seed para popular o banco
pnpm db:seed

# 7. Suba o servidor em modo dev
pnpm dev
```

Servidor disponível em `http://localhost:3000/api/v1`.

> ⚠️ **Importante:** o `pnpm db:seed` usa o schema SQLite por padrão (definido em `apps/api/package.json`). Para usar PostgreSQL em produção, ajuste o script `prisma:seed` para apontar a `--schema=prisma/schema.prisma`, ou rode direto:
> ```powershell
> pnpm --filter @almanaque/api exec tsx prisma/seed.ts
> ```

---

## 🧪 Como rodar no SANDBOX (SQLite — sem Docker)

O sandbox Linux deste ambiente não tem Docker/PostgreSQL. Para validar a API
sem instalar nada, usamos o SQLite como backend.

```bash
# 1. Use o .env apontando para SQLite
echo 'DATABASE_URL="file:./dev.db"' > .env
echo 'NODE_ENV=development' >> .env
echo 'PORT=3000' >> .env

# 2. Instale dependências
pnpm install

# 3. Rode migration no schema SQLite
pnpm --filter @almanaque/api exec prisma generate --schema=prisma/schema.sqlite.prisma
pnpm --filter @almanaque/api exec prisma migrate dev --schema=prisma/schema.sqlite.prisma --name init

# 4. Seed (ainda usando SQLite)
pnpm --filter @almanaque/api exec tsx prisma/seed.ts

# 5. Suba o servidor
pnpm dev
```

---

## 📋 Endpoints disponíveis

### `GET /api/v1/health`
Health check — não expõe detalhes internos.

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"2026-07-16T15:49:24.150Z","uptime":1.234}
```

### `POST /api/v1/clubs`
Cria um novo clube. Validação completa via Zod; unicidade (name, country).

```bash
curl -X POST http://localhost:3000/api/v1/clubs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corinthians",
    "fullName": "Sport Club Corinthians Paulista",
    "shortName": "COR",
    "city": "São Paulo",
    "state": "SP",
    "country": "BR",
    "foundedYear": 1910,
    "primaryColor": "#000000",
    "website": "https://www.corinthians.com.br"
  }'
```

**Campos aceitos:**

| Campo | Tipo | Obrigatório | Regras |
|-------|------|-------------|--------|
| `name` | string | ✅ | 2–200 caracteres |
| `fullName` | string | — | 2–300 caracteres |
| `shortName` | string | — | 1–20 caracteres |
| `city` | string | — | 1–100 caracteres |
| `state` | string | — | 1–100 caracteres |
| `country` | string | — | ISO 3166-1 alpha-2 (ex.: "BR", "AR", "PT") |
| `foundedYear` | int | — | Entre 1850 e o ano atual |
| `status` | enum | — | `ACTIVE` (default), `INACTIVE`, `DISSOLVED` |
| `primaryColor` | string | — | `#RRGGBB` |
| `website` | string | — | URL válida |

### `GET /api/v1/clubs`
Lista clubes com filtros e paginação.

```bash
# Todos
curl http://localhost:3000/api/v1/clubs

# Filtro por país
curl "http://localhost:3000/api/v1/clubs?country=BR"

# Busca textual (name, fullName, shortName)
curl "http://localhost:3000/api/v1/clubs?search=Pal"

# Paginação (max 100 por página)
curl "http://localhost:3000/api/v1/clubs?limit=10&offset=20"
```

### `GET /api/v1/clubs/:id`
Busca um clube por ID (UUID).

```bash
curl http://localhost:3000/api/v1/clubs/<UUID>
```

---

## 🔒 Segurança já aplicada (Fase 1 do PLANO_MESTRE.md)

| Camada | Implementação |
|--------|---------------|
| Headers HTTP | `@fastify/helmet` (CSP, X-Frame-Options, X-Content-Type-Options, HSTS em prod) |
| CORS | Restrito a `https://almanaque.app` em produção; permissivo em dev |
| Body size | Limite de 1 MiB |
| Validação de entrada | Zod em todos os endpoints POST |
| Sanitização de saída | Erros não vazam stack trace em produção |
| Trust proxy | Habilitado (corrects `request.ip` atrás de proxy/reverse proxy) |
| Logger estruturado | Pino (JSON em prod, pretty em dev) |

**Próximos passos de segurança (Fase 3+):**
- Autenticação com sessões server-side + cookie httpOnly
- Rate limiting por IP/rota (Redis)
- RBAC com middleware de permissões
- MFA TOTP
- Auditoria de eventos

---

## 🛠️ Scripts disponíveis

| Comando | Ação |
|---------|------|
| `pnpm dev` | Sobe a API em modo watch (tsx watch) |
| `pnpm build` | Compila TypeScript para `apps/api/dist/` |
| `pnpm start` | Inicia a API a partir do build |
| `pnpm db:generate` | Gera Prisma Client (schema SQLite) |
| `pnpm db:migrate` | Roda migrations em dev (schema SQLite) |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm db:seed` | Popula o banco com dados de exemplo |

> Em produção (PostgreSQL), substitua `--schema=prisma/schema.sqlite.prisma` por `--schema=prisma/schema.prisma` nos scripts `prisma:*` de `apps/api/package.json`.

---

## 📦 Stack técnica

- **Runtime:** Node.js v20+, TypeScript 5.6+ (strict)
- **Servidor:** Fastify 5
- **ORM:** Prisma 5.22
- **Banco:** PostgreSQL 16 (prod) / SQLite (sandbox)
- **Validação:** Zod 3
- **Logger:** Pino 9
- **Segurança:** `@fastify/helmet`, `@fastify/cors`
- **Package manager:** pnpm 11 com workspaces

---

## 📁 Próximos passos (alinhado ao PLANO_MESTRE.md)

1. **Fase 2.5** — Implementar models `User`, `Role`, `Permission`, `Session`, `AuditLog` no Prisma
2. **Fase 3** — Autenticação com sessões server-side (Redis) + 2FA TOTP
3. **Fase 3.6** — Middleware RBAC para proteger rotas administrativas
4. **Fase 1.3** — Rate limiting com `@fastify/rate-limit` + Redis store
5. **Fase 4** — CRUDs de Player, Competition, Ranking

Cada fase deve ser entregue como um PR separado, marcando os checkboxes do `PLANO_MESTRE.md`.
