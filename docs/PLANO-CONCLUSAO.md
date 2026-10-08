# PLANO-CONCLUSAO.md — Lista Reconciliada de Tarefas Pendentes

> **Data-base:** 08 de outubro de 2026 · **Branch main:** `fed6da6` (origin, CI verde)
> **Método:** verificação contra o ESTADO VIVO (regra R3 — `git log` + `PLANO_MESTRE.md` + `DECISOES.md` +
> docs de observação + smoke de produção), não contra snapshots.
> Este documento substitui o snapshot "Plano de Conclusão — Lista Completa de Tarefas" (data-base 08/10)
> recebido do Operador, que continha itens defasados. Correções listadas na §1.

---

## §1 Correções vs snapshot recebido (itens que o snapshot marcava pendentes e JÁ ESTÃO feitos)

| Tarefa                                        | Snapshot dizia        | Estado real (evidência)                                                                                                                                    |
| --------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T033** — T450 wave 5 (estaduais femininos)  | `[ ]` pendente        | **✅** merge `e075e45` (PR #400) — e as ondas **6/7/8** também (#402/#408/#410) + fix w8 `fed6da6` (#411)                                                  |
| **T092** — i18n DireitosTitularPanel          | `[ ]` pendente        | **✅** merge `b7ee503` (PR #394) — painel pt/en/es                                                                                                         |
| **T073** — Favoritos em tempo real            | `[ ]` pendente        | **✅** T439 (WebSocket `/ws` com ticket single-use; PLANO_MESTRE §STATUS)                                                                                  |
| **T084** — Confirmação Stripe LIVE            | `[ ]` pendente        | **✅** Stripe LIVE confirmado; compra real Pro R$4,90 em 20/09 (M3 §evidência)                                                                             |
| **T085** — Smoke real de checkout             | `[ ]` pendente        | **✅** compra + estorno reais executados (M3 DECLARADO 2026-09-21)                                                                                         |
| **T086** — Reembolso CDC art. 49              | `[ ]` pendente        | **✅** refund fail-loud #146 com protocolo na tela                                                                                                         |
| **T087** — Painel de assinatura               | `[ ]` pendente        | **✅** T453: histórico de cobranças + bloco CDC (PRs #147/#155)                                                                                            |
| **T091** — Direitos do titular (LGPD art. 18) | `[ ]` pendente        | **✅** T445 (PR #137) + T470: exportação, exclusão soft+anonimização, protocolo, SLA                                                                       |
| **T056** — Dados legais do Operador           | `[OP]` pendente       | **✅** D-2026-09-15-ws-l-identity-confirmed: CNPJ 45.370.930/0001-75, Osasco/SP publicados                                                                 |
| **T119** — Domínio próprio                    | `[OP]` pendente       | **✅** `almanaquedosclubes.com` registrado 14/08/2026 (expira 08/2027)                                                                                     |
| **T078** — Rankings femininos                 | `[ ]` esperando dados | **⏸ ADIADO por decisão** D-2026-10-06-t450-rankings-femininos-adiados (fontes sem resultados femininos; caminho automático = cron T425 quando houver dado) |

Marco **M3 — Open Beta (monetizar) foi DECLARADO COMPLETO em 2026-09-21** — a seção "FASE 3 ~40%" do
snapshot está obsoleta por inteiro.

## §2 Estado dos marcos (verificado)

| Marco                           | Status                  | Evidência                                                                         |
| ------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| M1 — Beta Fechada (ler/navegar) | ✅ DECLARADO 2026-09-15 | PR #105 + smoke verde                                                             |
| M2 — Beta Fechada (engajar)     | ✅ COMPLETO 2026-09-16  | T438/T439/T440/T441 (PRs #107–#119)                                               |
| M3 — Open Beta (monetizar)      | ✅ DECLARADO 2026-09-21 | Stripe LIVE, compra real, CDC art. 49                                             |
| M4 — v1.0 conteúdo amplo        | 🟡 em andamento         | T448/T448b (5.164 arestas WON) · T450 ondas 1–8 · T451 cron ativo · T449 rankings |
| M5 — v1.0 público               | 🔴 pendente             | ver §4 P3                                                                         |
| Pós-lançamento                  | ⚪ planejado            | fora do escopo até M5                                                             |

**Acervo em produção (2026-10-08):** API health 200 · 3.829 clubes com país · 168 países · 97 estados ·
coordenadas 6.383+ · arestas WON 5.164 · hash ranking `3e93aba9…`.

## §3 Backlog AUTÔNOMO pendente (o agente executa) — priorizado

### P1 — Caminho crítico (esta sessão/round)

| #        | Tarefa                                                     | Status verificado                                                                                                                                                                                                                                 | Ação                                                                   |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **T072** | Comparadores avançados (gráficos interativos + export PDF) | **✅ PR #415 mergeado (08-10)** — radar normalizado (normalização pelo líder; eixo sem dado é excluído e declarado) + Exportar PDF via print (CSP-safe, i18n ×3, 5 testes); smoke `/compare` 200                                                  | Concluída                                                              |
| **T077** | WS-G-1.2-B.2 — apply real do ranking refresh               | `[ ]` GATED: apply exige aprovação explícita; B.1 dry-run (29-09) = **0 drift** (nada a aplicar); sem wiring script→DB no repo (B.1 foi entrypoint ad-hoc no container)                                                                           | Escalar decisão com este quadro; re-dry-run exige reconstruir o wiring |
| **T094** | Export CSV/JSON com rate-limit (Pro/Elite)                 | **✅ PR #417 mergeado (08-10)** — FREE 403 `PLAN_REQUIRED` · PRO=csv · ELITE=csv+json (spec = catálogo `/planos`)                                                                                                                                 | Concluída                                                              |
| **T096** | Limites diferenciados por plano (rate-limit)               | **✅ PR #417 mergeado (08-10)** — quota diária Redis: PRO 20/dia · ELITE 60/dia (default declarado, 429 com Retry-After, fail-open)                                                                                                               | Concluída (limites ajustáveis pelo Operador)                           |
| **T034** | Seed de jogadores em escala (Wikidata P54)                 | `[~]` — scripts prontos (`ingest-players-wikidata.ts`, `seed-squads.ts`); 2.396+ jogadores; cobertura parcial — **ADIADO por colisão**: sessão paralela em mega-sweep SPARQL de Wikidata (mesmo IP, rate-limit compartilhado; PRs #413/#414/#420) | Reabrir quando a mega-sweep fechar                                     |

**Extra do round 1 (08-10):** dívida de monitoramento **#303 fechada** (PR #416 mergeado) — health de jobs
persiste em Redis (TTL 8d) e `/jobs/health` + `/observability/slo` sobrevivem a redeploy; o restart de
01:14 UTC de hoje tinha apagado os gauges do cron das 03:00.

**Extra do round 2 (08-10):** **T138 avançou** (PR #421 mergeado) — cobertura REAL medida com suíte
completa em DB+Redis locais: global 68,6→**74,9% linhas** (63% branches); players 12,3→92,3% (service
100% linhas) · matches 14,8→98,1% · seasons 14,8→98,1% · upload 16,7→71,4%; thresholds 30/20/25/30 →
70/60/68/72. **Gaps restantes p/ os 80%:** rankings.service 18,6% · graph 35% · rag 33% · legal 40% ·
upload routes. **Achado:** `prisma migrate deploy` from-scratch quebra no repo (3 migrations criam
`clubs`, era da reconstrução; CI não vê pois usa baseline dump) — follows-up no worklog.

### P2 — Conteúdo M4 (rounds seguintes)

- **T450** — continuar ondas (Wikipedia PT como fonte substituta; recomendações wave 3 em `docs/T450-OBSERVATION.md`: coords, cura de seleções×clubes, monitorar WD para BR feminino)
- **T046** — perfil completo de jogador `[~]` (perfil existe desde M1; faltam carreira/estatísticas/ranking histórico)
- **T047** — página de partida `[ ]` · **T048** — linha do tempo de CLUBES **✅ já feito (WS-C-5: `GET /clubs/:id/timeline` + `ClubTimeline` na página)**; timeline de JOGADOR depende de carreira (P54, escasso — ver T034)
- **T099** — conector RSSSF completo `[~]` (parsers MG/GO/PR/EN vivos; falta arquivo global)
- **T100** — FBref `[ ]` (worker tem stub `ingestFbref`; licenciamento a verificar)
- **T102/T103** — partidas e elencos em escala `[ ]`
- **T106–T108** — IA RAG funcional `[~]` (endpoint existe; pgvector no schema; LLM/Ollama pendente — infra Operador)
- **T109–T118** — conteúdo complementar (uniformes, flâmulas, hinos, 360º, curiosidades, rivalidades, treinadores, feminino em profundidade) `[ ]`

### P3 — Hardening/qualidade M5

- **T093** — feature flags com UI de administração `[ ]` (pacote `packages/feature-flags` existe)
- **T123/T124** — criptografia de coluna + rotação automática `[~]` (2.10)
- **T125** — Prisma 7 (plano em 5 fases, PR #11) `[ ]`
- **T127** — ClamAV em uploads `[ ]`
- **T130–T135** — logs centralizados, métricas, alertas externos, uptime, backup cron (backup R2 ✅ T446; falta cron diário), DAST semanal `[ ]`/`[~]`
- **T138** — cobertura ≥80% `[~]` (round 08-10: 74,9% linhas, 4 services cobertos, thresholds honestos; falta rankings.service/graph/rag/legal/upload-routes) · **T139** — E2E Playwright no CI (dívida T476c) `[ ]` · **T140/T141** — carga 1.000 usuários + testes de IA `[ ]`
- **T142–T145** — Lighthouse >90, PWA offline, WCAG audit, SEO técnico `[ ]`

## §4 Bloqueadas pelo OPERADOR (escalação, não execução autônoma)

| #            | Item                                                                             | Por quê                                         |
| ------------ | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| T057/T090    | Aliases de email (contato@/suporte@/privacidade@/security@/reembolso@/direitos@) | dono do domínio/identidade                      |
| T058         | Nome do encarregado/DPO                                                          | decisão de identidade                           |
| T077 (apply) | Autorização explícita do apply do ranking em produção                            | escrita em dado publicado (governança WS-G-1.2) |
| T106 (LLM)   | Provisionar Ollama/LLM + pgvector em produção                                    | infra/infraestrutura de custo                   |
| T120         | DNSSEC + CAA + HSTS preload                                                      | dono do DNS                                     |
| T121         | Registro da marca                                                                | dono do dinheiro/identidade                     |
| T122         | Redirect URI Google OAuth no Console                                             | credenciais                                     |
| T064         | APIs pagas Meta/X/YouTube                                                        | dinheiro                                        |
| T146–T148    | Data de lançamento, campanha, press kit                                          | decisão de negócio                              |

## §5 Regras de execução (vigentes)

1. Um workstream por round; gates universais: `tsc` + lint + testes + CI verde + smoke de produção.
2. Estado vivo prevalece sobre snapshots — reconciliar `PLANO_MESTRE.md` a cada milestone fechado.
3. Escalação ao Operador SOMENTE via `docs/PENDENCIAS_OPERADOR.md`.
4. Placeholders honestos: nunca inventar dados legais/financeiros.
5. Aplicações de escrita em produção seguem o padrão dry-run → gate → apply → SQL → smoke (padrão T448b/T450).

---

_Reconciliação executada em 2026-10-07 pelo Doer (sessão `/goal`). Próxima revisão: ao fechar o próximo milestone._
