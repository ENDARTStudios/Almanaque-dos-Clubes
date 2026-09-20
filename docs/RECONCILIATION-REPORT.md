# RECONCILIATION-REPORT.md — Reconciliação do PLANO_MESTRE (T381)

> Auditoria do `PLANO_MESTRE.md` contra as tarefas T3xx executadas e o estado
> real do repositório. Fase F14-reconciliacao-plano, 2026-08-27.

## 1. Metodologia

Cada item do plano foi cruzado com: (a) tarefas T3xx executadas (com commits),
(b) arquivos reais no repositório, (c) comandos de verificação quando
executáveis localmente. Marcação: `[x]` somente com evidência real; `[~]` com
gap documentado; `[ ]` sem evidência/não iniciado.

## 2. Estado real (números)

| Marcação | Contagem |
|---|---|
| `[x]` | 111 |
| `[~]` | 7 |
| `[ ]` | 6 |

> **Correção de premissa:** o handoff citava "~80 itens `[ ]`". O arquivo real
> tem **6 `[ ]`** e **7 `[~]`**. O débito de governança é bem menor do que o
> alegado — o plano já estava majoritariamente fechado (T001/T002/T003).

## 3. Mapeamento T3xx → Fase (principais)

| T3xx | Fase/Item | Efeito no plano |
|---|---|---|
| T341/T342 | Fase 3 (auth), Fase 6.2 | mailer transacional + verificação de email + reset via mailer |
| T344/T345/T377 | Fase 2/3 (sessions) | RLS de `sessions` desenhada e validada em teste (aditivo) |
| T347/T348/T349 | Fase 4 (domain) | reconciliação docs + quarentena de `uml.ts`/`rbac-matrix.ts` |
| T350/T351/T366/T368 | Fase 9.4 | Root Directory Vercel + deploy web destravado |
| T359 | Fase 2 (billing) | coluna `trial_used_at` + migration |
| T370/T371 | Fase 2/3 (sessions) | `rls-context.ts` + adoção `withRlsContext` |
| T373/T374/T375/T378 | Fase 9.1 | CI: fix Redis + oracle + gitleaks + dependency-audit |
| T376/T380 | Fase 9.4 | merges via exceção governada; produção verde |
| T379 | Fase 9.9 | `MANUAL_DO_OPERADOR.md` reescrito |

## 4. Itens `[ ]` (6) — status

| Item | Status real |
|---|---|
| 2.7 Tabelas de governança (`data_sources`, `entity_revisions`) | ❌ não existem no schema; "rankings auditáveis" depende de ETL futuro |
| 2.10 Criptografia a nível de coluna | ❌ não implementada (condicional a Vault/Infisical) |
| 7.9 Vault/Infisical (CONDICIONAL) | ❌ não implementado |
| 7.10 DNSSEC + CAA + HSTS preload (CONDICIONAL, domínio) | ❌ pendente de domínio próprio |
| 9.3 Deploy blue-green/rolling (zero downtime) | ❌ pendente (deploys atuais são recriação simples) |
| 9.4 Plataforma de deploy (decidir) | ✅ **DECIDIDA** — Railway (API) + Vercel (web), em produção → propor `[x]` |

## 5. Itens `[~]` (7) — status

| Item | Estado real |
|---|---|
| Fase 2 (resumo 13/15) | 2.7/2.10 seguem pendentes |
| 3.9 Testes de integração | escritos; rodam em CI quando o Actions voltar (Caminho A) |
| Fase 7 (resumo) | 7.9/7.10 condicionais |
| Fase 9 (resumo) | 9.4 decidida; 9.3 pendente |
| 8.3 E2E (Playwright) | 5/5 passando (T003); execução manual |
| 8.8 Regressão de segurança | CI configurado; expandir cenários |
| 8.9 Testes pipeline IA | pendente (Ollama/pgvector operacional) |

## 6. Gaps consolidados (candidatas, NÃO executadas)

1. **2.7** — criar `data_sources`/`entity_revisions` se o Operador quiser
   "rankings auditáveis" completos.
2. **2.10/7.9** — adotar Vault/Infisical para criptografia de coluna.
3. **7.10** — DNSSEC/CAA/HSTS preload após domínio próprio.
4. **9.3** — deploy blue-green/rolling.
5. **8.8/8.9** — expandir regressão de segurança + pipeline IA.
6. **Caminho A** — restaurar GitHub Actions (billing) para reativar o CI como
   gate real; **revogar o token antigo** (pendência do Operador).
7. **FORCE RLS em produção** — gateado por `D-2026-08-24-rls-enforcement-exige-app-user`
   (conexão `app_user` + staging verde + decisão do Operador).

## 7. Conclusão

O projeto está **funcionalmente completo** para os marcos Beta/Open Beta: todas
as Fases obrigatórias (0–9) estão `[x]` ou `[~]` com gaps pequenos e
documentados. As pendências restantes são: 2 itens de dados/segurança
condicionais (2.7/2.10), 2 condicionais de hardening (7.9/7.10), 1 de deploy
avançado (9.3), e a reativação do CI (account-level) — todas decisões do
Operador, não trabalho de implementação.

---

## 8. Snapshot T436 — WS-L 1ª camada (2026-09-15)

Atualização do snapshot M1 após o fechamento do T436 (cookie banner +
consentimento + páginas legais), referente a
`D-2026-09-15-t436-fechamento`.

### Critérios técnicos do M1 — 6/6 atendidos

| Critério | Status |
|---|---|
| Seed ≥ 1.000 clubes | ✅ 3.857 em produção (T429) |
| Mapa-múndi read-only | ✅ |
| Perfis clube/jogador | ✅ |
| Busca global | ✅ |
| Hero dinâmico (1.3) | ✅ (T435) |
| Cookie banner + consentimento publicado | ✅ estrutura completa (T436) — ver pendência de ativação abaixo |

### Pendência única (externa, decisão do Operador)

A ativação em produção segue gateada por
`D-2026-09-14-ws-l-gated-by-operator`: as feature flags
`LEGAL_PAGES_ENABLED`/`COOKIE_BANNER_ENABLED` (default OFF, comportamento
default verificado em build de produção — páginas legais 404 e sem banner) só
são ligadas em produção **após o merge**, via runbook do Operador
(`vercel env add ... production true` + redeploy + smoke). O escopo **preview**
já recebeu as flags (envs de preview) para aceitação; produção está intocada.

**Consequência:** M1 permanece formalmente NÃO declarado até o smoke da
ativação chegar verde. Nenhum trabalho de implementação pendente para o
critério de cookie banner/páginas legais.

### Evidências (docs/evidence/t436/)

- `banner-home.png` / `banner-search.png` — banner com 3 botões de mesmo
  destaque (same-visual-weight também assegurado por teste E2E de computed
  styles).
- `banner-preferences.png` — centro de preferências granular (sem checkbox de
  categoria necessária).
- `page-privacidade.png` / `page-termos.png` / `page-cookies.png` /
  `page-seguranca.png` — páginas legais com dados reais (fornecedores,
  inventário de cookies, referência a /planos, medidas de segurança) em pt-br
  (en-us/es-es via seletor de idioma).
- `consent-loader-tests.txt` — 4/4 testes unitários do script loader
  (analytics/marketing bloqueados sem consentimento; necessários sempre).
- `flags-off-default.txt` — comportamento default em build de produção.
- Testes: integração API 8/8 (`POST/GET /consent`, CSRF, IP como hash);
  E2E 11/11 (banner → gerenciar → salvar → prova; persistência; páginas 200).

---

## 9. Snapshot T438 — M2 iniciado: Rankings 0-100 em cron (2026-09-15)

Pipeline de Rankings 0-100 ATIVO (`D-2026-09-15-t438-rankings-cron`, PR #107):
cron BullMQ diário 03:00 UTC no processo da API (`RANKING_CRON_AUTO=1`,
deploy `8058f8f4`), job idempotente com guarda anti-ranking-vazio, filtro por
gênero (bug latente do T425 corrigido), CLI compilada em dist, métricas
`rankings_last_run_*` em /metrics, endpoints públicos com paginação cursor e
página /rankings real com filtros (E2E 3/3 em produção).

Honesto: matches=0 e wonEdges=0 em produção — o cron roda, registra
"ranking vazio — não publicado" e só publicará quando houver clubes
ranqueáveis (ETL de partidas/títulos, janela M4). Rankings exibidos hoje
vêm do seed manual (2 rankings, 20 entradas).

---

## 10. Snapshot T439 — M2 2/4: Favoritos em tempo real (2026-09-15)

Favoritos ativos (`D-2026-09-15-t439-favorites`, PRs #109–#113): model com
soft-delete + índice parcial único; RLS owner-only FORCE com matriz cross-user
verde no CI (como `app_user`); API idempotente com rate-limit por usuário;
`/ws` corrigido (ticket curto single-use substitui userId anônimo por query;
CSP `connect-src` agora permite `wss://`); frontend com `FavoriteButton`
(otimista, `aria-pressed`) e painel `/favoritos` com badge de ranking e
indicador "Ao vivo" — E2E cross-user verde em produção.

Gaps de produção corrigidos no mesmo ciclo: `GET /auth/me` inexistente
(ProtectedRoute quebrado para qualquer página protegida), GRANT `app_user`
da tabela nova (regra grants), CSP `wss://`.

M2: rankings ✅ (T438) · favoritos ✅ (T439) · comparadores ⏳ (T440) ·
carrossel ⏳ (T441). T437 (rotação `app_user`) em paralelo.

---

## 11. Snapshot T440 — M2 3/4: Comparadores (2026-09-16)

Comparadores ativos (`D-2026-09-16-t440-comparators`, PRs #115+#116):
`/compare/clubs` e `/compare/players` com validação Zod, cache Redis 5min e
métricas auditáveis (títulos por hierarquia via KnowledgeGraph, histórico de
rankings, fundação, estádio representativo); frontend `/compare` com
autocompletes, tabela com líder por métrica, gráficos recharts acessíveis,
deep-link com SEO dinâmico; E2E 4/4 contra produção (seleção por autocomplete,
deep-link, mobile, teclado).

Honesto: títulos em produção = 0 (WON edges vazios) e métricas de
partidas/gols `null` com reason — preenchidos automaticamente quando o ETL M4
chegar. M2: rankings ✅ · favoritos ✅ · comparadores ✅ · carrossel ⏳ (T441).

---

## 12. Snapshot T441 — M2 COMPLETO 4/4 (2026-09-16)

Carrossel de campeões ativo (`D-2026-09-16-t441-champions-carousel`, PR #118):
`GET /champions` por hierarquia (KnowledgeGraph WON, ano mais recente, cache
1h, honestidade 1.3) + carrossel scroll-snap CSS puro na home com teclado,
dots e aria-live. Em produção o estado é honestamente vazio (wonEdges=0) e
os cards aparecem automaticamente quando o ETL M4 popular títulos.

**M2 — Beta Fechada (engajar): COMPLETO (4/4)**
- T438 rankings 0-100 em cron ✅
- T439 favoritos em tempo real ✅
- T440 comparadores ✅
- T441 carrossel de campeões ✅

Fila pós-M2: M3 (gateway — Operador) · T437 (rotação app_user) · WS-S/WS-O.

---

## 13. Snapshot T442 — WS-S: RLS em users (2026-09-16)

`users` sob ENABLE+FORCE RLS (`D-2026-09-16-t442-rls-users`, PR #120):
owner select/update, INSERT com id gerado no servidor + WITH CHECK, sem
DELETE (soft-disable), SERVICE pleno, função SECURITY DEFINER para os
lookups pre-auth por email. Matriz cross-user verde no CI (como app_user);
aplicado em produção com smoke verde (register/login/me/health). O gap de
segurança mais alto do premortem está fechado.

Fila: T437 (rotação app_user) · T443 (WS-O) · M3 (gateway — Operador).

---

## 14. Snapshot T437 — Credencial app_user rotacionada (2026-09-16)

Rotação com papel duplo (`D-2026-09-16-t437-rotacao-app-user`): v2 criada com
grants idênticos (script parametrizado via sed remoto + GRANT EXECUTE),
`DATABASE_URL_APP` trocada com redeploy, smoke completo verde (health/
register/login/me/favoritos 200), corte do papel velho (zero conexões em
pg_stat_activity, REASSIGN/DROP/RENAME) e segundo redeploy com smoke final.
Encerra o incidente de credenciais ecoadas (postgres em 09-15, app_user agora).
Registro honesto: mismatch de senha entre chamadas derrubou a API por ~8min
(fail-fast do entrypoint funcionou); correção via ALTER ROLE no container do
Postgres + variável + redeploy.

Fila: T443 (WS-O: backup diário 30d + alertas + uptime) · M3 (gateway —
Operador) · T444 (checkout provider-agnostic).

---

## 15. Snapshot T443 — WS-O: confiabilidade de produção (2026-09-16)

- **Deploy seguro**: healthcheck gate no `railway.json` (tráfego só troca após
  /health passar) + `docs/DEPLOY-ROLLBACK.md`. Teste de fogo: replay do modo
  de falha do T437 → deployment novo FAILED isolado, produção 200 em toda a
  janela (evidência: docs/evidence/t443/fire-test.md). Gap 9.3 (deploy sem
  fallback) deixa de ser teórico.
- **Backup diário automatizado**: `backup.yml` (04:00 UTC, artifact privado
  30d) via `POST /admin/backup` (x-backup-secret) — JSON auditável sem
  passwordHash/sessions. Backup real: 200, 3.2MB, artifact expira 2026-10-17.
- **RESTORE DRILL executado**: pg_dump in-container → restore_drill → counts
  idênticos (clubs 3857 · players 2396 · users 39 · rankings 2) → DRILL-OK.
- **Alertas**: `alerts.yml` 5min — health (uptime externo), 5xx e auth
  failures (deltas com cache), rankings-stale (warn se gauge zerado pós-
  redeploy). Canal: e-mail de falha do GitHub Actions.
- **FASE 0**: re-rotação do `app_user` sob a regra no-echo (ALTER in-container
  via stdin, sem eco; redeploy SUCCESS + health 200).

Fila: T444 (checkout provider-agnostic) · M3 (gateway — Operador) ·
WS-L 2ª camada (processo titular/DMCA) · M5 (Loki/Grafana, Vault).

---

## 16. Snapshot T446 — WS-O: backup remoto R2 + restore drill (2026-09-17)

Backup remoto ATIVO e RESTAURÁVEL (`D-2026-09-17-t446-backup-silencioso`,
PRs #128+#129+#130+#131+#132+#133+#134): pg_dump format custom → R2 via
spawnSync/env (credencial nunca em argv); auto-validação (clubs=0 aborta);
HEAD pós-upload; postgresql-client-18 via PGDG repo no Dockerfile; drill
in-container com counts idênticos. O incidente do backup vazio (tsvector
P2010 engolido por catch silencioso) provou que o drill é o único controle
que pega backup mentiroso — drill semanal automatizado (workflow).
Fila: T445 (WS-L 2ª camada) · M3 gateway (Operador) · T447 (Stripe test-mode).

---

## 17. Snapshot T445 — WS-L 2ª camada: direitos do titular + copyright claims (2026-09-18)

`D-2026-09-18-t445-direitos-titular` (PR #137, CI verde, F1–F5):
- **API**: `POST/GET /privacy-requests` (token de acompanhamento p/ não-usuários,
  SLA imediato/15d ANPD, deferredUntil art. 18 §3, cadeia ESTRITA auditada,
  decisão motivada obrigatória) + `POST /copyright-claims` (honeypot +
  rate-limit 5/h) + admin `users:manage` com transições. Fulfillment de
  eliminação: anonimização + revogação de sessões; workflow e financeiro
  preservados — soft-delete SEMPRE (sem rota DELETE).
- **UI**: `/direitos-titular` + `/direitos-autorais` (gate LEGAL_PAGES_ENABLED),
  rodapé com 2 links, políticas v1.1 com links cruzados e histórico de
  versões, i18n pt/en/es (Dictionary type prova paridade).
- **Testes**: 12 de integração reais no CI (postgres) + E2E manual em preview
  (protocolo → status → atendimento; honeypot descarta com 0 registros;
  409 em atalho; transições auditadas).
- **Regras novas**: `D-2026-09-18-testes-sem-skip-silencioso` (R1:
  TEST_REQUIRE_DB=true no CI — guard dbOk lança em vez de pular; 8 arquivos)
  e `D-2026-09-18-fixtures-escopados` (R2: temporada 2038 isolada + cleanup
  scoped — flake rankings-read×ranking-algorithm eliminado).
- **Achados de infra**: provisionamento fresh via `migrate deploy` é
  impossível (3 migrations de julho criam as mesmas tabelas) — workaround de
  baseline+mark-applied usado no preview; candidato a squash/DR no M3.
  Dockerfile normaliza CRLF do entrypoint (checkouts Windows quebravam shebang).

Fila: T447 merge (#138, 6 fixes do T444 + e2e aprovado) · Operador:
STRIPE_PRICE_* prod = price_live (hoje prod_ → 500) + FASE 5 keys live +
compra/estorno real · políticas v1.2 (Stripe no compartilhamento) · M3.

---

## 18. Snapshot T452/T453 — logout efetivo + histórico de cobranças (2026-09-20)

Uso real (primeiro cliente pagante) endureceu a borda final: (1) **logout** — forense
provou revogação server-side e limpeza de cookies corretas desde sempre; o sintoma
era o **indicador de sessão inexistente no client** (navbar "Entrar" hardcoded) →
T450/#145 (AuthProvider fonte única + menu do usuário). (2) **histórico +
transparência** → T453: painel lista billings owner-scoped (valor/moeda, status,
externalId) + bloco permanente de condições de reembolso (CDC art. 49, prazo do
adquirente, canal) em pt/en/es. (3) **estorno fail-loud** → T451/#146: refund real
antes de REFUNDED local (incidente do "Feito." mentiroso resolvido na raiz;
`D-2026-09-20-refund-fail-loud`). Anti-duplicidade verificada: exatamente 1 refund
live (re_3UHZeZ…, succeeded, R$9,90). Pendência de provider: e-mail transacional
(Operador escolhe SMTP/Resend; protocolo na tela cumpre Termos 3.5 até lá).
Fila: re-teste do loop CDC no painel com o código final (Operador) · **M3** · M4.
