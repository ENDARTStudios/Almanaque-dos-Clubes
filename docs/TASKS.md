# TASKS.md — Fila e estado das tarefas (T-series)

> Fonte canônica do detalhe: PLANO_MESTRE.md (raiz). Esta página é a fila operacional resumida.

## Fechadas recentemente (produção, com evidência no REPORT §22)

- [x] T448 — arestas WON no KG (#159/#163): 5.157→5.157 arestas, fonte por aresta
- [x] T448c — tie-break determinístico da vitrine (#164)
- [x] T448d — guarda de vigência + cache fail-loud (#168)
- [x] T448e — representante por tipo + backfill de type (#169)
- [x] T448f — type-first condicional por grupo de flagship (#170)
- [x] T465 — oferta honesta com fonte única (#171)
- [x] T469 — legal P0 autônomo (#172)

## Fila (ordem travada pelo Thinker)

- [ ] **T470** — direitos do titular + DMCA reais (reusa protocolo #146, /export, soft-delete, audit)
- [ ] **T471** — Opção B geo-restrição (flag + disable checkout UE/UK + suprimir EUR; ativar = Operador)
- [ ] **T472** — i18n legal + checkout (liga T468) — pré-requisito do beta
- [ ] **T448b-2** — RSSSF estaduais/municipais + auditoria R3 das miscategorizações por keyword (VFF…)
- [ ] **T449** — partidas (RSSSF) → rankings 0-100 por jogo → dívida de tier (supertaça-vs-UCL, 1ª-vs-2ª)
- [ ] **T450** — feminino normalizado · **T451** — ETL em cron · **T467** — mapa-múndi (usa dado do T466)
- [ ] **T466** — dado geográfico auditável (FASE 0 define: migration vs seed) — DESPACHADO
- [ ] **T468** — i18n do checkout (nosso, pré-beta)

## Gates de abertura

- **Beta pago (M3 de produto)** = T465 ✅ + T468 + pacote jurídico do Operador (adv/DPO/DPAs/
  identidade/alcance) + Opção B ativa (T471). Um sem os outros não abre.
- **Global (Opção A)** = rep UE + SCCs + TIA + DPIA (depois da Opção B).

## Regra de fila

Um workstream por round (§2.6) — não paralelizar T449/T450/T467/T468 num mesmo contexto.
