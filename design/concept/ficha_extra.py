"""
Páginas ausentes do sistema FICHA — a segunda leva.

O primeiro conjunto (10 telas) cobriu o núcleo de consulta. Faltavam justamente as páginas que
LIGAM as outras:

  home       porta de entrada; hoje não existe no conceito e é o que conecta tudo
  ranking    detalhe de um ranking (72 rankings, 1.954 entradas no banco; a página é um stub)
  estadio    não existe tela para 84 estádios e 3.475 clubes com nome de estádio
  temporada  não existe tela para 32 temporadas
  busca      stub de 17 linhas; é o eixo transversal de navegação
  favoritos  stub de 12 linhas; é o que faz o usuário voltar

Todas usam a mesma espinha (kicker, título display, âncora, fio, corpo, procedência).
"""

from ficha import (
    cmd, frame, rect, txt, rule, kicker, display, num, table_header, table_row, pillar,
    topbar, ficha_head, provenance,
    PAPER, SURFACE, SURFACE_2, MUTED, BORDER, INK, INK_2, INK_3,
    CRIMSON, CRIMSON_INK, OCHRE, NIGHT, NIGHT_SURF, NIGHT_SURF2, NIGHT_BORDER,
    NIGHT_INK, NIGHT_INK2, NIGHT_INK3, NIGHT_CRIMSON, NIGHT_OCHRE,
    HEAD, BODY, W, M, CONTENT,
)


# ═════════════════════════════════════════════════════════════════════════════════════════
# HOME — a porta de entrada. Não é hero: é índice + último movimento + atalho por interesse.
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_home():
    frame("Home", h=1180)
    topbar(active=-1)

    # Faixa de abertura: o acervo em número, não um slogan
    txt("h/k", "Almanaque dos Clubes · desde 2024", M, 104, 700, 10, INK_3, BODY, 600, ls=2.2)
    display("h/titulo", "Todo o futebol, em ficha", M, 122, 62, INK, w=900)
    txt("h/sub",
        "12.017 clubes, 105.211 jogadores, 1.932 competições e 17.265 partidas — cada número com a fonte ao lado.",
        M, 198, 760, 15, INK_2, BODY, 400, lh=22)
    rule("h/rule", M, 244, CONTENT, INK, 2)

    # Quatro portas de entrada — o que a Home faz é ESCOLHER por onde começar
    portas = [
        ("Competições", "1.932", "do mundial ao estadual"),
        ("Clubes", "12.017", "220 países"),
        ("Jogadores", "105.211", "72 posições"),
        ("Lendas", "1.284", "o panteão"),
    ]
    for i, (nome, n, nota) in enumerate(portas):
        x = M + i * (CONTENT / 4)
        rect(f"h/p{i}", x, 268, CONTENT / 4 - 16, 132, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"h/p{i}/n", nome, x + 18, 288, 240, 17, INK, HEAD, 700)
        num(f"h/p{i}/v", n, x + 18, 316, 40, CRIMSON, w=240, align="left")
        txt(f"h/p{i}/nota", nota, x + 18, 368, 240, 11, INK_3, BODY)

    # Duas colunas: "agora" (movimento) e "explore" (índice)
    ay = 432
    kicker("h/agora/l", "Agora no acervo", M, ay, INK, 700)
    agora = [
        ("há 2 h", "RSSSF", "12.417 linhas de títulos aplicadas"),
        ("há 5 h", "football-data", "380 partidas da temporada 2025-26"),
        ("ontem", "Wikidata", "66 estados da Grécia catalogados"),
        ("ontem", "Commons", "11 escudos com licença verificada"),
    ]
    ly = ay + 28
    for i, (quando, fonte, o_que) in enumerate(agora):
        txt(f"h/a{i}/q", quando, M, ly, 90, 11, INK_3, BODY, 500)
        txt(f"h/a{i}/f", fonte, M + 100, ly, 160, 11, INK, BODY, 600)
        txt(f"h/a{i}/o", o_que, M + 270, ly, 420, 12, INK_2, BODY)
        rule(f"h/a{i}/l", M, ly + 22, 700, BORDER, 1)
        ly += 34

    # Explore: o índice que liga a todas as páginas
    ex = M + 760
    kicker("h/ex/l", "Explorar", ex, ay, INK, 200)
    links = [
        ("Rankings", "72 rankings publicados"),
        ("Estádios", "84 catalogados"),
        ("Temporadas", "32 arquivadas"),
        ("Mapa", "220 países"),
        ("Comparar", "clube a clube"),
        ("Metodologia", "como cada número é feito"),
    ]
    ly = ay + 28
    for i, (nome, nota) in enumerate(links):
        txt(f"h/e{i}/n", nome, ex, ly, 240, 14, INK, BODY, 600)
        txt(f"h/e{i}/nota", nota, ex + 180, ly + 1, 280, 11, INK_3, BODY)
        txt(f"h/e{i}/seta", "→", W - M - 24, ly, 24, 13, CRIMSON, BODY, 600, align="right")
        rule(f"h/e{i}/l", ex, ly + 24, CONTENT - 760, BORDER, 1)
        ly += 38

    # Rodapé de rastreabilidade: o que o produto promete
    fy = 900
    rule("h/f/rule", M, fy, CONTENT, INK, 2)
    kicker("h/f/l", "O que sustenta o acervo", M, fy + 12, INK, 700)
    pilares = [("Toda fonte é declarada", "CC0, RSSSF, football-data, Wikidata"),
               ("Ausência não vira zero", "lacuna é dita, não preenchida"),
               ("Partida sem placar não conta", "não soma ponto nem gol"),
               ("Escudo só com licença", "verificada no Commons")]
    for i, (t, n) in enumerate(pilares):
        x = M + i * (CONTENT / 4)
        txt(f"h/g{i}/t", t, x, fy + 40, 280, 13, INK, BODY, 600)
        txt(f"h/g{i}/n", n, x, fy + 60, 280, 11, INK_3, BODY, 400, lh=15)

    provenance("Acervo atualizado em 02/11/2026. Cada página carrega a fonte do que mostra.", 1040)


# ═════════════════════════════════════════════════════════════════════════════════════════
# RANKING (detalhe) — 72 rankings, 1.954 entradas no banco, página stub hoje
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_ranking():
    frame("Ranking", h=1240)
    topbar(active=3)
    y = ficha_head(
        "Ranking de clubes", "1.954", "entradas publicadas",
        "Rankings · edição 2025 · 72 rankings",
        "Cada ranking é uma régua declarada. Esta é a de clubes, por títulos ponderados.",
        y=104,
    )

    # Filtro de ranking: os 72 são muitos; a página precisa dizer QUAL régua
    kicker("r/f/l", "Régua", M, y + 12, INK, 700)
    reguas = ["Clubes", "Jogadores", "Competições", "Seleções", "Técnicos"]
    x = M
    for i, nome in enumerate(reguas):
        w = 34 + int(len(nome) * 7.4)
        ativo = i == 0
        rect(f"r/f{i}", x, y + 30, w, 32, fill=INK if ativo else SURFACE, cornerRadius=2,
             stroke=INK if ativo else BORDER, strokeWeight=1)
        txt(f"r/f{i}/t", nome, x + 16, y + 39, w - 32, 12,
            "#faf8f5" if ativo else INK_2, BODY, 600 if ativo else 500)
        x += w + 10

    # A tabela é o produto
    ty = y + 84
    cols = [("#", M, 50, "right"), ("Clube", M + 70, 340, "left"),
            ("País", M + 430, 150, "left"), ("Pts", M + 600, 90, "right"),
            ("Var.", M + 700, 80, "right"), ("Mundial", M + 800, 110, "right"),
            ("Continental", M + 930, 130, "right"), ("Nacional", M + 1080, 120, "right")]
    table_header(cols, ty)

    dados = [
        ("1", "Real Madrid", "Espanha", "1.842", "—", "5", "14", "36"),
        ("2", "Manchester City", "Reino Unido", "1.790", "▲2", "1", "1", "10"),
        ("3", "Bayern de Munique", "Alemanha", "1.744", "▼1", "2", "6", "33"),
        ("4", "Liverpool", "Reino Unido", "1.701", "▼1", "1", "6", "19"),
        ("5", "Barcelona", "Espanha", "1.688", "▲1", "0", "5", "27"),
        ("6", "Paris Saint-Germain", "França", "1.640", "▲3", "0", "0", "12"),
        ("7", "Juventus", "Itália", "1.612", "▼2", "0", "2", "36"),
        ("8", "Chelsea", "Reino Unido", "1.596", "—", "1", "2", "6"),
        ("9", "Milan", "Itália", "1.580", "▲1", "1", "7", "18"),
        ("10", "Flamengo", "Brasil", "1.552", "▲4", "1", "3", "8"),
        ("11", "Palmeiras", "Brasil", "1.508", "▼3", "0", "3", "12"),
        ("12", "Boca Juniors", "Argentina", "1.494", "▼1", "0", "6", "28"),
        ("13", "River Plate", "Argentina", "1.470", "▲2", "0", "4", "37"),
        ("14", "Inter de Milão", "Itália", "1.452", "▼1", "0", "3", "19"),
        ("15", "Ajax", "Países Baixos", "1.428", "▼3", "0", "4", "36"),
    ]
    ry = ty + 26
    for i, d in enumerate(dados):
        table_row(i, list(d), ry, cols, strong=(i < 3))
        ry += 34

    # Nota do critério — o que separa ranking de opinião
    ny = ry + 20
    rect("r/n/bg", M - 8, ny, CONTENT + 16, 84, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    kicker("r/n/l", "Como a pontuação é calculada", M + 12, ny + 12, OCHRE, 700)
    txt("r/n/t",
        "Título oficial × peso de alcance (mundial 3 · continental 2 · nacional 1), com campanha e força de adversário. O peso de cada competição é público e versionado — a mesma régua se aplica a todos os 1.954 clubes.",
        M + 12, ny + 32, CONTENT - 48, 12, INK_2, BODY, 400, lh=17)

    provenance("Ranking publicado em 01/11/2026. Recalculado a cada rodada; o histórico fica auditável por temporada.", 1150)


# ═════════════════════════════════════════════════════════════════════════════════════════
# ESTÁDIO — 84 catalogados + 3.475 clubes com nome de estádio
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_estadio():
    frame("Estádio", h=1120)
    topbar(active=1)

    txt("e/k", "Estádio · Rio de Janeiro · BR", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("e/nome", "Maracanã", M, 122, 66, INK, w=900)
    txt("e/sub", "Estádio Jornalista Mário Filho · inaugurado em 1950 · capacidade 78.838",
        M, 200, 800, 15, INK_2, BODY)

    # Número-âncora: o recorde que o estádio carrega
    num("e/rec", "199.854", W - M - 360, 116, 56, CRIMSON, w=360)
    txt("e/rec/l", "MAIOR PÚBLICO · 1950", W - M - 360, 180, 360, 10, INK_3, BODY, 600,
        align="right", ls=2.0)

    rule("e/rule", M, 244, CONTENT, INK, 2)

    # Pilares
    ps = [("Capacidade", "78.838", "atual"), ("Inauguração", "1950", "há 76 anos"),
          ("Partidas no acervo", "412", "desde 1950"), ("Clubes mandantes", "4", "RJ")]
    for i, (l, v, n) in enumerate(ps):
        x = M + i * (CONTENT / 4)
        kicker(f"e/p{i}/l", l, x, 260, INK_3, 280)
        num(f"e/p{i}/v", v, x, 276, 38, CRIMSON if i == 0 else INK, w=280, align="left")
        txt(f"e/p{i}/n", n, x, 322, 280, 11, INK_3, BODY)

    # Clubes que mandam aqui — a ligação de ida para o clube
    cy = 366
    rule("e/c/rule", M, cy, CONTENT, INK, 2)
    kicker("e/c/l", "Clubes que mandam aqui", M, cy + 12, INK, 700)
    clubes = [("Flamengo", "426 jogos"), ("Fluminense", "388 jogos"),
              ("Vasco da Gama", "112 jogos"), ("Botafogo", "94 jogos")]
    cx = M
    for i, (nome, jogos) in enumerate(clubes):
        w = (CONTENT - 16 * 3) / 4
        rect(f"e/c{i}", cx, cy + 38, w, 72, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"e/c{i}/n", nome, cx + 16, cy + 54, w - 32, 16, INK, HEAD, 700)
        txt(f"e/c{i}/j", jogos, cx + 16, cy + 80, w - 32, 11, OCHRE, BODY, 600)
        cx += w + 16

    # Maiores públicos — a história do estádio em tabela
    hy = cy + 138
    rule("e/h/rule", M, hy, CONTENT, INK, 2)
    kicker("e/h/l", "Maiores públicos", M, hy + 12, INK, 700)
    cols = [("Data", M, 130, "left"), ("Partida", M + 150, 520, "left"),
            ("Público", M + 700, 130, "right"), ("Competição", M + 860, 300, "left")]
    table_header(cols, hy + 38)
    publicos = [
        ("16/07/1950", "Brasil 1 × 2 Uruguai", "199.854", "Copa do Mundo"),
        ("15/03/1969", "Flamengo 2 × 2 Vasco", "180.000", "Carioca"),
        ("31/05/1969", "Flamengo 2 × 1 Fluminense", "171.599", "Carioca"),
        ("29/06/1969", "Brasil 2 × 1 Paraguai", "171.000", "Eliminatórias"),
    ]
    py2 = hy + 64
    for i, p in enumerate(publicos):
        table_row(i, list(p), py2, cols, strong=True)
        py2 += 34

    provenance("Capacidade e recordes conforme a administração do estádio; partidas conforme o acervo. Divergência entre fontes fica declarada.", 1030)


# ═════════════════════════════════════════════════════════════════════════════════════════
# TEMPORADA — 32 temporadas no banco
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_temporada():
    frame("Temporada", h=1100)
    topbar(active=0)
    y = ficha_head(
        "Temporada 2024-25", "38", "rodadas · 10 competições",
        "Temporada · a edição inteira",
        "Uma temporada reúne todas as competições daquele ano: quem venceu o quê, e como cada tabela terminou.",
        y=104,
    )

    # Competições da temporada — a ligação de ida para cada competição
    kicker("t/c/l", "Competições nesta temporada", M, y + 12, INK, 700)
    comps = [
        ("Premier League", "Liverpool", "84", "38"),
        ("La Liga", "Barcelona", "88", "38"),
        ("Serie A", "Napoli", "82", "38"),
        ("Brasileirão Série A", "Botafogo", "79", "38"),
        ("Copa Libertadores", "Botafogo", "—", "13"),
        ("UEFA Champions League", "PSG", "—", "13"),
    ]
    cy = y + 40
    cols = [("Competição", M, 420, "left"), ("Campeão", M + 440, 320, "left"),
            ("Pts", M + 780, 90, "right"), ("Jogos", M + 890, 100, "right"),
            ("Artilheiro", M + 1010, 300, "left")]
    table_header(cols, cy)
    ry = cy + 26
    for i, c in enumerate(comps):
        table_row(i, list(c), ry, cols, strong=True)
        ry += 34

    # Linha do tempo da temporada: o que aconteceu, em ordem
    ty = ry + 26
    rule("t/t/rule", M, ty, CONTENT, INK, 2)
    kicker("t/t/l", "A temporada em ordem", M, ty + 12, INK, 700)
    marcos = [("AGO", "Abertura", "38 rodadas começam nas 10 competições"),
              ("DEZ", "Meia temporada", "3 trocas de líder na Premier League"),
              ("MAR", "Retas finais", "Definidas 6 das 10 vagas continentais"),
              ("MAI", "Encerramento", "4 títulos decididos na última rodada")]
    mx = M
    for i, (mes, titulo, fato) in enumerate(marcos):
        w = (CONTENT - 24 * 3) / 4
        num(f"t/t{i}/m", mes, mx, ty + 36, 26, CRIMSON, w=w, align="left")
        rule(f"t/t{i}/f", mx, ty + 70, w - 20, BORDER, 1)
        txt(f"t/t{i}/tit", titulo, mx, ty + 80, w - 20, 13, INK, BODY, 600)
        txt(f"t/t{i}/fato", fato, mx, ty + 100, w - 20, 11, INK_2, BODY, 400, lh=15)
        mx += w + 24

    # Números da temporada
    ny = ty + 148
    rule("t/n/rule", M, ny, CONTENT, INK, 2)
    nums = [("Partidas", "1.842"), ("Gols", "4.988"), ("Média por jogo", "2,71"),
            ("0 a 0", "112"), ("Maior goleada", "9 × 0"), ("Público total", "12,4 mi")]
    for i, (l, v) in enumerate(nums):
        x = M + i * (CONTENT / 6)
        kicker(f"t/n{i}/l", l, x, ny + 14, INK_3, 200)
        num(f"t/n{i}/v", v, x, ny + 30, 30, INK, w=200, align="left")

    provenance("Temporada montada pela data da partida. Competição sem edição no ano não aparece — lacuna declarada.", 1010)


# ═════════════════════════════════════════════════════════════════════════════════════════
# BUSCA — 17 linhas hoje. É o eixo transversal: liga TODAS as páginas
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_busca():
    frame("Busca", h=960)
    topbar(active=-1)

    txt("b/k", "Busca · 5 tipos de resultado", M, 104, 700, 10, INK_3, BODY, 600, ls=2.2)
    display("b/titulo", "Buscar no Almanaque", M, 122, 52, INK, w=900)

    # Campo grande — a ação principal da página
    rect("b/campo", M, 196, CONTENT, 64, fill=SURFACE, cornerRadius=4, stroke=INK,
         strokeWeight=2)
    txt("b/campo/t", "flamengo", M + 22, 216, 700, 22, INK, BODY, 500)
    rect("b/campo/x", W - M - 56, 212, 32, 32, fill=SURFACE_2, cornerRadius=16)
    txt("b/campo/x/t", "×", W - M - 47, 218, 24, 14, INK_3, BODY, 600)

    txt("b/dica", "Clube, jogador, competição, estádio ou cidade. Sem acento e sem caixa.", M, 272,
        800, 11, INK_3, BODY)

    # Resultados agrupados por TIPO — é o que faz a busca ligar todas as páginas
    ry = 320
    grupos = [
        ("Clubes", "3",
         [("Flamengo", "Rio de Janeiro · BR · 48 títulos", "clube"),
          ("Flamengo de Guarulhos", "São Paulo · BR", "clube"),
          ("Flamengo Esporte Clube", "Bahia · BR", "clube")]),
        ("Jogadores", "2",
         [("Flamengo (jogador)", "atacante · 1998", "jogador"),
          ("Flamenguinho", "meia · 2004", "jogador")]),
        ("Competições", "1",
         [("Copa Flamengo", "estadual · RJ", "competição")]),
        ("Cidades", "1", [("Flamengo, Maranhão", "1 clube", "cidade")]),
    ]
    for nome, n, itens in grupos:
        kicker(f"b/g/{nome}", f"{nome} · {n}", M, ry, INK, 700)
        rule(f"b/g/{nome}/l", M, ry + 18, CONTENT, INK, 2)
        iy = ry + 28
        for i, (titulo, meta, tipo) in enumerate(itens):
            txt(f"b/{nome}/{i}/t", titulo, M, iy, 420, 15, INK, BODY, 600)
            txt(f"b/{nome}/{i}/m", meta, M + 440, iy + 2, 500, 11, INK_3, BODY)
            txt(f"b/{nome}/{i}/tipo", tipo, W - M - 120, iy + 1, 120, 10, OCHRE, BODY,
                600, align="right", ls=1.4)
            rule(f"b/{nome}/{i}/l", M, iy + 24, CONTENT, BORDER, 1)
            iy += 34
        ry = iy + 22

    provenance("A busca cobre 5 tipos. Resultado sem correspondência não é inventado — o grupo não aparece.", 900)


# ═════════════════════════════════════════════════════════════════════════════════════════
# FAVORITOS — 12 linhas hoje. É o que faz o usuário voltar.
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_favoritos():
    frame("Favoritos", h=980)
    topbar(active=-1)
    y = ficha_head(
        "Favoritos", "7", "itens seguidos",
        "Sua conta · o que você acompanha",
        "Clubes, competições e jogadores que você marcou. O painel mostra o que mudou desde a última visita.",
        y=104,
    )

    # O que mudou: a razão de voltar
    kicker("f/m/l", "Mudou desde sua última visita", M, y + 12, CRIMSON, 700)
    mudancas = [
        ("Flamengo", "comprou", "2 títulos novos catalogados (Supercopa 2025)"),
        ("Premier League", "encerrou", "temporada 2025-26 completa no acervo"),
        ("Pelé", "atualizou", "3 partidas novas com placar conferido"),
    ]
    my = y + 38
    for i, (quem, verbo, o_que) in enumerate(mudancas):
        rect(f"f/m{i}", M, my, CONTENT, 52, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"f/m{i}/q", quem, M + 16, my + 10, 220, 14, INK, BODY, 600)
        txt(f"f/m{i}/v", verbo, M + 250, my + 11, 100, 11, OCHRE, BODY, 600, ls=1.2)
        txt(f"f/m{i}/o", o_que, M + 370, my + 11, 780, 12, INK_2, BODY)
        txt(f"f/m{i}/seta", "→", W - M - 30, my + 14, 30, 14, CRIMSON, BODY, 600,
            align="right")
        my += 60

    # A lista, por tipo
    ly = my + 22
    rule("f/l/rule", M, ly, CONTENT, INK, 2)
    kicker("f/l/l", "Tudo que você segue", M, ly + 12, INK, 700)
    cols = [("Tipo", M, 140, "left"), ("Nome", M + 160, 460, "left"),
            ("Última mudança", M + 640, 260, "left"), ("Ação", M + 920, 220, "left")]
    table_header(cols, ly + 38)
    itens = [
        ("Clube", "Flamengo", "há 2 h", "ver ficha"),
        ("Clube", "Palmeiras", "há 1 d", "ver ficha"),
        ("Competição", "Premier League", "há 5 h", "ver tabela"),
        ("Competição", "Copa Libertadores", "há 3 d", "ver edições"),
        ("Jogador", "Pelé", "há 1 d", "ver ficha"),
        ("Jogador", "Messi", "há 6 d", "ver ficha"),
        ("Ranking", "Ranking de clubes", "há 1 d", "ver ranking"),
    ]
    iy = ly + 64
    for i, it in enumerate(itens):
        table_row(i, list(it), iy, cols, strong=True)
        iy += 34

    provenance("Favoritos são privados e sincronizados com a conta. Sem conta, ficam neste navegador.", 900)


PAGES_NOVAS = [
    ("home", p_home),
    ("ranking", p_ranking),
    ("estadio", p_estadio),
    ("temporada", p_temporada),
    ("busca", p_busca),
    ("favoritos", p_favoritos),
]
