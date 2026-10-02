# WS-G-1.2-B.1 — Ranking-refresh dry-run-only em produção (evidência)

> **Modo:** DRY-RUN, read-only. **Zero apply, zero write, zero scheduler, zero migration.**
> Executado no container Railway de produção via entrypoint seguro (`node --input-type=module`
> importando `dist/lib/orchestration/runner.js`); **nenhum** endpoint HTTP.

## Pré-condições

- `ORCHESTRATION_ENABLED` = **`<unset>` (OFF)** · `ETL_SCHEDULER_ENABLED` = **`<unset>` (OFF)**.
- Artefatos `dist/lib/orchestration/{runner,planners,registry}.*` presentes.
- Nenhum worker de apply / cron ativo.

## Snapshot pré

- `ranking_entries` hash (EN) = **`d2b117aa537047efe96edbac844e4c40`**.
- rankings **10** · entries **256**.
- estadual RSSSF **7** · `country_pyramid` EN **1** · dup QID **0/0** · clubs/comps sem QID **0**.

## Execução (dry-run por ranking; chave composta `rankingId+clubId`)

```json
{
  "job": "ranking-refresh-dry-run",
  "mode": "DRY",
  "apply": false,
  "writes": 0,
  "migrations": 0,
  "schedulersActivated": 0,
  "rankingsScanned": 10,
  "entriesScanned": 256,
  "wouldCreate": 0,
  "wouldUpdate": 0,
  "wouldChangePoints": 0,
  "wouldChangePositions": 0,
  "diffsByRanking": [],
  "errors": []
}
```

## Gates (todos verdes)

errors `[]` · wouldCreate **0** · wouldUpdate **0** · wouldChangePoints **0** · wouldChangePositions **0** ·
writes **0** · migrations **0** · schedulersActivated **0** · `hashAfterSimulation == hashBefore ==
d2b117aa…` · estadual **7** · EN pyramid **1** · 0 sem QID · 0 duplicidade.

## Snapshot pós

- `ranking_entries` hash = **`d2b117aa537047efe96edbac844e4c40`** (inalterado).

## Conclusão

Planner de ranking-refresh com chave composta **não detecta drift** e **não propõe escrita** sobre os rankings
existentes. `WS-G-1.2-B.1` **verde** (dry-run-only). **Apply continua `[ ]` — não autorizado.**
