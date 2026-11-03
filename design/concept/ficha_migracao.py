"""
MIGRAÇÃO para o sistema FICHA — versões com os blocos REAIS das páginas existentes.

O primeiro conjunto desenhou um clube ideal e esqueceu metade do que a página já tem: kits,
flâmulas, hino, rivais, estatística por competição. O mesmo em jogador (gols por passagem,
conquistas, prêmios individuais). E não desenhou Dashboard nem Metodologia, que existem.

Aqui cada página é remontada com os blocos que o código realmente renderiza, na ordem em que
eles aparecem hoje. Nada foi inventado: o que não existe na página não entra.
"""

from ficha import (
    cmd, frame, rect, txt, rule, kicker, display, num, table_header, table_row,
    topbar, ficha_head, provenance,
    PAPER, SURFACE, SURFACE_2, BORDER, INK, INK_2, INK_3,
    CRIMSON, CRIMSON_INK, OCHRE,
    HEAD, BODY, W, M, CONTENT,
)


# ═════════════════════════════════════════════════════════════════════════════════════════
# CLUBE — migrado com TODOS os blocos reais de /clubs/[id]
#   sobre · estatística por competição · top rivais · honrarias · elenco ·
#   kits (uniforme) · flâmulas · hino · escudo (evolução) · geo-attribution
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_clube_migrado():
    frame("Clube", h=1980)
    topbar(active=1)

    txt("cl/k", "Clube · Rio de Janeiro · BR", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("cl/nome", "Clube de Regatas do Flamengo", M, 122, 60, INK, w=980, lh=62)
    txt("cl/fund", "Fundado em 17 de novembro de 1895 · Maracanã · 40.988 sócios", M, 194, 800,
        14, INK_2, BODY)
    rect("cl/escudo", W - M - 132, 108, 132, 132, fill=SURFACE, cornerRadius=4,
         stroke=BORDER, strokeWeight=1)
    txt("cl/escudo/t", "escudo", W - M - 132, 168, 132, 11, INK_3, BODY, 500, align="center")
    txt("cl/escudo/n", "domínio público", W - M - 132, 252, 132, 9, INK_3, BODY, 500,
        align="center")

    y = 272
    rule("cl/rule", M, y, CONTENT, INK, 2)

    # 1. PILARES
    ps = [("Títulos", "48", "oficiais reconhecidos"), ("Jogos", "426", "no acervo"),
          ("Gols", "812", "marcados"), ("Fundação", "1895", "há 130 anos")]
    for i, (l, v, n) in enumerate(ps):
        x = M + i * (CONTENT / 4)
        kicker(f"p/{l}/l", l, x, y + 16, INK_3, 260)
        num(f"p/{l}/v", v, x, y + 32, 44, CRIMSON if i == 0 else INK, w=260, align="left")
        txt(f"p/{l}/n", n, x, y + 82, 260, 11, INK_3, BODY)

    # 2. SOBRE O CLUBE (existia como "Sobre")
    sy = y + 124
    rule("s/rule", M, sy, CONTENT, INK, 2)
    kicker("s/l", "Sobre o clube", M, sy + 12, INK, 700)
    txt("s/t",
        "O Clube de Regatas do Flamengo nasceu como clube de remo e se tornou a maior torcida do Brasil. "
        "O futebol chegou em 1912, e o primeiro título carioca veio em 1914.",
        M, sy + 34, 820, 13, INK_2, BODY, 400, lh=20)
    txt("s/src", "Wikidata · CC0", M, sy + 96, 300, 10, OCHRE, BODY, 600, ls=1.4)

    # 3. ESTATÍSTICA POR COMPETIÇÃO (existia como club-stats-by-competition)
    ey = sy + 128
    rule("e/rule", M, ey, CONTENT, INK, 2)
    kicker("e/l", "Estatística por competição", M, ey + 12, INK, 700)
    cols = [("Competição", M, 420, "left"), ("J", M + 440, 70, "right"),
            ("V", M + 520, 70, "right"), ("E", M + 600, 70, "right"),
            ("D", M + 680, 70, "right"), ("GP", M + 760, 80, "right"),
            ("GC", M + 850, 80, "right"), ("Aprov.", M + 940, 110, "right")]
    table_header(cols, ey + 38)
    stats = [
        ("Brasileirão", "228", "128", "52", "48", "412", "268", "56%"),
        ("Copa Libertadores", "96", "54", "22", "20", "178", "104", "56%"),
        ("Copa do Brasil", "78", "46", "16", "16", "148", "92", "59%"),
        ("Carioca", "412", "268", "72", "72", "912", "540", "65%"),
    ]
    ry = ey + 64
    for i, s in enumerate(stats):
        table_row(i, list(s), ry, cols, strong=True)
        ry += 34

    # 4. TOP RIVAIS (existia como club-stats-top-rivals)
    ry2 = ry + 22
    rule("r/rule", M, ry2, CONTENT, INK, 2)
    kicker("r/l", "Maiores rivais", M, ry2 + 12, INK, 700)
    rivais = [("Fluminense", "412 jogos", "148 V · 112 E · 152 D"),
              ("Vasco da Gama", "388 jogos", "142 V · 104 E · 142 D"),
              ("Botafogo", "376 jogos", "138 V · 98 E · 140 D")]
    rx = M
    for i, (nome, jogos, detalhe) in enumerate(rivais):
        w = (CONTENT - 16 * 2) / 3
        rect(f"r/{i}", rx, ry2 + 36, w, 76, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"r/{i}/n", nome, rx + 16, ry2 + 52, w - 32, 17, INK, HEAD, 700)
        txt(f"r/{i}/j", jogos, rx + 16, ry2 + 78, w - 32, 11, OCHRE, BODY, 600)
        txt(f"r/{i}/d", detalhe, rx + 16, ry2 + 94, w - 32, 10, INK_3, BODY)
        rx += w + 16

    # 5. PAREDE DE HONRARIAS
    hy = ry2 + 132
    rule("h/rule", M, hy, CONTENT, INK, 2)
    kicker("h/l", "Parede de honrarias", M, hy + 12, INK, 700)
    txt("h/n", "48 títulos · 12 competições", W - M - 380, hy + 11, 380, 11, INK_3, BODY,
        500, align="right")
    cols_h = [("Competição", M, 460, "left"), ("Títulos", M + 480, 100, "right"),
              ("Anos", M + 600, 700, "left")]
    table_header(cols_h, hy + 38)
    honras = [
        ("Copa Libertadores da América", "3", "1981 · 2019 · 2022"),
        ("Campeonato Brasileiro", "8", "1980 · 1982 · 1983 · 1987 · 1992 · 2009 · 2019 · 2020"),
        ("Copa do Brasil", "5", "1990 · 2006 · 2013 · 2022 · 2024"),
        ("Supercopa do Brasil", "3", "2020 · 2021 · 2025"),
    ]
    hy2 = hy + 64
    for i, h in enumerate(honras):
        table_row(i, list(h), hy2, cols_h, strong=True)
        hy2 += 34

    # 6. ELENCO
    ly = hy2 + 22
    rule("el/rule", M, ly, CONTENT, INK, 2)
    kicker("el/l", "Elenco · 2025", M, ly + 12, INK, 700)
    txt("el/n", "28 jogadores", W - M - 380, ly + 11, 380, 11, INK_3, BODY, 500,
        align="right")
    cols_e = [("Jogador", M, 360, "left"), ("Posição", M + 380, 200, "left"),
              ("Idade", M + 600, 90, "right"), ("Jogos", M + 710, 110, "right"),
              ("Gols", M + 840, 100, "right")]
    table_header(cols_e, ly + 38)
    elenco = [("Pedro", "Atacante", "28", "42", "19"), ("Arrascaeta", "Meia", "31", "38", "11"),
              ("Bruno Henrique", "Atacante", "34", "35", "14"), ("Léo Pereira", "Zagueiro", "29", "40", "2")]
    ly2 = ly + 64
    for i, e in enumerate(elenco):
        table_row(i, list(e), ly2, cols_e, strong=True)
        ly2 += 34

    # 7. KITS — uniformes (existia como kit-label)
    ky = ly2 + 22
    rule("k/rule", M, ky, CONTENT, INK, 2)
    kicker("k/l", "Uniformes", M, ky + 12, INK, 700)
    kits = [("2025 · Casa", "#c8102e · #000000"), ("2025 · Fora", "#ffffff · #c8102e"),
            ("2025 · Terceiro", "#000000 · #c8102e")]
    kx = M
    for i, (nome, cores) in enumerate(kits):
        w = (CONTENT - 16 * 2) / 3
        rect(f"k/{i}", kx, ky + 36, w, 96, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        cor_camisa = CRIMSON if i == 0 else (SURFACE if i == 1 else INK)
        rect(f"k/{i}/camisa", kx + 16, ky + 50, 44, 56, fill=cor_camisa,
             stroke=BORDER, strokeWeight=1)
        txt(f"k/{i}/n", nome, kx + 76, ky + 56, w - 92, 14, INK, BODY, 600)
        txt(f"k/{i}/c", cores, kx + 76, ky + 78, w - 92, 10, INK_3, BODY)
        kx += w + 16

    # 8. FLÂMULAS (existia como pennant-figure)
    py2 = ky + 152
    rule("pf/rule", M, py2, CONTENT, INK, 2)
    kicker("pf/l", "Flâmulas", M, py2 + 12, INK, 700)
    for i in range(4):
        x = M + i * 110
        rect(f"pf/{i}", x, py2 + 36, 90, 120, fill=SURFACE_2, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"pf/{i}/a", f"19{60 + i * 8}", x, py2 + 130, 90, 10, INK_3, BODY, 500,
            align="center")

    # 9. HINO (existia como anthem-audio / anthem-lyrics-note)
    ay = py2 + 172
    rule("a/rule", M, ay, CONTENT, INK, 2)
    kicker("a/l", "Hino", M, ay + 12, INK, 700)
    rect("a/player", M, ay + 36, 420, 56, fill=SURFACE, cornerRadius=28, stroke=BORDER,
         strokeWeight=1)
    rect("a/play", M + 10, ay + 46, 36, 36, fill=CRIMSON, cornerRadius=18)
    txt("a/play/t", "▶", M + 20, ay + 55, 20, 12, "#faf8f5", BODY, 600)
    txt("a/t", "Hino oficial · 2:48", M + 58, ay + 56, 300, 12, INK_2, BODY, 500)
    txt("a/nota", "Letra exibida apenas quando a licença permite.", M + 440, ay + 56, 600, 11,
        INK_3, BODY)

    provenance("Títulos conferidos contra a lista do clube. Escudo com licença verificada no Wikimedia Commons. Estatísticas por competição somam apenas partidas com placar.", 1900)


# ═════════════════════════════════════════════════════════════════════════════════════════
# JOGADOR — migrado com os blocos reais de /players/[id]
#   métricas · carreira · gols por passagem · conquistas · prêmios individuais · clubes
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_jogador_migrado():
    frame("Jogador", h=1500)
    topbar(active=2)

    txt("j/k", "Jogador · atacante · Brasil", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("j/nome", "Edson Arantes do Nascimento", M, 122, 56, INK, w=900, lh=58)
    txt("j/aka", "Pelé · 1940–2022 · Santos, Brasil", M, 188, 700, 15, INK_2, BODY)
    rect("j/foto", W - M - 200, 104, 200, 260, fill=SURFACE, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    txt("j/foto/t", "retrato", W - M - 200, 226, 200, 11, INK_3, BODY, 500, align="center")

    y = 300
    rule("j/rule", M, y, CONTENT, INK, 2)

    # 1. MÉTRICAS
    ms = [("Jogos", "1.363"), ("Gols", "1.279"), ("Média", "0,94"), ("Títulos", "37")]
    for i, (l, v) in enumerate(ms):
        x = M + i * (CONTENT / 4)
        kicker(f"m/{l}/l", l, x, y + 16, INK_3, 260)
        num(f"m/{l}/v", v, x, y + 32, 42, CRIMSON if i == 1 else INK, w=260, align="left")

    # 2. CARREIRA
    cy = y + 104
    rule("c/rule", M, cy, CONTENT, INK, 2)
    kicker("c/l", "Carreira", M, cy + 12, INK, 700)
    cols = [("Clube", M, 400, "left"), ("Período", M + 420, 170, "left"),
            ("Jogos", M + 610, 110, "right"), ("Gols", M + 740, 110, "right"),
            ("Média", M + 870, 120, "right")]
    table_header(cols, cy + 38)
    carreira = [("Santos FC", "1956–1974", "1.116", "1.091", "0,98"),
                ("New York Cosmos", "1975–1977", "107", "65", "0,61"),
                ("Seleção Brasileira", "1957–1971", "114", "95", "0,83")]
    ry = cy + 64
    for i, c in enumerate(carreira):
        table_row(i, list(c), ry, cols, strong=True)
        ry += 34

    # 3. GOLS POR PASSAGEM (existia como goalsByStintTitle)
    gy = ry + 22
    rule("g/rule", M, gy, CONTENT, INK, 2)
    kicker("g/l", "Gols por passagem", M, gy + 12, INK, 700)
    cols_g = [("Passagem", M, 300, "left"), ("Temporadas", M + 320, 220, "left"),
              ("Gols", M + 560, 100, "right"), ("Jogos", M + 670, 100, "right"),
              ("Gols/jogo", M + 780, 140, "right")]
    table_header(cols_g, gy + 38)
    passagens = [("Santos 1956–58", "3", "168", "148", "1,14"),
                 ("Santos 1959–61", "3", "152", "132", "1,15"),
                 ("Santos 1962–64", "3", "144", "128", "1,13")]
    gy2 = gy + 64
    for i, p in enumerate(passagens):
        table_row(i, list(p), gy2, cols_g, strong=True)
        gy2 += 34

    # 4. CONQUISTAS (existia como achievementsTitle)
    qy = gy2 + 22
    rule("q/rule", M, qy, CONTENT, INK, 2)
    kicker("q/l", "Conquistas", M, qy + 12, INK, 700)
    txt("q/n", "37 títulos", W - M - 380, qy + 11, 380, 11, INK_3, BODY, 500, align="right")
    cols_q = [("Competição", M, 460, "left"), ("Títulos", M + 480, 100, "right"),
              ("Anos", M + 600, 700, "left")]
    table_header(cols_q, qy + 38)
    conquistas = [("Copa do Mundo", "3", "1958 · 1962 · 1970"),
                  ("Copa Libertadores", "2", "1962 · 1963"),
                  ("Mundial de Clubes", "2", "1962 · 1963"),
                  ("Campeonato Brasileiro", "6", "1961–1965 · 1968")]
    qy2 = qy + 64
    for i, q in enumerate(conquistas):
        table_row(i, list(q), qy2, cols_q, strong=True)
        qy2 += 34

    # 5. PRÊMIOS INDIVIDUAIS (existia como individualAwardsTitle)
    ay2 = qy2 + 22
    rule("aw/rule", M, ay2, CONTENT, INK, 2)
    kicker("aw/l", "Prêmios individuais", M, ay2 + 12, INK, 700)
    cols_a = [("Prêmio", M, 460, "left"), ("Vezes", M + 480, 100, "right"),
              ("Anos", M + 600, 700, "left")]
    table_header(cols_a, ay2 + 38)
    premios = [("Bola de Ouro", "1", "1970"),
               ("Melhor jogador da Copa", "1", "1970"),
               ("Bola de Prata", "1", "1970")]
    ay3 = ay2 + 64
    for i, p in enumerate(premios):
        table_row(i, list(p), ay3, cols_a, strong=True)
        ay3 += 34

    # 6. CLUBES (existia como clubsTitle)
    cy2 = ay3 + 22
    rule("cl/rule", M, cy2, CONTENT, INK, 2)
    kicker("cl/l", "Clubes", M, cy2 + 12, INK, 700)
    for i, (nome, periodo) in enumerate([("Santos FC", "1956–1974"), ("New York Cosmos", "1975–1977")]):
        x = M + i * 340
        rect(f"cl/{i}", x, cy2 + 36, 320, 66, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"cl/{i}/n", nome, x + 16, cy2 + 52, 288, 15, INK, HEAD, 700)
        txt(f"cl/{i}/p", periodo, x + 16, cy2 + 76, 288, 11, INK_3, BODY)

    provenance("Estatística consolidada de RSSSF e Wikidata. Divergência entre fontes é declarada na ficha da partida.", 1420)


# ═════════════════════════════════════════════════════════════════════════════════════════
# DASHBOARD — existe em /dashboard e não estava no conceito
#   Meu Almanaque (acervo do usuário) · Conta e assinatura · perfil
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_dashboard():
    frame("Dashboard", h=980)
    topbar(active=-1)
    y = ficha_head(
        "Meu Almanaque", "7", "itens acompanhados",
        "Sua conta · painel",
        "O que você acompanha, o que mudou e o estado da sua assinatura.",
        y=104,
    )

    # Bloco 1 — Meu Almanaque
    kicker("d/meu/l", "Meu Almanaque", M, y + 12, INK, 700)
    cartoes = [("Clubes favoritos", "4"), ("Competições", "2"), ("Jogadores", "1"),
               ("Rankings", "1")]
    cx = M
    for i, (l, v) in enumerate(cartoes):
        w = (CONTENT - 16 * 3) / 4
        rect(f"d/{i}", cx, y + 36, w, 92, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"d/{i}/l", l, cx + 16, y + 54, w - 32, 11, INK_3, BODY, 600, )
        num(f"d/{i}/v", v, cx + 16, y + 74, 34, CRIMSON, w=w - 32, align="left")
        cx += w + 16

    # Bloco 2 — Conta e assinatura
    sy = y + 156
    rule("d/s/rule", M, sy, CONTENT, INK, 2)
    kicker("d/s/l", "Conta e assinatura", M, sy + 12, INK, 700)
    cols = [("Item", M, 300, "left"), ("Situação", M + 320, 260, "left"),
            ("Detalhe", M + 600, 520, "left"), ("Ação", M + 1140, 120, "left")]
    table_header(cols, sy + 38)
    conta = [
        ("Plano", "Apoiador", "renova em 12/2026", "gerenciar"),
        ("Perfil", "completo", "nome, e-mail e bio", "editar"),
        ("Notificações", "ativas", "e-mail semanal", "ajustar"),
    ]
    cy2 = sy + 64
    for i, c in enumerate(conta):
        table_row(i, list(c), cy2, cols, strong=True)
        cy2 += 34

    # Bloco 3 — perfil pendente (existia como dashboard-profile-pending)
    py = cy2 + 24
    rect("d/p/bg", M - 8, py, CONTENT + 16, 72, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    txt("d/p/t", "Perfil incompleto", M + 12, py + 14, 400, 13, INK, BODY, 600)
    txt("d/p/d", "Faltam 2 campos: biografia e clube do coração.", M + 12, py + 36, 700, 11,
        INK_2, BODY)

    provenance("Dados da conta são privados. Favoritos sem conta ficam neste navegador.", 900)


# ═════════════════════════════════════════════════════════════════════════════════════════
# METODOLOGIA — existe em /metodologia (522 linhas) e é o que sustenta todo número
# ═════════════════════════════════════════════════════════════════════════════════════════
def p_metodologia():
    frame("Metodologia", h=1240)
    topbar(active=-1)
    y = ficha_head(
        "Metodologia e fontes", "12", "seções",
        "Institucional · como cada número é feito",
        "Toda nota do Almanaque tem origem declarada. Esta página é a origem — e a lista do que ainda não sabemos.",
        y=104,
    )

    # Coluna esquerda: índice das 12 seções (a página é longa)
    kicker("m/i/l", "Nesta página", M, y + 14, INK, 700)
    secoes = ["Fontes", "Ranking 0-100 (competição)", "Ranking 0-100 (jogadores)",
              "Agregado cross-division", "Conquistas estaduais", "Critério de verificação",
              "Divergências entre fontes", "Limitações conhecidas", "Correções"]
    iy = y + 40
    for i, s in enumerate(secoes):
        txt(f"m/i{i}/n", s, M, iy, 380, 12, INK_2, BODY, i == 0)
        rule(f"m/i{i}/l", M, iy + 20, 380, BORDER, 1)
        iy += 30

    # Coluna direita: o conteúdo (fontes + critério + limitações)
    rx = M + 440
    kicker("m/f/l", "Fontes", rx, y + 14, INK, 700)
    cols = [("Fonte", rx, 300, "left"), ("Licença", rx + 320, 200, "left"),
            ("O que fornece", rx + 540, 330, "left")]
    table_header(cols, y + 40)
    fontes = [
        ("Wikidata", "CC0", "clubes, jogadores, estados, escudos"),
        ("RSSSF", "uso livre", "títulos e campanhas históricas"),
        ("football-data", "aberta", "partidas e placares recentes"),
        ("Wikimedia Commons", "CC/PD", "escudos com licença verificada"),
    ]
    fy = y + 66
    for i, f in enumerate(fontes):
        table_row(i, list(f), fy, cols, strong=True)
        fy += 34

    # Critério de verificação
    cy = fy + 24
    rule("m/c/rule", rx, cy, CONTENT - 440, INK, 2)
    kicker("m/c/l", "Critério de verificação", rx, cy + 12, OCHRE, 700)
    txt("m/c/t",
        "Um dado entra quando duas fontes independentes concordam. Quando não concordam, a divergência é publicada — não escolhida. Quando só uma fonte existe, o dado entra marcado como fonte única.",
        rx, cy + 34, CONTENT - 440, 12, INK_2, BODY, 400, lh=18)

    # Limitações conhecidas — o que faz a página ser honesta
    ly = cy + 96
    rect("m/l/bg", rx - 8, ly, CONTENT - 424, 132, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    kicker("m/l/t", "Limitações conhecidas", rx + 4, ly + 14, CRIMSON, 700)
    limitacoes = [
        "Cidade normalizada cobre 3,7% dos clubes; por isso a hierarquia usa estado.",
        "Jogadores não têm estado nem cidade — o modelo não tem o campo.",
        "Partidas sem placar não entram em nenhum agregado: ausência não é 0×0.",
        "Mercado da bola não tem fonte: a página declara isso em vez de mostrar vazio.",
    ]
    ly2 = ly + 36
    for i, t in enumerate(limitacoes):
        txt(f"m/l{i}/n", f"— {t}", rx + 4, ly2, CONTENT - 456, 11, INK_2, BODY, 400, lh=16)
        ly2 += 22

    provenance("Esta página é a fonte de todas as outras. Onde ela não alcança, a lacuna está escrita acima.", 1160)


PAGES_MIGRADAS = [
    ("clube-migrado", p_clube_migrado),
    ("jogador-migrado", p_jogador_migrado),
    ("dashboard", p_dashboard),
    ("metodologia", p_metodologia),
]
