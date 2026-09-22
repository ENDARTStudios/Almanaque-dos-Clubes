/**
 * T451 — resolver de PaymentIntent para refund de assinatura.
 * Fixtures refletem o formato REAL observado em produção (Checkout recente):
 * invoice SEM payment_intent/charge e PI localizável apenas por
 * charges.list({customer}) — o formato antigo também é coberto.
 */
import { describe, it, expect } from 'vitest';
import { resolveRefundablePaymentIntentId } from '../../src/modules/billing/stripe.service.js';

type Inv = { id: string; payment_intent?: string | null; customer?: string | null };
type Chg = { status: string; refunded: boolean; payment_intent?: string | null };

describe('T451 — resolveRefundablePaymentIntentId', () => {
  const paidInvNoPi: Inv = { id: 'in_1', customer: 'cus_1' }; // formato Checkout recente
  const paidInvOldPi: Inv = { id: 'in_2', payment_intent: 'pi_old', customer: 'cus_1' };
  const liveCharge: Chg = {
    status: 'succeeded',
    refunded: false,
    payment_intent: 'pi_3UHZeZPvpIyYKAjl1O13Zllg',
  }; // fixture real (live, 09-20)

  it('formato antigo: invoice.payment_intent presente → usa direto', () => {
    const pi = resolveRefundablePaymentIntentId([paidInvOldPi], []);
    expect(pi).toBe('pi_old');
  });

  it('formato Checkout recente: invoice sem PI → localiza via charge do customer', () => {
    const pi = resolveRefundablePaymentIntentId([paidInvNoPi], [liveCharge]);
    expect(pi).toBe('pi_3UHZeZPvpIyYKAjl1O13Zllg');
  });

  it('charge já reembolsada não é candidata → null (fail-loud)', () => {
    const pi = resolveRefundablePaymentIntentId(
      [paidInvNoPi],
      [{ status: 'succeeded', refunded: true, payment_intent: 'pi_3UHZeZPvpIyYKAjl1O13Zllg' }],
    );
    expect(pi).toBeNull();
  });

  it('sem invoices pagas mas com charge do customer → usa o charge (dinheiro real manda)', () => {
    const pi = resolveRefundablePaymentIntentId([], [liveCharge]);
    expect(pi).toBe('pi_3UHZeZPvpIyYKAjl1O13Zllg');
  });

  it('charge sem payment_intent não é candidata → null', () => {
    const pi = resolveRefundablePaymentIntentId(
      [paidInvNoPi],
      [{ status: 'succeeded', refunded: false, payment_intent: null }],
    );
    expect(pi).toBeNull();
  });

  it('múltiplas invoices: prefere o formato antigo antes da cascata de charges', () => {
    const pi = resolveRefundablePaymentIntentId(
      [paidInvOldPi, paidInvNoPi],
      [{ status: 'succeeded', refunded: false, payment_intent: 'pi_via_charge' }],
    );
    expect(pi).toBe('pi_old');
  });
});
