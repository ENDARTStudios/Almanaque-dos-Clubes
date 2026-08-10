# MANUAL_DO_OPERADOR.md

> Instruções completas para operar o Almanaque dos Clubes em produção.
> Versão: 1.0 | Data: 2026-08-10

---

## Índice

1. [Stack e Dependências](#1-stack-e-dependências)
2. [Ambientes](#2-ambientes)
3. [Deploy](#3-deploy)
4. [Banco de Dados](#4-banco-de-dados)
5. [Monitoramento](#5-monitoramento)
6. [Backup](#6-backup)
7. [Segredos](#7-segredos)
8. [Troubleshooting](#8-troubleshooting)
9. [Checklist Diário / Semanal](#9-checklist-diário--semanal)

---

## 1. Stack e Dependências

| Componente | Tecnologia | Versão | Porta |
|---|---|---|---|
| API | Node.js + Fastify | 24.x / 5.x | 3000 |
| Frontend | Next.js | 16.x | 3001 |
| Banco | PostgreSQL | 16 | 5432 |
| Cache/Fila | Redis | 7 | 6379 |
| Storage | MinIO (S3) | latest | 9000 |
| Worker | BullMQ | 5.x | — |
| Proxy | Caddy / Nginx | — | 443 |

### Docker Compose (desenvolvimento local)

```bash
docker compose up -d
```

Serviços iniciados: PostgreSQL + MinIO + Redis.

### Scripts Úteis

```bash
# Desenvolvimento
pnpm dev              # Inicia API + Frontend em paralelo
pnpm db:migrate       # Roda migrations Prisma
pnpm db:seed          # Popula banco com dados iniciais

# Verificação
pnpm typecheck        # TypeScript strict check
pnpm lint             # ESLint + Prettier
pnpm test             # Todos os testes (unit + integração)

# Workers (em terminais separados)
pnpm --filter @almanaque/worker dev:etl
pnpm --filter @almanaque/worker dev:email
```

---

## 2. Ambientes

### Desenvolvimento (local)

| Variável | Arquivo | Valor |
|---|---|---|
| `NODE_ENV` | `.env` | `development` |
| `DATABASE_URL` | `.env` | PostgreSQL local |
| `S3_ENDPOINT` | `.env` | `http://localhost:9000` |

### Staging (Fly.io / Railway)

| Config | Ação |
|---|---|
| Deploy automático | Push em `main` → CI roda → Deploy staging |
| URL staging | `https://staging.almanaque.app` |
| Banco staging | PostgreSQL gerenciado (Fly.io/Railway) |

### Produção

| Config | Ação |
|---|---|
| Deploy manual | Operador aprova promoção staging→produção |
| URL produção | `https://almanaque.app` |
| Domínio | Pendente (PENDENCIAS_OPERADOR.md item 1) |

---

## 3. Deploy

### Pipeline CI/CD

O repositório possui GitHub Actions configurados em `.github/workflows/`:

| Workflow | Trigger | Ações |
|---|---|---|
| `ci.yml` | Push/PR em `main` | Lint → Typecheck → Testes → Security Gate |
| `dast.yml` | Semanal (domingo) | OWASP ZAP scan no staging |

### Deploy Manual (produção)

```bash
# 1. Build da API
pnpm --filter @almanaque/api build

# 2. Build do Frontend
pnpm --filter web build

# 3. Docker build (opcional)
docker build -t almanaque-api:latest -f apps/api/Dockerfile .
docker build -t almanaque-web:latest -f apps/web/Dockerfile .

# 4. Push para registro
docker push registry.fly.io/almanaque-api:latest

# 5. Deploy
fly deploy
```

### Healthcheck

```
GET /api/v1/health
→ 200 { "status": "ok", "timestamp": "2026-08-10T..." }
```

---

## 4. Banco de Dados

### Migrations

```bash
# PostgreSQL (produção/Docker)
prisma migrate deploy --schema=prisma/schema.prisma

# SQLite (sandbox/dev)
prisma migrate dev --schema=prisma/schema.sqlite.prisma
```

### Migration PostgreSQL (Windows)

```powershell
pwsh ./scripts/migrate.ps1
```

Este script executa em sequência:
1. Cria extensões (uuid-ossp, pgcrypto, pg_trgm)
2. Aplica migrations Prisma
3. Gera Prisma Client
4. Popula seed data
5. Cria índices full-text

### Seed

```bash
pnpm db:seed
```

Dados inseridos: 10 clubes brasileiros, 3 competições, 2 rankings, 3 roles (admin/pro/free), 18 permissões.

### Reset do Banco (desenvolvimento)

```bash
npx prisma migrate reset --schema=prisma/schema.sqlite.prisma
pnpm db:seed
```

---

## 5. Monitoramento

### Endpoints

| Rota | Descrição |
|---|---|
| `GET /api/v1/health` | Healthcheck básico |
| `GET /api/v1/metrics` | Métricas de processo (memória, CPU, uptime) |
| `GET /api/v1/clubs` | Smoke test de dados (lista paginada) |

### Logs

A API usa **Pino** como logger estruturado. Níveis:

| Nível | Uso |
|---|---|
| `fatal` | Falha ao iniciar servidor |
| `error` | Erros não tratados, auditoria falha |
| `warn` | Rate-limit excedido, refresh token reuso |
| `info` | Login, registro, operações CRUD |
| `debug` | Queries Prisma (dev apenas) |

### Alertas (recomendados para produção)

| Condição | Canal | Ação |
|---|---|---|
| 5xx > 1% em 5 min | Email/Slack | Investigar erro no servidor |
| Auth failures > 50 em 1 min | Email/Slack | Possível ataque de força bruta |
| Uptime check falhou | SMS/Pager | Servidor pode estar offline |
| Disk usage > 80% | Email | Aumentar armazenamento |
| SSL expirando em < 30 dias | Email | Renovar certificado |

---

## 6. Backup

### PostgreSQL

```bash
# Backup manual
pg_dump -U almanaque -h localhost almanaque > backup-$(date +%Y-%m-%d).sql

# Restore
psql -U almanaque -h localhost almanaque < backup-2026-08-10.sql
```

### MinIO (uploads)

```bash
# Backup de bucket
mc cp --recursive local/almanaque-uploads/ backups/uploads-$(date +%Y-%m-%d)/
```

### Retenção

| Tipo | Frequência | Retenção |
|---|---|---|
| Banco completo | Diária | 30 dias |
| WAL arquive | Contínua | 7 dias |
| Uploads | Semanal | 90 dias |

---

## 7. Segredos

### Variáveis de Ambiente Obrigatórias

| Variável | Onde obter | Rotação |
|---|---|---|
| `JWT_SECRET` | `openssl rand -base64 48` | 90 dias |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (diferente do acima) | 90 dias |
| `DATABASE_URL` | Painel do provedor de banco | — |
| `S3_ACCESS_KEY_ID` | MinIO console / Cloudflare R2 | 180 dias |
| `S3_SECRET_ACCESS_KEY` | MinIO console / Cloudflare R2 | 180 dias |

### Provedores Recomendados

| Serviço | Gratuito? | Plano |
|---|---|---|
| **Fly.io** | ✅ $5/mês crédito | Postgres + Redis + 3 apps |
| **Railway** | ✅ $5/mês | Postgres + Redis |
| **Cloudflare R2** | ✅ 10GB | Armazenamento S3 |
| **Better Stack** | ✅ | Uptime + Logs |
| **UptimeRobot** | ✅ 50 monitores | Healthcheck |

---

## 8. Troubleshooting

### Problema: API não inicia

```bash
# Verificar logs
pnpm --filter @almanaque/api dev
# Erro comum: DATABASE_URL inválida ou PostgreSQL não está rodando
docker compose ps
```

### Problema: Migration falha

```bash
# Verificar se PostgreSQL está acessível
psql -U almanaque -h localhost -d almanaque -c "SELECT 1"

# Resetar migration (apenas dev!)
npx prisma migrate reset --schema=prisma/schema.prisma
```

### Problema: Upload falha

```bash
# Verificar se MinIO está rodando
curl http://localhost:9000/minio/health/live

# Verificar credenciais S3
mc alias set local http://localhost:9000 almanaque almanaque_dev_2025
mc ls local/almanaque-uploads/
```

### Problema: Redis indisponível

A aplicação **não quebra** sem Redis — cache e fila operam em modo degradado:
- Cache: sempre miss (busca direto no banco)
- Fila: jobs falham silenciosamente

Para restaurar:
```bash
docker compose up -d redis
```

---

## 9. Checklist Diário / Semanal

### ☐ Diário

- [ ] Healthcheck responde `200` (`curl https://api.almanaque.app/api/v1/health`)
- [ ] Nenhum erro 5xx nas últimas 24h
- [ ] Backup do banco foi executado (`ls -la backups/`)
- [ ] Workers ETL estão rodando

### ☐ Semanal

- [ ] Revisar logs de erro do Pino
- [ ] Verificar espaço em disco (`df -h`)
- [ ] Atualizar dependências (`pnpm audit`)
- [ ] Verificar certificado SSL (`openssl s_client -connect almanaque.app:443`)
- [ ] Rodar OWASP ZAP scan (automático via GitHub Actions)

### ☐ Mensal

- [ ] Revisar e rodar nova migration Prisma se houver
- [ ] Renovar segredos JWT (se > 80 dias desde última rotação)
- [ ] Testar restore de backup
- [ ] Revisar custos de infraestrutura
- [ ] Atualizar SECURITY.md se necessário

### ☐ Trimestral

- [ ] Auditoria de segurança completa
- [ ] Teste de penetração (pentest)
- [ ] Revisão de dependências obsoletas
- [ ] Atualizar documentação do operador
