"""
Extrai a estrutura REAL das páginas existentes: h1/h2/h3, testids de seção e chaves de dicionário.

O objetivo é migrar o que existe para o sistema FICHA sem inventar conteúdo. Para isso preciso
saber, página por página, quais blocos já estão lá — não o que eu imagino que deveria haver.
"""

import re
import sys
from pathlib import Path

RAIZ = Path(r"D:\PROJETOS\Almanaque dos Clubes\Almanaque dos Clubes\apps\web\src\app")

PAGINAS = [
    "", "competitions", "competitions/[id]", "clubs", "clubs/[id]",
    "players", "players/[id]", "legends", "matches", "map",
    "rankings", "compare", "clubs/compare", "search", "favoritos",
    "mercado-da-bola", "dashboard", "metodologia", "sobre", "apoiadores",
]


def blocos(texto):
    """Títulos visíveis e testids — o esqueleto que o usuário vê."""
    titulos = re.findall(r"<h([123])[^>]*>\s*\{?([^<}\n]{2,60})", texto)
    limpos = []
    for nivel, t in titulos:
        t = re.sub(r"\s+", " ", t).strip()
        if t and not t.startswith("{"):
            limpos.append((int(nivel), t))
    testids = re.findall(r'data-testid="([\w-]+)"', texto)
    return limpos, sorted(set(testids))


def main():
    for rel in PAGINAS:
        caminho = RAIZ / rel / "page.tsx" if rel else RAIZ / "page.tsx"
        if not caminho.exists():
            continue
        texto = caminho.read_text(encoding="utf-8")
        titulos, testids = blocos(texto)
        nome = "/" + rel if rel else "/"
        print(f"\n### {nome}   ({len(texto.splitlines())} linhas)")
        if titulos:
            print("  TÍTULOS:")
            for nivel, t in titulos[:14]:
                print(f"    h{nivel}  {t}")
        if testids:
            print("  SEÇÕES (testid):")
            print("    " + ", ".join(testids[:18]))


if __name__ == "__main__":
    main()
