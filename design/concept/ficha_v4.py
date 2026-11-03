"""
Sistema FICHA v4 — os quatro itens que faltavam (9, 10, 14, 15).

  9  ADMIN ....... KPIs e funções de administrador
 10  METODOLOGIA . aprofundada: fórmula 0-100, pilotos, divergências, versionamento
 14  COMPARAR .... clubes, jogadores e TÉCNICOS, com gráficos
 15  TABELAS ..... a tabela muda com o formato da competição

Dado real usado no item 15: o acervo tem 925 LEAGUE, 304 CUP, 1 TOURNAMENT e SUPER_CUP
(enum `CompetitionType`). Cada formato pede uma tabela diferente — é o que a página demonstra.
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
# 9. ADMIN — todas as métricas e KPIs, e as funções de administrador
# ═════════════════════════════════════════════════════════════════════════════════════════
def v4_admin():
    frame("Admin", h=1560, fill=SURFACE_2)

    # Barra de administração: baixa, densa, sem marca grande
    rect("a/top", 0, 0, W, 52, fill=INK)
    txt("a/brand", "ALMANAQUE", M, 17, 200, 15, NIGHT_INK, HEAD, 700)
    txt("a/brand/2", "admin", M + 100, 19, 100, 11, NIGHT_INK3, BODY, 500)
    # navegação de admin — as 12 rotas reais
    nav = ["Operação", "Moderação", "Revisão", "Ingestão", "Catálogo", "Auditoria",
           "Métricas", "Observability", "LGPD"]
    nx = M + 168
    for i, n in enumerate(nav):
        txt(f"a/nav/{i}", n, nx, 19, 120, 10, NIGHT_OCHRE if i == 0 else NIGHT_INK3, BODY,
            600 if i == 0 else 400)
        nx += 84
    txt("a/env", "produção", W - M - 236, 19, 90, 9, NIGHT_OCHRE, BODY, 600, ls=1.2,
        align="right")
    txt("a/user", "edina@…", W - M - 132, 19, 132, 9, NIGHT_INK3, BODY, 400, align="right")

    txt("a/k", "Painel", M, 76, 400, 10, INK_3, BODY, 600, ls=2.2)
    display("a/t", "Operação", M, 92, 44, INK, w=600)
    txt("a/sub", "Estado do acervo, saúde da ingestão, filas de trabalho e integridade do dado.",
        M, 146, 800, 13, INK_2, BODY)
    rule("a/rule", M, 178, CONTENT, INK, 2)

    # ── BLOCO 1: acervo ────────────────────────────────────────────────────────────
    kicker("a/b1/l", "Acervo", M, 196, INK, 700)
    txt("a/b1/n", "atualizado há 4 min", W - M - 380, 195, 380, 10, INK_3, BODY, 500,
        align="right")
    acervo = [("Clubes", "12.017", "+18 hoje", "+0,15%"),
              ("Jogadores", "105.211", "+412 hoje", "+0,39%"),
              ("Competições", "1.932", "+0", "0%"),
              ("Partidas", "17.265", "+0", "0%"),
              ("Estádios", "84", "+0", "0%"),
              ("Temporadas", "32", "+0", "0%")]
    for i, (l, v, hoje, pct) in enumerate(acervo):
        x = M + i * (CONTENT / 6)
        kicker(f"a/ac{i}/l", l, x, 226, INK_3, 180)
        num(f"a/ac{i}/v", v, x, 242, 30, INK, w=180, align="left")
        txt(f"a/ac{i}/h", hoje, x, 282, 180, 10, INK_2, BODY, 500)
        txt(f"a/ac{i}/p", pct, x, 298, 180, 10, OCHRE, BODY, 600)

    # ── BLOCO 2: qualidade do dado ────────────────────────────────────────────────
    qy = 336
    rule("a/b2/rule", M, qy, CONTENT, INK, 2)
    kicker("a/b2/l", "Qualidade do dado", M, qy + 12, INK, 700)
    qual = [("Club com país", "99,2%", 99),
            ("Clube com estado", "23,4%", 23),
            ("Clube com cidade", "3,7%", 4),
            ("Escudo com licença", "5,2%", 5),
            ("Partida com placar", "87,1%", 87),
            ("Competição com fonte", "94,8%", 95)]
    qx = M
    for i, (l, pct, barra) in enumerate(qual):
        w = (CONTENT - 16 * 5) / 6
        rect(f"a/q{i}", qx, qy + 36, w, 84, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"a/q{i}/l", l, qx + 12, qy + 48, w - 24, 10, INK_3, BODY, 500)
        num(f"a/q{i}/v", pct, qx + 12, qy + 64, 20, CRIMSON if barra < 30 else INK, w=w - 24,
            align="left")
        rect(f"a/q{i}/t", qx + 12, qy + 96, w - 24, 5, fill=SURFACE_2, cornerRadius=3)
        rect(f"a/q{i}/f", qx + 12, qy + 96, (w - 24) * barra / 100, 5,
             fill=CRIMSON if barra < 30 else OCHRE, cornerRadius=3)
        qx += w + 16

    # ── BLOCO 3: ingestão ────────────────────────────────────────────────────────
    iy = qy + 140
    rule("a/b3/rule", M, iy, CONTENT, INK, 2)
    kicker("a/b3/l", "Ingestão · últimas 24 h", M, iy + 12, INK, 700)
    txt("a/b3/n", "14 execuções · 12 ok · 1 falha · 1 parada", W - M - 500, iy + 11, 500, 10,
        INK_3, BODY, 500, align="right")
    # gráfico de execuções por hora
    txt("a/g1/t", "Execuções por hora", M, iy + 40, 400, 10, INK_2, BODY, 600)
    V.barras("a/g1", [("00", 2), ("03", 1), ("06", 3), ("09", 2), ("12", 1),
                      ("15", 2), ("18", 1), ("21", 2)],
             M, iy + 58, 400, 110, cor=CRIMSON, cor_base=INK_3)
    # donut de resultado
    txt("a/g2/t", "Resultado das execuções", M + 470, iy + 40, 340, 10, INK_2, BODY, 600)
    V.donut("a/g2", [("Sucesso", 12, OCHRE), ("Falha", 1, CRIMSON), ("Parada", 1, INK_3)],
            M + 470, iy + 58, 100, 12)
    for i, (rot, v, cor) in enumerate([("Sucesso", "12", OCHRE), ("Falha", "1", CRIMSON),
                                       ("Parada", "1", INK_3)]):
        rect(f"a/g2/l{i}/b", M + 590, iy + 70 + i * 22, 9, 9, fill=cor)
        txt(f"a/g2/l{i}/r", rot, M + 606, iy + 68 + i * 22, 120, 10, INK_2, BODY)
        num(f"a/g2/l{i}/v", v, M + 700, iy + 66 + i * 22, 11, INK, w=40)
    # latência
    txt("a/g3/t", "Latência da API (p50 / p95, ms)", M + 860, iy + 40, 452, 10, INK_2, BODY,
        600)
    V.linha("a/g3", [180, 210, 195, 240, 220, 310, 260, 230, 205, 215],
            M + 860, iy + 58, 452, 110, pontos=True)
    txt("a/g3/v", "p50 186 ms · p95 312 ms", M + 860, iy + 176, 452, 10, INK_3, BODY)

    # ── BLOCO 4: filas de trabalho ───────────────────────────────────────────────
    fy = iy + 208
    rule("a/b4/rule", M, fy, CONTENT, INK, 2)
    kicker("a/b4/l", "Filas de trabalho", M, fy + 12, INK, 700)
    cols = [("Fila", M, 280, "left"), ("Estado", M + 300, 150, "left"),
            ("Itens", M + 470, 100, "right"), ("Último", M + 590, 200, "left"),
            ("Ação", M + 810, 200, "left")]
    table_header(cols, fy + 38)
    filas = [("Moderação de clubes", "7 pendentes", "7", "há 2 h", "revisar"),
             ("Revisão de descrição", "3 pendentes", "3", "há 5 h", "revisar"),
             ("Upload de escudo", "11 na fila", "11", "há 1 d", "processar"),
             ("Ingestão RSSSF", "falhou", "0", "há 3 h", "reprocessar"),
             ("Relatos de erro", "2 abertos", "2", "há 1 d", "abrir")]
    ry = fy + 64
    for i, f in enumerate(filas):
        table_row(i, list(f), ry, cols, strong=True)
        cor = CRIMSON if "falhou" in f[1] else (OCHRE if "pendente" in f[1] else INK_3)
        rect(f"a/st{i}", M + 288, ry + 5, 6, 6, fill=cor, cornerRadius=3)
        ry += 34

    # ── BLOCO 5: funções de administrador ────────────────────────────────────────
    ay = ry + 22
    rule("a/b5/rule", M, ay, CONTENT, INK, 2)
    kicker("a/b5/l", "Funções de administrador", M, ay + 12, INK, 700)
    funcoes = [
        ("Moderação", "Aprovar, rejeitar e editar conteúdo enviado pela comunidade."),
        ("Revisão", "Conferir divergência entre fontes antes de publicar."),
        ("Ingestão", "Disparar, pausar e reprocessar uma fonte."),
        ("Catálogo", "Editar tokens de normalização e mapeamento de país/estado."),
        ("Auditoria", "Ver quem mudou o quê, quando e por quê."),
        ("Métricas", "Séries históricas de acervo, uso e qualidade."),
        ("Observability", "Traces, logs e erros em tempo real."),
        ("LGPD", "Atender titular: acesso, correção, exclusão, portabilidade."),
        ("Usuários", "Papéis, permissões e bloqueio de conta."),
        ("Reports", "Relatórios de uso e de qualidade exportáveis."),
    ]
    fx, fy2 = M, ay + 36
    for i, (nome, desc) in enumerate(funcoes):
        w = (CONTENT - 16 * 4) / 5
        if i == 5:
            fx, fy2 = M, fy2 + 86
        rect(f"a/fn{i}", fx, fy2, w, 74, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"a/fn{i}/n", nome, fx + 12, fy2 + 12, w - 24, 13, INK, BODY, 600)
        txt(f"a/fn{i}/d", desc, fx + 12, fy2 + 32, w - 24, 9, INK_3, BODY, 400, lh=12)
        fx += w + 16

    provenance("Admin não é vitrine: mesmos tokens, régua tipográfica menor, densidade maior. Toda ação é auditável.", 1500)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 10. METODOLOGIA — aprofundada
# ═════════════════════════════════════════════════════════════════════════════════════════
def v4_metodologia():
    frame("Metodologia", h=1720)
    topbar(active=-1)
    y = ficha_head(
        "Metodologia e fontes", "12", "seções",
        "Institucional · como cada número é feito",
        "Toda nota do Almanaque tem origem declarada. Esta página é a origem — e a lista do que ainda não sabemos.",
        y=104,
    )

    # Índice lateral fixo
    kicker("m/i/l", "Nesta página", M, y + 10, INK, 700)
    secoes = ["Fontes", "Ranking 0-100 · competição", "Ranking 0-100 · jogadores",
              "Agregado cross-division", "Conquistas estaduais", "Critério de verificação",
              "Divergências entre fontes", "Limitações conhecidas", "Correções",
              "Versionamento"]
    iy = y + 34
    for i, s in enumerate(secoes):
        txt(f"m/i{i}/n", s, M, iy, 300, 11, INK if i == 0 else INK_2, BODY, i == 0)
        rule(f"m/i{i}/l", M, iy + 18, 300, BORDER, 1)
        iy += 26

    rx = M + 360
    rw = CONTENT - 360

    # 1. FONTES
    kicker("m/f/l", "Fontes", rx, y + 10, INK, 700)
    cols = [("Fonte", rx, 240, "left"), ("Licença", rx + 260, 160, "left"),
            ("O que fornece", rx + 440, rw - 440, "left")]
    table_header(cols, y + 34)
    fontes = [("Wikidata", "CC0", "clubes, jogadores, estados, escudos, QIDs"),
              ("RSSSF", "uso livre", "títulos e campanhas históricas"),
              ("football-data", "aberta", "partidas e placares recentes"),
              ("Wikimedia Commons", "CC/PD", "escudos e troféus com licença verificada")]
    fy = y + 60
    for i, f in enumerate(fontes):
        table_row(i, list(f), fy, cols, strong=True)
        fy += 34

    # 2. RANKING 0-100 — a fórmula em detalhe
    ry = fy + 20
    rule("m/r/rule", rx, ry, rw, INK, 2)
    kicker("m/r/l", "Ranking 0-100 por competição e por ano", rx, ry + 12, OCHRE, 700)
    txt("m/r/t",
        "Cada competição em cada ano recebe uma nota de 0 a 100. A nota não é a posição na tabela: "
        "é a força do torneio naquele ano, para que um título de 1995 possa ser comparado com um de 2025.",
        rx, ry + 34, rw, 12, INK_2, BODY, 400, lh=18)

    # fórmula em blocos
    comp = [("Participação", "30", "quantos clubes de tier alto entram"),
            ("Profundidade", "25", "até onde vai o 8º colocado"),
            ("Alcance", "20", "mundial 3 · continental 2 · nacional 1"),
            ("Histórico", "15", "peso acumulado das edições anteriores"),
            ("Consistência", "10", "variação entre edições")]
    cy = ry + 96
    for i, (nome, peso, desc) in enumerate(comp):
        w = (rw - 12 * 4) / 5
        x = rx + i * (w + 12)
        rect(f"m/c{i}", x, cy, w, 78, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        num(f"m/c{i}/p", peso, x + 10, cy + 10, 24, CRIMSON, w=w - 20, align="left")
        txt(f"m/c{i}/n", nome, x + 10, cy + 42, w - 20, 11, INK, BODY, 600)
        txt(f"m/c{i}/d", desc, x + 10, cy + 56, w - 20, 8, INK_3, BODY, 400, lh=11)

    # exemplo numérico
    ey = cy + 96
    rect("m/ex/bg", rx - 8, ey, rw + 16, 62, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    txt("m/ex/t", "Exemplo · Libertadores 2019", rx + 8, ey + 10, 400, 10, INK_3, BODY, 600)
    txt("m/ex/v", "Participação 30/30 · Profundidade 22/25 · Alcance 40/20 → 96,4 · Histórico 13/15 → "
        "Consistência 8/10 = 91,2", rx + 8, ey + 28, rw - 30, 11, INK_2, BODY, 400, lh=15)

    # 3. RANKING DE JOGADORES
    jy = ey + 84
    rule("m/j/rule", rx, jy, rw, INK, 2)
    kicker("m/j/l", "Ranking 0-100 de jogadores (artilheiros)", rx, jy + 12, OCHRE, 700)
    txt("m/j/t",
        "Para artilheiro, o peso vai em gols por competição ponderada, não em gols brutos — 30 gols "
        "num estadual não valem 30 na Champions.",
        rx, jy + 34, rw, 12, INK_2, BODY, 400, lh=18)
    cols_j = [("Componente", rx, 280, "left"), ("Peso", rx + 300, 100, "right"),
              ("Como é medido", rx + 420, rw - 420, "left")]
    table_header(cols_j, jy + 76)
    comps_j = [("Gols ponderados", "50", "gol × nota da competição ÷ 100"),
               ("Assistências", "20", "mesma ponderação"),
               ("Jogos", "15", "volume, com teto por temporada"),
               ("Títulos", "15", "conquista coletiva conta")]
    jy2 = jy + 102
    for i, c in enumerate(comps_j):
        table_row(i, list(c), jy2, cols_j, strong=True)
        jy2 += 34

    # 4. AGREGADO CROSS-DIVISION + 5. ESTADUAIS
    ay = jy2 + 20
    rule("m/a/rule", rx, ay, rw, INK, 2)
    kicker("m/a/l", "Agregado cross-division · 5 · Conquistas estaduais", rx, ay + 12,
           OCHRE, 700)
    txt("m/a/t",
        "Três pilotos validam a ponderação entre divisões antes de publicar o agregado nacional:",
        rx, ay + 34, rw, 12, INK_2, BODY)
    pilotos = [("Inglaterra 2022/23", "Premier × Championship", "em validação"),
               ("Minas Gerais 2023-25", "Mineiro × Série B", "publicado"),
               ("Goiás 2023-25", "Goiano × Série B", "publicado"),
               ("Paraná 2025", "Paranaense × Série A", "em validação")]
    py = ay + 58
    for i, (nome, escopo, status) in enumerate(pilotos):
        w = (rw - 12 * 3) / 4
        x = rx + i * (w + 12)
        cor = OCHRE if status == "publicado" else INK_3
        rect(f"m/p{i}", x, py, w, 66, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"m/p{i}/n", nome, x + 10, py + 10, w - 20, 11, INK, BODY, 600)
        txt(f"m/p{i}/e", escopo, x + 10, py + 28, w - 20, 9, INK_2, BODY)
        txt(f"m/p{i}/s", status, x + 10, py + 46, w - 20, 8, cor, BODY, 600, ls=1.2)

    # 6. CRITÉRIO DE VERIFICAÇÃO
    vy = py + 84
    rule("m/v/rule", rx, vy, rw, INK, 2)
    kicker("m/v/l", "Critério de verificação", rx, vy + 12, OCHRE, 700)
    criterios = [
        ("Duas fontes concordam", "entra sem marcação"),
        ("Duas fontes divergem", "entra com a divergência publicada, nunca a escolhida"),
        ("Uma fonte só", "entra marcado como fonte única"),
        ("Nenhuma fonte", "não entra — lacuna declarada na página"),
    ]
    vy2 = vy + 36
    for i, (caso, resultado) in enumerate(criterios):
        txt(f"m/v{i}/c", caso, rx, vy2, 260, 11, INK, BODY, 600)
        txt(f"m/v{i}/r", resultado, rx + 280, vy2, rw - 280, 11, INK_2, BODY)
        rule(f"m/v{i}/l", rx, vy2 + 18, rw, BORDER, 1)
        vy2 += 26

    # 7. DIVERGÊNCIAS
    dy = vy2 + 14
    rule("m/d/rule", rx, dy, rw, INK, 2)
    kicker("m/d/l", "Divergências entre fontes", rx, dy + 12, CRIMSON, 700)
    cols_d = [("Dado", rx, 200, "left"), ("Fonte A", rx + 220, 180, "left"),
              ("Fonte B", rx + 410, 180, "left"), ("Publicamos", rx + 600, rw - 600, "left")]
    table_header(cols_d, dy + 36)
    divs = [("Gols de Pelé", "1.279 (RSSSF)", "1.283 (Wikidata)", "RSSSF, com nota"),
            ("Títulos do Fla", "48 (clube)", "46 (RSSSF)", "clube, com nota"),
            ("Público 1950", "199.854", "205.000", "199.854, com nota")]
    dy2 = dy + 62
    for i, d in enumerate(divs):
        table_row(i, list(d), dy2, cols_d, strong=True)
        dy2 += 34

    # 8. LIMITAÇÕES
    ly = dy2 + 18
    rect("m/l/bg", rx - 8, ly, rw + 16, 128, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    kicker("m/l/t", "Limitações conhecidas", rx + 4, ly + 12, CRIMSON, 700)
    limitacoes = [
        "Cidade normalizada cobre 3,7% dos clubes; por isso a hierarquia usa estado.",
        "Jogadores não têm estado nem cidade: o modelo não tem o campo.",
        "Partida sem placar não entra em agregado — ausência não é 0×0.",
        "Mercado da bola não tem fonte: a página declara isso em vez de mostrar vazio.",
        "Troféu em imagem existe em 5,2% das competições; o resto usa ilustração do sistema.",
    ]
    ly2 = ly + 34
    for i, t in enumerate(limitacoes):
        txt(f"m/l{i}/n", f"— {t}", rx + 4, ly2, rw - 20, 10, INK_2, BODY, 400, lh=14)
        ly2 += 18

    # 9. CORREÇÕES + 10. VERSIONAMENTO
    cy2 = ly + 148
    rule("m/k/rule", rx, cy2, rw, INK, 2)
    kicker("m/k/l", "Correções", rx, cy2 + 12, INK, 700)
    correcoes = [("02/11/2026", "Estados da Grécia", "+66 registros normalizados"),
                 ("28/10/2026", "Público do Maracanã", "corrigido para 199.854"),
                 ("15/09/2026", "Títulos do Palmeiras", "+2 estaduais reconhecidos")]
    cy3 = cy2 + 36
    for i, (quando, o_que, detalhe) in enumerate(correcoes):
        txt(f"m/k{i}/q", quando, rx, cy3, 130, 10, INK_3, BODY, 500)
        txt(f"m/k{i}/o", o_que, rx + 150, cy3, 240, 10, INK, BODY, 600)
        txt(f"m/k{i}/d", detalhe, rx + 400, cy3, rw - 400, 10, INK_2, BODY)
        cy3 += 22

    # versionamento
    vy3 = cy3 + 16
    rect("m/ver/bg", rx - 8, vy3, rw + 16, 56, fill=INK, cornerRadius=2)
    txt("m/ver/l", "VERSIONAMENTO", rx + 8, vy3 + 10, 300, 8, NIGHT_OCHRE, BODY, 600, ls=1.6)
    txt("m/ver/t", "tierVersion 1.4.2 · formulaVersion 2026.1 · publicado em 01/11/2026",
        rx + 8, vy3 + 26, rw - 30, 11, NIGHT_INK2, BODY, 400)

    provenance("Esta página é a fonte de todas as outras. Onde ela não alcança, a lacuna está escrita acima.", 1660)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 14. COMPARAR — clubes, jogadores e técnicos, com gráficos
# ═════════════════════════════════════════════════════════════════════════════════════════
def v4_comparar():
    frame("Comparar", h=1300)
    topbar(active=6)
    y = ficha_head(
        "Comparar", "3", "tipos de entidade",
        "Comparação · clube, jogador e técnico",
        "Duas entidades na MESMA linha de base — comparar é ler na horizontal, com gráfico ao lado.",
        y=104,
    )

    # Seletor de tipo — o item 14 pede jogadores e técnicos também
    ty = y + 8
    tipos = ["Clube", "Jogador", "Técnico"]
    tx = M
    for i, t in enumerate(tipos):
        w = 34 + len(t) * 7.4
        ativo = i == 0
        rect(f"c/t{i}", tx, ty, w, 32, fill=INK if ativo else SURFACE, cornerRadius=2,
             stroke=INK if ativo else BORDER, strokeWeight=1)
        txt(f"c/t{i}/t", t, tx + 16, ty + 9, w - 32, 12, "#faf8f5" if ativo else INK_2,
            BODY, 600 if ativo else 500)
        tx += w + 10

    # Cabeçalho dos dois lados
    hy = ty + 56
    rect("c/esc1", M, hy, 72, 72, fill=SURFACE, cornerRadius=4, stroke=BORDER, strokeWeight=1)
    txt("c/esc1/t", "escudo", M, hy + 32, 72, 9, INK_3, BODY, 500, align="center")
    txt("c/n1", "Flamengo", M + 88, hy + 6, 360, 30, INK, HEAD, 700)
    txt("c/m1", "Rio de Janeiro · BR · 1895", M + 88, hy + 42, 360, 11, INK_3, BODY)
    rect("c/esc2", W - M - 72, hy, 72, 72, fill=SURFACE, cornerRadius=4, stroke=BORDER,
         strokeWeight=1)
    txt("c/esc2/t", "escudo", W - M - 72, hy + 32, 72, 9, INK_3, BODY, 500, align="center")
    txt("c/n2", "Palmeiras", W - M - 380, hy + 6, 292, 30, INK, HEAD, 700, align="right")
    txt("c/m2", "São Paulo · BR · 1914", W - M - 380, hy + 42, 292, 11, INK_3, BODY,
        align="right")
    txt("c/x", "×", W / 2 - 20, hy + 20, 40, 28, INK_3, HEAD, 400, align="center")

    # Métricas na mesma linha de base
    my = hy + 92
    rule("c/rule", M, my, CONTENT, INK, 2)
    metricas = [
        ("Títulos oficiais", "48", "42", 80),
        ("Jogos no acervo", "426", "438", 70),
        ("Gols marcados", "812", "798", 75),
        ("Copas Libertadores", "3", "3", 60),
        ("Títulos brasileiros", "8", "12", 85),
        ("Mundiais", "1", "0", 40),
        ("Sócios", "40.988", "38.120", 55),
    ]
    row_y = my + 14
    for i, (rot, a, b, pct) in enumerate(metricas):
        if i % 2 == 0:
            rect(f"c/r{i}/bg", M - 8, row_y - 8, CONTENT + 16, 54, fill=SURFACE_2)
        num(f"c/r{i}/a", a, M, row_y, 26, CRIMSON if i == 0 else INK, w=380, align="left")
        kicker(f"c/r{i}/r", rot, W / 2 - 150, row_y + 6, INK_3, 300)
        num(f"c/r{i}/b", b, W - M - 380, row_y, 26, INK, w=380, align="right")
        # barra comparativa no centro: mostra a proporção entre os dois
        rule(f"c/r{i}/l", W / 2 - 150, row_y + 40, 300, BORDER, 1)
        row_y += 54

    # GRÁFICOS comparativos
    gy = row_y + 20
    rule("c/g/rule", M, gy, CONTENT, INK, 2)
    kicker("c/g/l", "Comparação em gráfico", M, gy + 12, INK, 700)

    # 1. barras espelhadas: títulos por competição
    txt("c/g1/t", "Títulos por tipo de competição", M, gy + 40, 420, 10, INK_2, BODY, 600)
    cats = [("Mundial", 1, 0), ("Continental", 4, 3), ("Nacional", 8, 12), ("Estadual", 35, 27)]
    by = gy + 62
    for i, (nome, a, b) in enumerate(cats):
        txt(f"c/g1/{i}/n", nome, M + 120, by + 2, 120, 10, INK_2, BODY, 500, align="right")
        # esquerda (Flamengo) para a esquerda, direita (Palmeiras) para a direita
        wa = 150 * (a / 35) if a else 0
        wb = 150 * (b / 35) if b else 0
        if wa:
            rect(f"c/g1/{i}/a", M + 120 - wa, by, wa, 14, fill=CRIMSON, cornerRadius=1)
        if wb:
            rect(f"c/g1/{i}/b", M + 120, by, wb, 14, fill=INK, cornerRadius=1)
        num(f"c/g1/{i}/va", str(a), M + 120 - wa - 34, by, 11, CRIMSON, w=30)
        num(f"c/g1/{i}/vb", str(b), M + 124 + wb, by, 11, INK, w=30, align="left")
        by += 26
    rect("c/g1/eixo", M + 120, gy + 62, 1, 104, fill=INK)
    txt("c/g1/leg", "Flamengo", M + 10, by + 6, 100, 9, CRIMSON, BODY, 600)
    txt("c/g1/leg2", "Palmeiras", M + 130, by + 6, 100, 9, INK, BODY, 600)

    # 2. donut: distribuição dos títulos
    txt("c/g2/t", "Distribuição dos títulos", M + 480, gy + 40, 340, 10, INK_2, BODY, 600)
    V.donut("c/g2", [("Estadual", 35, INK_3), ("Nacional", 8, OCHRE),
                     ("Continental", 4, CRIMSON), ("Mundial", 1, INK)],
            M + 480, gy + 62, 110, 13)
    for i, (rot, v, cor) in enumerate([("Estadual", "35", INK_3), ("Nacional", "8", OCHRE),
                                       ("Continental", "4", CRIMSON), ("Mundial", "1", INK)]):
        rect(f"c/g2/l{i}/b", M + 610, gy + 74 + i * 22, 9, 9, fill=cor)
        txt(f"c/g2/l{i}/r", rot, M + 626, gy + 72 + i * 22, 130, 10, INK_2, BODY)
        num(f"c/g2/l{i}/v", v, M + 730, gy + 70 + i * 22, 11, INK, w=40)

    # 3. linha: aproveitamento por temporada
    txt("c/g3/t", "Aproveitamento por temporada", M + 840, gy + 40, 472, 10, INK_2, BODY, 600)
    V.linha("c/g3", [58, 62, 55, 71, 68, 74, 66, 79], M + 840, gy + 62, 220, 100,
            cor=CRIMSON, pontos=True)
    V.linha("c/g3b", [54, 58, 61, 64, 70, 68, 72, 76], M + 840, gy + 62, 220, 100,
            cor=INK, pontos=True)
    txt("c/g3/l1", "— Flamengo", M + 1070, gy + 66, 120, 9, CRIMSON, BODY, 600)
    txt("c/g3/l2", "— Palmeiras", M + 1070, gy + 82, 120, 9, INK, BODY, 600)
    txt("c/g3/n", "8 temporadas", M + 840, gy + 176, 220, 9, INK_3, BODY)

    # Confronto direto
    ky = gy + 208
    rule("c/k/rule", M, ky, CONTENT, INK, 2)
    kicker("c/k/l", "Confronto direto", M, ky + 12, INK, 700)
    pl = [("412 jogos", "148 V · 112 E · 152 D"), ("", "Flamengo 148 · Palmeiras 152")]
    cols_k = [("", M, 400, "left"), ("", M + 420, 400, "left")]
    # medidor de 3 partes
    txt("c/k/a", "148 vitórias", M, ky + 40, 200, 11, CRIMSON, BODY, 600)
    txt("c/k/e", "112 empates", W / 2 - 60, ky + 40, 160, 11, INK_3, BODY, 600)
    txt("c/k/b", "152 vitórias", W - M - 200, ky + 40, 200, 11, INK, BODY, 600,
        align="right")
    rect("c/k/t1", M, ky + 58, 412 * 0.6, 10, fill=CRIMSON)
    rect("c/k/t2", M + 247, ky + 58, 112 * 0.3, 10, fill=INK_3)
    rect("c/k/t3", W - M - 253, ky + 58, 152 * 0.6, 10, fill=INK)

    provenance("As duas colunas vêm da mesma fonte: comparar números de origens diferentes é comparar réguas diferentes.", 1240)


# ═════════════════════════════════════════════════════════════════════════════════════════
# 15. TABELAS — a tabela muda com o formato da competição
# ═════════════════════════════════════════════════════════════════════════════════════════
def v4_tabelas():
    frame("Tabelas", h=1400)
    topbar(active=0)
    y = ficha_head(
        "Tabelas", "4", "formatos de competição",
        "Classificação · conforme o formato",
        "925 ligas, 304 copas e 1 torneio não têm a mesma tabela. Cada formato ganha a sua — e 702 competições ainda não têm formato declarado.",
        y=104,
    )

    # Seletor de formato
    fy = y + 8
    formatos = [("Liga", "925", True), ("Copa", "304", False),
                ("Torneio", "1", False), ("Supercopa", "0", False)]
    fx = M
    for i, (nome, n, ativo) in enumerate(formatos):
        w = 150
        rect(f"t/f{i}", fx, fy, w, 56, fill=INK if ativo else SURFACE, cornerRadius=2,
             stroke=INK if ativo else BORDER, strokeWeight=1)
        txt(f"t/f{i}/n", nome, fx + 14, fy + 10, w - 28, 14,
            "#faf8f5" if ativo else INK, BODY, 600)
        txt(f"t/f{i}/q", f"{n} no acervo", fx + 14, fy + 32, w - 28, 10,
            NIGHT_OCHRE if ativo else INK_3, BODY, 500)
        fx += w + 12

    # ── FORMATO 1: LIGA — pontos corridos ────────────────────────────────────────
    ly = fy + 82
    rule("t/l/rule", M, ly, CONTENT, INK, 2)
    kicker("t/l/l", "Liga · pontos corridos", M, ly + 12, INK, 700)
    txt("t/l/n", "idêntico por dois turnos · 20 clubes · 38 rodadas", W - M - 500, ly + 11,
        500, 10, INK_3, BODY, 500, align="right")
    cols = [("#", M, 40, "right"), ("Clube", M + 50, 300, "left"),
            ("P", M + 360, 60, "right"), ("J", M + 430, 60, "right"),
            ("V", M + 500, 60, "right"), ("E", M + 570, 60, "right"),
            ("D", M + 640, 60, "right"), ("GP", M + 710, 60, "right"),
            ("GC", M + 780, 60, "right"), ("SG", M + 850, 70, "right"),
            ("Pts", M + 930, 70, "right"), ("Últ. 5", M + 1010, 280, "left")]
    table_header(cols, ly + 38)
    tab = [("1", "Liverpool", "38", "38", "25", "9", "4", "86", "41", "+45", "84", "V V V E V"),
           ("2", "Arsenal", "38", "38", "20", "14", "4", "69", "34", "+35", "74", "E V V V E"),
           ("3", "Manchester City", "38", "38", "21", "8", "9", "72", "44", "+28", "71", "D V V E V"),
           ("4", "Chelsea", "38", "38", "20", "9", "9", "64", "43", "+21", "69", "V V E V V"),
           ("5", "Newcastle", "38", "38", "20", "6", "12", "68", "47", "+21", "66", "V D V V E")]
    ty = ly + 64
    for i, t in enumerate(tab):
        table_row(i, list(t), ty, cols, strong=True)
        ty += 34
    # legenda de zona
    lx = M
    for i, (nome, cor) in enumerate([("Champions League", CRIMSON), ("Europa League", OCHRE),
                                     ("Rebaixamento", INK_3)]):
        rect(f"t/l/leg{i}", lx, ty + 10, 18, 3, fill=cor)
        txt(f"t/l/leg{i}/t", nome, lx + 24, ty + 5, 180, 9, INK_2, BODY, 500)
        lx += 200

    # ── FORMATO 2: COPA — mata-mata ──────────────────────────────────────────────
    cy = ty + 44
    rule("t/c/rule", M, cy, CONTENT, INK, 2)
    kicker("t/c/l", "Copa · mata-mata", M, cy + 12, INK, 700)
    txt("t/c/n", "ida e volta · gol fora desempata · 2 jogos por confronto", W - M - 520,
        cy + 11, 520, 10, INK_3, BODY, 500, align="right")

    # bracket: oitavas → quartas → semi → final
    def confronto(nome, x, y_, w, a, b, sa, sb):
        rect(f"{nome}/bg", x, y_, w, 42, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"{nome}/a", a, x + 10, y_ + 6, w - 60, 11, INK if sa >= sb else INK_2, BODY,
            600 if sa >= sb else 400)
        num(f"{nome}/sa", str(sa), x + w - 44, y_ + 4, 12, CRIMSON if sa >= sb else INK_3, w=34)
        rule(f"{nome}/l", x, y_ + 21, w, BORDER, 1)
        txt(f"{nome}/b", b, x + 10, y_ + 24, w - 60, 11, INK if sb > sa else INK_2, BODY,
            600 if sb > sa else 400)
        num(f"{nome}/sb", str(sb), x + w - 44, y_ + 22, 12, CRIMSON if sb > sa else INK_3, w=34)

    by = cy + 40
    oitavas = [("Flamengo", "River", 3, 1), ("Palmeiras", "Boca", 2, 2),
               ("São Paulo", "Racing", 1, 0), ("Corinthians", "Indep.", 2, 3)]
    for i, (a, b, sa, sb) in enumerate(oitavas):
        confronto(f"t/c/o{i}", M, by + i * 52, 210, a, b, sa, sb)
    # quartas
    V.vetor("t/c/l1", [(M + 210, by + 21), (M + 240, by + 21), (M + 240, by + 73),
                       (M + 270, by + 73)], stroke=INK_3, strokeWeight=1)
    V.vetor("t/c/l2", [(M + 210, by + 125), (M + 240, by + 125), (M + 240, by + 177),
                       (M + 270, by + 177)], stroke=INK_3, strokeWeight=1)
    confronto("t/c/q0", M + 272, by + 34, 210, "Flamengo", "Palmeiras", 4, 2)
    confronto("t/c/q1", M + 272, by + 138, 210, "São Paulo", "Corinthians", 1, 1)
    # semi
    V.vetor("t/c/l3", [(M + 482, by + 55), (M + 512, by + 55), (M + 512, by + 129),
                       (M + 542, by + 129)], stroke=INK_3, strokeWeight=1)
    confronto("t/c/s0", M + 544, by + 88, 210, "Flamengo", "São Paulo", 2, 0)
    # final
    V.vetor("t/c/l4", [(M + 754, by + 109), (M + 790, by + 109)], stroke=INK, strokeWeight=2)
    rect("t/c/final/bg", M + 792, by + 78, 220, 62, fill=INK, cornerRadius=2)
    txt("t/c/final/k", "FINAL · 30/11", M + 802, by + 86, 200, 8, NIGHT_OCHRE, BODY, 600, ls=1.4)
    txt("t/c/final/a", "Flamengo", M + 802, by + 100, 200, 12, NIGHT_INK, BODY, 600)
    txt("t/c/final/b", "—", M + 802, by + 116, 200, 10, NIGHT_INK3, BODY)
    # troféu na final
    V.trofeu("t/c/trof", M + 1030, by + 84, 44, OCHRE)

    # ── FORMATO 3: TORNEIO — grupos + mata-mata ─────────────────────────────────
    gy = by + 232
    rule("t/g/rule", M, gy, CONTENT, INK, 2)
    kicker("t/g/l", "Torneio · grupos + mata-mata", M, gy + 12, INK, 700)
    txt("t/g/n", "4 grupos de 4 · 2 avançam · 3 jogos na fase de grupos", W - M - 520,
        gy + 11, 520, 10, INK_3, BODY, 500, align="right")
    grupos = [("Grupo A", [("Brasil", 7), ("Suíça", 5), ("Sérvia", 3), ("Camarões", 1)]),
              ("Grupo B", [("Inglaterra", 9), ("EUA", 5), ("Irã", 3), ("País de Gales", 1)])]
    for gi, (nome, times) in enumerate(grupos):
        gx = M + gi * 460
        rect(f"t/g/{gi}/bg", gx, gy + 38, 440, 128, fill=SURFACE, cornerRadius=2,
             stroke=BORDER, strokeWeight=1)
        txt(f"t/g/{gi}/n", nome, gx + 12, gy + 46, 200, 10, INK_3, BODY, 600, ls=1.2)
        for ti, (time, pts) in enumerate(times):
            yy = gy + 66 + ti * 26
            # posição que avança ganha barra de acento
            if ti < 2:
                rect(f"t/g/{gi}/q{ti}", gx + 8, yy - 2, 3, 18, fill=CRIMSON)
                rect(f"t/g/{gi}/bg{ti}", gx + 8, yy - 2, 424, 18, fill=SURFACE_2)
            txt(f"t/g/{gi}/t{ti}", time, gx + 18, yy, 240, 12, INK, BODY,
                600 if ti < 2 else 400)
            txt(f"t/g/{gi}/j{ti}", "3", gx + 280, yy, 40, 11, INK_3, BODY, align="right")
            num(f"t/g/{gi}/p{ti}", str(pts), gx + 370, yy - 1, 12, INK, w=50)

    # ── FORMATO 4: SUPERCOPA — jogo único ───────────────────────────────────────
    sy = gy + 190
    rule("t/s/rule", M, sy, CONTENT, INK, 2)
    kicker("t/s/l", "Supercopa · jogo único", M, sy + 12, INK, 700)
    txt("t/s/n", "campeão da liga × campeão da copa · sem tabela", W - M - 520, sy + 11,
        520, 10, INK_3, BODY, 500, align="right")
    rect("t/s/bg", M, sy + 38, CONTENT, 96, fill=SURFACE, cornerRadius=2, stroke=BORDER,
         strokeWeight=1)
    txt("t/s/a", "Flamengo", M + 40, sy + 64, 300, 24, INK, HEAD, 700)
    txt("t/s/am", "campeão do Brasileirão", M + 40, sy + 94, 300, 10, INK_3, BODY)
    num("t/s/sa", "2", W / 2 - 90, sy + 56, 44, CRIMSON, w=60, align="center")
    txt("t/s/x", "×", W / 2 - 20, sy + 66, 40, 20, INK_3, HEAD, 400, align="center")
    num("t/s/sb", "1", W / 2 + 30, sy + 56, 44, INK_3, w=60, align="center")
    txt("t/s/b", "Palmeiras", W - M - 340, sy + 64, 300, 24, INK, HEAD, 700, align="right")
    txt("t/s/bm", "campeão da Copa do Brasil", W - M - 340, sy + 94, 300, 10, INK_3, BODY,
        align="right")


    # ── LACUNA DECLARADA: 702 competições sem tipo ────────────────────────────────
    gy2 = sy + 158
    rect("t/gap/bg", M - 8, gy2, CONTENT + 16, 84, fill=SURFACE_2, cornerRadius=2,
         stroke=CRIMSON, strokeWeight=1.5)
    kicker("t/gap/l", "Lacuna declarada", M + 12, gy2 + 12, CRIMSON, 700)
    txt("t/gap/t",
        "702 competições (36% do acervo) não têm o formato declarado no dado de origem. Elas aparecem no índice e na ficha, mas não recebem tabela — porque tabela de formato desconhecido seria invenção.",
        M + 12, gy2 + 32, CONTENT - 40, 11, INK_2, BODY, 400, lh=16)

    provenance("Os números de formato são contados do banco: 925 LEAGUE, 304 CUP, 1 TOURNAMENT, 0 SUPER_CUP e 702 sem tipo. Copa sem tabela não recebe tabela inventada.", 1340)


PAGES_V4 = [
    ("admin", v4_admin),
    ("metodologia", v4_metodologia),
    ("comparar", v4_comparar),
    ("tabelas", v4_tabelas),
]
