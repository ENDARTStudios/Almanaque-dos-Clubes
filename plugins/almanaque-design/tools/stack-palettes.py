"""Empilha os quadros do comparador de paletas numa imagem unica.

Por que existe: o Operador precisa COMPARAR seis esquemas. Exportar seis PNGs separados obriga
a abrir seis arquivos e lembrar de um para o outro — nao e comparacao. Uma tira unica, na mesma
largura e na mesma escala, e o que permite julgar.

Uso: python stack-palettes.py <dir_entrada> <saida.png>
"""
import sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1])
out = Path(sys.argv[2])

ORDER = [
    "00 _ comparador.png",
    "A _ A _ Teal.png",
    "B _ B _ Vinho.png",
    "C _ C _ Índigo.png",
    "D _ D _ Esmeralda.png",
    "E _ E _ Amora.png",
    "F _ F _ Ardósia e âmbar.png",
]

imgs = []
for name in ORDER:
    p = src / name
    if not p.exists():
        print(f"  FALTA: {name}")
        continue
    imgs.append(Image.open(p).convert("RGB"))

if not imgs:
    raise SystemExit("nada para empilhar")

W = max(i.width for i in imgs)
GAP = 10  # separacao fina: as faixas ja tem o proprio respiro interno
H = sum(i.height for i in imgs) + GAP * (len(imgs) - 1)

board = Image.new("RGB", (W, H), (250, 248, 245))
y = 0
for im in imgs:
    board.paste(im, (0, y))
    y += im.height + GAP

board.save(out, "PNG", optimize=True)
print(f"{len(imgs)} faixas · {W}x{H} · {out.stat().st_size // 1024} KB · {out}")
