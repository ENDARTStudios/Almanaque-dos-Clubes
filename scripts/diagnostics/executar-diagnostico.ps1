# Script de diagnóstico e execução das migrations

# 1. Alterar método de autenticação do PostgreSQL
Write-Host "=== PASSO 1: Alterando método de autenticação para md5 ==="
docker exec almanaque-postgres sed -i 's/scram-sha-256/md5/' /var/lib/postgresql/data/pg_hba.conf
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCESSO: Configuração alterada"
} else {
    Write-Host "ERRO: Falha ao alterar configuração"
}

# 2. Recarregar configuração
Write-Host "`n=== PASSO 2: Recarregando configuração do PostgreSQL ==="
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCESSO: Configuração recarregada"
} else {
    Write-Host "ERRO: Falha ao recarregar configuração"
}

# 3. Confirmar alteração
Write-Host "`n=== PASSO 3: Confirmando alteração no pg_hba.conf ==="
docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf > pg_hba_output.txt 2>&1
Get-Content pg_hba_output.txt | Select-String "md5"

# 4. Verificar se Prisma está instalado
Write-Host "`n=== PASSO 4: Verificando Prisma ==="
Get-ChildItem -Recurse -Path node_modules\.bin -Filter prisma.cmd 2>$null > prisma_output.txt 2>&1
Get-Content prisma_output.txt

# 5. Executar migration
Write-Host "`n=== PASSO 5: Executando migration ==="
$env:DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@127.0.0.1:5432/almanaque?schema=public"
cd apps\api
npx prisma migrate dev --schema=prisma\schema.prisma --name init --skip-seed > migrate_output.txt 2>&1
Get-Content migrate_output.txt

# 6. Executar seed
Write-Host "`n=== PASSO 6: Executando seed ==="
npx prisma db seed --schema=prisma\schema.prisma > seed_output.txt 2>&1
Get-Content seed_output.txt

# 7. Listar tabelas
Write-Host "`n=== PASSO 7: Listando tabelas ==="
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt" > tables_output.txt 2>&1
Get-Content tables_output.txt
