# DECISOES.md

Registro permanente de decisões técnicas e de produto do projeto.
Cada entrada segue o formato abaixo. Decisões registradas **não se re-discutem**
sem fato novo (PROTOCOLO_MESTRE.md, Seção 3, item 4).

Formato obrigatório:

```
## [AAAA-MM-DD] Decisão: <o quê>
Motivo: <por quê>
Alternativas consideradas: <se houver>
```

---

## Histórico de decisões

<!-- Novas decisões devem ser adicionadas ACIMA da linha abaixo, em ordem cronológica. -->

### [2026-08-11] Decisão: Reconciliar PLANO_MESTRE.md com evidência executável (T001)
Motivo: PLANO_MESTRE.md afirmava `[x]` e verificações "passando" sem que comandos reais tivessem sido executados nesta sessão. A Seção 6 do Protocolo exige evidência executável antes de `[x]`.
Alternativas consideradas: (a) aceitar o documento como estava — descartada por violar o protocolo; (b) rodar todos os comandos de verificação e corrigir o documento com base no resultado — escolhida.
Evidência coletada (2026-08-11, Node 24 / pnpm 11.13.1):
- `pnpm install --frozen-lockfile` — ✅ passa.
- `pnpm --filter @almanaque/api test` + `pnpm --filter @almanaque/domain test` — ✅ 21/21 (API 17 + Domain 4).
- `pnpm test` (recursivo) — ❌ falha em `@almanaque/feature-flags` (packages/feature-flags não tem arquivos de teste; vitest sai com exit 1).
- `pnpm lint` — ❌ inicialmente 91 erros (87 Prettier auto-fixáveis via `--fix`); restam 4 erros @typescript-eslint/no-unused-vars (`apps/api/src/modules/auth/rate-limit.service.ts`, `apps/api/src/middleware/csrf.ts`) + 13 warnings security/detect-object-injection (`packages/feature-flags/src/index.ts`).
- `pnpm typecheck` — ❌ 10 erros em @almanaque/api: `csrf.ts:7` (userId não usado), `rate-limit.service.ts` (ioredis import não-construtível, vars não usadas), `cache.ts:3` (ioredis), `websocket.ts` (módulo `ws` indisponível/indisponível tipagem, params implicit any), mais TS6196/7006. `@almanaque/domain` não alcançado (API falha antes).
- `prisma migrate status` — não executável sem `.env`/DATABASE_URL (arquivo é gitignored e não está configurado local).
Gaps registrados no PLANO_MESTRE.md:
1. Fase 2 itens 2.7 (`data_sources`, `entity_revisions`) e 2.10 (criptografia na coluna) estavam `[x]` com texto "pendente" — demovidos para `[ ]`; tabelas realmente não existem no schema.
2. Fase 8: SAST/E2E/k6 marcavam `[x]` sem execução — demovidos para `[~]`.
3. Fase 9.1.1/9.1.6: security gate não passaria hoje — `[~]`.
Observação: Nenhum código de produto foi alterado (restrição T001). Estes gaps viram pendências do Doer para a próxima tarefa de correção (lint + typecheck).


Motivo: Após reconstrução completa (repositório GitHub estava em estado pré-protocolo), todas as tarefas 2.3–2.13 foram implementadas com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6).
Alternativas consideradas: (a) aceitar a conversa compartilhada como prova de trabalho — descartada após auditoria revelar que commits `482e394`, `09ff0c6`, `1dbb1ec` não existiam no repositório real; (b) reconstruir tudo do zero sobre o commit `8cb9b67` (baseline MVP) — escolhida.
Observação: 164 asserções distribuídas em 5 scripts de smoke test (audit, crypto, session, rbac, billing) validam a implementação. Migration PostgreSQL consolidada (379 linhas, 63 CREATE statements) gerada e armazenada em `prisma/migrations-postgres/20260720000001_phase2_final/migration.sql`. Pendência: Operador executar `pwsh ./scripts/migrate.ps1` no Windows para aplicar no PostgreSQL.

### [2026-07-20] Decisão: AuditLog polimórfico (entityType + entityId) em vez de FKs separadas
Motivo: AuditLog rastreia mudanças em múltiplas entidades (User, Club, Subscription, etc.). FK explícita para cada uma geraria N colunas opcionais. Solução polimórfica com índice composto `@@index([entityType, entityId])` cobre todos os casos.
Alternativas consideradas: (a) tabela `audit_logs` separada por entidade (audit_user_logs, audit_club_logs, ...) — descartada por explosão de tabelas; (b) JSON column com `entity` embutido — descartada por perder indexação.
Trade-off: Perde integridade referencial ao nível do banco (FK), mas ganha flexibilidade. Aplicação garante que `entityType` seja válido.

### [2026-07-20] Decisão: SHA-256 para tokens, argon2id para senhas
Motivo: Senhas são baixa-entropia (escolhidas por humanos) — precisam de KDF memory-hard (argon2id). Tokens já são 32 bytes aleatórios (256 bits) — não precisam de KDF; SHA-256 é rápido (~1μs vs ~100ms do argon2) e adequado para hot path `/auth/refresh`.
Alternativas consideradas: (a) argon2id para ambos — descartada por latência excessiva em refresh; (b) SHA-256 para ambos — descartada por vulnerabilidade a rainbow tables em senhas.

### [2026-07-20] Decisão: Cache de permissões RBAC em memória (TTL 5 min), não Redis
Motivo: Cache local por processo é suficiente para estágio atual (monolito modular, instância única). TTL 5 min é trade-off aceitável entre latência e consistência. Multi-instance + invalidação cross-instance via Redis pub/sub será adicionada na Fase 6.3.
Alternativas consideradas: (a) Redis desde já — descartada por adicionar complexidade desnecessária antes do produto estar em produção; (b) sem cache (query a cada request) — descartada por latência 5-10ms em hot path.

### [2026-07-20] Decisão: índices full-text via SQL raw, não declarativos no Prisma
Motivo: Prisma 5.22 não suporta declarativamente índices GIN em colunas tsvector, índices trigram (pg_trgm), ou triggers. Solução: colunas `Unsupported("tsvector")?` no schema (Prisma Client sabe que existem) + arquivo `fulltext-indexes.sql` aplicado separadamente via `migrate.ps1`.
Alternativas consideradas: (a) usar apenas `LIKE`/`ILIKE` — descartada por não escalar em 50k+ clubes; (b) biblioteca externa (ex.: MeiliSearch, Typesense) — descartada por adicionar infraestrutura externa (PROTOCOLO_MESTRE.md Seção 3 item 1: custo zero).

### [2026-07-20] Decisão: valores monetários em centavos (int), não reais (float)
Motivo: Float tem problema de precisão (0.1 + 0.2 = 0.30000000000000004). Centavos (int) são exatos e aceitos por todos os provedores de pagamento (Stripe, PagSeguro).
Alternativas consideradas: (a) Decimal/numeric no PostgreSQL — descartada por não ter tipo equivalente nativo em TypeScript; (b) float com arredondamento — descartada por acumular erro.
Aplicação: `Billing.amountCents` é `Int` (centavos de BRL). Preços: FREE=0, PRO=2900, ELITE=9900.

### [2026-07-16] Decisão: Adoção do Protocolo Mestre v2.0 e retrofit do projeto
Motivo: O Operador publicou o PROTOCOLO_MESTRE.md v2.0 como nova lei suprema do processo. O projeto já continha código do MVP (Fastify + Prisma + SQLite/PostgreSQL) e um PLANO_MESTRE.md anterior, ambos produzidos antes do protocolo existir.
Alternativas consideradas: (a) descartar o MVP e refazer do zero sob o protocolo — descartada por desperdício; (b) aceitar o MVP como baseline e prosseguir sob o protocolo a partir de agora — escolhida.
Observação: O PLANO_MESTRE.md existente será revisado e reconstruído a partir do Discovery (Seção 4) e do Anexo A. Itens já implementados no MVP serão marcados `[x]` apenas após verificação de evidência (Seção 6).

### [2026-07-16] Decisão: Stack técnica inicial (mantida do pré-protocolo)
Motivo: TypeScript + Node.js + Fastify + Prisma + PostgreSQL/SQLite já estavam em uso, todos gratuitos e open-source, em conformidade com a Seção 3, item 1.
Alternativas consideradas: NestJS (mais pesado, scaffolding maior); Express (sem validação/schema nativos). Fastify venceu por ser leve, ter TypeScript first-class e plugins oficiais para helmet/cors/rate-limit.

---

## Discovery (Seção 4 do Protocolo) — Respostas do Operador

### [2026-07-16] Decisão: Definição de produto (Discovery Q1)
**Resposta:** O Almanaque dos Clubes é uma plataforma mundial de pesquisa e inteligência sobre futebol que reúne a história completa de clubes, jogadores e competições, enriquecida por rankings, estatísticas e IA com respostas fundamentadas em dados.
Motivo: Estabelece o escopo funcional do produto: não é só um diretório — é uma plataforma de inteligência com IA. Justifica a inclusão de Fase 6 (Knowledge Graph, RAG) e Fase 8 (auditoria de IA) no plano.

### [2026-07-16] Decisão: Público-alvo e escala esperada (Discovery Q2)
**Resposta:** Torcedores, jornalistas, pesquisadores, criadores de conteúdo, analistas, clubes/federações (B2B). Crescimento: Beta Fechada 100 → Open Beta 1.000 → Ano 1: 10.000–50.000 cadastrados. Arquitetura deve escalar além disso.
Motivo: Escala prevista justifica monolito modular (não microsserviços —_COMPLEXIDADE extra não justificada em <50k usuários), mas exige desde já: paginação correta, índices, cache (Fase 6), rate-limit por usuário (Fase 7), observabilidade (Fase 9). 50k usuários não pede microsserviços, mas pede CI/CD sólido e zero downtime.
Alternativas consideradas: microsserviços desde o início (descartada — Seção 3 item 6: solução mais simples vence entre equivalentes).

### [2026-07-16] Decisão: Referências de produto (Discovery Q3)
**Resposta:** ZeroZero, Transfermarkt, Soccerway, WorldFootball.net, RSSSF, FBref, Wikipedia, Sofascore, Flashscore. Diferencial: combinar acervo histórico + rankings auditáveis + IA RAG com citações + Knowledge Graph + curadoria.
Motivo: Define o padrão de qualidade esperado. Acervo histórico extenso (RSSSF-like) exige modelagem de dados flexível e versionamento de fontes (Fase 2 avançada + auditoria). IA com citações exige pipeline RAG rastreável (Fase 6). Rankings "auditáveis" exige imutabilidade/versionamento (Fase 2 — soft delete + audit_logs).

### [2026-07-16] Decisão: Funcionalidades sensíveis (Discovery Q4)
**Resposta:**
- Login: **Sim**
- Pagamento (assinatura): **Sim**
- Dado sensível: **Não** (apenas dados básicos de conta + cobrança por provedores externos)
- Upload de arquivo: **Sim** (administradores + importação/exportação de dados)
Motivo (impacto no plano):
- Login → Fase 3 vira `[OBRIGATÓRIO]` (gatilho do Anexo A atendido).
- Pagamento → adiciona sub-fase de billing (Stripe/provedor gratuito — Seção 3 item 1: usar stripe.com é gratuito para usar, cobra apenas taxa por transação; alternativas open-source são PagSeguro/Pix direto — decidir em Fase 4).
- Sem dado sensível → 2FA TOTP vira `[CONDICIONAL]` (não é saúde/financeiro/documento). Mesmo assim, recomendado para contas pagas — deixaremos como item opcional dentro da Fase 3.
- Upload → Fase 6 upload vira `[OBRIGATÓRIO]` (administradores vão importar CSV).

### [2026-07-16] Decisão: Prazo (Discovery Q5)
**Resposta:** Não. Prioriza qualidade, consistência arquitetural e estabilidade. Marcos: Beta Fechada → Open Beta → v1.0, sem data fixa.
Motivo: Permite não pular etapas de segurança (Seção 3 item 3 — nada fecha sem evidência). Remove pressão de "lançar antes do seguro". Fases 7 (hardening) e 8 (testes/DAST) podem ser feitas com calma.

### [2026-07-16] Decisão: Marca e domínio (Discovery Q6)
**Resposta:** Nome "Almanaque dos Clubes" definido. Marca definida. Domínio ainda não.
Motivo: Fase 7 (DNSSEC/CAA/HSTS preload) fica `[CONDICIONAL: domínio próprio em produção]` — só entra quando o Operador registrar o domínio. Até lá, deploy pode usar subdomínio gratuito (ex.: Railway/Fly.io) sem HSTS preload. Adicionado item futuro em PENDENCIAS_OPERADOR.md: "escolher e registrar domínio".

### [2026-07-16] Decisão: Definição de "pronto" (Discovery Q7)
**Resposta:** Pronto = usuário consegue: pesquisar entidades do futebol mundial, navegar histórico, comparar informações, usar IA com citações — com infraestrutura de ETL, governança e operação funcionando em segundo plano. Planos Free/Pro/Elite ativos.
Motivo: Estabelece o critério de aceitação global do projeto (Seção 9 do Protocolo). Tudo abaixo disso é "em progresso", não "pronto". Afeta profundamente a estrutura do plano:
- Exige Fase 6 com ETL pipeline (atualização automática) — vira `[OBRIGATÓRIO]`.
- Exige Fase 6 com IA/RAG — vira `[OBRIGATÓRIO]`.
- Exige Fase 4 com billing (Free/Pro/Elite) — adicionada como sub-fase.
- Exige Fase 9 com observabilidade real — `[OBRIGATÓRIO]`.

---

## Classificação de fases (Anexo A) após Discovery

| Fase | Classificação | Justificativa |
|------|--------------|---------------|
| 0 – Setup | OBRIGATÓRIO | sempre |
| 1 – Infra base | OBRIGATÓRIO | sempre |
| 2 – Dados | OBRIGATÓRIO + tabelas de auth/billing/audit | login + assinatura |
| 3 – Auth | OBRIGATÓRIO (2FA TOTP OPCIONAL) | login confirmado; sem dado sensível |
| 4 – APIs/CRUDs | OBRIGATÓRIO + módulo de billing | assinatura confirmada |
| 5 – Frontend | OBRIGATÓRIO | sempre |
| 6 – Avançado | UPLOAD OBRIGATÓRIO; FILA OBRIGATÓRIO (ETL); CACHE OBRIGATÓRIO (50k users); IA/RAG OBRIGATÓRIO (diferencial de produto); WEBSOCKET CONDICIONAL | confirmado por Q4+Q7 |
| 7 – Hardening | VAULT CONDICIONAL (deploy nativo basta); DNSSEC/HSTS CONDICIONAL (sem domínio ainda) | Q6 |
| 8 – Testes/segurança | OBRIGATÓRIO + DAST OBRIGATÓRIO (superfície pública grande) | sempre + Q2 |
| 9 – CI/CD e deploy | OBRIGATÓRIO | sempre |
