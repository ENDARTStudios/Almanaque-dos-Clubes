# PAYMENTS-RUNBOOK.md — Ativação de monetização (M3)

> Este runbook documenta o que o Operador entrega e os passos de ativação
> quando a decisão financeira for tomada. A estrutura T444 está pronta —
> o M3 fica "a env vars de distância".

## O que o Operador entrega

| Item | Descrição |
|---|---|
| Provedor | Stripe, Mercado Pago ou PagSeguro (decisão financeira) |
| Conta merchant | KYC/aprovação no provedor escolhido |
| Keys de teste | `sk_test_*` + `pk_test_*` + webhook secret |
| Keys de produção | `sk_live_*` + `pk_live_*` + webhook secret |
| 4 prices | Pro monthly, Pro yearly, Elite monthly, Elite yearly |

## Passos de ativação

### 1. Env vars no Railway
```bash
railway variables --service "Almanaque-dos-Clubes" \
  --set STRIPE_SECRET_KEY=<key> \
  --set STRIPE_WEBHOOK_SECRET=<secret> \
  --set PAYMENTS_ENABLED=true
```

### 2. Deploy
```bash
# O redeploy é automático após mudança de variáveis
railway redeploy --service "Almanaque-dos-Clubes"
```

### 3. Smoke de pagamento (test mode primeiro)
```bash
# Registrar usuário de teste → assinar plano → verificar webhook →
# verificar status no painel → cancelar → verificar status
```

### 4. Flag de produção
```bash
vercel env add PAYMENTS_ENABLED production true
vercel redeploy
```

### 5. Smoke de produção
- /planos → botões habilitados
- Checkout → Stripe redirect → pagamento de teste → webhook → status ACTIVE

## Arquitetura T444

- `PaymentProvider` interface — provider-agnostic
- `payment_events` — idempotência por `providerEventId` UNIQUE
- Máquina de estados: PENDING → ACTIVE → PAST_DUE → CANCELLED → EXPIRED
- `assertTransition` — transições inválidas rejeitadas + auditadas
- Webhook: HMAC verificado pelo SDK do provedor; replay >5min rejeitado
- Checkout: redirect para hosted checkout do provedor (PCI minimizado)

## Segurança

- Sem dados de cartão no nosso domínio (redirect) — PCI minimizado
- Credenciais apenas no Railway (nunca em código, nunca em log)
- `PAYMENTS_ENABLED` default off — monetização não existe até ativação explícita
