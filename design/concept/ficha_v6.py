"""
Sistema FICHA v6 — as páginas que faltavam e o que a verificação visual apontou.

  404 .......... bola furada, ilustração pequena e digna
  Sobre ........ quem faz, por quê, com que dinheiro
  Legal ........ privacidade, termos, cookies, direitos, LGPD — uma família, um desenho
  Fundamentos .. a paleta ampliada, com contraste medido e a regra de uso
"""

import math

from ficha import (
    add, cmd, frame, rect, txt, rule, kicker, display, num, table_header, table_row,
    topbar, ficha_head, provenance,
    PAPER, SURFACE, SURFACE_2, BORDER, INK, INK_2, INK_3,
    CRIMSON, CRIMSON_INK, OCHRE,
    NIGHT, NIGHT_SURF, NIGHT_BORDER, NIGHT_INK, NIGHT_INK2, NIGHT_INK3,
    NIGHT_CRIMSON, NIGHT_OCHRE,
    HEAD, BODY, W, M, CONTENT,
)
import ficha_visual as V
import ficha_cores as C


# ═════════════════════════════════════════════════════════════════════════════════════════
# 404 — bola furada
# ═════════════════════════════════════════════════════════════════════════════════════════
def v6_404():
    frame("404", h=780)
    topbar(active=-1)

    # A bola: esfera em linhas, com um rasgo. Desenhada, não imagem.
    cx, cy, r = 1010, 380, 176
    V.globo("e404/bola", cx, cy, r, INK, peso=1.0, meridianos=5, paralelos=3, bola=False)
    # pentágonos: um central e quatro ao redor, todos em crimson (a bola é a marca)
    for i, (ang, raio) in enumerate([(-90, 0.42), (-18, 0.36), (54, 0.36),
                                      (126, 0.36), (198, 0.36)]):
        a = math.radians(ang)
        px, py = cx + r * raio * math.cos(a), cy + r * raio * math.sin(a)
        rr = r * 0.19
        pts = [(px + rr * math.cos(math.radians(-90 + 72 * k)),
                py + rr * math.sin(math.radians(-90 + 72 * k))) for k in range(5)]
        V.vetor(f"e404/p{i}", pts, fechado=True, stroke=CRIMSON, strokeWeight=1.6)
    # o rasgo: linha quebrada no quadrante inferior direito
    V.vetor("e404/rasgo", [(cx + r * 0.52, cy - r * 0.30), (cx + r * 0.34, cy - r * 0.02),
                            (cx + r * 0.56, cy + r * 0.10), (cx + r * 0.30, cy + r * 0.40),
                            (cx + r * 0.48, cy + r * 0.62)],
            stroke=CRIMSON, strokeWeight=2.4)
    # ar deflando: três arcos curtos saindo do rasgo
    for i, (dx, dy) in enumerate([(18, -8), (30, 6), (14, 22)]):
        V.vetor(f"e404/ar{i}", [(cx + r * 0.60 + dx, cy + r * 0.10 + dy),
                                 (cx + r * 0.60 + dx * 1.9, cy + r * 0.10 + dy * 1.6)],
                stroke=INK_3, strokeWeight=1.2)
    txt("e404/leg", "a bola furou", cx - 120, cy + r + 40, 240, 11, INK_3, BODY, 500,
        align="center")

    # O texto: o número em display, e a saída
    txt("e404/k", "Erro 404", M, 150, 400, 12.5, INK_3, BODY, 600)
    display("e404/n", "404", M, 190, 118, INK, w=520, lh=150)
    display("e404/t", "Esta página não existe", M, 352, 40, INK, w=600)
    txt("e404/s",
        "O endereço pode ter mudado, ou o link estava errado. O acervo continua inteiro — "
        "e há três caminhos de volta.",
        M, 408, 520, 15, INK_2, BODY, 400, lh=22)

    # Três saídas: a busca, o índice, e o atalho que o usuário talvez quis
    rect("e404/busca", M, 476, 420, 48, fill=SURFACE, stroke=INK, strokeWeight=1.5,
         cornerRadius=2)
    txt("e404/busca/t", "Buscar no Almanaque…", M + 16, 491, 300, 13, INK_3, BODY)
    rect("e404/busca/b", M + 372, 484, 40, 32, fill=INK, cornerRadius=2)
    txt("e404/busca/b/t", "→", M + 384, 491, 20, 13, "#faf8f5", BODY, 600)
    atalhos = [("Competições", "1.932"), ("Clubes", "12.017"), ("Lendas", "1.284")]
    ax = M
    for i, (nome, n) in enumerate(atalhos):
        rect(f"e404/a{i}", ax, 548, 200, 64, fill=SURFACE_2, cornerRadius=2)
        txt(f"e404/a{i}/n", nome, ax + 14, 560, 172, 13, INK, BODY, 600)
        txt(f"e404/a{i}/v", n, ax + 14, 580, 172, 11, INK_3, BODY)
        txt(f"e404/a{i}/s", "→", ax + 172, 580, 24, 12, CRIMSON, BODY, 600)
        ax += 212

    provenance("O 404 não é erro do acervo: nenhum dado é inventado para preencher a página.", 720)


# ═════════════════════════════════════════════════════════════════════════════════════════
# SOBRE
# ═════════════════════════════════════════════════════════════════════════════════════════
def v6_sobre():
    frame("Sobre", h=1240)
    topbar(active=-1)

    txt("s/k", "Institucional · sobre o projeto", M, 104, 600, 12.5, INK_3, BODY, 600)
    display("s/t", "Um acervo, não um agregador", M, 128, 54, INK, w=880, lh=56)
    txt("s/sub",
        "O Almanaque dos Clubes existe para responder uma pergunta simples com um número verificável: "
        "quantas vezes, desde quando, e contra quem.",
        M, 200, 620, 15, INK_2, BODY, 400, lh=22)

    # Números do que já é público
    y = 274
    for i, (l, v) in enumerate([("Clubes", "12.017"), ("Jogadores", "105.211"),
                                 ("Competições", "1.932"), ("Partidas", "17.265")]):
        x = M + i * (CONTENT / 4)
        txt(f"s/n{i}/l", l, x, y, 200, 11, INK_3, BODY, 500)
        num(f"s/n{i}/v", v, x, y + 18, 34, INK, w=200, align="left")

    # Por que existe — três parágrafos curtos, não um manifesto
    y = 360
    rule("s/r1", M, y, CONTENT, INK, 2)
    cols = [
        ("O problema",
         "A história do futebol está espalhada em arquivos que se contradizem. Quem procura "
         "quantos títulos um clube tem encontra três números diferentes e nenhuma explicação."),
        ("O que fazemos",
         "Catalogamos e declaramos a fonte de cada número. Quando duas fontes divergem, "
         "publicamos as duas. Quando não há fonte, a lacuna é escrita — não preenchida."),
        ("O que não fazemos",
         "Não estimamos, não interpolamos e não completamos. Não vendemos destaque. Não "
         "publicamos conteúdo sem procedência, nem escudo sem licença."),
    ]
    cx0 = M
    for i, (titulo, corpo) in enumerate(cols):
        w = (CONTENT - 40 * 2) / 3
        txt(f"s/c{i}/t", titulo, cx0, y + 24, w, 15, INK, HEAD, 700)
        txt(f"s/c{i}/b", corpo, cx0, y + 52, w, 12.5, INK_2, BODY, 400, lh=19)
        cx0 += w + 40

    # Quem faz — sem inventar pessoas
    y = 560
    rule("s/r2", M, y, CONTENT, INK, 2)
    kicker("s/q/l", "Quem faz", M, y + 14, INK, 700)
    txt("s/q/d",
        "O projeto é mantido por uma equipe pequena e por quem envia correção. Toda alteração de "
        "dado fica registrada em auditoria, com autor e motivo.", M, y + 40, 760, 12.5, INK_2,
        BODY, 400, lh=19)
    # papéis reais do repositório
    papeis = [("Curadoria de dados", "verifica fonte, normaliza e publica"),
              ("Engenharia", "mantém a ingestão, a API e o site"),
              ("Comunidade", "aponta erro e envia correção, com fonte")]
    for i, (nome, desc) in enumerate(papeis):
        x = M + i * (CONTENT / 3)
        rect(f"s/p{i}", x, y + 76, CONTENT / 3 - 16, 76, fill=SURFACE_2, cornerRadius=2)
        txt(f"s/p{i}/n", nome, x + 14, y + 90, 300, 12.5, INK, BODY, 600)
        txt(f"s/p{i}/d", desc, x + 14, y + 112, 300, 11, INK_3, BODY, 400, lh=15)

    # Como o projeto se sustenta — a pergunta que todo acervo deve responder
    y = 700
    rule("s/r3", M, y, CONTENT, INK, 2)
    kicker("s/f/l", "Como o projeto se sustenta", M, y + 14, INK, 700)
    txt("s/f/d",
        "Por assinatura de apoiadores. O acervo é aberto a todos; quem paga recebe recursos de "
        "pesquisa, não acesso privilegiado ao dado.", M, y + 40, 760, 12.5, INK_2, BODY, 400,
        lh=19)
    for i, (nome, desc) in enumerate([("Aberto", "consulta completa, sem conta"),
                                      ("Apoiador", "exportação e alertas"),
                                      ("Institucional", "API e uso em pesquisa")]):
        x = M + i * (CONTENT / 3)
        txt(f"s/f{i}/n", nome, x, y + 84, 300, 13, INK, BODY, 600)
        txt(f"s/f{i}/d", desc, x, y + 104, 300, 11, INK_3, BODY)

    # O que sustenta — as quatro promessas, repetidas aqui de propósito
    y = 840
    rect("s/prom/bg", M - 8, y, CONTENT + 16, 116, fill=INK, cornerRadius=2)
    txt("s/prom/k", "As quatro promessas", M + 16, y + 16, 400, 12.5, NIGHT_OCHRE, BODY, 600)
    prom = [("Toda fonte é declarada", "CC0, RSSSF, football-data, Wikidata, Commons"),
            ("Ausência não vira zero", "lacuna é dita, nunca preenchida"),
            ("Partida sem placar não conta", "não soma ponto nem gol"),
            ("Escudo só com licença", "verificada item por item")]
    for i, (t, d) in enumerate(prom):
        x = M + 16 + i * ((CONTENT - 32) / 4)
        txt(f"s/prom{i}/t", t, x, y + 44, 280, 12.5, NIGHT_INK, BODY, 600)
        txt(f"s/prom{i}/d", d, x, y + 66, 280, 10, NIGHT_INK3, BODY, 400, lh=14)

    # Ficha do projeto
    y = 984
    kicker("s/m/l", "Ficha do projeto", M, y, INK, 700)
    ficha = [("Nome", "Almanaque dos Clubes"), ("Origem do dado", "aberto, com fonte por item"),
             ("Licença do código", "ver /termos"), ("Contato", "ver /sobre#contato")]
    for i, (rot, val) in enumerate(ficha):
        x = M + i * (CONTENT / 4)
        txt(f"s/m{i}/r", rot, x, y + 24, 260, 11, INK_3, BODY, 500)
        txt(f"s/m{i}/v", val, x, y + 40, 260, 12.5, INK, BODY, 500)

    provenance("Esta página não vende: descreve o que o acervo faz e o que se recusa a fazer.", 1180)


# ═════════════════════════════════════════════════════════════════════════════════════════
# LEGAL — uma família, um desenho (privacidade, termos, cookies, direitos, LGPD)
# ═════════════════════════════════════════════════════════════════════════════════════════
def v6_legal():
    frame("Legal", h=1340)
    topbar(active=-1)

    txt("l/k", "Institucional · documentos legais", M, 104, 600, 12.5, INK_3, BODY, 600)
    display("l/t", "Legal", M, 128, 54, INK, w=600)
    txt("l/sub",
        "Cinco documentos, uma estrutura. Cada um abre dizendo em uma frase o que o leitor "
        "precisa saber — e o resto é o detalhe para quem quiser conferir.",
        M, 200, 700, 15, INK_2, BODY, 400, lh=22)

    # Navegação entre documentos — é a mesma em todos
    y = 268
    docs = ["Privacidade", "Termos de uso", "Cookies", "Direitos autorais", "LGPD"]
    dx = M
    for i, d in enumerate(docs):
        w = 34 + len(d) * 7.4
        ativo = i == 0
        rect(f"l/n{i}", dx, y, w, 32, fill=INK if ativo else SURFACE, cornerRadius=2,
             stroke=INK if ativo else BORDER, strokeWeight=1)
        txt(f"l/n{i}/t", d, dx + 16, y + 9, w - 32, 12, "#faf8f5" if ativo else INK_2,
            BODY, 600 if ativo else 500)
        dx += w + 10

    # Cabeçalho do documento ativo
    y = 336
    rule("l/r", M, y, CONTENT, INK, 2)
    display("l/doc", "Política de privacidade", M, y + 20, 34, INK, w=700)
    txt("l/dmeta", "Versão 3.2 · vigente desde 01/09/2026 · histórico de versões ao pé", M,
        y + 64, 700, 11, INK_3, BODY)

    # O resumo em uma frase — o que o leitor precisa saber
    rect("l/res/bg", M, y + 92, CONTENT, 76, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    txt("l/res/k", "Em uma frase", M + 16, y + 104, 200, 12.5, C.OCHRE, BODY, 600)
    txt("l/res/t",
        "Guardamos o mínimo para a conta funcionar; nada é vendido, e o acervo público não exige "
        "que você se identifique.",
        M + 16, y + 124, 1100, 13, INK_2, BODY, 400, lh=19)

    # Sumário lateral
    sy = y + 196
    txt("l/sum/l", "Nesta página", M, sy, 300, 12.5, INK, BODY, 600)
    itens = ["Que dados coletamos", "Para que servem", "Com quem compartilhamos",
             "Por quanto tempo", "Seus direitos", "Como falar conosco"]
    for i, it in enumerate(itens):
        txt(f"l/sum{i}", it, M, sy + 30 + i * 26, 300, 11.5, INK_2, BODY)
        rule(f"l/sum{i}/l", M, sy + 46 + i * 26, 300, BORDER, 1)

    # Corpo do documento
    rx = M + 380
    rw = CONTENT - 380
    txt("l/b1", "Que dados coletamos", rx, sy, 400, 15, INK, HEAD, 700)
    txt("l/b1t",
        "Endereço de e-mail e senha (com hash) para a conta. Nome de exibição, se você preencher. "
        "O que você favorita. Registro de acesso, para segurança. Nada além disso.",
        rx, sy + 26, rw, 12.5, INK_2, BODY, 400, lh=19)

    # Tabela de dados — o dado, não a prosa
    ty = sy + 96
    cols = [("Dado", rx, 220, "left"), ("Finalidade", rx + 240, 300, "left"),
            ("Base legal", rx + 560, 260, "left"), ("Retenção", rx + 840, 140, "left")]
    table_header(cols, ty)
    linhas = [("E-mail", "identificar a conta", "execução de contrato", "até exclusão"),
              ("Senha (hash)", "autenticar", "execução de contrato", "até exclusão"),
              ("Favoritos", "montar Meu Almanaque", "consentimento", "até exclusão"),
              ("Registro de acesso", "segurança e auditoria", "legítimo interesse", "90 dias")]
    ry = ty + 26
    for i, li in enumerate(linhas):
        table_row(i, list(li), ry, cols, strong=True)
        ry += 34

    # Bloco de direitos
    dy = ry + 24
    txt("l/b5", "Seus direitos", rx, dy, 400, 15, INK, HEAD, 700)
    direitos = [("Acessar", "pedir cópia de tudo que guardamos"),
                ("Corrigir", "ajustar dado errado, sem justificar"),
                ("Excluir", "apagar a conta e o que veio com ela"),
                ("Portar", "levar seus dados em formato aberto")]
    for i, (t, d) in enumerate(direitos):
        w = (rw - 12 * 3) / 4
        x = rx + i * (w + 12)
        rect(f"l/d{i}", x, dy + 26, w, 72, fill=SURFACE, cornerRadius=2, stroke=BORDER,
             strokeWeight=1)
        txt(f"l/d{i}/t", t, x + 12, dy + 38, w - 24, 12.5, INK, BODY, 600)
        txt(f"l/d{i}/d", d, x + 12, dy + 58, w - 24, 10, INK_3, BODY, 400, lh=14)

    # Rodapé legal: versões e o contato
    fy = dy + 122
    rect("l/f/bg", M - 8, fy, CONTENT + 16, 92, fill=SURFACE_2, cornerRadius=2,
         stroke=BORDER, strokeWeight=1)
    txt("l/f/k", "Histórico e contato", M + 16, fy + 14, 300, 12.5, INK, BODY, 600)
    txt("l/f/t",
        "Versões anteriores ficam arquivadas e continuam acessíveis por data. Pedidos de titular "
        "são respondidos em até 15 dias, pelo canal indicado em /sobre#contato.",
        M + 16, fy + 34, 900, 11.5, INK_2, BODY, 400, lh=17)
    for i, v in enumerate(["v3.2 · 01/09/2026", "v3.1 · 12/03/2026", "v3.0 · 04/11/2025"]):
        txt(f"l/f/v{i}", v, W - M - 420 + i * 140, fy + 62, 140, 10, INK_3, BODY, 500)

    provenance("Este documento é um desenho de página, não texto jurídico. O conteúdo real passa por revisão antes de publicar.", 1280)


# ═════════════════════════════════════════════════════════════════════════════════════════
# FUNDAMENTOS — a paleta ampliada
# ═════════════════════════════════════════════════════════════════════════════════════════
def v6_fundamentos():
    frame("Fundamentos", h=1180)
    topbar(active=-1)

    txt("f/k", "Sistema · fundamentos", M, 104, 600, 12.5, INK_3, BODY, 600)
    display("f/t", "Cor", M, 128, 58, INK, w=600)
    txt("f/sub",
        "As institucionais sustentam a interface e não sustentam dado. Um acervo com 1.932 "
        "competições e seis tipos de gráfico precisa de mais matiz — com regra, não com gosto.",
        M, 200, 720, 15, INK_2, BODY, 400, lh=22)

    def amostra(nome_tok, hexcor, papel, contraste, y, novo=False):
        rect(f"f/{nome_tok}/chip", M, y, 96, 64, fill=hexcor, cornerRadius=2)
        txt(f"f/{nome_tok}/n", nome_tok, M + 116, y + 6, 300, 13, INK, BODY, 600)
        txt(f"f/{nome_tok}/h", hexcor.upper(), M + 116, y + 26, 200, 11, INK_3, BODY)
        txt(f"f/{nome_tok}/p", papel, M + 116, y + 44, 520, 11, INK_2, BODY)
        txt(f"f/{nome_tok}/c", f"{contraste:.2f}:1", W - M - 90, y + 24, 90, 12,
            C.SUCESSO if contraste >= 4.5 else C.PERIGO, BODY, 600, align="right")
        if novo:
            rect(f"f/{nome_tok}/novo", W - M - 210, y + 20, 44, 18, fill=C.PETROL,
                 cornerRadius=2)
            txt(f"f/{nome_tok}/novo/t", "nova", W - M - 210, y + 24, 44, 9, "#faf8f5", BODY,
                600, align="center")

    # institucionais
    txt("f/i/l", "Institucionais · não mudam", M, 268, 400, 12.5, INK, BODY, 600)
    y = 292
    for tok, hexcor, papel, cont, novo in [
        ("primary", C.CRIMSON, "ação, marca, acento de registro", C.CONTRASTE["crimson"], False),
        ("secondary", C.OCHRE, "pódio, honra, alcance mundial", C.CONTRASTE["ochre"], False),
    ]:
        amostra(tok, hexcor, papel, cont, y, novo)
        y += 78

    # novas
    txt("f/n/l", "Novas · paleta de dado", M, 456, 400, 12.5, INK, BODY, 600)
    txt("f/n/d", "Só aparecem em série de gráfico, faixa de alcance e mapa. Nenhuma compete com a marca.",
        M + 200, 456, 780, 11, INK_3, BODY)
    y = 480
    for tok, hexcor, papel, cont in [
        ("petrol", C.PETROL, "3º matiz — nacional, série 3", C.CONTRASTE["petrol"]),
        ("olive", C.OLIVE, "categoria fria — estadual, série 4", C.CONTRASTE["olive"]),
        ("plum", C.PLUM, "histórico e lenda — série 5", C.CONTRASTE["plum"]),
        ("slate", C.SLATE, "neutro de categoria — \"outros\", \"sem dado\"", C.CONTRASTE["slate"]),
    ]:
        amostra(tok, hexcor, papel, cont, y, novo=True)
        y += 78

    # regra de uso
    y = 800
    rule("f/r", M, y, CONTENT, INK, 2)
    kicker("f/rgl", "A regra", M, y + 14, INK, 700)
    regras = [
        ("Nenhuma cor nova compete com a marca", "o crimson continua sendo o único acento de ação"),
        ("Cor nova é cor de DADO", "só em série, faixa de alcance e mapa"),
        ("Todas passam AA sobre o papel", "5,58:1 a 9,00:1 — medido, não estimado"),
        ("Nenhuma é violeta nem índigo", "as famílias que o Taste Skill bane como paleta de assistente"),
    ]
    for i, (t, d) in enumerate(regras):
        x = M + i * (CONTENT / 4)
        txt(f"f/rg{i}/t", t, x, y + 44, 280, 12.5, INK, BODY, 600, lh=16)
        txt(f"f/rg{i}/d", d, x, y + 78, 280, 10.5, INK_3, BODY, 400, lh=15)

    # série categórica + tier, aplicados
    y = 910
    kicker("f/serie", "Série categórica e faixa de alcance, aplicadas", M, y, INK, 700)
    for i, (nome, cor) in enumerate(zip(["viz-1", "viz-2", "viz-3", "viz-4", "viz-5", "viz-6"],
                                         C.SERIE)):
        rect(f"f/serie/{i}", M + i * 96, y + 26, 84, 40, fill=cor, cornerRadius=2)
        txt(f"f/serie/{i}/n", nome, M + i * 96, y + 72, 84, 9, INK_3, BODY, 500)
    for i, (nome, cor) in enumerate(C.TIER.items()):
        x = M + 600 + i * 180
        rect(f"f/tier/{i}", x, y + 26, 24, 24, fill=cor, cornerRadius=2)
        txt(f"f/tier/{i}/n", nome, x + 32, y + 32, 140, 11, INK, BODY, 600)

    # exemplo de gráfico com a paleta aplicada
    y = 1000
    # barras com a cor de CADA faixa: é o ponto da página, não uma demo com cinza
    faixas = [("Mundial", 4, C.OCHRE), ("Continental", 22, C.CRIMSON),
              ("Nacional", 58, C.PETROL), ("Estadual", 16, C.OLIVE)]
    topo_f = max(v for _, v, _ in faixas)
    passo_f = 420 / len(faixas)
    for i, (rot, v, cor) in enumerate(faixas):
        bx = M + i * passo_f + passo_f * 0.18
        bw = passo_f * 0.64
        h = 100 * v / topo_f
        rect(f"f/demo/{i}", bx, y + 100 - h, bw, h, fill=cor, cornerRadius=1)
        txt(f"f/demo/{i}/r", rot, bx, y + 108, passo_f, 9, C.INK_3, BODY, 500, align="center")
    rect("f/demo/eixo", M, y + 100, 420, 1, fill=C.FIO)
    txt("f/demo/t", "Barras com a paleta de série", M, y + 124, 420, 10, C.INK_3, BODY, 500)
    V.donut("f/demo2", [("Mundial", 4, C.OCHRE), ("Continental", 22, C.CRIMSON),
                         ("Nacional", 58, C.PETROL), ("Estadual", 16, C.OLIVE)],
        M + 500, y - 10, 96, 12)
    txt("f/demo2/t", "Donut: a 3ª cor é o que faltava", M + 620, y + 34, 400, 10, INK_3, BODY, 500)
    txt("f/demo2/d",
        "Com duas cores, a terceira categoria virava cinza e sumia. Petrol e oliva devolvem "
        "identidade a cada faixa.", M + 620, y + 52, 460, 11, INK_2, BODY, 400, lh=16)

    provenance("Contraste calculado sobre #faf8f5, o pior caso claro. No escuro, cada cor tem par com a mesma relação.", 1120)


PAGES_V6 = [
    ("404", v6_404),
    ("sobre", v6_sobre),
    ("legal", v6_legal),
    ("fundamentos", v6_fundamentos),
]
