"""
Constrói o projeto FICHA dentro do app FigCraft ABERTO (--control 7979) via MCP.

Duas fases, de propósito:
  1. cria os 10 FRAMES de página e recolhe os ids;
  2. cria as camadas de cada página com `parent = id do frame`, em coordenadas LOCAIS.

Sem a fase 2 com `parent`, o FigCraft joga cada camada na PÁGINA: o documento vira uma pilha de
1.200 formas soltas sobre 10 frames vazios. Fica igual na tela e inútil na edição — ninguém
consegue mover uma página.

A API do MCP usa `{command, params}` em `run_command` (não `{id}`), e devolve
`{content:[{text:'{"id": N}'}]}`.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import ficha
from mcp_client import McpFigCraft

COLUNAS = 2
GAP_X = 160
GAP_Y = 160
LARGURA = 1440


def resultado(res):
    """Extrai o JSON do envelope MCP."""
    if res.get("isError"):
        raise RuntimeError((res.get("content") or [{}])[0].get("text", "erro"))
    texto = (res.get("content") or [{}])[0].get("text", "")
    try:
        return json.loads(texto)
    except Exception:
        return {}


def main():
    cliente = McpFigCraft()
    try:
        cliente.iniciar()
        cliente.chamar("run_command", {"command": "file.new",
                                       "params": {"width": LARGURA, "height": 1000}})

        paginas = []
        for nome, fn in ficha.PAGES:
            ficha.cmd.clear()
            fn()
            altura = int(max(
                (c["params"].get("y", 0) + c["params"].get("height", 0))
                for c in ficha.cmd if isinstance(c["params"].get("y"), (int, float))
            ))
            paginas.append({"nome": nome, "cmds": list(ficha.cmd), "altura": altura})

        # passada A: coluna e linha
        for i, pg in enumerate(paginas):
            pg["col"] = i % COLUNAS
            pg["lin"] = i // COLUNAS

        # passada B: altura de cada linha = maior pagina dela, e o y acumulado
        n_linhas = (len(paginas) + COLUNAS - 1) // COLUNAS
        y = 0
        for lin in range(n_linhas):
            na_linha = [p for p in paginas if p["lin"] == lin]
            for pg in na_linha:
                pg["y"] = y
            y += max(p["altura"] for p in na_linha) + GAP_Y

        # passada C: x
        for pg in paginas:
            pg["x"] = pg["col"] * (LARGURA + GAP_X)

        for pg in paginas:
            r = resultado(cliente.chamar("run_command", {
                "command": "frame.create",
                "params": {
                    "name": pg["nome"], "x": pg["x"], "y": pg["y"],
                    "width": LARGURA, "height": pg["altura"],
                    "props": {"fill": "#12100f" if pg["nome"] == "Lendas" else "#faf8f5"},
                },
            }))
            pg["fid"] = r.get("id")
            print(f"  frame {pg['nome']:12} id={pg['fid']} @ ({pg['x']},{pg['y']})")

        total = 0
        for pg in paginas:
            corpo = []
            for c in pg["cmds"]:
                if c["command"].startswith("frame."):
                    continue
                p = dict(c["params"])
                p["parent"] = pg["fid"]
                corpo.append({"command": c["command"], "params": p})
            if corpo:
                cliente.chamar("batch", {"commands": corpo}, timeout=300)
            total += len(corpo)
            print(f"  {pg['nome']:12} {len(corpo):4} camadas")

        print(f"  total: {total} camadas em {len(paginas)} frames")

        destino = str(Path(__file__).parent / "FICHA.figcraft")
        cliente.chamar("save_file", {"path": destino})
        print(f"  salvo: {destino}")
    finally:
        cliente.fechar()


if __name__ == "__main__":
    main()
