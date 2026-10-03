# Executar todos os comandos e capturar saída

# pg_hba.conf
Write-Output "=== pg_hba.conf ===" | Out-File -FilePath "diagnostic-full.txt"
docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf | Out-File -FilePath "diagnostic-full.txt" -Append

# tabelas
Write-Output "`n=== Tabelas ===" | Out-File -FilePath "diagnostic-full.txt" -Append
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt" | Out-File -FilePath "diagnostic-full.txt" -Append

# Mostrar
Get-Content "diagnostic-full.txt"