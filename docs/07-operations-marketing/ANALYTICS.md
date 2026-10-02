# ANALYTICS.md — Analytics e telemetria

## Estado real (verificado T469): NENHUM analytics/marketing ativo

Auditoria em contexto limpo (home/login/checkout/clubs): **ZERO cookies de terceiros e zero
scripts de analytics antes ou depois da escolha de consentimento**. A Política de Cookies declara
as categorias Analytics e Marketing como **"NÃO utilizadas atualmente"**.

## Regras quando um fornecedor for contratado

1. Entra no inventário de /cookies (tabela ×3 idiomas) ANTES do primeiro script rodar.
2. Só carrega após consentimento granular **analytics** (loader gateado por categoria — T436;
   `consent-loader` testado).
3. Revogação remove/rebloqueia imediatamente.
4. Sem "ilimitado"/promessa indefinida — mesmas regras da oferta (T465).

## Telemetria interna (não é analytics de usuário)

- `/api/v1/metrics` (Prometheus): http_requests_total, 5xx, auth_failures (T422).
- audit_logs: eventos de auth/billing/admin (append-only) — prova de implementação, não métrica de
  audiência.
- alerts.yml: health + delta de 5xx/auth a cada 5 min; rankings-stale como warn.
- Nenhum dado de uso do usuário vai para terceiros hoje (nem para IA — IA não operacional).
