# QA_TESTING.md — QA antes de declarar entregue

## Por tipo de entrega

### Dado importado (ETL/ingestão)
- [ ] DRY-RUN executado (plano impresso: criar/skip/gap/órfão por hierarquia).
- [ ] --apply + contagem ANTES/DEPOIS por hierarquia.
- [ ] Re-run idempotente (skip≈total; criar≈claims novas da fonte).
- [ ] Spot-check independente ≥ 20 registros (re-busca na FONTE, não no pipeline).
- [ ] Zero duplicação provada no DB (GROUP BY chave HAVING > 1 = vazio).
- [ ] Proveniência 100% nos novos registros.

### Vitrine/produto
- [ ] Live verify com fingerprint do deploy (`RAILWAY_GIT_COMMIT_SHA`) + cookie real, sem mock.
- [ ] Cards/estados capturados (antes/depois quando for correção).
- [ ] E2E de estabilidade (re-render não muda resultado determinístico).
- [ ] Estados vazio/honesto visíveis quando não há dado.

### Oferta/legal
- [ ] /planos ≡ /checkout (fonte única) ×3 idiomas sem divergência.
- [ ] Nada operacional anunciado sem estar; "(em breve)" nos não-operacionais.
- [ ] Preço/periodicidade intocados (dif visual contra produção).
- [ ] Consentimento: banner, esforço equivalente, revogação, prova registrada (E2E 11/11).
- [ ] Zero cookies antes da escolha (contexto limpo).

## Evidência

Toda verificação viva é colada no REPORT (docs/RECONCILIATION-REPORT.md §22+) com: comando,
saída resumida, e o que foi assertado. Print sem comando não é evidência.

## Regressão mínima por release

consent.spec (11) · champions-stability · oferta-honesta · rights · auth-nav — todos verdes
contra produção + suíte unit/integração completa com controle main-limpo.
