"""
Reconstrói o projeto FICHA inteiro no app FigCraft — 10 páginas, todos os frames.

Existe porque `organizar.py` ficou para trás: ele só conhece as 8 primeiras páginas e não aplica
o `assentar_rodape`. Este script é a fonte única do estado do arquivo:

  · limpa as páginas e recria as 10, na ordem de leitura do produto;
  · aplica `normalizar` (regras da skill) e `assentar_rodape` em toda página;
  · a altura de cada moldura é derivada do conteúdo, não declarada;
  · captura um PNG por frame com a ferramenta `screenshot` do próprio app;
  · salva `FICHA.figcraft`.

Rodar sempre que qualquer gerador mudar. É idempotente: reconstrói do zero.
"""

import base64
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import ficha
import ficha_extra
import ficha_v3
import ficha_v4
import ficha_v5
import ficha_v6
from mcp_client import McpFigCraft

LARGURA = 1440
GAP = 160

SECOES = [
    ("00 · Capa", [("home", ficha_v3.v3_home)]),
    ("01 · Descoberta", [
        ("competicoes", ficha_v3.v3_competicoes),
        ("tabelas", ficha_v4.v4_tabelas),
        ("temporada", ficha_v3.v3_temporada),
        ("partidas", ficha_v3.v3_partidas),
    ]),
    ("02 · Entidades", [
        ("clube", ficha_v3.v3_clube),
        ("jogador", ficha_v3.v3_jogador),
        ("estadio", ficha_v3.v3_estadio),
    ]),
    ("03 · Rankings e geografia", [
        ("rankings", ficha.p_rankings),
        ("ranking", ficha_extra.p_ranking),
        ("mapa", ficha_v3.v3_mapa),
        ("comparar", ficha_v4.v4_comparar),
        ("busca", ficha_extra.p_busca),
    ]),
    ("04 · Panteão", [("lendas", ficha_v3.v3_lendas)]),
    ("05 · Meu Almanaque", [("meu-almanaque", ficha_v3.v3_dashboard)]),
    ("06 · Admin", [("admin", ficha_v4.v4_admin)]),
    ("07 · Institucional", [("metodologia", ficha_v4.v4_metodologia)]),
    ("08 · Interação", [("interacao", ficha_v5.v5_interacao)]),
    ("09 · Páginas e fundamentos", [
        ("404", ficha_v6.v6_404),
        ("sobre", ficha_v6.v6_sobre),
        ("legal", ficha_v6.v6_legal),
        ("fundamentos", ficha_v6.v6_fundamentos),
    ]),
]

FUNDOS = {"lendas": "#12100f", "admin": "#f2efea"}


def res(r):
    t = (r.get("content") or [{}])[0].get("text", "")
    try:
        return json.loads(t)
    except Exception:
        return t


def assentar_rodape(cmds, margem=52):
    prov = [c for c in cmds if (c["params"].get("name") or "").startswith("prov/")]
    if not prov:
        return cmds
    prov_y = min(c["params"].get("y", 0) for c in prov)
    fundo = 0
    for c in cmds:
        p = c["params"]
        nm = p.get("name") or ""
        if nm.startswith("prov/"):
            continue
        if p.get("x") == 0 and p.get("y") == 0 and p.get("width") == LARGURA:
            continue
        y, h = p.get("y"), p.get("height")
        if isinstance(y, (int, float)):
            fundo = max(fundo, y + (h if isinstance(h, (int, float)) and h > 0 else 14))
    delta = (fundo + margem) - prov_y
    for c in prov:
        c["params"]["y"] = c["params"].get("y", 0) + delta
    return cmds


def altura_de(cmds):
    return int(max(
        (p["params"].get("y", 0) + p["params"].get("height", 0)) for p in cmds
        if isinstance(p["params"].get("y"), (int, float))
        and isinstance(p["params"].get("height"), (int, float))
        and not (p["params"].get("x") == 0 and p["params"].get("width") == LARGURA)
    )) + 60


def main():
    cliente = McpFigCraft()
    try:
        cliente.iniciar()

        # limpa todas as páginas
        paginas = res(cliente.chamar("run_command", {"command": "page.list", "params": {}}))
        for p in paginas[1:]:
            cliente.chamar("run_command", {"command": "page.delete", "params": {"id": p["id"]}})
        paginas = res(cliente.chamar("run_command", {"command": "page.list", "params": {}}))
        nomes = [s[0] for s in SECOES]
        cliente.chamar("run_command", {"command": "page.rename",
                                       "params": {"id": paginas[0]["id"], "name": nomes[0]}})
        for nome in nomes[1:]:
            cliente.chamar("run_command", {"command": "page.add", "params": {"name": nome}})
        paginas = res(cliente.chamar("run_command", {"command": "page.list", "params": {}}))
        ids = {p.get("name"): p["id"] for p in paginas}
        print(f"  {len(paginas)} páginas criadas")

        # a primeira página sobrevive à limpeza de páginas e guarda os frames antigos:
        # sem isto o `home` da rodada anterior fica ao lado do novo
        cliente.chamar("run_command", {"command": "page.select",
                                       "params": {"id": ids[nomes[0]]}})
        time.sleep(0.4)
        antigos = res(cliente.chamar("run_command",
                                     {"command": "node.find", "params": {"type": "FRAME"}}))
        if antigos.get("ids"):
            cliente.chamar("run_command", {"command": "edit.delete",
                                           "params": {"ids": antigos["ids"]}})
            print(f"  {len(antigos['ids'])} frame(s) antigo(s) removido(s) da Capa")

        d = Path(__file__).parent / "app"
        d.mkdir(exist_ok=True)
        total = 0
        for nome_pag, frames in SECOES:
            cliente.chamar("run_command", {"command": "page.select", "params": {"id": ids[nome_pag]}})
            time.sleep(0.4)
            y = 0
            for nome_frame, fn in frames:
                ficha.cmd.clear()
                fn()
                ficha.normalizar(ficha.cmd)
                assentar_rodape(ficha.cmd)
                alt = altura_de(ficha.cmd)
                r = res(cliente.chamar("run_command", {"command": "frame.create", "params": {
                    "name": nome_frame, "x": 0, "y": y, "width": LARGURA, "height": alt,
                    "props": {"fill": FUNDOS.get(nome_frame, "#faf8f5")}}}))
                fid = r["id"]
                corpo = [{"command": cm["command"],
                          "params": {**cm["params"], "parent": fid}}
                         for cm in ficha.cmd if not cm["command"].startswith("frame.")]
                if corpo:
                    cliente.chamar("batch", {"commands": corpo}, timeout=300)
                s = cliente.chamar("screenshot", {"ids": [fid]})
                b = (s.get("content") or [{}])[0]
                if b.get("type") == "image":
                    (d / f"{nome_frame}.png").write_bytes(base64.b64decode(b["data"]))
                total += len(corpo)
                print(f"  {nome_pag:30} {nome_frame:14} {len(corpo):4} camadas · {alt}px")
                y += alt + GAP

        cliente.chamar("run_command", {"command": "page.select", "params": {"index": 0}})
        destino = str(Path(__file__).parent / "FICHA.figcraft")
        cliente.chamar("save_file", {"path": destino})
        paginas = res(cliente.chamar("run_command", {"command": "page.list", "params": {}}))
        print(f"\n  {total} camadas · {len(paginas)} páginas · "
              f"{sum((p.get('children') or 0) for p in paginas)} frames · salvo")
    finally:
        cliente.fechar()


if __name__ == "__main__":
    main()
