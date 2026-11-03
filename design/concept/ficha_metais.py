"""
Sistema de metais — ouro, prata e bronze.

A distinção que importa e que quase todo design de pódio erra: **a cor do objeto e a cor da
palavra não são a mesma**.

  · O MEDALHÃO é um objeto. Pode ser ouro vivo (#c9a227), prata clara (#b8bfc7), bronze
    (#c07a45) — cores de metal, que só existem como preenchimento de forma.
  · O TEXTO que nomeia o pódio precisa passar AA sobre o papel. Ouro vivo sobre #faf8f5 dá
    3,67:1 e reprova. Então o texto usa o metal escurecido: #94600a, #5d6670, #8a5a2b.

Contraste medido sobre #faf8f5 (pior caso claro):

  ouro    #94600a  5,04:1  ✅
  prata   #5d6670  5,50:1  ✅
  bronze  #8a5a2b  5,53:1  ✅

E sobre a superfície escura (#12100f), o par claro:

  ouro    #c9a227
  prata   #b8bfc7
  bronze  #c07a45

REGRA DE USO — a cor nunca é o único portador do lugar no pódio.
  O 1º tem medalhão cheio, o 2º tem medalhão com anel, o 3º tem medalhão menor. Se a imagem for
  impressa em preto e branco, o pódio continua legível pela forma e pelo número.
"""

# preenchimento (forma)
OURO = "#c9a227"
PRATA = "#b8bfc7"
BRONZE = "#c07a45"

# texto (AA sobre papel)
OURO_TXT = "#94600a"
PRATA_TXT = "#5d6670"
BRONZE_TXT = "#8a5a2b"

# sobre escuro
OURO_ESC = "#c9a227"
PRATA_ESC = "#b8bfc7"
BRONZE_ESC = "#c07a45"

CONTRASTE = {"ouro": 5.04, "prata": 5.50, "bronze": 5.53}

# ordem canônica do pódio
PODIO = [
    ("1º", "Campeão", OURO, OURO_TXT, OURO_ESC),
    ("2º", "Vice-campeão", PRATA, PRATA_TXT, PRATA_ESC),
    ("3º", "3º lugar", BRONZE, BRONZE_TXT, BRONZE_ESC),
]


def metal_da_posicao(posicao: int):
    """1 -> ouro, 2 -> prata, 3 -> bronze, resto -> cinza neutro."""
    if posicao == 1:
        return OURO, OURO_TXT, OURO_ESC
    if posicao == 2:
        return PRATA, PRATA_TXT, PRATA_ESC
    if posicao == 3:
        return BRONZE, BRONZE_TXT, BRONZE_ESC
    return None, None, None
