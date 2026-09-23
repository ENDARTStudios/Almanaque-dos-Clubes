# CODE_REVIEW.md — Checklist de review (PR)

## Antes de abrir

- [ ] Branch a partir da main atualizada; commits NASCERAM na branch (regra de processo).
- [ ] `tsc` api+web 0 · eslint 0 erro · prettier ok.
- [ ] Suíte completa no banco de teste (54330) com `TEST_REQUIRE_DB=true` — controle main-limpo:
      as únicas falhas permitidas são as 4 RLS-env pré-existentes (provar com stash se surgir dúvida).
- [ ] Cobertura dos arquivos tocados ≥ 80% de linhas.
- [ ] Nenhum segredo em diff/log/argv.

## O que o reviewer verifica (por tipo de PR)

### Dado importado (ETL/ingestão)
- [ ] Zod em toda linha; malformado descartado E contado.
- [ ] Proveniência 100% (fonte/QID, URL, data, licença) por registro.
- [ ] Idempotência provada (re-run = zero escrita) + spot-check independente contra a fonte.
- [ ] Gap/órfão CONTADOS e reportados (nunca preenchidos por inferência).
- [ ] Script com DRY-RUN/--apply; reversível por proveniência.

### Vitrine/produto
- [ ] Critério de exibição determinístico (sem ordem implícita de banco; unit embaralha entrada).
- [ ] Gender-blind onde aplicável; vazio-honesto com reason.
- [ ] E2E/live verify contra produção com fingerprint do deploy.

### Legal/oferta
- [ ] ×3 idiomas + `types.ts` em toda chave nova.
- [ ] Nada operacional anunciado sem estar (T465); sem "ilimitado" sem alcance.
- [ ] W2: nenhum PII de auditoria/terceiro; placeholders do Operador preservados.
- [ ] Versão/data do documento legal bumpadas com histórico.

### Sempre
- [ ] Teste novo cobre o defeito (não só o feliz caminho): shuffle, empate, erro de rede, corrida.
- [ ] Regras de [RULES.md](./RULES.md) respeitadas (R1/R2/R3, fail-loud, branch).
- [ ] Reconciliação no mesmo PR (DECISOES/PLANO/REPORT quando muda estado/decisão).

## CI é o gate final

O Security Gate (Postgres real) + migration-drift + gitleaks passam OBRIGATORIAMENTE — local não
substitui. Merge por squash; deploy verificado por FINGERPRINT (não por "mergei").
