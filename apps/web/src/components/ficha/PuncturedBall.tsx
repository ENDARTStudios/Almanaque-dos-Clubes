/**
 * A bola furada do 404.
 *
 * ── POR QUE UMA ILUSTRAÇÃO, E NÃO UM NÚMERO GRANDE ──────────────────────────────────────────
 * A página de erro 404 é o único lugar do produto onde o usuário chega sem ter pedido nada. Um
 * "404" gigante em cinza claro diz o código do protocolo, que ele não pediu e não entende. Uma
 * bola murcha diz a mesma coisa em uma imagem: algo que devia estar cheio está vazio, e é
 * reversível.
 *
 * ── POR QUE VETOR E NÃO IMAGEM ──────────────────────────────────────────────────────────────
 * A skill do Taste pede imagens reais para páginas de CONTEÚDO. Uma página de erro não tem
 * assunto — não existe foto de "endereço que não existe". Desenhar é a alternativa honesta a
 * um banco de imagens aleatório, e a ilustração herda os tokens: em `.theme-dark` ela inverte
 * sozinha porque usa `currentColor` e as variáveis de metal.
 *
 * ── ACESSIBILIDADE ──────────────────────────────────────────────────────────────────────────
 * É decorativa (`aria-hidden`): o texto ao lado já explica o erro. Uma imagem com `alt` aqui
 * repetiria a explicação e faria o leitor de tela dizer duas vezes a mesma coisa.
 */
export default function PuncturedBall({ size = 180 }: { size?: number }) {
  const c = size / 2;
  const r = size * 0.42;

  // pentágonos em perspectiva: um central e quatro ao redor
  const pentagono = (cx: number, cy: number, raio: number, rot = 0) =>
    Array.from({ length: 5 }, (_, k) => {
      const a = ((-90 + 72 * k + rot) * Math.PI) / 180;
      return `${(cx + raio * Math.cos(a)).toFixed(2)},${(cy + raio * Math.sin(a)).toFixed(2)}`;
    }).join(' ');

  const pentagonos = [
    { x: c, y: c, r: r * 0.42 },
    { x: c - r * 0.62, y: c - r * 0.48, r: r * 0.26 },
    { x: c + r * 0.62, y: c - r * 0.44, r: r * 0.26 },
    { x: c - r * 0.58, y: c + r * 0.5, r: r * 0.24 },
    { x: c + r * 0.6, y: c + r * 0.52, r: r * 0.24 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* esfera: dois meridianos e um paralelo, o mínimo que ainda lê como bola */}
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <ellipse
        cx={c}
        cy={c}
        rx={r * 0.44}
        ry={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
      />
      <ellipse
        cx={c}
        cy={c}
        rx={r}
        ry={r * 0.28}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
      />

      {/* gomos: crimson, que é o acento de registro */}
      {pentagonos.map((p, i) => (
        <polygon
          key={i}
          points={pentagono(p.x, p.y, p.r, i * 24)}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.8}
        />
      ))}

      {/* o rasgo: ziguezague no quadrante inferior direito, onde o ar escapa */}
      <path
        d={`M ${c + r * 0.5} ${c - r * 0.3} L ${c + r * 0.3} ${c - r * 0.02} L ${c + r * 0.54} ${c + r * 0.1} L ${c + r * 0.28} ${c + r * 0.42} L ${c + r * 0.46} ${c + r * 0.62}`}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      {/* ar escapando: três traços curtos saindo do rasgo */}
      {[
        [0.66, 0.02],
        [0.72, 0.14],
        [0.62, 0.24],
      ].map(([dx, dy], i) => (
        <line
          key={i}
          x1={c + r * dx}
          y1={c + r * dy}
          x2={c + r * (dx + 0.14)}
          y2={c + r * (dy + 0.08)}
          stroke="var(--color-ink-3)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
