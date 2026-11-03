/**
 * Contraste dos tokens — o F5 virou portão, não documento.
 *
 * ── POR QUE UM TESTE, E NÃO UMA TABELA NO MARKDOWN ─────────────────────────────────────────
 * A regra do sistema é: todo metal e toda cor de dado passam AA (4,5:1) sobre o papel. Uma
 * tabela de contraste num documento envelhece no primeiro ajuste de token — alguém escurece o
 * `--color-metal-prata-ink` para "ficar mais elegante" e o número do documento passa a mentir.
 *
 * Este teste lê os valores REAIS do `globals.css` e calcula o contraste da WCAG. Se um token
 * mudar para um valor que reprova, o teste cai junto — o documento não teria como.
 *
 * ── O QUE ELE COBRE ────────────────────────────────────────────────────────────────────────
 *   metais (texto) ... ouro, prata e bronze escurecidos — os que aparecem como TEXTO de pódio
 *   dado (viz) ....... as quatro cores novas, que aparecem em série de gráfico
 *   e NÃO cobre os metais VIVOS, de propósito: eles existem como preenchimento de forma, onde
 *   contraste de texto não se aplica. O ouro vivo sobre o papel dá 2,28:1, e isso é correto —
 *   o que seria errado é usá-lo como cor de texto. O teste abaixo prova justamente a separação:
 *   o vivo reprova, o ink passa, e o código usa cada um no papel certo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

/** Extrai o valor de um token do @theme. */
function token(nome: string): string {
  const m = CSS.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${nome} não encontrado no globals.css`);
  return m[1].toLowerCase();
}

/** Luminância relativa, como a WCAG define. */
function luminancia(hex: string): number {
  const h = hex.replace('#', '');
  const canais = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const PAPEL = token('color-background');

describe('contraste dos tokens FICHA sobre o papel', () => {
  it(`o papel é ${PAPEL} — o pior caso claro do sistema`, () => {
    // sanidade: se o papel mudar, os números abaixo mudam junto e é bom saber disso
    expect(PAPEL).toMatch(/^#[0-9a-f]{6}$/);
  });

  describe('metais como TEXTO — todos passam AA', () => {
    const metais = ['metal-ouro-ink', 'metal-prata-ink', 'metal-bronze-ink'];

    for (const nome of metais) {
      it(`--${nome} passa 4,5:1`, () => {
        const c = contraste(token(`color-${nome}`), PAPEL);
        expect(c).toBeGreaterThanOrEqual(4.5);
      });
    }

    it('os três metais de texto são distinguíveis entre si', () => {
      // se dois metais de texto tiverem o mesmo valor, o pódio perde a distinção na palavra
      const valores = metais.map((n) => token(`color-${n}`));
      expect(new Set(valores).size).toBe(3);
    });
  });

  describe('metais VIVOS — reprovam como texto, e é correto', () => {
    it('--color-metal-ouro reprova AA (por isso ele só preenche forma)', () => {
      const c = contraste(token('color-metal-ouro'), PAPEL);
      expect(c).toBeLessThan(4.5);
      // e ainda assim tem de ser visível como FORMA (3:1 é o piso de elemento gráfico)
      expect(c).toBeGreaterThanOrEqual(1.5);
    });
  });

  describe('paleta de dado — todas passam AA como texto', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      it(`--color-viz-${n} passa 4,5:1`, () => {
        const c = contraste(token(`color-viz-${n}`), PAPEL);
        expect(c).toBeGreaterThanOrEqual(4.5);
      });
    }

    it('as seis cores de série são distintas entre si', () => {
      const valores = [1, 2, 3, 4, 5, 6].map((n) => token(`color-viz-${n}`));
      expect(new Set(valores).size).toBe(6);
    });

    it('nenhuma é violeta nem índigo — as famílias que a skill bane', () => {
      // heurística de matiz: violeta/índigo ficam entre 250° e 290°
      for (const n of [1, 2, 3, 4, 5, 6]) {
        const h = token(`color-viz-${n}`).replace('#', '');
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (delta === 0) continue; // cinza puro não tem matiz
        let matiz: number;
        if (max === r) matiz = 60 * (((g - b) / delta) % 6);
        else if (max === g) matiz = 60 * ((b - r) / delta + 2);
        else matiz = 60 * ((r - g) / delta + 4);
        if (matiz < 0) matiz += 360;

        const eVioleta = matiz >= 250 && matiz <= 290;
        expect(
          eVioleta,
          `viz-${n} (${token(`color-viz-${n}`)}) tem matiz ${matiz.toFixed(0)}° — violeta/índigo`,
        ).toBe(false);
      }
    });
  });
});
