import type { SVGProps } from 'react';
import raw from './icons.json';

/**
 * ÍCONES AUTORAIS do Almanaque dos Clubes — ARTE ORIGINAL do projeto.
 *
 * AUTORIA: END ART Studios. Nenhum desenho deste arquivo foi rastreado, vetorizado,
 * copiado ou "reinterpretado" de fotografia, escudo, troféu ou qualquer obra de
 * terceiro. São formas genéricas que evocam a CATEGORIA (copo, taça, medalha, placa,
 * escudo, objeto do ofício) — não a silhueta de um troféu/escudo real, que seria obra
 * derivada (Lei 9.610/98, art. 29) e marca registrada.
 *
 * POSIÇÃO = OBJETO, nunca figura humana. A rodada anterior usou uma figura genérica por
 * posição; o resultado foi um boneco palito, reprovado e removido. Agora cada posição é
 * representada por um OBJETO do ofício (luva de goleiro, caneleira, bola, chuteira) —
 * nada de pessoa, retrato ou caricatura (Código Civil, art. 20), nada de marca de
 * fabricante. Ver `docs/ICONES-AUTORAIS.md`.
 *
 * EXCEÇÃO DECLARADA: `player-ball` não reivindica forma. Bola de futebol em ícone é
 * geometria canônica (círculo + pentágono central + costuras), comum a FA, Material
 * Symbols e Tabler (MIT); o que é do projeto é o desenho — pentágono maior e rotacionado
 * (vértice para baixo) e costuras mais curtas. O cabeçalho do SVG publicado diz isso.
 *
 * GEOMETRIA: uma única fonte — `icons.json` (viewBox 24×24, traço `currentColor`,
 * `fill="none"`, 1,75 de espessura, pontas e junções arredondadas, mesma linguagem do
 * `lucide-react` já usado no app). Os SVGs avulsos de `public/icons/` são GERADOS da
 * mesma fonte por `scripts/export-icons.mjs`, então não há duas cópias do desenho para
 * divergir — e o teste `tests/unit/icons-autorais.test.tsx` prova isso no CI.
 */
type ShapeTag = 'path' | 'circle' | 'rect' | 'ellipse';

export interface IconShape {
  tag: ShapeTag;
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
  /** Só a variante de fundo escuro preenche; o resto do conjunto é traço puro. */
  fill?: string;
  fillOpacity?: number;
}

export interface IconMeta {
  label: string;
  purpose: string;
  viewBox: string;
  strokeWidth: number;
  shapes: IconShape[];
}

const ICON_DATA = raw as unknown as { icons: Record<string, IconMeta> };

/** Metadados de todos os ícones (a fonte da tabela de `docs/ICONES-AUTORAIS.md`). */
export const ICON_META: Record<IconName, IconMeta> = ICON_DATA.icons as Record<IconName, IconMeta>;

/** Grades do design system; qualquer número é aceito via `size`. */
export const ICON_SIZES = [16, 24, 32] as const;
export type IconSize = (typeof ICON_SIZES)[number];

export const ICON_NAMES = [
  'trophy-cup',
  'trophy-plate',
  'trophy-medal',
  'trophy-shield',
  'trophy-belt',
  'player-glove',
  'player-shin-guard',
  'player-ball',
  'player-boot',
  'club-crest-generic',
  'club-crest-generic-dark',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /** Lado do ícone em px. O conjunto é desenhado para 24; 16 e 32 são as grades. */
  size?: IconSize | number;
  /**
   * Quando presente, o ícone é INFORMATIVO: ganha `role="img"`, nome acessível e
   * `<title>`. Sem `title`, o ícone é decorativo (`aria-hidden`, o padrão) — o caso
   * do placeholder ao lado de um nome que já está na tela.
   */
  title?: string;
}

function ShapeNode({ shape }: { shape: IconShape }) {
  const common = { fill: shape.fill, fillOpacity: shape.fillOpacity };
  switch (shape.tag) {
    case 'path':
      return <path d={shape.d} {...common} />;
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
    case 'rect':
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          {...common}
        />
      );
    case 'ellipse':
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
  }
  return null;
}

function Svg({ name, size = 24, title, ...rest }: IconProps & { name: IconName }) {
  const def = ICON_META[name];
  const labelled = typeof title === 'string' && title.length > 0;
  return (
    <svg
      viewBox={def.viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={def.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      data-icon={name}
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      {def.shapes.map((shape, index) => (
        <ShapeNode key={index} shape={shape} />
      ))}
    </svg>
  );
}

/** Ícone por nome — use os componentes nomeados quando o nome for literal. */
export function Icon({ name, ...props }: IconProps & { name: IconName }) {
  return <Svg name={name} {...props} />;
}

// --- troféus / mérito -------------------------------------------------------
export const TrophyCup = (props: IconProps) => <Svg name="trophy-cup" {...props} />;
export const TrophyPlate = (props: IconProps) => <Svg name="trophy-plate" {...props} />;
export const TrophyMedal = (props: IconProps) => <Svg name="trophy-medal" {...props} />;
export const TrophyShield = (props: IconProps) => <Svg name="trophy-shield" {...props} />;
export const TrophyBelt = (props: IconProps) => <Svg name="trophy-belt" {...props} />;

// --- placeholder de atleta, por posição: OBJETO do ofício --------------------
export const PlayerGlove = (props: IconProps) => <Svg name="player-glove" {...props} />;
export const PlayerShinGuard = (props: IconProps) => <Svg name="player-shin-guard" {...props} />;
export const PlayerBall = (props: IconProps) => <Svg name="player-ball" {...props} />;
export const PlayerBoot = (props: IconProps) => <Svg name="player-boot" {...props} />;

// --- placeholder de clube / escudo -----------------------------------------
export const ClubCrestGeneric = (props: IconProps) => <Svg name="club-crest-generic" {...props} />;
export const ClubCrestGenericDark = (props: IconProps) => (
  <Svg name="club-crest-generic-dark" {...props} />
);

/** Posições do domínio (`packages/domain/src/player.ts`, enum `PlayerPosition`). */
export type PlayerPositionKey = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

/**
 * Posição → OBJETO do ofício. Nada de figura humana: a posição é lida pelo objeto
 * que a define (a luva do goleiro, a caneleira do zagueiro, a bola do meio-campo,
 * a chuteira do atacante).
 */
export const PLAYER_POSITION_ICON = {
  GOALKEEPER: 'player-glove',
  DEFENDER: 'player-shin-guard',
  MIDFIELDER: 'player-ball',
  FORWARD: 'player-boot',
} as const satisfies Record<PlayerPositionKey, IconName>;

/**
 * Ícone do placeholder de atleta a partir da posição crua da API
 * (`GOALKEEPER`…). Posição desconhecida/ausente devolve `null`: o vazio é
 * declarado, nunca "chutado" como se fosse uma posição — o chamador decide o que
 * mostrar (hoje: só a sigla).
 */
export function PlayerPositionIcon({
  position,
  ...props
}: IconProps & { position?: string | null }) {
  const key = position?.trim().toUpperCase();
  if (!key || !(key in PLAYER_POSITION_ICON)) return null;
  return <Svg name={PLAYER_POSITION_ICON[key as PlayerPositionKey]} {...props} />;
}
