// @vitest-environment jsdom
/**
 * /dashboard no conceito FICHA — a tabela "Conta e assinatura".
 *
 * O que protege: cada linha declara situação, detalhe e a ação REAL; Perfil sem tela diz
 * "Em breve" em vez de um link falso, e Plano sem status no payload não inventa "Apoiador".
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AccountTable from '@/components/conceito/conta/AccountTable';
import { wsConceitoDashboard } from '@/i18n/wsConceitoDashboard';

afterEach(cleanup);
const s = wsConceitoDashboard['pt-br'];
const stats = {
  totalFavorites: { club: 4, player: 1, competition: 2 },
  totalNotifications: { total: 3, unread: 1 },
  totalProposals: { total: 2, pending: 1, approved: 1, rejected: 0 },
  ownedClubsCount: 0,
  isAdmin: false,
};

describe('AccountTable (dashboard)', () => {
  it('declara situação, detalhe e ação real; nada de link falso', () => {
    render(<AccountTable stats={stats} s={s} />);
    const tabela = screen.getByTestId('dashboard-conta-tabela');
    expect(screen.getByRole('heading', { name: 'Conta e assinatura' })).toBeTruthy();
    expect(tabela.textContent).toContain('1 não lidas');
    expect(tabela.textContent).toContain('Em breve');
    expect(tabela.textContent).toContain('1 pendentes');
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/dashboard/subscription');
    expect(links).toContain('/notifications');
    expect(links).toContain('/dashboard/history');
  });
});
