# Roadmap Pós-Plano-Mestre — Almanaque dos Clubes

> Documento de planejamento estratégico para o desenvolvimento contínuo
> após a conclusão das 10 fases do PLANO_MESTRE.md.
> Versão: 1.0 | Data: 2026-08-10

---

## 📍 ONDE ESTAMOS DE FATO (2026-09-22 — supersedes o diagnóstico abaixo)

O diagnóstico desta página é de 10/08 — **desatualizado** (a Fase 10 "Go to Production" e as
fases 11+ já foram executadas de outra forma). Estado real (fonte: PLANO_MESTRE.md +
RECONCILIATION-REPORT.md §22, re-ancorado em produção):

- **M1 (Beta Fechada — ler/navegar) ✅ declarado** (09-15) · **M2 (engajar) ✅ 4/4** (rankings,
  favoritos, comparadores, carrossel) · **M3 (Open Beta monetizar) ✅ declarado** (09-21: Stripe
  LIVE, CDC art. 49 provado com estorno real).
- **WS-D (conteúdo)**: T448 + c/d/e/f fechados — 5.157 arestas WON com fonte por aresta, vitrine
  por hierarquia, gap 514 declarado (copas de acesso/estaduais → T448b-2).
- **Oferta honesta (T465)** + **legal P0 (T469)** no ar; M3 de PRODUTO (beta pago a 1.000) aguarda
  gate triplo: T465 ✅ + T468 (i18n checkout) + pacote jurídico do Operador.

### Fila travada (ordem do Thinker, um workstream por round)

1. **T470** direitos do titular + DMCA reais → 2. **T471** Opção B geo (UE/UK) →
2. **T472** i18n legal+checkout (= T468) → **beta pago abre** →
3. **T448b-2** RSSSF estaduais + auditoria de miscategorização → **T449** partidas/rankings por
   jogo (resolve dívida de tier) → **T450** feminino → **T451** cron → **T466/T467** dado
   geográfico + mapa-múndi → M5 (domínio próprio/DNSSEC = Operador).

O texto abaixo permanece como registro histórico do planejamento de 10/08.

---

## Estado Atual (Diagnóstico) — ⚠️ desatualizado, ver bloco acima

| Dimensão | Status | Observação |
|---|---|---|
| **API** | ✅ 14 módulos, 40+ endpoints | Pronta para produção |
| **Frontend** | ✅ 15+ rotas, Next.js 16 | Pronto para produção |
| **Auth** | ✅ JWT + RBAC + refresh rotation | Completo |
| **Banco** | ✅ 15 tabelas Prisma | Migration PostgreSQL pendente (Operador) |
| **Infra** | ✅ Docker Compose (PG + MinIO + Redis) | Pronto |
| **Testes** | ✅ 21 unit+int + 5 E2E + 2 k6 | Cobertura sólida |
| **CI/CD** | ✅ GitHub Actions + Docker + Trivy | Pronto |
| **Domínio** | ❌ Não registrado | Bloqueia produção |
| **Plataforma** | ❌ Não escolhida (Fly.io vs Railway) | Bloqueia deploy |
| **Pagamentos** | ❌ Webhook criado, sem provedor ativo | Bloqueia billing real |
| **IA/RAG** | ⚠️ Estrutura criada, Ollama não instalado | Requer setup |
| **ETL** | ⚠️ Conectores criados, sem scraper real | Requer implementação |

---

## 🔴 Fase 10 — GO TO PRODUCTION (Prioridade Máxima)

> Objetivo: colocar o Almanaque dos Clubes no ar com domínio próprio,
> pagamentos reais e monitoramento.

### 10.1 Domínio e DNS

| Tarefa | Esforço | Dependência | Responsável |
|---|---|---|---|
| Registrar domínio (`almanaque.app` ou similar) | 30 min | — | **Operador** |
| Configurar DNS (Cloudflare) | 30 min | Domínio registrado | Operador |
| Habilitar Cloudflare WAF + Bot Fight Mode | 15 min | DNS configurado | Operador |
| Submeter HSTS preload | 7 dias (aprovação) | Domínio + HTTPS | Operador |

**Verificação:** `curl -I https://almanaque.app` retorna HSTS header + TLS 1.3.

### 10.2 Plataforma de Deploy

| Opção | Custo | PostgreSQL | Redis | Docker | Facilidade |
|---|---|---|---|---|---|
| **Fly.io** | $5/mês crédito | ✅ Gerenciado | ✅ Upstrada | ✅ | Alta |
| **Railway** | $5/mês | ✅ Gerenciado | ✅ Plugin | ✅ | Alta |
| **Self-hosted VPS** | $10-20/mês | Manual | Manual | ✅ | Média |

**Decisão pendente (Operador).** Recomendação: Fly.io pelo PostgreSQL gerenciado + Docker nativo.

### 10.3 Stripe/PagSeguro Integration

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Criar conta Stripe | 15 min | Stripe.com — gratuito, pay-per-use |
| Configurar webhook HMAC | 2h | `apps/api/src/modules/billing/routes.ts` já aceita eventos |
| Implementar prorrotação | 4h | Upgrade/downgrade com cálculo de dias restantes |
| Testar ciclo completo | 4h | Assinar → pagar → upgrade → cancelar |

### 10.4 Deploy Inicial (Staging)

```bash
# 1. Build e push Docker
docker build -t registry.fly.io/almanaque-api -f apps/api/Dockerfile .
fly deploy

# 2. Executar migration
fly ssh console -C "npx prisma migrate deploy --schema=prisma/schema.prisma"

# 3. Seed dados iniciais
fly ssh console -C "pnpm db:seed"

# 4. Verificar healthcheck
curl https://staging.almanaque.app/api/v1/health
```

---

## 🟡 Fase 11 — DATA ENRICHMENT

> Objetivo: popular a plataforma com dados reais de futebol.

### 11.1 ETL Pipeline — Scrapers Reais

| Tarefa | Esforço | Prioridade |
|---|---|---|
| RSSSF scraper para clubes brasileiros | 8h | 🔴 Alta |
| RSSSF scraper para competições | 4h | 🔴 Alta |
| FBref scraper para partidas (temporada atual) | 8h | 🔴 Alta |
| Wikipedia infobox parser (clubes) | 4h | 🟡 Média |
| Validar e deduplicar dados importados | 4h | 🔴 Alta |

### 11.2 IA/RAG — Pipeline Completo

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Instalar Ollama no servidor | 30 min | `curl -fsSL https://ollama.com/install.sh | sh` |
| Baixar modelo BGE-M3 para embeddings | 5 min | `ollama pull bge-m3` |
| Baixar modelo LLM (Llama 3.2 ou Qwen 2.5) | 10 min | `ollama pull llama3.2` |
| Implementar geração de embeddings | 4h | API → pgvector |
| Implementar busca vetorial semântica | 4h | pgvector similarity search |
| Implementar pipeline RAG completo | 8h | search → context → LLM → answer + citations |
| Testar com 100 perguntas reais | 4h | Precisão > 80% |

### 11.3 Knowledge Graph — População

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Importar relações clube→competição | 2h | Dados do ETL |
| Importar relações jogador→clube | 4h | Dados do FBref |
| Endpoint `/api/v1/graph/visual` | 4h | D3.js ou vis.js para visualização |

---

## 🟢 Fase 12 — GROWTH & ENGAGEMENT

> Objetivo: reter usuários, melhorar descoberta e conversão.

### 12.1 Email & Notificações

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Integrar Resend (email transacional) | 2h | Gratuito até 100 emails/dia |
| Email de boas-vindas pós-registro | 2h | Disparado via BullMQ |
| Email de recuperação de senha | 2h | Já implementado, falta template |
| Notificação via WebSocket | 2h | Já implementado (`/ws`) |

### 12.2 SEO & Conteúdo

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Blog com artigos sobre história do futebol | Contínuo | SEO content marketing |
| Páginas estáticas para principais clubes | 8h | `/clubes/flamengo`, `/clubes/santos`, etc. |
| Rich snippets para Google | 2h | JSON-LD já implementado |
| Backlink outreach | Contínuo | Parcerias com sites de futebol |

### 12.3 Conversão Free → Pro

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Upgrade prompt inteligente | 4h | Mostrar upgrade após 5 buscas |
| Trial de 7 dias PRO | 4h | Sem cartão de crédito |
| Comparativo de planos na página de pricing | 2h | Já implementado em `/dashboard/subscription` |

---

## 🔵 Fase 13 — PERFORMANCE & ESCALA

> Objetivo: garantir desempenho para 50k usuários.

### 13.1 Otimizações Imediatas

| Tarefa | Esforço | Impacto |
|---|---|---|
| `fastify-compress` (gzip/brotli) | 1h | 🔴 Reduz payload em 70% |
| HTTP/2 + Server Push | 1h | 🔴 Melhora carregamento |
| CDN para assets estáticos | 2h | 🟡 Cloudflare ou R2 |
| Lazy loading de imagens | 2h | 🟡 Melhora LCP |

### 13.2 Otimizações de Banco

| Tarefa | Esforço | Impacto |
|---|---|---|
| Revisar queries lentas no k6 | 4h | 🔴 Identificar N+1 |
| Adicionar índices compostos faltantes | 2h | 🔴 Acelerar buscas frequentes |
| Paginação cursor-based (em vez de offset) | 4h | 🟡 Estável em alta escala |
| Materialized views para rankings | 2h | 🟡 Rankings calculados |

### 13.3 Cache Inteligente

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Cache em clubes:list com Redis | ✅ Já feito | TTL 60s |
| Cache em clubes:byId | ✅ Já feito | TTL 300s |
| Cache em rankings publicados | 2h | 🟡 TTL 1h (imutáveis) |
| Cache em competitions:list | 1h | 🟡 TTL 5min |
| Invalidar cache ao escrever | ✅ Já feito | clubs.create invalida |

---

## ⚪ Fase 14 — GOVERNANÇA & MATURIDADE

> Objetivo: tornar o projeto sustentável a longo prazo.

### 14.1 Monitoramento

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Loki + Promtail (logs centralizados) | 4h | Docker Compose ou Fly.io |
| Prometheus + Grafana (métricas) | 4h | Dashboards de latency, error rate, traffic |
| Alertas no Grafana | 2h | 5xx > 1%, P95 > 500ms |
| Uptime Kuma (healthcheck público) | 1h | Alternativa gratuita ao UptimeRobot |

### 14.2 Segurança Contínua

| Tarefa | Frequência | Detalhes |
|---|---|---|
| `pnpm audit` + Dependabot | Semanal | ✅ Já configurado |
| Rotação de JWT secrets | 90 dias | ✅ Script `scripts/rotate-secrets.sh` |
| Revisão de logs de auditoria | Mensal | AuditLog no banco |
| Pentest (OWASP ZAP) | Semanal | ✅ Workflow GitHub Actions |
| Revisão de vulnerabilidades | Trimestral | Revisão manual |

### 14.3 Backup & DR

| Tarefa | Esforço | Detalhes |
|---|---|---|
| Backup automático PostgreSQL | ✅ Já feito | `scripts/backup-db.sh` |
| Backup de uploads (MinIO→R2) | 2h | `mc mirror` |
| Teste de restore | Trimestral | Validar backup |
| Plano de DR documentado | 4h | Disaster Recovery Plan |

---

## 📊 Priorização Geral

### Esta Semana (Fase 10)

```
1. [Operador] Registrar domínio
2. [Operador] Escolher Fly.io ou Railway
3. Criar conta Stripe + configurar webhook
4. Deploy staging com Docker
5. Executar migration PostgreSQL
```

### Este Mês (Fases 10-11)

```
6. Stripe integrado e testado (pagamento real)
7. RSSSF scraper para dados brasileiros
8. Ollama + pgvector operacionais
9. RAG pipeline respondendo perguntas reais
10. Deploy produção + HSTS preload
```

### Próximo Trimestre (Fases 12-14)

```
11. Email onboarding + recuperação de senha
12. Blog + SEO content strategy
13. Conversão Free→Pro otimizada
14. Observabilidade (Loki + Grafana)
15. Teste de carga com 1000 usuários reais
16. Cache em endpoints críticos
```

---

## 🚧 Riscos e Bloqueios

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Domínio não registrado | Alta | 🔴 Produção bloqueada | Prioridade #1 para Operador |
| Stripe onboarding lento | Média | 🟡 Billing real atrasado | Começar com Pix/PagSeguro como fallback |
| Scraping de dados complexo | Alta | 🟡 ETL incompleto | Começar com dados manuais + Wikipedia API |
| Custo de infraestrutura | Média | 🟡 Escala limitada | Fly.io $5/mês cobre estágio inicial |
| Baixa adoção de usuários | Média | 🟠 Desmotivação | Validar com Beta Fechada de 100 usuários |

---

## 📋 Ações Imediatas para o Operador

| Item | O que fazer | Tempo |
|---|---|---|
| 1 | Registrar domínio em registro.br ou Cloudflare | 30 min |
| 2 | Criar conta no Fly.io + instalar CLI | 15 min |
| 3 | Executar `pwsh ./scripts/migrate.ps1` (migration PostgreSQL) | 5 min |
| 4 | Criar conta Stripe + copiar webhook signing secret | 15 min |
| 5 | Configurar variáveis de ambiente no Fly.io secrets | 10 min |
