"""
Cliente MCP mínimo para dirigir o app FigCraft ABERTO (--control 7979).

Por que existe: o `figcraft-cli run` é headless (sessão própria, sem janela). Para trabalhar no
app que o operador tem aberto — e para ele poder ver as camadas aparecendo — o caminho é o
servidor MCP, que fala JSON-RPC por stdio e encaminha cada comando ao processo vivo.

Implementa o mínimo do protocolo: initialize → initialized → tools/list → tools/call.
"""

import json
import subprocess
import sys
import threading
import queue

CLI = r"C:\Program Files\FigCraft\figcraft-cli.exe"


class McpFigCraft:
    def __init__(self, porta: int = 7979):
        self.proc = subprocess.Popen(
            [CLI, "mcp", "--attach", str(porta), "--timeout", "300"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
        )
        self.prox_id = 0
        self.respostas = queue.Queue()
        self._erros = []
        threading.Thread(target=self._ler, daemon=True).start()
        threading.Thread(target=self._ler_erros, daemon=True).start()

    def _ler(self):
        for linha in self.proc.stdout:
            linha = linha.strip()
            if not linha:
                continue
            try:
                self.respostas.put(json.loads(linha))
            except json.JSONDecodeError:
                pass

    def _ler_erros(self):
        for linha in self.proc.stderr:
            self._erros.append(linha.strip())

    def _enviar(self, obj):
        self.proc.stdin.write(json.dumps(obj) + "\n")
        self.proc.stdin.flush()

    def _requisitar(self, metodo, params=None, timeout=120):
        self.prox_id += 1
        rid = self.prox_id
        self._enviar({"jsonrpc": "2.0", "id": rid, "method": metodo,
                      "params": params if params is not None else {}})
        while True:
            msg = self.respostas.get(timeout=timeout)
            if msg.get("id") == rid:
                if "error" in msg:
                    raise RuntimeError(f"{metodo}: {msg['error']}")
                return msg.get("result")

    def iniciar(self):
        res = self._requisitar("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "almanaque-design", "version": "1.0"},
        })
        self._enviar({"jsonrpc": "2.0", "method": "notifications/initialized"})
        return res

    def ferramentas(self):
        return self._requisitar("tools/list").get("tools", [])

    def chamar(self, nome, argumentos=None, timeout=120):
        res = self._requisitar("tools/call",
                               {"name": nome, "arguments": argumentos or {}}, timeout)
        return res

    def fechar(self):
        try:
            self.proc.stdin.close()
            self.proc.terminate()
        except Exception:
            pass


if __name__ == "__main__":
    c = McpFigCraft()
    try:
        info = c.iniciar()
        print("  servidor:", info.get("serverInfo"))
        ferramentas = c.ferramentas()
        print(f"  ferramentas MCP: {len(ferramentas)}")
        for f in ferramentas[:40]:
            nome = f.get("name")
            desc = (f.get("description") or "").split("\n")[0][:70]
            print(f"    {nome}: {desc}")
    finally:
        c.fechar()
