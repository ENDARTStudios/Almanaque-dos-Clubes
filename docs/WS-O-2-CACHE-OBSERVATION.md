# WS-O-2 — Observação do cache ativo (48h) — plano e linha de base

> Início da janela: 2026-10-03 ~00:30 UTC (deploy `affd239` + #316 teto de 1.5s).
> Contexto: o client de cache mudou de comportamento 2× em 24h (#313 dead-silent → alive;
> #316 offline queue → teto de 1.5s). Esta observação prova estabilidade antes de avançar M3.

## Linha de base capturada (T0, 2026-10-03)

| Métrica                 | Valor T0                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Chaves Redis            | 193 total — bull 188 · champions 1 · clubs 2 · rankings 1 · data-refresh 1 (marcador WS-C-8) |
| Memória Redis           | 3.01M · `maxmemory=0` (sem limite) · `maxmemory_policy=noeviction`                           |
| App cache keys          | presentes com TTL 300s (primeira vez que o inventário ≠ 0 desde o T471)                      |
| `[cache] warn` nos logs | verificar T+24/T+48 (esperado: **zero** com Redis saudável)                                  |

## Leitura intermediária (T0+16h, 2026-10-03 ~16:30 UTC — pós-deploy `6c30877`/#319)

> Nota: o deploy da #319 (16:15 UTC) reiniciou o processo — gauges in-memory
> (`rankings_last_run_timestamp`, contadores de request) zeraram; ts=0 é
> inconclusivo por playbook. O cron de ranking re-agendou no boot (`0 3 * * *`)
> e volta a alimentar o gauge no run de 03:00 UTC de 2026-10-04.

| Métrica                    | Valor T0+16h                                                                           | Tendência                                             |
| -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Chaves Redis               | 151 total — bull 148 · champions 1 · clubs 1 · data-refresh 1                          | ✅ estável (bull 188→148 = removeOnComplete limpando) |
| Memória Redis              | 3.04M · `maxmemory=0` · `noeviction`                                                   | ✅ flat (vs 3.01M em T0)                              |
| App cache keys             | `clubs:geo-stats` TTL 3s (renascendo), `champions:carousel` TTL 3544s                  | ✅ vivas                                              |
| Marcador WS-C-8            | `"2026-10-03T03:00:01.414Z"` · TTL restante ~29d                                       | ✅ ETL rodou no horário                               |
| `[cache] warn` / `[ALERT]` | 0 ocorrências nos logs do deployment atual (~30 min de vida; janela completa na T+24h) | ✅ (parcial — deployment reiniciou)                   |
| Latência rotas cacheadas   | `/clubs/geo-stats` 0.35s · `/champions/carousel` 0.44s                                 | ✅ < 800ms                                            |
| `/jobs/health` (admin)     | não verificado nesta leitura (requer auth admin)                                       | —                                                     |

## Checklist T+24h (2026-10-04 ~00:30 UTC) e T+48h (2026-10-05)

1. **Chaves**: inventário estável (app keys ~1-5, TTL renascendo; BullMQ ≤ ~190);
2. **Memória Redis**: sem crescimento monotônico (esperado < 10M; BullMQ limpa completed via removeOnComplete);
3. **`[cache] warn`**: zero ocorrências nos logs do período (qualquer uma = investigar conectividade);
4. **`[ALERT]`**: nenhum `stale_job` para wikidata-incremental (runs 03:00 UTC) nem backlog;
5. **Latência**: `/clubs/geo-stats` e `/champions/carousel` respondem < 800ms (p95 aspiracional, SLOs.md);
6. **Sem hangs**: nenhum timeout de request em rotas cacheadas (o teto de 1.5s do #316 é o seguro);
7. **Health**: `/jobs/health` (admin) — schedulerEnabled=1, sem alerts ativos, queue waiting=0.

## Pontos de atenção declarados

- **`noeviction` sem `maxmemory`**: memória do Redis sem teto — hoje ~3M é irrelevante, mas
  se BullMQ crescer (drain grande como o do T451), monitorar. Ação se crescer: `maxmemory` +
  `allkeys-lru` são decisão de infra do Operador (requer acesso ao config do Redis gerenciado);
- **Marcador WS-C-8** (`data-refresh:new-titles-last-check`) tem TTL 30d — se o ETL pausar
  > 30d, o marcador expira e o primeiro run reprocessa desde o início do job (perde arestas
  > criadas entre runs uma única vez; auto-recupera no run seguinte);
- **Timeout 1.5s**: se o p95 real do Redis comandar perto disso (não mede hoje), o fallback
  ao banco dispara sem erro — observável apenas pela ausência das chaves.

## Critério de fechamento

48h sem: `[cache] warn` · `[ALERT]` · hangs · crescimento anômalo de memória → WS-O-2 `[x]`,
cache declarado estável, M3 (WS-C-9) liberado para despacho.
