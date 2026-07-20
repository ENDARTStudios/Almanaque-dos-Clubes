# worklog.md — Almanaque dos Clubes

Histórico persistente de execução. Cada entrada marca uma tarefa fechada.
Formato obrigatório: seção iniciada por `---`, com Task ID, Agent, Task, Work Log e Stage Summary.

---
Task ID: 0
Agent: Doer (GLM-5.1) — bootstrap de reconstrução
Task: Auditar estado real do repositório GitHub após clonar origin/main

Work Log:
- Clonado repositório https://github.com/ENDARTStudios/Almanaque-dos-Clubes.git para /home/z/my-project/almanaque
- Único commit em origin/main: 8cb9b67 ("main") — apenas o esqueleto do MVP pré-protocolo
- Estado do PLANO_MESTRE.md: TODAS as tarefas [ ] desmarcadas — nem Fase 0 marcada
- Estado do schema.prisma: apenas Club, Player, Competition existem (sem AuditLog, Session, User, Role, Permission, Subscription, Billing)
- apps/api/src/modules/auth/ não existe
- apps/api/src/types/fastify.d.ts não existe
- docs/evidence/ não existe
- .env.example existe (DATABASE_URL=sqlite, sem variáveis JWT)
- pnpm install OK após ajustar pnpm-workspace.yaml com allowBuilds + onlyBuiltDependencies
- Prisma 5.22, tsx 4.23, tsc 5.9.3 funcionando
- Repositório REAL está dramaticamente atrás do que a conversa compartilhada reportava

Stage Summary:
- Reoperador confirmou: Fase 2 inteira + 3.0 + 3.1 + 3.2 precisam ser re-executadas do zero
- Usuário escolheu Opção 1 (reconstrução completa) na conversa
- Próximo passo: executar Fases 0/1 (auditoria) → 2.0→2.13 → 3.0 → 3.1 → 3.2 com commits atômicos

---
Task ID: 2.3
Agent: Doer (GLM-5.1)
Task: Expandir schema de dados (11 modelos + 5 enums)

Work Log:
- Criado schema PostgreSQL expandido em apps/api/prisma/schema.prisma com 14 modelos
- Adicionados enums: CompetitionType, UserStatus, SubscriptionPlan, SubscriptionStatus, BillingStatus
- Mantido schema SQLite espelho funcional (enums viram String, sem Unsupported tsvector)
- Gerado migration SQLite para validar (14 tabelas)
- Criada evidência docs/evidence/2.3-domain-models-verification.md
- Commit: 9291f83

Stage Summary:
- 14 tabelas: Club, Player, Competition, Ranking, RankingEntry, User, Session, Role, Permission, UserRole, RolePermission, Subscription, Billing, AuditLog
- 5 enums no PostgreSQL (string no SQLite)
- FKs com onDelete explícito (SetNull/Cascade)
- AuditLog polimórfico (entityType+entityId)
- 89 asserções passando

---
Task ID: 2.4
Agent: Doer (GLM-5.1)
Task: Índices compostos + auditoria FKs onDelete

Work Log:
- Adicionados 5 índices compostos:
  - clubs(country, status), clubs(city, state)
  - users(email, status) — login lookup
  - sessions(userId, revokedAt) — sessões ativas
  - billings(userId, status, paidAt) — relatório financeiro
- Auditadas todas as 14 FKs com onDelete explícito (SetNull/Cascade)
- Migration SQLite aplicada com novos índices
- Commit: d6108b5

Stage Summary:
- 14 FKs com onDelete explícito (grep confirmou todas)
- 5 índices compostos novos (57 statements SQL total)

---
Task ID: 2.5
Agent: Doer (GLM-5.1)
Task: AuditLog append-only com redaction

Work Log:
- Criado apps/api/src/modules/audit/audit-log.service.ts
- Constantes tipadas: AuditAction (23 ações), EntityType (10 tipos)
- Função redactSensitive() mascara password, token, secret, apikey, authorization, cookie
- Helper auditLog com record/listByEntity/listByUser/countByAction
- Resiliência: produção loga e continua; dev relança erro
- Smoke test: 12/12 asserções passando
- Commit: b9fc690

Stage Summary:
- AuditLog service sem update/delete expostos
- Redaction automática em changes e metadata
- Idempotente

---
Task ID: 2.6
Agent: Doer (GLM-5.1)
Task: Seed expandido brasileiro

Work Log:
- Reescrito apps/api/prisma/seed.ts com dados realistas:
  - 10 clubes: Flamengo, Palmeiras, Santos, Corinthians, São Paulo, Cruzeiro, Grêmio, Internacional, Atlético-MG, Fluminense
  - 3 competições: Brasileirão, Copa do Brasil, Libertadores
  - 2 rankings: CBF 2023 (10 entradas) + CONMEBOL 2023 (10 entradas)
- Idempotente: upsert/findFirst+update
- Sanity checks pós-seed (≥10/3/2/20)
- Commit: 577ba06

Stage Summary:
- Seed executado com sucesso (10+3+2+20 = 35 registros)
- Idempotência verificada em segunda execução (mesmas contagens)

---
Task ID: 2.7
Agent: Doer (GLM-5.1)
Task: crypto.ts (argon2id senha + SHA-256 token)

Work Log:
- Instalado argon2@^0.45.0 (binding nativo)
- Criado apps/api/src/config/crypto.ts com 7 funções:
  - hashPassword (argon2id, custo 12, 64MiB)
  - verifyPassword (timing-safe, captura exceções)
  - generateToken (32 bytes, base64url)
  - hashToken (SHA-256 hex)
  - verifyToken (timingSafeEqual)
  - generateNumericCode (OTP 4-10 dígitos)
  - safeEqual (timing-safe)
- Smoke test: 49/49 asserções
- Commit: f7c0a57

Stage Summary:
- argon2id (RFC 9106) com parâmetros seguros
- SHA-256 para tokens (rápido, ~1μs)
- Salt embutido no hash argon2 (não há coluna salt separada)

---
Task ID: 2.8
Agent: Doer (GLM-5.1)
Task: Session helper (create/verify/revoke/cleanup)

Work Log:
- Criado apps/api/src/modules/auth/session.service.ts com 7 funções
- Refresh token nunca persistido em texto (apenas tokenHash SHA-256)
- revokedAt: null = ativa; timestamp = revogada (não deleta)
- verifySession retorna null para TODOS os casos (não revela motivo)
- listActiveUserSessions não retorna tokenHash
- Smoke test: 29/29 asserções
- Commit: 5c27f83

Stage Summary:
- Session service completo para Fase 3 (Auth)
- REFRESH_TOKEN_EXPIRES_MS = 7 dias
- Idempotente em revokeSession

---
Task ID: 2.9
Agent: Doer (GLM-5.1)
Task: RBAC (3 roles + 18 permissões + cache)

Work Log:
- Criado apps/api/src/modules/auth/rbac.service.ts
- 3 roles: admin (18 perms), pro (8), free (5) = 31 atribuições
- 18 permissões hierárquicas: clubs:read|write|manage|delete, players:*, competitions:*, rankings:*, users:read|manage, billings:read|refund, audit_logs:read
- Cache em memória TTL 5 min (invalidado após assignRole/revokeRole)
- Adicionado seedRbac() ao prisma/seed.ts
- Smoke test: 29/29 asserções
- Commit: 70b9493

Stage Summary:
- RBAC pronto para uso em middleware de autorização (Tarefa 3.5)
- Hierarquia: FREE < PRO < ELITE
- Multiplas roles por usuário (união de permissões)

---
Task ID: 2.10
Agent: Doer (GLM-5.1)
Task: Subscription + Billing service (SaaS)

Work Log:
- Criado apps/api/src/modules/billing/subscription.service.ts
- Planos: FREE (R$0), PRO (R$29), ELITE (R$99) em centavos
- Funções: createFreeSubscription, changePlan, cancelSubscription, isActiveSubscription, hasMinimumPlan
- Billing: createBilling, markBillingPaid (transacional), refundBilling, failBilling, listUserBillings, findBillingByExternalId
- markBillingPaid usa prisma.$transaction para atomicidade (billing + subscription)
- Smoke test: 45/45 asserções
- Commit: 46a2a45

Stage Summary:
- SaaS billing pronto para integração com provedor (Stripe/PagSeguro - Fase 4.6)
- findBillingByExternalId para webhook idempotência
- Hierarquia FREE < PRO < ELITE para feature gating

---
Task ID: 2.11-2.12
Agent: Doer (GLM-5.1)
Task: Full-text search SQL + Extensões PostgreSQL

Work Log:
- Criado apps/api/prisma/fulltext-indexes.sql:
  - Colunas search_vector já no schema como Unsupported("tsvector")?
  - Índices GIN em search_vector (clubs, players, competitions)
  - Triggers BEFORE INSERT/UPDATE populam search_vector com pesos A/B/C + stemmer português
  - Índices trigram (gin_trgm_ops) para busca fuzzy
- Criado apps/api/prisma/extensions.sql:
  - CREATE EXTENSION uuid-ossp, pgcrypto, pg_trgm
- Commit: 0ed250b

Stage Summary:
- SQLite NÃO recebe esses arquivos (não suporta tsvector/pg_trgm)
- Aplicação real via migrate.ps1 no Windows (Tarefa 2.13)

---
Task ID: 2.13
Agent: Doer (GLM-5.1)
Task: Migration final consolidada + scripts PowerShell

Work Log:
- Gerado apps/api/prisma/migrations-postgres/20260720000001_phase2_final/migration.sql (379 linhas, 63 CREATE statements)
- Criado scripts/migrate.ps1 — aplica extensions → migration → seed → fulltext-indexes em ordem
  - Suporta -DryRun, -SkipSeed, -SkipFulltext
  - Fallback para prisma db execute se psql não disponível
- Criado scripts/verify-migration.ps1 — verifica 6 categorias pós-migration
- Atualizado PLANO_MESTRE.md: Fase 2 marcada como [x] concluída
- Commit: (a definir)

Stage Summary:
- Fase 2 CONCLUÍDA (13/13 tarefas)
- Pendência para Operador: executar migrate.ps1 no Windows
- Próxima fase: Fase 3 (Auth) — 3.0 preflight
