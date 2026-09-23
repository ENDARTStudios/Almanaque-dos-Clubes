# MEMORY.md — Memória do projeto (para agentes e humanos)

> Três camadas de memória, cada uma com dono e validade. Regra R3 aplica-se a TODAS: memória é
> registro do que foi verdade NO MOMENTO — nunca certifica estado atual sem re-ancorar em produção.

## 1. Memória de máquina (por sessão/agente)

Diretório de memória persistente do agente (fora do repo): fatos de usuário, feedback de
trabalho, estado do projeto, referências. Atualizada ao fim de cada round com: PRs merged,
decisões novas, armadilhas descobertas, fila travada. É a primeira coisa que uma sessão nova lê.

## 2. Memória de projeto (no repo — commitada)

| Arquivo | Conteúdo | Regra |
|---|---|---|
| [DECISOES.md](../DECISOES.md) | decisões datadas + regras permanentes | append no topo; não se re-discute sem fato novo |
| [CHANGELOG.md](./CHANGELOG.md) | rounds → PRs → efeito em produção | por release |
| [docs/RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md) | evidência por gate (§22+) | colar comando+saída, não prints soltos |
| [PLANO_MESTRE.md](../PLANO_MESTRE.md) | Estado Final consolidado | re-ancorar números em produção a cada round |
| [HANDOFF.md](../HANDOFF.md) · HANDOFF-T445.md | bastão entre sessões | autocontido: lê e executa |
| [worklog.md](../worklog.md) | log bruto por tarefa | append durante o trabalho |
| `docs/evidence/` | artefatos (SQL de rollback, dumps de prova) | referenciado pelos PRs |

## 3. Memória de processo (as lições que viraram regra)

As armadilhas que CUSTARAM rounds — cada uma tem entrada no DECISOES; índice em
[docs/RULES.md](./RULES.md). Destaques (a "bíblia de armadilhas" acumulada):

- Snapshot/documento que mente > ausência (R3 nasceu disso, 6+ validações).
- Catch silencioso em escrita/invalidação (3 instâncias: logout-400, refund-skip, cache-stale).
- Commit fora da branch do PR + stash alheio (3 ocorrências → regra de processo).
- UNION de datas sem colapso cross-year (double-count de títulos).
- Label service em query janelada (504) / VALUES GET > 4k chars (431).
- `&` em sessão ssh morre com a sessão; grep de /proc casa consigo (falso vivo).
- Fixture com ano futuro/contaminante (guarda de vigência do T448d mudou o contrato).
- Credencial em argv/log (regra no-echo); env duplicado = credencial de prod em DB novo.
- PII de auditoria NUNCA vira texto (W2); pacote legal nunca é "conforme" (W3).

## Ritual de fim de round

1. Reconciliação merged (DECISOES + PLANO + REPORT).
2. Memória de máquina atualizada (estado + armadilhas novas + fila).
3. HANDOFF atualizado se houve troca de sessão.
4. Checklist de docs de estado: número citado = re-ancorado? (R3).
