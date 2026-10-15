# Área Admin e catálogo de métricas do projeto

> Levantamento em 15-10-2026. **Toda métrica listada abaixo tem fonte real e foi executada
> contra a produção** (não é lista de desejo). Este documento é o plano de implementação da
> área admin, aprovado o desenho, o código é direto.

## 1. Estado atual (medido)

| camada | estado | evidência |
|---|---|---|
| Login/senha | ✅ existe | `modules/auth/*` — sessão, cookies `__Host-*`, rate-limit por IP+email |
| RBAC | ✅ existe | `auth/rbac.service.ts`: papel `ADMIN` = **todas** as permissões; papéis EDITOR/MODERATOR parciais |
| API admin | ✅ existe | `modules/admin/routes.ts` — `GET /admin/users`, `GET /admin/users/:id`, `POST .../suspend`, `.../reactivate`, `.../roles`, `DELETE .../roles/:role`, `GET /admin/roles`; `POST /admin/backup` |
| Métricas de infra | ✅ existe | `observability/metrics.ts` (registry Prometheus + `renderPrometheus`) exposto em `routes/metrics.ts` |
| Relatórios | ✅ existe | `modules/reports/` (service + routes) |
| Auditoria | ✅ existe | `modules/audit/` (`audit_logs` append-only) |
| **Área admin no web** | ❌ **não existe** | `apps/web/src/app/dashboard/` tem só `page.tsx`, `history/`, `subscription/` |
| **Métricas do acervo** | ❌ **não existem** | nenhum endpoint agrega os números do acervo |
| Menu "Observabilidade"/"Moderação" | 🔴 **link morto** | os itens aparecem no menu do dashboard e **não têm página** |

**Conclusão do desenho:** não é preciso "criar login para admin" — o login é o mesmo, e o
que define admin é o **papel** (`ADMIN`), que o RBAC já aplica. O que falta é (a) a **área no
web** e (b) a **agregação das métricas do acervo**.

## 2. Catálogo de métricas (com a fonte de cada uma)

### A. Acervo — volume
| métrica | fonte (executada em prod) |
|---|---|
| clubes / seleções / federações | `clubs` por `kind` → **9.699 / 2.300 / 4** |
| jogadores | `players` → **105.211** |
| partidas | `matches` → **17.265** |
| competições / temporadas | `competitions` **1.929** · `"CompetitionSeason"` **114** |
| rankings | `rankings` → **70** |
| temporadas com campeão | `"CompetitionSeason" WHERE championId IS NOT NULL` → 114/114 |

### B. Acervo — cobertura por mídia (o que cresce toda noite)
| métrica | fonte |
|---|---|
| logo / estádio / cores / editorial / uniforme / hino / flâmula | `clubs` com o campo não nulo → **592 · 1.119 · 73 · 1.125 · 2.311 · 14 · 7** |
| fila pendente por chave do cursor | `clubs WHERE mediaEnrichment IS NULL OR NOT (mediaEnrichment ? 'chave')` → `logo` **9.571** · `editorial` **10.288** · `kits` **0** |
| carimbos por chave | `clubs WHERE mediaEnrichment ? 'chave'` → `stadium`/`colors` **2.290** |
| jogadores com foto / país / posição / clube | `players` → **864 · 98.498 · 87.433 · 95** |
| clubes sem coordenada | `latitude IS NULL` → **5.527** |
| imagens quebradas | auditoria contra a API do Commons (script `audit-imagens`) → **1 arquivo em 1.382** |

### C. Integridade (o guarda-chuva do acervo)
| métrica | fonte |
|---|---|
| partidas / rankings / temporadas (âncora) | contagens acima — qualquer salto inesperado é incidente |
| clubes sem QID | **145** (excluídos das filas por desenho) |
| posses e propostas | `"ClubOwnership"` **0** · `"ClubDescriptionProposal"` **0** |
| duplicidade de QID | 0 (garantido por `qid @unique`) |

### D. Produto / operação
| métrica | fonte |
|---|---|
| usuários (ativos, com aniversário, presenteados) | `users` → **75 · 0 · 0** |
| assinaturas por plano | `subscriptions` → **75 total, 0 pagas** |
| jobs agendados e a próxima execução | BullMQ `getJobSchedulers()` (6 em `data-refresh` + 1 em `media-enrich` + ranking + aniversário) |
| fila por estado | BullMQ `getJobCounts()` (waiting/active/completed/failed/delayed) |
| mídia bloqueada em job `stalled` | `getFailed()` — houve 5 históricos de `enrich-all-media` (job longo estourando o lock) |
| latência da API (p50/p95/p99) e error rate | `/(/metrics)` Prometheus + medição externa (p95 349ms · zero 5xx) |
| cache hit rate | Redis (`hits`/`misses` — último: 1.383.464 / 648.094) |
| cron por dia (executou mesmo?) | `mediaEnrichment->'<chave>'->>'at'` agrupado por hora UTC — foi assim que provei que os 6 crons rodam |

## 3. Desenho proposto

### 3.1 API — `GET /api/v1/admin/metrics`
- **Guard:** `authenticate` + permissão de admin (reusa `rbac.service.ts`; **não** criar
  verificação nova).
- **Resposta** (um payload, tudo de uma vez — a página faz 1 requisição):
  `{ acervo: {...}, cobertura: {...}, filas: {...}, jobs: [...], produto: {...}, integridade: {...}, geradoEm }`.
- **Cache curto** (60s) — são contagens em tabelas grandes; a página não precisa de tempo real.
- Cada número vem com `fonte`/`consulta` no payload? Não: fica no código. Mas **cada bloco
  traz seu `at`** para o painel poder mostrar "medido às HH:MM".

### 3.2 Web — `/dashboard/admin`
- Página server-side que chama o endpoint **com os cookies do usuário** (o guard é do
  servidor; nada de checar papel no cliente).
- Sem permissão → a página mostra "sem acesso" (não 404, para não confundir quem deveria ter).
- Blocos: **Acervo · Cobertura por mídia · Fila e cursos · Jobs (com a próxima execução) ·
  Produto · Integridade**, cada número com o `at` da medição.
- i18n pt/en/es (o painel do usuário já é traduzido; o admin também deve ser).

### 3.3 Consertar os links mortos
`/dashboard/observability` e `/dashboard/moderation` **aparecem no menu e não existem**.
Ou viram páginas (observabilidade = métricas de infra; moderação = propostas/posses
pendentes, que hoje são 0), ou saem do menu. **Não deixar link morto na Beta.**

## 4. Ordem sugerida de implementação

1. **Endpoint de métricas + página** (o núcleo do pedido) — 1 PR.
2. **Moderação** (fila de propostas/posses pendentes, reusando `listPendingForReview`) — depende
   dos critérios de editor (doc `EDITORES-DE-CLUBES-CRITERIOS.md`).
3. **Ações de usuário** (suspender/reativar/papéis já existem na API — falta a UI).
4. **Observabilidade** (link para o `/metrics` Prometheus + latência) — o mais simples.

## 5. Decisões que são do Operador

1. **Quem é admin**: hoje o papel existe no RBAC; falta **conceder** o papel ao seu usuário
   (via `POST /admin/users/:id/roles` ou seed). Sem isso a área abre vazia para você.
2. **Admin único ou com moderadores** (papel `MODERATOR` parcial)?
3. **O que NÃO deve aparecer** no painel (ex.: valores de receita por usuário).
4. **Janela de retenção** das métricas de série temporal (o catálogo acima é tudo
   *instantâneo*; histórico exigiria snapshot — decidir se vale).
