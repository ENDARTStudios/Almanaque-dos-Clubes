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
| -------- | -------- |
| `[x]`    | 111      |
| `[~]`    | 7        |
| `[ ]`    | 6        |

> **Correção de premissa:** o handoff citava "~80 itens `[ ]`". O arquivo real
> tem **6 `[ ]`** e **7 `[~]`**. O débito de governança é bem menor do que o
> alegado — o plano já estava majoritariamente fechado (T001/T002/T003).

## 3. Mapeamento T3xx → Fase (principais)

| T3xx                | Fase/Item               | Efeito no plano                                               |
| ------------------- | ----------------------- | ------------------------------------------------------------- |
| T341/T342           | Fase 3 (auth), Fase 6.2 | mailer transacional + verificação de email + reset via mailer |
| T344/T345/T377      | Fase 2/3 (sessions)     | RLS de `sessions` desenhada e validada em teste (aditivo)     |
| T347/T348/T349      | Fase 4 (domain)         | reconciliação docs + quarentena de `uml.ts`/`rbac-matrix.ts`  |
| T350/T351/T366/T368 | Fase 9.4                | Root Directory Vercel + deploy web destravado                 |
| T359                | Fase 2 (billing)        | coluna `trial_used_at` + migration                            |
| T370/T371           | Fase 2/3 (sessions)     | `rls-context.ts` + adoção `withRlsContext`                    |
| T373/T374/T375/T378 | Fase 9.1                | CI: fix Redis + oracle + gitleaks + dependency-audit          |
| T376/T380           | Fase 9.4                | merges via exceção governada; produção verde                  |
| T379                | Fase 9.9                | `MANUAL_DO_OPERADOR.md` reescrito                             |

## 4. Itens `[ ]` (6) — status

| Item                                                           | Status real                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2.7 Tabelas de governança (`data_sources`, `entity_revisions`) | ❌ não existem no schema; "rankings auditáveis" depende de ETL futuro      |
| 2.10 Criptografia a nível de coluna                            | ❌ não implementada (condicional a Vault/Infisical)                        |
| 7.9 Vault/Infisical (CONDICIONAL)                              | ❌ não implementado                                                        |
| 7.10 DNSSEC + CAA + HSTS preload (CONDICIONAL, domínio)        | ❌ pendente de domínio próprio                                             |
| 9.3 Deploy blue-green/rolling (zero downtime)                  | ❌ pendente (deploys atuais são recriação simples)                         |
| 9.4 Plataforma de deploy (decidir)                             | ✅ **DECIDIDA** — Railway (API) + Vercel (web), em produção → propor `[x]` |

## 5. Itens `[~]` (7) — status

| Item                       | Estado real                                               |
| -------------------------- | --------------------------------------------------------- |
| Fase 2 (resumo 13/15)      | 2.7/2.10 seguem pendentes                                 |
| 3.9 Testes de integração   | escritos; rodam em CI quando o Actions voltar (Caminho A) |
| Fase 7 (resumo)            | 7.9/7.10 condicionais                                     |
| Fase 9 (resumo)            | 9.4 decidida; 9.3 pendente                                |
| 8.3 E2E (Playwright)       | 5/5 passando (T003); execução manual                      |
| 8.8 Regressão de segurança | CI configurado; expandir cenários                         |
| 8.9 Testes pipeline IA     | pendente (Ollama/pgvector operacional)                    |

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

| Critério                                | Status                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| Seed ≥ 1.000 clubes                     | ✅ 3.857 em produção (T429)                                     |
| Mapa-múndi read-only                    | ✅                                                              |
| Perfis clube/jogador                    | ✅                                                              |
| Busca global                            | ✅                                                              |
| Hero dinâmico (1.3)                     | ✅ (T435)                                                       |
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

---

## 19. Snapshot T457 — cadeia de sessão sempre assenta (2026-09-20)

`D-2026-09-20-sessao-sempre-assenta` (PR #151): P0 de navegabilidade — 3 navegadores
travados em "Verificando sessão…" por 429 do rate-limit global (IP compartilhado) +
semântica do T455 que mantinha loading em não-401. Hotfix: qualquer HTTP assenta
(401/403/429/5xx → anon navegável) + teto de 8s (AbortController). Postmortem da
saga: uma causa, cinco sintomas (T455 pill, área indisponível, não-desloga, login
sem renderizar, inavegável). Pendências: bucket próprio p/ auth endpoints
(Operador/config) · e-mail transacional (provider).

---

## 21. 🎉 M3 — Open Beta (monetizar) — DECLARADO (2026-09-21)

Stripe LIVE + checkout + webhook HMAC idempotente + assinatura funcional +
CDC art. 49 (estorno real com fail-loud) + compliance completo (T445 +
políticas v1.2) + smoke live verde. Compra real Pro R$4,90 + estorno pelo
painel com protocolo re_3UHwb… Saga de sessão fechada (oito PRs, uma causa
por camada — postmortem no PLANO_MESTRE). PRs #127–#155. Fila: M4 (conteúdo
WS-D) · pendências: SMTP, currentPeriodEnd anual, audit-events, bucket
próprio p/ auth rate-limit.

---

## 22. Snapshot T448 — WS-D: arestas WON no Knowledge Graph (2026-09-22)

**Escopo executado (dispatch refinado pós-FASE 0):** conector de conquistas estendendo o padrão
Wikidata do acervo (SPARQL + retry/backoff + dedup + proveniência + Zod), idempotência por
`(competitionId, seasonYear, clubId, WON)`, validação de dado por contagem POR HIERARQUIA +
spot-check independente + gap declarado, efeito de produto (carrossel/galeria/comparador) e
reconciliação no mesmo PR.

### Critérios de aceite — evidência por linha

| Critério                                  | Evidência                                                                                                                                           | Veredito      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Arestas WON com proveniência 100%         | 235/235 com `metadata.{dataSource='wikidata', sourceUrl=URL da EDIÇÃO, license='CC0', importedAt}` (integração confere campo a campo)               | ✅            |
| Contagem POR HIERARQUIA antes/depois      | antes `0×5`; depois `235` = continental 40 + nacional 195 (tabelas no output do script)                                                             | ✅            |
| Spot-check 20 com veredito por linha      | re-busca da EDIÇÃO via `Special:EntityData` (não confia no pipeline): P1346=vencedor ∧ P3450=mãe ∧ ano ∈ P585/P580/P582 → **20/20 OK**              | ✅            |
| Re-run idempotente                        | 2ª rodada completa: `0 criar · 235 skip · 0 atualizar`; `count(*)` estável                                                                          | ✅            |
| Gap medido e reportado (não limado)       | 277 gaps: mundial 17 · continental 18 · nacional 242; top mães ausentes listadas com QID (FA Cup, Ligue 1, Coppa Italia, FIFA Club World Cup…)      | ✅            |
| Carrossel com campeão real + link + fonte | `/champions` ao vivo: PSG (UEFA Champions League, fonte `Q124024430`) · Arsenal (Premier League, fonte `Q132674557`); fonte = link Wikidata no card | ✅            |
| CI verde real (R1) + tsc/lint/prettier 0  | tsc api/web 0 erros; eslint 0 erros nos arquivos do PR; CI roda no PR                                                                               | ✅ (CI no PR) |
| Estado Final corrigido (duas camadas)     | PLANO_MESTRE: identidade=ALTA (T429) · conquistas=PARCIAL com gap declarado; "dados 1%" aposentado                                                  | ✅            |
| R2 — sem corrida/estado compartilhado     | fixture com ano 1901 (não desbancra T441); contagens escopadas ao fixture; leitura congelada testada com prisma mockado                             | ✅            |

### Onde o dado foi buscado e onde vive

- **Fonte:** Wikidata SPARQL (CC0), janelas de 5 anos (1870→ano corrente), User-Agent identificado,
  retry/backoff via `http-resilience`. Query validada ao vivo (forma union-first + filtro nativo de
  dateTime; label service em query separada — 504/431 medidos e contornados, chunk 200).
- **Prova executada no corpus-piloto LOCAL (declarado):** 12 competição-mães mais frequentes dos
  candidatos reais 2005–2026 + 101 clubes vencedores, no Postgres docker da máquina
  (`almanaque-postgis-test`). Motivo honesto: esta máquina NÃO alcança o Postgres de produção
  (`postgres.railway.internal`, sem Railway CLI) e o dump do repo é só estrutura
  (`prisma/baseline/prod-structure-*.sql`). Gap/counts são funções do corpus em que o script roda.
- **Bug encontrado e corrigido durante a validação:** UNION sobre P585/P580/P582 fazia temporada
  cross-year (ex. 2. Bundesliga 2022-23) virar DOIS títulos → colapso `uma edição = um ano`
  (ano inicial) — 424→235 no piloto; testes unit + integração cobrem.

### 📋 RUNBOOK DO OPERADOR — rodada de produção (T448, ~20-40 min)

```bash
# No Railway (ambiente da API de produção), uma única vez:
pnpm --filter @almanaque/api exec tsx scripts/ingest-won-edges-wikidata.ts --apply
# Dry-run antes (não grava, mostra plano + gap):
pnpm --filter @almanaque/api exec tsx scripts/ingest-won-edges-wikidata.ts
# Opcionais: --min-year=1870 --max-year=<ano atual> --spot-check=20

# Reversão (dados importados são aditivos e reversíveis por proveniência):
# DELETE FROM knowledge_graph WHERE relation='WON' AND metadata->>'dataSource'='wikidata';

# Pós-rodada: cache de campeões (chave champions:*) expira em 1h sozinho,
# ou reinicie a API para invalidar. O carrossel e a galeria acordam sozinhos.
```

Espera-se em produção: órbita de ~15-25k candidatos (universo completo do futebol em Wikidata),
criação limitada pelos 1.263 mothers + 3.857 clubes do acervo, gap material para o T448b.
Job recorrente: `POST /admin/etl/ingest/wikidata-titles` (admin) ou cron no T451.

Regras permanentes: + **R3-t448-dispatch-ancora-em-query** (dispatch ancora em query, não em documento).

### GATE 1 — Rodada de PRODUÇÃO executada (2026-09-21, mesma sessão do #159)

**Passo 0 (R3):** o #159 estava OPEN e o container de produção rodava `f9fcabb` (#158) — o script não
existia no servidor. Resolvido na ordem: merge #159 → o auto-deploy Railway EXISTE (dispara no merge) mas
falhou 2× por dois defeitos reais que o CI não pega (na Actions o repo inteiro é checkoutado; o build
Docker não): (1) builder sem `apps/api/scripts` → TS2307 no import de `src`→`scripts` (#160); (2) com
`scripts/` no grafo do tsc o rootDir inferido migra e o output vira `dist/src/server.js` → boot sem
módulo → healthcheck falha (#161 — helper movido para `src/lib/` com shim em `scripts/lib/`). Terceira
camada: a imagem não tem `apps/api/src`, então o script migrou para `src/scripts/` (padrão T430) e roda
compilado com `node` puro (#162). Deploy final verificado por fingerprint: `RAILWAY_GIT_COMMIT_SHA =
7fda267` + rota nova `GET /clubs/:id/titles` respondendo com o handler do T448.

**Números reais de produção (acervo 3.857 clubes · 1.263 competições):**

| Métrica                                                           | Valor                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fetch (janela 1870–2026, 32 janelas)                              | 17.470 linhas · **13.436 candidatos únicos** · 217s                                                                                                                                                                        |
| Arestas WON criadas                                               | **2.809** (nacional 2.808 · continental 1) — ANTES 0                                                                                                                                                                       |
| Gap de mãe ausente (input T448b)                                  | **2.832** (mundial 16 · continental 286 · nacional 2.530)                                                                                                                                                                  |
| Órfãos (vencedor fora do acervo — seleções/clubes não importados) | 7.795                                                                                                                                                                                                                      |
| Re-run idempotente (janela 2005–2026)                             | `1.087 skip · 17 criar · 2 atualizar` — grafo vivo do Wikidata (claims novas/editadas entre rodadas); **zero duplicação**: total evoluiu exatamente +17 (2.809→2.826), duplicados por (clube,competição,ano) = **0** no DB |
| Proveniência                                                      | **2.826/2.826 (100%)** com dataSource=wikidata + license=CC0 + sourceUrl da EDIÇÃO                                                                                                                                         |
| Spot-check independente                                           | **20/20 OK** (re-busca da EDIção: P1346 vencedor + P3450 mãe + ano)                                                                                                                                                        |
| Carrossel vivo                                                    | `/champions` respondendo campeões reais com fonte Wikidata por card                                                                                                                                                        |

**Top mães ausentes (T448b):** Q15804 (124) · Scottish Cup (102) · **Campeonato Carioca (85)** ·
Coppa Italia (73) · Norwegian Cup (69) · Scottish League Cup (69) · FA Cup (66) · Copa del Rey (65) ·
DFB-Pokal (60) · UEFA Champions League (54) · **Copa Libertadores (51)** — copas nacionais/continentais
e estaduais são o grosso do gap (o corpus tem 893 LEAGUE e quase nenhuma COPA).

**Achado de produto (para o Thinker):** com 2.825 arestas "nacionais" de ligas do mundo inteiro, o
desempate do campeão vigente por ano-mais-recente empata com frequência (vários 2025) e a ordem de
iteração decide — produziu Elitettan (2ª divisão sueca feminina) como campeã nacional no ar. É
determinístico e auditável, mas a QUALIDADE da escolha pede tie-break de produto (ex.: peso da liga /
competições principais) — candidato a refinamento no T448b/T465.

**Comando de produção (uma linha, Console Railway do serviço `Almanaque-dos-Clubes`):**

```
cd /app/apps/api && node dist/scripts/ingest-won-edges-wikidata.js --apply --spot-check=20
```

### GATE 2 — T448c (tie-break) + T448b-1 (copas) em produção (2026-09-21, PRs #164/#165)

**T448c — tie-break determinístico do carrossel.** Defeito de apresentação: com 2.825 arestas
"nacionais", o desempate ano-mais-recente empataba (vários 2025) e a ordem do `findMany` decidia —
Elitettan (2ª divisão sueca feminina) exposta como campeã nacional. Critério escolhido após
REPROVAR os proxies sugeridos contra o dado real: "mais edições" elegeria Campeonato Paulista
(estadual congelado como nacional, arquivo parado em 2020) e "mais campeões distintos" elegeria
Serie B (paridade de divisão de acesso). Adotado: **vigência → edições → campeões distintos →
nome asc → id asc** (comparador total; seleção nunca lê gênero; unit embaralha a entrada para
provar independência de ordem; resposta expõe `editions` para auditoria). Verificação viva:
fingerprint `c95e4d3` + invalidação de cache + nacional = **PSG | Ligue 1 | 2025 | 75 edições**,
estável entre chamadas. Unit 10/10.

**T448b-1 — mães-COPA semeadas + WON re-rodado.** Classe de copa validada AO VIVO (P31 das mães
reais do gap): Q8463186 national cup · Q1824674 league cup · Q34262807 super cup · Q34542757
international clubs cup · Q123856943 club world championship + fallback por rótulo (Coppa Italia e
Libertadores estão com classe genérica no Wikidata). 300 mães-copa semeadas
(`importedFrom='wikidata-cups'`, type='CUP'; 1.263 → 1.563 competições; spot-check 10/10).

| Métrica                                                  | Antes | Depois                                                                               |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| Arestas WON totais                                       | 2.826 | **5.157**                                                                            |
| Mundial                                                  | 0     | **16** (Real Madrid, FIFA Club World Cup na vitrine)                                 |
| Continental                                              | 1     | **268** (PSG, UEFA Champions League 2025 na vitrine)                                 |
| Nacional                                                 | 2.825 | 4.873                                                                                |
| Gap de mãe ausente                                       | 2.832 | **514** (mundial **0** · continental 20 · nacional 494 → T448b-2)                    |
| Zero duplicação (GROUP BY clube+competição+ano HAVING>1) | —     | **0**                                                                                |
| Proveniência (dataSource+CC0+sourceUrl da edição)        | —     | **5.157/5.157 (100%)**                                                               |
| Re-run idempotente (2005–2026)                           | —     | `2.051 skip · 13 criar (claims novas do grafo vivo) · 3 atualizar` — zero duplicação |
| Spot-check independente                                  | —     | 20/20 arestas + 10/10 mães-copa                                                      |

**Cache:** invalidação por padrão (`cache.invalidate('champions:*')`) falhou silenciosamente 2× —
`DEL` com chave exata resolveu; invalidação efetiva do carrossel pós-ingestão deve usar DEL por
chave exata ou aguardar TTL de 1h (correção estrutural candidata: logar falha de Redis em vez de
engolir — follow-up).

**Nuance de dado declarada:** o card nacional passou por Johan Cruijff Shield 2026 (edição
futurada com vencedor pré-atribuído no Wikidata) — consequência legítima do critério de vigência
sobre dado da fonte; documentado como refinamento (ex.: desconsiderar edições futuras) quando o
critério for revisado com T449.

### GATE 2 adendum — T448d: guarda de vigência + cache fail-loud (2026-09-21, #164-#167 na sequência)

**Correção de registro (R3 contra o próprio relato):** a query de produção de TODAS as arestas com
`year > current_year` retornou **0 linhas** — o "universo futuro" estava vazio; a aresta do Johan
Cruijff Shield tem `year=2026` (ano corrente; a edição de agosto/2026 já foi disputada). O card
nacional atual é dado real do ano corrente — não "campeão do futuro". A guarda implementada
(`selectRepresentatives` descarta `year > currentYear` UTC, calculado no momento) protege a CLASSE:
pré-atribuições de 2027+ deixam de virar "vigente" a partir de janeiro/2027.

**Cache fail-loud:** `cache.invalidate` agora retorna `CacheInvalidationResult {ok, keysDeleted,
error?}` e loga warn no próprio módulo (12 call sites ganham visibilidade sem churn). Anti-padrão
nomeado (3ª instância): catch silencioso em caminho de escrita/invalidação = logout-400 (#156) +
refund-skip (#146) + cache-stale (este). Testes com Redis mockado lançando em `keys` e `del` →
`ok:false` + warn chamado. Operação pós-ingestão: DEL com chave exata (`DEL champions:all`).

Evidência: unit 14/14 tie-break (incl. guarda com `currentYear` injetável — sem relógio no teste) +
4/4 cache fail-loud + 24/24 won-edges; query R3 de futuros = 0 linhas; live verify pós-deploy com
`generatedAt` fresco e DEL exato das chaves champions (men/women/all).

### GATE 2 adendum 2 — T448e: representante nacional = LEAGUE, não supercopa (2026-09-21, #164-#168 na sequência)

**FASE 0 (R3):** types em produção: LEAGUE 893 · CUP 301 · nulo 368; competições COM arestas WON:
LEAGUE 218 · CUP 183 · **nulo 18** — as 18 eram ligas reais (Allsvenskan 75 ed, Eliteserien 50,
Scottish Premiership, 2. Bundesliga, Elitettan, VFF CL…) → backfill idempotente
`type='LEAGUE'` executado ANTES da regra (0 nulas restantes com aresta; proveniência preservada).
Spot-check: Eredivisie=LEAGUE, Johan Cruijff Shield=CUP.

**Cards antes/depois (Holanda):** antes = AZ Alkmaar | Johan Cruijff Shield | 2026 (CUP);
depois (alvo) = campeão da Eredivisie (LEAGUE) — critério: **tipo (LEAGUE→CUP→NULL) → vigência →
edições → campeões → nome → id**. Nenhum país perde representante: hierarquia só com CUP segue
representada pela CUP.

**Regra de processo (3ª ocorrência):** commit nasce NA branch do PR; se caiu na main local,
`reset --hard origin/main` antes de tudo; stash alheio preserva-se. DECISOES
`D-2026-09-22-regra-processo-branch`.

### GATE 2 adendum 3 — T448f: type-first CONDICIONAL por grupo de flagship (2026-09-22, #169 na sequência)

O checkpoint FASE 3 do T448e expôs a interação nº 4: type-first GLOBAL derrubou a UCL (CUP, 2025,
54 ed) abaixo da VFF Champions League (LEAGUE, 2012, 1 ed — liga nacional de Vanuatu miscategorizada
como continental pelo keyword do nome, congelada na escrita). Arbitragem do Thinker: **type-first só
onde a liga é flagship**.

**Mapeamento REAL de `RANKING_HIERARCHIES` (lido do fonte, conjunto completo):**

| Hierarquia                    | Grupo                        | Comparador                                                             |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| nacional, estadual, municipal | GRUPO-LIGA (flagship = liga) | **tipo (LEAGUE>CUP>NULL) → vigência → edições → campeões → nome → id** |
| mundial, continental          | GRUPO-COPA (flagship = copa) | **vigência (guarda T448d) → edições → campeões → nome → id**           |

Fora do mapa (futuro do enum): default GRUPO-COPA, registrado (nunca em silêncio). Backfill de type
do T448e PRESERVADO; dado do VFF INTACTO (reclassificação = T448b-2/T449 com auditoria R3 do
universo miscategorizado por keyword).

**Live verify (fingerprint `d624e5f`, DEL exato, generatedAt fresco):**

- nacional = **PSG | Ligue 1 | 2025 | LEAGUE | 75 ed** (mantido do T448e)
- continental = **PSG | UEFA Champions League | 2025 | CUP | 54 ed** (RESTAURADO — não é VFF)
- mundial = **Real Madrid | FIFA Club World Cup | 2023 | CUP | 15 ed** (mantido)
- Nenhum país/hierarquia perdeu representante; `type` correto em cada card; gender-blind em ambos
  os grupos; unit de TRANSIÇÃO prova a partição por hierarquia (mesma entrada, regras diferentes).

**Dívida declarada:** supertaça-continentais com vigência mais recente que UCL/Libertadores venceriam
o card em GRUPO-COPA — não observado hoje; solução = campo tier/flagship no T449 (D-…-divida-tier-flagship).

### GATE 2 adendum 4 — T465: integridade de oferta (2026-09-22, na sequência de #170)

**FASE 0 (R3 — lido do FONTE, não de prints):** a oferta tinha TRÊS superfícies divergentes:
`plan-features.ts` (T444, **sem nenhum consumidor** — código morto), `/checkout` com listas
hardcoded que já tinham divergido (Pro sem "Suporte prioritário por e-mail"; Elite sem "Exportações
estendidas"), e `/planos` com texto soft que delega a tabela ao checkout. **Tabela-veredicto:**

| Recurso (fonte)                         | /planos                  | /checkout     | Estado real                                                                                | Veredicto                                                                                               |
| --------------------------------------- | ------------------------ | ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Busca avançada ilimitada (PRO)          | soft                     | hardcoded     | busca textual tsvector existe; "ilimitada" sem alcance (viola política do próprio /planos) | ENTREGA renomeada: "Busca textual avançada"                                                             |
| IA assistida com citações (PRO)         | soft condicional         | hardcoded     | 8.9 [ ] — não operacional                                                                  | **EM BREVE** ("(em breve)")                                                                             |
| Exportações CSV (PRO)                   | —                        | hardcoded     | GET /export?format=csv existe                                                              | ENTREGA                                                                                                 |
| Suporte prioritário por e-mail (PRO)    | —                        | hardcoded     | canal e-mail existe, sem SLA                                                               | ENTREGA renomeada: "Suporte por e-mail dedicado"                                                        |
| Tudo do Pro (ELITE)                     | —                        | hardcoded     | estrutural                                                                                 | ENTREGA                                                                                                 |
| API com limites estendidos (ELITE)      | —                        | hardcoded     | **nenhuma emissão de key no backend**                                                      | **EM BREVE** ("API de dados (em breve)")                                                                |
| Exportações estendidas (ELITE)          | —                        | hardcoded     | /export format=json existe                                                                 | ENTREGA precisa: "Exportações em CSV e JSON"                                                            |
| Suporte prioritário (ELITE)             | —                        | hardcoded     | idem PRO                                                                                   | coberto por "Tudo do Pro" (duplicata removida)                                                          |
| Knowledge Graph (ELITE)                 | não declarado            | não declarado | **5.157 arestas, vitrine corrigida, fonte por aresta**                                     | **ENTREGA — entra na ELITE** (promessa do Escopo 6.6 tornada verdade pelo T448; autorizada no despacho) |
| Rankings (recurso de plano)             | menção soft no marketing | não listado   | página existe; 2 rankings seed (CONMEBOL/CBF 2023); 0-100 por jogo aguarda T449            | N/A na oferta (não listado) — flag                                                                      |
| Escrita PRO (clubes/jogadores)          | não declarado            | não declarado | CRUD admin/RBAC                                                                            | N/A (não ofertado)                                                                                      |
| Home hero "com inteligência artificial" | marketing                | —             | IA não operacional                                                                         | **FLAG** (fora da superfície T465 — /planos+/checkout; seguir para decisão de marketing)                |

**FASE 1:** `plan-features.ts` virou FONTE ÚNICA consumida pelo /checkout (hardcode removido — a
divergência não pode voltar por construção). **FASE 2:** IA e API marcados "(em breve)"; "ilimitada"
removida; "estendidas" preciseada para "CSV e JSON"; suporte descrito como canal dedicado; KG entrou
como entregue. Preço/periodicidade INTACTOS; nenhuma promessa adicionada além do KG autorizado.
**i18n:** os dicionários pt/en/es NÃO carregam listas de recursos (o checkout é PT-only hoje, e as
seções soft dos 3 locales são consistentes entre si — condicionais ao checkout) — paridade mantida
por construção; checkout PT-only para falantes não-PT = flag para o gate legal do Operador.

### GATE 2 adendum 5 — T469: P0 jurídico-autônomo (2026-09-22)

**FASE 0 (W1 — re-ancoragem em produção):** counts ao vivo: clubs 3.857 · players 2.396 ·
competitions 1.563 · arestas WON 5.157 (proveniência 100%) · rankings publicados 2 (seed
CONMEBOL/CBF 2023 — produto 0-100 por jogo aguarda T449) · IA não operacional. Leitura do FONTE
das 6 páginas legais + home: claims medidas ("maior acervo", "IA", "história completa", numeração
da privacidade 1-12 SEM salto — o 5→7 da auditoria não existe na versão atual; "v2.0 órfã" também
não existe no fonte — históricos v1.0→v1.2 coerentes; a linha de versão era hardcode compartilhado
no LegalDocument para termos e privacidade).

**W2 cumprido:** nenhum PII da auditoria (razão social, endereço Cajamar, e-mail Yahoo do DPO)
foi publicado ou preenchido; o bloco de identificação permaneceu como estava (CNPJ já publicado
pelo Operador); endereço/DPO nominal = escalação.

**Entregas (×3 locales nas seções existentes):**

- Direitos (§5): prazos harmonizados — recebimento imediato; conclusiva 15d BR (LGPD art. 18 §3) /
  1 mês EEE-UK (GDPR art. 12), prorrogável.
- Segurança (§7): comunicação de incidentes — ANPD referência 3 dias úteis; GDPR 72h.
- Retenção (§8): períodos concretos — backups 30d (T446), pagamento 5 anos (fiscal), logs,
  conta ativa.
- Menores (§9) + cadastro: declaração proporcional de 18 anos no formulário (sem KYC).
- Compartilhamento (§4): cláusula de transferência internacional (LGPD Cap. IV / GDPR Cap. V),
  fornecedores nomeados (Vercel, Railway, Cloudflare, Stripe, Resend, ipwho.is), "não vendemos
  dados e não os usamos para treinamento de IA", DPAs públicos citados (Stripe/Cloudflare);
  demais = "mediante solicitação — Operador coleta".
- **Google Fonts auto-hospedado** (27 woff2, Barlow/Barlow Condensed OFL em /fonts; @import
  runtime removido) — fornecedor eliminado; removido das listas de terceiros nos 3 idiomas.
- ipwho.is: MANTIDO em runtime (invariante documentado "moeda pela localização REAL" — schema do
  checkout proíbe cliente de escolher moeda; substituição por header alteraria comportamento de
  pagamento, território T471) e DOCUMENTADO: §11 já o nomeia + tabela do REPORT.
- almanaque_locale (achado 14): **ESTRITAMENTE NECESSÁRIO** — set SOMENTE em escolha explícita do
  usuário (5 controles de UI; zero auto-detect; server só lê), first-party, 1 ano, sem rastreamento.
- Inventário de cookies: **verificado em produção com contexto limpo — ZERO cookies antes de
  qualquer escolha do titular**; consent_v/locale/__Host-* somente após ações; sem analytics/
  marketing; intro da Política de Cookies atualizada de "será atualizado" para "verificado em
  22/09/2026"; nota Stripe no ato do pagamento.
- Consent E2E contra PRODUÇÃO: **11/11** (destaque equivalente, revogação, prova registrada,
  inventário real, fornecedores).
- Home claims re-ancoradas (×3 locales + layout): "maior acervo"→"acervo em construção, com
  proveniência documentada"; "com IA"→removido (coerente com T465); "história completa"→"em
  construção e com fontes verificadas".
- **/metodologia** publicada (fontes, licenças, critério de verificação, divergências→revisão,
  correções, limitações declaradas: gap de coordenadas, gap 514, IA em breve) + link no rodapé.
  "Fontes verificadas" agora é verdade-por-método-publicado.

**Fora (roteado):** direitos do titular/DMCA fluxos reais → T470 · Opção B geo-restrição → T471 ·
i18n legal + checkout → T472/T468 · cursor-based pagination → WS-S/C · disclosure cheio de IA →
quando IA shippar · identidade/DPO/DPAs/advogado/agente-EUA → OPERADOR (escalação).

### GATE 2 adendum 6 — T469b: correção dos deltas do Operador + achados da FASE 0 (2026-09-22)

**FASE 0 (re-auditoria do T469 mergeado, ANTES de editar texto):** produção medida — clubs **3.857** ·
players **2.396** · competitions **1.563**; matches 0 / rankings 4 (não citáveis como verificados);
"5.157" é comentário de código (`plan-features.ts` — arestas do grafo), NÃO claim público.
locale/ipwho: runtime usa SÓ `ipwho.is` no checkout (`apps/api/src/modules/billing/geo.ts`), sem header
CF/Vercel → decisão da FASE 2 mantida. Identidade publicada já conforme a lista confirmada
(END ART Studios · CNPJ 45.370.930/0001-75 · Osasco/SP · endart.studios@gmail.com), sem razão social,
rua/CEP, Yahoo ou nome pessoal de DPO.

**Achados corrigidos neste round:**

- **Delta 1 / age gate (D-2026-09-22-sem-age-gate):** removida `auth.ageDeclaration` (3 locales +
  `types.ts` + `register/page.tsx`); §9 Menores reescrito para declarar a **ausência** de verificação
  ("não realiza verificação de idade e não coleta intencionalmente dados de crianças … canal de
  privacidade para o responsável"), sem prometer suspensão/eliminação de conta.
- **G-W2 (caixa de domínio inexistente):** `reembolso@almanaquedosclubes.com` → `endart.studios@gmail.com`
  em `/checkout` e `SubscriptionManager` (×3). Nenhuma caixa de domínio restante em `apps/web/src`.
- **G-W1/FASE 4 (claims públicas):** EN/ES "largest/mayor colección … with AI" → claim honesta (acervo em
  construção, proveniência documentada, IA em breve); grid `home.features` (renderizado em
  `HeroSection.tsx`) ×3 locales — "História Completa"→"em Construção", "IA com Citações"→"IA (em breve)",
  "cursor-based"→"paginação" (a API usa OFFSET, não cursor).

**Delta 2 (T471) e Delta 3 (gate beta pago):** T471 (geobloqueio UE) não aplicado — opcional-futuro
(D-2026-09-22-t471-nao-aplicado); gate do beta pago reescrito em D-2026-09-22-gate-beta-pago-ajustado
(pendem T470 + T472; advogado/representante UE/age gate = riscos residuais aceitos e registrados).

**Verificação:** `pnpm typecheck` 0 erros. Sem regressão de lint/prettier: os 122 erros de lint e as
falhas de prettier são **pré-existentes** em `apps/api`/`apps/worker`/`apps/web` (o script
`eslint apps/api/**/*.ts` expande no bash do CI só até 1 nível de diretório — por isso o CI fica verde;
nenhum arquivo fora de `apps/web` foi alterado neste round). Declaração W3: pacote autônomo e honesto,
**sem revisão jurídica externa e sem representante UE** — NUNCA "conforme/GDPR-ready/pronto global".

### GATE 2 adendum 7 — T466: dado geográfico (WS-D) — hierarquia + coordenadas (2026-09-22)

**FASE 0 (R3 medida, não assumida) — veredicto (a):** não existem models geográficos (só `Club.city/state/country` texto + `latitude/longitude`; `Stadium` idem). Produção: clubs **3.857** · com `country` **3.857 (100%)** (169 distintos) · com `city` **463** · com `state` **10** · com coordenada **113 (2,9%)**; `stadiums` **0**; `PostGIS` ausente (`20260905_stadiums_postgis` = no-op documentado, **não** drift). → T466 = migration versionada + seed.

**Entregas:** migration `20261001120000_t466_geo_hierarchy` (`Country`/`State`/`City` + FKs nullable em `clubs`/`stadiums`; PostgreSQL + paridade SQLite; grants) · conector puro `wikidata-geo.connector.ts` (P17→ISO-2/P30; P131→cidade; P131-pai/P300→estado; Zod) · `planGeo`/`syncGeo` (idempotente) · script `ingest-geo-wikidata.ts` (DRY-RUN/`--apply`) · `GET /clubs/:id/geo` (contrato T467).

**Validação viva (amostra real de produção; Wikidata ao vivo):**

| medida | valor |
|---|---|
| clubes resolvidos | **60/60** |
| países / estados / cidades | 23 / 6 / 17 |
| clubes vinculados (país / estado / cidade) | 60 / 6 / 17 |
| re-run (2ª execução) | **created=0, updated=0, unchanged=60** (zero escrita) |
| spot-check 20 clubes (P625 + ISO via P17→P297) | **20/20** |
| spot-check 17 cidades (P625 na fonte) | **17/17** |
| spot-check 6 estados (P300 == code) | **6/6** |
| coordenada fora de faixa | **0** |
| BR fora do bounding-box | **0** |
| órfão/ciclo de hierarquia | **0** |

**GAP DECLARADO:** apenas ~3% dos clubes têm P625 direto (produção 113/3.857; amostra 2/60) — mapa será esparso por clube; cidades (com P625 via P131) podem servir de fallback no T467. `stadiums` vazio (sem seed nesta rodada).

**Blocker honesto:** produção só recebe as tabelas geo no **deploy pós-merge** (migration no boot via `migrate deploy`; não aplicada à mão — regra T430). Portanto o seed em produção (`ingest-geo-wikidata.ts --apply` + `enrich-club-coords.ts --apply`) e o E2E-produção ficam **pós-deploy** (Operador). `M1·WS-C` mapa segue `[ ]` até T467.

### GATE 2 adendum 8 — T476: glob recursivo do lint (governança de CI) (2026-09-22)

**Ponto-cego (medido, não assumido):** `pnpm lint` = `eslint apps/api/**/*.ts apps/worker/**/*.ts packages/**/*.ts` **sem aspas**. No bash do runner (sem `globstar`), `**` age como `*` e o shell expande **um** nível. Arquivos varridos: `apps/api` **27/186**, `apps/worker` **2/14**, `packages` **1/15**. `apps/api/src/modules/**`, `apps/api/tests/**`, `apps/api/src/scripts/**` **nunca eram lintados no CI** → 122 erros escondidos por trás de "CI verde" (viola R1 na infraestrutura).

**Correção:** aspas nos globs do `lint` e `lint:fix` → o shell entrega o padrão literal e o **eslint expande recursivamente** (portável). `prettier --check` já estava entre aspas → recursivo (954 arquivos, 0 diff main=branch). `tsc` usa `tsconfig include` (não glob de shell) → `apps/api` cobre `src/**`; `scripts/**` fora é intencional (T448/#160).

**Antes → depois (arquivos varridos por eslint):** api **27 → 186** · worker **2 → 14** · packages **1 → 15**.

**Triagem por categoria (122 erros / 20 arquivos):** 118 `prettier/prettier` (18 arquivos — **formatação**, `eslint --fix`) · 3 `no-undef` (`NodeJS.ProcessEnv` como tipo → **FP** de core `no-undef` com TS; regra desligada p/ TS) · 1 `preserve-caught-error` (`privacy-copyright.test.ts` → `{ cause: e }`). **Resultado: 0 erros · 98 warnings** (registrados: detect-object-injection 57, no-explicit-any 26, detect-non-literal-fs-filename 14, detect-unsafe-regex 1).

**Artefato novo:** `.gitattributes` (`* text=auto eol=lf`) — faltava (lição T448d).

**Dívida rastreada:** `format:check` (prettier standalone) **não roda no CI** e cobre 954 arquivos (majoritariamente `apps/web/**`, ignorado pelo eslint) — gap separado; 98 warnings de estilo/segurança-FP. **R1:** "CI verde" passa a cobrir lint recursivo de api/worker/packages (ressalva no HANDOFF).
