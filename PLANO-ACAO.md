# PLANO-ACAO.md — Plano de Ação e Método de Execução Autônoma

> Almanaque dos Clubes · Fase F16: execução do backlog para o produto. · Base: `PLANO_MESTRE.md` (status 2026-09-02, branch `50af90c`).
> **Objetivo:** transformar a plataforma já sólida (infra + segurança + auth + CI) no **produto Almanaque**, autônoma, com precisão, rigor técnico, segurança e escalabilidade.

## 0. Objetivo principal (North Star)

**Definição de produto-pronto (v1.0):** uma plataforma mundial de inteligência em futebol em que um usuário consegue
- **Navegar** o futebol mundial (clubes, jogadores, competições, partidas, estádios), de qualquer país;
- **Comparar e ranquear** com métricas auditáveis e com fonte citada;
- **Assinar** (Free/Pro/Elite) e pagar de forma segura;
- **Confiar no dado** — todo fato tem origem (Wikidata/RSSSF/competição) e trilha de auditoria;
- **Manter seus dados protegidos** (LGPD: consentimento, direitos do titular, minimização);
- **Estar disponível e observável** em produção (uptime, alertas, backup).

**Não é o objetivo:** virar agregador sem fonte, ou plataforma com número inflado. O rigor do dado citado é o diferencial.

---

## 1. Princípios inegociáveis (rigor técnico, segurança, escalabilidade)

Estes são válidos para **toda** tarefa. Uma tarefa que viole um deles é rejeitada no review (DoD falha):

### 1.1 Segurança
- **Validação Zod em todo endpoint de escrita**; nunca confiar em payload não validado.
- **Auth + RBAC** em todo fluxo que toca dado de usuário; `withRlsContext` em dado protegido por RLS.
- **Rate-limit por IP e por usuário** em rotas sensíveis (`/auth/*`, admin, export).
- **Idempotência** em todo write não-trivial (webhook, upload, jobs).
- **Sanitização de saída**; nunca expor campos internos; `DOMPurify` em HTML dinâmico.
- **Segredos apenas em secret manager** (Railway/GitHub); **nunca** no repo, chat, log ou commit. `gitleaks` deve passar.
- **Sem hard-delete** em dados de usuário; soft-disable com reversão documentada.
- **HTTPS-only**; headers de segurança (CSP, X-Frame-Options DENY, HSTS) ativos em produção.

### 1.2 Escalabilidade
- **Paginação cursor-based** em qualquer listagem que possa crescer (clubes, jogadores, rankings).
- **Índices** em toda FK e em colunas de busca/filtro frequente.
- **Cache read-through** (Redis) em listas/detalhes frequentes, com invalidação explícita.
- **Fila (BullMQ)** para jobs pesados (ETL, ranking, email, export) — nunca bloquear a request.
- **Jobs idempotentes** e com retry; observabilidade nos novos caminhos.
- **Conexões/pool** dimensionados; healthcheck + graceful shutdown.

### 1.3 Qualidade & Rigor do dado (o coração do produto)
- Todo registro de conteúdo tem `source` + `sourceUrl` + `data_source_id` (proveniência);
- Crawlers/ETL com **dedup por chave estável** (Wikidata QID, RSSSF competicao+campeao, etc.) e **idempotência**;
- Rankings com **algoritmo documentado** + normalização (MinMax) + reprodutível via cron;
- Nunca publicar métrica sem dado auditável (como feito no hero — T394).

---

## 2. Método de execução autônoma (Ciclo SIMBIOTICO-E)

> Cada **round** processa **um milestone de um workstream** até APPROVED + merge. Não se pula gates.

### 2.1 Papéis
- **Thinker** (planeja/revisa): lê PLANO-ACAO, escolhe a próxima tarefa, escreve a **spec T###** (objetivo, arquivos, DoD, STRIDE, dependências, paralelizável, comando de verificação, risco).
- **Doer** (executa): implementa, roda o menor teste relevante, mantém CI verde, ensaia em banco de teste antes de produção; usa **subagents** para tarefas independentes e paralelas.
- **Operador** (autoriza bloqueantes): identidade legal, provedor de pagamento, domínio, credenciais de terceiros, licenciamento não-aberto.

### 2.2 Ciclo de uma tarefa (1 round)
1. Thinker emite `T###` (spec).
2. Doer executa (paralelo: dispara subagents independentes juntos, trabalha em paralelo, não duplica jobs).
3. **Gates de qualidade** (ver 2.3) passam; verificação com o menor teste relevante.
4. Thinker revisa contra a spec; `APPROVED` → **merge via PR + CI verde** (regime padrão).
5. Conciliação: marca `[x]` no PLANO_MESTRE, atualiza DECISOES/DECISao se decisão nova, atualiza o sync.
6. Se **BLOCKED** (condição persistente ≥3 rounds): para, registra `blocked_reason` concreto, escale ao Operador.

### 2.3 Definition of Done (DoD) UNIVERSAL — toda tarefa entregue só se TODOS valerem
- [ ] `tsc --noEmit` 0 erros; `eslint` 0 erros; `prettier --check` ok.
- [ ] CI `security-gate` **verde real** (gitleaks + dependency-audit + testes) — nunca fabricar verde.
- [ ] Testes do escopo passam; cobertura de novos `services` ≥ 80% (parte do caminho até o gate global).
- [ ] Dados sensíveis em secret manager; `.gitignore` cobre novos `.env`/segredos; `gitleaks` limpo.
- [ ] Docs atualizados (risco/README/API); evidência registrada em DECISOES se decisão.
- [ ] Produção: **ensaio em banco de teste** antes; mudança reversível; **smoke** pós-deploy; **rollback documentado**.

### 2.4 Gates por tipo de mudança
| Tipo | Validação mínima | Requer Operador? |
|---|---|---|
| Código/feature/teste | tsc+lint+testes+CI verde | Não |
| Migration | versionada + reversível + ensaio em teste | Não (se reversível) |
| Dados (fonte aberta) | citação + dedup + idempotência + ensaio | Não |
| Infra Railway (var/secret/deploy) | rollback pronto + smoke imediato | Não |
| Produção em app_user/grant | ensaio em teste + rollback <5min + smoke | Não |
| Identidade legal / pagamento / domínio | — | **SIM — escale** |

### 2.5 Autonomia vs Escalação
**Executo autonomamente** (com validação + reversível): código, testes, CI, migrations versionadas, Railway/GitHub secrets (gerar e guardar sem imprimir), ingestão de **fontes abertas** (Wikidata, RSSSF, Wikimedia Commons, Wikipedia — com licença verificada), ensaio em banco de teste, ações de produção reversíveis com smoke/rollback.
**Escalo ao Operador** (não executo sozinho): identidade legal (razão social/CNPJ/endereço/DPO/e-mails), escolha de provedor de pagamento + credentials de merchant, domínio próprio + DNS, serviços cloud pagos (Meilisearch/observabilidade SaaS), e **qualquer fonte de dados com licença não-aberta** (FBref/StatsBomb/Transfermarkt têm restrições — usar apenas fontes abertas até autorização).
**Bloqueio:** condição que persistiu ≥3 rounds; registre o fato concreto em `blocked_reason`.

### 2.6 Cadência
- Um round = um milestone de um workstream. Foco em **um workstream por vez**, com subagents para tarefas paralelas dentro dele.
- Workstreams sem dependência entre si rodam encadeados (não concorrentes por round único) para manter atenção e qualidade.
- Reconciliar PLANO_MESTRE ao fechar cada milestone (nunca acumular pendências invisíveis).

---

## 3. Workstreams (WS) e dependências

| WS | Nome | Depende de | Autonomia |
|----|------|-----------|-----------|
| **WS-D** | Dados & Conteúdo (Wikidata/RSSSF/federações; seed; proveniência) | — | Autônoma (fontes abertas) |
| **WS-C** | Experiência Core (mapa-múndi, busca global, rankings 0-100, perfis, timeline, comparações, uniformes) | WS-D | Autônoma |
| **WS-G** | Infra Avançada (ETL auto, scrapers, IA RAG, Knowledge Graph, ClamAV, cache, fila, feature flags) | WS-D | Autônoma |
| **WS-F** | Frontend produto (páginas públicas/privadas, checkout UI, WCAG, Lighthouse>90, PWA) | WS-C (dados) + WS-P (backend checkout) | Autônoma (UI) |
| **WS-S** | Segurança & Escala (RLS em users, cripto coluna, rate-limit avançado, idempotência, indexes) | — | Autônoma |
| **WS-O** | Observabilidade (logs, métricas, alertas, uptime, backup automático) | — | Parcial (SaaS exige conta) |
| **WS-L** | Compliance & Legal (cookie banner, políticas, LGPD arts. 15-18, DMCA) | Identidade do Operador | Parcial → Operador |
| **WS-P** | Pagamentos (gateway, webhook HMAC idempotente, checkout) | Decisão Operador + WS-L | Parcial → Operador |

> **Nota de prioridade:** WS-D é o maior gap (99% do conteúdo) e é o que destrava WS-C, WS-G e WS-F. WS-S e WS-O rodam em paralelo (não bloqueiam e elevam o rigor). WS-L e WS-P ficam prontas no repo/estrutura e só **ativam** quando o Operador fornecer os dados legais.

---

## 4. Caminho crítico & marcos

| Marco | Critério de saída | WS envolvidos | Bloqueante? |
|-------|-------------------|---------------|-------------|
| **M0 — Método ativo** | Este doc mergeado; first task spec emitida | — | Não |
| **M1 — Beta Fechada (ler/navegar)** | Seeding ≥1.000 clubes via Wikidata; mapa-múndi read-only; perfis de clube/jogador; busca global; cookie banner + consentimento publicado; políticas publicadas | WS-D + WS-C + WS-L(1ª camada) | Não (cookie/consentimento independe de CNPJ) |
| **M2 — Beta Fechada (engajar)** | Rankings 0-100 em cron; favoritos em tempo real; comparadores; carrossel de campeões | WS-C + WS-G | Não |
| **M3 — Monetizar (Open Beta)** | Gateway de pagamento + checkout + webhook HMAC + assinatura funcional; compliance completo | WS-P + WS-L | **SIM — Operador** (provedor + identidade) |
| **M4 — v1.0 conteúdo amplo** | Futebol feminino; ETL automático; Knowledge Graph; ingestão RSSSF/federações | WS-D + WS-G | Não |
| **M5 — v1.0 público** | IA RAG citações; 360º; DAST+carga+observabilidade completos; domínio próprio+DNSSEC | WS-G + WS-S + WS-O | **SIM — Operador** (domínio) |

---

## 5. Dependências do Operador (bloqueantes)

| Item | Por que bloqueia | Override? |
|------|------------------|-----------|
| Razão social + CNPJ + endereço (END ART Studios) | Termos/Privacidade/Cookies/Contato exigem identidade do controlador | Não (legal) |
| Encarregado/DPO nomeado + e-mail | LGPD arts. 41-43 exposição pública | Não (legal) |
| E-mails oficiais (contato/suporte/privacidade/security/reembolso/direitos) | Contato + processos do titular | Não |
| Provedor de pagamento (Stripe/PagSeguro/Pix) + merchant | Checkout funcional | Não (financeiro) |
| Domínio próprio (compra/DNS) | DNSSEC/CAA/HSTS preload + marca | Não |
| Credenciais de cloud paga (Meilisearch, observabilidade SaaS, ClamAV host) | Serviços contratados | Não |

> Enquanto pendente: a estrutura (banner, políticas, webhook, checkout UI, testes) fica **pronta no repo** e é ativada quando os dados chegarem. Nada de dados de pagamento/identidade é simulado em produção.

---

## 6. Registro de riscos (premortem)

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Dado sem fonte / duplicado | Perde o diferencial (auditável) | `data_sources` + `source` + dedup por chave estável + proveniência em toda entidade |
| Ingestão não-idempotente duplica conteúdo | Dados sujos | Dedup por chave + upsert idempotente + job com retry |
| Ranking não-reprodutível/inflado | Publicidade enganosa (CDC art.37) | Algoritmo documentado + MinMax + cron + dados auditáveis |
| Compliance incompleto ao ar | Multa LGPD / bloqueio publicitário | Cookie banner + políticas + processo do titular + DPO antes do ar |
| RLS só em sessions (users sem RLS) | Exposição de PII | WS-S: RLS em users + grants mínimos + teste de matriz como app_user |
| Break de prod na troca de credencial | Auth fora do ar | Ensaio em teste + rollback <5min + smoke imediato |
| Observabilidade ausente | Incidente silencioso | WS-O em paralelo; alertas de 5xx/auth; backup diário 30d |
| Escopo crescendo sem conclusão | Nunca ir ao ar | Um workstream por round; DoD rígida; milestones com critério de saída |

---

## 7. Métricas de foco / definição de progresso

- **Rastreabilidade:** cada milestone fecha com PLANO_MESTRE atualizado (`[x]`) e evidência em DECISOES.
- **Qualidade:** cobertura de `services` subindo rumo a 80%; CI verde contínuo; 0 segredo no repo.
- **Conteúdo:** `count(clients/jogadores/competições)` crescendo e auditável; nenhuma métrica publicada sem dado real.
- **Segurança:** 0 hard-delete; RLS efetiva nos domínios de PII; auditoria de acesso ativa.
- **Disponibilidade:** prod com health 200; alertas configurados; backup diário verificado.

---

## 8. Ordem de execução recomendada (próximos rounds)

1. **M1 · WS-D** — Definir o **modelo de ingestão de dados** (fontes abertas + `data_sources` + dedup) e um **seed** de ≥1.000 clubes via Wikidata (proveniência). Este é o maior gargalo e destrava tudo.
2. **M1 · WS-C** — Mapa-múndi read-only + perfis + busca global (sobre o dado real).
3. **M1 · WS-L** — Cookie banner (1ª camada + preferências + prova de consentimento) e **políticas** (privacidade/termos/cookies/segurança) ativáveis assim que o Operador fornecer identidade.
4. **M2 · WS-C/WS-G** — Rankings 0-100 (cron) + favoritos em tempo real + comparações.
5. **WS-S** (paralela) — RLS em users + cripto coluna + rate-limit/idempotência — elevam segurança sem esperar Operador.
6. **WS-O** (paralela) — logs/métricas/alertas/backup — confiabilidade em produção.
7. **WS-P** (após decisão Operador) — gateway + checkout + webhook HMAC. Confirma M3.

> O método (seção 2) garante que cada um desses rounds rode de forma **autônoma**: spec → execução → gates → review → merge → reconciliação, com escalaão apenas nos bloqueantes legais/financeiros/domínio.

---

## 9. Estado do plano

- [ ] **M0** — método ativo (este doc)
- [ ] **M1** — Beta Fechada (ler/navegar)
- [ ] **M2** — Beta Fechada (engajar)
- [ ] **M3** — Open Beta (monetizar) [Operador]
- [ ] **M4** — v1.0 conteúdo amplo
- [ ] **M5** — v1.0 público [Operador]
