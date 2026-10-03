import subprocess
import sys

def run(cmd):
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        cwd=r'd:\PROJETOS\Almanaque dos Clubes\Almanaque dos Clubes'
    )
    return result.stdout + result.stderr

# Passo 1: Alterar para md5
print("=== PASSO 1: Alterando método de autenticação ===")
out1 = run('docker exec almanaque-postgres sed -i "s/scram-sha-256/md5/" /var/lib/postgresql/data/pg_hba.conf')
print(out1 if out1 else "(sem output)")

# Passo 2: Recarregar
print("\n=== PASSO 2: Recarregando configuração ===")
out2 = run('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"')
print(out2 if out2 else "(sem output)")

# Passo 3: pg_hba.conf
print("\n=== PASSO 3: pg_hba.conf ===")
out3 = run('docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf')
print(out3 if out3 else "(sem output)")

# Passo 6: tabelas
print("\n=== PASSO 6: Listando tabelas ===")
out4 = run('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\\\dt"')
print(out4 if out4 else "(sem output)")

# Salvar resultados
with open('STEP1-pg_hba.conf.txt', 'w') as f:
    f.write(out3)

with open('STEP6-tables.txt', 'w') as f:
    f.write(out4)

print("\nArquivos salvos!")