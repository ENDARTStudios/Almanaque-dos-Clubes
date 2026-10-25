"""Diagnóstico pontual do incidente pg_hba (PR #318) — manutenção local.

Sem shell=True: cada comando é uma LISTA de argumentos (nada passa por shell,
nem interpolado), e as saídas são escritas no diretório do próprio script
(caminho ancorado em __file__, nunca relativo ao cwd).
"""
import subprocess
from pathlib import Path

DIRETORIO = Path(__file__).resolve().parent
REPO = DIRETORIO.parent.parent

def run(args):
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        cwd=REPO,
        check=False,
    )
    return result.stdout + result.stderr

DOCKER = ['docker', 'exec', 'almanaque-postgres']

print("=== PASSO 1: Alterando método de autenticação ===")
out1 = run(DOCKER + ['sed', '-i', 's/scram-sha-256/md5/',
                     '/var/lib/postgresql/data/pg_hba.conf'])
print(out1 if out1 else "(sem output)")

print("\n=== PASSO 2: Recarregando configuração ===")
out2 = run(DOCKER + ['psql', '-U', 'almanaque', '-d', 'almanaque',
                     '-c', 'SELECT pg_reload_conf();'])
print(out2 if out2 else "(sem output)")

print("\n=== PASSO 3: pg_hba.conf ===")
out3 = run(DOCKER + ['cat', '/var/lib/postgresql/data/pg_hba.conf'])
print(out3 if out3 else "(sem output)")

print("\n=== PASSO 6: Listando tabelas ===")
out4 = run(DOCKER + ['psql', '-U', 'almanaque', '-d', 'almanaque',
                     '-c', '\\\\dt'])
print(out4 if out4 else "(sem output)")

(DIRETORIO / 'STEP1-pg_hba.conf.txt').write_text(out3, encoding='utf-8')
(DIRETORIO / 'STEP6-tables.txt').write_text(out4, encoding='utf-8')

print("\nArquivos salvos!")
