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
