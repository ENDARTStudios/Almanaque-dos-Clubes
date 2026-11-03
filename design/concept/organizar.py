"""
Organiza o projeto FICHA no app FigCraft: 8 páginas por seção, cada frame na sua.

Três coisas aprendidas na marra (a primeira versão errou todas):

  1. `file.new` NÃO limpa o documento aberto — ele inicia um novo sem descartar o atual.
     Resultado da primeira tentativa: 15 páginas acumuladas, porque a execução que falhou já
     havia criado 7 antes de morrer.
  2. `object.moveToPage` recebe o **id** da página, não o índice. Passei 0..7 e os frames foram
     parar todos na última.
  3. `page.select` aceita `{id | index}`; `page.delete` só `{id}`.

Então: apago tudo menos uma página, renomeio, crio as outras sete, e movo cada frame pelo id.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import ficha
import ficha_extra
import ficha_v3
import ficha_v4
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
]


def res(resposta):
    if resposta.get("isError"):
        raise RuntimeError((resposta.get("content") or [{}])[0].get("text", "erro"))
    texto = (resposta.get("content") or [{}])[0].get("text", "")
    try:
        return json.loads(texto)
    except Exception:
        return {}


def listar_paginas(cliente):
    r = res(cliente.chamar("run_command", {"command": "page.list", "params": {}}))
    return r if isinstance(r, list) else (r.get("pages") or [])


def main():
    cliente = McpFigCraft()
    try:
        cliente.iniciar()

        paginas = listar_paginas(cliente)
        print(f"  páginas antes: {len(paginas)}")
        for p in paginas[1:]:
            cliente.chamar("run_command", {"command": "page.delete", "params": {"id": p["id"]}})
        paginas = listar_paginas(cliente)
        print(f"  depois da limpeza: {len(paginas)}")

        nomes = [s[0] for s in SECOES]
        cliente.chamar("run_command", {"command": "page.rename",
                                       "params": {"id": paginas[0]["id"], "name": nomes[0]}})
        for nome in nomes[1:]:
            cliente.chamar("run_command", {"command": "page.add", "params": {"name": nome}})

        paginas = listar_paginas(cliente)
        ids = {p.get("name"): p["id"] for p in paginas}
        print(f"  páginas: {len(paginas)}")
        for nome in nomes:
            print(f"    id={ids.get(nome)} {nome}")

        total = 0
        for nome_pagina, frames in SECOES:
            y = 0
            pid = ids.get(nome_pagina)
            for nome_frame, fn in frames:
                ficha.cmd.clear()
                fn()
                ficha.normalizar(ficha.cmd)
                altura = int(max(
                    (c["params"].get("y", 0) + c["params"].get("height", 0))
                    for c in ficha.cmd if isinstance(c["params"].get("y"), (int, float))
                ))
                fundo = "#12100f" if nome_frame == "lendas" else (
                    "#f2efea" if nome_frame == "admin" else "#faf8f5")
                r = res(cliente.chamar("run_command", {
                    "command": "frame.create",
                    "params": {"name": nome_frame, "x": 0, "y": y, "width": LARGURA,
                               "height": altura, "props": {"fill": fundo}},
                }))
                fid = r.get("id")
                corpo = []
                for c in ficha.cmd:
                    if c["command"].startswith("frame."):
                        continue
                    p = dict(c["params"])
                    p["parent"] = fid
                    corpo.append({"command": c["command"], "params": p})
                if corpo:
                    cliente.chamar("batch", {"commands": corpo}, timeout=300)
                cliente.chamar("run_command", {"command": "object.moveToPage",
                                               "params": {"ids": [fid], "page": pid}})
                total += len(corpo)
                print(f"  {nome_pagina:26} {nome_frame:16} {len(corpo):4}")
                y += altura + GAP

        cliente.chamar("run_command", {"command": "page.select", "params": {"index": 0}})
        destino = str(Path(__file__).parent / "FICHA.figcraft")
        cliente.chamar("save_file", {"path": destino})
        print(f"  total: {total} camadas · salvo em {destino}")

        doc = res(cliente.chamar("inspect_document", {}))
        print(f"\n  VERIFICAÇÃO: {len(doc.get('pages', []))} páginas")
        for p in doc.get("pages", []):
            filhos = p.get("children") or []
            nomes_fr = [k.get("name") for k in filhos if k.get("type") == "FRAME"]
            print(f"    {p.get('name'):26} {len(nomes_fr)} frames: {', '.join(nomes_fr)}")
    finally:
        cliente.fechar()


if __name__ == "__main__":
    main()
