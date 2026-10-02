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

---

## Estado da configuração test-mode em PRODUÇÃO (T447, 2026-09-18) ✅

Configurado via Stripe CLI/API e validado com checkout real de teste:
- **`STRIPE_PRICE_*` (12 vars por moeda) CORRIGIDAS** — apontavam para IDs de
  PRODUTO (`prod_…`, causa de 500 no checkout); agora com os `price_…` de teste
  corretos (mapping produto+moeda+ciclo via API).
- **Webhook**: endpoint test-mode `we_1UAfPOLpsXCO8a8IF9Qtg0R2` →
  `https://api.almanaquedosclubes.com/api/v1/billing/webhook` (criado pelo
  Operador; `charge.refunded` adicionado via API). **Pareamento
  env↔endpoint VERIFICADO por entrega real**: checkout `cs_test_…` pago com
  4242 → webhook processou → `subscriptions` PRO/ACTIVE + `billings` PAID
  R$4,90 em produção. Dados do teste removidos (subscription cancelada,
  refund succeeded, customer e registros locais deletados).
- **`PAYMENTS_ENABLED` segue AUSENTE** — a ativação é o gesto do Operador.

## FASE 5 — checklist exato do Operador (único passo restante)

1. Stripe Dashboard → **ativar live mode** → criar os produtos/preços live
   (Pro e Elite × mensal/anual, moedas BRL/USD/EUR) e as keys
   `sk_live_…`/`pk_live_…`.
2. Criar webhook endpoint **live** →
   `https://api.almanaquedosclubes.com/api/v1/billing/webhook` com os
   eventos: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`,
   `charge.refunded` → anotar o `whsec_live_…`.
3. Railway (produção) — substituir:
   - `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_PUBLISHABLE_KEY=pk_live_…`,
     `STRIPE_WEBHOOK_SECRET=whsec_live_…`
   - `STRIPE_PRICE_{PRO,ELITE}_{MONTH,YEAR}_{BRL,USD,EUR}=price_live_…`
     (12 vars, mesmos nomes)
   - `PAYMENTS_ENABLED=true`
   - (redeploy automático por mudança de variável)
4. Smoke live: compra real Pro R$4,90 → webhook → assinatura ACTIVE →
   reembolso CDC art. 49 → EXPIRED/CANCELLED + `payment_events` +
   `audit_logs` gravando. Políticas v1.2 (Stripe no compartilhamento).
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
