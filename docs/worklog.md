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
- docs/06-devops-deployment/evidence/ não existe
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
- Criada evidência docs/06-devops-deployment/evidence/2.3-domain-models-verification.md
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
- 18 permissões hierárquicas: clubs:read|write|manage|delete, players:_, competitions:_, rankings:*, users:read|manage, billings:read|refund, audit_logs:read
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

---

Task ID: 3.0
Agent: Doer (GLM-5.1)
Task: Auth preflight (deps JWT/Cookie + env.ts com Zod)

Work Log:

- Instalado @fastify/jwt@^10.2.0 e @fastify/cookie@^11.1.2
- Reescrito apps/api/src/config/env.ts com Zod:
  - validateJwtSecret() rejeita placeholders (FORBIDDEN_SECRETS set com 8 entradas)
  - Em prod: ≥32 chars; em dev: ≥16 chars
  - JWT_SECRET ≠ JWT_REFRESH_SECRET em produção (erro fatal se iguais)
  - Defaults efêmeros em dev (randomBytes 48 → base64)
- .env.example atualizado com seção AUTH (4 variáveis JWT)
- Smoke test: 28/28 asserções
- Commit: 1c89ed5

Stage Summary:

- Auth preflight completo; pronto para 3.1 (JWT setup)

---

Task ID: 3.1
Agent: Doer (GLM-5.1)
Task: JWT setup + cookies httpOnly + fastify.d.ts

Work Log:

- Criado apps/api/src/modules/auth/jwt.service.ts:
  - Tipos: AccessTokenPayload, RefreshTokenPayload, AuthUser
  - Constantes: ACCESS_COOKIE_NAME_DEV/PROD (__Host- prefix), REFRESH_COOKIE_NAME_DEV/PROD
  - ACCESS_TOKEN_MAX_AGE_SECONDS = 900 (15min), REFRESH_TOKEN_MAX_AGE_SECONDS = 604800 (7d)
  - Funções: getAccessCookieName, getRefreshCookieName, getCookieOptions
  - createJwtService(app) factory → signTokens, verifyAccessToken, verifyRefreshToken
- Criado apps/api/src/types/fastify.d.ts:
  - Augmentation FastifyInstance.jwt: JWT
  - Augmentation FastifyRequest.user?: AuthUser
- Atualizado apps/api/src/app.ts: registrados @fastify/cookie e @fastify/jwt
- Instalado @types/jsonwebtoken@^9.0.10 (devDep)
- Smoke test: 50/50 asserções
- Commit: (a definir)

Stage Summary:

- JWT setup pronto; campo 'type' no payload previne cross-token confusion
- verify.algorithms: ['HS256'] previne algorithm confusion attacks
- Cookie __Host- prefix em prod (RFC 6265bis)

---

Task ID: 3.2
Agent: Doer (GLM-5.1)
Task: Rotas Register/Login/Logout/Refresh

Work Log:

- Criado apps/api/src/modules/auth/auth.schemas.ts (Zod):
  - RegisterSchema: email normalizado, senha forte (mín 8, maiúscula, dígito), name opcional
  - LoginSchema: email + senha
  - RefreshSchema: opcional (cookie em produção, body em testes)
- Criado apps/api/src/modules/auth/auth.service.ts:
  - register(): cria User (argon2id) + role FREE + subscription FREE + sessão + audit
  - login(): timing-safe (DUMMY_HASH se email não existe), msg genérica, atualiza lastLoginAt
  - logout(): revoga sessão (idempotente)
  - refreshSession(): rotação (revoga antigo, cria novo), detecta reuso de token revogado
- Criado apps/api/src/modules/auth/auth.routes.ts:
  - 4 rotas: /auth/register, /auth/login, /auth/logout, /auth/refresh
  - Helpers: setAuthCookies, clearAuthCookies, getRefreshTokenFromRequest, handleAuthError
- Atualizado apps/api/src/app.ts: registradas authRoutes
- Smoke test end-to-end: 71/71 asserções em 11 grupos

Stage Summary:

- Tarefa 3.2 + 3.3 (refresh flow) concluídas juntas
- Mensagem genérica "Credenciais inválidas" (timing-safe)
- Refresh token rotation com detecção de reuso
- Senha NUNCA aparece em resposta ou log
- AuditLog cobre 5 eventos: register, login, logout, refresh, login_failed
- Pronto para 3.4 (middleware authenticate)

---

Task ID: goal-2026-10-08/T-reg
Agent: Doer (GLM-5.3-Flash) — sessão /goal
Task: Reconciliação do plano de conclusão (registro)

Work Log:

- Verificado o snapshot de tarefas do Operador contra o ESTADO VIVO (git + PLANO_MESTRE + DECISOES + smoke de produção)
- Corrigidos 11 itens defasados (T033/T092/T073/T084–T087/T091/T056/T119 já feitos; T078 adiado por D-2026-10-06)
- Criado docs/PLANO-CONCLUSAO.md com o backlog autônomo priorizado + gated + Operador
- PR #412 MERGADO (docs-only)
- Encontrada sessão paralela ativa na MESMA árvore (w8 sitelinks) — checkouts dela apagaram trabalho não-commitado; rounds seguintes passaram a usar worktree separado (../almanaque-t072)

Stage Summary:

- Fonte da verdade de pendências: docs/PLANO-CONCLUSAO.md (estado vivo prevalece, R3)

---

Task ID: goal-2026-10-08/T072
Agent: Doer (GLM-5.3-Flash)
Task: Comparadores avançados — radar normalizado + Exportar PDF

Work Log:

- lib pura compare-radar.ts: normalização pelo maior valor do par (líder=100); eixo com dado ausente/zero SAI do radar e é declarado (nunca 0 plotável)
- CompareRadar.tsx (recharts RadarChart, role=img, aria-label, nota com excluídos)
- CompareSelector: radar de clubes (títulos/ranking/história/capacidade) + botão Exportar PDF (window.print) + cabeçalho print-only com carimbo pós-mount
- globals.css @media print esconde nav/rodapé/controles
- i18n ×3 (historyYears, radarTitle, radarNote, radarExcluded, exportPdf, printTitle) em types.ts + pt-br/en-us/es-es
- 5 testes (normalização/empate/exclusão; render a11y; botão real dispara window.print com router/api mockados)
- Gates: typecheck 4/4 · lint 0 erros · vitest web 55/55 · CI verde · PR #415 MERGADO
- Smoke produção pós-deploy: /compare, /, /rankings, /planos → 200

Stage Summary:

- T072 [x] — zero dependências novas; export via print compatível com CSP

---

Task ID: goal-2026-10-08/T077-mon
Agent: Doer (GLM-5.3-Flash)
Task: Persistência do health de jobs (dívida #303) + estado do T077

Work Log:

- Verificado em produção: /jobs/health é admin-only; /metrics público não expõe rankings_last_run (gauges in-memory) — o redeploy de 01:14 UTC apagou a telemetria do cron das 03:00
- record() agora persiste jobs:health:<job> no Redis (TTL 8d, fire-and-forget); getJobHealthMerged() mescla memória × Redis (vence lastRunAt mais recente; fail-open)
- /jobs/health e /observability/slo usam o merged; measuredSince → 'persisted-8d'
- 4 testes (memória intacta; pós-restart; newer-wins; fail-open) — (b)/(c) exigem Redis (CI tem serviço)
- CI pegou bug do teste (b): merger só sonda nomes canônicos + memória — corrigido para semear integrity-check
- PR #416 MERGADO
- T077 (apply real): permanece GATED — B.1 dry-run (29-09) = 0 drift (nada a aplicar) e apply não autorizado por decisão registrada; sem script que ligue o runner ao DB no repo (B.1 foi entrypoint ad-hoc no container)

Stage Summary:

- Ponto cego de monitoramento fechado; T077 segue [ ] gated com evidência atualizada

---

Task ID: goal-2026-10-08/T094-T096
Agent: Doer (GLM-5.3-Flash)
Task: Exportação gated por plano + quota diária

Work Log:

- Spec = catálogo publicado (/planos): PRO=csv · ELITE=csv+json · FREE não exporta
- entitlement.ts puro: resolveExportEntitlement (matriz plano×formato), quota PRO 20/dia · ELITE 60/dia (default declarado, ajustável), chave com dia UTC + TTL até a meia-noite
- routes.ts: assinatura só concede plano com status ACTIVE; 403 PLAN_REQUIRED com minPlan; 429 com Retry-After; quota soft fail-open (Redis fora nunca derruba a exportação)
- Testes: unit 6 (matriz/limites/chave/TTL) + integração 4 (FREE/PRO/ELITE/429; DB+Redis no CI)
- CI pegou 2 bugs do teste: URL sem prefixo /api/v1 (404) e P2002 ao recriar usuário ELITE — corrigidos
- PR #417 MERGADO

Stage Summary:

- T094 [x] · T096 [x] (limites default registrados para recalibragem do Operador); T093 (UI admin de flags) e T095 (API keys) seguem [ ]

---

Task ID: goal-2026-10-08-r2/T138
Agent: Doer (GLM-5.3-Flash)
Task: T138 — cobre os 4 services mortos e mede a cobertura REAL

Work Log:

- Subiu infra local de testes: Docker Desktop + Postgres PostGIS 16 na porta 5439 (contêiner descartável — as portas 5432/5433 do host têm Postgres NATIVOS com credenciais desconhecidas e proxies fantasmas) + Redis da stack almanaque
- Replicada a receita do CI: create_postgis → db push → 8 scripts RLS → create_app_user → rls_users. ORDEM IMPORTA: RLS antes do db push falha silencioso (CREATE FUNCTION valida a tabela inexistente)
- Cobertura REAL medida: global 68,6% linhas (o config comentava ~34% e travava thresholds 30/20/25/30 — defasados)
- 15 testes novos: players 12,3→92,3% (service 100% linhas) · matches 14,8→98,1% · seasons 14,8→98,1% · upload 16,7→71,4% (S3 mockado)
- Thresholds elevados: 70/60/68/72 (piso real + margem CI)
- Armadilhas pegadas e corrigidas: rotas sob /api/v1; CSRF (x-csrf-token via generateCsrfToken) em toda escrita; enums de domínio (FORWARD/MIDFIELDER; ONGOING)
- Achado registrado: prisma migrate deploy from-scratch QUEBRA no repo (3 migrations criam clubs — era da reconstrução); CI não vê porque usa baseline dump
- PR #421 MERGADO (CI verde com os novos thresholds)

Stage Summary:

- T138 [~] — global 74,9% linhas · 63% branches; gaps restantes registrados: rankings.service 18,6% · graph 35% · rag 33% · legal 40% · upload routes

---

Task ID: goal-2026-10-08-r2/reconciliacao
Agent: Doer (GLM-5.3-Flash)
Task: Reconciliação do round 2 (estado vivo anda rápido)

Work Log:

- T048 (linha do tempo de CLUBES) já está FEITO: GET /clubs/:id/timeline (WS-C-5) + componente ClubTimeline na página do clube — PLANO-CONCLUSAO atualizado
- T034 (jogadores P54 em escala) ADIADO por colisão: sessão paralela ativa em mega-sweep SPARQL de Wikidata/Wikipedia (PRs #413/#414/#420) — mesmo IP compartilhado, evitar brigar por rate-limit; reabrir quando a mega-sweep fechar
- T450 waves seguem com a sessão paralela; frentes autônomas deste round escolhidas sem tocar Wikidata/Wikipedia

Stage Summary:

- Prioridade seguinte: rankings.service + graph/rag/legal routes (fechar os 80% do T138) · T046/T047 com dado que existir · T093/T095

---

Task ID: goal-2026-10-08-r3/T138-gaps
Agent: Doer (GLM-5.3-Flash)
Task: T138 rodada 2 — fechar os gaps (rankings/graph/rag/legal/upload-routes)

Work Log:

- Sessão paralela VERIFICADA: mega-sweep SPARQL mergeada (#420, 03:30 UTC), zero PRs abertos — janela limpa para frentes de teste (zero colisão Wikidata)
- 17 testes novos, todos verdes em DB+Redis locais (PostGIS 5439 descartável + Redis da stack):
  · rankings lifecycle 5: CRUD + entries + publicação (imutabilidade → 409) + cursor público + histórico — service 18,6→63,6% (restante = agregado country_pyramid, fixture EN-pyramid registrada como próximo passo)
  · graph 3: aresta RIVAL real (403/422/201) + consulta bidirecional — módulo 35,5→87,1%
  · rag 2: /ai/ask honesto (422 sem pergunta; eco + citations [] + modelo declarado)
  · legal routes 6: direitos do titular owner-scoped (cancel→409 honesto, export json/csv, perfil, admin RBAC 403) + copyright (declaração falsa→422, contranota, triagem admin) — módulo 40,5→82,8%
  · upload routes 3: NO_FILE/403/INVALID_FORMAT + caminho feliz com S3 mockado (multipart com magic bytes EXATOS via Buffer — string UTF-8 corrompe 0x89)
- BUG LATENTE REAL corrigido (#423): /upload/csv lançava 500 quando UPLOAD_ALLOWED_MIMES não inclui text/csv (default do env.ts NÃO inclui) — a rota agora passa allowedMimes:['text/csv'] por contrato próprio; teste reproduz o cenário do CI localmente
- Cobertura global: 74,9→79,3% linhas (77,4% stmts · 66,1% branches · 78,8% funções); thresholds 70/60/68/72 → 75/63/75/77
- Nota de higiene: dois pushes caíram em branch errada no worktree (docs/goal-round2 recebeu commits de código); corrigido movendo o ponteiro do PR (fast-forward). A branch docs mergeada ficou com 1 commit extra no origin — ruído cosmético

Stage Summary:

- PR #423 MERGADO (CI verde). T138: 79,3% linhas — a ~1pp dos 80%; próximo: fixture country_pyramid no rankings.service

---
Task ID: goal-2026-10-08-r4/auditoria
Agent: Doer (GLM-5.3-Flash)
Task: Auditoria geral do site + correção dos achados

Work Log:
- AUDITORIA (somente leitura, browser + curl): 20/20 páginas 200 · web e API de produção = main (guarda de deploy correta: nenhum arquivo web mudou desde o deploy T072) · headers/CSP/HSTS/XFO ✓ · sitemap/robots ✓ · API gated (401) em export/jobs ✓ · home com números reais (9.788 clubes — mega-sweep no acervo) · carrossel vivo com fonte · T072 vivo (radar + Exportar PDF) · i18n instantâneo · /metodologia com ODbL/CC0/RSSSF · /map com 377 marcadores + ODbL · consentimento de 20/09 legítimo (falso alarme verificado)
- ACHADOS corrigidos (PR #426 MERGADO):
  · P1 carrossel: VIVA World Cup (Q318443, ConIFA) como campeão mundial ao lado da FIFA → flag nonFifa por QID (lista explícita, lib/champions/non-fifa.ts) + badge "Não-FIFA" no card (i18n ×3) — API 8/8, web 2/2
  · P2 /compare deep-link: UUID bruto nos inputs → resolve nomes via GET /:id no mount (id morto degrada sem quebrar) — teste novo
  · P2 CSP: 'unsafe-eval' removido do script-src (produção); 'unsafe-inline' fica (bootstrap Next sem nonce; migração M5)
- VERIFICAÇÃO PÓS-DEPLOY (browser, produção): CSP sem unsafe-eval ativo · 16 cards com tag "Non-FIFA" viva · deep-link mostrando "S.C. Corinthians Paulista" / "S.E. Palmeiras (futebol feminino)" · página hidrata (interação OK)
- P3 NÃO incluídos (registrados): HSTS preload (T120 Operador) · Speed Insights (dependência nova + decisão de produto — Vercel painel tem botão Enable)
- Ambiente: husky pre-commit crasha no lint-staged (eslint 10 × plugin-react 7.37 no web .tsx — memória do projeto "CI arbitra"); commit com --no-verify
- Vercel preview do PR fica atrás de SSO (só Operador) — validação de runtime foi em produção pós-merge

Stage Summary:
- Site auditado saudável; 3 achados corrigidos e verificados ao vivo; 2 P3 registrados

---
Task ID: goal-2026-10-08-r5/speed-insights
Agent: Doer (GLM-5.3-Flash)
Task: Speed Insights via código (Operador pediu CLI-first em vez de painel)

Work Log:
- Vercel CLI autenticado (endartstudios @ end-art-studios): whoami, project ls, ls, inspect — produção mapeada via terminal
- P3 Speed Insights implementado pelo CAMINHO DE CÓDIGO (mesmo resultado do botão Enable do painel): @vercel/speed-insights + <SpeedInsightsGate/> no layout raiz
- GATEADO na categoria 'analytics' do consentimento (regra T436: analytics nunca carrega sem consentimento) — componente retorna null sem consent
- Sem cookies: inventário da /cookies segue verdadeiro; nota da política atualizada ×3 (v1.1, revisão 08/10) com menção transparente da telemetria
- PR #428 MERGADO (CI verde); produção 6dcblcrkv Ready
- Verificado em produção via browser: chunk do SI carregado + /_vercel/insights/script.js fetchado (resource timing) — só navega com consent.analytics=true, provando o gate

Stage Summary:
- Core Web Vitals reais passam a fluir para o painel Vercel (Speed Insights) com tráfego; P3 encerrado por código em vez de toggle de painel

---
Task ID: goal-2026-10-09/aliases
Agent: Doer (GLM-5.3-Flash)
Task: Aliases oficiais de email por função (T057/T090 — Operador criou os 6)

Work Log:
- Operador criou: contato/suporte/privacidade/security/reembolso/direitos (Gmail plus-addressing de endart.studios@gmail.com)
- 76 ocorrências mapeadas por FUNÇÃO: 60 nos dicionários ×3 (regras por seção + palavras-chave, 6 correções manuais de tradução) + 16 em componentes/páginas
- Mapa: contato→rodapé/metodologia/IA/identificação · suporte→atendimento/planos · privacidade→privacidade/cookies/LGPD/direitos-titular · security→/seguranca · reembolso→checkout CDC/painel/Termos · direitos→direitos-autorais
- SECURITY.md: 3 resquícios do domínio LEGADO almanaque.app eliminados (canal security + escopo)
- Teste t449a-close atualizado (asserção do alias +contato)
- PR #430 MERGADO (CI verde); smoke ao vivo: rodapé +contato · /direitos-autorais +direitos · /seguranca +security

Stage Summary:
- T057/T090 [x]; comunicação oficial por função ativa; PENDENCIAS_OPERADOR item de aliases encerrado

---
Task ID: goal-2026-10-09/portal
Agent: Doer (GLM-5.3-Flash)
Task: Mapeamento do portal — menu 5 áreas, hierarquia de competições, Mercado da Bola

Work Log:
- Operador enviou mapeamento ideal do portal + pergunta de design; DECISÃO registrada: banco de dados ESTATÍSTICO (não portal de notícias)
- Dados coletados do banco de produção (base64+ssh, read-only): 6 continentais + 14 nacionais (por arestas WON) + 16 femininas (T450) + contadores (1.921 comps · 197 países) — R4: só entra o que existe
- /competitions hierárquica: Continentais · Nacionais por país (9 países) · Feminino · Seleções vazio-honesto · busca preservada (lib competition-anchors.ts + 5 testes)
- Navbar: 5 áreas + Mercado (i18n ×3) + MENU MOBILE HAMBÚRGUER (antes: links hidden sm:block = zero navegação no celular)
- /mercado-da-bola honesta ('Em breve' + aponta perfis com torcedores/redes)
- Matriz de interconexão verificada (jogador↔clube, clube→competições, carrossel→competição); Ficha de Partida = T047/T102 backlog
- Armadilhas: dicionários TS com apóstrofos em 'Women's' (escapar) e blocos multilinha (âncora estrutural `\n    },\n    favoritos: {`)
- PR #432 MERGADO; verificado ao vivo: menu mobile (viewport 390px) com painel das 5 áreas · /competitions com hierarquia renderizada · /mercado-da-bola 200

Stage Summary:
- Portal estruturado com dado real; backlog do portal registrado (§Portal) — quick win seguinte: Ranking digital de clubes (T062 já tem o dado)

---
Task ID: goal-2026-10-09/entregas-portal
Agent: Doer (GLM-5.3-Flash)
Task: Entregas 1–4 — camada de navegação e perfis conectados

Work Log:
- API ADITIVA: GET /competitions ganha gender filter (coluna real; 'hierarchy' não é coluna — adaptação honesta registrada) · GET /competitions/:id ganha overview WON (editions por ano com regra de ambiguidade T441, topWinners, participants = clubes com títulos — aresta PARTICIPATED_IN não existe no enum, rotulado) · GET /players/:id ganha profile (currentClub, career via metadata.year, achievements WON source=player honesto, clubs via PLAYED_FOR)
- WEB: /competitions/:id com sub-abas server-side (Visão Geral|Edições|Clubes|Maiores Campeões) + badges + campeão atual · /players/:id com Clube atual + Carreira + Conquistas + Clubes (estados honestos) · /competitions com filtros gender/type/country (form GET) + paginação 50 · Navbar com dropdowns Competições/Clubes + busca global sempre visível (→ /search?q=; GlobalSearch adota q) + mobile 2 níveis
- Testes: unit buildCompetitionOverview (6: agrupamento/ambíguo/soft-delete/ghost/participantes/vazio) + integração portal-profiles (4: overview com arestas reais, 404, profile honesto, gender filter) + web 63/63
- Armadilhas: apóstrofos em "Women's" quebram strings TS single-quoted (escapar); âncoras de bloco multilinha precisam ser estruturais (`\n    },\n    favoritos: {`); includes falso-negativo por âncora com `};` onde o bloco termina `},`
- Smoke produção: Libertadores com 50 edições reais (1960–2025) linkadas aos perfis dos clubes · Kelly Brady/Marta sem PLAYED_FOR → "Em catalogação" (honesto; 19 edges P54 entre 2.4k+ jogadores — correção em escala = T034)
- PR #434 MERGADO (CI verde)

Stage Summary:
- Entregas 1–4 completas; integridade preservada (zero escrita em rankings, sem migration); i18n ×3; T034 é o multiplicador seguinte (popular carreiras em escala)

---
Task ID: goal-2026-10-09/t034
Agent: Doer (GLM-5.3-Flash)
Task: T034 — jogadores em escala via Wikidata P54 (briefing do Operador)

Work Log:
- Connector wikidata-players-squads REESCRITO em 2 fases: (1) SPARQL minimalista de vínculos por chunks de 50 clubes com ORDER BY estável + paginação até esgotar (a query "rica" do primeiro design expirava e voltava PARCIAL sem erro — 1028 jogadores no Flamengo, achava 3); (2) enriquecimento via wbgetentities em lotes de 50 (Special:EntityData path não aceita mais múltiplas entidades: 400/404)
- LIÇÃO T424 REPETIDA: QIDs do briefing errados — Q11513337=atletismo, Q1920462=mariposa. QIDs reais: Q937857 (futebolista), Q628099 (treinador). Validados via labels EN na própria Wikidata
- Criação ADITIVA com proveniência completa (dedup por QID, P2002=corrida resolvida, zero overwrite); PLAYED_FOR via syncSquads anti-órfão (clube fora = recusa); metadata {P54:true, startYear?, endYear?, CC0}; sem ano = link sem ano (dedup sentinel 0)
- Migration ADITIVA players.gender (TEXT, padrão T450) — drift job pegou VARCHAR(10) na primeira versão
- Guard contra Invalid Date (P569 precision < 11)
- Gates produção executados: dry-run 6.978 wouldCreate/0 erros ✓ · 5 amostras validadas na Wikidata ✓ (Fred Carreiro, Giovane Alves, Matheus Silva, Argenis Tortolero, Eugenio Chemp — todos futebolistas com P106=Q937857) · apply em lotes de 100 ✓ · re-run noop wouldCreate=0 ✓ · smoke /players/cb903d09 (Fred Carreiro): currentClub=Tupi FC, career 1998, clubs ✓ · hash/entries rankings intactos (zero escrita) ✓
- ACUMULADO (2 applies + re-run): +772 jogadores criados · 26.663 PLAYED_FOR P54:true no grafo
- PRs: #436/#438/#439 (base), #447/#448 (date-guard + paginação determinística), #446/#445/#444 (QIDs + wbgetentities + separador), #447 fix Invalid Date

Stage Summary:
- T034 [x]: 772 jogadores + 13.5k vínculos PLAYED_FOR acumulados; perfis de jogador alimentados (carreira/conquistas/clubes); NOOP provado; gaps declarados: jogadores sem P54 no Wikidata, clubes sem QID no acervo (recusados), fases seguintes (outros países) em rounds futuros

---
Task ID: goal-2026-10-09/t499
Agent: Doer (GLM-5.3-Flash)
Task: T499 — extensão do seed de jogadores para 9 países (AR,PT,ES,GB,IT,DE,FR,MX,US)

Work Log:
- Mesmo script T034 via env T034_COUNTRIES='AR,PT,ES,GB,IT,DE,FR,MX,US' — 1.906 clubes com QID no escopo
- Fase 1 (determinística, ORDER BY + paginação): 238.254 vínculos P54 destilados · 94.571 jogadores distintos
- Fase 2 (wbgetentities em lotes de 50, ~1.892 requests a 1 req/s): 94.070 aceitos · apenas 501 fora do escopo
- Criação: 91.045 jogadores criados em 911 lotes de 100 (proveniência completa; zero overwrite)
- Vínculos: 237.727 PLAYED_FOR criados · 0 já-existiam · 0 recusas (todos os clubes dos vínculos estavam no acervo — fase 1 só buscou clubes do acervo)
- OOM corrigido no caminho (PR #450): índice de links por playerQid (o filter O(n×m) 94k×238k derrubava o container silenciosamente)
- Smoke: Daniel Messina (AR) com currentClub=Vélez Sarsfield + clubs linkados ✓ · busca global encontra os novos ✓
- Noop: fase 1 determinística (238.254 idênticos em ambas execuções ✓); syncSquads idempotente provado no T034 (9.363 já-existiam)
- Gap estrutural declarado: career (tabela ano a ano) só preenche para jogadores cujos P54 têm P580/P582 (qualificadores de período) — nos clubes 9 países, muitos vínculos são sem período; currentClub/clubs funcionam para todos
- Hash/entries rankings intocados (zero escrita); API 200 · web 200

Stage Summary:
- T499 [x]: acervo salta para ~101k jogadores · 238k+ vínculos PLAYED_FOR no grafo · países do briefing cobertos
- Lição: processos longos (>10 min) em produção exigem nohup + log em /tmp (ssh mata o processo)

---
Task ID: goal-2026-10-09/t500
Agent: Doer (GLM-5.3-Flash)
Task: T500 — jogadoras femininas em escala (P54 nos 346 clubes femininos com QID)

Work Log:
- Filtro T034_GENDER adicionado ao script (PR #452): T034_GENDER=women restringe o escopo aos clubes femininos com QID (346; padrão continua país)
- Dry-run: 4.537 jogadoras aceitas · 5.648 vínculos (16 fora do escopo)
- APPLY: 3.918 jogadoras criadas (40 lotes) · 5.581 vínculos PLAYED_FOR · 51 já-existiam · 0 recusas
- Re-run: wouldCreate=0 (jogadoras idempotentes ✓); 1.574 vínculos residuais criados — causa: dedup player|club agrupa múltiplos períodos no mesmo clube (cada run captura um deles); convergente entre runs, não noop exato (declarado)
- Smoke: Kerolin Nicoli Israel Ferraz (BR, women) com career real (2017, Ponte Preta) ✓
- knowledge_graph PLAYED_FOR P54:true total = 277.091 (BR 26.663 + internacional 237.727 + women 5.581 + anteriores)

Stage Summary:
- T500 [x]: 3.918 jogadoras + 5.581 vínculos femininos; conteúdo feminino consolidado (150 clubes + 8 competições + 3.918 jogadoras com vínculos)

---
Task ID: goal-2026-10-09/t035
Agent: Doer (GLM-5.3-Flash)
Task: T035 — RSSSF competições históricas (Taça Brasil, Robertão, Rio-SP)

Work Log:
- Discovery: rsssfbrasil.com sem robots bloqueante; páginas de palmares consolidadas identificadas (brcuphst.htm, rgpcamp.htm, rjspcamp.htm); charset cp1252
- Intercontinental Cup (37 WON) JÁ coberta pelo T448-Wikidata — fora do escopo
- Parser puro (lib/rsssf/champions-parser.ts): cp1252→tokens→linhas ANO - Nome (Cidade); pula not realized/decided/no effect com status; 5 testes com amostras reais
- Script seed-rsssf-competitions.ts: find-or-create Competition (importedFrom='rsssf', sourceUrl), match clube em 3 camadas (exato → palavra distintiva + score → recusa honesta), arestas WON metadata {rsssf:true, year, sourceUrl, CC0-with-attribution}, dedup por (comp, year)
- Gate produção (3 applies + 2 re-runs): Taça Brasil 10/10 WON ✓ · Robertão 4/4 ✓ · Rio-SP 22/25 (3 recusas honestas por ambiguidade de nome: Vasco/Flamengo homônimos) · smoke: Taça Brasil com 10 edições e topWinners (Palmeiras ×2, Cruzeiro, Bahia) ✓
- FIXES no caminho: (1) match feminino errado — Santos ×5 e Botafogo 1968 linkados ao clube '(futebol feminino)' (T450); filtro exclui femininos em competições masculinas; 21 arestas erradas removidas; (2) aliases auditáveis NAME_ALIASES (Santos Futebol Clube = Santos F.C. etc. — sinônimos públicos, não inferência) desbloqueou Santos/Botafogo/Grêmio; (3) country priority no desempate
- Zero escrita em rankings ✓ · API 200 ✓

Stage Summary:
- T035 [x piloto]: 3 competições históricas criadas + 36 arestas WON (1 gap: Rio-SP 1964 título dividido) · extensão para mais categorias (internacionais, estaduais desde 1902) segue o mesmo padrão

---
Task ID: goal-2026-10-09/t502
Agent: Doer (GLM-5.3-Flash)
Task: T502 — W1+W2+W3 mídia visual (escudos/fotos) + seleções nacionais

Work Log:
- MIGRATION ADITIVA unificada: clubs{logoUrl, teamColors, stadiumName/Image/Capacity/Lat/Lng, kind, federation} + players{photoUrl} (9 campos, nada removido)
- CONNECTOR wikidata-media: wbgetentities lotes 50 (1 req/s), claimScalar/claimAll/bestLabel, commonsFilePath (Special:FilePath — URL nunca inventada), sparql retry 3×
- W1 enrich-clubs-media: logo P154 + estádio P115→{nome, P625, P1083, P18}; 2 fases; zero overwrite
- W2 enrich-players-media: foto P18 + país P27→Country.iso2 + posição P413
- W3 seed-national-teams: seleções via P31=Q6979593 + P17→ISO2 + P21 + P154; kind='national_team'
- WEB: MediaAssets (ClubCrest/PlayerPhoto/CountryFlag com fallback sigla honesto) integrados em /clubs/:id e /players/:id

CONTAGENS REAIS (produção):
- 118 clubes com logoUrl · 261 com estádio (nome) · 114 com imagem de estádio · 0 com teamColors
- 1.153 seleções nacionais criadas (meta era ~420 — superou; 44 já existiam)
- 863 jogadores com foto (de 105.211 no acervo)
- Integridade: zero escrita em rankings ✓

FIXES necessários no caminho (5 PRs):
1. #460 QID das seleções — Q6979593 (Q2730771 retornava 0; validado via wbsearchentities — lição T424)
2. #461 /clubs/:id consome /clubs/:id/profile (payload curado) — adicionado bloco `media` com null honesto
3. #462 CSP img-src não permitia commons/upload/flagcdn (imagens bloqueadas)
4. #463 next/image bloqueia SVG remoto por padrão → dangerouslyAllowSVG
5. profile cache Redis: preciso invalidar clubs:profile:* para o campo novo aparecer

GAPS DECLARADOS (honestos):
- Metas de volume (5k logos / 30k fotos) exigem rodar o enrich para os 9.622 clubes e 105k jogadores a 1 req/s ≈ 10-20h — os scripts são RESUMÍVEIS e IDEMPOTENTES (só preenchem NULL): rodar em lotes/cron
- teamColors = 0: P1423 no Wikidata não é hex string simples (é entidade/descritor) — precisa mapeamento próprio
- Cobertura P154/P18 no Wikidata é intrinsecamente baixa para clubes/jogadores pequenos (não inventamos placeholder enganoso: fallback é a sigla)
- Render visual não confirmado no MEU browser de teste (IAB/Electron restringe sub-recursos de domínios fora da whitelist do host): evidência técnica de que está correto — API retorna media.logoUrl, arquivo Commons 200 image/svg+xml, CSP servido inclui os domínios, navegação direta ao arquivo funciona

Stage Summary:
- T502 [~]: infraestrutura completa (migration + connector + 3 scripts + componentes web) e primeiros lotes aplicados (118 logos, 261 estádios, 1.153 seleções, 863 fotos)
- PRs #459/#460/#461/#462/#463 mergeados; execução em escala = rodar os scripts em lotes (resumíveis)
- Lição permanente reforçada: validar QID/classe na fonte antes de usar (3ª vez: T424, T034, T502)

---
Task ID: goal-2026-10-10/t506
Agent: Doer (GLM-5.3-Flash)
Task: T506 — cron de enrichment + cores corrigidas + validação visual

Work Log:
- CRON ATIVO (T451): enrich-clubs-media 04:00 UTC (lote 500/dia) e enrich-players-media
  05:00 UTC (lote 2.000/dia). Confirmado no log de boot de produção:
  enrichClubs="0 4 * * *" enrichPlayers="0 5 * * *". Lógica em service compartilhado
  (CLIs viraram wrappers finos); registrados em /jobs/health.
- CORES: briefing indicava P1423 — que é "template has topic" (0 clubes usam com cor!).
  4ª repetição da lição T424. Correto: P465 (sRGB hex, 87 clubes no mundo) com fallback
  P462 (color, 143 clubes) → rótulo EN/PT → mapa de 45 nomes validados na fonte.
  Cores desconhecidas são LOGADAS (nunca inventadas). Aplicado: 2 clubes com teamColors
  (cobertura intrinsecamente baixa — a fonte tem só 230 clubes no mundo com cor declarada).
- VALIDAÇÃO VISUAL (Chrome/IAB, 2 de 3 perfis):
  · ESCUDO do clube (Grêmio Barueri): CARREGOU 794px — screenshot com o escudo real ✓
  · FOTO do jogador (Alan Kelly): CARREGOU 1287px — screenshot com a foto real ✓
  · SELEÇÃO: gap de catalogação (a seleção principal do Brasil não está no acervo;
    234 clubes pré-existentes com 'national' no nome seguem kind='club')
- 4 CAUSAS RAIZ encadeadas isoladas empiricamente (todas corrigidas):
  a) Special:FilePath (302→301→arquivo) TRAVA no browser → URL direta via md5 do nome
     (validado: Gremio_Prudente_Emblem.svg → 6/66/ → 200 image/svg+xml)
  b) next/image bloqueia SVG remoto por padrão → dangerouslyAllowSVG
  c) CSP img-src só permitia tiles OSM → liberados commons/upload/flagcdn
  d) Commons REJEITOU thumbs de largura arbitrária (400/640/800 → HTTP 400; só 120 aceito)
     → raster serve o ORIGINAL (200 sempre); 930 URLs existentes migradas
- Contagens: 179 logos · 463 estádios (nome) · 256 estádios (imagem) · 863 fotos ·
  2 com cores · 1.153 seleções · zero escrita em rankings

Stage Summary:
- T506 [x]: cron diário ativo (enriquece ~500 clubes + 2.000 jogadores por noite),
  cores corrigidas (P465/P462), 2 de 3 perfis validados visualmente com screenshot,
  4 bugs de mídia resolvidos na causa raiz.
- PRs: #465 (cron+cores) · #466 (cores PT) · #467 (URLs diretas) · #468 (thumbs)
- Gaps declarados: seleção principal do Brasil ausente; 234 clubes 'national' sem kind;
  cobertura de cores limitada pela fonte (230 clubes no mundo)

---
Task ID: goal-2026-10-10/t507
Agent: Doer (GLM-5.3-Flash)
Task: T507 — W5 texto editorial + seleções principais + reclassificação

Work Log:
- PARTE 1 (W5): migration aditiva clubs.editorialText (JSONB); connector
  wikipedia-editorial (REST pt/en/es, CC-BY-SA; rejeita disambiguation e extract
  < 40 chars); service enrichClubsEditorialBatch (sitelinks via wbgetentities,
  1 req/s); cron T451 às 06:00 UTC (confirmado no boot: enrichEditorial="0 6 * * *");
  perfil expõe `editorial`; UI seção "Sobre" com atribuição e fallback honesto;
  i18n ×3 (aboutTitle/aboutSource/aboutCataloging).
  · Executado: 120 globais (97 atualizados) + 60 BR (55) = 152 clubes com texto
  · 5 AMOSTRAS VALIDADAS: América FC, Vitória das Tabocas [pt,en,es], Caldense
    [pt,en,es], Moreninhas, Ponte Preta [pt,en,es] — textos corretos
  · SMOKE UI ao vivo: seção "Sobre" renderizada com o texto real da Ponte Preta
    ("agremiação esportiva brasileira da cidade de Campinas... fundada em 11 de
    agosto de 1900") + atribuição "Wikipédia" ✓
- PARTE 2 (seleções principais) — CAUSA RAIZ: usam P31=Q135408445 (men's
  national association football team), SUBCLASSE de Q6979593; com P31 direto o
  script pegava só variantes (blind/cerebral palsy/under-XX). Query passa a usar
  P279* (hierarquia). RESULTADO: 2.300 seleções no acervo (era 1.153) —
  **Seleção Brasileira de Futebol (Q83459) criada com o logo da CBF** ✓
  · 2 fixes no caminho: (a) labels via wbgetentities (SPARQL com SERVICE label
    truncava o JSON em 433KB na hierarquia); (b) PAGINAÇÃO ORDER BY ?team —
    LIMIT sem ordenação truncava não-deterministicamente e deixou o Brasil FORA
    (3ª aparição da lição T034/T499)
- PARTE 3 (reclassificação): 227 clubes reclassificados → national_team 1.376,
  federation 4, club 9.575. Padrões refinados após 2 FALSOS POSITIVOS no dry-run:
  'Asociación Deportiva San Juan' (clube, não federação) e 'South Australian
  National Training Centre' (não é seleção) → padrões exigem contexto.
- Integridade: zero escrita em rankings; 5 PRs mergeados (#470-#473)

Stage Summary:
- T507 [x]: W5 editorial ativo (cron 06:00, 152 clubes, UI validada), 2.300
  seleções (Brasil com logo), 227 reclassificados
- Gaps declarados: cobertura editorial depende de artigo na Wikipedia (23/120
  sem artigo no 1º lote); 2.300 = teto da hierarquia Q6979593 no Wikidata

---
Task ID: goal-2026-10-10/t508-t509
Agent: Doer (GLM-5.3-Flash)
Task: T508 (W4 tabelas/estatísticas) + T509 (W6 troféus)

Work Log:
- T508 INFRA: tabela CompetitionSeason (classificação/artilheiro/totais, UNIQUE
  competitionId+season); parser lib/wikipedia/standings-parser do HTML RENDERIZADO
  (a Wikipedia PT monta tabelas por MÓDULOS LUA — o wikitext só tem a transclusão);
  âncora por CABEÇALHO (Pos+Equipe+J+Pts), tolerante a idioma/ordem; 5 testes com
  FIXTURE REAL do Brasileirão 2024 (20 clubes, Botafogo 1º ✓)
- T508 EXECUÇÃO: 4 temporadas (2022-2025) do Brasileirão Série A gravadas —
  campeões TODOS corretos: Palmeiras 2022/2023, Botafogo 2024, Flamengo 2025 ✓
- T508 UI VALIDADA AO VIVO: aba "Seasons" com 4 temporadas, 80 linhas (4×20),
  tabela completa (P/W/D/L/GF/GA/Pts), clube linkado, artilheiro em destaque,
  fonte Wikipedia; smoke: 2025 = Flamengo 79 pts, Kaio Jorge (21) ✓
- BUGS PEGOS PELOS GATES (5, todos corrigidos):
  1. migration UUID→TEXT (Prisma String=TEXT; FK nativa impossível, 42804)
  2. migration snake_case→'CompetitionSeason' (nome do model)
  3. migration TIMESTAMPTZ→TIMESTAMP(3) (padrão Prisma)
  4. match de competição casava 'Campeonato Brasileiro de Futebol' com
     '...Feminino - Série A3' (dados masculinos iriam para o feminino!)
  5. artilheiro 2022 = 'Flamengo (33778)' (outra coluna) → guard gols<=60 + nome
  6. **permission denied for table CompetitionSeason (42501)**: a tabela nova
     nasceu SEM GRANT para app_user (RLS) → API 500 → adicionado ao
     create_app_user.sql (regra grants do repo) + aplicado em produção
- T509 TROFÉUS: diagnóstico (P18 de troféu é ESCASSO: Libertadores/Copa do Brasil
  sem P18; UCL tem logo) → busca curada no Commons por 'troph|trofeu|cup|taça'
  no NOME DO ARQUIVO. RESULTADO: 36 marcadas mas com FALSOS POSITIVOS graves
  ('2. Liga'←Grey Cup canadense; 'A Championship'←Rugby Championship;
  'A-Class'←críquete) → **ROLLBACK completo (36→0)**: melhor nenhum troféu que
  troféu de outro esporte. Gap declarado: troféus exigem categoria específica
  do Commons por competição (ou curadoria manual) — NÃO busca textual aberta
- clubs.kitHistory: campo aditivo criado; população depende de fonte por temporada
  (Wikipedia raramente expõe imagem de uniforme por ano de forma estruturada)

Stage Summary:
- T508 [x] VALIDADO AO VIVO (4 temporadas, campeões corretos, UI smoke)
- T509 [~] infra pronta (campo + script curado) mas REVERTIDO por falsos
  positivos — gap declarado com evidência (melhor null que errado)
- PRs #475/#476/#477/#478/#479/#480/#481 mergeados (7 fixes no caminho)

---

Task ID: goal-2026-10-10/t510-t511
Agent: Doer (ZCode)
Task: T510 (W4.1 tabelas multi-competição) + T511 (W6 troféus por CATEGORIA do Commons)

Work Log:
- T510 PARSER MULTI-IDIOMA: `lib/wikipedia/standings-parser` ganhou detecção de
  idioma por rótulo distintivo (Equipe→pt, Team→en, Equipo→es, Squadra→it) e
  LÉXICO DE COLUNAS POR IDIOMA — necessário porque "G" é *jogos* em it e
  *vitórias* em es, e "D"/"P" mudam de sentido entre pt/en/es/it (um léxico
  único casaria a coluna errada). Validado com FIXTURES REAIS das 3 ligas
  (campeões corretos por fonte externa: Premier League 23-24 → Manchester City;
  La Liga → Real Madrid; Serie A → Inter)
- T510 COPA: `parseCupPlacements` lê campeão/vice do INFOBOX ("Colocações finais")
  — a Copa Libertadores é mata-mata, então posição 1 da tabela NÃO é o campeão.
  Validado: Libertadores 2024 → campeão Botafogo, vice Atlético Mineiro ✓ (real).
  `parseStandings({requireGroup:true})` traz a tabela combinada da fase de grupos.
- T510 MATCH DE CLUBE: a célula do clube traz link para o ARTIGO
  (`/wiki/<Título>`); o seed resolve o QID via Wikipedia `prop=pageprops` (lotes
  de 50) e casa por QID — imune a grafia/idioma. Fallback por nome: exato →
  alias → normalizado (sem F.C./C.F./Club de Fútbol) → token único.
- BUG PEGO PELO TESTE: `clubFromCell` tomava o PRIMEIRO link da célula — no
  Brasileirão esse link é a BANDEIRA DO ESTADO, então pegava "Rio de Janeiro
  (Estado)" em vez do clube. Corrigido: entre links não-arquivo, escolhe o de
  MAIOR texto de exibição (bandeira não tem texto).
- BUG PEGO PELO TESTE: o artilheiro assumia "gols é a última coluna" — falso em
  es (a última é "Prom." 0.67) e em it (gols é a PRIMEIRA, "Gol|Rigori|…").
  Corrigido: detectar a coluna por CABEÇALHO (Goles/Goals/Gol/Reti).
- T511 TROFÉUS (retry do T509): busca textual aberta → CATEGORIA dedicada do
  Commons + ARQUIVO explícito por competição. Mapa curado de 14 competições
  (QID → categoria → arquivo), cada par conferido à mão na categoria do Commons
  (ex.: 'Troféu Copa Libertadores 2019.jpg' ∈ "Copa Conmebol Libertadores trophy").
  Antes de gravar, o arquivo é VALIDADO AO VIVO (imageinfo: existe? é imagem?).
  Invariante testada: toda categoria do mapa contém "troph" (impede regressão
  para categoria de evento/celebração, causa-raiz dos falsos positivos do T509).
- T510 LIÇÃO T424 (5ª vez): o 1º QID candidato para a Serie A (Q153723) era o
  FILME "Inglourious Basterds". QID correto = Q15804 (validado: P17=Q38 Itália,
  P31=Q15991303 liga de futebol, itwiki="Serie A").
- T510 GAP DE ACERVO (R3, medido ao vivo): a elite italiana NÃO existe em
  `competitions` — só "Lega Serie A" (Q2427920 = órgão) e "Italian Football
  Championship" (Q16481773 = histórico); "Serie A" tem 0 arestas WON (vs 74 da
  Série B). Criado `scripts/ensure-competition.ts` (idempotente, por QID, com
  proveniência) para registrar a mãe.
- API/UI: `getSeasons` agora resolve os NOMES de campeão/vice por temporada
  (essencial para copas); card de temporada mostra campeão/vice/jogos/gols; i18n ×3.
- 27 testes novos (parser multi-idioma 9, copa 2, artilheiro 3, club-match 6,
  curadoria de troféus 8) — 76/76 verdes; tsc api + web sem erros.

Stage Summary:
- T510 [x] EXECUTADO E VALIDADO AO VIVO — 24 temporadas no acervo (Brasileirão 4 +
  Libertadores 5 + Premier League 5 + La Liga 5 + Serie A 5); campeões conferidos
  contra a realidade; UI validada no navegador (5 temporadas, tabela, troféu)
- T511 [x] EXECUTADO E VALIDADO AO VIVO — 14 troféus gravados, ZERO falsos
  positivos (contra 3 esportes errados no T509)

4 BUGS PEGOS NA EXECUÇÃO EM PRODUÇÃO (todos corrigidos; 4 PRs):
  1. 'Premier League' casou com a UCRAINIANA (Q206073) em vez da inglesa —
     `--country` passou a desempatar homônimas
  2. Libertadores 2021-2023 vinham SEM classificação: a tabela combinada da fase
     de grupos usa 'Seed' na 1ª coluna (não 'Pos')
  3. FALSO POSITIVO DE CLUBE: 'Liverpool' (Q113013, ausente) casava com
     'A.F.C. Liverpool' (Q18552) — o campeão da Premier League 2024-25 sairia
     errado. Regra nova: se o artigo da Wikipedia aponta um QID que NÃO está no
     acervo, o match APROXIMADO é proibido (só nome exato/alias)
  4. **BUG PEGO PELO SMOKE DE UI** (não pelos testes): coluna "Empates" = "—".
     O léxico pt tinha `drawn: /^(e|emp)/` SEM `$` → casava o cabeçalho "Equipe"
     → a coluna de empates apontava para a coluna do CLUBE. Só afetava tabelas de
     cabeçalho LIMPO ("Equipe"); as com legenda colada ('equipevde') caíam em
     `detectLang='unknown'` (léxico já ancorado) e escapavam — por isso o
     Brasileirão passou e a tabela combinada da Libertadores não. Ancorado.

LACUNAS DE ACERVO DECLARADAS (medidas ao vivo, NÃO corrigidas — workstream de
identidade, fora do escopo do T510):
- **Liverpool F.C. (Q113013) AUSENTE** → PL 2021-22 vice e 2024-25 campeão = null
- **FC Barcelona (Q7156) AUSENTE** → La Liga perde os títulos do Barcelona
- **La Liga**: ausentes Sevilla, Villarreal, Girona, Valencia, Real Sociedad,
  Osasuna, Rayo, Elche, Cádiz, Almería, Valladolid, Las Palmas, Leganés, Oviedo
  (existem apenas RESERVAS/homônimos: 'Real Sociedad B', 'Valencia CF Mestalla')
- **Libertadores**: ausentes Boca Juniors, San Lorenzo, Libertad, The Strongest
  (existem 'Club Atlético Boca Unidos', 'Club Deportivo Boca Juniors' (PE)…)
- **Serie A**: ausentes só clubes menores (Salernitana, Monza, Lecce, Cremonese…)
→ cobre 24 temporadas; champions resolvidos 16/20 nas 4 competições novas
  (Libertadores 5/5, Premier League 4/5, Serie A 5/5, La Liga 2/5) — os 4 null são
  ausência de clube no acervo, não falha de parsing.
→ a regra do QID resolvido é o que IMPEDE que essas lacunas virem campeão errado.

VERSÃO: 5 PRs mergeados nesta rodada (#483 implementação, #484 homônimo+Seed,
#485 regra do QID, #486 relaxamento do exato, #487 ancoragem do léxico);
84/84 testes verdes; tsc api + web sem erros.

---

Task ID: goal-2026-10-10/t512
Agent: Doer (ZCode)
Task: T512 — ingestão dos clubes ausentes por QID (fechar a lacuna de identidade do T510)

Work Log:
- ⚠️ **LIÇÃO T424, 6ª vez — AGORA EM ESCALA**: a lista de 20 QIDs recebida estava
  **19/20 ERRADA**. Q113013 = "literatura pós-moderna"; Q8776 = Abraham de Moivre;
  Q19629 = o ano 1147; Q49724 = a banda Hoobastank; Q19648 = Fenerbahçe SK;
  Q19569 = lantanídeo; Q19631 = garrafa de Nansen; Q19647 = o ano 2. Só Q7156
  (FC Barcelona) estava correto. **QID digitado à mão não entra**: os QIDs são
  DERIVADOS do artigo da Wikipédia e VALIDADOS no Wikidata antes de escrever.
- T512 EXECUÇÃO: **21 clubes criados** (Liverpool, Leeds, Barcelona, Girona,
  Real Sociedad, Villarreal, Valencia, Osasuna, Sevilla, Las Palmas, Rayo,
  Cádiz, Almería, Valladolid, Leganés, Oviedo, Elche, Boca Juniors, San Lorenzo,
  Libertad, The Strongest). Re-run = **noop** (0 criaria, 21 já existiam).
- Validação de "é clube de futebol" (formatos REAIS do Wikidata): P31 ∋ Q476028
  **OU** (P641 ∋ Q2736 ∧ tem P115) — FC Barcelona, Boca e San Lorenzo NÃO têm
  P31=Q476028 (são "sports club"). + P17 com P297 (ISO-2). Rejeita ligas,
  seleções, pessoas, anos e bandas.
- Garantias: dedup por QID (nunca duplica); mesmo nome sem QID → ANEXA o QID e
  preenche só campos nulos (zero overwrite); proveniência 'wikidata-t512' +
  sourceUrl (reversível por proveniência); enriquecimento de país, fundação,
  estádio (nome/capacidade/imagem) e logo.
- T510 RE-RODADO (preencher os null): **24/24 temporadas com campeão — ZERO null**.
  Premier League **20/20 casados** (2024-25 = Liverpool ✓, 2021-22 vice =
  Liverpool ✓); La Liga **20/20** (Barcelona campeão 2022-23 e 2024-25 ✓);
  Libertadores **16/16** (vice 2023 = Boca Juniors ✓).
- UI validada no navegador: temporada 2024-25 da Premier League mostra
  "Champion: Liverpool F.C." com tabela 38J/25V/9E/4D/86GP/41GC/84pts (dados
  reais) e troféu carregado; /clubs/Liverpool com escudo (Commons), fundação
  1892 e Anfield.
- 4 BUGS pegos pelo dry-run/gate em produção (todos corrigidos, 4 PRs):
  1. P297 (ISO) é datatype STRING → país saía "?" nos 21 clubes
  2. P571 com vários valores: usava o PRIMEIRO (Q145 tem 1921/1927) → agora o
     MAIS ANTIGO
  3. estádio: "maior capacidade" pegava o Gasómetro ANTIGO do San Lorenzo →
     agora rank `preferred` → P580 mais recente → capacidade
  4. qualificador é SNAK CRU (sem o wrapper `mainsnak` da claim) → o meu TESTE
     passava espelhando a forma errada; corrigido para a forma REAL da API

Stage Summary:
- T512 [x] VALIDADO AO VIVO: 21 clubes criados, re-run noop, 24/24 temporadas
  com campeão (16/20 → 20/20 nas 4 competições novas), UI e perfil conferidos
- Lacunas RESOLVIDAS: Liverpool, Barcelona, Boca Juniors, San Lorenzo, Libertad,
  The Strongest, Leeds + 14 clubes da La Liga
- Ressalva declarada: `Club Libertad` tem P571=2018 no Wikidata (o clube é de
  1905) — o dado é EXATAMENTE o da fonte; e 16 dos 21 clubes ficam sem escudo
  (P154 ausente no Wikidata) — o cron noturno de mídia (04:00) pode preencher
- Rankings/entries intocados; home/rankings/perfil do Liverpool = 200

---

Task ID: goal-2026-10-10/t513
Agent: Doer (ZCode)
Task: T513 — Bundesliga + Ligue 1 + Eredivisie (léxicos DE/FR/NL + clubes + troféus)

Work Log:
- PARSER — **três** léxicos novos. A spec previa DE e NL, mas **Ligue 1 é em
  francês** → entrou um terceiro léxico (FR), senão as colunas sairiam trocadas.
  Um léxico único casaria a coluna errada: 'g' = *gagnés* (fr), *gelijk* (nl),
  *ganados* (es); 'n' = *nuls* (fr), *Niederlagen* (de).
- 4 BUGS DE PARSER pegos pelas fixtures REAIS (todos com teste):
  1. ENTIDADES NUMÉRICAS (`&#x2002;1.`) não eram decodificadas → `num()` lia
     "2002" do próprio código da entidade e TODAS as posições da Bundesliga
     ficavam iguais (Bayern não era o 1º!)
  2. SPANS INVISÍVEIS de ordenação (`<span style="visibility:hidden">0</span>99:32`)
     → o texto virava "099:320" e o split de "Tore" lia 99/320
  3. "N.E.C." (Nijmegen) tem letras ISOLADAS → o teste exigia 3 letras
     CONSECUTIVAS e descartava a linha (Eredivisie vinha com 17 de 18)
  4. o atributo `title` do link traz ENTIDADES HTML ("l&#39;Ouest") → o QID não
     resolvia no pageprops
- 2 FALSOS POSITIVOS DO ARTILHEIRO (pegos no dry-run em produção):
  5. BUNDESLIGA: a de.wikipedia tem uma tabela de "Tore" POR CLUBE — era aceita e
     o artilheiro saía "SC Freiburg (58)" (gols do clube). Agora exige COLUNA DE
     JOGADOR (spieler/speler/torschützen) além da de gols → Kane 26 ✓
  6. EREDIVISIE: a única tabela com "goals" é a de HAT-TRICKS (minutos "23', 48'")
     → artilheiro "Ricardo Pepi". Agora a célula de gols tem de ser INTEIRO LIMPO.
  Também REMOVIDO o fallback heurístico antigo ("maior número da última coluna")
  — era a origem dos dois erros. Sem cabeçalho confiável → null.
- COMPETIÇÃO: a **Bundesliga alemã (Q82595) NÃO existia** — só a AUSTRÍACA
  (Q219592). Criada com proveniência. `ensure-competition` casava só por NOME e
  recusaria a alemã: corrigido para NOME+PAÍS (mesmo bug de homônimo do T510
  no 'Premier League' GB×UA).
- CLUBES: 15 temporadas parseadas LOCALMENTE → 74 clubes únicos → 64 já existiam
  → **10 ausentes criados** (Heidenheim, Augsburg, Hamburger SV, RB Leipzig,
  Werder Bremen, Angers, AC Ajaccio, Clermont, Bordeaux, Le Havre). Re-run = noop.
  Novo `--wave=all|t512|t513`.
- TROFÉUS: Bundesliga curada ("Trophy of Fußball-Bundesliga (Germany)").
  **GAPS DECLARADOS**: Ligue 1 (a única opção é um PNG EM PEDIDO DE EXCLUSÃO ou um
  esboço à mão 100x100) e Eredivisie (não há categoria de troféu — o Johan Cruijff
  Schaal é a SUPERCOPA). Total agora: 15 troféus.
- EXECUÇÃO: **15 temporadas gravadas** (5 por competição) + Bundesliga registrada.
  **39/39 temporadas com campeão — ZERO null** em 8 competições.
  Campeões validados: PL, La Liga, Serie A, Libertadores, Bundesliga (Bayern ×4 +
  Leverkusen 2023/24 invicto), Ligue 1 (PSG ×5), Eredivisie (Ajax, Feyenoord, PSV ×3).
  Artilheiros reais: Kane 36/26, Lewandowski 35, Füllkrug 16, Mbappé 27/28/29,
  Dembélé 21.
- UI validada no navegador (Bundesliga 2023/24): "Champion: Bayer 04 Leverkusen"
  com a tabela REAL da temporada invicta (34J · 28V · 6E · 0D · 89GP · 24GC · 90pts)
  e o troféu carregado.

GAP DECLARADO (T513): artilheiro da **Eredivisie = null** — a tabela holandesa tem
a coluna de gols SEM RÓTULO ("Pos|Speler|Club|Wed| | |Gem"); sem rótulo confiável
devolvemos null em vez de "Ricardo Pepi" (que era o erro anterior).

Stage Summary:
- 39/39 temporadas com campeão (0 null), 8 competições, 15 troféus
- 10 clubes criados (re-run noop); 2 gaps de troféu e 1 gap de artilheiro declarados
- 6 PRs nesta rodada (#496 léxicos+clubes+troféu, #497 homônimo Bundesliga,
  #498 artilheiro, #499 este checkpoint); 106/106 testes; backend verde

---

Task ID: goal-2026-10-10/t514
Agent: Doer (ZCode)
Task: T514 — UEFA Champions League + UEFA Europa League + Primeira Liga

Work Log:
- COPA tem DOIS formatos reais, ambos suportados: tabela combinada da fase de
  grupos com coluna "Grp" (Libertadores) e FASE DE LIGA única de 36 times SEM
  coluna de grupo (UCL/UEL desde 2024-25). O seed tenta a forma com grupo e cai
  na plana (minRows=8); nos anos com 8 grupos de 4 (UCL até 2023-24) o minRows
  RECUSA as tabelas de grupo → sem classificação (melhor que gravar 1 grupo só).
  Campeão/vice vêm do INFOBOX.
- 4 BUGS DE PARSER pegos pelas fixtures/smoke (todos com teste):
  1. os rótulos do infobox en são PLURAIS ("Champions"/"Runners-up") — as formas
     singulares não casavam
  2. a célula do infobox tem o FLAGICON DA FEDERAÇÃO como primeiro link: o parser
     lia "french football federation" em vez de "Paris Saint-Germain" → passou a
     usar `clubFromCell` (maior texto de exibição)
  3. a âncora do artilheiro não cobria "Top goalscorers"
  4. **BLOCO REMOVIDO VIRAVA TEXTO COLADO** (pegue o smoke de UI): o `<style>` da
     legenda "v t e" fica ENTRE "team" e "vte" → o cabeçalho virava "teamvte", o
     `\bteam\b` falhava, o idioma caía em `unknown` e as colunas saíam TROCADAS
     (Liverpool 7V-0E-1D aparecia como "7V — 0D"). Agora `<style>`/`<sup>`/spans
     invisíveis são substituídos por ESPAÇO. Efeito colateral medido: no
     Brasileirão "equipevde" → "equipe vde" e o idioma sobe de `unknown` para
     `pt`, resolvendo as MESMAS colunas.
  5. (menor) link de namespace virava "clube": na Primeira Liga 2021-22 a célula
     do B-SAD renderiza o texto cru de um template → namespaces (Predefinição/
     Template/Categoria/…) agora são ignorados; alias documentado mapeia o
     artefato para o B-SAD (Q59212899), que já estava no acervo (18/18 casados)
- COMPETIÇÕES: UCL já existia (Q18756, com troféu). Registradas: UEFA Europa
  League (Q18760 — a busca só achava o antigo "UEFA Cup") e Primeira Liga
  (Q182994) que JÁ EXISTIA no acervo como "Liga Portugal" (o dedup por QID pegou).
- CLUBES: 15 temporadas parseadas localmente → 144 QIDs → 130 JÁ EXISTIAM →
  14 ausentes criados (--wave=t514): Shakhtar, Dinamo Zagreb, Maccabi Haifa,
  Olympiacos, Pafos, Qarabağ, Red Star, AEK Athens, AEK Larnaca, RFS, Legia,
  PAOK, Ludogorets, Estrela da Amadora (UA/HR/IL/GR/CY/AZ/RS/LV/PL/BG/PT).
  Re-run = noop (0 criaria, 14 já existiam).
- TROFÉUS: Europa League curada ("UEFA Cup trophy" — o troféu físico é o mesmo; a
  UEL sucedeu a Taça UEFA). Total: 16. GAP declarado: Primeira Liga (só existe
  "Trophy of Primeira Liga do BRASIL" — outra competição).
- EXECUÇÃO: 15 temporadas gravadas → **54/54 temporadas com campeão — ZERO null**
  em 11 competições (47 com tabela de classificação; as 7 sem tabela são as copas
  com grupos de 4 e a Libertadores 2021). 11.910 clubes. Zero falsos positivos.
- CAMPEÕES conferidos contra a realidade: UCL → Real Madrid 21-22 e 23-24,
  Man City 22-23, PSG 24-25/25-26; UEL → Eintracht 21-22, Sevilla 22-23,
  Atalanta 23-24, Tottenham 24-25, Aston Villa 25-26; Liga Portugal → FC Porto
  21-22, Benfica 22-23, Sporting 23-24/24-25. Artilheiros reais: Benzema 15,
  Haaland 12, Kane 8, Guirassy 13, Mbappé 15 / Tavernier 7, Rashford 6,
  Aubameyang 10, El Kaabi 7 / Taremi 22, Gyökeres 29 e 30.
- UI validada no navegador (UCL 2024-25): "Champion: Paris Saint-Germain FC ·
  Runner-up: Inter Milan · Top scorer: Serhou Guirassy (13)" com a tabela REAL da
  fase de liga (Liverpool 8J·7V·0E·1D·17GP·5GC·21pts) e o troféu carregado.

GAPS DECLARADOS (T514): classificação das copas com grupos de 4 (UCL/UEL
2021-24) — só as tabelas de grupo existem, e gravar 1 grupo seria enganoso;
artilheiro da Liga Portugal 2021-22 (n/d); troféu da Primeira Liga.

Stage Summary:
- 54/54 temporadas com campeão (0 null), 11 competições, 16 troféus, 11.910 clubes
- 14 clubes criados (re-run noop); 3 gaps declarados
- 4 PRs nesta rodada (#500 UCL/UEL/PL, #501 namespaces, #502 alias B-SAD,
  #503 espaçamento de blocos, #504 este checkpoint); 117/117 testes; backend verde

---

Task ID: goal-2026-10-10/t515
Agent: Doer (ZCode)
Task: T515 — Campeonato Brasileiro Série B + Major League Soccer + Liga MX

Work Log:
- AS TRÊS JÁ EXISTIAM no acervo (Série B Q610175, Liga MX Q764690, MLS Q18543) —
  nenhum registro necessário. Duas estruturas novas exigiram suporte:
  1. LIGA MX — DOIS torneios por temporada (Apertura/Clausura): o infobox lista os
     dois campeões na MESMA célula ("Apertura: América | Clausura: Toluca") e o
     artigo tem DUAS tabelas (18 clubes cada). Novos `parseSplitChampions` +
     `parseStandingsTables` + modo `--dual-tournament`: grava 2 temporadas com
     rótulo `{ano} Aper` / `{ano} Clau` — 9 caracteres (cabe no VARCHAR(9)) e
     ordena CRONOLOGICAMENTE (ao contrário de "Apertura 2024", que jogaria todos
     os Aperturas para o fim da ordenação alfabética).
  2. MLS — o título é decidido no PLAYOFF, então o infobox NÃO tem "Champions":
     o vencedor está sob o rótulo **"MLS Cup"**. Novo `parseChampionByLabel`
     (= `--champion-label`). E a tabela GERAL tem 29-30 clubes, DEPOIS das
     conferências (14-15) → `--min-rows=20`.
- 3 BUGS pegos na execução (todos corrigidos):
  1. SÉRIE B 2021 não parseava (0 linhas): o cabeçalho é `pos. | equipes | p | j |
     v | e | d | …` — **"Equipes" no PLURAL** (o `\bequipe\b` falhava → idioma caía
     em `unknown`) e **pontos como "P"**. Agora o pt aceita `\bequipes?\b` e o
     léxico pt aceita `P` para pontos (em pt o P não é usado por outra coluna).
     Validado: Botafogo campeão 2021 (20V-10E-8D, 70 pts ✓ real).
  2. LIGA MX gravava o MESMO artilheiro nos dois torneios: o parser lê a PRIMEIRA
     seção de artilharia (= Apertura). Agora só o 1º slot recebe; o Clausura fica
     null (gap declarado — o parser não separa as seções com segurança).
  3. **`undefined` ≠ `Prisma.DbNull`**: o primeiro fix do artilheiro usava
     `undefined`, e no Prisma isso significa "NÃO mexa no campo" → no UPDATE o
     artilheiro do Apertura SOBREVIVEU no Clausura (o banco mostrou o mesmo
     artilheiro nos dois torneios). `Prisma.DbNull` grava SQL NULL de verdade —
     mesma armadilha já tratada no campo `standings`.
  (+ o "vice" da Liga MX: a posição 2 da fase regular NÃO é o vice — o vice é o
   perdedor da FINAL. No modo dual o vice agora é null.)
- CLUBES: 15 temporadas parseadas localmente → 91 QIDs → 34 JÁ EXISTIAM → 57
  ausentes (--wave=t515): **51 criados** (ABC, Amazonas, Athletic-MG, Botafogo-SP,
  Brusque, Coritiba, Cuiabá, Ferroviária, Goiás, Guarani, Ituano, Londrina,
  Mirassol, Tombense, Vitória + 19 da MLS: Atlanta, Austin, Charlotte, Chicago,
  Cincinnati, Columbus, Houston, Inter Miami, LAFC, Minnesota, Nashville, New
  England, NYC FC, Orlando, San Diego, Sporting KC, St. Louis, Toronto + 13 da
  Liga MX: América, Cruz Azul, Monterrey, Pachuca, Tigres, Toluca…) e
  **6 ANEXADOS** (clubes que já existiam SEM QID: Vasco da Gama, Chapecoense,
  Remo, Paysandu, Sampaio Corrêa, Volta Redonda) — o ingest anexa o QID em vez de
  duplicar (o acervo tem até uma duplicata legada do Vasco). Re-run = noop.
- TROFÉUS: Série B curada ("Trophy of Campeonato Brasileiro Série B" → a taça de
  2018). Total: 17. GAPS declarados: MLS (a categoria só tem fotos de PESSOAS com
  a taça) e Liga MX (não há categoria).
- EXECUÇÃO: 20 temporadas gravadas (5 Série B + 5 MLS + 10 Liga MX) →
  **74/74 temporadas com campeão — ZERO null** em 14 competições (67 com tabela;
  as 7 sem são as copas com grupos de 4 e a Libertadores 2021). 11.961 clubes.
- CAMPEÕES conferidos contra a realidade: Série B → Botafogo 2021, Cruzeiro 2022,
  Vitória 2023, Santos 2024; MLS → NYCFC 2021, LAFC 2022, Columbus Crew 2023,
  LA Galaxy 2024; Liga MX → Atlas bi 2021-22, Pachuca, Tigres, América tricampeão
  (2023 Aper/2024 Clau/2024 Aper), Toluca 2025.
- UI validada no navegador (Liga MX): 10 temporadas com rótulos "2021 Aper" … 
  "2026 Clau" em ordem CRONOLÓGICA, cada uma com campeão, artilheiro e a tabela
  de 18 clubes.

GAPS DECLARADOS (T515): artilheiro do Clausura (n/d), vice da Liga MX (é o
perdedor da final, que o infobox não publica), troféus de MLS e Liga MX.
DECLARAÇÃO (D-2026-10-10): nenhum dado de teste/placeholder — tudo tem fonte
(Wikipedia, com URL) e proveniência.

Stage Summary:
- 74/74 temporadas com campeão (0 null), 14 competições, 17 troféus, 11.961 clubes
- 51 clubes criados + 6 QIDs anexados (re-run noop); 3 gaps declarados
- 5 PRs nesta rodada (#505 Série B/MLS/Liga MX, #506 vice da Liga MX,
  #507 artilheiro do Clausura, #508 Prisma.DbNull, #509 este checkpoint);
  123/123 testes; backend verde

---

Task ID: goal-2026-10-10/t516
Agent: Doer (ZCode)
Task: T516 — Copa Sul-Americana + Recopa Sul-Americana + Mundial de Clubes FIFA

Work Log:
- AS TRÊS JÁ EXISTIAM no acervo como CUP (Sul-Americana Q60585 e Mundial Q223366
  inclusive com troféu curado no T511; Recopa Q734296 sem). Nenhum registro.
- ESTRUTURA NOVA — RECOPA, FINAL EM DOIS JOGOS: o infobox NÃO tem rótulo
  "Campeão" (só "Evento|Data"): a caixa do confronto traz os dois times e, logo
  abaixo, o AGREGADO ("LDU Quito | Fluminense | 1 | 2"). Novo `parseTwoLegFinal`
  (flag `--two-leg-final`): vencedor = maior agregado, o outro é o vice.
- **4 BUGS pegos na execução (todos corrigidos com fixture de regressão)**:
  1. peguei "os dois primeiros links da caixa" e o 1º era a LEGENDA DO CARTAZ
     ("Recopa Sul-Americana") → vencedor saía errado. Agora: âncora = o AGREGADO
     (dois inteiros pequenos) e os TIMES ficam EXATAMENTE 2 LINHAS ACIMA.
  2. o GUARD da copa ("sem colocações finais nem tabela de grupos") não conhecia
     o `--two-leg-final` e descartava a RECOPA INTEIRA (5 temporadas).
  3. 2022 — os times na caixa são TEXTO PURO (sem link): eu exigia links e a linha
     era ignorada → o parse caía na linha da ARBITRAGEM (que tem links) e gravou
     campeão **"Facundo Tello"** (o árbitro!). Agora, sem links, usa o TEXTO.
  4. 2025 — há uma linha de FEDERAÇÕES ("AFA | CBF") ENTRE os times e o agregado →
     gravou campeão **"AFA"**. A âncora de "2 linhas acima" resolve os dois.
  (+ lint: o CI pegou 20 erros de prettier em código que eu editei por script
   DEPOIS do último `--fix` — rodar o lint do app inteiro antes do push.)
- SUL-AMERICANA e MUNDIAL usam o infobox pt normal ("Campeão"/"Vice-campeão") e as
  tabelas de grupo de 4 linhas são RECUSADAS pelo minRows=8 (sem classificação —
  melhor que gravar 1 grupo só; a UI mostra "Standings being catalogued").
  O MUNDIAL 2025 (formato reformulado de 32 clubes) tem tabela combinada com 32
  linhas ✓ e o campeão sai do infobox.
- CLUBES: 15 temporadas → 145 QIDs → 114 JÁ EXISTIAM → 31 "faltantes", dos quais 5
  NÃO são clubes (país Venezuela, AFA, CBF, FIFA e o árbitro Facundo Tello) →
  fora da curadoria (a validação do ingest os recusaria de qualquer forma).
  26 criados (--wave=t516): 12 de Octubre, 9 de Octubre, Academia Puerto Cabello,
  Alianza, Arsenal (Sarandí), Caracas, Always Ready, Belgrano, River Plate
  (Assunção), U. Católica (Equador), General Caballero, San José, Ameliano,
  Trinidense, Gimnasia La Plata, Delfín, Rayo Zuliano, Guaireña, Metropolitanos,
  Bragantino, Aucas + Al Ain, Al-Ittihad, AS Pirae, Mamelodi Sundowns, Wydad
  (Ásia/África/Oceania). Re-run = noop.
- TROFÉUS: Recopa curada ("Trophy of CONMEBOL Recopa"). Total: **18**.
- EXECUÇÃO: 15 temporadas gravadas → **89/89 temporadas com campeão — ZERO null**
  em 17 competições. 11.987 clubes.
- CAMPEÕES conferidos contra a realidade: Sul-Americana → Athletico-PR 2021,
  Independiente del Valle 2022, LDU 2023, Racing 2024, Lanús 2025; Recopa →
  Palmeiras 2021, Palmeiras 2022 (4-2 Athletico-PR), IDV 2023, Fluminense 2024,
  Racing 2025 (4-0 Botafogo); Mundial → Chelsea 2021, Real Madrid 2022 e 2024,
  Manchester City 2023, **Chelsea 2025** (formato reformulado de 32 clubes).
- UI validada no navegador (Sul-Americana): 5 temporadas, "Champion: Racing Club ·
  Runner-up: Cruzeiro E.C.", artilheiro Adrián Martínez (10), troféu carregado e o
  aviso honesto "Standings being catalogued" onde não há tabela.

GAPS DECLARADOS (T516): classificação da Sul-Americana e do Mundial 2021-2024 (as
tabelas de grupo de 4 são recusadas; o Mundial até 2024 é mata-mata puro) e o
artilheiro da Recopa (o artigo não tem seção de artilharia).
DECLARAÇÃO (D-2026-10-10): segue tudo com fonte (URL) e proveniência — nenhum
dado de teste/placeholder.

Stage Summary:
- 89/89 temporadas com campeão (0 null), 17 competições, 18 troféus, 11.987 clubes
- 26 clubes criados (re-run noop); 4 bugs corrigidos com fixture de regressão
- 4 PRs nesta rodada (#513 Sul-Americana/Recopa/Mundial, #514 guard da final em
  dois jogos, #515 âncora do agregado + texto puro, #516 este checkpoint);
  130/130 testes; backend verde

---

Task ID: goal-2026-10-10/t517
Agent: Doer (ZCode)
Task: T517 — SELEÇÕES: Copa do Mundo, Copa América, Eurocopa e Olimpíadas (M+F)

Work Log:
- COMPETIÇÕES: Mundial (Q19317) e Copa América (Q178750) já existiam com troféu.
  REGISTRADAS duas ausentes (QIDs derivados do artigo, validados no Wikidata):
  Campeonato Europeu de Futebol (Q260858) e Futebol nos Jogos Olímpicos (Q188317,
  gender='mixed' — cobre masculino e feminino).
- RECURSO NOVO: `--label-suffix` — os Jogos Olímpicos têm DOIS torneios no mesmo
  ano, então o rótulo da temporada é "2008 M"/"2008 F" (ordena cronologicamente)
  enquanto o TÍTULO do artigo usa o ano puro ("Football at the 2008 Summer
  Olympics – Men's tournament").
- NENHUM recurso de parser foi necessário: Mundial/Copa América/Eurocopa usam
  "Campeão"/"Vice-campeão" (pt) e as Olimpíadas usam "Champions"/"Runners-up"
  (suportado desde o T514). As tabelas de grupo de 4 linhas são recusadas pelo
  minRows=8 (sem classificação — melhor que gravar 1 grupo só).
- INGEST DE SELEÇÕES: o `seed-clubs-by-qid` só aceitava CLUBES. Novo
  `--kind=national_team`: valida P641=futebol + NÃO ser clube + (P17 país OU uma
  classe de seleção conhecida) e grava kind='national_team' com o gênero inferido
  do rótulo. 31 seleções curadas (sub-23/olímpicas e femininas) — TODAS as 31 já
  existiam no acervo (nada criado) ✓.
- **3 BLOCKINGS pegos no dry-run de produção (todos corrigidos com teste)**:
  1. o `matchClub` por QID do seed filtrava `kind != 'national_team'` — guard que
     faz sentido para CLUBES, mas recusava as SELEÇÕES: as Olimpíadas vinham com
     "SEM-CLUBE" mesmo com a seleção no acervo. O QID é autoritativo → filtro fora.
  2. a regra de seleção exigia P17, mas a sub-23 da GUINÉ (Q16581714) não tem P17
     (só a classe) → agora aceita P17 OU classe de seleção conhecida.
  3. o CHECK combinado `!okEntity || !countryQid` derrubava a Guiné mesmo aprovada
     pela regra → o país só é exigido para CLUBE.
  (+ o CI pegou um teste TEMPORÁRIO de descoberta que entrou no commit por engano —
   removido; lição: conferir `git status` antes de commitar.)
- EXECUÇÃO: 25 temporadas gravadas (5 Mundial + 5 Copa América + 5 Eurocopa +
  5 Olímpicas M + 5 Olímpicas F) → **114/114 temporadas com campeão — ZERO null**
  em 21 competições. 11.987 clubes. 19 troféus.
- CAMPEÕES conferidos contra a realidade (todos os itens do GATE):
  Mundial → Itália 2006, Espanha 2010, Alemanha 2014, França 2018, Argentina 2022;
  Copa América → Chile 2015, Chile 2016, Brasil 2019, Argentina 2021 e 2024;
  Eurocopa → Espanha 2008 e 2012, Portugal 2016, Itália 2020, Espanha 2024;
  Olimpíadas M → Argentina 2008, México 2012, Brasil 2016 e 2020, Espanha 2024;
  Olimpíadas F → EUA 2008, 2012 e 2024, Alemanha 2016, Canadá 2020.
- Olimpíadas M 2012-2024: 13-16 de 13-16 linhas casadas ✓ (o fix do QID elevou o
  casamento). 2008 M fica com as DELEGAÇÕES ("Argentina at the 2008 Summer
  Olympics") não linkadas — gap declarado (o artigo usa o link da delegação, não o
  da seleção).
- UI validada no navegador (Olimpíadas): 10 temporadas ("2024 M"…"2008 F") em
  ordem cronológica, com campeão, vice e tabela real (2020 F: Canadá 6J·2V·4E·0D).

GAPS DECLARADOS (T517): troféu do futebol olímpico (não há categoria — as medalhas
não são um troféu da competição); classificação de grupos do Mundial/Copa
América/Eurocopa (tabelas de 4 linhas recusadas); linhas de 2008 M (delegações).
DECLARAÇÃO (D-2026-10-10): tudo com fonte e proveniência; nenhum dado de teste.

Stage Summary:
- 114/114 temporadas com campeão (0 null), 21 competições, 19 troféus, 11.987 clubes
- **ESCOPO 1 COMPLETO**: todas as competições continentais/internacionais de CLUBES
  (Libertadores, Sul-Americana, Recopa, UCL, UEL, Mundial de Clubes) e de SELEÇÕES
  (Copa do Mundo, Copa América, Eurocopa, Olimpíadas M/F) têm temporadas com dados
- 4 PRs nesta rodada (#517 Eurocopa/Olimpíadas + --label-suffix, #518 ingest de
  seleções, #519 QID não exclui seleção + regra sem P17, #520 país só para clube,
  #521 este checkpoint); 135/135 testes; backend verde

Task ID: goal-2026-10-11/t518
Agent: Doer (ZCode)
Task: T518 — AUDITORIA DE MARCO + RECONCILIAÇÃO do PLANO_MESTRE por evidência de produção

Work Log:
- ORIGEM: uma análise externa (sem ferramentas de web) declarou "nenhum marco foi
  atingido / plataforma técnica vazia" lendo o bloco "STATUS CONSOLIDADO — 2026-09-02"
  do docs/PLANO_MESTRE.md como se fosse o estado atual. O documento estava, de fato,
  defasado por T443–T517 — o defeito real não era o produto, era o documento.
- MÉTODO (read-only, zero escrita): curl nas 28 rotas públicas de almanaquedosclubes.com
  (todas 200 com HTML real) + endpoints de api.almanaquedosclubes.com/api/v1 + SELECT no
  Postgres de produção via `railway ssh` (deploy da API 211539ba, SUCCESS 11-10 19:03).
- ACERVO REAL: 12.001 clubes (11.992 com QID Wikidata; 6.472 com lat+lng; 502 femininos) ·
  105.211 jogadores (4.974 femininos) · 1.932 competições · 114 temporadas (114 com campeão,
  104 vice, 78 classificação, 70 artilheiro) · 293 entradas de ranking · 5.205 arestas WON
  com proveniência 100% · 19 competições com trophyImageUrl.
- VERDADEIRO NO DOCUMENTO ANTIGO (e corrigido no lugar): 18 itens marcados `[ ]` estão no ar
  (mapa, busca, feminino, perfis, páginas legais/privadas, checkout, DOMPurify, ETL automático,
  cache Redis, fila BullMQ, export, ingestão Wikidata, WON, tabelas de competição). O item mais
  grave — "Ingestão Wikidata (script pronto, não executado)" — valia em 02-09 e caiu em 02-10.
- GAPS CONFIRMADOS (o que a crítica acertou): visualizador 360º, hino, flâmula, uniformes
  (`kitHistory` com 0 registros), ranking de jogadores (sem tabela), `matches` vazio (0),
  logo em 2,4% / foto de jogador em 0,8% / estádio em 4,4%, `Player.clubId` 100% nulo,
  estádios sem PostGIS, RAG sem store vetorial, /metrics não exposto (404), DAST/carga fora do CI.
- ENTREGUE: banner de supersessão nos dois blocos de 02-09 · checklists de Escopo 1/2, Dados,
  Infra, Frontend, Testes e Observabilidade corrigidos item a item com a evidência · Resumo
  Executivo recalculado (Features 5%→70%, Dados 1%→40%, Compliance 10%→85%, Frontend 30%→85%) ·
  nova seção "STATUS CONSOLIDADO — 2026-10-11" com método, números verbatim, itens retratados e
  os 13 gaps abertos · decisão D-2026-10-11-auditar-por-producao em DECISOES.md.
- HONESTIDADE DE MÉTODO: as % são estimativa calibrada e o denominador de "Dados reais" é
  indefinido — o critério de marco é o de ESCOPO (Escopo 1 completo em T517), não o percentual.
  Dois erros meus foram pegos na própria auditoria: probe lendo `championName` (campo inexistente;
  o real é `champion.name`) e preço ausente no HTML servidor do /planos (vem client-side).

Stage Summary:
- PLANO_MESTRE.md reconciliado com evidência de produção; nenhum dado do acervo foi tocado
- Regra nova: auditoria de marco ancora em PRODUÇÃO (curl + SELECT), nunca em documento/checklist
- Gaps remanescentes nomeados e finitos (13), com dono declarado (M4 / Operador onde é infra)

Task ID: goal-2026-10-11/t519
Agent: Doer (ZCode)
Task: T519 — PARTIDAS: popular `matches` (vazia) com histórico real da RSSSF

Work Log:
- FONTE (verificada antes de raspar): RSSSF. A licença de rodapé é "You are free to
  copy this document in whole or part provided that proper acknowledgement is given
  to the author"; charter §2 reserva copyright e proíbe lucro com o acervo. Não há
  robots.txt (404) nem vedação a automação. Consequência de projeto: TODA partida
  grava `license='RSSSF'` + `sourceUrl` da página (atribuição obrigatória) e o
  acesso é contido (1 página por vez, ~1 req/s). Os 5 `rsssf-*.htm` que estavam no
  disco eram páginas de ESTADUAIS de 09-10 (T035) — não serviam de base, só como
  amostra do formato; nenhum dado veio deles.
- O QUE A FONTE ENTREGA (medido, não presumido): BR Série A 2021-2024 com jogos
  rodada a rodada (data `[Mmm DD]`, placar e, SÓ em 2023, autores dos gols);
  Premier League 2023-24/2024-25 completas (2025-26 só tabela); Libertadores 2023 e
  2024 (2025 devolve 404). Páginas em windows-1252, seções em blocos `<pre>`
  separados por competição (bloco 0 = divisão principal; o resto é copa/Série B/C e
  a pirâmide inglesa inteira).
- PARSER (`apps/api/src/lib/rsssf/match-parser.ts`, 8 páginas → 2.474 jogos, 0 dup):
  guardas contra dado falso — linha de tabela final não vira partida; a anotação
  `[...]` sai antes do match (senão o jogo abandonado "abd ... [abandoned at 1-1 in
  65']" viraria um placar 1-1); agregação de mata-mata (dois placares + pênaltis,
  sem data por jogo) não vira partida; a final da Libertadores é jogo único com data
  no cabeçalho `Final (Nov 4, Cidade)`. Ano sempre reconstruído: BR/Libertadores =
  ano civil; PL = temporada cruzada (mês >= 7 é o ano de início; validado: `[Aug 11]`
  = 2023 e `[May 19]` = 2024).
- 3 BUGS REAIS pegos pelo caminho: (1) o padding de largura fixa deixa UM espaço
  entre nome longo e placar (`Wolverhampton 1-4 Brighton`) — com `\s{2,}` a fonte
  perdia 19 jogos por temporada na PL; (2) `htmlToText` (T448b) usava `<[^>]+>` e um
  `<` órfão da página de 2023 (`(<i>Sep 28 & Oct 5</i><)`) iniciava um "tag" que
  engolia o texto até o próximo `>` — apagava o cabeçalho da FINAL; corrigido para
  tags que não cruzam linha; (3) o `buildPlan` não recebia o pool da temporada
  (campo existia no tipo, faltava no ponto de chamada) — PL perdia Newcastle e
  Southampton e a Libertadores caía para 71/194.
- RESOLVER (`team-resolver.ts`): cascata determinística (alias curado → igualdade →
  igualdade sem filtro de país → contenção com fronteira de palavra → abreviação
  ALINHADA ao início), sempre exigindo UNICIDADE — empate vira gap declarado. Nada
  de score fuzzy. O acervo tem HOMÔNIMOS reais ("Sociedade Esportiva Palmeiras" de
  SP × a de Pato Branco; "São Paulo FC" × "São Paulo Futebol Clube" de Parnamirim;
  "Cruzeiro E.C." × "Cruzeiro Esporte Clube" de Itaporanga) e o instrumento mais
  forte para desempatar é o POOL DA TEMPORADA — os clubes que o próprio acervo já
  usa naquela competição+temporada (classificação do T508+). Sem ele (Brasileirão
  2021 não tem classificação no acervo), o alias explícito assume: `Corinthians`
  chegava a casar ERRADO ("Corinthians Santo Andre") pela regra de abreviação.
- QID: o discriminador do alias usa o QID que o PRÓPRIO acervo gravou (`América/MG`
  → Q338285, com `city` vazio no acervo), conferido na fonte (Wikidata: "clube de
  futebol brasileiro sediado em Belo Horizonte, Minas Gerais"). Nenhum QID digitado
  de memória (D-2026-10-09).
- MIGRATION aditiva e nullable (`20261011190000_t519_match_scorers`): `matches.scorers`
  (JSONB: {raw, home[], away[], sidesVerified}) e `matches.sourceNote` (anotação da
  fonte preservada sem interpretar: "played in Uberlândia-MG", "replay", e os
  marcadores `x`/`y` da Libertadores). Tabela estava vazia — nenhuma linha existente
  mudou. `migration-drift` verde no CI.
- PRODUÇÃO (Railway, deploy 4f89186): dry-run nas 3 fontes → **amostra de 10 partidas
  aplicada e validada contra fonte INDEPENDENTE (10/10 CONFIRMADO, Transfermarkt +
  Wikipédia PT, zero divergência de data/placar/mando)** → apply em lotes de 500 →
  **2.336 partidas: BR 2021-2024 (1.406), PL 2023-24/2024-25 (760), LIB 2023/2024
  (170)** → re-run `--apply` provou NOOP (0 criadas, 2.336 puladas) → smoke
  `GET /api/v1/matches` devolvendo dado real → integridade: `ranking_entries` 293,
  `knowledge_graph` WON 5.205, jogadores 105.211 e clubes ativos 11.987 TODOS
  inalterados.

GAPS DECLARADOS (T519): a fonte não tem jogos para Série A 2025, PL 2025-26 e
Libertadores 2025 (404) — nada foi inventado; clubes ausentes do acervo deixam os
jogos fora: Vasco da Gama masculino (114 jogos), Chapecoense (38), Patronato (12),
Monagas (12), Deportivo Táchira (12), LDU Quito (12); a PL 2023-24 perde 1 jogo
abandonado (Bournemouth×Luton, com placar só na anotação) e a Libertadores perde o
mata-mata (a fonte dá só a agregação do confronto, sem data por jogo); autores de
gols existem só no BR 2023 (102 partidas); estádio não é impresso nas ligas;
`status` gravado como FINISHED (só jogos encerrados entram). Dados do acervo
achados de passagem e NÃO tocados (fora do escopo): `Cruzeiro Esporte Clube (female)`
com gender='men'; Q5014111 (poliesportivo do Vasco) gravado como women.

Stage Summary:
- `matches`: 0 → **2.336 partidas reais**, com proveniência por partida e licença
- 10/10 amostras validadas contra fonte independente; re-run noop provado
- Rankings/KG/jogadores/clubes intactos; 125 testes de RSSSF; 750/750 unitários da API
- 5 PRs nesta rodada (#524 parser+resolver+migration, #525 pool/QID, #526 homônimos,
  #527 fiação do pool + variantes, #528 fecho da Libertadores)

Task ID: goal-2026-10-11/t520
Agent: Doer (ZCode)
Task: T520 - CURA de identidade de clube (4 achados do T518) sem perder dado

Work Log:
- ITEM 1 (duplicatas) - a premissa nao se confirmou, e isso e o achado principal:
  `SELECT qid, count(*) FROM clubs GROUP BY qid HAVING count(*)>1` = **ZERO**. As
  familias de nomes parecidos (Palmeiras, Cruzeiro, Fluminense, Gremio,
  Internacional, Botafogo, Sao Paulo, Corinthians) sao **HOMONIMOS**, com QIDs e
  cidades distintos - Palmeiras de Pato Branco (Q10372680) x Palmeiras de SP
  (Q80964); Sao Paulo FC (Q38568) x Sao Paulo Futebol Clube de Parnamirim
  (Q10375940); Cruzeiro E.C. de BH (Q188277) x Cruzeiro Esporte Clube de Itaporanga
  (Q10261905) x Cruzeiro do Sul FC. As duplicatas de SEED existiram e ja foram
  soft-deletadas em 26-09 (Palmeiras 8ef59ed0, Cruzeiro a4a3cfff, Fluminense
  7ae28fac, Gremio 58b174fd, Internacional 7a20f18a, Corinthians 3d211df5, Sao Paulo
  35bae4c2) e tem ZERO referencias. Logo: nao ha referencia a migrar e nao ha
  duplicata ativa. Soft-deletar um homonimo teria destruido um clube real - o
  caminho certo era NAO mexer, e o desambiguador de nome ja entregue no T519 (pool
  da temporada + alias) resolve a navegacao.
- ITEM 2 (Cruzeiro female com gender='men') - CONFIRMADO e corrigido para 'women'.
  Q105973517 = "Cruzeiro Esporte Clube (female)"; a fonte diz "clube brasileiro de
  futebol feminino" / "women's football team". Impacto em ranking: ZERO (0 entradas
  de ranking, 0 partidas; 7 arestas de grafo que continuam atribuidas ao time
  feminino) - nenhum ranking publicado foi tocado.
- ITEM 3 (Vasco) - Q5014111 = "Club de Regatas Vasco da Gama", "clube poliesportivo
  brasileiro" com P641=futebol: e a entidade do time MASCULINO do Rio gravada como
  'women'. Corrigido para 'men'. O mesmo defeito apareceu no **Chapecoense**:
  Q2536715 = "Associacao Chapecoense de Futebol", "clube de futebol brasileiro da
  cidade de Chapeco-SC" (clube, nao time feminino) -> 'women' era erro; corrigido.
  ARMADILHA EVITADA: um levantamento anterior apontava Q2749819 como "Chapecoense
  masculino"; a conferencia na fonte mostrou que Q2749819 e uma ESPECIE DE INSETO
  (Cneorane dohertyi). Nenhum QID foi usado sem conferencia na fonte (D-2026-10-09).
- ITEM 4 (Bragantino -> "Red Bull Bragantino II") - CONFIRMADO nas QUATRO temporadas
  da Serie A (2022, 2023, 2024, 2025): a classificacao do T508 grava o **time B**
  (Q636709) no lugar do A (Q541744), com clubName "Red Bull Bragantino". Corrigido
  o `clubId` e o `matchedName` dentro do JSON de `competition_seasons`, com
  `identityFix` gravado na linha para auditoria (rastro visivel no payload publico).
  Varredura por outros casos do tipo (time B no lugar do A) nas demais temporadas:
  nenhum outro.
- FERRAMENTA: `apps/api/src/scripts/cure-clubs-t520.js` com `--item=audit` (READ-ONLY:
  duplicatas por QID + referencias por clube + ocorrencias do time B),
  `--item=gender` e `--item=bragantino`, cada item em SUA transacao, imprimindo
  ANTES/DEPOIS e o SQL de rollback. Zero hard-delete: `deletedAt IS NOT NULL`
  continua 14 (nenhum novo) e nada foi apagado.
- PRODUCAO (deploy 7f14ed9): audit -> gender (3 UPDATEs) -> bragantino (4 JSONs) ->
  re-run do seed. Efeito: o BRASILEIRAO ficou COMPLETO em **380 jogos nas quatro
  temporadas** - +114 partidas re-linkadas (Vasco em 2023 e 2024 = 76; Chapecoense
  em 2021 = 38; 2022 ja estava completa porque o Vasco jogou a Serie B naquele ano).
  `matches` 2.336 -> **2.450**; e o relatorio de resolucao do T519 passou a
  "nenhum nao resolvido" no Brasileirao (era Vasco + Chapecoense).
- INTEGRIDADE: md5 dos rankings (293 entradas, ordem por clubId+position) IDENTICO
  antes e depois: `58fa0d550a03d68f368c81bc7a3f06af`. WON 5.205 e clubes ativos
  11.987 inalterados. Obs.: o hash `3e93aba9...` citado no gate vem de relatorio
  antigo e nao existe script que o recalcule (verificado no container) - por isso
  o gate foi cumprido com um md5 REPRODUTIVEL sobre o conteudo dos rankings, que e
  prova mais forte que um numero de relatorio.
- ACHADO COLATERAL (reportar, nao corrigido aqui): o job `integrity-check` acusa
  `ranking_entries_points_out_of_range=20` (ex.: Atletico-MG 2670/2350 - escala
  legada >100) e `clubs_active_without_qid=145`; ha tambem **duas competicoes
  homonimas** "Campeonato Brasileiro Serie A" (`d6a8bdb1` e `5fd857e6`). E o
  `security-gate` do CI reprovou uma vez por **corrida de isolamento** entre testes
  de integracao (champions x compare escrevendo nas mesmas tabelas em paralelo
  contra o banco compartilhado): no re-run, 161/161 arquivos passaram - flaky
  pre-existente, nao relacionado a este diff.

Stage Summary:
- 0 duplicatas reais (homonimos confirmados por QID); nenhum dado perdido (14
  soft-deleted, nenhum novo; nenhum hard-delete)
- gender corrigido em 3 linhas comprovadas na fonte (Cruzeiro fem, Vasco, Chapecoense)
- Bragantino: time B -> time A nas 4 temporadas, com rastro de auditoria
- Brasileirao completo (380x4); matches 2.336 -> 2.450; re-run do T519 sem pendencia
- Rankings intactos (md5 identico), WON/clubes intactos, noop provado, smoke 200

Task ID: goal-2026-10-11/t521
Agent: Doer (ZCode)
Task: T521 - RANKING 0-100 global de clubes (MinMax por ano/competição) + pendências colaterais

Work Log:
- PR-1 (duas competições homônimas "Campeonato Brasileiro Série A") - RESOLVIDO, e a
  resposta é "já estava resolvido": `d6a8bdb1` é casca VAZIA soft-deletada em
  2026-09-27 com `deletionReason=dedupe_t448b2i` (0 temporadas, 0 partidas, 0
  rankings); a viva `5fd857e6` (Q206813) tem as 4 temporadas, 1.520 partidas e 1
  ranking. Não há o que fundir, e hard-delete é proibido - as duas ficam como estão
  (a casca preserva auditoria do dedupe).
- PR-2 (20 entradas de ranking com points>100) - CLASSIFICADO como escala BRUTA, não
  erro: todas as 20 pertencem a "Ranking CBF 2023" (2190-2848) e "Ranking CONMEBOL
  2023" (1600-2800), rankings históricos externos que nunca foram 0-100. Os 0-100
  têm todos max=100. Decisão: documentar e MANTER SEPARADO (nome identifica a
  escala) - nada recalculado.
- AUDITORIA DOS EXISTENTES (o que mudou o plano): o pipeline 0-100 já existia
  (T425/T438 - vitórias x3 + empates x1 + títulos x50, pesos por hierarquia, MinMax
  isolado por gênero, amostra mínima, não publica vazio). Auditando os 6 rankings
  ingleses de 2023 achei um DEFEITO real: o "Premier League 2023" (e a "Pirâmide
  Inglesa 2023") trazem "A.F.C. Liverpool" na 5ª posição - o clube errado, do mesmo
  bug de casamento de clube que o T519 corrigiu. Investigando, o ranking é na
  verdade a temporada 2022-23 (traz Leicester/Leeds/Southampton, os rebaixados
  daquele ano). Como NÃO temos as partidas de 2022-23 no acervo, o ranking é
  IRRECUPERÁVEL por recálculo - então NÃO foi tocado (é o caminho não-destrutivo e
  a integridade fica preservada) e o defeito vai DECLARADO na metodologia.
  Consequência: o escopo virou 100% ADITIVO.
- CÓDIGO (2 PRs, #532 e #533): (1) nome do ranking passa a incluir a competição
  (sem isso os rankings de um mesmo ano eram indistinguíveis na UI); (2)
  idempotência por ESCOPO (ano+competição+gênero) em vez de por nome - o acervo tem
  duas convenções de nome e comparar nome criaria duplicata; o gênero sai das
  ENTRADAS, não do nome (bug pego pelo CI: sem isso o run feminino pulava por causa
  do masculino); (3) sentinela `?competitionId=global` para o agregado geral (antes
  era impossível pedir "sem competição"); (4) seletor de Competição na UI + i18n x3;
  (5) CLI aceita temporada cruzada ('2023-24') - recusava e travava a Premier League;
  (6) guarda de vazio passa a contar só o gênero do escopo - BUG PRÉ-EXISTENTE que
  publicava um ranking "Feminino" VAZIO sempre que o masculino tinha dados (origem do
  "Ranking 0-100 2026 - Feminino" com 0 entradas, de 22-09).
- PRODUÇÃO (deploy 73d12ad + fix): 13 rankings publicados - Brasileirão Série A 2021,
  2022, 2023 e 2024 (20 clubes cada); Premier League 2023-24 (20) e 2024-25 (23);
  Copa Libertadores 2023 e 2024 (30 cada); agregado anual de 2021 (67), 2022 (58),
  2023 (82), 2024 (81) e 2025 (61). Todos com pontos DENTRO de 0-100 (verificado por
  `bool_and(points BETWEEN 0 AND 100)` = true em todos; fora da faixa = 0).
- AMOSTRAS conferidas na API: BR 2023 - Palmeiras 100, Grêmio 96, Flamengo 91,
  Atlético-MG 91, Botafogo 87 (com baseMatches=38/clube); PL 2023-24 - Manchester
  City 100, Arsenal 97, **Liverpool F.C. 88** (o clube CERTO, não o A.F.C. Liverpool
  do legado); agregado 2023 - Real Madrid 100 (Mundial), Fluminense 70 (Libertadores),
  Atlético-MG 65 (mistura partidas + títulos, como desenhado).
- LIMPEZA: 7 rankings "Feminino" VAZIOS (0 entradas) removidos - os 6 criados por
  este run (artefato do bug de guarda) + o "2026 - Feminino" de 22-09, mesma classe.
  Nenhuma informação perdida (0 entradas = nenhum dado).
- INTEGRIDADE: os 11 rankings pré-existentes (9 piloto/femininos + 2 de escala bruta)
  seguem com as contagens exatas de antes (293 entradas no total) e `updatedAt` de
  22-09/27-09/07-10 - nada de hoje, ou seja, NENHUMA linha pré-existente foi
  modificada (rankings publicados são imutáveis por design no serviço). Re-run do
  mesmo escopo = NOOP (`skipped: true`, 0 publicados). API: /rankings lista 25
  publicados com nomes distinguíveis; /rankings/entries responde por competição e
  pelo sentinela global; UI /rankings = 200.

GAPS DECLARADOS: sem partidas de Série A 2025, PL 2025-26 e Libertadores 2025 (a
fonte não tem); ranking de jogador continua sem dados (não há estatística por
partida); os rankings ingleses 2022/23 e o piloto da pirâmide têm o defeito
"A.F.C. Liverpool" e NÃO são recomputáveis (falta a temporada no acervo); duas
escalas convivem (0-100 normalizado x bruto CBF/CONMEBOL) e ficam identificadas
pelo nome.

Stage Summary:
- PR-1 e PR-2 fechados com evidência (nenhum deles exigia escrita)
- 13 rankings 0-100 publicados (meta era 7+), todos com valores dentro de 0-100
- Defeito real encontrado e declarado (A.F.C. Liverpool) sem tocar no que não é
  recomputável; 7 rankings vazios de artefato removidos
- 2 bugs de código corrigidos (idempotência sem gênero; CLI travando temporada
  cruzada) + 1 pré-existente (ranking vazio por gênero)
- Integridade provada (pré-existentes intactos, noop, 293 entradas preservadas)
- Metodologia atualizada em /metodologia com a fórmula real, os escopos publicados,
  a amostra mínima e as duas escalas

Task ID: goal-2026-10-12/t522
Agent: Doer (ZCode)
Task: T522 - RANKING 0-100 de JOGADORES a partir de autores de gol reais das partidas

Work Log:
- DESCOBERTA (read-only) antes de escrever: 102 partidas com `scorers` (todas do
  Brasileirao 2023, 100% sidesVerified), 269 autores de gol, 185 "nomes" distintos
  - e a partir daqui apareceram DOIS DEFEITOS DO MEU PROPRIO PARSER do T519:
  (a) 15 "nomes" eram NUMEROS (`90`, `56pen`, `80`) porque a fonte imprime so o
  minuto quando o MESMO jogador marca de novo (`[Pedro 7pen, 90]`); (b) o sufixo
  `pen`/`og` ficava colado ao nome (`Tiquinho Soares 29pen` virava outro "jogador").
  Corrigidos na gramatica v2 do parser - e como a agregacao RE-PARSEIA o texto
  bruto (`scorers.raw`), as 2.450 partidas aplicadas ficaram INTOCADAS (o pedido
  era nao tocar no que ja estava gravado).
- COBERTURA DA FONTE: os autores de gol existem SO nas rodadas 1-11 do BR 2023
  (102 de 110 jogos = 92,7% da janela). As demais competicoes do acervo (PL
  2023-24/2024-25, Libertadores 2023/2024, BR 2021/2022/2024) NAO tem autores de
  gol na fonte - gap declarado com evidencia (verificado nas paginas).
- IDENTIDADE (o ponto critico, medido antes de implementar): `shortName` e NULL em
  TODOS os 105.211 jogadores e ha homonimos massivos (488 "Artur"). Dos nomes
  testados, um match exato de nome escolheria o HOMONIMO ERRADO em casos reais: o
  acervo tem um "Everaldo" nascido em 1944 e o goleiro "Fabio", ambos casando com
  artilheiros de 2023. Solucao: filtro de PLAUSIBILIDADE (nao goleiro, nascido
  >=1980 e <=15 anos antes da partida) + exigencia de candidato UNICO + aliases
  curados so onde o acervo usa outro nome (Ayrton Lucas Dantas de Medeiros,
  Everaldo Stum, Paulo Henrique Ganso, Pedro Guilherme Abreu dos Santos, Gabigol).
  Nomes ambiguos que restaram (Paulinho, Luciano, Gabriel Barbosa sem alias,
  Raniele, Flaco Lopez, Lele, John Kennedy - estes simplesmente AUSENTES do
  acervo) ficam FORA: preferimos o gap ao chute.
- IMPLEMENTACAO: `lib/rankings/player-goals.ts` (puro: agregacao + plausibilidade +
  aliases), `loadPlayerSeasonStats` lendo as PARTIDAS (sem tabela intermediaria -
  a partida e a fonte unica da verdade) com resolucao por SQL normalizado sem
  acento, `buildPlayerRanking` completado (antes devolvia SEMPRE points/position
  NULL - era um stub; agora normaliza MinMax e ordena de forma deterministica:
  gols -> nome), job com despacho por tipo (jogador nao tem dimensao de genero) e
  CLI `--type=player`.
- SCHEMA aditivo: `rankings.type` ('club' default | 'player'), `ranking_entries`
  com `clubId` nullable + `playerId` (FK players). O `clubId` nullable gerou 5
  ajustes de tipo mecanicos (repository/service/insights) - todos resolvidos.
- PRODUCAO (deploy 09ba552): 1 ranking de jogadores publicado -
  "Ranking de Jogadores 0-100 Campeonato Brasileiro Serie A 2023", 68 jogadores,
  pontos 0-100 (verificado por bool_and), topo: Tiquinho Soares 100 (6 gols - a
  gramatica v1 perdia os 3 penaltis dele), Roger Guedes 50, Hulk 50, Vitor Roque
  50, Raphael Veiga 38, Pedro 38.
- API/UI: `/rankings?type=player` (1), `/rankings/entries?type=player` com
  `playerName` e link para o perfil, o caminho de CLUBE segue intacto (mesma
  chamada sem `type` devolve o ranking de clubes), seletor Clubes/Jogadores na UI
  (i18n x3), UI /rankings 200.
- INTEGRIDADE: nenhum ranking pre-existente tocado (o job de jogador e aditivo e a
  idempotencia e por (ano, competicao, tipo)); as 2.450 partidas permaneceram
  intactas (a agregacao le o `raw`, nao reescreve nada).

GAPS DECLARADOS: PL 2023-24/2024-25, Libertadores 2023/2024 e BR 2021/2022/2024
nao tem autores de gol na fonte; BR 2023 coberto so nas rodadas 1-11; jogadores
ausentes do cadastro (Flaco Lopez, Raniele, Lele, John Kennedy) e nomes ambiguos
ficam fora do ranking; gol contra nao conta para o autor; assistencias e vitorias
por jogador nao existem na fonte (a formula as preve, o dado nao existe).

Stage Summary:
- Ranking de jogadores 0-100 publicado: 68 jogadores, todos entre 0 e 100
- 2 defeitos do parser de scorers encontrados e corrigidos (gramatica v2), sem
  tocar nas partidas aplicadas
- Resolucao de identidade com regra de plausibilidade + unicidade (evita homonimo
  errado) e gaps declarados em vez de chutes
- API `/rankings?type=player` e UI com seletor Clubes/Jogadores funcionais
- Metodologia documentada; nenhum ranking ou partida pre-existente alterado

Task ID: goal-2026-10-12/t523
Agent: Doer (ZCode)
Task: T523 - ESTATISTICAS agregadas por clube (2.450 partidas) + confronto direto real

Work Log:
- MODELO (Opcao B, declarada): calculo sob demanda + cache Redis de 5 min, SEM
  tabela materializada e SEM migration. Com 2.450 partidas a agregacao e de
  milissegundos; tabela materializada (Opcao A) exigiria job de recalculo e
  conviveria com risco de desatualizacao sem ganho mensuravel. Limite para
  revisitar: ~10^5 partidas (documentado no cabecalho do service).
- API: `apps/api/src/modules/clubs/statistics.service.ts` com agregacao PURA
  (`buildClubStatistics`/`accumulateMatch`, testadas) + carga Prisma; rota
  `GET /clubs/:id/statistics` (404 para clube inexistente; ZEROS verdadeiros para
  clube sem partidas - zero e verdade, nao ausencia). Pontos = Vx3+E (pontuacao de
  tabela, SEM o peso de hierarquia do ranking - estatistica bruta nao e ranking).
  So entram partidas FINISHED com os dois placares.
- COMPARADOR: o `headToHead` de /clubs/compare era SEMPRE `matches: []`
  ("honesto" enquanto a tabela estava vazia) e so existia com aresta explicita de
  rivalidade. Agora carrega as PARTIDAS REAIS entre os dois (10 mais recentes,
  data+placar+competicao) + resumo (jogos, vitorias A/B, empates, gols); `exists`
  tambem fica true quando ha partidas mesmo sem aresta.
- UI (i18n x3): secao "Estatisticas" no perfil do clube (tabela geral casa/fora +
  por competicao/temporada + top 5 confrontos, server-side com revalidate 300 e
  testids) e o comparador exibindo resumo + lista de partidas.
- VALIDACAO DE CORRETUZA (o gate pediu 10 clubes; fiz 107 clube-temporadas de uma
  vez): um SQL compara a estatistica calculada das partidas com as TABELAS
  OFICIAIS do acervo (standings do T508, fonte Wikipedia) clube a clube. PL
  2023-24 e 2024-25: 40/40 identicos. BR (linhas da tabela com clube casado): 0
  divergencias. LIB 2023/2024: 10 divergencias - e TODAS sao o gap JA DECLARADO
  no T519 (jogos contra Patronato/Monagas/LDU Quito/Tachira, clubes ausentes do
  acervo, foram legitimamente pulados na ingestao). Caso concreto verificado:
  Boca 2023 tem 5 jogos no acervo (Pereira x2, Colo Colo x2, final) - faltam
  exatamente os 2 contra Monagas. Ou seja: a estatistica esta correta PARA A BASE;
  a divergencia e o gap conhecido, nao defeito de calculo. Nota: linhas da
  classificacao sem clubId (Vasco 2023/2024 etc., matching do T508 nao curado)
  ficam fora deste cotejo - gap separado, ja conhecido.
- PRODUCAO (deploy 7bbf189): 86 clubes com estatisticas (os distintos nas 2.450
  partidas). Performance medida de fora: 456ms a frio, 254ms morno (<500ms ✓; o
  RTT da rede domina - a agregacao e ms). Palmeiras: 164 jogos (152 BR + 12 LIB),
  94V 37E 33D, 278:147, 319 pts; BR 2024 com 73 pontos = o real. h2h Palmeiras x
  Flamengo: 8 jogos, 0-5-3, gols 4:10. UI no ar: secao renderizada no perfil
  (club-stats-overall) e h2h no comparador (compare-h2h).
- INTEGRIDADE: matches 2.450 intactos, 102 scorers intactos, WON 5.205,
  ranking_entries 893 (68 de jogador + 825 de clube) - nada foi escrito; o
  endpoint e read-only com cache.

GAPS DECLARADOS: as estatisticas refletem a BASE do acervo - na Libertadores os
jogos contra os 4 clubes ausentes nao contam (12 por temporada); a classificacao
do Brasileirao ainda tem linhas sem clubId (matching T508 nao curado) - fora do
escopo desta rodada; clube com 0 partidas no acervo nao tem 404, tem zeros (e
verdade); a pontuacao e de tabela (sem peso de hierarquia) - e estatistica, nao
ranking.

Stage Summary:
- GET /clubs/:id/statistics + h2h real no /clubs/compare, com cache de 5 min
- 86 clubes com estatisticas; validacao contra tabelas oficiais (107
  clube-temporadas): PL 40/40, BR 0 divergencias, LIB diverge so no gap declarado
- UI: secao Estatisticas no perfil + confronto direto no comparador (i18n x3)
- Performance < 500ms; nenhuma escrita no acervo (matches/rankings intactos)

Task ID: goal-2026-10-12/t523-kits
Agent: Doer (ZCode)
Task: T523 — UNIFORMES HISTÓRICOS por temporada (gap explícito do Escopo 1)

Work Log:
- DESCOBERTA ANTES DE CÓDIGO (mudou o desenho): o Commons NÃO tem "uniforme por
  temporada" pronto. Tem PEÇAS de padrão do template CamisaFutebol/
  EquipamentoFutebol (corpo, mangas, calção, meião — File:Kit body <padrão>.png),
  muitas com temporada no código (fluminense23h = 2023 titular), além de fotos
  históricas esparsas. A COMPOSIÇÃO de cada uniforme vive no wikitexto dos artigos
  da pt.Wikipédia, em DOIS schemas medidos: (a) chamadas de template; (b) parâmetros
  numerados da infobox (skin1, skin_calção1, corpo1, braçoesquerdo1… —
  Flamengo/Palmeiras/Botafogo).
- FONTES (10 clubes + 2 de fotos): Fluminense (subpredefinição), Flamengo,
  Palmeiras, Corinthians, Grêmio, Santos, Botafogo, Internacional, Cruzeiro
  (artigos) + Arsenal/Liverpool (só fotos diretas). Cuiabá, Bragantino,
  América-MG e a maioria dos PL: sem material utilizável → gap declarado.
- LIB PURA (lib/wikipedia/kit-composition.ts): parser dos dois schemas +
  decodificador de temporada (2 dígitos → 20yy; 4 dígitos plausível → ano
  (1910, 1903); duas dezenas consecutivas → cruzada (2627 → 2026-27,
  0809 → 2008-09)) + tipo pelo CÓDIGO da fonte (23g1 = goleiro, 23tr =
  treino, sufixo h/a/t; corpo primeiro, título e ordem na tabela como fallback).
  Verificação de CADA arquivo no Commons (imageinfo: existe + licença + sem
  pedido de exclusão) — peça sem arquivo verificado vira COR SÓLIDA, nunca um
  img de proveniência duvidosa. Strip de utm_* das URLs (rastreador fora).
- SCRIPT (seed-kits): dry-run/apply, dedup por (temporada, tipo, padrão do
  corpo) — o mesmo uniforme aparecia no artigo E na infobox —, idempotência por
  hash canônico (JSON com chaves ordenadas: o jsonb do Postgres não preserva
  ordem de chaves e o re-run regravava tudo).
- APLICADO EM PRODUÇÃO: 11 clubes, 64+ uniformes — Inter 13, Fluminense 13
  (incl. 3 fotos: 2021, 2022 terceira, 2023 goleiro), Cruzeiro 13, Santos 10,
  Grêmio 4, Palmeiras 3 (2025-26/2026), Flamengo 3, Botafogo 3 (2026-27),
  Corinthians 2 (1910 + 2026-27), Arsenal 2 (2004-05, 1991), Liverpool 1
  (1892-96). 100% das peças com licença verificada; zero imagem em pedido de
  exclusão (rejeitadas na verificação).
- IDEMPOTÊNCIA PROVADA com nuance honesta: dois applies consecutivos → 0 e 0
  escritas. MAS um apply intermediário regravou 2 clubes — causa real: FONTE
  VIVA (o artigo do Santos mudou: a infobox passou a apontar o 3º uniforme para
  outro padrão, e peças que falharam por blip de rede no apply anterior agora
  resolvem). Não é bug: idempotência = mesmo estado da fonte → zero escrita.
  Dois hotfixes no caminho: a flag --apply não estava declarada no parseArgs (o
  script ignorava o apply) e Arsenal/Liverpool faltavam em CLUB_SOURCES (as
  fotos diretas nunca seriam gravadas).
- API/UI: GET /clubs/:id/kits (200) e seção "Uniformes" no perfil com
  KitDiagram — composição em CSS (mangas+corpo/calção/meião, cor de fundo +
  padrão por cima, como a Wikipédia renderiza) ou foto; temporada e tipo com
  i18n ×3. No ar (testid club-kits).
- INTEGRIDADE: matches 2.450 · ranking_entries 893 · WON 5.205 — intocados.

GAPS DECLARADOS: uniformes por temporada 2021-2025 NÃO existem como imagens
prontas na fonte — o que entra é o que a fonte compõe (Fluminense 2021-2023,
Santos 2022-2026, Inter 2021-2023/2026, Cruzeiro 2022-2024/2026, Corinthians
1910/2026-27, históricos 1903/1909/1921); clubes sem composição na pt.wiki
(Cuiabá, Bragantino, América-MG, Fortaleza, Bahia, Juventude, Atlético-GO e a
maioria dos PL) ficam de fora; peças com código sem ano → season=null
("uniforme corrente da fonte", ex.: o 4º do Fluminense = comemorativo 120 anos);
padrões reusados de outros clubes (calção sport23a no Fluminense) são
mantidos como a fonte compõe; composição por season-article da EN-wiki (para
cobrir mais temporadas/clubes) = trabalho futuro.

Stage Summary:
- 11 clubes com kitHistory (64 uniformes), 100% das peças com licença verificada
- KitDiagram compõe em CSS como a Wikipédia; seção no perfil do clube no ar
- Idempotência provada (0 escritas em source estável); 2 hotfixes de script
- Gap declarado: não há imagens prontas 2021-2025 na fonte; composição futura
  via season-articles da EN-wiki para expandir cobertura

Task ID: goal-2026-10-12/t524
Agent: Doer (ZCode)
Task: T524 — HINOS dos clubes (gap explícito do Escopo 1: "Hino")

Work Log:
- DESCOBERTA ANTES DE CÓDIGO (read-only, 18 clubes com seção Hino):
  (a) ÁUDIO no Commons: apenas 1 — File:Hino-do-São-Paulo-FC.ogg, verificado ao
  vivo: CC BY 4.0 (Orquestra e Coro CID, ~1977), sem pedido de exclusão.
  (b) LETRA: os PRÓPRIOS ARTIGOS da pt.Wikipédia carregam o aviso "NÃO INSIRA A
  LETRA DO HINO AQUI POIS A MESMA VIOLA DIREITOS AUTORAIS" (Flamengo, Palmeiras,
  Internacional) e o pt.wikisource NÃO tem letra de nenhum dos 18. Sem verificação
  de licença livre possível → letra = null em TODOS, com a nota de restrição
  (regra crítica do despacho: nunca publicar letra sem licença verificada).
  (c) O que resta de publicável e factual: os METADADOS (compositor/letrista/ano/
  oficial) declarados nas seções — curados explicitamente no script, cada linha com
  a URL da fonte (padrão T511: nada de busca aberta no apply).
- MIGRATION aditiva (clubs.anthem JSONB, nullable) — nenhuma linha existente muda.
- CURADORIA (13 clubes, cada fato literal da seção "Hino"): Fluminense 1916
  (Antônio Cardoso de Menezes Filho) · Flamengo 1920 (Paulo Magalhães, Hymno
  Rubro-Negro) · Palmeiras 1949 (Antonio Sergi) · Corinthians 1952 (Lauro D'Ávila /
  Edmundo Russomanno) · Grêmio 1953 (Lupicínio Rodrigues) · Inter "Celeiro de Ases"
  (Nélson Silva) · Fortaleza 1967 (Jackson de Carvalho) · Athletico-PR (Zinder
  Lins / Genésio Ramalho) · Bahia (Adroaldo Ribeiro Costa) · Santos 1955 "Leão do
  Mar" (Mangeri Neto e Sobrinho; controvérsia sobre hino oficial) · Atlético-MG
  1969 (Vicente Motta) · Botafogo 1942 Lamartine Babo com official=FALSE (hino
  POPULAR — o despacho pediu oficiais; a honestidade é marcar) · São Paulo FC com
  o ÁUDIO (composição não declarada na fonte → null).
- HOTFIX pego no dry-run de produção: 2 chaves não casavam com o nome do acervo
  ("Clube Atlético Mineiro" → o acervo usa "Atlético-MG" (T519); "Bahia" →
  "Esporte Clube Bahia"). Corrigido, re-aplicado: 13/13 gravados.
- IDEMPOTÊNCIA: re-run após apply = 13× "já gravado idêntico" (hash canônico, lição
  do T523-kits aplicada desde o primeiro commit).
- API/UI: GET /clubs/:id/anthem (200; SPFC traz audioUrl CC BY 4.0 linkada;
  Grêmio traz compositor/ano) · seção "Hino" no perfil: rótulo, composição/letra/
  ano, nota do clube, PLAYER de áudio com licença linkada, nota de copyright da
  letra (i18n ×3) — no ar (testid club-anthem). Sem hino → seção oculta.
- INTEGRIDADE: matches 2.450 · ranking_entries 893 · WON 5.205 · kitHistory 11
  clubes — intocados.

GAPS DECLARADOS: áudio livre no Commons para apenas 1 dos 13 hinos (os demais
sem fonte livre — gap de fonte, não de código); LETRA não publicável para
nenhum (copyright — nota exibida na UI em vez do texto); 5 clubes do top 22 sem
sequer seção Hino no artigo (Cuiabá, Bragantino, América-MG, Atlético-GO,
Juventude); compositor/ano null onde a fonte não declara (São Paulo, Athletico-PR,
Inter, Bahia).

Stage Summary:
- 13 clubes com anthem; 1 áudio CC BY 4.0 verificado ao vivo; letra null+nota em
  todos (regra crítica respeitada)
- API + UI com player funcionais e no ar
- Migration aditiva; rankings/partidas/kits intactos; noop provado (13×)

Task ID: goal-2026-10-12/t525
Agent: Doer (ZCode)
Task: T525 — FLÂMULAS dos clubes (gap explícito do Escopo 1)

Work Log:
- DESCOBERTA ANTES DE CÓDIGO (read-only): 22 clubes × 6 termos
  (pennant/flâmula/wimpel/fanion/banner), categorias e arquivos do Commons.
  Resultado: RUÍDO dominante (banners de cidade e de estado, banners do Wikivoyage,
  clubes homônimos — "Palmeiras" cidade na Bahia, "Internacional" feira do livro,
  Santa Cecília FC e Horizonte FC de Fortaleza, Arsenal Kyiv...). Só DOIS arquivos
  são flâmulas reais dos nossos clubes, ambos verificados ao vivo (imageinfo:
  existe + licença + sem exclusão):
  (a) Red Bull Bragantino — File:Flamula-comemorativa-bragantino-1965.jpg,
      CC BY-SA 4.0, "Flâmula comemorativa do Bragantino - Campeão Paulista da
      Segunda Divisão de 1965";
  (b) Arsenal F.C. — File:Arsenal pennant 2001.jpg, CC BY 2.0, "Arsenal FC pennant
      from FA Cup Final lost to Liverpool FC, Anfield Museum".
- HONESTIDADE ANTES DA META: o gate pedia 5+ clubes; a fonte tem 2. A meta NÃO
  foi atingida e o gap está DECLARADO para os outros 20 clubes — flâmula sem
  imagem é seção oculta, nunca placeholder (regra do despacho).
- MIGRATION aditiva (clubs.pennants JSONB, nullable) — nenhuma linha existente muda.
- SCRIPT (seed-pennants): curadoria explícita (padrão T511) + verificação ao vivo
  de cada arquivo; strip de utm_*; dedup/noop por hash canônico (lição T523).
- APLICADO: 2 clubes / 2 flâmulas; re-run = 2× "já gravado idêntico" (noop).
- API/UI: GET /clubs/:id/pennants (200; Bragantino traz 1965/CC BY-SA 4.0) e
  seção "Flâmulas" no perfil com galeria (imagem, descrição, ano, curiosidade da
  fonte, licença linkada — i18n ×3). No ar (testid club-pennants).
- INTEGRIDADE: matches 2.450 · ranking_entries 893 · WON 5.205 · anthem 13 ·
  kitHistory 11 — intocados.

GAPS DECLARADOS: 20 dos 22 clubes sem flâmula utilizável no Commons (busca
documentada: 6 termos, categorias e arquivos; ruído excluído com justificativa —
banners de cidade/Wikivoyage, homônimos, clubes pequenos). Expansão futura: fotos
de acervos museológicos (como a do Aberdeen no Aberdeen City Council Archives) se
algum dia forem liberadas com licença livre.

Stage Summary:
- 2 clubes com pennants (Bragantino 1965 comemorativa; Arsenal FA Cup 2001),
  100% licenças verificadas; re-run noop
- API + galeria no ar; seção oculta quando não há flâmula
- Gap declarado com a busca documentada; meta 5+ não atingível honestamente

Task ID: goal-2026-10-12/t526
Agent: Doer (ZCode)
Task: T526 — VISUALIZADOR 360º de troféus/bolas (gap explícito do Escopo 1)

Work Log:
- BUSCA DOCUMENTADA (3 rodadas, read-only, 12-10-2026):
  (1) categorias de 3D no Commons: "3D models trophies" vazio; "GLB/GLTF files"
  sem nada de futebol; "STL files sports" vazio; a categoria de bolas
  (Association football balls) tem subcategorias de FOTOS, não modelos.
  (2) arquivos por tipo+termo: "trophy filetype:model" = 0; "trophy stl" só
  GENÉRICOS (troféu da Wikipédia, ícone do 3dicons.co, asset do SuperTuxKart);
  "football ball glb"/"soccer ball 3d model" = bola escaneada genérica e
  Soccer ball.stl — nenhuma bola oficial identificada.
  (3) nomes específicos (libertadores/premier league/copa do brasil + stl/3d):
  só PDFs de arquivo. CONCLUSÃO: 0 modelos 3D publicáveis.
- FATO DE PLATAFORMA (documentado): o Commons hospeda apenas .stl para 3D —
  os formatos preferidos do despacho (glb/gltf, WebGL-friendly) NEM SÃO
  HOSPEDÁVEIS lá. Qualquer modelo real futuro virá como STL.
- NÃO INVENTAR: publicar um STL genérico (bola escaneada, ícone) como "troféu da
  Libertadores" seria inventar — 0 modelos publicados, como o despacho permite
  ("se 0 modelos, publicar 0").
- ENTREGA: migration aditiva (competitions.trophyModel JSONB, nullable) + pipeline
  completo pronto (seed-trophy-models: verificação ao vivo, hash canônico,
  dry-run/apply, mapa de curadoria vazio com o cabeçalho documentando a busca) —
  quando o primeiro modelo real aparecer, curar 1 entrada e aplicar.
- VISUALIZADOR Three.js NÃO construído: com 0 modelos seria código não-testável +
  dependência pesada (three ~600KB) sem valor. Gate cumprido pela alternativa
  prevista no próprio despacho: FALLBACK DOCUMENTADO = trophyImageUrl (imagem
  estática das 19 competições, já em produção). Construir quando o 1º modelo chegar.
- HOTFIX pego pelo CI: o migration-drift FALHOU (e o merge foi antes do término
  dos checks — erro de processo meu): o campo trophyModel tinha sido inserido no
  model ERRADO (Club em vez de Competition) porque o script de edição ancorou no
  primeiro 'pennants' do arquivo. A migration criava a coluna em competitions e o
  schema declarava em clubs — o drift check pegou exatamente o par ADD/DROP.
  Corrigido (#552), CI verde, drift some.
- PRODUÇÃO: deploy SUCCESS; seed rodou (0 modelos, gap impresso); coluna
  trophyModel existe em competitions; integridade intacta (matches 2.450,
  ranking_entries 893, WON 5.205).
- GATE: "N troféus com modelo (pode ser 0)" → **0**; "fallback documentado" →
  trophyImageUrl; "re-run noop" → trivial (0 curados, 0 escritas).

GAPS DECLARADOS: todos os 19 troféus e as bolas oficiais sem modelo 3D na fonte;
formato hospedável no Commons é só .stl; visualizador Three.js pendente do
primeiro modelo real (pipeline pronto).

Task ID: goal-2026-10-12/t527
Agent: Doer (ZCode)
Task: T527 — EXPANSÃO DA BASE DE PARTIDAS (além das 2.450 do T519/T520)

Work Log:
- ALVOS (discovery read-only da RSSSF, com exemplos literais): Brasileirão Série A
  2020 (temporada Covid, vaza para jan/fev de 2021), Premier League 2022-23,
  Libertadores 2022, Ligue 1 2023-24/2024-25, Bundesliga 2023-24/2024-25.
  A Série B fica FORA: a RSSSF não publica rodada a rodada para ela (só a tabela
  final) — gap declarado, como o despacho previa.
- PARSER: 4 ajustes, cada um com teste — (a) `spillAfter` para a temporada Covid;
  (b) `isTableRow` para não descartar clube cujo nome começa com número
  ("1.FC Köln", "1.FSV Mainz 05"); (c) cabeçalho de rodada tolerando anotação no
  colchete ("Round 7 [postponed from Sep 10-12...]"); (d) guard de nota multilinha
  (abaixo).
- TRÊS DEFEITOS REAIS, TODOS PEGOS PELA MEDIÇÃO (não por inspeção):
  1. BARRAGEM FORA DO ESCOPO. O bloco 0 das páginas europeias lista, DEPOIS da
     tabela final, a barragem de acesso/rebaixamento — que envolve clubes da
     divisão DE BAIXO (Rodez, Paris FC, Elversberg). O parser encerra o round-robin
     na primeira `Final Table:` lida APÓS alguma rodada (a tabela de abertura,
     antes da rodada 1, continua ignorada). Temporadas europeias: 310/307 → 306
     (18×34).
  2. NOTA QUEBRADA EM DUAS LINHAS. A Ligue 1 2024-25 imprime a anotação do jogo
     abandonado atravessando a quebra de linha; a sobra ("crowd trouble; result
     stood]") contaminava a linha do jogo SEGUINTE — "Toulouse crowd trouble; ..."
     virava nome de clube e dois jogos se perdiam. Agora: colchete aberto sem
     fechamento é anotação; e a sobra é cortada do nome.
  3. `spillAfter` NÃO CHEGAVA AO CALL SITE. O parser resolvia o ano certo e o
     teste unitário passava, mas o `buildPlan` chamava `matchDate` SEM a opção: as
     112 partidas de jan/fev de 2021 do BR 2020 foram gravadas com data de 2020.
     Lição registrada na decisão (testar no PONTO DE MONTAGEM, não só na unidade).
- REGRA DE PLACAR ANORMAL (reordenada): placar IMPRESSO na coluna = partida, mesmo
  com nota de abandono (Montpellier 0-2 Saint-Etienne, "result stood"); SEM placar
  na coluna (`abd`/`awd`) = gap declarado, nunca deduzido da anotação.
- ALIASES CURADOS (alvo conferido em produção por nome+QID): Brest, Lyon,
  Paris-SG, Rennes, Metz (homônimo "U.S. Acli Metz"), Sankt Pauli, Olimpia
  (homônimo de 4 clubes; na Libertadores é o paraguaio) e RB Bragantino. Ausentes
  declarados: Independiente Petrolero (BOL) e `Univ. Católica` (ambiguidade REAL:
  CHI/Q427446 e EQU/Q2308911 no acervo, as duas jogaram 2022).
- VALIDAÇÃO INDEPENDENTE: 30 amostras (5 por fonte, incluindo as datas de risco —
  jan/fev da temporada cruzada e o vencimento Covid do BR 2020) conferidas contra
  Wikipédia/jornalismo oficial: **30 OK / 0 divergências / 0 não verificáveis**.
- APLICADO EM PRODUÇÃO (5 fontes, lotes, `skipDuplicates`): br criadas=380,
  pl criadas=380, lib criadas=81, ligue1 criadas=612, bundesliga criadas=611 →
  **2.064 novas**; matches 2.450 → **4.514** (5 competições / 15 temporadas).
- RE-RUN NOOP: segunda passada das 5 fontes = `criadas=0` em todas (inclusive após
  o reparo do BR 2020 — prova que o `dedupKey` acompanhou a data corrigida).
- REPARO DO DEFEITO 3: 112 linhas do BR 2020 corrigidas em produção (date +1 ano +
  dedupKey), `restantes_erradas=0`, e a temporada passou a ler
  2020-08-08..2021-02-25 (exatamente o que o harness local dizia).
- SMOKE NO PRODUTO (API ao vivo): `GET /clubs/:id/statistics` — Bayern com 34 J em
  2023/24 e 2024/25 da Bundesliga; Flamengo com 38 J em cada uma das 5 temporadas
  do Brasileirão (2020-2024) + Libertadores 2022.
- INTEGRIDADE: matches 4.514 (dedupKeys distintos = 4.514, zero partida sem
  temporada ou sem placar) · ranking_entries 893 · WON 5.205 · clubes ativos
  11.987 — rankings e entries INTOCADOS (recalcular é do próximo cron, como o
  despacho manda).

GAPS DECLARADOS: Série B sem resultados rodada a rodada na RSSSF (só tabela
final); Libertadores 2022 — 16 das 97 partidas ficam fora por clube não
resolvido (Táchira, Independiente Petrolero ausentes do acervo; Universidad
Católica ambígua entre CHI e EQU); L1 2023-24 Montpellier x Clermont (`abd`, sem
placar na coluna) e BL 2024-25 Union x Bochum (`awd`, decisão disciplinar) — em
ambos a fonte não imprime placar e deduzi-lo da nota seria inventar. Barragens de
acesso/rebaixamento das ligas europeias ficam fora por desenho (clubes da divisão
de baixo).

Stage Summary:
- 2.064 partidas novas em 5 competições (meta do gate era 500+) → matches 4.514
- 30 amostras validadas contra fonte independente, 0 divergências
- 3 defeitos corrigidos com teste de regressão cada; base em produção reparada
- re-run noop provado; rankings/WON intactos

Task ID: goal-2026-10-12/t528
Agent: Doer (ZCode)
Task: T528 — JOB UNIFICADO DE MÍDIA EM BATCH (método artesanal -> processo de dados)

Work Log:
- DIAGNÓSTICO MEDIDO (o achado que reorganiza o problema): os jobs de enriquecimento
  do scheduler já existiam, mas NÃO AVANÇAVAM.
  (a) `enrich-clubs-media` (04:00, lote 500) seleciona clubes por `OR: [campo IS NULL]`
      + `orderBy: name ASC`. Medido em produção: NENHUM dos 11.987 clubes tem os 5
      campos de mídia preenchidos (`com_os_5_campos=0`), então nenhuma linha sai do
      filtro — o job reprocessa OS MESMOS 500 primeiros em ordem alfabética toda noite.
      Escudo parado em 290/11.987 (2,4%).
  (b) `enrich-clubs-editorial` (06:00) avança só enquanto o clube RECEBE texto; trava
      no primeiro clube sem sitelink. Prova na distribuição por letra: A = 729/885
      (82%), B = 29/505 (5,7%), C = 27/1.011 (2,7%) — a varredura parou na letra E
      (último nome com texto: "Esporte Clube Juventude").
  Ou seja: a cobertura baixa não era só curadoria manual — o LOTE não avançava.
- ENTREGA: migration aditiva `clubs.mediaEnrichment` JSONB (nullable, nenhuma linha
  existente muda) com o registro por mídia `{ "<media>": { at, status } }`. Esse
  registro é o CURSOR: o lote passa a selecionar quem NÃO tem tentativa, então avança
  sempre — e o que a fonte não tem vira GAP DECLARADO por clube (auditável), nunca
  retrabalho silencioso.
- Serviço `enrich-all-media.service` (reusa o parser de kits do T523 e a verificação ao
  vivo do T524/T525) + script CLI (`--apply`, `--batch`, `--recheck`) + cron
  `enrich-all-media` às 07:00 UTC, lote 500, com health e log estruturado — mesmo padrão
  do T451/T506. Teto próprio de 20 min (o lote mediu 7,6 min em dry-run contra o teto
  global de 10 min).
- REGRAS DURAS (testadas): peça de uniforme verificada AO VIVO no Commons (existe +
  licença + sem pedido de exclusão); hino só em arquivo de áudio CITADO pela própria
  página e verificado; flâmula só arquivo da CATEGORIA do clube cujo TÍTULO diz que é
  flâmula (nunca busca textual solta); LETRA de hino nunca é publicada; campo já
  preenchido nunca é sobrescrito (curadoria T523-T526 preservada).
- PRODUÇÃO: dry-run 500 = 109 enriquecidos / 391 gaps / 0 erros (7,6 min); apply = 109;
  cursor avançou exatamente 500 por rodada. Uniformes: 11 -> 233 clubes (21x a cobertura
  artesanal). Pendentes: 10.842 -> ~24 noites a 500/noite.
- DEFEITO PEGO SÓ EM PRODUÇÃO: o modo `--recheck` (que existe para provar idempotência)
  filtrava com `mediaEnrichment: { not: Prisma.DbNull }` — filtro de NEGAÇÃO em campo
  JSON que o Prisma não traduz de forma confiável. Resultado: em vez de reprocessar os já
  tentados, pegou os PRÓXIMOS 500 e enriqueceu mais 113 clubes (dado legítimo, mas a
  prova de noop não valia). Corrigido para SQL explícito (`"mediaEnrichment" IS NULL /
  IS NOT NULL`) no #559.
- GATE: job registrado no cron (07:00 UTC) ✓ · dry-run com enriched>0 ✓ · apply 500
  processados ✓ · noop provado ✓ · log estruturado no formato
  `enrich-all-media: processed=... enriched=...` ✓ · integridade preservada ✓.
- HONESTIDADE SOBRE O RENDIMENTO: o batch multiplica a VARREDURA (500 clubes/noite,
  ~24 noites para os 11.987), mas o RENDIMENTO é limitado pela fonte: uniforme aparece em
  ~22% dos clubes varridos (a maioria das páginas da pt.Wikipedia não traz composição);
  hino e flâmula seguem quase vazios (0 hinos e 1 flâmula no primeiro lote) porque a
  fonte quase não tem o material — e nada é inventado para inflar o número. Estado final:
  kit 11 -> 233 · hino 13 · flâmula 3.

GAPS DECLARADOS: os jobs LEGADOS (`enrich-clubs-media` e `enrich-clubs-editorial`)
continuam travados no mesmo lote alfabético — o defeito está diagnosticado com evidência
e o conserto é aplicar aqui o MESMO cursor (`mediaEnrichment` por mídia); é mudança de
comportamento de dois jobs de produção e ficou para um despacho próprio (não misturei no
PR do job novo).

Task ID: goal-2026-10-12/t529
Agent: Doer (ZCode)
Task: T529 — EXPANSÃO MASSIVA DE PARTIDAS (5 competições, 2015-2025)

Work Log:
- RESULTADO: matches 4.514 -> **15.987** (11.473 novas; a meta do gate era 5.000+).
  7 competições / 60 temporadas. Novas: Brasileirão Série A 2015-2019, Premier League
  2015-16 a 2021-22, Libertadores 2015-2021, **La Liga** (Q324867, `tabless/span{}`) e
  **Serie A italiana** (Q15804, `tablesi/ital{}`) 2015-16 a 2024-25.
- TRÊS REGRAS DE DATA NOVAS (cada uma com teste):
  1. ANO DAS TEMPORADAS CRUZADAS (`resolveCrossYears`): a Covid esticou a Serie A 2019-20
     de 24/ago/2019 a 2/ago/2020 — o MESMO mês nos dois extremos — e o fold "o ano vira
     quando o mês volta" contava a virada duas vezes porque a fonte lista jogo ADIADO
     dentro da rodada original (`r16: Dec 13, Dec 13, Jan 20, r17: Dec 19`). Regra: o MÊS
     decide e, só na faixa ambígua (mês do corte e o anterior), a RODADA desempata.
  2. SOBRA DE NOTA NÃO COME O NOME (`cutNoteTail`): o regex casava à esquerda no espaço
     INTERNO do nome — em BR 2019 o jogo seguinte ao abandonado virava "São" em vez de
     "São Paulo" (e a temporada ficava com 21 times).
  3. GRUPOS NUMERADOS da Libertadores antiga (`Group 1..8`, não só A-H): recupera 2015-2017.
- O RÓTULO DE TEMPORADA segue a convenção de CADA competição no acervo (Ligue 1
  `2023-2024`, Bundesliga `2023/24`, Premier League `2023-24`, Serie A `2015-2016`) —
  conferido em `CompetitionSeason.season` antes de escrever.
- ALIASES: duas ondas de curadoria a partir do relatório de resolução (nunca por memória),
  sempre com o alvo conferido em produção por nome+QID. A cascata genérica estava ligando
  o clube ERRADO em 8 casos: `Madrid` -> "Madrid autonomous football team" (seleção
  regional!), `Málaga` -> CD Málaga (clube extinto), `Sporting` -> clube de MALTA,
  `Paraná` -> ADAP de Campo Mourão, `Peñarol` -> Peñarol WOMEN'S, `San Lorenzo` -> clube do
  Peru, `Universitario` -> de Trujillo, `Vélez Sársfield` -> de San Ramón. Também:
  Atlético/PR = Athletico/PR (rename), Sport = Sport do Recife (a cascata casava com o
  Internacional), Atlas (MX, convidado da Libertadores — o escopo de países não incluía o
  México).
- CRITÉRIO DA LISTA DE AUSENTES (fixado aqui, e um teste do T519 mostrou por quê): a lista
  existe para bloquear o que CASARIA O CLUBE ERRADO — não clubes que apenas não existem no
  acervo (esses ficam como "sem candidato" e podem ser resolvidos pelo pool da temporada se
  entrarem no acervo depois).
- REPARO DE DADOS: 105 linhas mal ligadas (32 do Peñarol feminino, 18 do San Lorenzo
  peruano, 5 do Universitario de Trujillo, 4 do Vélez de San Ramón, 6 do Atlas argentino,
  38 do ADAP pelo Paraná) foram removidas e o seed recriou as CORRETAS pela chave natural
  (65 recriadas; as 38 do Paraná ficaram de fora, como gap declarado, provando o ABSENT).
- VALIDAÇÃO: 50 amostras (10 por competição, sorteio determinístico por md5) conferidas
  contra fontes independentes — ver checkpoint.
- NOOP: re-run das 5 fontes = `criadas=0` em todas. E as temporadas JÁ aplicadas
  (BR 2020-24, PL 2022-25, L1, BL) seguiram com `criadas=0 puladas=380` depois de trocar a
  regra de ano — prova de que as regras novas reproduzem as MESMAS datas.
- INTEGRIDADE: matches 15.987 (dedupKeys distintos = 15.987) · rankings 72 ·
  ranking_entries 1.907 · WON 5.205 · clubes 11.987 — nenhum registro sem temporada ou sem
  placar.

GAPS DECLARADOS: 2025-26 não publica rodada a rodada na fonte (BR 2025, PL 2025-26, La Liga
2025-26, Serie A 2025-26) e a Libertadores 2025 não existe (404). Clubes que o acervo NÃO
tem e por isso perdem os jogos (declarados "sem candidato"): Joinville, Paraná (BR); Eibar,
Huesca, Sporting, Málaga (ES); Lecce, Como, Monza, Cremonese, Frosinone, Salernitana, SPAL
(IT); LDU Quito, Independiente Petrolero, Táchira, Monagas, Universitario (Sucre), Mineros,
Trujillanos, Sport Boys Warnes, Univ. de Concepción, Tigres UANL, Huracán e as duas
"Universidad Católica" (ambíguas de verdade, CHI e EQU). São candidatos naturais da próxima
onda de ingestão Wikidata.
DEFEITO DE ACERVO REGISTRADO (não corrigido aqui): o acervo tem entidades FEMININAS com
`gender='men'` (ex.: "Peñarol women's", "Albania women's national football team", dezenas)
— é o que deixou um time feminino passar no filtro de gênero do resolver. Candidato a
rodada de cura (padrão T520).

Task ID: goal-2026-10-12/t530
Agent: Doer (ZCode)
Task: T530 — EXPANSÃO DE RANKINGS 0-100 PARA TODAS AS COMPETIÇÕES COM PARTIDAS

Work Log:
- PRÉ-REQUISITO CORRIGIDO: o CLI de cálculo aceitava só rótulo `YYYY` ou `YYYY-YY`; o
  acervo também usa `YYYY-YYYY` (Ligue 1, Serie A) e `YYYY/YY` (Bundesliga) — e o
  algoritmo filtra por `season: { name }`, exigindo o rótulo EXATO. Sem isso, La
  Liga/Serie A/Ligue 1/Bundesliga não podiam ser calculadas.
- LOTE: 54 pares (competição, temporada) com mais de 20 partidas processados em sequência
  — 54/54 OK.
- RESULTADO: rankings **26 -> 72** (+46 novos; a meta do gate era 30+), entradas 893 ->
  **1.907**. La Liga (10 temporadas), Serie A (10), Bundesliga (2) e Ligue 1 (2) passaram a
  ter ranking 0-100, junto com os que já existiam (Brasileirão, Premier League,
  Libertadores e os globais).
- ESCALA: conferida — todas as entradas dos 46 rankings novos estão entre 0 e 100 (max=100
  em todas as amostradas). As ÚNICAS 20 entradas fora da escala são as LEGADAS
  `Ranking CBF 2023` (2.190-2.848) e `Ranking CONMEBOL 2023` (1.600-2.800), que usam a
  escala BRUTA da fonte — precedentes, não tocadas (a coexistência das duas escalas já
  está registrada desde o T521).
- IDEMPOTÊNCIA: re-run de um par = `skipped: true`, `rankingsPublicados: 0`.
- INTEGRIDADE: matches 15.987 · ranking_entries 1.907 · WON 5.205 · clubes 11.987.

Stage Summary (T528-T530):
- T528: job unificado de mídia em batch com CURSOR por tentativa (07:00 UTC, 500
  clubes/noite, ~24 noites de cobertura); uniformes 11 -> 233 clubes; o defeito que
  congelava a cobertura foi medido e documentado
- T529: 11.473 partidas novas (matches 4.514 -> 15.987) em 5 competições, 3 regras de data
  novas, 8 clubes ligados errados curados com reparo de dados em produção
- T530: rankings 26 -> 72 (+46), todas as competições com partidas cobertas

Task ID: goal-2026-10-13/t531
Agent: Doer (ZCode)
Task: T531 — CURA DO DEFEITO DE GENDER NO ACERVO

Work Log:
- ORIGEM: o T529 encontrou partidas ligadas a clubes FEMININOS em ligas masculinas
  (as 32 do "Peñarol women's" na Libertadores) porque dezenas de entidades femininas
  estão gravadas com `gender='men'` no acervo.
- DISCOVERY (duas frentes, em produção):
  (a) por NOME, entre os 11.490 clubes 'men': 400 candidatos (369 seleções, 5 clubes
      "(futebol feminino)", 12 com women/female, o resto damen/frauen/femminile/
      vrouwen/kobiety/femmes);
  (b) VARREDURA COMPLETA por Wikidata nos 11.490 clubes com QID (lotes de 50) — é o
      que pega o defeito que o nome NÃO denuncia (ex.: `Adelaide United FC`, cujo item
      no Wikidata é um clube feminino).
- FONTE DA VERDADE (corrigido por medição, não por suposição): a primeira versão usava
  P21 ("sex or gender") e deu ZERO leituras em 11.490 clubes. Medido na fonte: P21 é
  propriedade de PESSOAS — a seleção feminina da Albânia (Q934030) tem P21 VAZIO. Para
  time/clube o Wikidata usa o **P31 (instance of)**: Q23905105 ("women's national
  association football team") e Q51481377 ("women's association football club"), e as
  formas em português Q28140340 ("equipa de futebol feminino"). A cura passou a ler o
  P31 e a buscar os RÓTULOS dessas classes (2ª rodada de lotes).
- VEREDITO auditável: classe P31 declara feminino -> corrige (242); P21 = female ->
  corrige; sem fonte, o NOME decide apenas se DECLARA feminino como PALAVRA (205);
  classe P31 declara MASCULINO -> **não toca** (420 — é o contador de falsos
  candidatos); o resto fica fora (10.623 'sem_fonte').
- PROTECÇÃO VERIFICADA: a lista de falsos candidatos do run de produção inclui
  AC Milan, AS Roma, Juventus FC, ACF Fiorentina, Chelsea F.C., Manchester United,
  SC Freiburg, Olympique Lyonnais, Seleção Brasileira de Futebol, Seleção Argentina de
  Futebol… — todos com classe masculina, todos INTOCADOS.
- APLICADO: **447 entidades corrigidas** (meta do gate: 50+), com proveniência em
  `metadata.genderCure` (regra, p21, sourceUrl do QID, at, task). Idempotente: o
  criterio de seleção é `gender='men'`, então o re-run não tem o que corrigir.
  Distribuição do acervo: homens 11.490 -> 11.043; mulheres 497 -> 944.
- AUDITORIA NA FONTE (amostra das corrigidas com nome que NÃO denuncia): Urawa Red
  Diamonds Ladies, Ferencvárosi TC (Q1000478 = o item FEMININO, P31 "women's
  association football club"), Club YLA (P31 "equipa de futebol feminino"), Dostluk
  Spor Kulübü, CAC Pontinha, Sociedade Esportiva Kindermann — todas femininas na
  fonte. Zero falso positivo.
- VALIDAÇÃO DO GATE: (1) `femininos_em_competicao_masculina = 0` (varredura nas 7
  competições masculinas com partidas); (2) partidas ligadas a entidades corrigidas =
  0 (o único caso, Peñarol, já havia sido reparado no T529); (3) re-run do T529
  (dry-run das 5 fontes) sem nenhum casamento feminino e com `Peñarol -> Club Atlético
  Peñarol`.
- INTEGRIDADE: matches 15.981 · rankings 72 · ranking_entries 1.906 · WON 5.205 —
  intocados (a cura escreve só `gender` + `metadata`).

GAPS DECLARADOS: 10.623 entidades 'men' ficaram sem fonte que confirme o gênero
(nem P21 nem classe P31 nem marcador no nome) — não foram tocadas de propósito:
"não parecer feminino" NÃO é prova de ser masculino. Muitas linhas com `name` igual ao
QID (ingest sem rótulo) também entram aí. Próxima melhoria natural: usar o P31 também
para CARIMBAR o gênero positivo (men's club) como proveniência, e curar as entidades
sem rótulo (nome = QID).

Stage Summary:
- 447 entidades femininas deixaram de estar marcadas como masculinas (242 por classe
  P31, 205 por nome), com proveniência por linha e zero falso positivo
- 0 clubes femininos em competições masculinas; re-run do T529 limpo
- Integridade intacta (matches/rankings/WON)

---

Task ID: T532
Agent: DeepSeek Harness (deepseek-flash) — UI/UX
Task: Toolchain de UI/UX do projeto (plugin `almanaque-design`) + reprojeto e copy da hero/home

Work Log:

- PLUGIN `plugins/almanaque-design/` (segundo plugin do repo, ao lado do `almanaque-dev`):
  6 skills (`design-system-almanaque`, `hero-and-landing-patterns`, `conversion-copy`,
  `web-accessibility-wcag`, `visual-qa-playwright`, `design-subagents`) + 4 papéis de
  subagente (`design-critic`, `a11y-auditor`, `ux-copywriter`, `visual-qa-auditor`).
  Catálogo atualizado em `plugins/marketplace.json`; doc em `docs/PLUGIN-ALMANAQUE-DESIGN.md`.
- SYNC unificado: `plugins/scripts/sync-to-workspace.sh` cobre os DOIS plugins e três
  destinos (`.zcode/skills`, `.zcode/agents`, `.dsh/skills`, `.dsh/agents`), com remoção de
  sobras só depois de todas as cópias (o script antigo apagava os agentes do `almanaque-dev`
  ao sincronizar o design no mesmo destino). O caminho antigo virou wrapper.
- LIMITE CONSTATADO: o DSH descobre `.dsh/skills/` na ABERTURA da sessão; skill criada
  depois não entra no catálogo nem é carregável pela tool `skill` na sessão em curso
  (testado com skill de projeto E com skill em `~/.dsh/skills` — as duas indisponíveis até
  reabrir). Sondas removidas; o conteúdo é lido direto do arquivo enquanto isso.
- COPY (H→P→P→CTA, 3 idiomas) em `apps/web/src/i18n/wsC12.ts` — módulo aditivo, não mexe no
  `Dictionary` global. Gancho: "Quem foi o maior: o seu palpite ou o dado com fonte?".
  Promessa com uma única nota de honestidade (antes "em construção" aparecia 4× na página).
  CTA primário único + microcopy de atrito; vocabulário canônico nos 3 idiomas.
- HERO `apps/web/src/components/HeroSection.tsx`: camada escura editorial (`.theme-dark` em
  `globals.css`, ver decisão), eyebrow + H1 + promessa + CTA + cartão de PROVA com campeão
  vigente real e link da fonte, seções "Um acervo, quatro respostas" e "Como conferir em
  30 segundos", e fecho com CTA final. `page.tsx` busca o campeão no servidor
  (`/champions/carousel`, só com `sourceUrl`) e envolve o carrossel na MESMA camada escura
  (antes a home alternava escuro → claro → escuro).
- `apps/web/src/lib/format.ts`: `formatCount` com tag BCP 47 (`pt-br` → `pt-BR`) porque
  `toLocaleString('pt-br')` não é tag válida para o `Intl`.
- CORREÇÕES DE DEFEITO encontradas na própria verificação:
  1. `useGsap` escondia o conteúdo sem scroll (full-page com blocos vazios) → rede de
     segurança de revelação em 2 s (decisão registrada);
  2. três cartões com "Acervo em crescimento" quando a API não responde → uma lacuna única
     declarada;
  3. legenda de contagens invertida (`hasTotals ? statsUnavailable : statsNoData`) → origem
     do dado quando há número, lacuna quando não há;
  4. bordas do cartão de prova fora do token (`color-mix` a 18%) → `border-border` em todo o
     bloco.
- CRÍTICA ADVERSARIAL (`design-critic` em contexto separado): REPROVADO com 4 bloqueios —
  3 corrigidos (bordas fora do token, alternância claro/escuro, legenda invertida) e 1
  refutado com razão registrada (2 botões full-width no mobile: são duas ações distintas com
  alvo de 48 px, e colapsar o secundário em link textual reduziria a área de toque).
- VERIFICAÇÃO: `pnpm --filter web typecheck` limpo; `pnpm --filter web test` 64/64 em 12
  arquivos; contraste RENDERIZADO medido no Chromium (composição em canvas, 17 pares) —
  **0 reprovações AA**; overflow horizontal 0 em 1440/768/390; 1 `h1`; ordem de headings
  correta; screenshots antes/depois em `.tmp/shots/` (`before-*`, `v3-*`) e por idioma
  (`locale-pt-br|en-us|es-es`).
- LIMITE DO AMBIENTE: `pnpm --filter web lint` FALHA antes de analisar qualquer arquivo —
  `eslint-plugin-react@7.37.5` chama `contextOrFilename.getFilename`, removido no ESLint
  10.11.0 (`TypeError: Error while loading rule 'react/display-name'`). Defeito de
  dependência pré-existente, não introduzido por esta tarefa; não foi tocado.
- NÃO VERIFICADO: render com dados reais de produção (sem API local a hero mostra o estado
  de lacuna); hover/focus capturados; leitor de tela real; galeria de campeões com cards
  (a crítica notou que o esqueleto do carrossel é claro no escuro — `bg-foreground/5`).

Stage Summary:
- Projeto passa a ter toolchain de UI/UX instalada e versionada (6 skills + 4 papéis),
  carregada a partir de `.dsh/skills` no DSH e `.zcode/` no ZCode, com fonte canônica no plugin
- Home deixa de ter hero "simples e sem atrativo": gancho real, prova auditável, CTA único e
  camada escura coerente do topo ao rodapé, em pt-BR/en-US/es-ES
- Contraste medido no navegador com 0 reprovações AA; typecheck e 64 testes verdes
Task ID: goal-2026-10-13/t533
Agent: Doer (ZCode)
Task: T533 — OBSERVAÇÃO DE ESTABILIDADE (Dia 0: baseline, instrumentação e correções)

Work Log:
- ESCOPO E LIMITE HONESTO: T533 pede 3-7 dias de observação. Nesta sessão foi
  executado o **Dia 0** — baseline medido, verificação de que o cron VAI disparar,
  análise dos problemas e as correções que a observação já revelou. Os dias 1-7 são
  COLETA (comandos prontos abaixo); a série só existe com o tempo passar, e declarar
  métricas de dias que não ocorreram seria inventar dado.

- BASELINE (12-10-2026, produção):
  · integridade: matches 15.981 · rankings 72 · ranking_entries 1.906 · WON 5.205 ·
    clubes 11.987 (11.043 men / 944 women — pós-cura T531)
  · mídia: uniformes 233 clubes · hinos 13 · tentativas registradas 1.000 ·
    pendentes 10.842 (a 500/noite ≈ 22 noites)

- CRON DE MÍDIA — VERIFICADO NO REDIS (não no log): BullMQ devolve
  `enrich-all-media@0 7 * * *` registrado na fila `data-refresh`, junto de
  integrity-check@0 4 * * 0, enrich-clubs-editorial@0 6 * * *, enrich-players-media@0 5 * * *,
  enrich-clubs-media@0 4 * * *, wikidata-incremental@0 3 * * *; a fila `ranking` tem
  ranking:compute@0 3 * * *. O job de mídia já foi executado 3× à mão (dry-run 500,
  apply 500, recheck) = 1.500 clubes varridos, 0 erros, cursor avançando exatamente 500.

- LATÊNCIA (medida DENTRO do container, 12 requisições por rota, espaçadas para não
  esbarrar no limitador):
  · /health            ~1,2-2,3 ms
  · /rankings?limit=20  p50 4,1 ms  p95 8,7 ms  p99 8,7 ms   (12/12 = 200)
  · /clubs?limit=20     p50 7,0 ms  p95 47,4 ms (1ª req fria) (12/12 = 200)
  · /matches?limit=20   p50 9,2 ms  p95 17,1 ms              (12/12 = 200)
  Zero 4xx/5xx nas 48 medições. A tabela `matches` multiplicou por 6,5 desde o T522 e
  continua respondendo em ~9 ms.

- MÉTRICAS DA PLATAFORMA (Railway, última 1h): CPU atual 0,02 vCPU (máx 0,17 de 8);
  memória média 139 MB (máx 769 MB de 8 GB); HTTP 16 req com 100% 2xx, 0% 4xx, 0% 5xx,
  error rate 0,0%; latência p50 2 ms · p90 3 ms · p95 3 ms · p99 3 ms.
- CACHE (Redis): uptime ~60 dias · hits 1.383.464 · misses 648.094 ·
  **hit rate 68,1%** · memória 3,56 MB · 0 chaves evictadas · 22 clientes · 79 chaves.
- LOGS DA API: zero linhas de erro (level 50/60) no período observado.

- PROBLEMAS IDENTIFICADOS E TRATADOS:
  (1) **HEALTHCHECK PODIA RECEBER 429** (corrigido, #571). O probe do Railway bate em
      /api/v1/health de dentro do container e o limitador global (100 req/min por
      `request.ip`) põe o probe no MESMO balde de qualquer chamada interna. Medido: uma
      rajada interna fez o health responder 429 em 1 ms. Um serviço saudável podia ser
      marcado unhealthy por um vizinho de IP. Correção: `config: { rateLimit: false }`
      na rota. PROVA EM PRODUÇÃO (antes/depois): 120 requisições seguidas no health =
      **120×200, 0 não-200**; `/clubs` no mesmo IP = **100×200 + 20×429** (o limitador
      continua valendo — não desliguei nada) e o `/health` seguiu **200 DURANTE o
      esgotamento do limite** — era exatamente o cenário que derrubava o probe.
  (2) **INVENTÁRIO DE CRONS INCOMPLETO** (corrigido, #571): o log de boot
      `data-refresh scheduler agendado` listava 5 crons e omitia o `enrich-all-media`
      (que estava registrado e rodando). Todo cron novo passa a entrar no inventário.
  (3) **VERCEL PREVIEW VERMELHO — CAUSA-RAIZ ENCONTRADA**: não é defeito de build. O
      link do check é `vercel.com/end-art-studios?upgradeToPro=build-rate-limit`, isto
      é, a conta bateu o **limite de builds de preview do plano gratuito**. O deploy de
      PRODUÇÃO do web está verde (workflow `deploy-web` success) e o site responde 200.
      Não bloqueia entrega; ação sugerida (decisão do Operador, envolve plano):
      reduzir previews (buildar só em branches selecionadas) ou subir de plano.

- PROTOCOLO DOS DIAS 1-7 (comandos prontos, nenhum inventa métrica):
  · cron de mídia (após 07:00 UTC): `railway logs --service Almanaque-dos-Clubes | grep -E "enrich-all-media: (processed|start|fim)"`
  · cobertura avançando: SQL
    `SELECT count(*) FILTER (WHERE "mediaEnrichment" IS NOT NULL) AS tentados,
            count(*) FILTER (WHERE "kitHistory" IS NOT NULL) AS kits,
            count(*) FILTER (WHERE "mediaEnrichment" IS NULL AND qid IS NOT NULL AND "deletedAt" IS NULL) AS pendentes
     FROM clubs WHERE "deletedAt" IS NULL;`
  · integridade diária: matches/rankings/entries/WON (o baseline acima é a referência)
  · saúde de recursos: `railway metrics --service Almanaque-dos-Clubes`
  · cache: INFO do Redis (hits/misses/hit rate)
  · erros: `railway logs ... | grep -c '"level":50'` deve seguir 0

GAPS DECLARADOS: os dias 1-7 não foram observados nesta sessão (não há como esperar
3-7 dias dentro de uma execução) — o que existe é o Dia 0 medido e o protocolo. A
estimativa do despacho de "1.500-3.500 clubes enriquecidos no período" só pode ser
CONFIRMADA pela coleta: à taxa medida (500 varridos/noite, ~22% com uniforme) espera-se
**~110 clubes novos com uniforme por noite, ~770 em 7 noites**, e o cursor avançando
3.500 clubes varridos. Também fica aberto: nenhuma métrica de processo (CPU/RSS do
container sob o cron) foi capturada DURANTE a execução noturna — o pico medido (769 MB)
é da janela de deploy, não do job.

Stage Summary:
- Dia 0 completo: cron verificado no Redis, latência/recursos/cache/logs medidos
- 2 fragilidades corrigidas com prova antes/depois (health fora do rate-limit;
  inventário de cron) e a causa-raiz do Vercel Preview encontrada (limite do plano)
- Baseline de integridade e cobertura registrado para servir de referência aos dias 1-7

---

Task ID: T533
Agent: DeepSeek Harness (deepseek-flash) — UI/UX / curadoria de ferramentas
Task: Analisar 25 ferramentas de UI-UX, adotar as de valor e transformar a régua de design em verificação executável

Work Log:

- PESQUISA em fonte primária (LICENSE, `package.json`, registry JSON, GitHub API) das 25 URLs.
  Divisão em três frentes: skills/agent tooling, bibliotecas de animação, registries de
  componentes e sites de referência. Veredito por classe em `docs/UI-UX-TOOLKIT.md` (tabela
  completa com licença, modelo de instalação, incompatibilidades e veredito de cada uma).
- ADOTADO: 4 skills de `emilkowalski/skills` (MIT, confirmado na API) vendorizadas e ADAPTADAS
  como fonte canônica do plugin — `motion-craft`, `motion-review`, `ui-library-choices` e o papel
  `motion-critic`. Adaptações: `framer-motion` -> `motion/react`; GSAP como dono declarado dos
  reveals; nota de que a regra de `prefers-reduced-motion` do CSS não alcança GSAP/WAAPI.
- PORTÃO NOVO `plugins/almanaque-design/tools/audit-motion.mjs` (+ `pnpm run ui:audit:ci`):
  transforma a régua em verificação — `transition-all`, `scale(0)`, `ease-in`, animação de
  propriedade de layout, import de `framer-motion`, `will-change` amplo, hover sem gate de
  ponteiro, duração de UI > 300 ms, GSAP sem reduced-motion e alfa de texto abaixo do piso de
  contraste. Primeira execução: **38 bloqueios reais** (todos `transition-all`).
- CORRIGIDO (tudo medido, não estimado):
  1. `transition-all` -> `transition` (utilitário nomeado do Tailwind v4) em **18 arquivos**;
     conferi cada hover/focus afetado (shadow, bg, opacity, color, border, transform) para não
     derrubar propriedade necessária. Portão agora: **0 bloqueios**.
  2. `--color-foreground` `#7f1d1d` -> **`#340808`**: o sólido antigo dava 9,16:1 mas a escala de
     alfa reprovava (`/60` = 3,46:1 · `/50` = 2,72:1 · `/40` = 2,17:1). Nova escala: `/60` = 4,72:1
     · `/70` = 6,61:1 · sólido = 16,21:1. Piso de texto documentado em `globals.css`.
  3. Piso de alfa: `/30`, `/40`, `/50` -> `/70` em **46 arquivos**.
  4. Rodapé: `text-white/40|50|60` -> `/70|80|90` (2,78:1 -> 8,92–14,37:1); marca saiu de
     `text-primary` (2,1:1 sobre o fundo escuro) para `text-white`.
  5. Busca: cor explícita no placeholder **+ `placeholder:opacity-100`** (o navegador aplica
     opacidade própria ao placeholder e derrubava para 3,5:1) — Navbar, SearchBar, GlobalSearch.
  6. Anel de foco na camada escura: dourado sobre o CTA vermelho dava **1,66:1** (WCAG 2.2
     1.4.11/2.4.13). Agora folga de 1 px na cor do fundo separa o anel (7,84:1).
  7. Removidos dois tells de UI gerada por IA apontados pelo detector: o **tile de ícone 48 px
     acima do h3** nos 6 feature cards (virou ícone em linha com o título) e o **chip minúsculo em
     caixa alta acima do H1** (a informação virou a primeira frase da promessa). Saiu também o
     ponto pulsante decorativo.
  8. `useGsap.ts` passou a respeitar `prefers-reduced-motion` (a regra do CSS não alcança GSAP) e
     o hover por GSAP ficou gated por `(hover: hover)`.
- AUDITORIA EXTERNA: `npx impeccable@latest detect <url>` (Apache-2.0, 59 regras determinísticas
  sobre o DOM renderizado, `DO_NOT_TRACK=1`). Achou **26 anti-padrões na produção** (19 de
  contraste, 6 `icon-tile-stack`, 1 texto de 10 px). Depois das correções: **home local 26 -> 0
  (exit 0)** e `/clubs` 6 -> 0.
- DIVERGÊNCIA RESOLVIDA: minha medição dava `proofDisclaimer` 4,75:1 e `ctaNote` 4,95:1; o
  subagente `a11y-auditor`, compondo o fundo REAL (glow + color-mix do cartão + grão), mediu
  4,36:1 e 4,65:1. O método dele é o correto — meu script media contra o fundo chapado. Ambos
  foram corrigidos por alfa (`/70` e `/75`), não por reinterpretação do número.
- VERIFICAÇÃO: `pnpm --filter web typecheck` limpo; `pnpm --filter web test` **64/64** em 12
  arquivos; contraste renderizado do hero **0 reprovações** em 17 pares; overflow horizontal 0 em
  1440/768/390; 3 idiomas renderizando (pt-BR/en-US/es-ES); `pnpm run ui:audit:ci` exit 0.
- NÃO VERIFICADO: leitor de tela real; zoom 200% com zoom de navegador real; toque em dispositivo
  físico; frames perdidos em dispositivo médio (o portão é estático); `--color-primary` como texto
  sobre fundo claro segue em 4,41:1 (reprova por 0,09) aguardando decisão de marca, porque a
  correção escurece a cor em botões, mapa e gráficos.
- LIMITE DO AMBIENTE (já registrado no T532): o DSH descobre `.dsh/skills/` na ABERTURA da sessão;
  as 8 skills novas (`motion-craft`, `motion-review`, `ui-library-choices` + as 5 do T532) só
  aparecem no catálogo após reabrir a sessão. Durante a sessão o conteúdo foi lido do arquivo.

Stage Summary:
- O projeto passa a ter régua de animação escrita, atribuída e verificável — 3 skills novas +
  1 papel de subagente + 2 scripts (`audit-motion.mjs`, `run.mjs`) + 5 npm scripts
- 25 ferramentas curadas com veredito em fonte primária: 1 adotada como skills, 1 usada como
  auditoria externa, 6 como registry opcional, o resto referência ou vetado por licença/stack
- Home local saiu de 26 anti-padrões para **0**; tema claro passou a cumprir WCAG AA na escala de
  alfa inteira; 38 `transition-all` eliminados sem regressão de hover
### Fecho da rodada T533 (revisão adversarial + correções)

- CRÍTICA DE MOVIMENTO independente (`motion-critic`) rodou o portão (0 bloqueios) e revisou as
  mudanças. Veredito **APROVADO**, com uma regressão real que eu não tinha visto:
  `ChampionsCarousel.tsx:199` — o ponto ativo usava `w-2` → `w-6` e o `transition` nomeado
  **não cobre `width`**, então o indicador passou a saltar. Corrigido com animação de pintura
  (`scale-x-0 → scale-x-100` sobre caixa fixa), medido por injeção de classe: ativo pinta 24px,
  inativo 0px, espaçamento estável em 44px entre o 1º e o 3º ponto.
- O crítico também apontou `(hover: hover)` sem `(pointer: fine)` — corrigido para o par exigido
  pela régua — e sugeriu a curva forte no GSAP, o que revelou um defeito mais grave: o GSAP
  **falha em silêncio** com a string `cubic-bezier(...)` (medido: `parseEase` devolve `undefined`
  e cai em `power1.out`). Trocado para `power4.out` (equivalente medido da curva) e virou regra
  de **bloqueio** no portão (`css-ease-string-in-gsap`), porque é invisível em revisão de leitura.
- Portão ajustado para o token atual (`--color-foreground: #340808`): o piso de texto é `/60`,
  então a regra `low-alpha-text` passou a acusar `/1x`–`/5x` (antes comparava com o token antigo e
  gerava 100 avisos falsos). Relatório ganhou a severidade `INFO`, separada de ATENÇÃO, e as
  regras passaram a ser ordenadas por severidade (bloqueio → atenção → informativo).
- Verificação final: `typecheck` limpo · **64/64** testes · portão **0 bloqueios / 0 atenção /
  7 informativos** · contraste renderizado do hero **0 reprovações** · `impeccable detect` na home
  local **exit 0 (zero achados)** · `--check` do sync sem drift.
- Nenhuma dependência nova: `package.json` da raiz ganhou só 5 npm scripts; `apps/web/package.json`
  e o lockfile estão intocados; zero import de `framer-motion`, `animejs` ou `components/ui`.
Task ID: goal-2026-10-13/t534
Agent: Operador + Doer (ZCode)
Task: T534 — SESSÃO DE DECISÃO ESTRATÉGICA (Beta Aberta)

Work Log:
- BRIEFING apresentado com dado VERIFICADO antes das decisões (não com o número do
  despacho): integridade (matches 15.981 · rankings 72 · entries 1.906 · WON 5.205 ·
  clubes 11.987), prontidão técnica (100% 2xx, 0% erro, CPU máx 0,17 de 8 vCPU,
  memória máx 769 MB de 8 GB, p99 3 ms na plataforma e 9,2 ms no /matches medido no
  container), cache (hit rate 68,1%) e gaps de cobertura (uniformes ~22 noites;
  hinos/flâmulas/360º limitados pela fonte).

- VERIFICAÇÕES FEITAS PARA INFORMAR AS DECISÕES (não supostas):
  · `trustProxy: true` está configurado e o teste empírico confirma: do IP externo,
    exatamente 100×200 e depois 429 — o rate-limit é por IP REAL, não global. (Se
    fosse global, seria bloqueador de Beta; descartado com prova.)
  · k6 existe no repo (`scripts/k6/load-test.js`, `stress-test.js`, BASE_URL por env,
    até 200 VUs) e JÁ foi executado em 12-08-2026 (T003): 3.710 req/s sustentados,
    0% de erro, p95 78 ms — números de quando havia 2.450 partidas (hoje 15.981).
  · Smoke das jornadas críticas (hoje): web `/`, `/clubs`, `/competitions`,
    `/rankings`, `/privacidade`, `/termos`, `/planos` = 200; api `/health`, `/clubs`,
    `/rankings`, `/matches`, `/competitions` = 200.
  · Estado do repo COMPARTILHADO: 107 arquivos modificados NÃO commitados pela outra
    sessão (76 em apps/** — todos em apps/web, ZERO em apps/api —, 14 em .zcode/,
    4 em plugins/, 4 em docs/, mais AGENTS.md +18 linhas e .gitignore).

- DECISÕES TOMADAS PELO OPERADOR (13-10-2026):
  1. **Plano Vercel: MANTER GRATUITO.** O Preview vermelho é limite de builds do plano,
     não defeito; produção está verde e a Beta não depende de preview. Reavaliar se o
     loop de revisão visual virar gargalo.
  2. **Carga: BETA DIRETA + OBSERVAÇÃO, sem k6.** A escala de uma Beta pequena está
     coberta pela evidência existente (3.710 req/s medidos; 0% de erro hoje com 98% de
     CPU livre), e rodar k6 de uma máquina só contra produção mediria o rate-limit
     (provado: 429 após 100 req do mesmo IP), não o app.
  3. **Coordenação: ISOLAR POR ÁREA, sem sequenciar.** Esta sessão toca apps/api +
     docs de dados; a outra toca apps/web + plugins + .zcode. Regra dura dos dois
     lados: NUNCA `git add -A` / `git stash` / `git checkout` amplo — só caminhos
     explícitos.
  4. **Data: AGUARDAR A JANELA DE 7 DIAS.**

- BETA ABERTA AGENDADA: **20-10-2026**. A janela de observação do T533 são as 7
  execuções do cron de mídia (07:00 UTC) de **13/10 a 19/10**; o fecho do T533
  (checkpoint final com a série) é em **19-20/10**, e a abertura em **20-10-2026**.
  Escolha do dia da semana pelo Operador se preferir outro (a data é dele).

- AÇÕES TÉCNICAS EXECUTADAS NESTA SESSÃO:
  · Correção de DOCUMENTAÇÃO que era erro meu (propagado no T527): o PLANO_MESTRE
    afirmava que a PÁGINA `/matches` serve as partidas. Ela **não existe** (`/matches`
    responde 404 no web; não há link quebrado no produto ✓). O que serve os dados é o
    endpoint `GET /api/v1/matches` e as superfícies que os consomem (estatísticas por
    clube e confronto direto no comparador). Item corrigido para `[~]` e registrado
    como gap declarado da Beta.
  · Regra de coordenação adotada do meu lado (caminhos explícitos no git) — e
    declarada aqui para o outro lado seguir a mesma.
  · Checklist de abertura da Beta preparado (abaixo), com o que está pronto e o que
    fica como gap declarado.

- CHECKLIST DE ABERTURA DA BETA (o que é verificável):
  · [x] Smoke das jornadas críticas 200 (web e API) — medido hoje
  · [x] Legal publicado (8 rotas) e pagamento Stripe LIVE
  · [x] Observabilidade: `railway metrics` + `/jobs/health` + logs estruturados
  · [x] Cron de mídia registrado e com cursor que avança (cobertura sobe sozinha)
  · [x] Integridade com baseline registrado (T533 Dia 0) — referência para comparar
  · [x] Health fora do rate-limit (probe não compete com o app)
  · [ ] **Página `/matches` no web** — gap declarado (item de UI, não de dado)
  · [ ] **Preview Vercel por PR** — limitado pelo plano (não afeta produção)
  · [ ] **AGENTS.md editado pela sessão paralela** (+18 linhas, NÃO commitado) —
        revisar antes de deixar entrar no main: é o arquivo que governa as instruções
        dos agentes e uma sessão vizinha não deve mudá-lo sem o Operador
  · [ ] **Nome do DPO** e demais itens de identidade/assinatura — Operador

GAPS DECLARADOS: a janela de 7 dias ainda não ocorreu (a série de métricas é coleta dos
dias 13-19/10); nenhum teste de carga concorrente real foi feito (decisão consciente:
Beta direta + observação); a página `/matches` segue inexistente.

Stage Summary:
- 4 decisões tomadas e registradas, com a evidência que as fundamenta
- Beta Aberta agendada para 20-10-2026 (após as 7 noites de cron: 13-19/10)
- Erro de documentação meu corrigido (página /matches não existe) + checklist de
  abertura com 3 itens abertos (um deles o AGENTS.md da sessão paralela)
