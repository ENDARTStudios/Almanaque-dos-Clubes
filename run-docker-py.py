import subprocess
import os

os.chdir(r'd:\PROJETOS\Almanaque dos Clubes\Almanaque dos Clubes')

results = []

# 1. Alterar método de autenticação
results.append("\n=== PASSO 1: Alterando método de autenticação para md5 ===\n")
try:
    result = subprocess.run(
        ['docker', 'exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf'],
        capture_output=True, text=True
    )
    results.append(f"stdout: {result.stdout}\nstderr: {result.stderr}\nexit: {result.returncode}")
except Exception as e:
    results.append(f"Erro: {e}")

# 2. Recarregar configuração
results.append("\n=== PASSO 2: Recarregando configuração ===\n")
try:
    result = subprocess.run(
        ['docker', 'exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();'],
        capture_output=True, text=True
    )
    results.append(f"stdout: {result.stdout}\nstderr: {result.stderr}\nexit: {result.returncode}")
except Exception as e:
    results.append(f"Erro: {e}")

# 3. Verificar pg_hba.conf
results.append("\n=== PASSO 3: Conteúdo pg_hba.conf ===\n")
try:
    result = subprocess.run(
        ['docker', 'exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf'],
        capture_output=True, text=True
    )
    results.append(f"stdout: {result.stdout}\nstderr: {result.stderr}\nexit: {result.returncode}")
except Exception as e:
    results.append(f"Erro: {e}")

# 4. Listar tabelas
results.append("\n=== PASSO 6: Listando tabelas ===\n")
try:
    result = subprocess.run(
        ['docker', 'exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt'],
        capture_output=True, text=True
    )
    results.append(f"stdout: {result.stdout}\nstderr: {result.stderr}\nexit: {result.returncode}")
except Exception as e:
    results.append(f"Erro: {e}")

# Salvar e mostrar
with open('diagnostic-output.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))

print('\n'.join(results))