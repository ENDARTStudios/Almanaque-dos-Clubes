// @vitest-environment jsdom
/**
 * T579b (ITEM 19) — bandeira do país, agora ASSET PRÓPRIO (SVG do Commons).
 *
 * O que estes testes protegem é a REGRA, não a aparência:
 *
 *  (a) a bandeira é um arquivo SERVIDO DO NOSSO DOMÍNIO (`/flags/<iso2>.svg|.png`), listado no
 *      manifesto gerado da tabela `countries` — sem emoji (que no Windows degrada para as duas
 *      letras regionais) e sem CDN de terceiro;
 *  (b) nome do país em TEXTO no idioma do usuário, resolvido por ICU;
 *  (c) a bandeira sozinha não é rótulo: no modo link o `aria-label` diz o país por extenso,
 *      e o alvo tem ≥ 24 px (WCAG 2.2 · 2.5.8);
 *  (d) código SEM arquivo (dado sujo `BR1`, `ZZ`, país rejeitado na aquisição) cai para a
 *      SIGLA EM TEXTO — nunca bandeira errada;
 *  (e) sem destino real (`basePath`) não há link.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { ALTURA_BANDEIRA, CountryFlag } from '@/components/CountryFlag';
import { FLAG_ASSETS } from '@/lib/flag-assets.generated';
import { countryHref, countryLabel, countryName, toIso2 } from '@/lib/country-flag';

afterEach(cleanup);

describe('manifesto de bandeiras — o dado, não a adivinhação', () => {
  it('as siglas do manifesto são ISO2 em maiúsculas e apontam para /flags/<iso2 minusculo>', () => {
    const entradas = Object.entries(FLAG_ASSETS);
    expect(entradas.length).toBeGreaterThan(150);
    for (const [iso2, asset] of entradas) {
      expect(iso2).toMatch(/^[A-Z]{2}$/);
      expect(asset.src).toBe(
        `/flags/${iso2.toLowerCase()}${asset.src.endsWith('.png') ? '.png' : '.svg'}`,
      );
      expect(asset.ratio).toBeGreaterThan(0);
    }
  });

  it('não existe mais caminho EMOJI: a lib não exporta derivação de bandeira', async () => {
    // O emoji foi rejeitado pelo dono (no Windows vira as duas letras regionais). Se alguém
    // reintroduzir `flagEmoji`/`isRegionCode`, este teste cai — a decisão volta a ser discutida.
    const lib = (await import('@/lib/country-flag')) as Record<string, unknown>;
    expect(lib.flagEmoji).toBeUndefined();
    expect(lib.isRegionCode).toBeUndefined();
  });
});

describe('lib/country-flag — nome do país (o texto que sobra quando não há arquivo)', () => {
  it('normaliza a sigla (caixa e espaços) e recusa o que não é par de letras', () => {
    expect(toIso2('it')).toBe('IT');
    expect(toIso2(' BR ')).toBe('BR');
    expect(toIso2('BR1')).toBeNull();
    expect(toIso2('B')).toBeNull();
    expect(toIso2('Brasil')).toBeNull();
    expect(toIso2(null)).toBeNull();
    expect(toIso2(undefined)).toBeNull();
  });

  it('resolve o nome do país no idioma do usuário (ICU), nos três idiomas do site', () => {
    expect(countryName('IT', 'pt-br')).toBe('Itália');
    expect(countryName('IT', 'en-us')).toBe('Italy');
    expect(countryName('IT', 'es-es')).toBe('Italia');
  });

  it('(d) código que não é região não gera nome inventado', () => {
    // `ZZ` é o pseudo-país ISO de "desconhecido": o ICU devolve "Região desconhecida" —
    // repetir o placeholder seria pior que mostrar a sigla.
    expect(countryName('ZZ', 'pt-br')).toBeNull();
    expect(countryLabel('ZZ', 'pt-br')).toBe('ZZ');
  });

  it('(d) países RETIRADOS da ISO não recebem o nome do Estado sucessor do CLDR', () => {
    // Medido no acervo: 223 códigos distintos, dos quais estes três não existem mais.
    // O CLDR diria "Alemanha" (DD), "Sérvia" (YU) e "Curaçao" (AN) — num acervo histórico
    // isso é dado errado, então o rótulo é a própria sigla. A BANDEIRA desses três existe:
    // os itens históricos do Wikidata (Q16957, Q36704, Q25227) declaram P41.
    for (const code of ['DD', 'YU', 'AN']) {
      expect(countryName(code, 'pt-br')).toBeNull();
      expect(countryLabel(code, 'pt-br')).toBe(code);
      expect(FLAG_ASSETS[code]).toBeDefined();
    }
  });

  it('o destino é o filtro que as listagens já aceitam (?country=XX)', () => {
    expect(countryHref('/clubs', 'it')).toBe('/clubs?country=IT');
    expect(countryHref('/competitions', 'IT')).toBe('/competitions?country=IT');
    expect(countryHref('/clubs', 'Brasil')).toBeNull();
  });
});

describe('CountryFlag — componente', () => {
  it('(a) desenha o asset local do país, com proporção real e sem CDN de terceiro', () => {
    render(<CountryFlag code="IT" locale="pt-br" />);
    const img = screen.getByTestId('country-flag-img');
    expect(img.getAttribute('src')).toBe(FLAG_ASSETS.IT.src);
    expect(img.getAttribute('src')).toMatch(/^\/flags\//);
    expect(img.getAttribute('src')).not.toMatch(/^https?:/);
    expect(Number(img.getAttribute('height'))).toBe(ALTURA_BANDEIRA);
    expect(Number(img.getAttribute('width'))).toBe(
      Math.round(ALTURA_BANDEIRA * FLAG_ASSETS.IT.ratio),
    );
  });

  it('a imagem é DECORAÇÃO: `alt` vazio e `aria-hidden` (quem informa o país é o texto)', () => {
    render(<CountryFlag code="GB" locale="pt-br" />);
    const img = screen.getByTestId('country-flag-img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('country-flag').textContent).toBe('Reino Unido');
  });

  it('(c) no modo link, o nome acessível diz o PAÍS POR EXTENSO, não só a sigla', () => {
    render(<CountryFlag code="IT" locale="pt-br" basePath="/clubs" destination="clubs" />);
    const link = screen.getByTestId('country-flag-link');
    expect(link.getAttribute('href')).toBe('/clubs?country=IT');
    expect(link.getAttribute('aria-label')).toBe('Ver clubes: Itália');
    // Alvo de toque ≥ 24 px (WCAG 2.2 · 2.5.8): min-h-6 = min-width/height 1.5rem.
    expect(link.className).toContain('min-h-6');
    expect(link.className).toContain('min-w-6');
    expect(link.querySelector('img')?.getAttribute('src')).toBe(FLAG_ASSETS.IT.src);
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

  it('uso decorativo: `showName={false}` desenha só a bandeira (o texto do país fica no cartão)', () => {
    render(<CountryFlag code="BR" locale="pt-br" showName={false} />);
    const bandeira = screen.getByTestId('country-flag');
    expect(bandeira.textContent).toBe('');
    expect(bandeira.querySelector('img')).not.toBeNull();
  });

  it('(d) país SEM arquivo no manifesto: SIGLA em texto, nunca bandeira errada', () => {
    // `BR1` é dado sujo (não é ISO2) e não existe no manifesto.
    render(<CountryFlag code="BR1" locale="pt-br" />);
    const bandeira = screen.getByTestId('country-flag');
    expect(bandeira.textContent).toBe('BR1');
    expect(bandeira.querySelector('img')).toBeNull();

    cleanup();
    render(<CountryFlag code={null} locale="pt-br" />);
    expect(screen.queryByTestId('country-flag')).toBeNull();
  });

  it('(d) país VÁLIDO mas ausente do manifesto também cai para o nome/sigla em texto', () => {
    // Cenário real de falha de aquisição (licença rejeitada, QID sem P41, download quebrado):
    // o componente não pode renderizar um `<img>` apontando para arquivo que não existe.
    const iso = Object.keys(FLAG_ASSETS).length;
    expect(iso).toBeGreaterThan(0);
    render(<CountryFlag code="QQ" locale="pt-br" />);
    const bandeira = screen.getByTestId('country-flag');
    expect(bandeira.querySelector('img')).toBeNull();
    expect(bandeira.textContent).toBe('QQ');
  });

  it('pediu link mas não informou o destino: não inventa rota, renderiza texto', () => {
    // `basePath` sozinho não basta: sem `destination` não existe rótulo de destino — e um
    // link sem nome acessível (ou apontando para uma rota inventada) é justamente o defeito.
    render(<CountryFlag code="IT" locale="pt-br" basePath="/clubs" />);
    expect(screen.queryByTestId('country-flag-link')).toBeNull();
    expect(screen.getByTestId('country-flag').textContent).toBe('Itália');
  });
});
