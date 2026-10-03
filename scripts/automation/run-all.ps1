# Executar todos os comandos Docker e Prisma

# Passo 1: pg_hba.conf
Write-Host "=== PASSO 1: pg_hba.conf ==="
$result1 = docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf 2>&1
$result1 | Out-File -FilePath "result1.txt"
$result1

# Passo 2: Listar tabelas
Write-Host "`n=== PASSO 6: Listando tabelas ==="
$result6 = docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt" 2>&1
$result6 | Out-File -FilePath "result6.txt"
$result6