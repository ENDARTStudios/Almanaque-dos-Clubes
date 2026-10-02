/**
 * T444 — Abstração de provedor de pagamento (provider-agnostic).
 *
 * M3 fica "a env vars de distância": implementar um adapter do provedor
 * escolhido pelo Operador (Stripe já existe em stripe.service; Mercado Pago /
 * PagSeguro viriam aqui) e registrar em PROVIDERS.
 *
 * MockProvider: SOMENTE testes/preview — o factory recusa em produção
 * (guard de env), impossibilitando pagamento falso em prod.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface CreateCheckoutInput {
  userId: string;
  plan: 'PRO' | 'ELITE';
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  currency: string;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface ParsedWebhookEvent {
  id: string;
  type: string; // checkout.succeeded | subscription.canceled | subscription.past_due
  userId: string;
  plan?: 'PRO' | 'ELITE' | 'FREE';
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: 'stripe' | 'mock';
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  /** Verifica HMAC/timestamp e devolve o evento parseado. Lança em falha. */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): ParsedWebhookEvent;
}

const WEBHOOK_TOLERANCE_SECONDS = 300; // replay >5min rejeitado

export function verifyHmacAndTimestamp(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string,
  nowMs = Date.now(),
): void {
  if (!signature || !timestamp) {
    throw new Error('assinatura/timestamp ausentes');
  }
  // Timestamp em SEGUNDOS (padrão Stripe); aceita ms também (>= 1e12).
  const tsMs = Number(timestamp);
  const age = Math.abs(nowMs - (tsMs < 1e12 ? tsMs * 1000 : tsMs));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS * 1000) {
    throw new Error('timestamp fora da tolerância de 5min (replay?)');
  }
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('assinatura HMAC inválida');
  }
}

export function signMockPayload(rawBody: string, timestamp: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function parseMockEvent(rawBody: string): ParsedWebhookEvent {
  const parsed = JSON.parse(rawBody) as {
    id?: string;
    type?: string;
    userId?: string;
    plan?: ParsedWebhookEvent['plan'];
  };
  if (!parsed.id || !parsed.type || !parsed.userId) {
    throw new Error('evento mock incompleto (id/type/userId obrigatórios)');
  }
  return {
    id: parsed.id,
    type: parsed.type,
    userId: parsed.userId,
    plan: parsed.plan,
    raw: parsed,
  };
}
