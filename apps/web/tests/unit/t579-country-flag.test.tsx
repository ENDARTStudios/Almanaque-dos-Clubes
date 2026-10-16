// @vitest-environment jsdom
/**
 * T579 (ITEM 19) — bandeira do país.
 *
 * O que estes testes protegem é a REGRA, não a aparência:
 *
 *  (a) a bandeira é derivada do ISO2 do acervo (sem CDN de terceiro, sem asset);
 *  (b) nome do país em TEXTO no idioma do usuário, resolvido por ICU;
 *  (c) a bandeira sozinha não é rótulo: no modo link o `aria-label` diz o país por extenso,
 *      e o alvo tem ≥ 24 px (WCAG 2.2 · 2.5.8);
 *  (d) código que NÃO é região não vira bandeira errada: cai para texto (medido: `ZZ`, `XX`,
 *      `DD`, `YU`, `AN`);
 *  (e) sem destino real (`basePath`) não há link.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CountryFlag } from '@/components/CountryFlag';
import {
  countryHref,
  countryLabel,
  countryName,
  flagEmoji,
  isRegionCode,
  toIso2,
} from '@/lib/country-flag';

afterEach(cleanup);

describe('lib/country-flag — derivação pura', () => {
  it('normaliza a sigla (caixa e espaços) e recusa o que não é par de letras', () => {
    expect(toIso2('it')).toBe('IT');
    expect(toIso2(' BR ')).toBe('BR');
    expect(toIso2('BR1')).toBeNull();
    expect(toIso2('B')).toBeNull();
    expect(toIso2('Brasil')).toBeNull();
    expect(toIso2(null)).toBeNull();
    expect(toIso2(undefined)).toBeNull();
  });

  it('deriva a bandeira da sigla pelos regional indicators', () => {
    expect(flagEmoji('IT')).toBe('🇮🇹');
    expect(flagEmoji('br')).toBe('🇧🇷');
    expect(flagEmoji('GB')).toBe('🇬🇧');
    expect(flagEmoji('BR1')).toBeNull();
  });

  it('resolve o nome do país no idioma do usuário (ICU), nos três idiomas do site', () => {
    expect(countryName('IT', 'pt-br')).toBe('Itália');
    expect(countryName('IT', 'en-us')).toBe('Italy');
    expect(countryName('IT', 'es-es')).toBe('Italia');
  });

  it('(d) código que não é região não gera bandeira nem nome inventado', () => {
    // `ZZ` é o pseudo-país ISO de "desconhecido": o ICU devolve "Região desconhecida" —
    // desenhar 🇿🇿 seria bandeira de lugar nenhum. A sigla em texto é o rótulo honesto.
    expect(isRegionCode('ZZ')).toBe(false);
    expect(isRegionCode('XX')).toBe(false);
    expect(countryName('ZZ', 'pt-br')).toBeNull();
    expect(countryLabel('ZZ', 'pt-br')).toBe('ZZ');
    expect(isRegionCode('BR1')).toBe(false);
  });

  it('(d) países RETIRADOS da ISO não recebem o nome do Estado sucessor do CLDR', () => {
    // Medido no acervo: 223 códigos distintos, dos quais estes três não existem mais.
    // O CLDR diria "Alemanha" (DD), "Sérvia" (YU) e "Curaçao" (AN) — num acervo histórico
    // isso é dado errado, e nenhum dos três pares tem glifo de bandeira.
    for (const code of ['DD', 'YU', 'AN']) {
      expect(isRegionCode(code)).toBe(false);
      expect(countryName(code, 'pt-br')).toBeNull();
      expect(countryLabel(code, 'pt-br')).toBe(code);
    }
  });

  it('o destino é o filtro que as listagens já aceitam (?country=XX)', () => {
    expect(countryHref('/clubs', 'it')).toBe('/clubs?country=IT');
    expect(countryHref('/competitions', 'IT')).toBe('/competitions?country=IT');
    expect(countryHref('/clubs', 'Brasil')).toBeNull();
  });
});

describe('CountryFlag — componente', () => {
  it('(c) no modo link, o nome acessível diz o PAÍS POR EXTENSO, não só a sigla', () => {
    render(<CountryFlag code="IT" locale="pt-br" basePath="/clubs" destination="clubs" />);
    const link = screen.getByTestId('country-flag-link');
    expect(link.getAttribute('href')).toBe('/clubs?country=IT');
    expect(link.getAttribute('aria-label')).toBe('Ver clubes: Itália');
    // Alvo de toque ≥ 24 px (WCAG 2.2 · 2.5.8): min-h-6 = min-width/height 1.5rem.
    expect(link.className).toContain('min-h-6');
    expect(link.className).toContain('min-w-6');
    // O emoji é decoração para o leitor de tela: quem informa o país é o aria-label.
    expect(link.querySelector('[aria-hidden="true"]')?.textContent).toBe('🇮🇹');
  });

  it('o rótulo do link muda com o destino e com o idioma', () => {
    render(<CountryFlag code="ES" locale="en-us" basePath="/players" destination="players" />);
    expect(screen.getByTestId('country-flag-link').getAttribute('aria-label')).toBe(
      'See players: Spain',
    );
    cleanup();
    render(
      <CountryFlag code="ES" locale="es-es" basePath="/competitions" destination="competitions" />,
    );
    expect(screen.getByTestId('country-flag-link').getAttribute('aria-label')).toBe(
      'Ver competiciones: España',
    );
  });

  it('(e) sem destino real não há link — e o nome do país aparece em texto', () => {
    render(<CountryFlag code="GB" locale="pt-br" />);
    expect(screen.queryByTestId('country-flag-link')).toBeNull();
    const bandeira = screen.getByTestId('country-flag');
    expect(bandeira.textContent).toBe('🇬🇧Reino Unido');
  });

  it('uso decorativo: `showName={false}` desenha só a bandeira (o texto do país fica no cartão)', () => {
    render(<CountryFlag code="BR" locale="pt-br" showName={false} />);
    const bandeira = screen.getByTestId('country-flag');
    expect(bandeira.textContent).toBe('🇧🇷');
    expect(bandeira.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('(d) código retirado da ISO / sem região: TEXTO, nunca bandeira errada', () => {
    render(<CountryFlag code="DD" locale="pt-br" />);
    const bandeira = screen.getByTestId('country-flag');
    expect(bandeira.textContent).toBe('DD');
    expect(bandeira.querySelector('[aria-hidden="true"]')).toBeNull();

    cleanup();
    render(<CountryFlag code="BR1" locale="pt-br" />);
    expect(screen.getByTestId('country-flag').textContent).toBe('BR1');

    cleanup();
    render(<CountryFlag code={null} locale="pt-br" />);
    expect(screen.queryByTestId('country-flag')).toBeNull();
  });

  it('pediu link mas não informou o destino: não inventa rota, renderiza texto', () => {
    // `basePath` sozinho não basta: sem `destination` não existe rótulo de destino — e um
    // link sem nome acessível (ou apontando para uma rota inventada) é justamente o defeito.
    render(<CountryFlag code="IT" locale="pt-br" basePath="/clubs" />);
    expect(screen.queryByTestId('country-flag-link')).toBeNull();
    expect(screen.getByTestId('country-flag').textContent).toBe('🇮🇹Itália');
  });
});
