# Script completo - executar Docker Compose primeiro
docker-compose up -d

# Aguardar container estar pronto
Write-Host "Aguardando container..."
Start-Sleep -Seconds 5

# Executar comandos
$resultPgHba = docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf
$resultPgHba | Out-File -FilePath "pg_hba_result.txt"

$resultTables = docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt"
$resultTables | Out-File -FilePath "tables_result.txt"

# Mostrar resultados
Write-Host "=== pg_hba.conf ==="
Get-Content "pg_hba_result.txt"
Write-Host "`n=== Tabelas ==="
Get-Content "tables_result.txt"