// @vitest-environment jsdom
/**
 * Páginas legais no conceito FICHA — âncoras do documento.
 *
 * O shell monta "Nesta página" a partir do slug do título; se o slug divergir do id da seção,
 * o link não leva a lugar nenhum. Este teste trava slug e id juntos (acento, número e pontuação).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LegalSections from '@/components/legal/LegalSections';
import { slugDaSecao } from '@/lib/legal-slug';

afterEach(cleanup);

describe('LegalSections', () => {
  it('gera ids estáveis e âncoras que casam com o slug', () => {
    expect(slugDaSecao('1. Dados coletados')).toBe('dados-coletados');
    expect(slugDaSecao('12. Exercício de direitos, canais e histórico de versões')).toBe(
      'exercicio-de-direitos-canais-e-historico-de-versoes',
    );
    expect(slugDaSecao('LGPD, art. 18')).toBe('lgpd-art-18');
    render(
      <LegalSections sections={[{ title: '1. Dados coletados', body: ['Nome e e-mail.'] }]} />,
    );
    const secao = screen.getByRole('heading', { name: '1. Dados coletados' }).closest('section');
    expect(secao?.id).toBe('dados-coletados');
    expect(secao?.textContent).toContain('Nome e e-mail.');
  });
});
