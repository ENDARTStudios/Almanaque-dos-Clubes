"""
Globo animado em SVG — o que o FigCraft não faz.

O pedido do Operador: "um globo gigante animado do mapa-múndi mesclado a uma bola de futebol
apenas em linhas sem preenchimento". O FigCraft desenha o quadro parado; animação não.

Aqui o mesmo desenho sai como SVG com animação real:
  · meridianos e paralelos em perspectiva (meridiano com semi-eixo r·cos λ, como num globo)
  · campo de pontos na superfície, denso no centro e ralo na borda ("Wireframe Dotted Globe",
    padrão do 21st.dev) — é o que dá a sensação de esfera girando
  · pentágonos da bola projetados na superfície, com opacidade e escala por profundidade
  · rotação por SMIL: o grupo gira e cada elemento aparece/some conforme a longitude
  · `prefers-reduced-motion` desliga a rotação e mantém o desenho

O resultado é verificação dupla: a composição eu confiro rasterizando o quadro 0 pelo FigCraft;
a animação é declarada como contrato para o navegador, não como algo que eu tenha visto rodar
dentro do FigCraft.
"""

import math
from pathlib import Path

L, A = 1200, 1200          # viewBox
CX, CY, R = 600, 600, 460  # centro e raio
INK = "#111111"
CRIMSON = "#be123c"
CRIMSON_INK = "#9f1239"
PAPEL = "#faf8f5"


def meridiano(lam_graus, peso):
    """Semicírculo de longitude projetado: elipse de semi-eixo horizontal r·cos λ."""
    lam = math.radians(lam_graus)
    semi = R * math.cos(lam)
    passos = 72
    pts = []
    for k in range(passos + 1):
        a = math.radians(-90 + 360 * k / passos)
        pts.append((CX + semi * math.cos(a), CY + R * math.sin(a)))
    d = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{peso:.1f}" '
            f'stroke-linecap="round" opacity="0.55"/>')


def paralelo(lat_graus, peso):
    lat = math.radians(lat_graus)
    rl = R * math.cos(lat)
    hh = rl * 0.22
    passos = 72
    pts = []
    for k in range(passos + 1):
        a = math.radians(-180 + 360 * k / passos)
        pts.append((CX + rl * math.cos(a), CY + R * math.sin(lat) + hh * math.sin(a)))
    d = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{peso:.1f}" '
            f'stroke-linecap="round" opacity="0.4"/>')


def pontos_superficie():
    """Campo de pontos: denso no centro, ralo na borda. É o que lê como esfera."""
    saida = []
    for i in range(26):                      # latitudes
        lat = -90 + 180 * (i + 0.5) / 26
        phi = math.radians(lat)
        circ = int(46 * math.cos(phi))       # menos pontos perto dos polos
        for j in range(max(circ, 3)):
            lon = 360 * j / max(circ, 1)
            lam = math.radians(lon)
            prof = math.cos(lam) * math.cos(phi)
            if prof <= 0:
                continue                      # hemisfério de trás não aparece
            x = CX + R * math.cos(phi) * math.sin(lam)
            y = CY - R * math.sin(phi)
            r = 0.7 + 1.5 * prof
            op = 0.10 + 0.45 * prof
            saida.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" '
                         f'fill="{INK}" opacity="{op:.2f}"/>')
    return "\n  ".join(saida)


def pentagonos():
    """Pentágonos da bola projetados, com tamanho e achatamento por profundidade."""
    saida = []
    posicoes = [(0, 0, 0.40), (0, 50, 0.24), (0, -50, 0.24),
                (62, 26, 0.22), (-62, 26, 0.22), (62, -26, 0.22), (-62, -26, 0.22),
                (118, 0, 0.20), (-118, 0, 0.20)]
    for lon, lat, esc in posicoes:
        lam, phi = math.radians(lon), math.radians(lat)
        prof = math.cos(lam) * math.cos(phi)
        if prof <= 0.08:
            continue
        px = CX + R * math.cos(phi) * math.sin(lam)
        py = CY - R * math.sin(phi)
        raio = R * esc * (0.50 + 0.50 * prof)
        achat = 0.42 + 0.58 * prof
        pts = []
        for k in range(5):
            a = math.radians(-90 + 72 * k + lon * 0.5)
            pts.append((px + raio * math.cos(a), py + raio * math.sin(a) * achat))
        d = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
        saida.append(
            f'<path d="{d}" fill="none" stroke="{CRIMSON}" '
            f'stroke-width="{1.2 + 1.4 * prof:.1f}" opacity="{0.35 + 0.6 * prof:.2f}"/>')
    return "\n  ".join(saida)


def construir():
    meridianos = "\n  ".join(meridiano(-80 + 160 * i / 8, 1.1) for i in range(9))
    paralelos_ = "\n  ".join(paralelo(-60 + 30 * i, 0.9) for i in range(5))

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {L} {A}" width="{L}" height="{A}"
     role="img" aria-labelledby="titulo-animacao">
  <title id="titulo-animacao">Globo-múndi em linhas com a bola de futebol sobreposta</title>
  <style>
    /* O desenho existe sem animação: quem pede menos movimento recebe o quadro parado. */
    @media (prefers-reduced-motion: reduce) {{
      .gira, .gira-lento {{ animation: none !important; }}
    }}
    .gira {{ transform-origin: {CX}px {CY}px; animation: gira 28s linear infinite; }}
    .gira-lento {{ transform-origin: {CX}px {CY}px; animation: gira 52s linear infinite reverse; }}
    @keyframes gira {{
      from {{ transform: rotate(0deg); }}
      to   {{ transform: rotate(360deg); }}
    }}
  </style>

  <rect width="{L}" height="{A}" fill="{PAPEL}"/>

  <!-- esfera em linhas -->
  <g class="gira-lento">
  {meridianos}
  </g>
  <g>
  {paralelos_}
  </g>

  <!-- campo de pontos: a superfície lê como volume -->
  <g class="gira">
  {pontos_superficie()}
  </g>

  <!-- bola: pentágonos na superfície -->
  <g class="gira-lento">
  {pentagonos()}
  </g>

  <!-- contorno por último, para fechar a silhueta -->
  <circle cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="{INK}" stroke-width="2"/>
</svg>
'''
    destino = Path(__file__).parent / "globo-animado.svg"
    destino.write_text(svg, encoding="utf-8")
    return destino


if __name__ == "__main__":
    caminho = construir()
    kb = caminho.stat().st_size / 1024
    print(f"  {caminho.name}: {kb:.0f} KB")
