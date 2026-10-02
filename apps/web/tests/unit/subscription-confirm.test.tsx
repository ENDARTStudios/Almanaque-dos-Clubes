// @vitest-environment jsdom
/**
 * T464 (condição do #179) — gate de confirmação do modal destrutivo.
 * Mock do fetch (api) — não exige assinatura paga.
 * (a) fechar/Esc/clique-fora ⇒ nenhum POST
 * (b) confirmar ⇒ POST UMA vez
 * (c) sucesso ⇒ re-fetch do histórico (linha REFUNDED sem remount)
 * (d) a11y: role=dialog, aria-modal, foco inicial no botão seguro (Voltar)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SubscriptionManager from '@/components/SubscriptionManager';

vi.mock('@/i18n/Provider', () => ({ useI18n: () => ({ locale: 'pt-br' }) }));
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '@/lib/api';

const PRO_SUB = { plan: 'PRO', status: 'ACTIVE', currentPeriodEnd: '2026-10-01T00:00:00Z' };
const PAID = [
  {
    id: 'b1',
    status: 'PAID',
    amountCents: 490,
    currency: 'BRL',
    externalId: 'ch_1',
    createdAt: '2026-09-01T00:00:00Z',
  },
];
const REFUNDED = [{ ...PAID[0], status: 'REFUNDED' }];

const getMock = api.get as unknown as ReturnType<typeof vi.fn>;
const postMock = api.post as unknown as ReturnType<typeof vi.fn>;

function setupGet(invoices: () => unknown) {
  getMock.mockImplementation((path: string) =>
    path.includes('invoices')
      ? Promise.resolve({ data: invoices() })
      : Promise.resolve({ data: PRO_SUB }),
  );
}

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
});

afterEach(() => cleanup());

it('(a) fechar (Voltar), Esc e clique-fora não disparam POST', async () => {
  setupGet(() => PAID);
  render(<SubscriptionManager />);
  const open = await screen.findByRole('button', { name: /Solicitar reembolso/i });

  // Voltar
  fireEvent.click(open);
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: /Voltar/i }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  // Esc
  fireEvent.click(open);
  await screen.findByRole('dialog');
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  // clique-fora (backdrop)
  fireEvent.click(open);
  const d2 = await screen.findByRole('dialog');
  fireEvent.click(d2.parentElement as HTMLElement);

  expect(postMock).not.toHaveBeenCalled();
});

it('(b) confirmar dispara POST UMA vez; (c) sucesso re-sincroniza o histórico (REFUNDED)', async () => {
  let calls = 0;
  setupGet(() => (++calls > 1 ? REFUNDED : PAID));
  postMock.mockResolvedValue({ data: PRO_SUB, refund: { id: 're_test_1' } });

  render(<SubscriptionManager />);
  const open = await screen.findByRole('button', { name: /Solicitar reembolso/i });
  fireEvent.click(open);
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByTestId('confirm-destructive-yes'));

  await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
  expect(postMock).toHaveBeenCalledWith('/billing/withdraw');

  // (c) linha REFUNDED aparece sem remount (histórico re-buscado)
  await waitFor(() => expect(screen.getByText('REFUNDED')).toBeTruthy());
  // invoice buscado >= 2× (mount + após a ação)
  const invCalls = getMock.mock.calls.filter(([p]) => String(p).includes('invoices')).length;
  expect(invCalls).toBeGreaterThanOrEqual(2);
});

it('(d) a11y: role=dialog + aria-modal + foco inicial no botão seguro (Voltar)', async () => {
  setupGet(() => PAID);
  render(<SubscriptionManager />);
  const open = await screen.findByRole('button', { name: /Solicitar reembolso/i });
  fireEvent.click(open);
  const dialog = await screen.findByRole('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  await waitFor(() =>
    expect(document.activeElement?.textContent ?? '').toMatch(/Voltar/i),
  );
});

it('(e) distinção visível: reembolso cita o valor; cancelamento não promete devolução', async () => {
  setupGet(() => PAID);
  render(<SubscriptionManager />);
  fireEvent.click(await screen.findByRole('button', { name: /Solicitar reembolso/i }));
  expect((await screen.findByRole('dialog')).textContent).toMatch(/R\$\s?4,90/);

  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: /Cancelar assinatura/i }));
  const d2 = await screen.findByRole('dialog');
  expect(d2.textContent).toMatch(/Nenhum valor é devolvido/i);
});
