"""
Gerador de telas do conceito "Almanaque Editorial" para o FigCraft.

Por que um gerador em vez de escrever o JSON à mão: cada tela tem ~80 camadas, e repetir
coordenadas em JSON cru é onde nascem os desalinhamentos de 3 px. Aqui a geometria vem de
constantes (grid, tipografia) e o resultado é determinístico.
"""

import json
import sys

# ── Tokens ────────────────────────────────────────────────────────────────────────────────
INK = "#14100E"
INK_2 = "#4A423B"
MUTED = "#6B6259"
HAIRLINE = "#D9D0C3"
PAPER = "#F7F3EC"
PAPER_DEEP = "#EDE6DA"
CARD = "#FFFDF8"
WINE = "#8E1B2E"
WINE_SOFT = "#B23348"
GOLD = "#9A7418"
GOLD_SOFT = "#C9A227"

DISPLAY = "Georgia"
SANS = "Segoe UI"
MONO = "Consolas"

W = 1440
MARGIN = 72

cmd = []


def add(command, **params):
    cmd.append({"command": command, "params": params})


def frame(name, x, y, w, h, **props):
    add("frame.create", name=name, x=x, y=y, width=w, height=h, props=props)


def rect(name, x, y, w, h, **props):
    add("shape.rectangle", name=name, x=x, y=y, width=w, height=h, props=props)


def text(name, content, x, y, w, size, color, font=SANS, weight=400, align="left", lh=None, ls=None):
    props = {
        "fontSize": size,
        "fontFamily": font,
        "fontWeight": weight,
        "fill": color,
        "textAlign": align,
    }
    if lh is not None:
        props["lineHeight"] = lh
    if ls is not None:
        props["letterSpacing"] = ls
    add("text.create", name=name, text=content, x=x, y=y, width=w, props=props)


def rule(name, x, y, w, color=HAIRLINE, weight=1):
    rect(name, x, y, w, weight, fill=color)


def label(name, content, x, y, color=MUTED, size=11):
    """Rótulo de seção: caixa alta, tracking largo — o que dá ritmo editorial."""
    text(name, content.upper(), x, y, 900, size, color, SANS, 600, ls=1.6)


def chip(name, content, x, y, w, h, fg=INK_2, bg=CARD, border=HAIRLINE, size=13):
    """Largura minima calculada pela contagem: abaixo disso o rotulo quebra em duas linhas e
    desalinha a linha inteira — foi o que aconteceu na primeira versao."""
    w = max(w, 34 + int(len(content) * 8.0))
    rect(f"{name}/bg", x, y, w, h, fill=bg, cornerRadius=h / 2, stroke=border, strokeWeight=1)
    text(f"{name}/t", content, x + 17, y + (h - size) / 2 - 3, w - 34, size, fg, SANS, 500)
    return w


# ── Tela: Competições ─────────────────────────────────────────────────────────────────────
def competicoes():
    frame("Competições", 0, 0, W, 1030, fill=PAPER)

    # — Barra superior: marca, navegação, busca
    rect("topo/linha", 0, 72, W, 1, fill=HAIRLINE)
    text("marca", "ALMANAQUE", MARGIN, 28, 260, 19, INK, DISPLAY, 700, ls=1.0)
    text("marca/2", "dos Clubes", MARGIN + 186, 35, 140, 11, MUTED, SANS, 400, ls=0.5)

    nav = ["Competições", "Clubes", "Jogadores", "Rankings", "Mapa", "Lendas"]
    nx = 430
    for i, item in enumerate(nav):
        ativo = i == 0
        text(f"nav/{item}", item, nx, 34, 160, 13, INK if ativo else INK_2, SANS, 600 if ativo else 400)
        if ativo:
            rect(f"nav/{item}/sublinhado", nx, 56, 74, 2, fill=WINE)
        nx += 108

    rect("busca", W - MARGIN - 260, 26, 200, 32, fill=CARD, cornerRadius=16, stroke=HAIRLINE, strokeWeight=1)
    text("busca/t", "Buscar no Almanaque…", W - MARGIN - 244, 35, 180, 12, MUTED, SANS)
    rect("entrar", W - MARGIN - 48, 26, 48, 32, fill=WINE, cornerRadius=16)
    text("entrar/t", "Entrar", W - MARGIN - 40, 35, 40, 12, "#FFF8F2", SANS, 600)

    # — Cabeçalho editorial: título grande + número-âncora à direita
    text("titulo", "Competições", MARGIN, 128, 700, 54, INK, DISPLAY, 700, ls=-0.5)
    text(
        "subtitulo",
        "Cada torneio que o futebol inventou — do mundial ao estadual, com o alcance declarado.",
        MARGIN,
        196,
        620,
        15,
        INK_2,
        SANS,
        400,
        lh=22,
    )
    text("contagem", "1.932", W - MARGIN - 240, 120, 240, 60, WINE, DISPLAY, 700, align="right")
    text("contagem/r", "competições catalogadas", W - MARGIN - 240, 186, 240, 11, MUTED, SANS, 500, align="right", ls=1.2)

    # — Filtros: rótulo acima do campo (não placeholder dentro)
    fy = 268
    filtros = [("Gênero", "Todos", 200), ("Tipo", "Todos", 200), ("País (ISO)", "Todos os países", 300)]
    fx = MARGIN
    for rotulo, valor, largura in filtros:
        label(f"filtro/{rotulo}/r", rotulo, fx, fy, MUTED, 10)
        rect(f"filtro/{rotulo}/campo", fx, fy + 18, largura, 40, fill=CARD, cornerRadius=6, stroke=HAIRLINE, strokeWeight=1)
        text(f"filtro/{rotulo}/v", valor, fx + 14, fy + 31, largura - 40, 13, INK, SANS, 500)
        text(f"filtro/{rotulo}/seta", "▾", fx + largura - 26, fy + 29, 20, 12, MUTED, SANS)
        fx += largura + 16

    rect("filtrar", fx, fy + 18, 104, 40, fill=INK, cornerRadius=6)
    text("filtrar/t", "Filtrar", fx + 26, fy + 31, 60, 13, "#FFF8F2", SANS, 600)

    # — DESTAQUES: degraus de alcance. O tamanho do cartão É a hierarquia.
    dy = 372
    rule("secao/linha", MARGIN, dy - 18, W - MARGIN * 2, INK, 2)
    label("secao/destaques", "Destaques por alcance", MARGIN, dy + 2, INK, 11)

    # Degrau 1 — Mundial: cartões grandes, borda de acento
    label("grau1", "Mundial · decide o mundo", MARGIN, dy + 40, GOLD, 10)
    mundiais = ["FIFA World Cup", "FIFA Club World Cup", "FIFA U-20 World Cup", "FIFA Women's World Cup"]
    mx = MARGIN
    for i, nome in enumerate(mundiais):
        w = 312
        rect(f"g1/{i}", mx, dy + 62, w, 76, fill=CARD, cornerRadius=8, stroke=GOLD_SOFT, strokeWeight=2)
        text(f"g1/{i}/n", nome, mx + 18, dy + 84, w - 36, 17, INK, DISPLAY, 700)
        text(f"g1/{i}/m", "Mundial", mx + 18, dy + 112, w - 36, 10, GOLD, SANS, 600, ls=1.2)
        mx += w + 16

    # Degrau 2 — Continental: cartões médios
    dy2 = dy + 168
    label("grau2", "Continental", MARGIN, dy2, WINE, 10)
    conti = ["Copa Libertadores", "UEFA Champions League", "AFC Champions League Elite", "Copa América"]
    cx = MARGIN
    for i, nome in enumerate(conti):
        w = 312
        rect(f"g2/{i}", cx, dy2 + 22, w, 56, fill=CARD, cornerRadius=6, stroke=HAIRLINE, strokeWeight=1)
        text(f"g2/{i}/n", nome, cx + 16, dy2 + 40, w - 32, 14, INK, SANS, 600)
        cx += w + 16

    # Degrau 3 — 2º escalão e Nacional: fichas compactas
    dy3 = dy2 + 108
    label("grau3", "Continental · 2º escalão", MARGIN, dy3, MUTED, 10)
    chips = ["Copa Sudamericana", "UEFA Conference League", "UEFA Super Cup"]
    cx = MARGIN
    for i, nome in enumerate(chips):
        w = chip(f"g3/{i}", nome, cx, dy3 + 20, 0, 30)
        cx += w + 10

    dy4 = dy3 + 78
    label("grau4", "Nacional", MARGIN, dy4, MUTED, 10)
    nac = ["Brasileirão Feminino A1", "FA Cup", "Copa do Brasil", "Copa del Rey", "Coppa Italia", "Ligue 1"]
    cx = MARGIN
    for i, nome in enumerate(nac):
        w = chip(f"g4/{i}", nome, cx, dy4 + 20, 0, 30)
        cx += w + 10


    # — ÍNDICE: o almanaque é denso. Esta é a parte que faz a página parecer um acervo e não
    # um cartaz — lista com país, edições e o fio entre linhas.
    iy = 800
    rule("indice/linha", MARGIN, iy - 14, W - MARGIN * 2, INK, 2)
    label("indice/t", "Índice completo", MARGIN, iy + 4, INK, 11)
    text("indice/n", "1.932 competições · 197 países", W - MARGIN - 320, iy + 4, 320, 11, MUTED, SANS, 500, align="right")

    colunas = [("COMPETIÇÃO", MARGIN, 460), ("PAÍS", MARGIN + 470, 120), ("EDIÇÕES", MARGIN + 600, 90), ("ALCANCE", MARGIN + 700, 120)]
    for rot, x, w in colunas:
        label(f"indice/c/{rot}", rot, x, iy + 32, MUTED, 9)

    linhas = [
        ("UEFA Champions League", "Continental", "GB", "71", "Continental"),
        ("Copa Libertadores", "América do Sul", "—", "66", "Continental"),
        ("Campeonato Brasileiro Série A", "Brasil", "BR", "69", "Nacional"),
        ("Premier League", "Reino Unido", "GB", "34", "Nacional"),
        ("La Liga", "Espanha", "ES", "95", "Nacional"),
        ("Copa do Mundo FIFA", "Mundial", "—", "23", "Mundial"),
    ]
    ly = iy + 54
    for i, (nome, pais, iso, edicoes, alcance) in enumerate(linhas):
        if i % 2 == 0:
            rect(f"indice/z/{i}", MARGIN - 12, ly - 6, W - MARGIN * 2 + 24, 34, fill=PAPER_DEEP)
        text(f"indice/n/{i}", nome, MARGIN, ly, 460, 13, INK, SANS, 600)
        text(f"indice/p/{i}", pais, MARGIN + 470, ly, 120, 12, INK_2, SANS)
        text(f"indice/e/{i}", edicoes, MARGIN + 600, ly, 90, 12, INK_2, MONO)
        cor = GOLD if alcance == "Mundial" else (WINE if alcance == "Continental" else MUTED)
        text(f"indice/a/{i}", alcance, MARGIN + 700, ly, 160, 10, cor, SANS, 600, ls=1.0)
        rule(f"indice/f/{i}", MARGIN - 12, ly + 28, W - MARGIN * 2 + 24, HAIRLINE, 1)
        ly += 34
    # — Rodapé de contexto: a lacuna declarada, em fio fino
    rule("rodape/linha", MARGIN, 985, W - MARGIN * 2, HAIRLINE, 1)
    text(
        "rodape/nota",
        "Competições estaduais ficam fora dos destaques — alcance regional. Todas continuam no índice por país.",
        MARGIN,
        999,
        900,
        11,
        MUTED,
        SANS,
    )


# ── Tela: Clubes (hierarquia Estado → Cidade) ────────────────────────────────────────────
def clubes():
    """Prova que o conceito generaliza: mesma régua, mecânica diferente.

    A mecânica desta página é o DRILLDOWN em dois níveis. O desenho tem de deixar claro que o
    segundo nível (cidade) é consequência do primeiro (estado) — não uma lista paralela. Por
    isso o estado selecionado ganha fundo de tinta e as cidades ficam indentadas sob ele.
    """
    cmd.clear()
    frame("Clubes", 0, 0, W, 1030, fill=PAPER)

    rect("topo/linha", 0, 72, W, 1, fill=HAIRLINE)
    text("marca", "ALMANAQUE", MARGIN, 28, 260, 19, INK, DISPLAY, 700, ls=1.0)
    text("marca/2", "dos Clubes", MARGIN + 186, 35, 140, 11, MUTED, SANS, 400, ls=0.5)

    nav = ["Competições", "Clubes", "Jogadores", "Rankings", "Mapa", "Lendas"]
    nx = 430
    for i, item in enumerate(nav):
        ativo = i == 1
        text(f"nav/{item}", item, nx, 34, 160, 13, INK if ativo else INK_2, SANS, 600 if ativo else 400)
        if ativo:
            rect(f"nav/{item}/sublinhado", nx, 56, 40, 2, fill=WINE)
        nx += 108

    text("titulo", "Clubes", MARGIN, 122, 500, 54, INK, DISPLAY, 700, ls=-0.5)
    text("subtitulo", "12.017 clubes — navegue por estado e, dentro dele, por cidade.", MARGIN, 190, 640, 15, INK_2, SANS, 400, lh=22)
    text("contagem", "12.017", W - MARGIN - 260, 118, 260, 58, WINE, DISPLAY, 700, align="right")
    text("contagem/r", "clubes no acervo", W - MARGIN - 260, 182, 260, 11, MUTED, SANS, 500, align="right", ls=1.2)

    # Busca larga — a entrada principal desta página é procurar, não filtrar
    rect("busca", MARGIN, 250, W - MARGIN * 2, 56, fill=CARD, cornerRadius=8, stroke=HAIRLINE, strokeWeight=1)
    text("busca/t", "Buscar clube por nome, cidade ou país…", MARGIN + 20, 270, 600, 15, MUTED, SANS)
    rect("busca/atalho", W - MARGIN - 76, 262, 56, 32, fill=PAPER_DEEP, cornerRadius=6)
    text("busca/atalho/t", "⌘K", W - MARGIN - 64, 271, 40, 12, MUTED, MONO)

    # Dois painéis: estados à esquerda (lista densa), cidades à direita (consequência)
    painel_y = 350
    label("p1/t", "Estados · 393", MARGIN, painel_y - 26, INK, 11)
    text("p1/cob", "2.815 de 12.017 clubes com estado (23%)", MARGIN, painel_y - 8, 520, 11, MUTED, SANS)

    estados = [("São Paulo", "BR-SP", 78, True), ("Rio de Janeiro", "BR-RJ", 71, False), ("Rio Grande do Sul", "BR-RS", 42, False), ("Minas Gerais", "BR-MG", 36, False), ("Paraná", "BR-PR", 30, False), ("Santa Catarina", "BR-SC", 27, False), ("Bahia", "BR-BA", 25, False), ("Ceará", "BR-CE", 21, False)]
    ey = painel_y + 22
    for nome, code, n, ativo in estados:
        if ativo:
            rect(f"e/{code}/bg", MARGIN - 10, ey - 8, 570, 40, fill=INK, cornerRadius=6)
        text(f"e/{code}/n", nome, MARGIN, ey, 380, 14, "#FFF8F2" if ativo else INK, SANS, 600 if ativo else 400)
        text(f"e/{code}/c", code, MARGIN + 360, ey + 1, 80, 10, GOLD_SOFT if ativo else MUTED, MONO)
        text(f"e/{code}/q", str(n), MARGIN + 420, ey, 100, 13, "#FFF8F2" if ativo else INK_2, MONO, 600 if ativo else 400, align="right")
        ey += 44

    # Cidades: indentadas, com fio vertical ligando ao estado
    cx0 = MARGIN + 660
    label("p2/t", "Cidades em São Paulo · 38", cx0, painel_y - 26, WINE, 11)
    rect("p2/liga", cx0 - 24, painel_y + 10, 2, 330, fill=WINE_SOFT)
    cidades = [("São Paulo", 12), ("Araraquara", 4), ("Campinas", 3), ("Bragança Paulista", 2), ("Santos", 2), ("Ribeirão Preto", 2), ("Sorocaba", 2)]
    cy = painel_y + 22
    for nome, n in cidades:
        rect(f"c/{nome}/bg", cx0, cy - 6, 420, 36, fill=CARD, cornerRadius=6, stroke=HAIRLINE, strokeWeight=1)
        text(f"c/{nome}/n", nome, cx0 + 16, cy, 320, 13, INK, SANS, 500)
        text(f"c/{nome}/q", f"{n} clubes", cx0 + 300, cy + 1, 100, 11, MUTED, SANS, align="right")
        cy += 42


    # — Faixa inferior: clubes em destaque. Preenche o vazio E da o que fazer a quem chegou
    # sem um clube em mente — a lista sozinha so serve a quem ja sabe o que procura.
    rule("destaque/linha", MARGIN, 720, W - MARGIN * 2, INK, 2)
    label("destaque/t", "Clubes mais visitados", MARGIN, 736, INK, 11)
    clubes = [("Flamengo", "Rio de Janeiro · BR", "426"), ("Palmeiras", "São Paulo · BR", "434"), ("Corinthians", "São Paulo · BR", "410"), ("Atlético-MG", "Minas Gerais · BR", "423"), ("Grêmio", "Rio Grande do Sul · BR", "398")]
    dx = MARGIN
    for i, (nome, local, jogos) in enumerate(clubes):
        rect(f"cx/{i}", dx, 764, 244, 112, fill=CARD, cornerRadius=8, stroke=HAIRLINE, strokeWeight=1)
        rect(f"cx/{i}/selo", dx + 18, 784, 36, 36, fill=PAPER_DEEP, cornerRadius=18, stroke=HAIRLINE, strokeWeight=1)
        text(f"cx/{i}/n", nome, dx + 18, 830, 200, 15, INK, DISPLAY, 700)
        text(f"cx/{i}/l", local, dx + 18, 852, 220, 10, MUTED, SANS)
        text(f"cx/{i}/j", f"{jogos} jogos", dx + 150, 784, 80, 11, WINE, MONO, 600, align="right")
        dx += 256
    rule("rodape/linha", MARGIN, 985, W - MARGIN * 2, HAIRLINE, 1)
    text("rodape/nota", "O estado é contexto de navegação — o filtro por cidade continua funcionando sozinho.", MARGIN, 999, 900, 11, MUTED, SANS)


# ── Tela: Lendas e Imortais ──────────────────────────────────────────────────────────────
def lendas():
    """Mecânica oposta: aqui o dado é ESCASSO e a página precisa de peso editorial, não de
    tabela. Números enormes, retratos em moldura, feitos em lista curta e datada."""
    cmd.clear()
    frame("Lendas", 0, 0, W, 1030, fill=PAPER)

    # Faixa escura no topo: a única página com "noite" — o panteão
    rect("faixa/noite", 0, 0, W, 300, fill=INK)
    rect("topo/linha", 0, 72, W, 1, fill="#3A332D")
    text("marca", "ALMANAQUE", MARGIN, 28, 260, 19, "#F7F3EC", DISPLAY, 700, ls=1.0)
    text("marca/2", "dos Clubes", MARGIN + 186, 35, 140, 11, "#8A8178", SANS, 400, ls=0.5)
    nav = ["Competições", "Clubes", "Jogadores", "Rankings", "Mapa", "Lendas"]
    nx = 430
    for i, item in enumerate(nav):
        ativo = i == 5
        text(f"nav/{item}", item, nx, 34, 160, 13, "#F7F3EC" if ativo else "#A79E96", SANS, 600 if ativo else 400)
        if ativo:
            rect(f"nav/{item}/sublinhado", nx, 56, 30, 2, fill=GOLD_SOFT)
        nx += 108

    text("titulo", "Lendas e Imortais", MARGIN, 128, 760, 56, "#F7F3EC", DISPLAY, 700, ls=-0.5)
    text("sub", "Os maiores jogadores, os maiores times e os recordes que definiram o esporte — cada feito com a fonte ao lado.", MARGIN, 200, 700, 15, "#A79E96", SANS, 400, lh=22)

    # Três números-âncora no escuro
    for i, (n, r) in enumerate([("1.284", "jogadores no panteão"), ("312", "títulos mundiais"), ("97", "recordes quebráveis")]):
        x = W - MARGIN - 720 + i * 250
        text(f"anc/{i}", n, x, 214, 200, 40, GOLD_SOFT, DISPLAY, 700)
        text(f"anc/{i}/r", r, x, 260, 220, 10, "#8A8178", SANS, 500, ls=1.0)

    # Conteúdo sobre papel
    label("s1/t", "Maiores jogadores da história", MARGIN, 340, INK, 11)
    jogadores = [("Pelé", "1940–2022", "3 Copas do Mundo · 1.279 gols", "1"), ("Diego Maradona", "1960–2020", "1 Copa · 1986 — o torneio de um homem", "2"), ("Lionel Messi", "1987–", "8 Bolas de Ouro · 1 Copa", "3"), ("Ronaldo Nazário", "1976–", "2 Copas · 2 Bolas de Ouro", "4")]
    jy = 372
    for i, (nome, vida, feito, pos) in enumerate(jogadores):
        text(f"j/{i}/p", pos, MARGIN, jy + 6, 40, 26, HAIRLINE, DISPLAY, 700, align="right")
        rect(f"j/{i}/retrato", MARGIN + 60, jy, 64, 64, fill=PAPER_DEEP, cornerRadius=32, stroke=HAIRLINE, strokeWeight=1)
        text(f"j/{i}/n", nome, MARGIN + 144, jy + 6, 320, 22, INK, DISPLAY, 700)
        text(f"j/{i}/v", vida, MARGIN + 144, jy + 36, 200, 11, MUTED, MONO)
        text(f"j/{i}/f", feito, MARGIN + 480, jy + 14, 460, 13, INK_2, SANS, 400)
        rule(f"j/{i}/fio", MARGIN, jy + 76, 900, HAIRLINE, 1)
        jy += 92

    # Coluna direita: recordes — lista curta, número em destaque
    rx = W - MARGIN - 340
    label("s2/t", "Recordes", rx, 340, WINE, 11)
    recordes = [("Mais gols em uma temporada", "91", "Messi · 2012"), ("Mais títulos de liga", "13", "Gento · Real Madrid"), ("Maior público", "199.854", "Maracanã · 1950")]
    ry = 372
    for i, (rot, n, quem) in enumerate(recordes):
        rect(f"r/{i}/bg", rx - 16, ry - 8, 330, 96, fill=CARD, cornerRadius=8, stroke=HAIRLINE, strokeWeight=1)
        text(f"r/{i}/rot", rot, rx, ry + 2, 290, 10, MUTED, SANS, 500, ls=0.8)
        text(f"r/{i}/n", n, rx, ry + 22, 290, 34, INK, DISPLAY, 700)
        text(f"r/{i}/quem", quem, rx, ry + 66, 290, 11, INK_2, SANS)
        ry += 108


    # — Maiores times: o segundo eixo do panteao. Sem isso a pagina responde so metade do pedido.
    rule("times/linha", MARGIN, 748, W - MARGIN * 2, INK, 2)
    label("times/t", "Maiores times da história", MARGIN, 764, INK, 11)
    times = [("Real Madrid", "14 Copas da Europa", "1902"), ("Milan", "7 Copas da Europa", "1899"), ("Barcelona", "5 Copas da Europa", "1899"), ("Bayern de Munique", "6 Copas da Europa", "1900"), ("Santos", "3 Mundiais · Pelé", "1912")]
    tx = MARGIN
    for i, (nome, feito, fund) in enumerate(times):
        rect(f"t/{i}", tx, 792, 244, 96, fill=CARD, cornerRadius=8, stroke=HAIRLINE, strokeWeight=1)
        text(f"t/{i}/n", nome, tx + 18, 810, 210, 15, INK, DISPLAY, 700)
        text(f"t/{i}/f", feito, tx + 18, 836, 210, 11, WINE, SANS, 600)
        text(f"t/{i}/a", f"desde {fund}", tx + 18, 858, 210, 10, MUTED, MONO)
        tx += 256
    rule("rodape/linha", MARGIN, 985, W - MARGIN * 2, HAIRLINE, 1)
    text("rodape/nota", "Cada número traz a fonte que o comprova — feito sem procedência não entra no panteão.", MARGIN, 999, 900, 11, MUTED, SANS)


if __name__ == "__main__":
    competicoes()
    json.dump(cmd, sys.stdout, ensure_ascii=False, indent=1)
