# MONITORING.md — Observabilidade

## Ativo em produção

| Instrumento | Onde | O que cobre |
|---|---|---|
| `/api/v1/health` | API | healthcheck do Railway (retry 2min; deploy rejeitado se falhar) |
| `/api/v1/metrics` | API (T422) | http_requests_total, http_5xx_total, auth_failures_total (Prometheus) |
| alerts.yml | workflow 5min | health + delta de 5xx/auth com cache; rankings-stale como warn |
| backup.yml | workflow 04:00 UTC | pg_dump → R2 (threshold 400KB + validação clubs>0) + manifest |
| drill.yml | semanal | restore-drill: baixa R2, restaura em DB efêmero, compara counts |
| audit_logs | banco | auth/billing/admin/etl — append-only |
| logs Railway | API/worker | pino estruturado; 5xx com correlationId |

## Runbook de incidentes

[docs/INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) — prazos: ANPD 3 dias úteis (quando
aplicável) / GDPR 72h (publicado na Privacidade §7 desde T469). Rollback de deploy:
[docs/DEPLOY-ROLLBACK.md](./DEPLOY-ROLLBACK.md) (redeploy anterior + migration não descida).

## Sinais que já pegaram defeito real (manter monitorados)

- healthcheck de deploy rejeitando versão nova (rootDir quebrado — T448e).
- 5xx em rota nova pós-deploy (grants faltando — 42501).
- backup com clubs=0 (dump custom vazio — T446).
- champions com `generatedAt` velho = cache stale (DEL por chave exata até o fail-loud cobrir
  todos os chamadores).

## Pendência

Painel/alertas de NEGÓCIO (arestas WON novas, ingestão falha, gap por hierarquia) — candidato a
round de observabilidade (T4xx); hoje o sinal é o output dos scripts + REPORT.
