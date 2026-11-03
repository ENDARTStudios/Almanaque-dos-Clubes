// @vitest-environment jsdom
/**
 * Pódio da competição — os três casos que o acervo produz.
 *
 * ── POR QUE ESTE TESTE EXISTE ───────────────────────────────────────────────────────────────
 * O pódio não tinha cobertura nenhuma, e por isso carregou um bug silencioso: o bronze estava
 * pintado com `text-secondary`, que é OURO. O 3º lugar tinha a cor do 1º, e nenhum teste e nenhum
 * portão avisou — `ui:audit:ci` checa contraste e movimento, não semântica de metal.
 *
 * Para poder testar, o bloco saiu de dentro do Server Component de 1.307 linhas e virou
 * `components/ficha/CompetitionPodium.tsx`. Um bloco que não renderiza sozinho não se verifica
 * sozinho.
 *
 * ── O QUE ELE PROVA ─────────────────────────────────────────────────────────────────────────
 *   1. campeão presente → `competition-podium`, com nome e ano da última edição;
 *   2. vice e 3º aparecem quando o acervo os tem;
 *   3. 3º ausente (copa sem disputa de 3º) → o slot NÃO renderiza. Lacuna honesta: um pódio de
 *      dois lugares é a verdade do acervo; inventar o terceiro seria mentira com cara de dado;
 *   4. sem campeão → `podium-empty`, e nenhum slot solto;
 *   5. A FORMA distingue a colocação, não só a cor: ouro tem anel externo (2 círculos), prata é
 *      vazada (`fill="none"`), bronze é disco cheio e menor. Se alguém trocar os metais por cor
 *      chapada, este teste cai.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import CompetitionPodium from '@/components/ficha/CompetitionPodium';

afterEach(cleanup);

const LABELS = {
  champion: 'Campeão',
  runnerUp: 'Vice-campeão',
  third: '3º lugar',
  empty: 'Nenhuma edição com campeão catalogado ainda.',
  lastEdition: (year: number) => `Última edição: ${year}`,
  medalSilverNote: 'Ilustração de medalha de prata.',
  medalBronzeNote: 'Ilustração de medalha de bronze.',
};

function podium(over: Partial<Parameters<typeof CompetitionPodium>[0]['podium']> = {}) {
  return {
    champion: { clubId: 'c1', clubName: 'Flamengo' },
    runnerUp: { clubId: 'c2', clubName: 'Palmeiras' },
    third: { clubId: 'c3', clubName: 'São Paulo' },
    ...over,
  };
}

describe('CompetitionPodium', () => {
  it('renderiza o campeão com nome e ano da última edição', () => {
    render(<CompetitionPodium podium={podium()} labels={LABELS} lastEditionYear={2025} />);

    expect(screen.getByTestId('competition-podium')).toBeTruthy();
    expect(screen.getByText('Flamengo')).toBeTruthy();
    expect(screen.getByText('Última edição: 2025')).toBeTruthy();
    expect(screen.getByText('Campeão')).toBeTruthy();
  });

  it('renderiza vice e terceiro quando o acervo os tem', () => {
    render(<CompetitionPodium podium={podium()} labels={LABELS} />);

    expect(screen.getByTestId('podium-runner-up')).toBeTruthy();
    expect(screen.getByTestId('podium-third')).toBeTruthy();
    expect(screen.getByText('Palmeiras')).toBeTruthy();
    expect(screen.getByText('São Paulo')).toBeTruthy();
  });

  it('copa sem terceiro lugar não renderiza o slot — lacuna honesta', () => {
    render(<CompetitionPodium podium={podium({ third: null })} labels={LABELS} />);

    expect(screen.getByTestId('podium-runner-up')).toBeTruthy();
    expect(screen.queryByTestId('podium-third')).toBeNull();
  });

  it('sem campeão catalogado mostra o vazio e nenhum slot solto', () => {
    render(
      <CompetitionPodium
        podium={{ champion: null, runnerUp: null, third: null }}
        labels={LABELS}
      />,
    );

    expect(screen.getByTestId('podium-empty')).toBeTruthy();
    expect(screen.queryByTestId('competition-podium')).toBeNull();
    expect(screen.queryByTestId('podium-runner-up')).toBeNull();
    expect(screen.queryByTestId('podium-third')).toBeNull();
  });

  it('a FORMA distingue a colocação: ouro tem anel, prata é vazada, bronze é disco menor', () => {
    render(<CompetitionPodium podium={podium()} labels={LABELS} />);

    const circulos = (testid: string) => screen.getByTestId(testid).querySelectorAll('circle');

    // o ouro tem o anel externo + o disco: 2 círculos. É o que o distingue sem cor.
    // O escopo é o PRIMEIRO svg do pódio (o do campeão): `competition-podium` é o wrapper e
    // contém também os dois slots, então contar círculos nele soma os três medalhões.
    const svgOuro = screen.getByTestId('competition-podium').querySelector('svg');
    expect(svgOuro).toBeTruthy();
    expect(svgOuro!.querySelectorAll('circle').length).toBe(2);

    // a prata é VAZADA: o disco não tem preenchimento
    const prata = circulos('podium-runner-up');
    expect(prata.length).toBe(1);
    expect(prata[0].getAttribute('fill')).toBe('none');

    // o bronze é disco cheio (preenchimento ≠ none)
    const bronze = circulos('podium-third');
    expect(bronze.length).toBe(1);
    expect(bronze[0].getAttribute('fill')).not.toBe('none');
  });
});
