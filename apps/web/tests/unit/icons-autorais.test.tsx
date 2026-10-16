// @vitest-environment jsdom
/**
 * T576 — sistema de ícones autorais: o que estes testes protegem.
 *
 * O trabalho é definido por uma regra jurídica: a arte é ORIGINAL. Rastrear, vetorizar,
 * copiar ou "reinterpretar" foto/escudo/troféu de terceiro seria obra derivada
 * (Lei 9.610/98, art. 29). Então o teste precisa provar três coisas que não se enxergam
 * a olho nu:
 *
 *  (a) VETORIAL DE VERDADE. Nenhum ícone pode esconder raster — `<image>`, `data:` URI,
 *      base64 ou `<foreignObject>`. É o disfarce mais fácil de passar como "SVG".
 *  (b) UMA SÓ FONTE. Os SVGs de `public/icons/` são gerados de `icons.json`; o teste
 *      conta as formas em cada arquivo e compara com a geometria — se alguém editar um
 *      arquivo à mão, o CI cai (não existe segunda cópia para divergir em silêncio).
 *  (c) SEM COR CRUA. O conjunto herda `currentColor`; nenhum hexadecimal na geometria,
 *      porque cor fixa reprova em um dos dois temas do design system.
 *
 * E também o contrato do componente: decorativo por padrão (`aria-hidden`), informativo
 * quando recebe `title`, e a posição desconhecida devolve NADA (o vazio é declarado, não
 * "chutado" como se fosse uma posição).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ClubCrestGeneric,
  ClubCrestGenericDark,
  Icon,
  ICON_META,
  ICON_NAMES,
  PLAYER_POSITION_ICON,
  PlayerDefender,
  PlayerForward,
  PlayerGoalkeeper,
  PlayerMidfielder,
  PlayerPositionIcon,
  TrophyBelt,
  TrophyCup,
  TrophyMedal,
  TrophyPlate,
  TrophyShield,
  type IconName,
  type IconProps,
} from '@/components/icons';

/**
 * O `vitest` roda com o cwd na raiz do pacote (`apps/web`) — o mesmo cwd de
 * `pnpm --filter web icons:export` e do script de `test`. `import.meta.url` NÃO serve
 * aqui: sob o transform do vitest ela deixa de ser uma URL `file:` (medido no CI:
 * `TypeError: The URL must be of scheme file`). O `existsSync` abaixo transforma um cwd
 * errado em falha com mensagem clara, e não em caminho inexplicável.
 */
const WEB_ROOT = process.cwd();
const SOURCE = resolve(WEB_ROOT, 'src/components/icons/icons.json');
const PUBLIC_DIR = resolve(WEB_ROOT, 'public/icons');
const publicSvg = (name: string) => resolve(PUBLIC_DIR, `${name}.svg`);

const GEOMETRY = JSON.parse(readFileSync(SOURCE, 'utf8')) as {
  notice: string;
  icons: Record<string, { viewBox: string; strokeWidth: number; shapes: unknown[] }>;
};

/** Nomes esperados pelo pedido — troféus/mérito, atleta por posição, escudo genérico. */
const EXPECTED_NAMES = [
  'trophy-cup',
  'trophy-plate',
  'trophy-medal',
  'trophy-shield',
  'trophy-belt',
  'player-goalkeeper',
  'player-defender',
  'player-midfielder',
  'player-forward',
  'club-crest-generic',
  'club-crest-generic-dark',
];

/** Componente nomeado → nome do ícone (a API pública do módulo). */
const NAMED: Array<[string, ComponentType<IconProps>, IconName]> = [
  ['TrophyCup', TrophyCup, 'trophy-cup'],
  ['TrophyPlate', TrophyPlate, 'trophy-plate'],
  ['TrophyMedal', TrophyMedal, 'trophy-medal'],
  ['TrophyShield', TrophyShield, 'trophy-shield'],
  ['TrophyBelt', TrophyBelt, 'trophy-belt'],
  ['PlayerGoalkeeper', PlayerGoalkeeper, 'player-goalkeeper'],
  ['PlayerDefender', PlayerDefender, 'player-defender'],
  ['PlayerMidfielder', PlayerMidfielder, 'player-midfielder'],
  ['PlayerForward', PlayerForward, 'player-forward'],
  ['ClubCrestGeneric', ClubCrestGeneric, 'club-crest-generic'],
  ['ClubCrestGenericDark', ClubCrestGenericDark, 'club-crest-generic-dark'],
];

const RASTER_MARKERS = [
  '<image',
  'base64',
  'data:',
  '<foreignObject',
  'xlink:href',
  'http://',
  'https://',
];

/**
 * Nos ARQUIVOS de `public/icons/` o `xmlns` é legítimo (`http://www.w3.org/2000/svg`),
 * então o que se procura ali é qualquer REFERÊNCIA (`href`) ou raster embutido — um SVG
 * "vetorial" que busca a imagem de fora não é arte nossa.
 */
const FILE_RASTER_MARKERS = ['<image', 'base64', 'data:', '<foreignObject', 'href=', 'https://'];

afterEach(cleanup);

describe('geometria (icons.json)', () => {
  it('encontra a geometria a partir do cwd do pacote', () => {
    expect(existsSync(SOURCE), `geometria ausente em ${SOURCE}`).toBe(true);
    expect(existsSync(PUBLIC_DIR), `pasta de SVGs ausente em ${PUBLIC_DIR}`).toBe(true);
  });

  it('tem exatamente os ícones pedidos, sem sobra', () => {
    expect(Object.keys(GEOMETRY.icons).sort()).toEqual([...EXPECTED_NAMES].sort());
    expect([...ICON_NAMES].sort()).toEqual([...EXPECTED_NAMES].sort());
  });

  it('declara a autoria original no próprio arquivo de geometria', () => {
    expect(GEOMETRY.notice).toMatch(/ARTE ORIGINAL/);
    expect(GEOMETRY.notice).toMatch(/END ART Studios/);
  });

  it('usa a grade 24×24, o mesmo traço e ao menos uma forma por ícone', () => {
    for (const [name, icon] of Object.entries(GEOMETRY.icons)) {
      expect(icon.viewBox, name).toBe('0 0 24 24');
      expect(icon.strokeWidth, name).toBe(1.75);
      expect(icon.shapes.length, name).toBeGreaterThan(0);
    }
  });

  it('não tem cor crua (hexadecimal) nem raster embutido na geometria', () => {
    const raw = readFileSync(SOURCE, 'utf8');
    expect(raw).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const marker of RASTER_MARKERS) expect(raw.includes(marker), marker).toBe(false);
  });

  it('explica o uso de cada ícone (label e purpose) — a fonte da doc', () => {
    for (const name of ICON_NAMES) {
      expect(ICON_META[name].label.length, name).toBeGreaterThan(0);
      expect(ICON_META[name].purpose.length, name).toBeGreaterThan(0);
    }
  });

  it('não tem dois ícones com o mesmo desenho (cópia disfarçada)', () => {
    const seen = new Map<string, string>();
    for (const [name, icon] of Object.entries(GEOMETRY.icons)) {
      const key = JSON.stringify(icon.shapes);
      expect(seen.has(key), `${name} repete ${seen.get(key) ?? ''}`).toBe(false);
      seen.set(key, name);
    }
  });
});

describe('componente', () => {
  it('renderiza cada nome com viewBox, currentColor e a contagem de formas da geometria', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector(`svg[data-icon="${name}"]`);
      expect(svg, name).not.toBeNull();
      expect(svg?.getAttribute('viewBox'), name).toBe(GEOMETRY.icons[name].viewBox);
      expect(svg?.getAttribute('stroke'), name).toBe('currentColor');
      expect(svg?.getAttribute('fill'), name).toBe('none');
      const shapes = container.querySelectorAll('path, circle, rect, ellipse');
      expect(shapes.length, name).toBe(GEOMETRY.icons[name].shapes.length);
      unmount();
    }
  });

  it('cada componente nomeado renderiza o ícone de que o nome fala', () => {
    for (const [componentName, Component, iconName] of NAMED) {
      const { container, unmount } = render(<Component />);
      expect(container.querySelector(`svg[data-icon="${iconName}"]`), componentName).not.toBeNull();
      unmount();
    }
  });

  it('nenhum ícone esconde raster (image/data:/base64/foreignObject)', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />);
      const html = container.innerHTML;
      for (const marker of RASTER_MARKERS)
        expect(html.includes(marker), `${name}: ${marker}`).toBe(false);
      unmount();
    }
  });

  it('é decorativo por padrão (aria-hidden) e informativo quando recebe title', () => {
    const { container, unmount } = render(<TrophyCup />);
    const decorative = container.querySelector('svg');
    expect(decorative?.getAttribute('aria-hidden')).toBe('true');
    expect(decorative?.getAttribute('role')).toBeNull();
    unmount();

    const { container: c2, unmount: u2 } = render(<TrophyCup title="Taça de campeão" />);
    const informative = c2.querySelector('svg');
    expect(informative?.getAttribute('role')).toBe('img');
    expect(informative?.getAttribute('aria-label')).toBe('Taça de campeão');
    expect(informative?.querySelector('title')?.textContent).toBe('Taça de campeão');
    u2();
  });

  it('respeita o tamanho (grade 16/24/32 e número livre)', () => {
    const { container, unmount } = render(
      <>
        <TrophyMedal size={16} />
        <TrophyMedal />
        <TrophyMedal size={32} />
      </>,
    );
    expect([...container.querySelectorAll('svg')].map((s) => s.getAttribute('width'))).toEqual([
      '16',
      '24',
      '32',
    ]);
    unmount();
  });
});

describe('placeholder de atleta por posição', () => {
  it('mapeia as quatro posições do domínio', () => {
    expect(PLAYER_POSITION_ICON).toEqual({
      GOALKEEPER: 'player-goalkeeper',
      DEFENDER: 'player-defender',
      MIDFIELDER: 'player-midfielder',
      FORWARD: 'player-forward',
    });
  });

  it('escolhe o ícone da posição, tolerando caixa e espaço', () => {
    for (const [position, iconName] of Object.entries(PLAYER_POSITION_ICON)) {
      const { container, unmount } = render(
        <PlayerPositionIcon position={` ${position.toLowerCase()} `} />,
      );
      expect(container.querySelector(`svg[data-icon="${iconName}"]`), position).not.toBeNull();
      unmount();
    }
  });

  it('posição desconhecida ou ausente não inventa posição (nada é renderizado)', () => {
    for (const position of [undefined, null, '', '   ', 'LIBERO']) {
      const { container, unmount } = render(<PlayerPositionIcon position={position} />);
      expect(container.firstChild, String(position)).toBeNull();
      unmount();
    }
  });
});

describe('SVGs publicados em public/icons/', () => {
  it('existem para todos os nomes', () => {
    for (const name of ICON_NAMES) {
      expect(existsSync(publicSvg(name)), name).toBe(true);
    }
  });

  it('são gerados da mesma geometria (sem cópia divergente) e sem raster', () => {
    for (const name of ICON_NAMES) {
      const file = readFileSync(publicSvg(name), 'utf8');
      const shapes = file.match(/<(path|circle|rect|ellipse)\b/g) ?? [];
      expect(shapes.length, name).toBe(GEOMETRY.icons[name].shapes.length);
      expect(file, name).toContain(`viewBox="${GEOMETRY.icons[name].viewBox}"`);
      expect(file, name).toContain('stroke="currentColor"');
      expect(file, name).toContain('export-icons.mjs');
      expect(file, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      for (const marker of FILE_RASTER_MARKERS) {
        expect(file.includes(marker), `${name}: ${marker}`).toBe(false);
      }
    }
  });
});
