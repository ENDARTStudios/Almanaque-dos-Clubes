"""
Primitivas visuais do sistema FICHA — o que faltava para os pedidos do Operador.

Faltavam cinco coisas em quase todas as páginas: gráfico, troféu, medalha, bandeira e globo.
Sem elas, "estatísticas, métricas e gráficos" era uma frase sem desenho.

Tudo é construído com retângulo e vetor do FigCraft — sem imagem externa. Isso mantém o arquivo
leve e editável, e cada elemento herda os tokens do sistema.
"""

import math

_OURO = "#c9a227"   # metal de destaque (ver ficha_metais)

from ficha import (
    add, rect, txt, num, rule, kicker, HEAD, BODY,
    INK, INK_2, INK_3, CRIMSON, CRIMSON_INK, OCHRE, BORDER, SURFACE, SURFACE_2, MUTED,
    PAPER, NIGHT, NIGHT_SURF, NIGHT_BORDER, NIGHT_INK, NIGHT_INK2, NIGHT_INK3,
    NIGHT_CRIMSON, NIGHT_OCHRE,
)


# ══ VETOR ═════════════════════════════════════════════════════════════════════════════════
def vetor(nome, pontos, fechado=False, stroke=None, strokeWeight=1, fill=None, x=0, y=0):
    """Polilinha. `pontos` em coordenadas absolutas da página (x/y do layer ficam em 0)."""
    props = {}
    if stroke:
        props["stroke"] = stroke
        props["strokeWeight"] = strokeWeight
        props["strokeCap"] = "round"
        props["strokeJoin"] = "round"
    if fill:
        props["fill"] = fill
    else:
        props["fill"] = "none"
    add("node.create", type="vector", name=nome, x=x, y=y, points=pontos,
        closed=fechado, props=props)


# ══ BANDEIRA ═════════════════════════════════════════════════════════════════════════════
# Cores por país (faixas simplificadas — a bandeira real em miniatura não é legível a 16 px,
# e uma faixa com as cores nacionais + o código ISO comunica melhor do que um desenho impreciso).
BANDEIRAS = {
    "BR": ["#009c3b", "#ffdf00", "#002776"],
    "PT": ["#046a38", "#da291c"],
    "SE": ["#006aa7", "#fecc00"],
    "GB": ["#012169", "#ffffff", "#c8102e"],
    "DE": ["#000000", "#dd0000", "#ffce00"],
    "ES": ["#aa151b", "#f1bf00"],
    "IT": ["#009246", "#ffffff", "#ce2b37"],
    "FR": ["#002395", "#ffffff", "#ed2939"],
    "AR": ["#74acdf", "#ffffff", "#74acdf"],
    "AU": ["#012169", "#ffffff", "#c8102e"],
    "TR": ["#e30a17", "#ffffff"],
    "GR": ["#0d5eaf", "#ffffff"],
    "NL": ["#ae1c28", "#ffffff", "#21468b"],
    "JP": ["#ffffff", "#bc002d"],
    "NO": ["#ba0c2f", "#ffffff", "#00205b"],
    "DK": ["#c60c30", "#ffffff"],
    "CH": ["#d52b1e", "#ffffff"],
    "PL": ["#ffffff", "#dc143c"],
    "BE": ["#000000", "#fdda24", "#ef3340"],
    "HR": ["#ff0000", "#ffffff", "#171796"],
}


def bandeira(iso, x, y, w=22, h=15):
    """Faixa com as cores nacionais + moldura. Lê como bandeira no tamanho em que aparece."""
    cores = BANDEIRAS.get(iso.upper(), [INK_3])
    n = len(cores)
    faixa = h / n
    for i, cor in enumerate(cores):
        rect(f"fl/{iso}/{i}", x, y + i * faixa, w, faixa + 0.5, fill=cor)
    rect(f"fl/{iso}/moldura", x, y, w, h, fill=None, stroke=BORDER, strokeWeight=0.5)


def bandeira_redonda(iso, x, y, d=28):
    """Variante circular para listas — recorte redondo com as cores nacionais."""
    cores = BANDEIRAS.get(iso.upper(), [INK_3])
    n = len(cores)
    faixa = d / n
    for i, cor in enumerate(cores):
        rect(f"flr/{iso}/{i}", x, y + i * faixa, d, faixa + 0.5, fill=cor, cornerRadius=0)
    add("node.create", type="ellipse", name=f"flr/{iso}/mask", x=x, y=y, width=d, height=d,
        props={"fill": "none", "stroke": BORDER, "strokeWeight": 1})


# ══ TROFÉU ═══════════════════════════════════════════════════════════════════════════════
def trofeu(nome, x, y, h=64, cor=OCHRE, fundo=None):
    """Taça desenhada em vetor: bojo, alças, haste e base. Escala por `h`."""
    w = h * 0.66
    cx = x + w / 2
    topo = y + h * 0.06
    bojo_fim = y + h * 0.52
    haste_fim = y + h * 0.74
    base_y = y + h * 0.86

    # bojo (U)
    bojo = [
        (x, topo), (x + w * 0.06, topo + (bojo_fim - topo) * 0.55),
        (cx, bojo_fim), (x + w * 0.94, topo + (bojo_fim - topo) * 0.55), (x + w, topo),
    ]
    vetor(f"{nome}/bojo", bojo, stroke=cor, strokeWeight=max(1.6, h / 26))
    # alças
    vetor(f"{nome}/alca_e", [(x, topo + h * 0.04), (x - w * 0.16, topo + h * 0.16),
                             (x - w * 0.10, y + h * 0.34), (cx - w * 0.34, y + h * 0.40)],
          stroke=cor, strokeWeight=max(1.4, h / 30))
    vetor(f"{nome}/alca_d", [(x + w, topo + h * 0.04), (x + w * 1.16, topo + h * 0.16),
                             (x + w * 1.10, y + h * 0.34), (cx + w * 0.34, y + h * 0.40)],
          stroke=cor, strokeWeight=max(1.4, h / 30))
    # haste e base
    vetor(f"{nome}/haste", [(cx, bojo_fim), (cx, haste_fim)], stroke=cor,
          strokeWeight=max(2, h / 18))
    vetor(f"{nome}/base", [(x + w * 0.22, base_y), (x + w * 0.78, base_y)], stroke=cor,
          strokeWeight=max(2.4, h / 14))


# ══ MEDALHA ══════════════════════════════════════════════════════════════════════════════
def medalha(nome, x, y, d=34, cor=CRIMSON, fita=INK_3, metal=None, posicao=None):
    """Medalha: fita em V e disco.

    `metal` (ouro/prata/bronze) separa a cor do OBJETO da cor do TEXTO. O disco usa o metal
    vivo; o anel externo usa o metal escuro, que é o que passa AA. O 1º lugar tem disco cheio,
    o 2º anel duplo, o 3º disco menor — a forma carrega a informação mesmo em preto e branco.
    """
    import ficha_metais as MT

    if metal or posicao:
        vivo, escuro, _ = (MT.OURO, MT.OURO_TXT, MT.OURO_ESC)
        if metal == "prata" or posicao == 2:
            vivo, escuro = MT.PRATA, MT.PRATA_TXT
        elif metal == "bronze" or posicao == 3:
            vivo, escuro = MT.BRONZE, MT.BRONZE_TXT
        elif metal == "ouro" or posicao == 1:
            vivo, escuro = MT.OURO, MT.OURO_TXT
        d = d * (1.0 if posicao in (None, 1) else 0.88)

    cx = x + d / 2
    vetor(f"{nome}/fita_e", [(cx - d * 0.18, y), (cx - d * 0.06, y + d * 0.42)],
          stroke=fita, strokeWeight=max(2, d / 12))
    vetor(f"{nome}/fita_d", [(cx + d * 0.18, y), (cx + d * 0.06, y + d * 0.42)],
          stroke=fita, strokeWeight=max(2, d / 12))
    add("node.create", type="ellipse", name=f"{nome}/disco", x=x, y=y + d * 0.36,
        width=d, height=d, props={"fill": "none",
                                  "stroke": escuro if (metal or posicao) else cor,
                                  "strokeWeight": max(1.6, d / 16)})
    add("node.create", type="ellipse", name=f"{nome}/interno", x=x + d * 0.26,
        y=y + d * 0.62, width=d * 0.48, height=d * 0.48,
        props={"fill": vivo if (metal or posicao) else cor, "stroke": "none"})
    # 1º lugar: anel externo extra (forma, não cor)
    if posicao == 1 or metal == "ouro" and posicao is None:
        add("node.create", type="ellipse", name=f"{nome}/anel", x=x - 3, y=y + d * 0.36 - 3,
            width=d + 6, height=d + 6,
            props={"fill": "none", "stroke": vivo, "strokeWeight": 1})



# ══ GRÁFICOS ═════════════════════════════════════════════════════════════════════════════
def barras(nome, dados, x, y, w, h, maximo=None, cor=None, cor_base=INK_3,
           rotulos=True, horizontal=False):
    """Gráfico de barras. `dados` = [(rótulo, valor)].

    A barra em DESTAQUE é a de maior valor, não a última — e o destaque é dourado,
    porque no sistema o ouro é a cor de campeão e de destaque. Antes a última barra
    era a colorida por acidente de laço, o que apontava para o dado errado.
    """
    if not dados:
        return
    topo = maximo or max(v for _, v in dados)
    n = len(dados)
    if horizontal:
        passo = h / n
        for i, (rot, v) in enumerate(dados):
            by = y + i * passo
            largura = (w - 130) * (v / topo)
            txt(f"{nome}/{i}/r", rot, x, by + 2, 110, 10, INK_2, BODY, 500)
            destaque = (v == topo)
            rect(f"{nome}/{i}/b", x + 118, by + 4, largura, passo * 0.52,
                 fill=(cor or _OURO) if destaque else cor_base, cornerRadius=1)
            num(f"{nome}/{i}/v", str(v), x + 122 + largura, by, 12, INK, 60, align="left")
    else:
        passo = w / n
        for i, (rot, v) in enumerate(dados):
            bx = x + i * passo
            altura = (h - 24) * (v / topo)
            destaque = (v == topo)
            rect(f"{nome}/{i}/b", bx + passo * 0.16, y + h - 24 - altura,
                 passo * 0.68, altura, fill=(cor or _OURO) if destaque else cor_base,
                 cornerRadius=1)
            if rotulos:
                txt(f"{nome}/{i}/r", rot, bx, y + h - 18, passo, 9, INK_3, BODY, 500,
                    align="center")
    rule(f"{nome}/base", x, y + h - 24, w, BORDER, 1)


def linha(nome, serie, x, y, w, h, cor=CRIMSON, maximo=None, minimo=None, area=False,
          pontos=False):
    """Gráfico de linha. `serie` = [valor, ...] — sem eixo X, para tendência."""
    if not serie:
        return
    vmax = maximo if maximo is not None else max(serie)
    vmin = minimo if minimo is not None else min(serie)
    faixa = (vmax - vmin) or 1
    n = len(serie)
    pts = []
    for i, v in enumerate(serie):
        px = x + (w * i / max(1, n - 1))
        py = y + h - ((v - vmin) / faixa) * h
        pts.append((round(px, 1), round(py, 1)))
    if area:
        fechado = pts + [(x + w, y + h), (x, y + h)]
        vetor(f"{nome}/area", fechado, fechado=True, fill=cor, stroke=None)
        # área com opacidade baixa: o retângulo do fundo já cobre; o contorno marca a linha
    vetor(f"{nome}/linha", pts, stroke=cor, strokeWeight=2)
    if pontos:
        for i, (px, py) in enumerate(pts):
            add("node.create", type="ellipse", name=f"{nome}/p{i}", x=px - 2.5, y=py - 2.5,
                width=5, height=5, props={"fill": cor, "stroke": "none"})
    rule(f"{nome}/base", x, y + h, w, BORDER, 1)


def donut(nome, partes, x, y, d=120, espessura=16):
    """Anel de proporção. `partes` = [(rótulo, valor, cor)] — desenhado em arcos."""
    total = sum(v for _, v, _ in partes) or 1
    cx, cy = x + d / 2, y + d / 2
    r = d / 2 - espessura / 2
    angulo = -90.0
    for i, (rot, v, cor) in enumerate(partes):
        varredura = (v / total) * 360
        passos = max(3, int(varredura / 6))
        pts = []
        for k in range(passos + 1):
            a = math.radians(angulo + varredura * k / passos)
            pts.append((round(cx + r * math.cos(a), 1), round(cy + r * math.sin(a), 1)))
        vetor(f"{nome}/{i}", pts, stroke=cor, strokeWeight=espessura)
        angulo += varredura


def sparkline(nome, serie, x, y, w, h=20, cor=CRIMSON):
    if not serie:
        return
    vmax, vmin = max(serie), min(serie)
    faixa = (vmax - vmin) or 1
    n = len(serie)
    pts = [(round(x + w * i / max(1, n - 1), 1),
            round(y + h - ((v - vmin) / faixa) * h, 1)) for i, v in enumerate(serie)]
    vetor(nome, pts, stroke=cor, strokeWeight=1.4)


# ══ GLOBO EM LINHAS ══════════════════════════════════════════════════════════════════════
def globo(nome, cx, cy, r, cor, peso=1, meridianos=7, paralelos=5, bola=True, giro=0.0):
    """
    Globo em arame: meridiano e paralelo como polilinha, e — sobre ele — o desenho de uma bola
    de futebol (pentágonos em perspectiva), também só em linha.

    É o pedido do Operador para a Home: "um globo gigante animado do mapa-múndi mesclado a uma
    bola de futebol apenas em linhas sem preenchimento". Aqui ele é estático (o app não anima
    por script de forma confiável), mas a construção é a mesma — e a animação entra no CSS.

    `giro` desloca os meridianos para dar a impressão de rotação.
    """
    # contorno
    add("node.create", type="ellipse", name=f"{nome}/contorno", x=cx - r, y=cy - r,
        width=r * 2, height=r * 2, props={"fill": "none", "stroke": cor,
                                          "strokeWeight": peso})

    # paralelos: elipses achatadas
    for i in range(1, paralelos + 1):
        lat = -90 + (180 * i / (paralelos + 1))
        raio_lat = r * math.cos(math.radians(lat))
        altura = r * 0.16 * (1 - abs(lat) / 120)
        pts = []
        for k in range(25):
            a = math.radians(-180 + 360 * k / 24)
            pts.append((round(cx + raio_lat * math.cos(a), 1),
                        round(cy + r * math.sin(math.radians(lat)) +
                              altura * math.sin(a) * 0.6, 1)))
        vetor(f"{nome}/par{i}", pts, stroke=cor, strokeWeight=peso * 0.7)

    # meridianos: cada um e um semicirculo de longitude lambda. A projecao de um meridiano
    # num globo visto de frente e uma elipse de semi-eixo horizontal r*cos(lambda) e vertical r.
    for i in range(meridianos):
        frac = (i / (meridianos - 1)) if meridianos > 1 else 0.5
        lam = math.radians(-90 + 180 * frac + giro)
        semi = r * math.cos(lam)
        pts = []
        for k in range(33):
            a = math.radians(-90 + 360 * k / 32)
            pts.append((round(cx + semi * math.cos(a), 1),
                        round(cy + r * math.sin(a), 1)))
        vetor(f"{nome}/mer{i}", pts, stroke=cor, strokeWeight=peso * 0.7)

    if not bola:
        return

    # bola: pentágonos em perspectiva, apenas em linha
    def pentagono(px, py, raio, rot=0.0):
        pts = []
        for k in range(5):
            a = math.radians(-90 + 72 * k + rot)
            pts.append((round(px + raio * math.cos(a), 1),
                        round(py + raio * math.sin(a), 1)))
        return pts

    # pentágono central e cinco ao redor, com raio decrescente perto da borda
    vetor(f"{nome}/bola/c", pentagono(cx, cy, r * 0.42), fechado=True, stroke=cor,
          strokeWeight=peso * 1.2)
    for i in range(5):
        ang = math.radians(-90 + 72 * i)
        px = cx + r * 0.74 * math.cos(ang)
        py = cy + r * 0.74 * math.sin(ang)
        vetor(f"{nome}/bola/{i}", pentagono(px, py, r * 0.26, 36 * i), fechado=True,
              stroke=cor, strokeWeight=peso)


def globo_duplo(nome, cx, cy, r, cor, cor_bola=None):
    """Globo + bola sobrepostos — o pedido literal da Home: mapa-múndi mesclado a bola."""
    globo(f"{nome}/globo", cx, cy, r, cor, peso=1.2, bola=False)
    globo(f"{nome}/bola", cx, cy, r * 0.42, cor_bola or cor, peso=1.4, bola=True,
          meridianos=3, paralelos=2)


def globo_bola(nome, cx, cy, r, cor_esfera, cor_bola, peso=1.2, meridianos=9, paralelos=6):
    """
    Globo e bola no MESMO objeto — o pedido da Home.

    A esfera vem em linhas finas (meridiano e paralelo). Sobre ela, pentagonos de bola em
    posicoes de latitude/longitude, com tamanho e inclinacao projEtados: quanto mais perto da
    borda, menor e mais achatado. E o que faz ler como bola em vez de poligono colado.
    """
    # esfera
    for i in range(meridianos):
        frac = (i / (meridianos - 1)) if meridianos > 1 else 0.5
        lam = math.radians(-90 + 180 * frac)
        semi = r * math.cos(lam)
        pts = [(round(cx + semi * math.cos(math.radians(-90 + 360 * k / 32)), 1),
                round(cy + r * math.sin(math.radians(-90 + 360 * k / 32)), 1))
               for k in range(33)]
        vetor(f"{nome}/mer{i}", pts, stroke=cor_esfera, strokeWeight=peso * 0.6)

    for i in range(1, paralelos + 1):
        lat = math.radians(-90 + 180 * i / (paralelos + 1))
        rl = r * math.cos(lat)
        hh = rl * 0.22
        pts = [(round(cx + rl * math.cos(math.radians(-180 + 360 * k / 28)), 1),
                round(cy + r * math.sin(lat) + hh * math.sin(math.radians(-180 + 360 * k / 28)), 1))
               for k in range(29)]
        vetor(f"{nome}/par{i}", pts, stroke=cor_esfera, strokeWeight=peso * 0.6)

    add("node.create", type="ellipse", name=f"{nome}/contorno", x=cx - r, y=cy - r,
        width=r * 2, height=r * 2, props={"fill": "none", "stroke": cor_esfera,
                                          "strokeWeight": peso * 1.3})

    # pentagonos projetados na superficie
    posicoes = [(0.0, 0.0, 0.44), (0.0, 48.0, 0.26), (0.0, -48.0, 0.26),
                (58.0, 24.0, 0.24), (-58.0, 24.0, 0.24),
                (58.0, -24.0, 0.24), (-58.0, -24.0, 0.24)]
    for idx, (lon, lat, esc) in enumerate(posicoes):
        lam = math.radians(lon)
        phi = math.radians(lat)
        # profundidade: 1 na frente, 0 na borda, negativo atras
        prof = math.cos(lam) * math.cos(phi)
        if prof <= 0.02:
            continue
        px = cx + r * math.cos(phi) * math.sin(lam)
        py = cy - r * math.sin(phi)
        raio = r * esc * (0.45 + 0.55 * prof * prof)
        achat = 0.40 + 0.60 * prof
        # recorte: pentagono que passaria da esfera nao e desenhado
        if abs(px - cx) + raio > r * 0.97:
            continue
        pts = []
        for k in range(5):
            a = math.radians(-90 + 72 * k + lon * 0.5)
            pts.append((round(px + raio * math.cos(a), 1),
                        round(py + raio * math.sin(a) * achat, 1)))
        vetor(f"{nome}/bola{idx}", pts, fechado=True, stroke=cor_bola,
              strokeWeight=peso * (0.9 + 0.5 * prof))
