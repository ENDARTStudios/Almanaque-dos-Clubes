"""
Sistema FICHA v3 — as 15 pendências apontadas pelo Operador.

Cada função aqui resolve um item numerado da lista. O que existe hoje no site NÃO é removido:
o que falta é acrescentado, dentro da mesma espinha (kicker, título, âncora, fio, corpo, fonte).

Primitivas de gráfico, troféu, medalha, bandeira e globo vêm de `ficha_visual`.
"""

from ficha import (
    cmd, frame, rect, txt, rule, kicker, display, num, table_header, table_row,
    topbar, ficha_head, provenance,
    PAPER, SURFACE, SURFACE_2, MUTED, BORDER, INK, INK_2, INK_3,
    CRIMSON, CRIMSON_INK, OCHRE,
    NIGHT, NIGHT_SURF, NIGHT_SURF2, NIGHT_BORDER, NIGHT_INK, NIGHT_INK2, NIGHT_INK3,
    NIGHT_CRIMSON, NIGHT_OCHRE,
    HEAD, BODY, W, M, CONTENT,
)
import ficha_visual as V


# ═════════════════════════════════════════════════════════════════════════════════════════
# 5. HOME — globo gigante em linhas mesclado a bola, logo, frase e CTA reais
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_home():
    frame("Home", h=900)
    topbar(active=-1)

    # Globo à direita, sangrando fora da moldura — é o que dá escala
    V.globo_bola("h/globo", 1102, 362, 248, INK, CRIMSON, peso=0.95)

    # Bloco de abertura: frase real + subtítulo real + dois CTAs reais.
    # A marca fica só na topbar — repetir aqui era ruído.
    txt("h/k", "Almanaque dos Clubes · desde 2024", M, 108, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("h/t1", "A História do Futebol", M, 130, 62, INK, w=700, lh=64)
    display("h/t2", "num Só Lugar", M, 196, 62, CRIMSON, w=700, lh=64)

    txt("h/sub",
        "Clubes, jogadores, competições e rankings do futebol mundial em números: títulos, recordes "
        "e história — com a origem de cada dado documentada.",
        M, 280, 560, 15, INK_2, BODY, 400, lh=23)

    # CTA: primário em tinta cheia, secundário em fio. Não são duas pílulas iguais.
    rect("h/cta1", M, 360, 216, 52, fill=INK, cornerRadius=2)
    txt("h/cta1/t", "Começar Pesquisa", M + 24, 375, 180, 14, "#faf8f5", BODY, 600)
    txt("h/cta1/s", "→", M + 180, 374, 24, 15, CRIMSON, BODY, 600)
    rect("h/cta2", M + 232, 360, 232, 52, fill=None, stroke=INK, strokeWeight=1.5,
         cornerRadius=2)
    txt("h/cta2/t", "Criar Conta Gratuita", M + 256, 375, 196, 14, INK, BODY, 600)
    txt("h/cta3", "explorar sem conta →", M + 24, 430, 300, 11, INK_3, BODY, 500)

    # Números do acervo em faixa, sobre o globo
    stats = [("Clubes", "12.017"), ("Jogadores", "105.211"), ("Competições", "1.932"),
             ("Partidas", "17.265"), ("Rankings", "72")]
    sy = 500
    rule("h/s/rule", M, sy, 700, INK, 2)
    for i, (l, v) in enumerate(stats):
        x = M + i * (700 / 5)
        kicker(f"h/s{i}/l", l, x, sy + 12, INK_3, 130)
        num(f"h/s{i}/v", v, x, sy + 26, 24, CRIMSON if i == 0 else INK, w=130, align="left")

    # "Comece por onde quiser" — o índice que liga tudo
    ey = sy + 78
    kicker("h/e/l", "Comece por onde quiser", M, ey, INK, 700)
    display("h/e/t", "O acervo é a interface", M, ey + 18, 34, INK, w=600)
    portas = [("Clubes & seleções", "12.017", "BR"), ("Competições", "1.932", "SE"),
              ("Jogadores", "105.211", "AR"), ("Rankings", "72", "GB"),
              ("Lendas", "1.284", "PT"), ("Mapa-múndi", "220", "AU")]
    px, py = M, ey + 68
    for i, (nome, n, iso) in enumerate(portas):
        w = (CONTENT - 16 * 2) / 3
        if i == 3:
            px, py = M, py + 96
        rect(f"h/p{i}", px, py, w, 80, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        V.bandeira(iso, px + 16, py + 18, 24, 16)
        txt(f"h/p{i}/n", nome, px + 52, py + 14, w - 68, 15, INK, HEAD, 700)
        num(f"h/p{i}/v", n, px + 16, py + 42, 26, CRIMSON, w=w - 32, align="left")
        px += w + 16

    provenance("Totais reais do acervo, buscados no servidor. Falha de origem vira lacuna declarada, nunca estimativa.", 830)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 1. COMPETIÇÕES — filtro por país, imagem do troféu e medalhas
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_competicoes():
    frame("Competições", h=1300)
    topbar(active=0)
    y = ficha_head(
        "Competições", "1.932", "competições catalogadas",
        "Acervo · filtro por país, tipo e alcance",
        "Do mundial ao estadual, com o troféu de cada uma e o alcance em que ela decide.",
        y=104,
    )

    # Filtros — o pedido nº 1: filtro por PAÍS com bandeira, ao lado de tipo e alcance
    kicker("c/f/l", "Filtros", M, y + 8, INK, 700)
    grupos = [
        ("País", [("BR", "Brasil", True), ("PT", "Portugal", False), ("GB", "Reino Unido", False),
                  ("ES", "Espanha", False), ("IT", "Itália", False)]),
        ("Tipo", [("", "Liga", True), ("", "Copa", False), ("", "Supercopa", False)]),
        ("Alcance", [("", "Mundial", False), ("", "Continental", True), ("", "Nacional", False)]),
    ]
    fy = y + 30
    for rotulo, opcoes in grupos:
        txt(f"c/f/{rotulo}/r", rotulo, M, fy + 8, 80, 10, INK_3, BODY, 600, ls=1.6)
        ox = M + 90
        for i, (iso, nome, ativo) in enumerate(opcoes):
            larg = 44 + len(nome) * 7.2 + (26 if iso else 0)
            rect(f"c/f/{rotulo}/{i}", ox, fy, larg, 30, fill=INK if ativo else SURFACE,
                 cornerRadius=2, stroke=INK if ativo else BORDER, strokeWeight=1)
            if iso:
                V.bandeira(iso, ox + 12, fy + 8, 20, 14)
            txt(f"c/f/{rotulo}/{i}/t", nome, ox + (38 if iso else 14), fy + 7, larg - 50, 12,
                "#faf8f5" if ativo else INK_2, BODY, 600 if ativo else 500)
            ox += larg + 8
        fy += 40

    # Destaques com TROFÉU desenhado — o pedido "imagem do troféu"
    dy = y + 158
    kicker("c/d/l", "Destaques · por alcance", M, dy, OCHRE, 700)
    destaques = [
        ("FIFA World Cup", "1930 · 23 edições", "Mundial", 32),
        ("UEFA Champions League", "1955 · 71 edições", "Continental", 26),
        ("Copa Libertadores", "1960 · 66 edições", "Continental", 26),
        ("Premier League", "1992 · 34 edições", "Nacional", 20),
    ]
    dx = M
    for i, (nome, meta, alcance, th) in enumerate(destaques):
        w = (CONTENT - 16 * 3) / 4
        borda = OCHRE if alcance == "Mundial" else BORDER
        peso = 2 if alcance == "Mundial" else 1
        rect(f"c/d{i}", dx, dy + 22, w, 196, fill=SURFACE, cornerRadius=2, stroke=borda,
             strokeWeight=peso)
        V.trofeu(f"c/d{i}/trof", dx + w / 2 - th * 0.33, dy + 36, th,
                 OCHRE if alcance == "Mundial" else (CRIMSON if i < 3 else INK_3))
        txt(f"c/d{i}/n", nome, dx + 16, dy + 122, w - 32, 17, INK, HEAD, 700, lh=19)
        txt(f"c/d{i}/m", meta, dx + 16, dy + 166, w - 32, 11, INK_3, BODY)
        txt(f"c/d{i}/a", alcance, dx + 16, dy + 186, w - 32, 10, OCHRE, BODY, 600, ls=1.2)
        dx += w + 16

    # MEDALHAS — o 2º pedido do item 1. Cada degrau tem sua peça.
    my = dy + 248
    rule("c/m/rule", M, my, CONTENT, INK, 2)
    kicker("c/m/l", "Pódio da última edição · medals", M, my + 12, INK, 700)
    txt("c/m/n", "Copa do Mundo 2022", W - M - 380, my + 11, 380, 11, INK_3, BODY, 500,
        align="right")
    podio = [("Argentina", "Campeão", CRIMSON, "3"), ("França", "Vice-campeão", OCHRE, "2"),
             ("Croácia", "3º lugar", INK_3, "3")]
    mx = M
    for i, (pais, titulo, cor, t) in enumerate(podio):
        w = (CONTENT - 16 * 2) / 3
        rect(f"c/m{i}", mx, my + 36, w, 104, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        V.medalha(f"c/m{i}/med", mx + 20, my + 52, 40, cor)
        txt(f"c/m{i}/p", pais, mx + 80, my + 54, w - 96, 18, INK, HEAD, 700)
        txt(f"c/m{i}/t", titulo, mx + 80, my + 80, w - 96, 11, cor, BODY, 600, )
        txt(f"c/m{i}/x", f"{t} títulos no total", mx + 80, my + 98, w - 96, 10, INK_3, BODY)
        mx += w + 16

    # Índice com troféu miniatura por linha
    iy = my + 168
    rule("c/i/rule", M, iy, CONTENT, INK, 2)
    kicker("c/i/l", "Índice completo", M, iy + 12, INK, 700)
    cols = [("", M, 40, "left"), ("Competição", M + 44, 480, "left"),
            ("País", M + 540, 200, "left"), ("Edições", M + 760, 110, "right"),
            ("Última", M + 880, 120, "right"), ("Alcance", M + 1010, 220, "left")]
    table_header(cols, iy + 40)
    linhas = [
        ("UEFA Champions League", "Europa", "71", "2025-26", "Continental"),
        ("Copa Libertadores", "América do Sul", "66", "2025", "Continental"),
        ("Premier League", "Reino Unido", "34", "2025-26", "Nacional"),
        ("La Liga", "Espanha", "95", "2025-26", "Nacional"),
        ("Brasileirão Série A", "Brasil", "69", "2025", "Nacional"),
        ("Copa do Brasil", "Brasil", "37", "2025", "Nacional"),
    ]
    ry = iy + 66
    for i, c in enumerate(linhas):
        table_row(i, ["", c[0], c[1], c[2], c[3], c[4]], ry, cols, strong=True)
        V.trofeu(f"c/i{i}/trof", M + 6, ry - 4, 22,
                 OCHRE if c[4] == "Continental" else INK_3)
        ry += 34

    provenance("Competição estadual fica fora dos destaques por alcance regional, mas segue no índice por país. Troféu é ilustração do sistema, não a imagem oficial.", 1230)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 2. LENDAS — clubes E jogadores, recordes, estatísticas, métricas, gráficos
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_lendas():
    frame("Lendas", h=1500, fill=NIGHT)
    topbar(dark=True, active=5)

    txt("l/k", "Panteão · jogadores e clubes", M, 104, 700, 10, NIGHT_INK3, BODY, 600, ls=2.2)
    display("l/titulo", "Lendas e Imortais", M, 122, 72, NIGHT_INK, w=760)
    txt("l/sub", "Os maiores jogadores e os maiores clubes, com os recordes que definiram o esporte — cada feito com a fonte ao lado.",
        M, 206, 700, 15, NIGHT_INK2, BODY, 400, lh=22)
    rule("l/rule", M, 258, CONTENT, NIGHT_BORDER, 2)

    # Métricas gerais — o item pede estatísticas e métricas
    ms = [("Jogadores", "1.284"), ("Clubes", "312"), ("Títulos", "2.046"),
          ("Recordes", "97"), ("Países", "64")]
    for i, (l, v) in enumerate(ms):
        x = M + i * (CONTENT / 5)
        kicker(f"l/m{i}/l", l, x, 272, NIGHT_INK3, 200)
        num(f"l/m{i}/v", v, x, 288, 34, NIGHT_OCHRE if i == 0 else NIGHT_INK, w=200, align="left")

    # JOGADORES — ranking com retrato
    py = 348
    kicker("l/j/l", "Maiores jogadores", M, py, NIGHT_OCHRE, 700)
    jogadores = [
        ("1", "Pelé", "1940–2022", "3 Copas · 1.279 gols"),
        ("2", "Diego Maradona", "1960–2020", "1 Copa · 1986"),
        ("3", "Lionel Messi", "1987–", "1 Copa · 8 Bolas de Ouro"),
        ("4", "Ronaldo Nazário", "1976–", "2 Copas · 15 gols em Copas"),
        ("5", "Beckenbauer", "1945–2024", "1 Copa jogador · 1 técnico"),
    ]
    jy = py + 28
    for i, (pos, nome, vida, feito) in enumerate(jogadores):
        num(f"l/j{i}/p", pos, M, jy + 6, 30, NIGHT_BORDER, w=44, align="left")
        rect(f"l/j{i}/f", M + 54, jy, 46, 46, fill=NIGHT_SURF, cornerRadius=23,
             stroke=NIGHT_BORDER, strokeWeight=1)
        txt(f"l/j{i}/n", nome, M + 118, jy + 4, 300, 22, NIGHT_INK, HEAD, 700)
        txt(f"l/j{i}/v", vida, M + 118, jy + 30, 200, 10, NIGHT_INK3, BODY)
        txt(f"l/j{i}/f2", feito, M + 430, jy + 14, 380, 12, NIGHT_INK2, BODY)
        rule(f"l/j{i}/l", M, jy + 56, 820, NIGHT_BORDER, 1)
        jy += 62

    # CLUBES — o item 2 pede clubes também
    cy = 672
    rule("l/c/rule", M, cy, CONTENT, NIGHT_BORDER, 2)
    kicker("l/c/l", "Maiores clubes", M, cy + 12, NIGHT_OCHRE, 700)
    clubes = [("1", "Real Madrid", "14 Copas da Europa", "1902"),
              ("2", "Milan", "7 Copas da Europa", "1899"),
              ("3", "Bayern de Munique", "6 Copas da Europa", "1900"),
              ("4", "Barcelona", "5 Copas da Europa", "1899"),
              ("5", "Santos", "3 Mundiais · Pelé", "1912")]
    cx2 = M
    for i, (pos, nome, feito, fund) in enumerate(clubes):
        w = (CONTENT - 16 * 4) / 5
        rect(f"l/c{i}", cx2, cy + 34, w, 104, fill=NIGHT_SURF, cornerRadius=2,
             stroke=NIGHT_BORDER, strokeWeight=1)
        num(f"l/c{i}/p", pos, cx2 + 14, cy + 44, 18, NIGHT_BORDER, w=30, align="left")
        txt(f"l/c{i}/n", nome, cx2 + 14, cy + 68, w - 28, 15, NIGHT_INK, HEAD, 700)
        txt(f"l/c{i}/f", feito, cx2 + 14, cy + 92, w - 28, 10, NIGHT_CRIMSON, BODY, 600)
        txt(f"l/c{i}/a", f"desde {fund}", cx2 + 14, cy + 112, w - 28, 9, NIGHT_INK3, BODY)
        cx2 += w + 16

    # GRÁFICOS — o item 2 pede gráficos explicitamente
    gy = cy + 162
    rule("l/g/rule", M, gy, CONTENT, NIGHT_BORDER, 2)
    kicker("l/g/l", "O panteão em números", M, gy + 12, NIGHT_OCHRE, 700)

    # 1. gols por década do maior artilheiro
    txt("l/g1/t", "Gols de Pelé por década", M, gy + 40, 400, 11, NIGHT_INK2, BODY, 600)
    V.barras("l/g1", [("1950s", 243), ("1960s", 522), ("1970s", 386), ("1980s", 128)],
             M, gy + 62, 400, 150, cor=NIGHT_CRIMSON, cor_base=NIGHT_BORDER)

    # 2. títulos por país
    txt("l/g2/t", "Clubes no panteão por país", M + 460, gy + 40, 400, 11, NIGHT_INK2, BODY, 600)
    V.barras("l/g2", [("ESP", 84), ("ITA", 62), ("ING", 58), ("ALE", 46), ("BRA", 34),
                      ("ARG", 28), ("FRA", 22)],
             M + 460, gy + 62, 400, 150, horizontal=True, cor=NIGHT_OCHRE,
             cor_base=NIGHT_BORDER)

    # 3. donut de recordes por tipo
    txt("l/g3/t", "Recordes por tipo", M + 960, gy + 40, 340, 11, NIGHT_INK2, BODY, 600)
    V.donut("l/g3", [("Gols", 42, NIGHT_CRIMSON), ("Títulos", 31, NIGHT_OCHRE),
                     ("Público", 14, NIGHT_INK3), ("Outros", 13, NIGHT_BORDER)],
            M + 960, gy + 62, 120, 14)
    leg = [("Gols", "42", NIGHT_CRIMSON), ("Títulos", "31", NIGHT_OCHRE),
           ("Público", "14", NIGHT_INK3), ("Outros", "13", NIGHT_BORDER)]
    for i, (rot, val, cor) in enumerate(leg):
        rect(f"l/g3/l{i}/b", M + 1100, gy + 74 + i * 22, 10, 10, fill=cor)
        txt(f"l/g3/l{i}/r", rot, M + 1118, gy + 72 + i * 22, 120, 10, NIGHT_INK2, BODY)
        num(f"l/g3/l{i}/v", val, M + 1240, gy + 70 + i * 22, 12, NIGHT_INK, 40)

    # RECORDES em cartões
    ry = gy + 232
    rule("l/r/rule", M, ry, CONTENT, NIGHT_BORDER, 2)
    kicker("l/r/l", "Recordes", M, ry + 12, NIGHT_CRIMSON, 700)
    recordes = [("Mais gols numa temporada", "91", "Messi · 2012"),
                ("Mais títulos de liga", "13", "Gento · 1953–71"),
                ("Maior público", "199.854", "Maracanã · 1950"),
                ("Mais gols em Copas", "15", "Ronaldo · 1998–2006")]
    rx = M
    for i, (rot, v, quem) in enumerate(recordes):
        w = (CONTENT - 16 * 3) / 4
        rect(f"l/r{i}", rx, ry + 34, w, 92, fill=NIGHT_SURF, cornerRadius=2,
             stroke=NIGHT_BORDER, strokeWeight=1)
        txt(f"l/r{i}/rot", rot, rx + 14, ry + 48, w - 28, 10, NIGHT_INK3, BODY, 600, ls=1.2)
        num(f"l/r{i}/v", v, rx + 14, ry + 66, 28, NIGHT_INK, w=w - 28, align="left")
        txt(f"l/r{i}/q", quem, rx + 14, ry + 104, w - 28, 10, NIGHT_INK2, BODY)
        rx += w + 16

    provenance("Cada número traz a fonte que o comprova — feito sem procedência não entra no panteão.", 1440, dark=True)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 3. PARTIDAS — filtro inteligente + estatísticas de jogo
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_partidas():
    frame("Partidas", h=1240)
    topbar(active=0)
    y = ficha_head(
        "Partidas", "17.265", "partidas catalogadas",
        "Acervo · filtro inteligente",
        "Filtre por competição, temporada, time e resultado — e veja a estatística de cada jogo.",
        y=104,
    )

    # Filtro inteligente: 4 eixos + resultado
    fy = y + 10
    filtros = [
        ("Competição", "Premier League", True),
        ("Temporada", "2024-25", True),
        ("Time", "Leicester City", True),
        ("Resultado", "Todos", False),
    ]
    fx = M
    for i, (rot, val, ativo) in enumerate(filtros):
        w = 300
        rect(f"p/f{i}", fx, fy, w, 52, fill=SURFACE, cornerRadius=2,
             stroke=INK if ativo else BORDER, strokeWeight=1.5 if ativo else 1)
        txt(f"p/f{i}/r", rot.upper(), fx + 14, fy + 8, w - 28, 9, INK_3, BODY, 600, ls=1.4)
        txt(f"p/f{i}/v", val, fx + 14, fy + 24, w - 44, 14, INK, BODY, 600)
        txt(f"p/f{i}/s", "▾", fx + w - 26, fy + 22, 20, 10, INK_3, BODY)
        fx += w + 12

    # Chips de recorte ativo
    cy = fy + 68
    ativos = ["Leicester City", "2024-25", "Premier League", "com placar"]
    ax = M
    for i, a in enumerate(ativos):
        w = 30 + len(a) * 7.2
        rect(f"p/c{i}", ax, cy, w, 26, fill=SURFACE_2, cornerRadius=13, stroke=BORDER,
             strokeWeight=1)
        txt(f"p/c{i}/t", f"{a} ×", ax + 14, cy + 6, w - 24, 11, INK_2, BODY, 500)
        ax += w + 8
    txt("p/limpar", "limpar tudo", ax + 10, cy + 6, 120, 11, CRIMSON, BODY, 600)

    # Lista de partidas com estatística embutida
    ly = cy + 46
    rule("p/l/rule", M, ly, CONTENT, INK, 2)
    kicker("p/l/l", "Resultados", M, ly + 12, INK, 700)
    txt("p/l/n", "32 partidas encontradas", W - M - 380, ly + 11, 380, 11, INK_3, BODY, 500,
        align="right")

    partidas = [
        ("09/08", "Leicester City", "1 × 1", "Tottenham", "Casa", "44%", "8", "5"),
        ("17/08", "Fulham", "1 × 2", "Leicester City", "Fora", "48%", "11", "6"),
        ("24/08", "Leicester City", "0 × 3", "Aston Villa", "Casa", "41%", "7", "3"),
        ("31/08", "Everton", "2 × 0", "Leicester City", "Fora", "39%", "6", "2"),
    ]
    my = ly + 40
    for i, p in enumerate(partidas):
        rect(f"p/m{i}", M, my, CONTENT, 62, fill=SURFACE if i % 2 == 0 else SURFACE_2)
        txt(f"p/m{i}/d", p[0], M + 12, my + 12, 70, 10, INK_3, BODY, 500)
        txt(f"p/m{i}/c", p[4], M + 12, my + 30, 70, 10, INK_3, BODY)
        txt(f"p/m{i}/h", p[1], M + 96, my + 20, 260, 14, INK, BODY, 600)
        num(f"p/m{i}/s", p[2], M + 370, my + 16, 18, CRIMSON, w=90, align="center")
        txt(f"p/m{i}/a", p[3], M + 476, my + 20, 260, 14, INK, BODY, 600)
        # estatística de jogo: posse, finalizações, escanteios
        stats = [("Posse", p[5]), ("Finalizações", p[6]), ("Escanteios", p[7])]
        sx = M + 780
        for j, (rot, val) in enumerate(stats):
            txt(f"p/m{i}/s{j}/r", rot, sx + j * 130, my + 12, 120, 9, INK_3, BODY, 500)
            txt(f"p/m{i}/s{j}/v", val, sx + j * 130, my + 26, 120, 13, INK, BODY, 600)
        txt(f"p/m{i}/seta", "→", W - M - 26, my + 20, 24, 14, CRIMSON, BODY, 600,
            align="right")
        rule(f"p/m{i}/l", M, my + 62, CONTENT, BORDER, 1)
        my += 62

    # Estatística agregada do recorte
    sy = my + 16
    rect("p/s/bg", M - 8, sy, CONTENT + 16, 104, fill=SURFACE, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    kicker("p/s/l", "Estatística do recorte", M + 12, sy + 12, INK, 700)
    ags = [("Aproveitamento", "25%"), ("Gols marcados", "3"), ("Gols sofridos", "7"),
           ("Média de posse", "43%")]
    for i, (l, v) in enumerate(ags):
        x = M + 12 + i * 320
        txt(f"p/s{i}/l", l, x, sy + 40, 280, 10, INK_3, BODY, 500)
        num(f"p/s{i}/v", v, x, sy + 54, 26, CRIMSON if i == 0 else INK, w=280, align="left")

    provenance("Partida sem placar entra na lista mas não nos agregados: ausência não é 0×0.", 1170)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 4. MAPA — filtro por país, estado e cidade com bandeiras
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_mapa():
    frame("Mapa", h=1120)
    topbar(active=4)
    y = ficha_head(
        "O futebol no mapa", "12.017", "clubes no acervo",
        "Mapa-múndi · cobertura por país, estado e cidade",
        "A intensidade é a densidade do acervo, não a população. Bandeira, estado e cidade em cada nível.",
        y=104,
    )

    # Filtro em três níveis, com bandeira
    fy = y + 8
    niveis = [("País", "Brasil", "BR", True), ("Estado", "São Paulo", "BR", True),
              ("Cidade", "Todas", "", False)]
    fx = M
    for i, (rot, val, iso, ativo) in enumerate(niveis):
        w = 400
        rect(f"m/f{i}", fx, fy, w, 56, fill=SURFACE, cornerRadius=2,
             stroke=INK if ativo else BORDER, strokeWeight=1.5 if ativo else 1)
        if iso:
            V.bandeira(iso, fx + 14, fy + 20, 26, 17)
        txt(f"m/f{i}/r", rot.upper(), fx + (48 if iso else 14), fy + 9, w - 70, 9, INK_3,
            BODY, 600, ls=1.4)
        txt(f"m/f{i}/v", val, fx + (48 if iso else 14), fy + 24, w - 70, 15, INK, BODY, 600)
        txt(f"m/f{i}/s", "▾", fx + w - 26, fy + 24, 20, 10, INK_3, BODY)
        fx += w + 12

    # Área do mapa
    my = fy + 76
    rect("m/area", M, my, 860, 620, fill=SURFACE_2, cornerRadius=2, stroke=BORDER,
         strokeWeight=1)
    # grade de referencia
    for i in range(1, 5):
        rule(f"m/g/{i}", M, my + i * 124, 860, BORDER, 1)
    for i in range(1, 6):
        rect(f"m/gv/{i}", M + i * 143, my, 1, 620, fill=BORDER)
    txt("m/area/t", "coropleto · densidade do acervo", M + 20, my + 16, 400, 11, INK_3, BODY, 500)
    # legenda de intensidade
    for i, op in enumerate([0.85, 0.6, 0.4, 0.25, 0.12]):
        rect(f"m/leg/{i}", M + 20 + i * 26, my + 580, 22, 12, fill=CRIMSON, opacity=op)
    txt("m/leg/t", "menos", M + 20, my + 598, 60, 9, INK_3, BODY)
    txt("m/leg/t2", "mais", M + 142, my + 598, 60, 9, INK_3, BODY)

    # Lista lateral: os três níveis com bandeira por estado/cidade
    lx = M + 900
    kicker("m/p/l", "Estados · 27 no Brasil", lx, my, INK, 300)
    txt("m/p/n", "463 clubes", W - M - 380, my - 1, 380, 11, INK_3, BODY, 500, align="right")
    estados = [("SP", "São Paulo", "78", 100), ("RJ", "Rio de Janeiro", "71", 91),
               ("RS", "Rio Grande do Sul", "42", 54), ("MG", "Minas Gerais", "36", 46),
               ("PR", "Paraná", "30", 38), ("SC", "Santa Catarina", "27", 35),
               ("BA", "Bahia", "25", 32), ("CE", "Ceará", "21", 27)]
    ey = my + 26
    for i, (uf, nome, n, pct) in enumerate(estados):
        # bandeira do estado: o Brasil não tem UF com bandeira própria uniforme — usa-se o
        # código UF como marca, e a bandeira nacional fica no nível do país
        rect(f"m/e{i}/uf", lx, ey, 30, 18, fill=INK if i == 0 else SURFACE_2,
             cornerRadius=2, stroke=BORDER, strokeWeight=1)
        txt(f"m/e{i}/uf/t", uf, lx, ey + 3, 30, 9, "#faf8f5" if i == 0 else INK_2, BODY,
            600, align="center")
        txt(f"m/e{i}/n", nome, lx + 40, ey + 1, 200, 13, INK, BODY, 600 if i == 0 else 500)
        num(f"m/e{i}/v", n, W - M - 70, ey, 14, INK_2, w=70)
        rect(f"m/e{i}/bar", lx, ey + 22, 300 * pct / 100, 2, fill=CRIMSON if i < 3 else INK_3)
        ey += 44

    # Cidades com bandeira do país
    cy2 = ey + 18
    rule("m/c/rule", lx, cy2, CONTENT - 900, INK, 2)
    kicker("m/c/l", "Cidades em São Paulo · 38", lx, cy2 + 12, CRIMSON, 300)
    cidades = [("São Paulo", "12"), ("Araraquara", "4"), ("Campinas", "3"),
               ("Santos", "2"), ("Sorocaba", "2")]
    cy3 = cy2 + 40
    for i, (nome, n) in enumerate(cidades):
        V.bandeira("BR", lx, cy3 + 3, 18, 12)
        txt(f"m/c{i}/n", nome, lx + 26, cy3, 200, 12, INK_2, BODY, 500)
        num(f"m/c{i}/v", f"{n} clubes", W - M - 120, cy3, 11, INK_3, w=120)
        cy3 += 28

    provenance("País sem clube no acervo não aparece — lacuna declarada, não inventada. Bandeira de estado não é usada no Brasil: a UF identifica.", 1060)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 6. ESTÁDIO — imagem, história, mais estatísticas
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_estadio():
    frame("Estádio", h=1340)
    topbar(active=1)

    txt("e/k", "Estádio · Rio de Janeiro · BR", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("e/nome", "Maracanã", M, 122, 64, INK, w=900)
    txt("e/sub", "Estádio Jornalista Mário Filho · inaugurado em 1950 · capacidade 78.838",
        M, 196, 800, 14, INK_2, BODY)

    # IMAGEM do estádio — moldura alta, é o que o item 6 pede primeiro
    rect("e/img", W - M - 420, 104, 420, 260, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    # arquibancada em linhas: ilustração de vetor
    for i in range(6):
        V.vetor(f"e/img/l{i}", [(W - M - 400, 150 + i * 26), (W - M - 40, 150 + i * 26)],
                stroke=BORDER, strokeWeight=1)
    V.vetor("e/img/arco", [(W - M - 400, 306), (W - M - 220, 200), (W - M - 40, 306)],
            stroke=INK_3, strokeWeight=1.5)
    txt("e/img/t", "foto do estádio · Commons", W - M - 420, 330, 420, 10, INK_3, BODY, 500,
        align="center")

    rule("e/rule", M, 388, CONTENT, INK, 2)

    # Pilares + mais estatísticas (item 6: "mais estatísticas")
    ps = [("Capacidade", "78.838", "atual"), ("Maior público", "199.854", "1950"),
          ("Inauguração", "1950", "há 76 anos"), ("Partidas", "412", "no acervo"),
          ("Gols", "1.148", "marcados"), ("Média", "2,79", "por jogo")]
    for i, (l, v, n) in enumerate(ps):
        x = M + i * (CONTENT / 6)
        kicker(f"e/p{i}/l", l, x, 404, INK_3, 200)
        num(f"e/p{i}/v", v, x, 420, 28, CRIMSON if i == 1 else INK, w=200, align="left")
        txt(f"e/p{i}/n", n, x, 458, 200, 10, INK_3, BODY)

    # HISTÓRIA — item 6
    hy = 500
    rule("e/h/rule", M, hy, CONTENT, INK, 2)
    kicker("e/h/l", "História", M, hy + 12, INK, 700)
    txt("e/h/t",
        "Construído para a Copa do Mundo de 1950, o Maracanã recebeu o jogo que o Brasil perdeu "
        "para o Uruguai na final — o episódio que ficou conhecido como Maracanazo. Reformado para "
        "o Mundial de 2014, perdeu parte da arquibancada original e ganhou cobertura.",
        M, hy + 34, 780, 13, INK_2, BODY, 400, lh=20)
    txt("e/h/src", "Wikidata · CC0", M, hy + 118, 300, 10, OCHRE, BODY, 600, ls=1.4)

    # Gráfico de público por década
    V.barras("e/g", [("1950", 199), ("1960", 180), ("1970", 171), ("1980", 155),
                     ("1990", 120), ("2000", 95), ("2010", 78), ("2020", 66)],
             M + 860, hy + 20, 452, 130, cor=CRIMSON, cor_base=INK_3)
    txt("e/g/t", "Público recorde por década (mil)", M + 860, hy + 156, 452, 10, INK_3,
        BODY, 500)

    # Clubes mandantes
    cy = hy + 186
    rule("e/c/rule", M, cy, CONTENT, INK, 2)
    kicker("e/c/l", "Clubes que mandam aqui", M, cy + 12, INK, 700)
    clubes = [("Flamengo", "426 jogos", "58%"), ("Fluminense", "388 jogos", "55%"),
              ("Vasco da Gama", "112 jogos", "49%"), ("Botafogo", "94 jogos", "47%")]
    cx = M
    for i, (nome, jogos, aprov) in enumerate(clubes):
        w = (CONTENT - 16 * 3) / 4
        rect(f"e/c{i}", cx, cy + 34, w, 88, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"e/c{i}/n", nome, cx + 16, cy + 50, w - 32, 16, INK, HEAD, 700)
        txt(f"e/c{i}/j", jogos, cx + 16, cy + 76, w - 32, 11, OCHRE, BODY, 600)
        txt(f"e/c{i}/a", f"{aprov} de aproveitamento", cx + 16, cy + 94, w - 32, 10, INK_3, BODY)
        cx += w + 16

    # Maiores públicos
    py = cy + 146
    rule("e/p2/rule", M, py, CONTENT, INK, 2)
    kicker("e/p2/l", "Maiores públicos", M, py + 12, INK, 700)
    cols = [("Data", M, 130, "left"), ("Partida", M + 150, 480, "left"),
            ("Público", M + 650, 130, "right"), ("Competição", M + 800, 300, "left"),
            ("", M + 1120, 120, "right")]
    table_header(cols, py + 38)
    publicos = [("16/07/1950", "Brasil 1 × 2 Uruguai", "199.854", "Copa do Mundo", "ver"),
                ("15/03/1969", "Flamengo 2 × 2 Vasco", "180.000", "Carioca", "ver"),
                ("31/05/1969", "Flamengo 2 × 1 Fluminense", "171.599", "Carioca", "ver"),
                ("29/06/1969", "Brasil 2 × 1 Paraguai", "171.000", "Eliminatórias", "ver")]
    ry = py + 64
    for i, p in enumerate(publicos):
        table_row(i, list(p), ry, cols, strong=True)
        ry += 34

    provenance("Capacidade e recordes conforme a administração; partidas conforme o acervo. Divergência entre fontes fica declarada.", 1280)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 7. CLUBE — redes sociais, editor, ranking, escudo, elenco, estádio, partidas, troféus
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_clube():
    frame("Clube", h=2100)
    topbar(active=1)

    txt("cl/k", "Clube · Rio de Janeiro · BR", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("cl/nome", "Clube de Regatas do Flamengo", M, 122, 58, INK, w=900, lh=60)
    txt("cl/fund", "Fundado em 1895 · Maracanã · 40.988 sócios", M, 190, 800, 14, INK_2, BODY)

    # Escudo + posição no ranking + editor
    rect("cl/esc", W - M - 132, 104, 132, 132, fill=SURFACE, cornerRadius=4, stroke=BORDER,
         strokeWeight=1)
    txt("cl/esc/t", "escudo", W - M - 132, 164, 132, 11, INK_3, BODY, 500, align="center")
    # item 7: posição nos rankings
    rect("cl/rank", W - M - 300, 104, 152, 64, fill=SURFACE, cornerRadius=2, stroke=BORDER,
         strokeWeight=1)
    txt("cl/rank/l", "RANKING DE CLUBES", W - M - 288, 114, 130, 8, INK_3, BODY, 600, ls=1.2)
    num("cl/rank/v", "10º", W - M - 288, 126, 26, CRIMSON, w=130, align="left")
    txt("cl/rank/n", "1.552 pts · ▲4", W - M - 288, 154, 130, 9, INK_3, BODY)
    # item 7: editor do clube (link para o painel)
    txt("cl/ed", "editor do clube →", W - M - 300, 182, 152, 10, INK_3, BODY, 500,
        align="right")

    y = 262
    rule("cl/rule", M, y, CONTENT, INK, 2)

    # Pilares
    ps = [("Títulos", "48", "oficiais"), ("Jogos", "426", "no acervo"),
          ("Gols", "812", "marcados"), ("Ranking", "10º", "de 1.954")]
    for i, (l, v, n) in enumerate(ps):
        x = M + i * (CONTENT / 4)
        kicker(f"p/{l}/l", l, x, y + 16, INK_3, 260)
        num(f"p/{l}/v", v, x, y + 32, 42, CRIMSON if i in (0, 3) else INK, w=260, align="left")
        txt(f"p/{l}/n", n, x, y + 80, 260, 11, INK_3, BODY)

    # TROFÉUS E MEDALHAS — item 7
    ty = y + 120
    rule("t/rule", M, ty, CONTENT, INK, 2)
    kicker("t/l", "Troféus e medalhas", M, ty + 12, INK, 700)
    txt("t/n", "48 títulos · 3 continentes", W - M - 380, ty + 11, 380, 11, INK_3, BODY,
        500, align="right")
    trofeus = [("Libertadores", "3", OCHRE, 44), ("Brasileiro", "8", CRIMSON, 40),
               ("Copa do Brasil", "5", OCHRE, 36), ("Mundial", "1", OCHRE, 40),
               ("Supercopa", "3", INK_3, 30)]
    tx = M
    for i, (nome, qtd, cor, h) in enumerate(trofeus):
        w = (CONTENT - 16 * 4) / 5
        rect(f"t/{i}", tx, ty + 36, w, 128, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        V.trofeu(f"t/{i}/tr", tx + w / 2 - h * 0.33, ty + 48, h, cor)
        txt(f"t/{i}/n", nome, tx + 12, ty + 108, w - 24, 12, INK, BODY, 600, align="center")
        num(f"t/{i}/q", qtd, tx + 12, ty + 128, 22, cor if cor != INK_3 else INK,
            w=w - 24, align="center")
        tx += w + 16

    # EVOLUÇÃO DO ESCUDO — item 7
    sy = ty + 182
    rule("sc/rule", M, sy, CONTENT, INK, 2)
    kicker("sc/l", "Evolução do escudo", M, sy + 12, INK, 700)
    txt("sc/n", "9 escudos históricos · todos com licença", W - M - 420, sy + 11, 420, 11,
        INK_3, BODY, 500, align="right")
    anos = ["1895", "1911", "1930", "1950", "1970", "1980", "2000", "2010", "2020"]
    ex = M
    for i, ano in enumerate(anos):
        w = (CONTENT - 12 * 8) / 9
        rect(f"sc/{i}", ex, sy + 34, w, w, fill=SURFACE_2, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"sc/{i}/a", ano, ex, sy + 34 + w + 6, w, 9, INK_3, BODY, 500, align="center")
        ex += w + 12

    # ELENCO
    ey = sy + 116
    rule("el/rule", M, ey, CONTENT, INK, 2)
    kicker("el/l", "Elenco · 2025", M, ey + 12, INK, 700)
    cols_e = [("Jogador", M, 340, "left"), ("Posição", M + 360, 180, "left"),
              ("Idade", M + 550, 90, "right"), ("Jogos", M + 650, 100, "right"),
              ("Gols", M + 770, 90, "right"), ("Nota", M + 870, 90, "right")]
    table_header(cols_e, ey + 38)
    elenco = [("Pedro", "Atacante", "28", "42", "19", "7,8"),
              ("Arrascaeta", "Meia", "31", "38", "11", "7,5"),
              ("Bruno Henrique", "Atacante", "34", "35", "14", "7,1"),
              ("Léo Pereira", "Zagueiro", "29", "40", "2", "7,0")]
    ey2 = ey + 64
    for i, e in enumerate(elenco):
        table_row(i, list(e), ey2, cols_e, strong=True)
        ey2 += 34

    # ESTÁDIO + PARTIDAS + REDES SOCIAIS
    ly = ey2 + 22
    rule("li/rule", M, ly, CONTENT, INK, 2)
    # estádio (item 7)
    kicker("st/l", "Estádio", M, ly + 12, INK, 700)
    rect("st/card", M, ly + 34, 420, 96, fill=SURFACE, cornerRadius=2, stroke=BORDER,
         strokeWeight=1)
    txt("st/card/n", "Maracanã", M + 16, ly + 50, 280, 17, INK, HEAD, 700)
    txt("st/card/d", "78.838 lugares · 412 partidas aqui", M + 16, ly + 76, 380, 11, INK_3, BODY)
    txt("st/card/s", "ver estádio →", M + 16, ly + 100, 200, 10, CRIMSON, BODY, 600)

    # redes sociais (item 7)
    kicker("so/l", "Redes sociais", M + 460, ly + 12, INK, 700)
    redes = ["Instagram", "X", "YouTube", "TikTok", "Site"]
    rx2 = M + 460
    for i, r in enumerate(redes):
        w = 24 + len(r) * 7.2
        rect(f"so/{i}", rx2, ly + 34, w, 30, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"so/{i}/t", r, rx2 + 12, ly + 42, w - 24, 11, INK_2, BODY, 600)
        rx2 += w + 8

    # últimas partidas (item 7)
    kicker("pa/l", "Últimas partidas", M + 460, ly + 80, INK, 700)
    jogos = [("26/10", "Palmeiras", "2 × 1"), ("19/10", "Corinthians", "0 × 0"),
             ("12/10", "Grêmio", "3 × 1")]
    jx = M + 460
    for i, (d, adv, pl) in enumerate(jogos):
        rect(f"pa/{i}", jx, ly + 102, 190, 46, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"pa/{i}/d", d, jx + 12, ly + 108, 60, 9, INK_3, BODY)
        txt(f"pa/{i}/a", adv, jx + 12, ly + 122, 120, 12, INK, BODY, 600)
        txt(f"pa/{i}/p", pl, jx + 12, ly + 138, 120, 10, CRIMSON, BODY, 600)
        jx += 198

    provenance("Títulos conferidos contra a lista do clube. Escudo com licença verificada no Wikimedia Commons. Troféu é ilustração do sistema.", 2020)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 8. DASHBOARD — Time do Coração + Meu Almanaque como ÁLBUM DE FIGURINHAS
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_dashboard():
    frame("Meu Almanaque", h=1420)
    topbar(active=-1)

    txt("d/k", "Sua conta · coleção", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("d/t", "Meu Almanaque", M, 122, 60, INK, w=700)
    txt("d/sub", "Seu álbum: o time do coração, as figurinhas que você já colou e as que faltam.",
        M, 190, 760, 15, INK_2, BODY, 400, lh=22)

    # Time do coração — destaque máximo, com escudo grande e vínculo
    rule("d/rule", M, 240, CONTENT, INK, 2)
    hy = 258
    rect("d/coracao/bg", M - 8, hy, CONTENT + 16, 176, fill=INK, cornerRadius=2)
    txt("d/coracao/k", "TIME DO CORAÇÃO", M + 16, hy + 16, 400, 10, NIGHT_OCHRE, BODY, 600,
        ls=2.4)
    rect("d/coracao/esc", M + 16, hy + 40, 112, 112, fill=NIGHT_SURF, cornerRadius=4,
         stroke=NIGHT_BORDER, strokeWeight=1)
    txt("d/coracao/esc/t", "escudo", M + 16, hy + 90, 112, 10, NIGHT_INK3, BODY, 500,
        align="center")
    display("d/coracao/n", "Flamengo", M + 152, hy + 38, 44, NIGHT_INK, w=500)
    txt("d/coracao/m", "Rio de Janeiro · BR · desde 1895", M + 152, hy + 92, 500, 12,
        NIGHT_INK2, BODY)
    txt("d/coracao/v", "Você acompanha há 214 dias · 48 títulos no acervo", M + 152,
        hy + 116, 560, 11, NIGHT_INK3, BODY)

    # medidor de coleção do time
    txt("d/coracao/prog", "Coleção do clube", M + 152, hy + 140, 200, 10, NIGHT_INK3,
        BODY, 500)
    rect("d/coracao/trilha", M + 340, hy + 145, 320, 6, fill=NIGHT_SURF2, cornerRadius=3)
    rect("d/coracao/fill", M + 340, hy + 145, 232, 6, fill=NIGHT_OCHRE, cornerRadius=3)
    txt("d/coracao/pct", "72% · 34 de 48 figurinhas", M + 340, hy + 158, 300, 10,
        NIGHT_OCHRE, BODY, 600)

    # Ações do clube do coração
    acoes = ["Ver ficha", "Comparar", "Elenco", "Partidas"]
    ax = W - M - 380
    for i, a in enumerate(acoes):
        w = 20 + len(a) * 7.4
        rect(f"d/ac{i}", ax, hy + 132, w, 28, fill=None, stroke=NIGHT_BORDER,
             strokeWeight=1, cornerRadius=2)
        txt(f"d/ac{i}/t", a, ax + 10, hy + 139, w - 20, 10, NIGHT_INK2, BODY, 600)
        ax += w + 8

    # ÁLBUM — a metáfora de figurinhas, organizada por página
    ay = hy + 200
    rule("d/a/rule", M, ay, CONTENT, INK, 2)
    kicker("d/a/l", "Meu álbum · 5 páginas", M, ay + 12, INK, 700)
    txt("d/a/n", "312 figurinhas · 78% completo", W - M - 420, ay + 11, 420, 11, INK_3,
        BODY, 500, align="right")

    paginas = [
        ("Clubes", "12 de 20", 60, "4 favoritos"),
        ("Jogadores", "8 de 20", 40, "2 favoritos"),
        ("Competições", "16 de 20", 80, "6 seguidas"),
        ("Estádios", "3 de 20", 15, "1 visitado"),
        ("Temporadas", "11 de 20", 55, "3 arquivadas"),
    ]
    ay2 = ay + 40
    for i, (nome, prog, pct, nota) in enumerate(paginas):
        w = (CONTENT - 16 * 4) / 5
        x = M + i * (w + 16)
        rect(f"d/pg{i}", x, ay2, w, 132, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"d/pg{i}/n", nome, x + 14, ay2 + 12, w - 28, 14, INK, HEAD, 700)
        txt(f"d/pg{i}/p", prog, x + 14, ay2 + 34, w - 28, 11, INK_3, BODY)
        rect(f"d/pg{i}/t", x + 14, ay2 + 58, w - 28, 6, fill=SURFACE_2, cornerRadius=3)
        rect(f"d/pg{i}/f", x + 14, ay2 + 58, (w - 28) * pct / 100, 6, fill=CRIMSON,
             cornerRadius=3)
        txt(f"d/pg{i}/pct", f"{pct}%", x + 14, ay2 + 70, w - 28, 10, CRIMSON, BODY, 600)
        txt(f"d/pg{i}/nota", nota, x + 14, ay2 + 100, w - 28, 10, INK_3, BODY)
        txt(f"d/pg{i}/s", "abrir →", x + 14, ay2 + 114, w - 28, 9, INK_3, BODY, 500)

    # Figurinhas em destaque: as que faltam e as raras
    fy = ay2 + 156
    rule("d/f/rule", M, fy, CONTENT, INK, 2)
    kicker("d/f/l", "Figurinhas em destaque", M, fy + 12, INK, 700)
    figurinhas = [("Maradona 1986", "rara", OCHRE), ("Copa 1950", "histórica", CRIMSON),
                  ("Pelé 1958", "rara", OCHRE), ("Ronaldo 2002", "conquistada", INK_3),
                  ("Maracanã 1950", "histórica", CRIMSON), ("Flamengo 1981", "conquistada", INK_3)]
    fx = M
    for i, (nome, raridade, cor) in enumerate(figurinhas):
        w = (CONTENT - 12 * 5) / 6
        rect(f"d/fg{i}", fx, fy + 34, w, 128, fill=SURFACE, cornerRadius=2, stroke=cor,
             strokeWeight=2 if raridade == "rara" else 1)
        rect(f"d/fg{i}/img", fx + 12, fy + 46, w - 24, 58, fill=SURFACE_2, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"d/fg{i}/n", nome, fx + 12, fy + 112, w - 24, 11, INK, BODY, 600)
        txt(f"d/fg{i}/r", raridade, fx + 12, fy + 130, w - 24, 9, cor, BODY, 600, ls=1.2)
        tx_ = "colar" if raridade == "conquistada" else "faltando"
        txt(f"d/fg{i}/s", tx_, fx + 12, fy + 144, w - 24, 9, INK_3, BODY)
        fx += w + 12

    # Conta e assinatura (mantido)
    cy2 = fy + 190
    rule("d/c/rule", M, cy2, CONTENT, INK, 2)
    kicker("d/c/l", "Conta e assinatura", M, cy2 + 12, INK, 700)
    cols = [("Item", M, 300, "left"), ("Situação", M + 320, 240, "left"),
            ("Detalhe", M + 580, 500, "left"), ("Ação", M + 1100, 180, "left")]
    table_header(cols, cy2 + 38)
    conta = [("Plano", "Apoiador", "renova em 12/2026", "gerenciar"),
             ("Perfil", "completo", "nome, e-mail, bio", "editar"),
             ("Notificações", "ativas", "resumo semanal", "ajustar")]
    cy3 = cy2 + 64
    for i, c in enumerate(conta):
        table_row(i, list(c), cy3, cols, strong=True)
        cy3 += 34

    provenance("Favoritos agora vivem aqui, dentro de Meu Almanaque — não são mais uma página solta. Sem conta, a coleção fica neste navegador.", 1350)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 11. JOGADOR — troféus e medalhas, métricas, estatísticas e gráficos
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_jogador():
    frame("Jogador", h=1720)
    topbar(active=2)

    txt("j/k", "Jogador · atacante · Brasil", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("j/nome", "Edson Arantes do Nascimento", M, 122, 54, INK, w=840, lh=56)
    txt("j/aka", "Pelé · 1940–2022 · Santos, Brasil", M, 182, 700, 14, INK_2, BODY)
    rect("j/foto", W - M - 180, 104, 180, 230, fill=SURFACE, cornerRadius=2, stroke=BORDER,
         strokeWeight=1)
    txt("j/foto/t", "retrato", W - M - 180, 208, 180, 10, INK_3, BODY, 500, align="center")

    y = 268
    rule("j/rule", M, CONTENT - 0 if False else 268, CONTENT, INK, 2)

    # Métricas
    ms = [("Jogos", "1.363"), ("Gols", "1.279"), ("Média", "0,94"), ("Assist.", "367"),
          ("Títulos", "37")]
    for i, (l, v) in enumerate(ms):
        x = M + i * (CONTENT / 5)
        kicker(f"m/{l}/l", l, x, 284, INK_3, 200)
        num(f"m/{l}/v", v, x, 300, 34, CRIMSON if i == 1 else INK, w=200, align="left")

    # TROFÉUS E MEDALHAS — item 11
    ty = 356
    rule("t/rule", M, ty, CONTENT, INK, 2)
    kicker("t/l", "Troféus e medalhas", M, ty + 12, INK, 700)
    txt("t/n", "37 títulos · 11 prêmios individuais", W - M - 420, ty + 11, 420, 11, INK_3,
        BODY, 500, align="right")
    trofeus = [("Copa do Mundo", "3", OCHRE, 42), ("Libertadores", "2", CRIMSON, 36),
               ("Mundial", "2", OCHRE, 36), ("Brasileiro", "6", CRIMSON, 32),
               ("Bola de Ouro", "1", INK_3, 30)]
    tx = M
    for i, (nome, qtd, cor, h) in enumerate(trofeus):
        w = (CONTENT - 16 * 4) / 5
        rect(f"t/{i}", tx, ty + 36, w, 124, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        V.trofeu(f"t/{i}/tr", tx + w / 2 - h * 0.33, ty + 48, h, cor)
        txt(f"t/{i}/n", nome, tx + 12, ty + 104, w - 24, 12, INK, BODY, 600, align="center")
        num(f"t/{i}/q", qtd, tx + 12, ty + 124, 22, cor if cor != INK_3 else INK,
            w=w - 24, align="center")
        tx += w + 16

    # GRÁFICOS — item 11
    gy = ty + 178
    rule("g/rule", M, gy, CONTENT, INK, 2)
    kicker("g/l", "Gols por ano da carreira", M, gy + 12, INK, 700)
    V.barras("g/g", [("58", 58), ("59", 47), ("60", 42), ("61", 62), ("62", 51),
                     ("63", 44), ("64", 47), ("65", 73), ("66", 38), ("67", 41),
                     ("68", 45), ("69", 54), ("70", 34)],
             M, gy + 36, 640, 150, cor=CRIMSON, cor_base=INK_3)
    # donut: gols por tipo
    txt("g/d/t", "Gols por tipo", M + 700, gy + 36, 300, 11, INK_2, BODY, 600)
    V.donut("g/d", [("Direita", 412, CRIMSON), ("Esquerda", 289, OCHRE),
                    ("Cabeça", 128, INK_3), ("Fora", 450, BORDER)],
            M + 700, gy + 58, 110, 13)
    leg = [("Pé direito", "412", CRIMSON), ("Pé esquerdo", "289", OCHRE),
           ("Cabeça", "128", INK_3), ("Outros", "450", BORDER)]
    for i, (rot, val, cor) in enumerate(leg):
        rect(f"g/d/l{i}/b", M + 830, gy + 70 + i * 22, 10, 10, fill=cor if cor != BORDER else INK_3)
        txt(f"g/d/l{i}/r", rot, M + 848, gy + 68 + i * 22, 120, 10, INK_2, BODY)
        num(f"g/d/l{i}/v", val, M + 970, gy + 66 + i * 22, 12, INK, w=60)

    # CARREIRA
    cy = gy + 206
    rule("c/rule", M, cy, CONTENT, INK, 2)
    kicker("c/l", "Carreira", M, cy + 12, INK, 700)
    cols = [("Clube", M, 380, "left"), ("Período", M + 400, 170, "left"),
            ("Jogos", M + 590, 110, "right"), ("Gols", M + 720, 100, "right"),
            ("Média", M + 840, 110, "right"), ("Títulos", M + 960, 110, "right")]
    table_header(cols, cy + 38)
    carreira = [("Santos FC", "1956–1974", "1.116", "1.091", "0,98", "26"),
                ("New York Cosmos", "1975–1977", "107", "65", "0,61", "1"),
                ("Seleção Brasileira", "1957–1971", "114", "95", "0,83", "3")]
    ry = cy + 64
    for i, c in enumerate(carreira):
        table_row(i, list(c), ry, cols, strong=True)
        ry += 34

    # CONQUISTAS e PRÊMIOS
    qy = ry + 22
    rule("q/rule", M, qy, CONTENT, INK, 2)
    kicker("q/l", "Conquistas e prêmios individuais", M, qy + 12, INK, 700)
    cols_q = [("Conquista", M, 460, "left"), ("Tipo", M + 480, 240, "left"),
              ("Vezes", M + 740, 110, "right"), ("Anos", M + 870, 500, "left")]
    table_header(cols_q, qy + 38)
    conquistas = [
        ("Copa do Mundo", "Seleção", "3", "1958 · 1962 · 1970"),
        ("Copa Libertadores", "Clube", "2", "1962 · 1963"),
        ("Bola de Ouro", "Individual", "1", "1970"),
        ("Melhor da Copa", "Individual", "1", "1970"),
    ]
    qy2 = qy + 64
    for i, q in enumerate(conquistas):
        table_row(i, list(q), qy2, cols_q, strong=True)
        qy2 += 34

    provenance("Estatística consolidada de RSSSF e Wikidata. Troféu é ilustração do sistema, não a peça oficial.", 1640)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 13. TEMPORADA — métricas, tabela da competição e gráficos
# ═════════════════════════════════════════════════════════════════════════════════════════
def v3_temporada():
    frame("Temporada", h=1520)
    topbar(active=0)
    y = ficha_head(
        "Temporada 2024-25", "38", "rodadas · 10 competições",
        "Temporada · a edição inteira",
        "Todas as competições do ano, os números agregados e a evolução rodada a rodada.",
        y=104,
    )

    # Métricas da temporada
    ms = [("Partidas", "1.842"), ("Gols", "4.988"), ("Média", "2,71"),
          ("Público", "12,4 mi"), ("0 a 0", "112"), ("Maior goleada", "9 × 0")]
    for i, (l, v) in enumerate(ms):
        x = M + i * (CONTENT / 6)
        kicker(f"m/{l}/l", l, x, y + 8, INK_3, 200)
        num(f"m/{l}/v", v, x, y + 24, 26, CRIMSON if i == 1 else INK, w=190, align="left")

    # Competições do ano — tabela resumida
    cy = y + 92
    rule("c/rule", M, cy, CONTENT, INK, 2)
    kicker("c/l", "Competições nesta temporada", M, cy + 12, INK, 700)
    cols = [("Competição", M, 400, "left"), ("Campeão", M + 420, 300, "left"),
            ("Pts", M + 740, 80, "right"), ("J", M + 830, 70, "right"),
            ("Artilheiro", M + 920, 300, "left")]
    table_header(cols, cy + 38)
    comps = [("Premier League", "Liverpool", "84", "38", "Salah · 29"),
             ("La Liga", "Barcelona", "88", "38", "Lewandowski · 27"),
             ("Brasileirão Série A", "Botafogo", "79", "38", "Yuri Alberto · 19"),
             ("Copa Libertadores", "Botafogo", "—", "13", "Luiz Henrique · 5")]
    ry = cy + 64
    for i, c in enumerate(comps):
        table_row(i, list(c), ry, cols, strong=True)
        ry += 34

    # TABELA da competição principal — item 13
    ty = ry + 22
    rule("t/rule", M, ty, CONTENT, INK, 2)
    kicker("t/l", "Premier League · classificação final", M, ty + 12, INK, 700)
    txt("t/n", "ver tabela completa →", W - M - 300, ty + 12, 300, 11, CRIMSON, BODY, 600,
        align="right")
    cols_t = [("#", M, 40, "right"), ("Clube", M + 50, 300, "left"),
              ("J", M + 360, 60, "right"), ("V", M + 430, 60, "right"),
              ("E", M + 500, 60, "right"), ("D", M + 570, 60, "right"),
              ("SG", M + 640, 70, "right"), ("Pts", M + 720, 70, "right"),
              ("Últ. 5", M + 800, 200, "left")]
    table_header(cols_t, ty + 38)
    tab = [("1", "Liverpool", "38", "25", "9", "4", "+45", "84", "V V V E V"),
           ("2", "Arsenal", "38", "20", "14", "4", "+35", "74", "E V V V E"),
           ("3", "Manchester City", "38", "21", "8", "9", "+28", "71", "D V V E V"),
           ("4", "Chelsea", "38", "20", "9", "9", "+21", "69", "V V E V V"),
           ("5", "Newcastle", "38", "20", "6", "12", "+21", "66", "V D V V E")]
    ty2 = ty + 64
    for i, t in enumerate(tab):
        table_row(i, list(t), ty2, cols_t, strong=True)
        ty2 += 34

    # GRÁFICOS — item 13
    gy = ty2 + 22
    rule("g/rule", M, gy, CONTENT, INK, 2)
    kicker("g/l", "A temporada em gráficos", M, gy + 12, INK, 700)

    # 1. gols por rodada
    txt("g/1/t", "Gols por rodada", M, gy + 40, 380, 11, INK_2, BODY, 600)
    V.linha("g/1", [42, 38, 51, 44, 39, 48, 52, 41, 36, 47, 50, 43, 39, 45],
            M, gy + 62, 380, 120, pontos=True)
    txt("g/1/n", "média 2,71 por jogo", M, gy + 190, 380, 10, INK_3, BODY)

    # 2. público por mês
    txt("g/2/t", "Público por mês (mil)", M + 440, gy + 40, 380, 11, INK_2, BODY, 600)
    V.barras("g/2", [("AGO", 820), ("SET", 940), ("OUT", 1020), ("NOV", 1180),
                     ("DEZ", 1340), ("JAN", 1080)],
             M + 440, gy + 62, 380, 140, cor=CRIMSON, cor_base=INK_3)

    # 3. donut de resultados
    txt("g/3/t", "Resultados", M + 880, gy + 40, 300, 11, INK_2, BODY, 600)
    V.donut("g/3", [("Casa", 742, CRIMSON), ("Empate", 458, OCHRE),
                    ("Fora", 642, INK_3)], M + 880, gy + 62, 110, 13)
    leg = [("Vitória casa", "742", CRIMSON), ("Empate", "458", OCHRE),
           ("Vitória fora", "642", INK_3)]
    for i, (rot, val, cor) in enumerate(leg):
        rect(f"g/3/l{i}/b", M + 1010, gy + 74 + i * 24, 10, 10, fill=cor)
        txt(f"g/3/l{i}/r", rot, M + 1028, gy + 72 + i * 24, 160, 10, INK_2, BODY)
        num(f"g/3/l{i}/v", val, M + 1200, gy + 70 + i * 24, 12, INK, w=60)

    # Linha do tempo
    ly = gy + 232
    rule("l/rule", M, ly, CONTENT, INK, 2)
    kicker("l/l", "A temporada em ordem", M, ly + 12, INK, 700)
    marcos = [("AGO", "Abertura", "38 rodadas começam"), ("DEZ", "Meia temporada", "3 trocas de líder"),
              ("MAR", "Retas finais", "6 de 10 vagas definidas"), ("MAI", "Encerramento", "4 títulos na última rodada")]
    mx = M
    for i, (mes, tit, fato) in enumerate(marcos):
        w = (CONTENT - 24 * 3) / 4
        num(f"l/{i}/m", mes, mx, ly + 36, 24, CRIMSON, w=w, align="left")
        rule(f"l/{i}/f", mx, ly + 68, w - 20, BORDER, 1)
        txt(f"l/{i}/t", tit, mx, ly + 78, w - 20, 12, INK, BODY, 600)
        txt(f"l/{i}/x", fato, mx, ly + 96, w - 20, 10, INK_2, BODY)
        mx += w + 24

    provenance("Temporada montada pela data da partida. Competição sem edição no ano não aparece.", 1460)


PAGES_V3 = [
    ("home", v3_home),
    ("competicoes", v3_competicoes),
    ("lendas", v3_lendas),
    ("partidas", v3_partidas),
    ("mapa", v3_mapa),
    ("estadio", v3_estadio),
    ("clube", v3_clube),
    ("meu-almanaque", v3_dashboard),
    ("jogador", v3_jogador),
    ("temporada", v3_temporada),
]
