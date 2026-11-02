"""
Conceito "FICHA" — sistema visual do Almanaque dos Clubes.

Usa EXATAMENTE as cores e fontes já estabelecidas no projeto (globals.css):
  Barlow Condensed (títulos) · Barlow (corpo) · crimson #be123c · ocre #94600a
  papel #faf8f5 · superfície #ffffff · superfície-2 #f2efea · fio #e0dad3
  e a superfície escura do .theme-dark: #12100f / #e8412f / #c9a227

O conceito não é um tema: é uma ESPINHA. Toda página é uma ficha de almanaque com a mesma
estrutura — kicker, título display, número-âncora, fio, corpo, procedência — e o que varia é
o CORPO. Assim 10 páginas diferentes parecem um produto só.
"""

import json
import sys

# ══ TOKENS (do projeto) ══════════════════════════════════════════════════════════════════
PAPER = "#faf8f5"
SURFACE = "#ffffff"
SURFACE_2 = "#f2efea"
MUTED = "#efece7"
BORDER = "#e0dad3"
INK = "#111111"
INK_2 = "#57534e"
INK_3 = "#6b6560"
CRIMSON = "#be123c"
CRIMSON_INK = "#9f1239"
OCHRE = "#94600a"

NIGHT = "#12100f"
NIGHT_SURF = "#1a1715"
NIGHT_SURF2 = "#211d1a"
NIGHT_BORDER = "#6b625a"
NIGHT_INK = "#f7f3ea"
NIGHT_INK2 = "#b3aea3"
NIGHT_INK3 = "#8d8880"
NIGHT_CRIMSON = "#e8412f"
NIGHT_OCHRE = "#c9a227"

HEAD = "Barlow Condensed"
BODY = "Barlow"

W = 1440
M = 64
CONTENT = W - M * 2

cmd = []


# ══ PRIMITIVAS ═══════════════════════════════════════════════════════════════════════════
def add(command, **params):
    cmd.append({"command": command, "params": params})


def frame(name, w=W, h=1080, fill=PAPER):
    add("frame.create", name=name, x=0, y=0, width=w, height=h, props={"fill": fill})


def rect(name, x, y, w, h, **props):
    add("shape.rectangle", name=name, x=x, y=y, width=w, height=h, props=props)


def txt(name, content, x, y, w, size, color, font=BODY, weight=400, align="left",
        lh=None, ls=None):
    props = {"fontSize": size, "fontFamily": font, "fontWeight": weight, "fill": color,
             "textAlign": align}
    if lh is not None:
        props["lineHeight"] = lh
    if ls is not None:
        props["letterSpacing"] = ls
    add("text.create", name=name, text=content, x=x, y=y, width=w, props=props)


def rule(name, x, y, w, color=BORDER, weight=1):
    rect(name, x, y, w, weight, fill=color)


def kicker(name, content, x, y, color=INK_3, w=600):
    """Rótulo de seção: Barlow 600 em caixa alta com tracking largo. É o que dá ritmo de
    impresso — sem ele a página vira interface."""
    add("text.create", name=name, text=content.upper(), x=x, y=y, width=w,
        props={"fontSize": 10, "fontFamily": BODY, "fontWeight": 600, "fill": color,
               "letterSpacing": 2.2})


def display(name, content, x, y, size, color=INK, w=900, align="left", weight=700, lh=None):
    """Título em Barlow Condensed — a fonte de display do projeto. Condensada permite
    empilhar palavra grande sem comer a página."""
    add("text.create", name=name, text=content, x=x, y=y, width=w,
        props={"fontSize": size, "fontFamily": HEAD, "fontWeight": weight, "fill": color,
               "textAlign": align, "letterSpacing": -0.5, "lineHeight": lh or size * 1.02})


def num(name, content, x, y, size, color=INK, w=300, align="right"):
    """Número em Barlow Condensed 700. Sempre alinhado à direita: é o que faz o olho
    comparar magnitude em vez de ler dígito."""
    add("text.create", name=name, text=content, x=x, y=y, width=w,
        props={"fontSize": size, "fontFamily": HEAD, "fontWeight": 700, "fill": color,
               "textAlign": align, "letterSpacing": -1.5})


def band(name, y, h, fill=NIGHT):
    rect(name, 0, y, W, h, fill=fill)


# ══ ESPINHA (o que faz as páginas serem um produto só) ══════════════════════════════════
def topbar(dark=False, active=0, ativo_x=None):
    ink = NIGHT_INK if dark else INK
    dim = NIGHT_INK3 if dark else INK_2
    line = NIGHT_BORDER if dark else BORDER
    rect("top/line", 0, 60, W, 1, fill=line)

    txt("brand", "ALMANAQUE", M, 20, 260, 22, ink, HEAD, 700, ls=-0.3)
    rect("brand/mark", M + 132, 20, 4, 22, fill=NIGHT_CRIMSON if dark else CRIMSON)
    txt("brand/2", "dos Clubes", M + 144, 26, 160, 12, dim, BODY, 400, ls=0.2)

    nav = ["Competições", "Clubes", "Jogadores", "Rankings", "Mapa", "Lendas", "Comparar"]
    nx = 420
    for i, item in enumerate(nav):
        on = i == active
        txt(f"nav/{item}", item, nx, 24, 150, 13, ink if on else dim, BODY, 600 if on else 400)
        if on:
            rect(f"nav/{item}/u", nx, 46, 26, 2, fill=NIGHT_CRIMSON if dark else CRIMSON)
        nx += 96 if len(item) < 10 else 104

    rect("search", W - M - 300, 16, 210, 30, fill=NIGHT_SURF if dark else SURFACE,
         cornerRadius=15, stroke=line, strokeWeight=1)
    txt("search/t", "Buscar no Almanaque…", W - M - 286, 23, 190, 12, dim, BODY)
    rect("enter", W - M - 78, 16, 78, 30, fill=NIGHT_CRIMSON if dark else CRIMSON, cornerRadius=15)
    txt("enter/t", "Entrar", W - M - 62, 23, 60, 12, "#ffffff" if not dark else NIGHT, BODY, 600)


def ficha_head(title, anchor, anchor_label, kicker_txt, sub, dark=False, y=104):
    """Cabeçalho de ficha: kicker, título display, número-âncora, subtítulo, fio.
    Presente em TODAS as páginas — é o que dá unidade ao sistema."""
    ink = NIGHT_INK if dark else INK
    dim = NIGHT_INK2 if dark else INK_2
    dim3 = NIGHT_INK3 if dark else INK_3
    line = NIGHT_BORDER if dark else INK
    accent = NIGHT_CRIMSON if dark else CRIMSON

    kicker("kicker", kicker_txt, M, y, dim3, 700)
    display("title", title, M, y + 18, 68, ink, w=880)
    if anchor:
        num("anchor", anchor, W - M - 320, y + 6, 76, accent, w=320)
        add("text.create", name="anchor/l", text=anchor_label.upper(), x=W - M - 320,
            y=y + 84, width=320,
            props={"fontSize": 10, "fontFamily": BODY, "fontWeight": 600, "fill": dim3,
                   "textAlign": "right", "letterSpacing": 2.0})
    if sub:
        txt("sub", sub, M, y + 104, 760, 15, dim, BODY, 400, lh=22)
    rule("head/rule", M, y + (146 if sub else 108), CONTENT, line, 2)
    return y + (166 if sub else 128)


def provenance(note, y, dark=False):
    line = NIGHT_BORDER if dark else BORDER
    dim = NIGHT_INK3 if dark else INK_3
    rule("prov/line", M, y, CONTENT, line, 1)
    txt("prov/note", note, M, y + 12, 1100, 11, dim, BODY)


# ══ COMPONENTES DE CORPO ═════════════════════════════════════════════════════════════════
def table_header(cols, y, dark=False):
    """cols = [(rótulo, x, largura, alinhamento)]"""
    dim = NIGHT_INK3 if dark else INK_3
    line = NIGHT_BORDER if dark else INK
    for rot, x, w, align in cols:
        add("text.create", name=f"th/{rot}", text=rot.upper(), x=x, y=y, width=w,
            props={"fontSize": 9, "fontFamily": BODY, "fontWeight": 700,
                   "fill": dim, "textAlign": align, "letterSpacing": 1.6})
    rule("th/rule", M, y + 20, CONTENT, line, 2)


def table_row(i, cells, y, cols, dark=False, zebra=True, strong=False, height=34):
    """cells = [valor, ...] na ordem de cols. Zebra em surface-2, fio de 1px embaixo."""
    if zebra and i % 2 == 1:
        fill = NIGHT_SURF2 if dark else SURFACE_2
        rect(f"row/{i}/bg", M - 8, y - 7, CONTENT + 16, height, fill=fill)
    ink = NIGHT_INK if dark else INK
    dim = NIGHT_INK2 if dark else INK_2
    for (rot, x, w, align), valor in zip(cols, cells):
        cor = ink if align == "left" else dim
        add("text.create", name=f"td/{i}/{rot}", text=str(valor), x=x, y=y, width=w,
            props={"fontSize": 13, "fontFamily": BODY, "fontWeight": 600 if strong else 400,
                   "fill": cor, "textAlign": align})
    rule(f"row/{i}/line", M - 8, y + 26, CONTENT + 16,
         NIGHT_BORDER if dark else BORDER, 1)


def pillar(label_txt, valor, nota, x, y, dark=False, w=280):
    """Bloco de apoio: rótulo, número gigante, nota. Repetido em todas as páginas."""
    dim3 = NIGHT_INK3 if dark else INK_3
    ink = NIGHT_INK2 if dark else INK_2
    kicker(f"pil/{label_txt}/l", label_txt, x, y, dim3, w)
    num(f"pil/{label_txt}/v", valor, x, y + 16, 40, NIGHT_INK if dark else INK, w=w, align="left")
    txt(f"pil/{label_txt}/n", nota, x, y + 62, w, 11, ink, BODY)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 1. COMPETIÇÕES — hierarquia de alcance
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_competicoes():
    frame("Competições", h=1180)
    topbar(active=0)
    y = ficha_head(
        "Competições", "1.932", "competições catalogadas",
        "Acervo · alcance declarado",
        "Do mundial ao estadual: cada torneio com o alcance em que ele decide, e o índice completo abaixo.",
        y=104,
    )

    # Degraus: o alvo muda de FORMA, não só de cor.
    kicker("g1/l", "Mundial · decide o mundo", M, y + 10, OCHRE, 700)
    mundiais = [("FIFA World Cup", "1930 · 23 edições"), ("FIFA Club World Cup", "2000 · 21"),
                ("FIFA U-20 World Cup", "1977 · 24"), ("FIFA Women's World Cup", "1991 · 10")]
    x = M
    for i, (nome, meta) in enumerate(mundiais):
        w = (CONTENT - 16 * 3) / 4
        rect(f"g1/{i}", x, y + 32, w, 92, fill=SURFACE, cornerRadius=2,
             stroke=OCHRE, strokeWeight=2)
        txt(f"g1/{i}/n", nome, x + 18, y + 50, w - 36, 19, INK, HEAD, 700, lh=21)
        txt(f"g1/{i}/m", meta, x + 18, y + 96, w - 36, 11, OCHRE, BODY, 600)
        x += w + 16

    y2 = y + 152
    kicker("g2/l", "Continental", M, y2, CRIMSON_INK, 700)
    conti = [("Copa Libertadores", "1960 · 66"), ("UEFA Champions League", "1955 · 71"),
             ("AFC Champions League Elite", "1967 · 43"), ("Copa América", "1916 · 48")]
    x = M
    for i, (nome, meta) in enumerate(conti):
        w = (CONTENT - 16 * 3) / 4
        rect(f"g2/{i}", x, y2 + 22, w, 64, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"g2/{i}/n", nome, x + 16, y2 + 36, w - 32, 15, INK, BODY, 600)
        txt(f"g2/{i}/m", meta, x + 16, y2 + 58, w - 32, 10, INK_3, BODY)
        x += w + 16

    y3 = y2 + 108
    kicker("g3/l", "Continental · 2º escalão", M, y3, INK_3, 700)
    chips = ["Copa Sudamericana", "UEFA Conference League", "UEFA Super Cup"]
    x = M
    for i, nome in enumerate(chips):
        w = 30 + int(len(nome) * 7.2)
        rect(f"g3/{i}", x, y3 + 20, w, 28, fill=SURFACE_2, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"g3/{i}/t", nome, x + 14, y3 + 27, w - 28, 12, INK_2, BODY, 500)
        x += w + 10

    y4 = y3 + 68
    kicker("g4/l", "Nacional", M, y4, INK_3, 700)
    nac = ["Brasileirão Feminino A1", "FA Cup", "Copa do Brasil", "Copa del Rey",
           "Coppa Italia", "Ligue 1", "Bundesliga", "Eredivisie"]
    x = M
    for i, nome in enumerate(nac):
        w = 30 + int(len(nome) * 7.2)
        if x + w > W - M:
            break
        rect(f"g4/{i}", x, y4 + 20, w, 28, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"g4/{i}/t", nome, x + 14, y4 + 27, w - 28, 12, INK_2, BODY, 500)
        x += w + 10

    # Índice — o acervo de verdade
    iy = y4 + 78
    rule("idx/rule", M, iy - 10, CONTENT, INK, 2)
    kicker("idx/l", "Índice completo", M, iy + 4, INK, 700)
    txt("idx/n", "1.932 competições · 197 países", W - M - 380, iy + 3, 380, 11, INK_3,
        BODY, 500, align="right")

    cols = [("Competição", M, 520, "left"), ("País", M + 540, 180, "left"),
            ("Edições", M + 740, 110, "right"), ("Última", M + 870, 110, "right"),
            ("Alcance", M + 1000, 220, "left")]
    table_header(cols, iy + 28)
    linhas = [
        ("UEFA Champions League", "Europa", "71", "2025-26", "Continental"),
        ("Copa Libertadores", "América do Sul", "66", "2025", "Continental"),
        ("Copa do Mundo FIFA", "Mundial", "23", "2026", "Mundial"),
        ("Campeonato Brasileiro Série A", "Brasil", "69", "2025", "Nacional"),
        ("Premier League", "Reino Unido", "34", "2025-26", "Nacional"),
        ("La Liga", "Espanha", "95", "2025-26", "Nacional"),
        ("Serie A", "Itália", "94", "2025-26", "Nacional"),
        ("Bundesliga", "Alemanha", "62", "2025-26", "Nacional"),
        ("Ligue 1", "França", "88", "2025-26", "Nacional"),
    ]
    ry = iy + 54
    for i, c in enumerate(linhas):
        tabela = [c[0], c[1], c[2], c[3], c[4]]
        table_row(i, tabela, ry, cols, strong=True)
        ry += 34

    provenance("Competições estaduais ficam fora dos destaques por alcance regional — todas seguem no índice por país. Fonte: Wikidata (CC0).", 1080)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 2. CLUBE — a ficha mais rica do produto
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_clube():
    frame("Clube", h=1520)
    topbar(active=1)

    # Faixa de identidade: o clube ocupa a página inteira, em papel.
    txt("cl/k", "Clube · Rio de Janeiro · BR", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("cl/nome", "Clube de Regatas do Flamengo", M, 122, 62, INK, w=1000, lh=64)
    txt("cl/fund", "Fundado em 17 de novembro de 1895 · Maracanã · 40.988 sócios", M, 196, 800,
        14, INK_2, BODY)

    # Escudo + honrarias à direita: a "parede" que todo torcedor procura
    rect("cl/escudo", W - M - 132, 108, 132, 132, fill=SURFACE, cornerRadius=4,
         stroke=BORDER, strokeWeight=1)
    txt("cl/escudo/t", "escudo", W - M - 132, 168, 132, 11, INK_3, BODY, 500, align="center")

    y = 268
    rule("cl/rule", M, y, CONTENT, INK, 2)

    # Quatro pilares: o resumo que responde "quem é este clube" em 3 segundos
    pilares = [("Títulos", "48", "oficiais reconhecidos"), ("Jogos", "426", "no acervo"),
               ("Gols", "812", "marcados"), ("Fundação", "1895", "há 130 anos")]
    for i, (l, v, n) in enumerate(pilares):
        x = M + i * (CONTENT / 4)
        kicker(f"p/{l}/l", l, x, y + 16, INK_3, 260)
        num(f"p/{l}/v", v, x, y + 32, 44, CRIMSON if i == 0 else INK, w=260, align="left")
        txt(f"p/{l}/n", n, x, y + 82, 260, 11, INK_3, BODY)

    # Parede de honrarias: lista densa de títulos por competição
    hy = y + 124
    kicker("h/l", "Parede de honrarias", M, hy, INK, 700)
    txt("h/n", "48 títulos · 12 competições", W - M - 380, hy - 1, 380, 11, INK_3, BODY,
        500, align="right")
    cols = [("Competição", M, 460, "left"), ("Títulos", M + 480, 100, "right"),
            ("Anos", M + 600, 700, "left")]
    table_header(cols, hy + 26)
    honras = [
        ("Copa Libertadores da América", "3", "1981 · 2019 · 2022"),
        ("Campeonato Brasileiro", "8", "1980 · 1982 · 1983 · 1987 · 1992 · 2009 · 2019 · 2020"),
        ("Copa do Brasil", "5", "1990 · 2006 · 2013 · 2022 · 2024"),
        ("Copa Mercosul", "1", "1999"),
        ("Supercopa do Brasil", "3", "2020 · 2021 · 2025"),
        ("Copa dos Campeões", "1", "2001"),
    ]
    ry = hy + 52
    for i, h in enumerate(honras):
        table_row(i, h, ry, cols, strong=True)
        ry += 34

    # Timeline: o que faz o clube ser "história" e não "cadastro"
    ty = ry + 26
    rule("t/rule", M, ty, CONTENT, INK, 2)
    kicker("t/l", "Linha do tempo", M, ty + 12, INK, 700)
    marcos = [("1895", "Fundação no bairro do Flamengo"), ("1911", "Primeiro título carioca"),
              ("1981", "Libertadores e Mundial no mesmo ano"), ("2019", "A virada de 90 minutos"),
              ("2025", "Supercopa e a maior temporada da década")]
    mx = M
    for i, (ano, fato) in enumerate(marcos):
        w = (CONTENT - 24 * 4) / 5
        num(f"t/{i}/a", ano, mx, ty + 34, 30, CRIMSON, w=w, align="left")
        rule(f"t/{i}/f", mx, ty + 74, w - 20, BORDER, 1)
        txt(f"t/{i}/fato", fato, mx, ty + 84, w - 20, 12, INK_2, BODY, 400, lh=16)
        mx += w + 24


    # Elenco e últimos jogos: um perfil de clube sem plantel e sem resultado é uma ficha pela
    # metade. Estas duas tabelas são o que o torcedor abre a página para ver.
    sy = ty + 130
    rule("s/rule", M, sy, CONTENT, INK, 2)
    kicker("s/l", "Elenco · 2025", M, sy + 12, INK, 700)
    txt("s/n", "28 jogadores", W - M - 380, sy + 11, 380, 11, INK_3, BODY, 500,
        align="right")
    cols_e = [("Jogador", M, 360, "left"), ("Posição", M + 380, 200, "left"),
              ("Idade", M + 600, 90, "right"), ("Jogos", M + 710, 110, "right"),
              ("Gols", M + 840, 100, "right"), ("Contrato", M + 960, 220, "left")]
    table_header(cols_e, sy + 38)
    elenco = [
        ("Pedro", "Atacante", "28", "42", "19", "2027"),
        ("Arrascaeta", "Meia", "31", "38", "11", "2026"),
        ("Bruno Henrique", "Atacante", "34", "35", "14", "2026"),
        ("Léo Pereira", "Zagueiro", "29", "40", "2", "2027"),
        ("Rossi", "Goleiro", "30", "36", "0", "2026"),
    ]
    ey2 = sy + 64
    for i, e in enumerate(elenco):
        table_row(i, list(e), ey2, cols_e, strong=True)
        ey2 += 34

    my = ey2 + 24
    rule("u/rule", M, my, CONTENT, INK, 2)
    kicker("u/l", "Últimos jogos", M, my + 12, INK, 700)
    cols_m = [("Data", M, 130, "left"), ("Competição", M + 150, 240, "left"),
              ("Adversário", M + 410, 300, "left"), ("Placar", M + 730, 110, "left"),
              ("Casa", M + 860, 120, "left")]
    table_header(cols_m, my + 38)
    jogos = [
        ("26/10", "Brasileirão", "Palmeiras", "2 × 1", "Casa"),
        ("19/10", "Copa do Brasil", "Corinthians", "0 × 0", "Fora"),
        ("12/10", "Brasileirão", "Grêmio", "3 × 1", "Casa"),
        ("05/10", "Libertadores", "River Plate", "1 × 2", "Fora"),
    ]
    my2 = my + 64
    for i, j in enumerate(jogos):
        table_row(i, list(j), my2, cols_m, strong=True)
        my2 += 34

    provenance("Títulos conferidos contra a lista oficial do clube. Escudo com licença verificada no Wikimedia Commons (domínio público).", 1440)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 3. JOGADOR — ficha biográfica com carreira em tabela
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_jogador():
    frame("Jogador", h=1080)
    topbar(active=2)

    txt("j/k", "Jogador · atacante · Brasil", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("j/nome", "Edson Arantes do Nascimento", M, 122, 58, INK, w=900, lh=60)
    txt("j/aka", "Pelé · 1940–2022 · Santos, Brasil", M, 190, 700, 15, INK_2, BODY)

    # Retrato em moldura editorial, não em avatar redondo
    rect("j/foto", W - M - 220, 104, 220, 280, fill=SURFACE, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    txt("j/foto/t", "retrato", W - M - 220, 236, 220, 11, INK_3, BODY, 500, align="center")

    y = 340
    rule("j/rule", M, y, CONTENT, INK, 2)

    # Carreira: tabela é o produto. É o que o torcedor veio ver.
    kicker("c/l", "Carreira", M, y + 14, INK, 700)
    cols = [("Clube", M, 420, "left"), ("Período", M + 440, 160, "left"),
            ("Jogos", M + 620, 110, "right"), ("Gols", M + 750, 110, "right"),
            ("Média", M + 880, 120, "right")]
    table_header(cols, y + 40)
    carreira = [
        ("Santos FC", "1956–1974", "1.116", "1.091", "0,98"),
        ("New York Cosmos", "1975–1977", "107", "65", "0,61"),
        ("Seleção Brasileira", "1957–1971", "114", "95", "0,83"),
    ]
    ry = y + 66
    for i, c in enumerate(carreira):
        table_row(i, c, ry, cols, strong=True)
        ry += 34
    rule("c/total", M - 8, ry + 4, CONTENT + 16, INK, 2)
    txt("c/total/l", "Total", M, ry + 14, 420, 14, INK, BODY, 700)
    num("c/total/j", "1.337", M + 620, ry + 8, 20, INK, w=110)
    num("c/total/g", "1.251", M + 750, ry + 8, 20, CRIMSON, w=110)
    num("c/total/m", "0,94", M + 880, ry + 8, 20, INK, w=120)

    # Feitos: a narrativa, em lista curta e datada
    fy = ry + 74
    rule("f/rule", M, fy, CONTENT, INK, 2)
    kicker("f/l", "Feitos", M, fy + 12, INK, 700)
    feitos = [
        ("1958", "Campeão mundial aos 17 anos — o mais jovem da história"),
        ("1962", "Bicampeão mundial, eleito o melhor da competição"),
        ("1970", "Tricampeão com o time considerado o melhor de todos os tempos"),
        ("1961", "1.000º gol da carreira, no Maracanã"),
    ]
    fy2 = fy + 36
    for i, (ano, fato) in enumerate(feitos):
        num(f"f/{i}/a", ano, M, fy2 + 2, 22, CRIMSON, w=90, align="left")
        txt(f"f/{i}/t", fato, M + 110, fy2 + 6, 900, 13, INK_2, BODY)
        rule(f"f/{i}/l", M, fy2 + 30, CONTENT, BORDER, 1)
        fy2 += 40

    provenance("Estatística de carreira consolidada a partir de RSSSF e Wikidata. Divergência entre fontes é declarada na ficha da partida.", 1010)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 4. RANKINGS — a tabela é o produto
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_rankings():
    frame("Rankings", h=1240)
    topbar(active=3)
    y = ficha_head(
        "Rankings", "20", "edições publicadas",
        "Ranking · temporada 2025",
        "A pontuação soma títulos, campanhas e força de adversário. O critério vai aberto abaixo de cada coluna.",
        y=104,
    )

    cols = [("#", M, 50, "right"), ("Clube", M + 70, 360, "left"),
            ("País", M + 450, 130, "left"), ("Pts", M + 600, 90, "right"),
            ("Var.", M + 700, 80, "right"), ("Títulos", M + 800, 110, "right"),
            ("Últ. 5", M + 930, 280, "left")]
    table_header(cols, y + 20)

    dados = [
        ("1", "Real Madrid", "Espanha", "1.842", "—", "14", "V V E V V"),
        ("2", "Manchester City", "Reino Unido", "1.790", "▲2", "9", "V V V V E"),
        ("3", "Bayern de Munique", "Alemanha", "1.744", "▼1", "11", "V E V D V"),
        ("4", "Liverpool", "Reino Unido", "1.701", "▼1", "6", "E V V V V"),
        ("5", "Barcelona", "Espanha", "1.688", "▲1", "5", "V V D V V"),
        ("6", "Paris Saint-Germain", "França", "1.640", "▲3", "12", "V V V E V"),
        ("7", "Juventus", "Itália", "1.612", "▼2", "2", "E E V V D"),
        ("8", "Chelsea", "Reino Unido", "1.596", "—", "2", "V D V V E"),
        ("9", "Milan", "Itália", "1.580", "▲1", "7", "V V E V V"),
        ("10", "Flamengo", "Brasil", "1.552", "▲4", "3", "V V V V V"),
        ("11", "Palmeiras", "Brasil", "1.508", "▼3", "2", "V E V E V"),
        ("12", "Inter de Milão", "Itália", "1.494", "▼1", "3", "E V V D V"),
    ]
    ry = y + 48
    for i, d in enumerate(dados):
        table_row(i, list(d), ry, cols, strong=(i < 3))
        ry += 36

    # Nota do critério: o que faz o número ser confiável
    ny = ry + 22
    rect("nota/bg", M - 8, ny, CONTENT + 16, 76, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    kicker("nota/l", "Como a pontuação é calculada", M + 10, ny + 12, OCHRE, 700)
    txt("nota/t",
        "Títulos oficiais × peso de alcance (mundial 3 · continental 2 · nacional 1), somados a campanhas e força de adversário. O peso por competição é público e versionado.",
        M + 10, ny + 32, CONTENT - 40, 12, INK_2, BODY, 400, lh=17)

    provenance("Ranking publicado em 01/11/2026. A pontuação é recalculada a cada rodada; o histórico fica auditável por temporada.", 1150)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 5. LENDAS — a única superfície escura do produto
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_lendas():
    frame("Lendas", h=1180, fill=NIGHT)
    topbar(dark=True, active=5)

    txt("l/k", "Panteão · a memória do esporte", M, 104, 700, 10, NIGHT_INK3, BODY, 600, ls=2.2)
    display("l/titulo", "Lendas e Imortais", M, 122, 76, NIGHT_INK, w=900)
    txt("l/sub", "Os maiores jogadores, os maiores times e os recordes que definiram o esporte — cada feito com a fonte ao lado.",
        M, 214, 720, 15, NIGHT_INK2, BODY, 400, lh=22)
    rule("l/rule", M, 268, CONTENT, NIGHT_BORDER, 2)

    # Três números-âncora em ocre (o ouro do tema escuro)
    for i, (v, r) in enumerate([("1.284", "jogadores no panteão"), ("312", "títulos mundiais"),
                                 ("97", "recordes abertos")]):
        x = W - M - 760 + i * 260
        num(f"l/anc{i}", v, x, 276, 48, NIGHT_OCHRE, w=240, align="left")
        txt(f"l/anc{i}/r", r, x, 332, 240, 10, NIGHT_INK3, BODY, 600, ls=1.6)

    # Jogadores: ranking com retrato em moldura e feito à direita
    py = 372
    kicker("l/p/l", "Maiores jogadores da história", M, py, NIGHT_OCHRE, 700)
    jogadores = [
        ("1", "Pelé", "1940–2022", "3 Copas do Mundo · 1.279 gols em 1.363 jogos"),
        ("2", "Diego Maradona", "1960–2020", "1 Copa · 1986, o torneio de um homem só"),
        ("3", "Lionel Messi", "1987–", "8 Bolas de Ouro · 1 Copa · 4 Champions"),
        ("4", "Ronaldo Nazário", "1976–", "2 Copas · 2 Bolas de Ouro · 15 gols em Copas"),
        ("5", "Franz Beckenbauer", "1945–2024", "1 Copa como jogador e 1 como técnico"),
    ]
    jy = py + 30
    for i, (pos, nome, vida, feito) in enumerate(jogadores):
        num(f"l/j{i}/p", pos, M, jy + 8, 36, NIGHT_BORDER, w=50, align="left")
        rect(f"l/j{i}/foto", M + 62, jy + 2, 56, 56, fill=NIGHT_SURF, cornerRadius=28,
             stroke=NIGHT_BORDER, strokeWeight=1)
        txt(f"l/j{i}/n", nome, M + 138, jy + 6, 340, 26, NIGHT_INK, HEAD, 700)
        txt(f"l/j{i}/v", vida, M + 138, jy + 36, 200, 11, NIGHT_INK3, BODY)
        txt(f"l/j{i}/f", feito, M + 520, jy + 18, 560, 13, NIGHT_INK2, BODY)
        rule(f"l/j{i}/l", M, jy + 68, 1120, NIGHT_BORDER, 1)
        jy += 76

    # Recordes à direita: cartões escuros com número grande
    rx = W - M - 300
    kicker("l/r/l", "Recordes", rx, py, NIGHT_CRIMSON, 300)
    recordes = [("Gols numa temporada", "91", "Messi · 2012"),
                ("Títulos de liga", "13", "Gento · 1953–1971"),
                ("Maior público", "199.854", "Maracanã · 1950")]
    ry = py + 30
    for i, (rot, v, quem) in enumerate(recordes):
        rect(f"l/r{i}/bg", rx - 14, ry - 6, 300, 86, fill=NIGHT_SURF, cornerRadius=2,
             stroke=NIGHT_BORDER, strokeWeight=1)
        txt(f"l/r{i}/rot", rot, rx, ry + 2, 270, 10, NIGHT_INK3, BODY, 600, ls=1.4)
        num(f"l/r{i}/v", v, rx, ry + 20, 34, NIGHT_INK, w=270, align="left")
        txt(f"l/r{i}/quem", quem, rx, ry + 62, 270, 11, NIGHT_INK2, BODY)
        ry += 98

    # Times: faixa inferior
    ty = 830
    rule("l/t/rule", M, ty, CONTENT, NIGHT_BORDER, 2)
    kicker("l/t/l", "Maiores times da história", M, ty + 12, NIGHT_OCHRE, 700)
    times = [("Real Madrid", "14 Copas da Europa", "1902"), ("Milan", "7 Copas da Europa", "1899"),
             ("Bayern de Munique", "6 Copas da Europa", "1900"),
             ("Barcelona", "5 Copas da Europa", "1899"), ("Santos", "3 Mundiais · Pelé", "1912")]
    tx = M
    for i, (nome, feito, fund) in enumerate(times):
        w = (CONTENT - 16 * 4) / 5
        rect(f"l/t{i}", tx, ty + 34, w, 90, fill=NIGHT_SURF, cornerRadius=2,
             stroke=NIGHT_BORDER, strokeWeight=1)
        txt(f"l/t{i}/n", nome, tx + 16, ty + 50, w - 32, 17, NIGHT_INK, HEAD, 700)
        txt(f"l/t{i}/f", feito, tx + 16, ty + 76, w - 32, 11, NIGHT_CRIMSON, BODY, 600)
        txt(f"l/t{i}/a", f"desde {fund}", tx + 16, ty + 96, w - 32, 10, NIGHT_INK3, BODY)
        tx += w + 16

    provenance("Cada número traz a fonte que o comprova — feito sem procedência não entra no panteão.", 1120, dark=True)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 6. TABELA — classificação de liga
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_tabela():
    frame("Tabela", h=1180)
    topbar(active=0)
    y = ficha_head(
        "Premier League", "38", "rodadas · 2024-25",
        "Competição · classificação final",
        "Tabela acumulada com os critérios de desempate declarados. Pontos → saldo → gols pró.",
        y=104,
    )

    cols = [("#", M, 44, "right"), ("Clube", M + 60, 380, "left"),
            ("J", M + 460, 60, "right"), ("V", M + 530, 60, "right"),
            ("E", M + 600, 60, "right"), ("D", M + 670, 60, "right"),
            ("GP", M + 740, 60, "right"), ("GC", M + 810, 60, "right"),
            ("SG", M + 880, 70, "right"), ("Pts", M + 970, 80, "right"),
            ("Últ. 5", M + 1070, 200, "left")]
    table_header(cols, y + 24)

    tabela = [
        ("1", "Liverpool", "38", "25", "9", "4", "86", "41", "+45", "84", "V V V E V"),
        ("2", "Arsenal", "38", "20", "14", "4", "69", "34", "+35", "74", "E V V V E"),
        ("3", "Manchester City", "38", "21", "8", "9", "72", "44", "+28", "71", "D V V E V"),
        ("4", "Chelsea", "38", "20", "9", "9", "64", "43", "+21", "69", "V V E V V"),
        ("5", "Newcastle United", "38", "20", "6", "12", "68", "47", "+21", "66", "V D V V E"),
        ("6", "Aston Villa", "38", "19", "9", "10", "58", "51", "+7", "66", "E V V D V"),
        ("7", "Nottingham Forest", "38", "19", "8", "11", "58", "46", "+12", "65", "V E D V V"),
        ("8", "Brighton", "38", "16", "13", "9", "66", "59", "+7", "61", "E E V V E"),
        ("9", "Bournemouth", "38", "15", "11", "12", "58", "46", "+12", "56", "V V E D V"),
        ("10", "Brentford", "38", "16", "8", "14", "66", "57", "+9", "56", "D V E V E"),
        ("11", "Fulham", "38", "15", "9", "14", "54", "54", "0", "54", "V D V E D"),
        ("12", "Crystal Palace", "38", "13", "14", "11", "51", "51", "0", "53", "E V E V V"),
        ("13", "Everton", "38", "11", "15", "12", "42", "44", "-2", "48", "E E D V E"),
        ("14", "West Ham", "38", "12", "10", "16", "46", "62", "-16", "46", "D V E D V"),
        ("15", "Manchester United", "38", "11", "9", "18", "44", "54", "-10", "42", "D D V E D"),
        ("16", "Wolves", "38", "12", "6", "20", "54", "69", "-15", "42", "V D D E D"),
        ("17", "Tottenham", "38", "11", "5", "22", "64", "65", "-1", "38", "D V D D V"),
        ("18", "Leicester City", "38", "6", "7", "25", "33", "80", "-47", "25", "D D D E D"),
        ("19", "Ipswich Town", "38", "4", "10", "24", "36", "82", "-46", "22", "D D E D D"),
        ("20", "Southampton", "38", "2", "6", "30", "26", "86", "-60", "12", "D D D D E"),
    ]
    ry = y + 52
    for i, t in enumerate(tabela):
        table_row(i, list(t), ry, cols, strong=(i < 5))
        ry += 34

    # Legenda de zona: usa FORMA (barra de acento), não só cor
    ly = ry + 16
    zonas = [("Champions League", CRIMSON), ("Europa League", OCHRE), ("Rebaixamento", INK_3)]
    lx = M
    for i, (nome, cor) in enumerate(zonas):
        rect(f"leg/{i}/b", lx, ly + 3, 20, 3, fill=cor)
        txt(f"leg/{i}/t", nome, lx + 28, ly - 2, 200, 11, INK_2, BODY, 500)
        lx += 220

    provenance("Fonte: football-data. Partidas sem placar não entram na tabela — ausência não é 0×0.", 1120)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 7. PARTIDA — o placar como display
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_partida():
    frame("Partida", h=1000)
    topbar(active=0)

    txt("m/k", "Premier League · 2024-25 · Rodada 10", M, 104, 700, 10, INK_3, BODY, 600, ls=2.2)

    # Placar em display: números enormes em Barlow Condensed
    num("m/h", "0", W / 2 - 200, 128, 120, INK, w=120)
    txt("m/x", "×", W / 2 - 40, 168, 80, 44, INK_3, HEAD, 400, align="center")
    num("m/a", "9", W / 2 + 80, 128, 120, CRIMSON, w=120, align="left")

    txt("m/casa", "Southampton", W / 2 - 320, 268, 280, 22, INK, HEAD, 700, align="right")
    txt("m/fora", "Leicester City", W / 2 + 40, 268, 280, 22, INK, HEAD, 700)
    txt("m/quando", "25 de outubro de 2019 · St Mary's Stadium", M, 306, 600, 12, INK_2, BODY)

    rule("m/rule", M, 336, CONTENT, INK, 2)

    # Colunas: eventos, escalações, árbitro
    kicker("m/e/l", "Gols", M, 352, INK, 700)
    gols = [("8'", "Vardy"), ("17'", "Vardy"), ("28'", "Pérez"), ("39'", "Vardy"),
            ("45+2'", "Pérez"), ("57'", "Vardy"), ("61'", "Barnes"), ("85'", "Pérez")]
    gy = 376
    for i, (min_, quem) in enumerate(gols):
        num(f"m/g{i}/min", min_, M, gy, 15, CRIMSON, w=60, align="left")
        txt(f"m/g{i}/q", quem, M + 70, gy + 1, 200, 13, INK_2, BODY)
        rule(f"m/g{i}/l", M, gy + 22, 300, BORDER, 1)
        gy += 30

    # Escalações
    kicker("m/s/l", "Escalações", M + 420, 352, INK, 700)
    txt("m/s/casa", "Southampton", M + 420, 376, 320, 13, INK, BODY, 700)
    txt("m/s/casa/11", "McCarthy; Walker-Peters, Bednarek, Vestergaard, Bertrand; Ward-Prowse, Romeu, Højbjerg; Redmond, Ings, Boufal",
        M + 420, 396, 320, 11, INK_2, BODY, 400, lh=16)
    txt("m/s/fora", "Leicester City", M + 420, 476, 320, 13, INK, BODY, 700)
    txt("m/s/fora/11", "Schmeichel; Ricardo, Evans, Söyüncü, Chilwell; Ndidi, Tielemans; Pérez, Maddison, Barnes; Vardy",
        M + 420, 496, 320, 11, INK_2, BODY, 400, lh=16)

    # Ficha técnica
    kicker("m/f/l", "Ficha", M + 820, 352, INK, 300)
    ficha = [("Público", "31.120"), ("Árbitro", "Andre Marriner"), ("Estádio", "St Mary's"),
             ("Competição", "Premier League"), ("Rodada", "10"), ("Fonte", "football-data")]
    fy = 376
    for i, (rot, val) in enumerate(ficha):
        txt(f"m/f{i}/r", rot, M + 820, fy, 180, 10, INK_3, BODY, 600, ls=1.2)
        txt(f"m/f{i}/v", val, M + 820, fy + 14, 260, 13, INK_2, BODY)
        fy += 44

    provenance("Resultado verificado em duas fontes. É a maior goleada da competição no acervo (margem de 9 gols).", 940)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 8. COMPARAR — duas colunas, uma régua
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_comparar():
    frame("Comparar", h=1060)
    topbar(active=6)
    y = ficha_head(
        "Comparar", "2", "clubes lado a lado",
        "Comparação · histórico completo",
        "As métricas ficam na MESMA linha de base — comparar é ler na horizontal, não em dois cartões.",
        y=104,
    )

    # Cabeçalho dos dois lados
    txt("c/esq", "Flamengo", M, y + 8, 420, 34, INK, HEAD, 700)
    txt("c/esq/m", "Rio de Janeiro · BR · 1895", M, y + 46, 420, 11, INK_3, BODY)
    txt("c/dir", "Palmeiras", W - M - 420, y + 8, 420, 34, INK, HEAD, 700, align="right")
    txt("c/dir/m", "São Paulo · BR · 1914", W - M - 420, y + 46, 420, 11, INK_3, BODY,
        align="right")

    # Métricas na mesma linha: valor esquerda, rótulo centro, valor direita
    ey = y + 84
    metricas = [
        ("48", "Títulos oficiais", "42"),
        ("426", "Jogos no acervo", "438"),
        ("812", "Gols marcados", "798"),
        ("3", "Copas Libertadores", "3"),
        ("8", "Títulos brasileiros", "12"),
        ("40.988", "Sócios", "38.120"),
    ]
    for i, (esq, rot, dir_) in enumerate(metricas):
        if i % 2 == 0:
            rect(f"c/{i}/bg", M - 8, ey - 10, CONTENT + 16, 56, fill=SURFACE_2)
        num(f"c/{i}/e", esq, M, ey, 30, CRIMSON if i == 0 else INK, w=380, align="left")
        kicker(f"c/{i}/r", rot, W / 2 - 160, ey + 6, INK_3, 320)
        num(f"c/{i}/d", dir_, W - M - 380, ey, 30, INK, w=380, align="right")
        ey += 56

    provenance("Métricas contadas da mesma fonte para os dois clubes — comparar números de origens diferentes seria comparar réguas diferentes.", 950)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 9. MAPA — o mapa é fundo, a lista é o produto
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_mapa():
    frame("Mapa", h=1000)
    topbar(active=4)

    txt("mp/k", "Mapa · cobertura do acervo", M, 104, 700, 10, INK_3, BODY, 600, ls=2.2)
    display("mp/titulo", "O futebol no mapa", M, 122, 52, INK, w=700)
    txt("mp/sub", "12.017 clubes distribuídos em 220 países. A intensidade é a densidade do acervo, não a população.",
        M, 184, 640, 14, INK_2, BODY, 400, lh=20)

    # Área do mapa: bloco em surface-2 com grade de papel (o mapa real entra aqui)
    rect("mp/area", M, 240, 860, 520, fill=SURFACE_2, cornerRadius=2, stroke=BORDER,
         strokeWeight=1)
    txt("mp/area/t", "coropleto · Europe × South America", M + 24, 480, 800, 11, INK_3, BODY, 500)
    # grade de referência
    for i in range(1, 6):
        rule(f"mp/g/{i}", M, 240 + i * 86, 860, BORDER, 1)

    # Lista lateral: o mapa é fundo; o número é foreground
    lx = M + 900
    kicker("mp/l/l", "Por país · clubes", lx, 240, INK, 300)
    txt("mp/l/n", "220 países", W - M - 380, 239, 380, 11, INK_3, BODY, 500, align="right")
    paises = [("Suécia", "903", 100), ("Brasil", "817", 91), ("Portugal", "593", 66),
              ("Austrália", "554", 62), ("Turquia", "468", 52), ("Grécia", "404", 45),
              ("Reino Unido", "383", 43), ("Japão", "359", 40), ("Alemanha", "332", 37),
              ("Noruega", "332", 37), ("Polónia", "324", 36), ("Chéquia", "300", 33)]
    py = 268
    for i, (nome, n, pct) in enumerate(paises):
        txt(f"mp/{i}/n", nome, lx, py, 200, 13, INK, BODY, 500)
        num(f"mp/{i}/v", n, W - M - 90, py - 1, 15, INK_2, w=90)
        # Barra de intensidade — forma, não só cor
        rect(f"mp/{i}/bar", lx, py + 20, 300 * pct / 100, 2, fill=CRIMSON if i < 3 else INK_3)
        rule(f"mp/{i}/line", lx, py + 30, 300, BORDER, 1)
        py += 52

    provenance("Contagem pela coluna do filtro público. País sem clube no acervo não aparece — lacuna declarada, não inventada.", 800)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 10. ADMIN — o mesmo sistema, sem cenografia
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_admin():
    frame("Admin", h=940, fill=SURFACE_2)
    # Topo do admin: mais baixo, sem marca grande, densidade imediata
    rect("a/top", 0, 0, W, 52, fill=INK)
    txt("a/brand", "ALMANAQUE", M, 16, 240, 15, NIGHT_INK, HEAD, 700)
    txt("a/brand/2", "admin", M + 104, 18, 120, 11, NIGHT_INK3, BODY, 500)
    txt("a/env", "produção", W - M - 400, 18, 120, 11, NIGHT_OCHRE, BODY, 600, ls=1.2)
    txt("a/user", "edina@…", W - M - 200, 18, 200, 11, NIGHT_INK3, BODY, 400, align="right")

    # Cabeçalho de ficha, versão ferramenta: menor, sem número-âncora gigante
    txt("a/k", "Painel", M, 84, 400, 10, INK_3, BODY, 600, ls=2.2)
    display("a/titulo", "Operação", M, 100, 42, INK, w=600)
    txt("a/sub", "Estado do acervo, filas de ingestão e pendências de moderação.", M, 154, 700,
        13, INK_2, BODY)
    rule("a/rule", M, 186, CONTENT, INK, 2)

    # Quatro indicadores densos
    kpis = [("Clubes", "12.017", "+18 hoje"), ("Jogadores", "105.211", "+412 hoje"),
            ("Partidas", "17.265", "+0 hoje"), ("Filas pendentes", "3", "2 falhas · 1 parada")]
    for i, (rot, v, nota) in enumerate(kpis):
        x = M + i * (CONTENT / 4)
        kicker(f"a/kpi{i}/l", rot, x, 204, INK_3, 260)
        num(f"a/kpi{i}/v", v, x, 220, 34, CRIMSON if i == 3 else INK, w=260, align="left")
        txt(f"a/kpi{i}/n", nota, x, 262, 260, 10, INK_3, BODY)

    # Tabela de filas: o conteúdo real do admin
    rows = [("rsssf-won", "concluída", "12.417 linhas", "02/11 04:12"),
            ("football-data", "falhou", "timeout na fonte", "02/11 03:50"),
            ("wikidata-clubes", "parada", "aguardando operador", "01/11 22:10"),
            ("crest-library", "concluída", "11 escudos", "01/11 20:04")]
    cols = [("Fila", M, 320, "left"), ("Estado", M + 340, 160, "left"),
            ("Detalhe", M + 520, 480, "left"), ("Quando", M + 1020, 200, "right")]
    table_header(cols, 300)
    ry = 326
    for i, r in enumerate(rows):
        table_row(i, list(r), ry, cols, strong=True)
        # Ponto de estado: forma + texto, não só cor
        cor = CRIMSON if r[1] == "falhou" else (OCHRE if r[1] == "parada" else INK_3)
        rect(f"a/st{i}", M + 330, ry + 6, 6, 6, fill=cor, cornerRadius=3)
        ry += 34


    # Moderação e registro: um painel de operação sem fila de trabalho e sem log é um dashboard
    # de enfeite. Estas duas tabelas são onde o operador realmente age.
    my2 = ry + 26
    rule("a/mod/rule", M, my2, CONTENT, INK, 2)
    kicker("a/mod/l", "Moderação pendente", M, my2 + 12, INK, 700)
    txt("a/mod/n", "7 itens", W - M - 380, my2 + 11, 380, 11, INK_3, BODY, 500,
        align="right")
    cols_m = [("Tipo", M, 200, "left"), ("Alvo", M + 220, 380, "left"),
              ("Enviado por", M + 620, 280, "left"), ("Idade", M + 920, 120, "right"),
              ("Ação", M + 1060, 220, "left")]
    table_header(cols_m, my2 + 38)
    mods = [
        ("Descrição", "SE Palmeiras", "comunidade", "2 h", "revisar"),
        ("Escudo", "Real Betis", "comunidade", "5 h", "revisar"),
        ("Posse", "Racing Club", "clube oficial", "1 d", "aprovar"),
        ("Descrição", "Vasco da Gama", "comunidade", "1 d", "revisar"),
    ]
    my3 = my2 + 64
    for i, m in enumerate(mods):
        table_row(i, list(m), my3, cols_m, strong=True)
        my3 += 34

    ly2 = my3 + 24
    rule("a/log/rule", M, ly2, CONTENT, INK, 2)
    kicker("a/log/l", "Últimas ações", M, ly2 + 12, INK, 700)
    logs = [
        ("02/11 04:12", "rsssf-won", "12.417 linhas aplicadas"),
        ("02/11 03:50", "football-data", "falhou — timeout na fonte, 3 tentativas"),
        ("01/11 22:10", "wikidata-clubes", "pausada pelo operador"),
        ("01/11 20:04", "crest-library", "11 escudos com licença verificada"),
    ]
    ly3 = ly2 + 38
    for i, (quando, fila, o_que) in enumerate(logs):
        txt(f"a/lg{i}/q", quando, M, ly3, 160, 11, INK_3, BODY, 500)
        txt(f"a/lg{i}/f", fila, M + 180, ly3, 200, 11, INK, BODY, 600)
        txt(f"a/lg{i}/o", o_que, M + 400, ly3, 820, 11, INK_2, BODY)
        rule(f"a/lg{i}/l", M, ly3 + 20, CONTENT, BORDER, 1)
        ly3 += 28

    provenance("Admin não é vitrine: sem faixa escura, sem número-âncora. Mesmos tokens, mesma régua tipográfica, densidade maior.", 900)


PAGES = [
    ("competicoes", p_competicoes),
    ("clube", p_clube),
    ("jogador", p_jogador),
    ("rankings", p_rankings),
    ("lendas", p_lendas),
    ("tabela", p_tabela),
    ("partida", p_partida),
    ("comparar", p_comparar),
    ("mapa", p_mapa),
    ("admin", p_admin),
]


def build(nome):
    cmd.clear()
    dict(PAGES)[nome]()
    return list(cmd)


if __name__ == "__main__":
    alvo = sys.argv[1] if len(sys.argv) > 1 else "todas"
    saida = sys.argv[2] if len(sys.argv) > 2 else None
    if alvo == "todas":
        dados = {n: build(n) for n, _ in PAGES}
    else:
        dados = build(alvo)
    texto = json.dumps(dados, ensure_ascii=False, indent=1)
    if saida:
        open(saida, "w", encoding="utf-8").write(texto)
    else:
        sys.stdout.write(texto)
