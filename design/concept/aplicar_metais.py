"""
Aplica os metais (ouro/prata/bronze) e a paleta nova ao conceito.

O QUE MUDA, PÁGINA POR PÁGINA

  Competições .. pódio com ouro/prata/bronze; os quatro degraus de alcance passam a usar a
                 paleta nova (ouro, crimson, petrol, slate) em vez de tudo em ocre/cinza.
  Lendas ...... posição 1/2/3 do ranking em metal; os três gráficos usam a série categórica.
  Ranking ..... top 3 com marca de metal na coluna da posição.
  Rankings .... o mesmo, na tabela base.
  Clube ....... troféus em ouro vivo (eram ocre genérico).
  Mapa ........ a rampa de intensidade sai do crimson para o petrol — o mapa nunca deve usar a
                 cor de ação da marca, senão competição e mapa gritam igual.

A REGRA QUE NÃO MUDA
  A cor nunca é o único portador. O 1º tem medalhão cheio, o 2º anel duplo, o 3º medalhão menor.
  Em preto e branco o pódio continua legível pela forma e pelo número.
"""

import re
from pathlib import Path

RAIZ = Path(__file__).parent


def ler(n):
    return (RAIZ / n).read_text(encoding="utf-8").replace("\r\n", "\n")


def escrever(n, s):
    (RAIZ / n).write_text(s, encoding="utf-8")


# ── 1. ficha_visual: medalha com metal ───────────────────────────────────────────────────
def patch_medalha():
    s = ler("ficha_visual.py")
    velho_inicio = s.index("def medalha(")
    velho_fim = s.index("\n\n\n", velho_inicio)
    novo = '''def medalha(nome, x, y, d=34, cor=CRIMSON, fita=INK_3, metal=None, posicao=None):
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
'''
    s = s[:velho_inicio] + novo + s[velho_fim:]
    escrever("ficha_visual.py", s)
    print("  ficha_visual.medalha: metais")


# ── 2. Competições: pódio em metal + degraus na paleta nova ──────────────────────────────
def patch_competicoes():
    s = ler("ficha_v3.py")

    # pódio: era crimson/ocre/cinza -> ouro/prata/bronze
    s = s.replace(
        '    podio = [("Argentina", "Campeão", CRIMSON, "3"), ("França", "Vice-campeão", OCHRE, "2"),\n'
        '             ("Croácia", "3º lugar", INK_3, "3")]',
        '    import ficha_metais as MT\n'
        '    podio = [("Argentina", "Campeão", MT.OURO_TXT, "3", 1),\n'
        '             ("França", "Vice-campeão", MT.PRATA_TXT, "2", 2),\n'
        '             ("Croácia", "3º lugar", MT.BRONZE_TXT, "3", 3)]')
    s = s.replace('    for i, (pais, titulo, cor, t) in enumerate(podio):',
                  '    for i, (pais, titulo, cor, t, pos) in enumerate(podio):')
    s = s.replace('        V.medalha(f"c/m{i}/med", mx + 20, my + 52, 40, cor)',
                  '        V.medalha(f"c/m{i}/med", mx + 20, my + 52, 40, cor, posicao=pos)')

    # degraus de alcance: ouro / crimson / petrol / slate
    s = s.replace('        borda = OCHRE if alcance == "Mundial" else BORDER',
                  '        borda = C_OURO if alcance == "Mundial" else BORDER')
    s = s.replace('        V.trofeu(f"c/d{i}/trof", dx + w / 2 - th * 0.33, dy + 36, th,\n'
                  '                 OCHRE if alcance == "Mundial" else (CRIMSON if i < 3 else INK_3))',
                  '        cor_trof = {"Mundial": C_OURO, "Continental": CRIMSON}.get(alcance, C_PETROL)\n'
                  '        V.trofeu(f"c/d{i}/trof", dx + w / 2 - th * 0.33, dy + 36, th, cor_trof)')
    s = s.replace('        txt(f"c/d{i}/a", alcance, dx + 16, dy + 186, w - 32, 10, OCHRE, BODY, 600, ls=1.2)',
                  '        txt(f"c/d{i}/a", alcance, dx + 16, dy + 186, w - 32, 10,\n'
                  '            {"Mundial": C_OURO_T, "Continental": CRIMSON}.get(alcance, C_PETROL), BODY, 600)')

    # o troféu do índice: ouro para continental, slate para nacional
    s = s.replace('        V.trofeu(f"c/i{i}/trof", M + 6, ry - 4, 22,\n'
                  '                 OCHRE if c[4] == "Continental" else INK_3)',
                  '        V.trofeu(f"c/i{i}/trof", M + 6, ry - 4, 22,\n'
                  '                 C_OURO if c[4] == "Continental" else C_SLATE)')

    # constante local de import
    s = s.replace('import ficha_visual as V',
                  'import ficha_visual as V\nimport ficha_cores as _C\n'
                  'C_OURO, C_OURO_T = _C.OCHRE, _C.OCHRE\n'
                  'C_PETROL, C_SLATE = _C.PETROL, _C.SLATE')
    escrever("ficha_v3.py", s)
    print("  Competições: pódio em metal, degraus na paleta nova")


# ── 3. Lendas: posições em metal + gráficos na série ────────────────────────────────────
def patch_lendas():
    s = ler("ficha_v3.py")

    # posição 1/2/3 do ranking de jogadores
    s = s.replace('        num(f"l/j{i}/p", pos, M, jy + 6, 30, NIGHT_BORDER, w=44, align="left")',
                  '        import ficha_metais as MT\n'
                  '        cor_pos = {1: MT.OURO_ESC, 2: MT.PRATA_ESC, 3: MT.BRONZE_ESC}.get(i + 1, NIGHT_BORDER)\n'
                  '        num(f"l/j{i}/p", pos, M, jy + 6, 30, cor_pos, w=44, align="left")')
    # mesmo no ranking de clubes
    s = s.replace('        num(f"l/c{i}/p", pos, cx2 + 14, cy + 44, 18, NIGHT_BORDER, w=30, align="left")',
                  '        cor_pc = {1: MT.OURO_ESC, 2: MT.PRATA_ESC, 3: MT.BRONZE_ESC}.get(i + 1, NIGHT_BORDER)\n'
                  '        num(f"l/c{i}/p", pos, cx2 + 14, cy + 44, 18, cor_pc, w=30, align="left")')
    # gráficos com a série categórica
    s = s.replace('''    V.barras("l/g2", [("ESP", 84), ("ITA", 62), ("ING", 58), ("ALE", 46), ("BRA", 34),
                      ("ARG", 28), ("FRA", 22)],
             M + 460, gy + 62, 400, 150, horizontal=True, cor=NIGHT_OCHRE,
             cor_base=NIGHT_BORDER)''',
                  '''    V.barras("l/g2", [("ESP", 84), ("ITA", 62), ("ING", 58), ("ALE", 46), ("BRA", 34),
                      ("ARG", 28), ("FRA", 22)],
             M + 460, gy + 62, 400, 150, horizontal=True, cor=NIGHT_OCHRE,
             cor_base=_C.PETROL_ESCURO)''')
    s = s.replace('''    V.donut("l/g3", [("Gols", 42, NIGHT_CRIMSON), ("Títulos", 31, NIGHT_OCHRE),
                     ("Público", 14, NIGHT_INK3), ("Outros", 13, NIGHT_BORDER)],
            M + 960, gy + 62, 120, 14)''',
                  '''    V.donut("l/g3", [("Gols", 42, NIGHT_CRIMSON), ("Títulos", 31, NIGHT_OCHRE),
                     ("Público", 14, _C.PETROL_ESCURO), ("Outros", 13, _C.PLUM_ESCURO)],
            M + 960, gy + 62, 120, 14)''')
    s = s.replace('''    leg = [("Gols", "42", NIGHT_CRIMSON), ("Títulos", "31", NIGHT_OCHRE),
           ("Público", "14", NIGHT_INK3), ("Outros", "13", NIGHT_BORDER)]''',
                  '''    leg = [("Gols", "42", NIGHT_CRIMSON), ("Títulos", "31", NIGHT_OCHRE),
           ("Público", "14", _C.PETROL_ESCURO), ("Outros", "13", _C.PLUM_ESCURO)]''')
    escrever("ficha_v3.py", s)
    print("  Lendas: posições em metal, gráficos na série")


# ── 4. Ranking: top 3 com marca de metal ────────────────────────────────────────────────
def patch_ranking():
    s = ler("ficha_extra.py")
    s = s.replace('''    ry = ty + 26
    for i, d in enumerate(dados):
        table_row(i, list(d), ry, cols, strong=(i < 3))
        ry += 34''',
                  '''    import ficha_metais as MT
    ry = ty + 26
    for i, d in enumerate(dados):
        table_row(i, list(d), ry, cols, strong=(i < 3))
        # marca de metal na 1ª coluna: forma (disco cheio / anel / menor), não só cor
        if i < 3:
            vivo = [MT.OURO, MT.PRATA, MT.BRONZE][i]
            esc = [MT.OURO_TXT, MT.PRATA_TXT, MT.BRONZE_TXT][i]
            raio = [7, 6, 5][i]
            rect(f"r/med{i}", M + 2, ry + 3, raio * 2, raio * 2, fill=vivo,
                 cornerRadius=raio, stroke=esc, strokeWeight=1.4)
        ry += 34''')
    escrever("ficha_extra.py", s)
    print("  Ranking: top 3 com marca de metal")


# ── 5. Clube: troféus em ouro vivo ──────────────────────────────────────────────────────
def patch_clube():
    s = ler("ficha_v3.py")
    s = s.replace('''    trofeus = [("Libertadores", "3", OCHRE, 44), ("Brasileiro", "8", CRIMSON, 40),
               ("Copa do Brasil", "5", OCHRE, 36), ("Mundial", "1", OCHRE, 40),
               ("Supercopa", "3", INK_3, 30)]''',
                  '''    import ficha_metais as MT
    # troféu é sempre ouro: é o objeto do título. O que muda é o tamanho e a quantidade.
    trofeus = [("Libertadores", "3", MT.OURO, 44), ("Brasileiro", "8", MT.OURO, 40),
               ("Copa do Brasil", "5", MT.OURO, 36), ("Mundial", "1", MT.OURO, 40),
               ("Supercopa", "3", MT.OURO, 30)]''')
    s = s.replace('        num(f"t/{i}/q", qtd, tx + 12, ty + 128, 22, cor if cor != INK_3 else INK,\n                    w=w - 24, align="center")',
                  '        num(f"t/{i}/q", qtd, tx + 12, ty + 128, 22, MT.OURO_TXT, w=w - 24,\n            align="center")')
    escrever("ficha_v3.py", s)
    print("  Clube: troféus em ouro")


# ── 6. Mapa: rampa de intensidade em petrol ─────────────────────────────────────────────
def patch_mapa():
    s = ler("ficha_v3.py")
    s = s.replace('        rect(f"m/e{i}/bar", lx, ey + 22, 300 * pct / 100, 2, fill=CRIMSON if i < 3 else INK_3)',
                  '        # mapa usa petrol, não crimson: a cor de ação da marca não deve gritar no mapa\n'
                  '        rect(f"m/e{i}/bar", lx, ey + 22, 300 * pct / 100, 2,\n'
                  '             fill=_C.PETROL if i < 3 else _C.SLATE)')
    s = s.replace('        rect(f"m/leg/{i}", M + 20 + i * 26, my + 580, 22, 12, fill=CRIMSON, opacity=op)',
                  '        rect(f"m/leg/{i}", M + 20 + i * 26, my + 580, 22, 12, fill=_C.PETROL, opacity=op)')
    escrever("ficha_v3.py", s)
    print("  Mapa: rampa em petrol")


def main():
    patch_medalha()
    patch_competicoes()
    patch_lendas()
    patch_ranking()
    patch_clube()
    patch_mapa()


if __name__ == "__main__":
    main()
