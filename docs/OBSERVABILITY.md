# OBSERVABILITY.md — Observabilidade (T422 / WS-O)

> Almanaque dos Clubes · Fase F16 / WS-O. Métricas, alertas, backup e healthchecks.
> **Validação runtime em Docker é condicionada ao daemon ativo** (D-2026-09-05-t422-docker-daemon-bloqueio).

## 1. Visão geral

A API já tinha: `config/logger.ts` (Pino JSON estruturado), `/api/v1/health`, `/api/v1/metrics` (JSON), `docker-compose.yml` (postgres/api/minio/redis), `scripts/backup-db.ts` (dump JSON gzip, retenção 30d local) e `config/s3.ts` (client S3-compatível).

T422 adiciona a camada de observabilidade em código (testada por TDD) + stack Docker declarativa.

## 2. Métricas (Prometheus)

- **`src/modules/observability/metrics.ts`** — registry de contadores (sem dependência) + `renderPrometheus` (formato de exposição Prometheus).
- **`/api/v1/metrics`** (rota `routes/metrics.ts`) retorna **Prometheus text** (`text/plain; version=0.0.4`).
- **Hook `onResponse`** (no escopo `/api/v1` do `app.ts`) incrementa: `http_requests_total{method,status}`, `http_5xx_total`, `auth_failures_total` (401/403 em `/auth/*`).

Nenhum dado sensível é registrado (apenas método/status).

Verificação: `curl -s http://localhost:3000/api/v1/metrics | head` → linhas `# TYPE ...` e `http_requests_total{...}`.

## 3. Alertas

- **`src/modules/observability/alerts.ts`** — regras puras + `evaluateAlerts(snapshot)`.
- Regras: 5xx/total > 1% · falhas de auth > 50/min · último backup falhou · disco > 80%.
- `renderAlertPayload(alerts)` gera o JSON do webhook (Slack/Discord/email); `ALERT_WEBHOOK_URL` em secret manager.
- Prometheus rules em `observability/alerting.yml` (`High5xxRate`, `AuthFailureBurst`).

## 4. Backup → S3 + cron

- **`src/modules/observability/backup.ts`** — `verifyBackupGzip` (integridade) + `uploadBackupToS3` (cliente injetado).
- **`scripts/backup-to-s3.ts`** — dump lógico (JSON gzip) → verificação → upload S3 (MinIO/B2) → retenção 30d.
- **`scripts/cron-backup.ts`** — executa 1x e reagenda para **03:00 UTC**; em produção prefira scheduler externo.

## 5. Healthchecks (self-hosted)

- Docker service **healthchecks** (`healthchecks/healthchecks:latest`) em `:8005` (sqlite).
- Uptime: **`GET /api/v1/health`** (200 + `status:ok`).

## 6. Stack Docker (compose)

Serviços adicionados: **prometheus** (`:9090`), **grafana** (`:3001`), **loki** (`:3100`), **healthchecks** (`:8005`). Configs em `.observability/`.

```bash
docker compose up -d prometheus grafana loki healthchecks      # requer daemon Docker ativo
docker compose config                                          # valida o compose (offline)
```

## 7. Runbook

- **Alta taxa 5xx:** ver `http_5xx_rate`/`http_requests_total`; checar log Pino e webhook.
- **Burst de auth:** ver `auth_failures_total`; checar brute-force em `/api/v1/auth/login`.
- **Backup falhou:** ver webhook `backup_failed`; checar credenciais S3, bucket, retenção.
- **Disco >80%:** ver alerta `disk_usage`; gerenciar retenção de logs/backups.
- **Healthcheck vermelho:** checar `GET /api/v1/health`.

## 8. Limitações / condicionais

- **Validação runtime condicionada ao Docker daemon ativo** (D-2026-09-05). Código + testes (TDD) entregues; `docker compose up` + curl só após Docker ativo.
- **Webhook de alerta** usa env `ALERT_WEBHOOK_URL` (secret manager); SaaS de alerta exigiria credenciais do Operador.
- Métricas expõem apenas contadores (sem dados sensíveis).