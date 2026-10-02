# SLOs — Objetivos de Nível de Serviço (WS-O-1)

> **Status: ASPIRACIONAL — sem SLO binding.** O Almanaque não é serviço pago (beta
> fechada/open beta) e não há contrato de disponibilidade. Estes números existem como
> **referência para decisões futuras de escala/infra** (quando houver assinantes pagos
> ou SLA com terceiros, este documento vira o ponto de partida para targets
> vinculantes, com orçamento de erro e consequências definidas).

Medição: `GET /api/v1/observability/slo` (admin) + alertas internos (`lib/observability/alerts.ts`).
Limitação declarada: contadores de run são **em memória** (zeram a cada redeploy);
histórico persistente de fila no Redis (últimos 50 completed/failed por fila).

## API pública

| Indicador            | Alvo                   | Como medir hoje                                                                                |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| Uptime mensal da API | 99.5%                  | GitHub Actions `alerts.yml` (probe 5min em `/api/v1/health`); histórico de deployments Railway |
| Erros 5xx            | < 0.5% das requisições | `/metrics` (deltas no alerts.yml)                                                              |

## Endpoints de leitura pesada (geo/compare/timeline)

| Indicador    | Alvo    | Como medir hoje                                                     |
| ------------ | ------- | ------------------------------------------------------------------- |
| Latência p95 | < 800ms | Ainda sem tracing de latência por rota — gap declarado (ver abaixo) |

Gaps declarados para atingir medição real: tracing de latência por rota (plugin de
métricas com histograma por rota) e coleta de uptime externa persistente (hoje o
probe é efêmero). Sem estes, os alvos acima são referência de projeto, não medição.

## Crons (fila BullMQ)

| Job                      | Cadência-alvo                                                                 | Aderência medida                                     |
| ------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `wikidata-incremental`   | 1 run/dia (03:00 UTC)                                                         | `/observability/slo` — lastRunAge ≤ 26h              |
| `integrity-check`        | 1 run/semana (dom 04:00 UTC)                                                  | `/observability/slo` — lastRunAge ≤ 8 dias           |
| `ranking:compute` (T425) | 1 run/dia (03:00 UTC)                                                         | `/observability/slo` — lastRunAge ≤ 26h              |
| Alertas                  | backlog > 100 · 3 falhas consecutivas · staleness 48h · deriva de integridade | `alerts` no `/jobs/health` + logs críticos `[ALERT]` |

## Regras do regime atual

1. **Sem binding**: violação de SLO não dispara consequência contratual — dispara
   investigação (alerta interno).
2. **Sem terceiros**: telemetria 100% interna (logs pino, Redis, Postgres). Nenhum
   dado sai do perímetro (consistente com a política de privacidade v1.3).
3. **Serviços pagos**: nenhum nesta fase (despacho WS-O-1).
