"""
Paleta ampliada do Almanaque — as institucionais sozinhas não sustentam um acervo de dados.

O que existe hoje (globals.css) é suficiente para interface e insuficiente para DADO:
  --color-primary    #be123c   ação, marca
  --color-secondary  #94600a   pódio, honra
  --color-foreground #111111   texto
  + cinzas

Um acervo com 1.932 competições, 197 países, 12 escalões de pirâmide e 6 tipos de gráfico precisa
de mais matiz — mas acrescentar cor solta quebra o sistema. Então a ampliação tem REGRA:

  1. Nenhuma cor nova compete com a marca. O crimson continua sendo o único acento de ação.
  2. As novas cores são de DADO: só aparecem em série de gráfico, faixa de tier e mapa.
  3. Todas passam AA (4.5:1) sobre o papel #faf8f5 e sobre a superfície #ffffff.
  4. Todas têm par no escuro (.theme-dark), com a mesma relação de contraste.

Contraste medido sobre #faf8f5 (o pior caso claro):

  crimson  #be123c  5,90:1 ✅   (já existia)
  ochre    #94600a  5,11:1 ✅   (já existia)
  petrol   #0f6b6b  6,00:1 ✅   novo
  olive    #5c6b1f  5,58:1 ✅   novo
  plum     #6d2e5f  9,00:1 ✅   novo
  slate    #34506b  7,91:1 ✅   novo

Nenhuma delas é violeta nem índigo — as duas famílias que o Taste Skill bane por serem a
assinatura da paleta de assistente. O petrol é verde-azulado profundo, não azul de interface.
"""

# ── institucionais (não mudam) ────────────────────────────────────────────────────────────
CRIMSON = "#be123c"
CRIMSON_INK = "#9f1239"
OCHRE = "#94600a"
PAPEL = "#faf8f5"
SUPERFICIE = "#ffffff"
SUPERFICIE_2 = "#f2efea"
FIO = "#e0dad3"
INK = "#111111"
INK_2 = "#57534e"
INK_3 = "#6b6560"

# ── novas: paleta de DADO ────────────────────────────────────────────────────────────────
PETROL = "#0f6b6b"      # verde-azulado profundo: 3º matiz, o que mais faltava
OLIVE = "#5c6b1f"       # verde-oliva: separa "nacional" de "continental" sem virar azul
PLUM = "#6d2e5f"        # ameixa: a cor de "histórico/lenda", distinta do crimson de ação
SLATE = "#34506b"       # ardósia: categoria neutra, para "outros" e "sem dado"

# par no escuro (mesma relação, luminosidade invertida)
PETROL_ESCURO = "#4fb3b3"
OLIVE_ESCURO = "#a3b455"
PLUM_ESCURO = "#c77fb5"
SLATE_ESCURO = "#7fa3c4"

# ── séries ───────────────────────────────────────────────────────────────────────────────
# Ordem categórica: a 1ª é sempre a marca; a 6ª é sempre o "resto".
SERIE = [CRIMSON, OCHRE, PETROL, OLIVE, PLUM, SLATE]
SERIE_ESCURA = ["#e8412f", "#c9a227", PETROL_ESCURO, OLIVE_ESCURO, PLUM_ESCURO, SLATE_ESCURO]

# ── alcance: a cor acompanha o degrau, nunca o substitui ────────────────────────────────
TIER = {
    "Mundial": OCHRE,
    "Continental": CRIMSON,
    "Nacional": PETROL,
    "Estadual": SLATE,
}

# ── estados semânticos (já existiam, ficam registrados aqui) ────────────────────────────
SUCESSO = "#127035"
AVISO = "#a34a08"
PERIGO = "#b91c1c"
INFO = "#1d4ed8"

CONTRASTE = {
    "crimson": 5.90, "ochre": 5.11, "petrol": 6.00,
    "olive": 5.58, "plum": 9.00, "slate": 7.91,
}


def css():
    """Bloco para colar em globals.css. Só as variáveis novas e as de série."""
    linhas = [
        "  /* ── paleta de dado (ampliação 2026-11) ── */",
        f"  --color-viz-1: {CRIMSON};",
        f"  --color-viz-2: {OCHRE};",
        f"  --color-viz-3: {PETROL};",
        f"  --color-viz-4: {OLIVE};",
        f"  --color-viz-5: {PLUM};",
        f"  --color-viz-6: {SLATE};",
        "",
        "  /* alcance: a cor reforça o degrau, nunca é o único portador */",
        f"  --color-tier-mundial: {TIER['Mundial']};",
        f"  --color-tier-continental: {TIER['Continental']};",
        f"  --color-tier-nacional: {TIER['Nacional']};",
        f"  --color-tier-estadual: {TIER['Estadual']};",
    ]
    return "\n".join(linhas)
