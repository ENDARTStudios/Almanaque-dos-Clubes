/**
 * FICHA — metais: medalhão de pódio e taça.
 *
 * ── A DISTINÇÃO QUE QUASE TODO PÓDIO ERRA ───────────────────────────────────────────────────
 * A cor do OBJETO e a cor da PALAVRA não são a mesma.
 *
 *   · O medalhão é um objeto: pode ser ouro vivo (`--color-metal-ouro` #c9a227). Sobre o papel
 *     #faf8f5 ele dá 2,28:1 — REPROVA para texto, e é correto que reprove, porque preenchimento
 *     de forma não tem requisito de contraste de texto.
 *   · O TEXTO que nomeia o pódio usa o metal escurecido (`--color-metal-*-ink`), que passa AA:
 *     ouro 5,03:1 · prata 5,50:1 · bronze 5,54:1.
 *
 * ── A FORMA CARREGA A INFORMAÇÃO ────────────────────────────────────────────────────────────
 * A cor nunca é o único portador do lugar no pódio. O 1º tem disco cheio e anel externo, o 2º tem
 * disco vazado, o 3º tem disco menor. Impresso em preto e branco, o pódio continua legível.
 *
 * ── ACESSIBILIDADE ──────────────────────────────────────────────────────────────────────────
 * O SVG é decorativo (`aria-hidden`) porque o lugar no pódio já está no texto ao lado ("1º",
 * "Campeão"). Um `role="img"` com título repetiria o que o leitor de tela acabou de ler.
 */

export type Metal = 'ouro' | 'prata' | 'bronze';

const PREENCHIMENTO: Record<Metal, string> = {
  ouro: 'var(--color-metal-ouro)',
  prata: 'var(--color-metal-prata)',
  bronze: 'var(--color-metal-bronze)',
};

const TRACO: Record<Metal, string> = {
  ouro: 'var(--color-metal-ouro-ink)',
  prata: 'var(--color-metal-prata-ink)',
  bronze: 'var(--color-metal-bronze-ink)',
};

export interface MedalProps {
  metal: Metal;
  /** 1, 2 ou 3 — decide a forma (anel, vazado, menor), não só a cor. */
  place?: 1 | 2 | 3;
  /** Lado em pixels. O padrão é 40. */
  size?: number;
}

export function Medal({ metal, place = 1, size = 40 }: MedalProps) {
  const escala = place === 3 ? 0.88 : 1;
  const d = size * escala;
  const cx = size / 2;
  const raio = d * 0.3;
  const cy = size * 0.62;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* fita */}
      <path
        d={`M ${cx - d * 0.18} 0 L ${cx - d * 0.06} ${size * 0.42} M ${cx + d * 0.18} 0 L ${cx + d * 0.06} ${size * 0.42}`}
        stroke="var(--color-ink-3)"
        strokeWidth={Math.max(2, size / 14)}
        fill="none"
      />
      {/* anel externo só no 1º: a forma distingue sem depender da cor */}
      {place === 1 ? (
        <circle
          cx={cx}
          cy={cy}
          r={raio + 3}
          fill="none"
          stroke={PREENCHIMENTO[metal]}
          strokeWidth={1}
        />
      ) : null}
      <circle
        cx={cx}
        cy={cy}
        r={raio}
        fill={place === 2 ? 'none' : PREENCHIMENTO[metal]}
        stroke={TRACO[metal]}
        strokeWidth={Math.max(1.4, size / 18)}
      />
    </svg>
  );
}

export interface TrophyProps {
  /** Lado em pixels. O padrão é 40 — troféu é sempre ouro, muda o tamanho. */
  size?: number;
  /** `dark` para a faixa escura. */
  dark?: boolean;
}

export function Trophy({ size = 40, dark = false }: TrophyProps) {
  const w = size * 0.66;
  const cx = size / 2;
  const cor = dark ? 'var(--color-metal-ouro)' : 'var(--color-metal-ouro)';
  const peso = Math.max(1.6, size / 26);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* bojo */}
      <path
        d={`M ${cx - w / 2} ${size * 0.06} Q ${cx - w * 0.42} ${size * 0.52} ${cx} ${size * 0.52} Q ${cx + w * 0.42} ${size * 0.52} ${cx + w / 2} ${size * 0.06}`}
        fill="none"
        stroke={cor}
        strokeWidth={peso}
      />
      {/* alças */}
      <path
        d={`M ${cx - w / 2} ${size * 0.1} q ${-w * 0.2} ${size * 0.1} ${-w * 0.08} ${size * 0.28} M ${cx + w / 2} ${size * 0.1} q ${w * 0.2} ${size * 0.1} ${w * 0.08} ${size * 0.28}`}
        fill="none"
        stroke={cor}
        strokeWidth={peso * 0.85}
      />
      {/* haste e base */}
      <path
        d={`M ${cx} ${size * 0.52} L ${cx} ${size * 0.74} M ${cx - w * 0.28} ${size * 0.86} L ${cx + w * 0.28} ${size * 0.86}`}
        fill="none"
        stroke={cor}
        strokeWidth={peso * 1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mapa metal → classes de texto AA. Para o rótulo ao lado do medalhão. */
export const METAL_INK_CLASS: Record<Metal, string> = {
  ouro: 'text-[color:var(--color-metal-ouro-ink)]',
  prata: 'text-[color:var(--color-metal-prata-ink)]',
  bronze: 'text-[color:var(--color-metal-bronze-ink)]',
};
