# Executar todos os comandos necessários

Write-Host "=== Executando docker ps ==="
docker ps

Write-Host "`n=== Executando pg_hba.conf ==="
docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf

Write-Host "`n=== Executando listar tabelas ==="
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt"