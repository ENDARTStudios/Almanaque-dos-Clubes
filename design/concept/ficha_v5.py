"""
Sistema FICHA v5 — a camada de interação, aprendida nos 11 sites.

O que cada site entregou, e onde entra aqui:

  21st.dev ....... "Wireframe Dotted Globe" (o herói da Home), "Spotlight Card",
                    "Limelight Nav", "CardStack", "Background Paths"
  Aceternity ..... "3D Card Effect", "Bento Grid", "3D Marquee", "Text Flipping Board"
  Kokonut UI ..... "Apple Activity Card" (anel de progresso), "Detent Dial", "Slide to Confirm"
  Bklit .......... 211 gráficos desenhados — a referência para um almanaque de DADOS
  React Bits ..... micro-interações: o feedback que o dedo sente
  Motion ......... layout animation, gesto, scroll, mola, saída
  GSAP ........... ScrollTrigger: o que anima com a rolagem
  Anime.js ....... animação curta e leve para micro-estado
  UI UX Pro Max .. 57 estilos, 24 tipos de gráfico, 29 padrões de landing
  Refero ......... galeria de referência (linguagem, não componente)
  Componentry .... componentes de base

A REGRA QUE GOVERNA ESTA PÁGINA — Emil Kowalski:
  frequência decide se anima. Atalho de teclado: nunca. Hover de lista: quase nada.
  Modal: padrão. Primeira visita: pode ter deleite.

  Por isso a página desenha ESTADOS, não movimento: o que o movimento faz é contrato escrito;
  o que o olho vê aqui é o repouso, o hover, o pressionado e o foco.

Taste Skill: nenhuma animação no carregamento é obrigatória; todo movimento tem alternativa
sem movimento. Cada padrão abaixo declara a sua.
"""

import math

from ficha import (
    add, cmd, frame, rect, txt, rule, kicker, display, num, table_header, table_row,
    topbar, ficha_head, provenance,
    PAPER, SURFACE, SURFACE_2, MUTED, BORDER, INK, INK_2, INK_3,
    CRIMSON, CRIMSON_INK, OCHRE,
    NIGHT, NIGHT_SURF, NIGHT_BORDER, NIGHT_INK, NIGHT_INK2, NIGHT_INK3,
    NIGHT_CRIMSON, NIGHT_OCHRE,
    HEAD, BODY, W, M, CONTENT,
)
import ficha_visual as V


def _estado(nome, x, y, w, h, rotulo, ativo=False, cor_rotulo=INK_3):
    """Moldura de estado: é assim que um conceito mostra interação sem rodar animação."""
    rect(f"{nome}/bg", x, y, w, h, fill=SURFACE,
         stroke=CRIMSON if ativo else BORDER, strokeWeight=2 if ativo else 1, cornerRadius=2)
    txt(f"{nome}/rot", rotulo, x + 12, y + h - 20, w - 24, 10, cor_rotulo, BODY, 600)


# ═════════════════════════════════════════════════════════════════════════════════════════
def v5_interacao():
    frame("Interação", h=1950)
    topbar(active=-1)

    txt("i/k", "Sistema · camada de interação", M, 104, 600, 10, INK_3, BODY, 600, ls=2.2)
    display("i/t", "Interação", M, 122, 60, INK, w=700)
    txt("i/sub",
        "Cada padrão abaixo vem de uma biblioteca real, e é desenhado nos seus ESTADOS — o movimento "
        "é contrato escrito, não maquete. A regra que governa tudo: frequência decide se anima.",
        M, 194, 820, 15, INK_2, BODY, 400, lh=22)

    # ── 1. LIMELIGHT NAV (21st.dev) ──────────────────────────────────────────────
    y = 268
    kicker("i/nav/l", "Navegação com luz · Limelight Nav", M, y, INK, 700)
    txt("i/nav/d", "A luz acompanha o item ativo por layout animation (Motion). Sem luz, é uma barra comum.",
        M, y + 20, 820, 11, INK_3, BODY)
    nav = ["Competições", "Clubes", "Jogadores", "Rankings", "Mapa", "Lendas"]
    for e, (rot, ativo) in enumerate([("Repouso", False), ("Foco", False), ("Hover", True)]):
        bx = M + e * 428
        _estado(f"i/nav/e{e}", bx, y + 62, 404, 66, rot, ativo=ativo)
        nx = bx + 16
        for i, item in enumerate(nav):
            on = (i == 1 and e >= 1) or (i == 2 and e == 2)
            txt(f"i/nav/e{e}/{i}", item, nx, y + 70, 80, 10, INK if on else INK_3, BODY,
                600 if on else 400)
            if on:
                # luz: gradiente vertical de 40px sob o item
                for k in range(6):
                    rect(f"i/nav/e{e}/{i}/luz{k}", nx + 4, y + 84 + k, 44, 1,
                         fill=CRIMSON, opacity=0.9 - k * 0.15)
            nx += 62

    # ── 2. SPOTLIGHT CARD (21st.dev) ─────────────────────────────────────────────
    y = 410
    kicker("i/sp/l", "Cartão com holofote · Spotlight Card", M, y, INK, 700)
    txt("i/sp/d", "A luz radial segue o ponteiro. É CSS puro: duas variáveis de posição e uma máscara.",
        M, y + 20, 820, 11, INK_3, BODY)
    for e, (rot, ativo) in enumerate([("Repouso", False), ("Hover · luz no canto", True),
                                      ("Hover · luz no centro", True)]):
        bx = M + e * 428
        _estado(f"i/sp/e{e}", bx, y + 62, 404, 150, rot, ativo=ativo)
        rect(f"i/sp/e{e}/c", bx + 16, y + 78, 372, 106, fill=SURFACE_2, cornerRadius=2)
        if e > 0:
            # o holofote: anéis concêntricos cada vez mais fracos
            cx = bx + 60 if e == 1 else bx + 218
            cy = y + 114 if e == 1 else y + 131
            for k, op in enumerate([0.20, 0.14, 0.09, 0.05]):
                add_el = f"i/sp/e{e}/spot{k}"
                rect(add_el, cx - 30 - k * 14, cy - 30 - k * 14, 60 + k * 28, 60 + k * 28,
                     fill=CRIMSON, opacity=op, cornerRadius=(30 + k * 14))
        txt(f"i/sp/e{e}/n", "Copa Libertadores", bx + 32, y + 92, 340, 15, INK, HEAD, 700)
        txt(f"i/sp/e{e}/m", "1960 · 66 edições", bx + 32, y + 116, 340, 11, INK_3, BODY)

    # ── 3. BENTO GRID (Aceternity) ───────────────────────────────────────────────
    y = 640
    kicker("i/be/l", "Grade bento · Bento Grid", M, y, INK, 700)
    txt("i/be/d", "Células de tamanhos diferentes em vez de grade uniforme. O tamanho é o argumento, não o cartão.",
        M, y + 20, 900, 11, INK_3, BODY)
    y2 = y + 44
    rect("i/be/a", M, y2, 640, 200, fill=SURFACE, stroke=BORDER, strokeWeight=1, cornerRadius=2)
    rect("i/be/b", M + 656, y2, 320, 200, fill=SURFACE_2, cornerRadius=2)
    rect("i/be/c", M + 992, y2, 320, 96, fill=SURFACE, stroke=BORDER, strokeWeight=1,
         cornerRadius=2)
    rect("i/be/d", M + 992, y2 + 104, 320, 96, fill=INK, cornerRadius=2)
    txt("i/be/a/k", "Acervo", M + 20, y2 + 16, 200, 11, INK_3, BODY, 600)
    num("i/be/a/v", "12.017", M + 20, y2 + 34, 52, INK, w=600, align="left")
    txt("i/be/a/s", "clubes · 220 países", M + 20, y2 + 96, 400, 11, INK_3, BODY)
    V.sparkline("i/be/a/sp", [420, 468, 512, 498, 560, 612, 640], M + 20, y2 + 130, 600, 44,
                CRIMSON)
    txt("i/be/b/k", "Crescimento", M + 676, y2 + 16, 200, 11, INK_3, BODY, 600)
    num("i/be/b/v", "+18", M + 676, y2 + 34, 40, INK, w=280, align="left")
    txt("i/be/b/s", "clubes hoje", M + 676, y2 + 82, 280, 11, INK_3, BODY)
    V.barras("i/be/b/b", [("S", 8), ("T", 14), ("Q", 11), ("Q", 18)], M + 676, y2 + 108,
             280, 76, cor=CRIMSON, cor_base=INK_3)
    txt("i/be/c/k", "Última ingestão", M + 1012, y2 + 14, 280, 11, INK_3, BODY, 600)
    txt("i/be/c/v", "há 4 min", M + 1012, y2 + 34, 280, 20, INK, HEAD, 700)
    txt("i/be/c/s", "RSSSF · 12.417 linhas", M + 1012, y2 + 62, 280, 10, INK_3, BODY)
    txt("i/be/d/k", "Destaque", M + 1012, y2 + 118, 280, 11, NIGHT_OCHRE, BODY, 600)
    txt("i/be/d/v", "48 títulos", M + 1012, y2 + 136, 280, 20, NIGHT_INK, HEAD, 700)

    # ── 4. CARTÃO COM INCLINAÇÃO 3D (Aceternity) ─────────────────────────────────
    y = 912
    kicker("i/3d/l", "Cartão com inclinação · 3D Card Effect", M, y, INK, 700)
    txt("i/3d/d", "A perspectiva segue o ponteiro. Só transform: nada de layout, nada de repintar.",
        M, y + 20, 820, 11, INK_3, BODY)
    for e, (rot, rot_graus) in enumerate([("Repouso", 0), ("Hover · 6°", 6), ("Hover · 12°", 12)]):
        bx = M + e * 300
        _estado(f"i/3d/e{e}", bx, y + 62, 276, 160, rot, ativo=e > 0)
        # inclinação desenhada como quadrilátero: node.set precisa de id, que não existe
        # dentro do batch. Em vetor, a perspectiva é explícita e não depende de estado.
        cx_, cy_ = bx + 138, y + 142
        meia_l, meia_a = 110, 66
        t = math.radians(rot_graus)
        # eixo Y comprimido = a "inclinação" vista em perspectiva
        comp = math.cos(t)
        pts = [(cx_ - meia_l, cy_ - meia_a * comp), (cx_ + meia_l, cy_ - meia_a * comp),
               (cx_ + meia_l, cy_ + meia_a * comp), (cx_ - meia_l, cy_ + meia_a * comp)]
        V.vetor(f"i/3d/e{e}/c", pts, fechado=True, fill=SURFACE_2, stroke=BORDER,
                strokeWeight=1)

    # ── 5. MARQUEE (Aceternity / React Bits) ────────────────────────────────────
    y = 1132
    kicker("i/mq/l", "Faixa em movimento · Marquee", M, y, INK, 700)
    txt("i/mq/d", "Para lista de campeões: linear, sem aceleração, pausa no hover e no foco. Sob reduced-motion, fica estático.",
        M, y + 20, 900, 11, INK_3, BODY)
    rect("i/mq/bg", M, y + 42, CONTENT, 76, fill=INK, cornerRadius=2)
    campeoes = ["Flamengo 1981", "Real Madrid 2014", "Milan 1989", "Santos 1962",
                "Bayern 2020", "Barcelona 2011", "Boca 2000", "Liverpool 2019"]
    mx = M + 16
    for i, c in enumerate(campeoes):
        txt(f"i/mq/{i}", c, mx, y + 68, 190, 13, NIGHT_INK if i % 2 == 0 else NIGHT_INK2,
            BODY, 600)
        rect(f"i/mq/{i}/sep", mx + 168, y + 70, 2, 2, fill=NIGHT_OCHRE, cornerRadius=1)
        mx += 162
    txt("i/mq/seta", "→", W - M - 20, y + 68, 20, 13, NIGHT_OCHRE, BODY, 600, align="right")

    # ── 6. ANEL DE PROGRESSO (Kokonut UI) e MINI-GRÁFICO (Bklit) ────────────────
    y = 1252
    kicker("i/dv/l", "Dado como ornamento · anel e centelha", M, y, INK, 700)
    txt("i/dv/d", "O almanaque é um acervo de números: anel para proporção, centelha para tendência, barra para volume.",
        M, y + 20, 900, 11, INK_3, BODY)
    y2 = y + 44
    # anel (Kokonut "Apple Activity Card")
    for i, (rot, pct, cor) in enumerate([("Clubes", 72, CRIMSON), ("Jogadores", 48, OCHRE),
                                          ("Partidas", 31, INK_3)]):
        cx = M + i * 200
        V.donut(f"i/dv/r{i}", [("ok", pct, cor), ("resto", 100 - pct, SURFACE_2)],
                cx, y2, 120, 14)
        num(f"i/dv/r{i}/v", f"{pct}%", cx + 24, y2 + 46, 22, INK, w=72, align="center")
        txt(f"i/dv/r{i}/l", rot, cx, y2 + 128, 120, 11, INK_2, BODY, 500, align="center")
    # centelha (Bklit)
    txt("i/dv/s/l", "Partidas por temporada", M + 640, y2, 300, 11, INK_3, BODY, 600)
    V.linha("i/dv/s", [380, 412, 448, 470, 512, 498, 540, 566], M + 640, y2 + 22, 320, 90,
            pontos=True)
    num("i/dv/s/v", "566", M + 640, y2 + 118, 26, CRIMSON, w=140, align="left")
    txt("i/dv/s/n", "temporada 2025", M + 790, y2 + 124, 200, 10, INK_3, BODY)
    # barra empilhada
    txt("i/dv/b/l", "Distribuição por alcance", M + 1010, y2, 320, 11, INK_3, BODY, 600)
    partes = [("Mundial", 4, CRIMSON), ("Continental", 22, OCHRE), ("Nacional", 58, INK_3),
              ("Estadual", 16, INK)]
    bx = M + 1010
    for i, (rot, pct, cor) in enumerate(partes):
        w = 300 * pct / 100
        rect(f"i/dv/b/{i}", bx, y2 + 24, w, 14, fill=cor)
        txt(f"i/dv/b/{i}/n", f"{pct}%", bx, y2 + 44, 60, 9, INK_3, BODY)
        bx += w
    for i, (rot, pct, cor) in enumerate(partes):
        rect(f"i/dv/b/{i}/q", M + 1010 + i * 76, y2 + 66, 8, 8, fill=cor)
        txt(f"i/dv/b/{i}/r", rot, M + 1022 + i * 76, y2 + 64, 70, 9, INK_2, BODY)

    # ── 7. CONTRATO DE MOVIMENTO ────────────────────────────────────────────────
    y = 1520
    rule("i/c/rule", M, y, CONTENT, INK, 2)
    kicker("i/c/l", "Contrato de movimento · frequência decide", M, y + 12, INK, 700)
    cols = [("Elemento", M, 260, "left"), ("Frequência", M + 280, 200, "left"),
            ("Anima?", M + 490, 130, "left"), ("Duração", M + 630, 130, "left"),
            ("Curva", M + 770, 200, "left"), ("Alternativa", M + 980, 330, "left")]
    table_header(cols, y + 42)
    regras = [
        ("Atalho, paleta de comando", "100+/dia", "nunca", "—", "—", "estado instantâneo"),
        ("Hover em item de lista", "dezenas/dia", "mínimo", "80ms", "ease-out", "só cor de fundo"),
        ("Botão pressionado", "dezenas/dia", "sim", "120ms", "ease-out", "scale(0.97)"),
        ("Dropdown, select", "ocasional", "sim", "180ms", "ease-out", "origem no gatilho"),
        ("Modal, gaveta", "ocasional", "sim", "320ms", "ease-drawer", "foco preso no modal"),
        ("Toast", "ocasional", "sim", "240ms", "ease", "empilha sem reanimar"),
        ("Herói (1ª visita)", "raro", "deleite", "900ms", "ease-in-out", "CSS puro, sem JS"),
    ]
    ry = y + 68
    for i, r in enumerate(regras):
        table_row(i, list(r), ry, cols, strong=True)
        ry += 34

    provenance("Todo movimento tem alternativa sem movimento: o conteúdo existe parado. Reduced-motion desliga a rotação, mantém o desenho.", 1860)


PAGES_V5 = [("interacao", v5_interacao)]
