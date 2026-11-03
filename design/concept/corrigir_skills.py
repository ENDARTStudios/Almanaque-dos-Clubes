"""
Correções exigidas pelas skills externas (Taste Skill v2, Emil Kowalski, Impeccable).

O QUE A AUDITORIA ENCONTROU — violações do "house rules" do Taste Skill, medidas no conceito:

  1. "No eyebrows — no small label above a heading."
     `ficha_head()` abre TODA página com um kicker em caixa alta sobre o título. É a assinatura
     do sistema e é exatamente o que a regra proíbe. 16 páginas.

  2. "No tiny uppercase letter-spaced labels."
     O kicker (10px, caixa alta, +2,2) e o rótulo do número-âncora (10px, caixa alta, +2,0).

  3. "No thin rules — no hairline dividers."
     O conceito se apoia em "o fio é a única profundidade". Fio de TABELA é permitido (tabela
     real pode ter linha); fio de SEÇÃO não é.

  4. "No index numbering — no 01/02/03."
     "1 · Liga", "2 · Copa" em Tabelas; "1 · Fontes" … "10 · Versionamento" em Metodologia.

  5. "No rows of identical cards."  Home (6), Competições (4), Clube (5 troféus).

  6. "No blank stretches taller than about half a screen."  Clube, Lendas, Admin.

O QUE ESTE SCRIPT FAZ
  Correção nos helpers, não página por página — três funções concentram as violações 1–3:

  · `kicker()` ...... deixa de ser eyebrow: vira cabeçalho de seção em caixa baixa, 12,5px,
                      peso 600, sem tracking. A informação do eyebrow já estava no subtítulo.
  · `ficha_head()` .. não emite kicker; o título display abre a página. O subtítulo absorve o
                      texto do kicker. O rótulo do âncora perde caixa alta e tracking.
  · `rule()` ........ fio de seção (peso ≥ 2, largura total) não é desenhado; a separação passa
                      a ser espaço + cabeçalho + escala. Fio de tabela (peso 1) continua.

  Depois: remove a numeração "N · " dos títulos de seção em Tabelas e Metodologia.

O QUE NÃO MUDA: a paleta e as fontes do projeto. O Taste Skill bane "yellow-cream ground with
terracotta or rust" como paleta de assistente, mas também manda preservar marca existente
("--keep palette,type"). A nossa é marca; a exceção fica declarada no relatório.
"""

import re
from pathlib import Path

RAIZ = Path(__file__).parent


def ler(nome):
    # CRLF: o arquivo está em Windows e as âncoras com \n não casavam
    return (RAIZ / nome).read_text(encoding="utf-8").replace("\r\n", "\n")


def escrever(nome, texto):
    (RAIZ / nome).write_text(texto, encoding="utf-8")


def novo_kicker(texto):
    inicio = texto.index("def kicker(")
    fim = texto.index("\n\n\n", inicio)
    return texto[:inicio] + '''def kicker(name, content, x, y, color=INK_3, w=600):
    """Cabeçalho de seção — NÃO é eyebrow.

    O Taste Skill proíbe "a small label above a heading" e "tiny uppercase letter-spaced
    labels". A versão anterior era as duas coisas: 10px, caixa alta, tracking +2,2, sempre
    acima do título. Agora é um cabeçalho de seção em caixa baixa, no tamanho de leitura, que
    nomeia o bloco abaixo — e a página abre pelo título, não por ele.
    """
    add("text.create", name=name, text=content, x=x, y=y, width=w,
        props={"fontSize": 12.5, "fontFamily": BODY, "fontWeight": 600, "fill": color,
               "letterSpacing": 0})''' + texto[fim:]


def novo_ficha_head(texto):
    velho = '''    kicker("kicker", kicker_txt, M, y, dim3, 700)
    display("title", title, M, y + 18, 68, ink, w=880)'''
    novo = '''    # Sem eyebrow acima do título: o Taste Skill proíbe rótulo pequeno sobre heading.
    # O texto do kicker desce para o subtítulo, que já carregava o mesmo papel.
    if kicker_txt and sub:
        sub = f"{kicker_txt[0].upper()}{kicker_txt[1:]} · {sub}"
    display("title", title, M, y, 68, ink, w=880)'''
    if velho not in texto:
        raise SystemExit("  ANCORA: ficha_head (kicker/title)")
    texto = texto.replace(velho, novo, 1)

    velho_lbl = '''        add("text.create", name="anchor/l", text=anchor_label.upper(), x=W - M - 320,
            y=y + 84, width=320,
            props={"fontSize": 10, "fontFamily": BODY, "fontWeight": 600, "fill": dim3,
                   "textAlign": "right", "letterSpacing": 2.0})'''
    novo_lbl = '''        # rótulo do âncora: caixa baixa e sem tracking — era outro "tiny tracked cap"
        add("text.create", name="anchor/l", text=anchor_label, x=W - M - 320,
            y=y + 66, width=320,
            props={"fontSize": 11, "fontFamily": BODY, "fontWeight": 500, "fill": dim3,
                   "textAlign": "right"})'''
    if velho_lbl not in texto:
        raise SystemExit("  ANCORA: ficha_head (anchor/l)")
    texto = texto.replace(velho_lbl, novo_lbl, 1)

    texto = texto.replace('num("anchor", anchor, W - M - 320, y + 6, 76, accent, w=320)',
                          'num("anchor", anchor, W - M - 320, y - 12, 76, accent, w=320)', 1)
    texto = texto.replace('txt("sub", sub, M, y + 104, 760, 15, dim, BODY, 400, lh=22)',
                          'txt("sub", sub, M, y + 84, 760, 15, dim, BODY, 400, lh=22)', 1)
    texto = texto.replace('rule("head/rule", M, y + (146 if sub else 108), CONTENT, line, 2)',
                          '# o fio do cabeçalho é divisória: o Taste Skill bane hairline divider.\n'
                          '    _ = line  # mantido para o caso escuro, sem desenhar fio', 1)
    return texto


def nova_rule(texto):
    velho = '''def rule(name, x, y, w, color=BORDER, weight=1):
    rect(name, x, y, w, weight, fill=color)'''
    novo = '''def rule(name, x, y, w, color=BORDER, weight=1):
    """Fio de tabela SIM; fio de seção NÃO.

    O Taste Skill bane "hairline dividers". Uma linha entre linhas de tabela é parte de uma
    tabela real e é permitida; um fio de 2px atravessando a página para separar seções é
    divisória decorativa. A separação de seção passa a ser espaço + cabeçalho + escala.
    """
    if weight >= 2 and color in (INK, NIGHT_INK) and w >= 1000:
        return  # fio de seção: não desenha
    rect(name, x, y, w, weight, fill=color)'''
    if velho not in texto:
        raise SystemExit("  ANCORA: rule")
    return texto.replace(velho, novo, 1)


def tirar_numeracao(nome):
    """Remove o "N · " dos títulos de seção — "no index numbering"."""
    texto = ler(nome)
    antes = texto
    texto = re.sub(r'(\("[\w/]+",\s*)"(\d{1,2}) · ([^"]+)"', r'\1"\3"', texto)
    if texto != antes:
        escrever(nome, texto)
        return texto.count('"') != antes.count('"')
    return False


def main():
    texto = ler("ficha.py")
    texto = novo_kicker(texto)
    texto = novo_ficha_head(texto)
    texto = nova_rule(texto)
    escrever("ficha.py", texto)
    print("  ficha.py: kicker, ficha_head e rule corrigidos")

    for nome in ("ficha_v4.py",):
        tirar_numeracao(nome)
        print(f"  {nome}: numeração 'N · ' removida dos títulos de seção")


if __name__ == "__main__":
    main()
