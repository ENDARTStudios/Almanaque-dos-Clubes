// @vitest-environment jsdom
/**
 * i18n das LISTAGENS (`/players` e cartões de `/clubs`).
 *
 * O defeito medido em produção (auditoria de 16/10): em en-us/es-es a contagem do `/players`
 * e os estados vazios apareciam em português, e o status do clube era `'Ativo'` fixo ou o
 * valor cru do enum (`INACTIVE`, `DISSOLVED`). Estes testes travam o rótulo por locale.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const state = vi.hoisted(() => ({
  locale: 'en-us' as 'pt-br' | 'en-us' | 'es-es',
}));

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({ locale: state.locale, t: (k: string) => k }),
}));
vi.mock('@/hooks/useGsap', () => ({ useGsapStagger: () => {}, useGsapHover: () => {} }));

import ClubGrid from '@/components/ClubCard';
import { listingStrings } from '@/i18n/wsListings';

afterEach(cleanup);

const club = (status: string) => ({
  id: 'c1',
  name: 'Club',
  country: 'BR',
  status,
});

describe('listagens — nenhum texto de interface fica preso ao pt-br', () => {
  it('(a) status do clube é traduzido em en-us', () => {
    state.locale = 'en-us';
    render(<ClubGrid clubs={[club('ACTIVE')]} />);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.queryByText('Ativo')).toBeNull();
  });

  it('(b) os demais estados do enum também são traduzidos (não o valor cru)', () => {
    state.locale = 'en-us';
    render(<ClubGrid clubs={[club('INACTIVE')]} />);
    expect(screen.getByText('Inactive')).toBeTruthy();
    cleanup();
    render(<ClubGrid clubs={[club('DISSOLVED')]} />);
    expect(screen.getByText('Dissolved')).toBeTruthy();
    expect(screen.queryByText('DISSOLVED')).toBeNull();
  });

  it('(c) estado vazio dos clubes segue o idioma', () => {
    state.locale = 'es-es';
    render(<ClubGrid clubs={[]} />);
    expect(screen.getByText('Ningún club encontrado.')).toBeTruthy();
  });

  it('(d) strings do /players têm os três idiomas, sem literal pt nos outros', () => {
    expect(listingStrings['en-us'].players.total).toContain('{n}');
    expect(listingStrings['es-es'].players.total).toContain('{n}');
    for (const locale of ['en-us', 'es-es'] as const) {
      const s = listingStrings[locale];
      expect(s.players.total).not.toMatch(/Jogadores/);
      expect(s.players.listTitle).not.toMatch(/Jogadores/);
      expect(s.players.empty).not.toMatch(/Nenhum jogador/);
    }
  });
});
