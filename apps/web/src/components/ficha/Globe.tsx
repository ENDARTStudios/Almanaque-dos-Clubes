/**
 * GLOBO — a ilustração de abertura, com projeção de verdade.
 *
 * ── O QUE ESTAVA ERRADO NO DESENHO DO CONCEITO ──────────────────────────────────────────────
 * O SVG gerado (`globo-animado.svg`) foi renderizado em Chromium e olhado. Três defeitos reais:
 *
 *   1. MERIDIANOS E PARALELOS VAZAVAM DA ESFERA. Sem `clipPath`, as elipses atravessavam o
 *      contorno do círculo e apareciam como arcos soltos do lado de fora.
 *   2. OS PENTÁGONOS LATERAIS SAÍAM DA SILHUETA. Eram polígonos de 5 pontos calculados em 2D,
 *      posicionados perto da borda — e a borda não é reta.
 *   3. OS PENTÁGONOS ERAM PLANOS. Num globo, um gomo perto da borda é quase de perfil; desenhá-lo
 *      como pentágono regular faz dele um adesivo colado na bola, não um pedaço dela.
 *
 * ── COMO AQUI É RESOLVIDO ───────────────────────────────────────────────────────────────────
 *   · projeção ortográfica real: (lat, lon) → (cx + R·cosφ·senλ, cy − R·senφ);
 *   · `clipPath` circular aplicado a TODAS as linhas e gomos — nada desenha fora da esfera;
 *   · os gomos são pentágonos SOBRE A ESFERA: cada vértice é (lat, lon), projetado e culled se
 *     estiver no hemisfério de trás. O que sobra é um pentágono deformado pela perspectiva, que é
 *     o que um gomo de bola parece;
 *   · os pontos do "couro" só aparecem no hemisfério visível.
 *
 * ── MOVIMENTO ──────────────────────────────────────────────────────────────────────────────
 * A rotação é CSS puro, e para inteiramente sob `prefers-reduced-motion: reduce`. O globo não
 * carrega informação: se a pessoa prefere menos movimento, ela perde a animação e nada mais.
 *
 * ── ACESSIBILIDADE ─────────────────────────────────────────────────────────────────────────
 * `aria-hidden`: é ilustração. O texto ao lado diz o que há para dizer.
 */
export interface GlobeProps {
  size?: number;
  /** Opacidade do traço. O herói usa baixa: ilustração de fundo, não protagonista. */
  opacity?: number;
  className?: string;
}

type Ponto = [lat: number, lon: number];

const R = 100;
const CX = 110;
const CY = 110;

/** Projeção ortográfica. Devolve `null` no hemisfério de trás (z ≤ 0). */
function projetar([lat, lon]: Ponto, rotacao: number): [number, number] | null {
  const f = (lat * Math.PI) / 180;
  const l = ((lon + rotacao) * Math.PI) / 180;
  const z = Math.cos(f) * Math.cos(l); // profundidade: >0 = visível
  if (z <= 0.02) return null;
  return [CX + R * Math.cos(f) * Math.sin(l), CY - R * Math.sin(f)];
}

/**
 * Projeção para GOMO: vértice no hemisfério de trás não some, encosta na silhueta.
 *
 * A primeira versão descartava o pentágono inteiro se UM vértice ficasse atrás. O resultado,
 * visto no screenshot, era a bola sem gomos — e a bola sem gomo não é uma bola. Um gomo que vira
 * a esquina tem parte visível e parte escondida: o vértice escondido é atraído para o contorno,
 * que é o que o olho espera.
 */
function projetarNoGomo([lat, lon]: Ponto, rotacao: number): [number, number] {
  const p = projetar([lat, lon], rotacao);
  if (p) return p;
  const f = (lat * Math.PI) / 180;
  const l = ((lon + rotacao) * Math.PI) / 180;
  const x = CX + R * Math.cos(f) * Math.sin(l);
  const y = CY - R * Math.sin(f);
  const dx = x - CX;
  const dy = y - CY;
  const d = Math.hypot(dx, dy) || 1;
  // encosta no contorno, um fio para dentro
  return [CX + (dx / d) * R * 0.99, CY + (dy / d) * R * 0.99];
}

/**
 * Pentágono sobre a esfera, centrado em (lat0, lon0), com meia-abertura `raioGraus`.
 * Vértices medidos em ângulo, não em pixels — é isso que dá a curvatura.
 */
function pentagono(lat0: number, lon0: number, raioGraus: number): Ponto[] {
  return Array.from({ length: 5 }, (_, k) => {
    const ang = ((-90 + 72 * k) * Math.PI) / 180;
    const lat = lat0 + raioGraus * Math.sin(ang);
    // a abertura em longitude cresce perto dos polos (meridianos convergem)
    const escala = 1 / Math.max(0.35, Math.cos((lat0 * Math.PI) / 180));
    const lon = lon0 + raioGraus * Math.cos(ang) * escala;
    return [lat, lon] as Ponto;
  });
}

/** Pontos do couro: distribuição em espiral de Fibonacci, só o hemisfério visível. */
function pontosDoCouro(rotacao: number, total = 320): Array<[number, number]> {
  const saida: Array<[number, number]> = [];
  for (let i = 0; i < total; i++) {
    // amostragem uniforme na esfera
    const y = 1 - (i / (total - 1)) * 2;
    const raioNoParalelo = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = ((theta * 180) / Math.PI) % 360;
    const p = projetar([lat, lon], rotacao);
    if (p) saida.push(p);
  }
  return saida;
}

const GOMOS: Array<[number, number]> = [
  [0, 0],
  [42, -58],
  [44, 62],
  [-44, -52],
  [-46, 56],
];

const MERIDIANOS = [-60, -30, 0, 30, 60];
const PARALELOS = [-45, 0, 45];

export default function Globe({ size = 220, opacity = 0.5, className }: GlobeProps) {
  const rotacao = 18; // posição de repouso; animação parte daqui

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ opacity }}
    >
      <defs>
        <clipPath id="globo-esfera">
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* tudo o que é linha é recortado pela esfera */}
      <g clipPath="url(#globo-esfera)">
        {/* meridianos: elipses de semi-eixo R·|cos λ| em x e R em y */}
        {MERIDIANOS.map((lon) => (
          <ellipse
            key={`m${lon}`}
            cx={CX}
            cy={CY}
            rx={R * Math.abs(Math.cos(((lon + rotacao) * Math.PI) / 180))}
            ry={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.8}
            opacity={0.55}
          />
        ))}

        {/* paralelos: elipses cujo centro sobe com a latitude */}
        {PARALELOS.map((lat) => {
          const f = (lat * Math.PI) / 180;
          return (
            <ellipse
              key={`p${lat}`}
              cx={CX}
              cy={CY - R * Math.sin(f)}
              rx={R * Math.cos(f)}
              ry={R * Math.cos(f) * Math.sin(f)}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.8}
              opacity={0.55}
            />
          );
        })}

        {/* couro */}
        {pontosDoCouro(rotacao).map(([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r={0.9} fill="currentColor" opacity={0.28} />
        ))}

        {/* gomos: pentágonos SOBRE a esfera, projetados e culled */}
        {GOMOS.map(([lat, lon], i) => {
          const vs = pentagono(lat, lon, i === 0 ? 26 : 17).map((p) => projetarNoGomo(p, rotacao));
          return (
            <polygon
              key={`g${i}`}
              points={vs.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* o contorno por último e FORA do clip: é ele que define a silhueta */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}
