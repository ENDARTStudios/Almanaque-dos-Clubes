"""
Gráficos animados em SVG — o que o FigCraft não anima.

Três gráficos, cada um com a animação que ENSINA o dado (e não a que enfeita):

  barras  .... crescem escalonadas da base, 60ms entre uma e outra. A ordem de leitura é a
               ordem de aparição: o olho segue a série.
  linha   .... desenha da esquerda para a direita com stroke-dashoffset. A linha sendo
               desenhada É a série temporal — a animação repete o significado.
  donut   .... o arco varre a partir das 12 horas, na proporção de cada fatia.

Todas as três:
  · rodam UMA vez (não em laço) — dado não é decoração que fica pulsando;
  · têm `prefers-reduced-motion`: sem movimento, o desenho final aparece inteiro;
  · duram menos de 900ms, e a última barra entra em 480ms (Emil: UI abaixo de 300ms, revelação
    de dado pode ir até ~900ms porque acontece uma vez).

O texto e os eixos aparecem imediatamente: número que espera animação para ser lido é número
que o usuário não leu.
"""

import math
from pathlib import Path

PAPEL = "#faf8f5"
INK = "#111111"
INK2 = "#57534e"
INK3 = "#6b6560"
HAIR = "#e0dad3"
CRIMSON = "#be123c"
OCHRE = "#94600a"
PETROL = "#0f6b6b"
OLIVE = "#5c6b1f"
PLUM = "#6d2e5f"
SLATE = "#34506b"

SERIES = [CRIMSON, OCHRE, PETROL, OLIVE, PLUM, SLATE]


def _cabecalho(titulo, nota, x, y, largura):
    return (f'<text x="{x}" y="{y}" font-family="Barlow Condensed, sans-serif" '
            f'font-size="22" font-weight="700" fill="{INK}">{titulo}</text>\n'
            f'  <text x="{x}" y="{y + 22}" font-family="Barlow, sans-serif" '
            f'font-size="12" fill="{INK3}">{nota}</text>\n'
            f'  <line x1="{x}" y1="{y + 36}" x2="{x + largura}" y2="{y + 36}" '
            f'stroke="{HAIR}" stroke-width="1"/>')


def barras_animadas():
    """Barras que crescem da base, escalonadas."""
    x0, y0, largura, altura = 48, 120, 300, 140
    dados = [("1950", 243), ("1960", 522), ("1970", 386), ("1980", 128), ("1990", 96)]
    topo = max(v for _, v in dados)
    passo = largura / len(dados)
    partes = []
    for i, (rot, v) in enumerate(dados):
        bx = x0 + i * passo + passo * 0.18
        bw = passo * 0.64
        h = altura * v / topo
        atraso = i * 0.06
        cor = CRIMSON if i == 1 else INK3
        partes.append(
            f'<rect x="{bx:.1f}" y="{y0 + altura - h:.1f}" width="{bw:.1f}" height="{h:.1f}" '
            f'fill="{cor}" style="transform-origin: {bx + bw / 2:.1f}px {y0 + altura}px; '
            f'animation: cresce 520ms cubic-bezier(0.23,1,0.32,1) {atraso}s both"/>'
            f'<text x="{bx + bw / 2:.1f}" y="{y0 + altura + 16}" text-anchor="middle" '
            f'font-family="Barlow, sans-serif" font-size="10" fill="{INK3}">{rot}</text>'
            f'<text x="{bx + bw / 2:.1f}" y="{y0 + altura - h - 6:.1f}" text-anchor="middle" '
            f'font-family="Barlow Condensed, sans-serif" font-size="13" font-weight="600" '
            f'fill="{INK}">{v}</text>')
    return f'''<g>
  {_cabecalho("Gols por década", "Pelé · 1.279 no total", x0, 60, largura)}
  <line x1="{x0}" y1="{y0 + altura}" x2="{x0 + largura}" y2="{y0 + altura}" stroke="{HAIR}" stroke-width="1"/>
  {chr(10).join("  " + p for p in partes)}
</g>'''


def linha_animada():
    """Linha desenhada da esquerda para a direita."""
    x0, y0, largura, altura = 396, 120, 300, 140
    serie = [380, 412, 448, 470, 512, 498, 540, 566]
    vmax, vmin = max(serie), min(serie)
    faixa = vmax - vmin or 1
    pts = []
    for i, v in enumerate(serie):
        px = x0 + largura * i / (len(serie) - 1)
        py = y0 + altura - ((v - vmin) / faixa) * altura
        pts.append((round(px, 1), round(py, 1)))
    d = "M " + " L ".join(f"{px} {py}" for px, py in pts)
    # comprimento aproximado do caminho para o dashoffset
    comp = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    pontos = "".join(
        f'<circle cx="{px}" cy="{py}" r="3" fill="{PAPEL}" stroke="{CRIMSON}" stroke-width="2" '
        f'style="animation: aparece 200ms ease-out {0.35 + i * 0.05:.2f}s both"/>'
        for i, (px, py) in enumerate(pts))
    return f'''<g>
  {_cabecalho("Partidas por temporada", "2025 · 566 partidas", x0, 60, largura)}
  <line x1="{x0}" y1="{y0 + altura}" x2="{x0 + largura}" y2="{y0 + altura}" stroke="{HAIR}" stroke-width="1"/>
  <path d="{d}" fill="none" stroke="{CRIMSON}" stroke-width="2" stroke-linecap="round"
        stroke-dasharray="{comp:.0f}" stroke-dashoffset="{comp:.0f}"
        style="animation: desenha 700ms cubic-bezier(0.77,0,0.175,1) 120ms forwards"/>
  {pontos}
  <text x="{x0}" y="{y0 + altura + 16}" font-family="Barlow, sans-serif" font-size="10" fill="{INK3}">2018</text>
  <text x="{x0 + largura}" y="{y0 + altura + 16}" text-anchor="end" font-family="Barlow, sans-serif" font-size="10" fill="{INK3}">2025</text>
</g>'''


def donut_animado():
    """Arco que varre a partir das 12 horas."""
    cx, cy, r, esp = 860, 200, 62, 16
    dados = [("Mundial", 4, OCHRE), ("Continental", 22, CRIMSON),
             ("Nacional", 58, PETROL), ("Estadual", 16, OLIVE)]
    total = sum(v for _, v, _ in dados)
    partes = []
    ang = -90.0
    atraso = 0.0
    for rot, v, cor in dados:
        varredura = 360 * v / total
        passos = max(4, int(varredura / 4))
        pts = []
        for k in range(passos + 1):
            a = math.radians(ang + varredura * k / passos)
            pts.append((round(cx + r * math.cos(a), 1), round(cy + r * math.sin(a), 1)))
        d = "M " + " L ".join(f"{px} {py}" for px, py in pts)
        comp = math.radians(varredura) * r + 2
        partes.append(
            f'<path d="{d}" fill="none" stroke="{cor}" stroke-width="{esp}" '
            f'stroke-linecap="butt" stroke-dasharray="{comp:.0f}" stroke-dashoffset="{comp:.0f}" '
            f'style="animation: desenha 420ms cubic-bezier(0.23,1,0.32,1) {atraso:.2f}s forwards"/>')
        ang += varredura
        atraso += 0.08
    legenda = "".join(
        f'<rect x="960" y="{132 + i * 20}" width="8" height="8" fill="{cor}"/>'
        f'<text x="976" y="{140 + i * 20}" font-family="Barlow, sans-serif" font-size="10" '
        f'fill="{INK2}">{rot}</text>'
        f'<text x="1100" y="{140 + i * 20}" text-anchor="end" font-family="Barlow, sans-serif" '
        f'font-size="10" font-weight="600" fill="{INK}">{round(100 * v / total)}%</text>'
        for i, (rot, v, cor) in enumerate(dados))
    return f'''<g>
  {_cabecalho("Distribuição por alcance", "1.932 competições", 780, 60, 360)}
  <text x="{cx}" y="{cy + 6}" text-anchor="middle" font-family="Barlow Condensed, sans-serif"
        font-size="26" font-weight="700" fill="{INK}"
        style="animation: aparece 240ms ease-out 480ms both">100%</text>
  {chr(10).join("  " + p for p in partes)}
  {legenda}
</g>'''


def construir():
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340" width="1200" height="340"
     role="img" aria-labelledby="t">
  <title id="t">Três gráficos animados do acervo: gols por década, partidas por temporada e
distribuição por alcance</title>
  <style>
    /* sem movimento: o desenho final aparece inteiro, nada fica invisível */
    @media (prefers-reduced-motion: reduce) {{
      * {{ animation: none !important; }}
      [style*="dashoffset"] {{ stroke-dashoffset: 0 !important; }}
    }}
    @keyframes cresce  {{ from {{ transform: scaleY(0); }} to {{ transform: scaleY(1); }} }}
    @keyframes desenha {{ to {{ stroke-dashoffset: 0; }} }}
    @keyframes aparece {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
  </style>
  <rect width="1200" height="340" fill="{PAPEL}"/>
  {barras_animadas()}
  {linha_animada()}
  {donut_animado()}
</svg>
'''
    d = Path(__file__).parent / "graficos-animados.svg"
    d.write_text(svg, encoding="utf-8")
    return d


if __name__ == "__main__":
    p = construir()
    print(f"  {p.name}: {p.stat().st_size / 1024:.0f} KB")
